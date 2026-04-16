import React, { useEffect, useMemo, useState } from "react";
import "@ant-design/v5-patch-for-react-19";
import {
    Button,
    Card,
    Checkbox,
    DatePicker,
    Input,
    InputNumber,
    Modal,
    Select,
    Space,
    Table,
    TimePicker,
    Typography,
    Upload,
} from "antd";
import {
    CheckCircleOutlined,
    DownloadOutlined,
    SearchOutlined,
    UploadOutlined,
} from "@ant-design/icons";
import { motion } from "framer-motion";
import * as XLSX from "xlsx";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import API from "../hooks/api";
import useStore from "../stores/ProjectData";
import { useToast } from "../hooks/useToast";

const { Text, Title } = Typography;

const PRIMARY_COLOR = "#1677ff";
const TIME_FORMAT = "h:mm:ss A";
const TIME_PARSE_FORMATS = [
    TIME_FORMAT,
    "hh:mm A",
    "h:mm A",
    "HH:mm:ss",
    "HH:mm",
];

dayjs.extend(customParseFormat);

const normalizeHeader = (value = "") =>
    String(value).toLowerCase().replace(/[\s_-]+/g, "").trim();

const formatDateForSheet = (value) => {
    if (!value) return "";
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const day = String(value.getDate()).padStart(2, "0");
        const month = String(value.getMonth() + 1).padStart(2, "0");
        const year = value.getFullYear();
        return `${day}-${month}-${year}`;
    }
    return String(value);
};

const parseExcelDate = (value) => {
    if (typeof value === "number") {
        const date = new Date(Math.round((value - 25569) * 86400 * 1000));
        return formatDateForSheet(date);
    }

    if (typeof value === "string" && value.trim()) {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return formatDateForSheet(parsed);
        }
        return value.trim();
    }

    return "";
};

const normalizeTimeValue = (value) => {
    if (!value) return "";
    const rawValue = String(value).trim();
    if (!rawValue) return "";

    const parsed = dayjs(rawValue, TIME_PARSE_FORMATS, true);
    return parsed.isValid() ? parsed.format(TIME_FORMAT) : rawValue;
};

const compareTableValues = (a, b) => {
    if (a == null || a === "") return -1;
    if (b == null || b === "") return 1;

    if (!Number.isNaN(Number(a)) && !Number.isNaN(Number(b))) {
        return Number(a) - Number(b);
    }

    const parsedDateA = Date.parse(a);
    const parsedDateB = Date.parse(b);
    if (!Number.isNaN(parsedDateA) && !Number.isNaN(parsedDateB)) {
        return parsedDateA - parsedDateB;
    }

    return String(a).localeCompare(String(b), undefined, {
        sensitivity: "base",
        numeric: true,
    });
};

const isMeaningfulValue = (value) => {
    if (value === undefined || value === null) return false;
    if (typeof value === "number") return !Number.isNaN(value) && value !== 0;

    const normalized = String(value).trim().toLowerCase();
    return normalized !== "" && normalized !== "0" && normalized !== "undefined" && normalized !== "null";
};

const renderDisplayValue = (value) =>
    isMeaningfulValue(value) ? value : <Text type="secondary">-</Text>;

const summaryItems = (loadingTemplateData, templateRows, reviewRows, completedCount) => [
    {
        label: "Unique Catch Numbers",
        value: loadingTemplateData ? "..." : templateRows.length,
        valueClass: "text-blue-600",
        cardClass: "border-blue-100 bg-blue-50",
    },
    {
        label: "Rows Reviewed",
        value: reviewRows.length,
        valueClass: "text-indigo-700",
        cardClass: "border-indigo-100 bg-indigo-50",
    },
    {
        label: "Rows Ready",
        value: completedCount,
        valueClass: "text-green-700",
        cardClass: "border-green-100 bg-green-50",
    },
];

const MissingData = () => {
    const projectId = useStore((state) => state.projectId);
    const { showToast } = useToast();
    const [loadingTemplateData, setLoadingTemplateData] = useState(false);
    const [templateRows, setTemplateRows] = useState([]);
    const [missingDataRows, setMissingDataRows] = useState([]);
    const [fileList, setFileList] = useState([]);
    const [submitting, setSubmitting] = useState(false);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);
    const [selectedCatchNumbers, setSelectedCatchNumbers] = useState([]);
    const [editingRowKey, setEditingRowKey] = useState(null);
    const [editingDraft, setEditingDraft] = useState({
        pages: "",
        examDate: "",
        examTime: "",
    });
    const [bulkValues, setBulkValues] = useState({});
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [searchedColumn, setSearchedColumn] = useState("");
    const [tablePagination, setTablePagination] = useState({
        current: 1,
        pageSize: 10,
    });

    // Track modified rows (from upload, inline editing, or bulk updates)
    const [modifiedRows, setModifiedRows] = useState(new Set());

    // Dynamic fields state
    const [availableFields, setAvailableFields] = useState([]);
    const [displayFields, setDisplayFields] = useState([]);
    const [templateFields, setTemplateFields] = useState([]);
    const [showDisplayFieldsModal, setShowDisplayFieldsModal] = useState(false);
    const [showTemplateFieldsModal, setShowTemplateFieldsModal] = useState(false);
    const [loadingFields, setLoadingFields] = useState(false);

    // Standard fields that can be selected (Pages, ExamDate, ExamTime)
    const standardFields = [
        { fieldId: 'Pages', name: 'Pages', isUnique: true },
        { fieldId: 'ExamDate', name: 'ExamDate', isUnique: true },
        { fieldId: 'ExamTime', name: 'ExamTime', isUnique: true }
    ];

    const loadCatchTemplateData = async () => {
        if (!projectId) {
            setTemplateRows([]);
            return;
        }

        setLoadingTemplateData(true);
        try {
            const res = await API.get(`/NRDatas/GetByProjectId/${projectId}`, {
                params: {
                    pageSize: 100000,
                    pageNo: 1,
                },
            });
            console.log("Raw catch data from backend:", res.data);
            const items = Array.isArray(res.data?.items) ? res.data.items : [];
            const uniqueByCatch = new Map();

            items.forEach((item) => {
                const catchNo = item?.CatchNo ?? item?.catchNo;
                if (!catchNo) return;

                if (!uniqueByCatch.has(catchNo)) {
                    const rowData = {
                        key: catchNo,
                        catchNo,
                    };

                    // Store ALL fields from the API response
                    Object.keys(item).forEach(key => {
                        if (key.toLowerCase() !== 'catchno' && key !== 'NRDatas' && key !== 'nrDatas') {
                            if (key === 'ExamTime' || key === 'examTime') {
                                rowData[key] = normalizeTimeValue(item[key] ?? "");
                            } else {
                                rowData[key] = item[key] ?? "";
                            }
                        }
                    });

                    // Parse NRDatas JSON field and merge dynamic fields
                    const nrDatasJson = item.NRDatas || item.nrDatas;
                    if (nrDatasJson && typeof nrDatasJson === 'string') {
                        try {
                            const parsedData = JSON.parse(nrDatasJson);
                            // Merge all fields from NRDatas JSON into rowData
                            Object.keys(parsedData).forEach(key => {
                                if (key === 'ExamTime') {
                                    rowData[key] = normalizeTimeValue(parsedData[key] ?? "");
                                } else {
                                    rowData[key] = parsedData[key] ?? "";
                                }
                            });
                            console.log(`Parsed NRDatas for ${catchNo}:`, parsedData);
                        } catch (e) {
                            console.warn(`Failed to parse NRDatas JSON for catch ${catchNo}:`, e);
                        }
                    }

                    uniqueByCatch.set(catchNo, rowData);
                }
            });

            const rows = Array.from(uniqueByCatch.values()).sort((a, b) =>
                String(a.catchNo).localeCompare(String(b.catchNo), undefined, {
                    numeric: true,
                    sensitivity: "base",
                })
            );

            console.log("Processed rows with NRDatas:", rows);
            setTemplateRows(rows);
            setMissingDataRows(rows.map((row) => ({ ...row })));
        } catch (error) {
            console.error("Failed to load missing data template rows", error);
            showToast("Failed to load catch data for template", "error");
            setTemplateRows([]);
            setMissingDataRows([]);
        } finally {
            setLoadingTemplateData(false);
        }
    };

    const fetchAvailableFields = async () => {
        setLoadingFields(true);
        try {
            const res = await API.get('/Fields');
            const uniqueFields = (res.data || []).filter(f => f.isUnique);
            
            // Filter out fields that match standard field names to avoid duplicates
            const standardFieldNames = standardFields.map(f => f.name.toLowerCase());
            const filteredMasterFields = uniqueFields.filter(
                f => !standardFieldNames.includes(f.name.toLowerCase())
            );
            
            // Combine standard fields with filtered master fields
            const allFields = [...standardFields, ...filteredMasterFields];
            setAvailableFields(allFields);
        } catch (error) {
            console.error("Failed to fetch fields:", error);
            showToast("Failed to load fields", "error");
            // If API fails, at least show standard fields
            setAvailableFields(standardFields);
        } finally {
            setLoadingFields(false);
        }
    };

    useEffect(() => {
        if (projectId) {
            fetchAvailableFields();
        }
    }, [projectId]);

    useEffect(() => {
        loadCatchTemplateData();
    }, [projectId]);

    useEffect(() => {
        if (selectedRowKeys.length) {
            setShowBulkUpdate(true);
        }
    }, [selectedRowKeys]);

    useEffect(() => {
    if (!availableFields.length) return;

    const saved = localStorage.getItem("missingData_displayFields");

    if (saved) {
        try {
            const parsedIds = JSON.parse(saved);

            const restoredFields = availableFields.filter(f =>
                parsedIds.includes(f.fieldId)
            );

            setDisplayFields(restoredFields);
        } catch (e) {
            console.warn("Failed to restore display fields", e);
        }
    }
}, [availableFields]);

    const handleDownloadTemplate = async () => {
        if (!templateRows.length) {
            showToast("No catch data available to generate template", "warning");
            return;
        }

        const worksheetData = templateRows.map((row) => {
            const rowData = {
                "Catch No": row.catchNo,
            };

            // Add selected template fields with their actual data from API
            templateFields.forEach(field => {
                const fieldName = field.name;
                // Try different case variations to find the field value
                const value = row[fieldName] || row[fieldName.toLowerCase()] || 
                              row[fieldName.toUpperCase()] || "";
                rowData[fieldName] = value;
            });

            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const colWidths = [
            { wch: 22 }, // Catch No
            ...templateFields.map(() => ({ wch: 18 }))
        ];
        worksheet["!cols"] = colWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MissingDataTemplate");
        XLSX.writeFile(
            workbook,
            `missing_data_template_project_${projectId || "sample"}.xlsx`
        );
        showToast("Template downloaded", "success");
        setShowTemplateFieldsModal(false);
    };

    const parseUploadedSheet = (file) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const worksheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

                if (!jsonData.length) {
                    showToast("Uploaded file is empty", "warning");
                    return;
                }

                const headers = jsonData[0].map(normalizeHeader);
                const catchIndex = headers.findIndex((h) =>["catchno", "catch"].includes(h));

                if (catchIndex === -1) {
                    showToast(
                        "Template must have Catch No column",
                        "error"
                    );
                    return;
                }

                // Auto-map headers to availableFields and update displayFields
                const autoMappedFields = [];
                headers.forEach((header) => {
                    if (["catchno", "catch"].includes(header)) return;
                    const matched = availableFields.find(
                        (f) => normalizeHeader(f.name) === header
                    );
                    if (matched && !autoMappedFields.find(f => f.fieldId === matched.fieldId)) {
                        autoMappedFields.push(matched);
                    }
                });

                if (autoMappedFields.length > 0) {
                    setDisplayFields((prev) => {
                        // Merge: keep existing, add newly detected ones
                        const existingIds = new Set(prev.map(f => f.fieldId));
                        const toAdd = autoMappedFields.filter(f => !existingIds.has(f.fieldId));
                        const merged = [...prev, ...toAdd];
                        // Persist to localStorage
                        localStorage.setItem(
                            "missingData_displayFields",
                            JSON.stringify(merged.map(f => f.fieldId))
                        );
                        return merged;
                    });
                }

                // Find all field indices dynamically
                const fieldIndices = {};

headers.forEach((header, index) => {
    if (["catchno", "catch"].includes(header)) return;

    fieldIndices[header] = index;
});

                const uniqueRows = new Map();

                jsonData.slice(1).forEach((row) => {
                    const catchNo = String(row[catchIndex] ?? "").trim();
                    if (!catchNo) return;

                    const rowData = {
                        key: catchNo,
                        catchNo,
                    };

                    // Add all dynamic fields
                    Object.entries(fieldIndices).forEach(([normalizedHeader, idx]) => {
    const value = row[idx];

    // Try to map header back to actual field name
    const matchedField =
        availableFields.find(f => normalizeHeader(f.name) === normalizedHeader);

    const fieldName = matchedField ? matchedField.name : normalizedHeader;

    if (fieldName === 'Pages') {
        rowData[fieldName] = value === "" ? "" : Number(value);
    } else if (fieldName === 'ExamDate') {
        rowData[fieldName] = parseExcelDate(value);
    } else if (fieldName === 'ExamTime') {
        rowData[fieldName] = normalizeTimeValue(value);
    } else {
        rowData[fieldName] = value ?? "";
    }
});

                    uniqueRows.set(catchNo, rowData);
                });

                const newModifiedRows = new Set();

const mergedRows = templateRows.map((templateRow) => {
    const uploaded = uniqueRows.get(templateRow.catchNo);

    if (uploaded) {
        let isChanged = false;

        Object.keys(uploaded).forEach(key => {
    if (key === "catchNo" || key === "key") return;

            const oldValue = templateRow[key] ?? "";
            const newValue = uploaded[key] ?? "";

            if (String(oldValue).trim() !== String(newValue).trim()) {
                isChanged = true;
            }
        });

        if (isChanged) {
            newModifiedRows.add(templateRow.catchNo);
        }

        return {
            ...templateRow,
            ...uploaded,
        };
    }

    return { ...templateRow };
});

setModifiedRows(newModifiedRows);

                setMissingDataRows(mergedRows);
                setTablePagination((prev) => ({
                    ...prev,
                    current: 1,
                }));
                showToast("Template uploaded for review", "success");
            } catch (error) {
                console.error("Failed to parse uploaded missing data file", error);
                showToast("Failed to read uploaded file", "error");
            }
        };

        reader.readAsArrayBuffer(file);
    };

    const beforeUpload = (file) => {
        setFileList([file]);
        parseUploadedSheet(file);
        return false;
    };

    const handleRemove = () => {
        setFileList([]);
        setMissingDataRows(templateRows.map((row) => ({ ...row })));
        setSelectedRowKeys([]);
        setSelectedCatchNumbers([]);
        setModifiedRows(new Set()); // Clear modified rows
        setTablePagination({
            current: 1,
            pageSize: 10,
        });
    };

    const reviewRows = useMemo(() => {
        // Filter rows to only show selected display fields
        return missingDataRows.map(row => {
            const filteredRow = {
                key: row.key,
                catchNo: row.catchNo,
            };
            
            // Add only the display fields
            displayFields.forEach(field => {
                const fieldName = field.name;
                filteredRow[fieldName] = row[fieldName] || row[fieldName.toLowerCase()] || 
                                         row[fieldName.toUpperCase()] || "";
            });
            
            return filteredRow;
        });
    }, [missingDataRows, displayFields]);
    const allReviewRowKeys = useMemo(
        () => reviewRows.map((row) => row.catchNo),
        [reviewRows]
    );

    const completedCount = useMemo(
        () =>
            missingDataRows.filter((row) => {
                // A row is complete if it has at least one meaningful value in display fields
                return displayFields.some(field => isMeaningfulValue(row[field.name]));
            }).length,
        [missingDataRows, displayFields]
    );

    const parseDateValue = (value) => {
        if (!value) return null;
        const parsed = dayjs(value, ["DD-MM-YYYY", "YYYY-MM-DD"], true);
        return parsed.isValid() ? parsed : null;
    };

    const parseTimeValue = (value) => {
        if (!value) return null;
        const parsed = dayjs(value, TIME_PARSE_FORMATS, true);
        return parsed.isValid() ? parsed : null;
    };

    const handleRowSelectionChange = (nextSelectedRowKeys) => {
        setSelectedRowKeys(nextSelectedRowKeys);
        setSelectedCatchNumbers(nextSelectedRowKeys);
    };

    const handleCatchNumberSelectionChange = (nextSelectedCatchNumbers) => {
        const nextValues = nextSelectedCatchNumbers || [];
        setSelectedCatchNumbers(nextValues);
        setSelectedRowKeys(nextValues);
        if (nextValues.length) {
            setShowBulkUpdate(true);
        }
    };

    const handleSelectAllRows = (selected) => {
        handleRowSelectionChange(selected ? allReviewRowKeys : []);
        if (selected) {
            setShowBulkUpdate(true);
        }
    };

    const startEditingRow = (record) => {
        setEditingRowKey(record.catchNo);
        const draft = { catchNo: record.catchNo };
        
        // Add all display fields to draft
        displayFields.forEach(field => {
            draft[field.name] = record[field.name] ?? "";
        });
        
        setEditingDraft(draft);
    };

    const cancelEditingRow = () => {
        setEditingRowKey(null);
        setEditingDraft({});
    };

    const saveEditingRow = (catchNo) => {
        setMissingDataRows((prev) =>
            prev.map((row) => {
                if (row.catchNo === catchNo) {
                    // Mark this row as modified
                    const newModified = new Set(modifiedRows);
newModified.add(catchNo);
setModifiedRows(newModified);
                    
                    const updatedRow = { ...row };
                    
                    // Update all fields from editingDraft
                    Object.keys(editingDraft).forEach(key => {
                        if (key !== 'catchNo') {
                            updatedRow[key] = editingDraft[key] === null ? "" : editingDraft[key];
                        }
                    });
                    
                    return updatedRow;
                }
                return row;
            })
        );
        cancelEditingRow();
    };

    const applyPatchToRows = (matcher, patch) => {
        const effectivePatch = Object.fromEntries(
            Object.entries(patch).filter(
                ([, value]) => value !== "" && value !== null && value !== undefined
            )
        );

        if (!Object.keys(effectivePatch).length) {
            showToast("Enter at least one bulk value first", "warning");
            return;
        }
      const newModified = new Set(modifiedRows);
        setMissingDataRows((prev) =>
            prev.map((row) => {
                if (matcher(row)) {
                    // Mark this row as modified
                    newModified.add(row.catchNo);
                    return { ...row, ...effectivePatch };
                }
                return row;
                
            })
            
        );
        setModifiedRows(newModified);
    };

    const handleApplyToSelected = () => {
        const targetCatchNos = Array.from(
            new Set([...selectedRowKeys, ...selectedCatchNumbers])
        );

        if (!targetCatchNos.length) {
            showToast("Select rows or catch numbers first", "warning");
            return;
        }

        applyPatchToRows(
            (row) => targetCatchNos.includes(row.catchNo),
            bulkValues
        );
    };

    const handleSubmit = async () => {
        if (!missingDataRows.length) {
            showToast("Upload the completed template first", "warning");
            return;
        }

        // Only submit rows that were actually modified
        if (modifiedRows.size === 0) {
            showToast("No changes to submit", "warning");
            return;
        }

        // Build payload with dynamic fields - ONLY for modified rows
        const payload = [];

for (const row of missingDataRows) {
    if (!modifiedRows.has(row.catchNo)) continue;

    const additionalFields = {};

    for (const field of displayFields) {
        const fieldName = field.name;
        const value = row[fieldName];

        if (value !== "" && value !== null && value !== undefined) {
            additionalFields[fieldName] = value;
        }
    }

    if (Object.keys(additionalFields).length > 0) {
        payload.push({
            catchNo: row.catchNo,
            additionalFields,
        });
    }
}
            
        if (!payload.length) {
            showToast("No valid data to submit", "warning");
            return;
        }

        console.log(`Submitting ${payload.length} modified rows out of ${missingDataRows.length} total rows`);

        setSubmitting(true);
        try {
            const chunkSize = 100;

            for (let i = 0; i < payload.length; i += chunkSize) {
                const chunk = payload.slice(i, i + chunkSize);
                await API.post("/NRDatas/missing-data", {
                    projectId,
                    data: chunk,
                });
            }
            
            showToast(`Successfully saved ${payload.length} row(s)`, "success");
            setModifiedRows(new Set());
            setFileList([]);
            setSelectedRowKeys([]);
            setSelectedCatchNumbers([]);
            setEditingRowKey(null);
            setShowBulkUpdate(false);
            setTablePagination((prev) => ({
                ...prev,
                current: 1,
            }));
        } catch (error) {
            console.error("Failed to save missing data", error);
            const errorMessage =
                error?.response?.data?.message ||
                error?.response?.data ||
                "Failed to save missing data";
            showToast(
                typeof errorMessage === "string" ? errorMessage : "Failed to save missing data",
                "error"
            );
        } finally {
            setSubmitting(false);
        }
    };

    const getColumnSearchProps = (dataIndex) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    autoFocus
                    placeholder={`Search ${dataIndex}`}
                    value={selectedKeys[0] || ""}
                    onChange={(event) => {
                        const value = event.target.value;
                        setSelectedKeys(value ? [value] : []);
                        setSearchText(value);
                        setSearchedColumn(dataIndex);
                    }}
                    onPressEnter={() => confirm()}
                    style={{ width: 188, marginBottom: 8, display: "block" }}
                />
                <Space>
                    <Button
                        type="primary"
                        size="small"
                        onClick={() => confirm()}
                    >
                        Search
                    </Button>
                    <Button
                        size="small"
                        onClick={() => {
                            clearFilters?.();
                            setSearchText("");
                            setSearchedColumn("");
                            confirm({ closeDropdown: true });
                        }}
                    >
                        Reset
                    </Button>
                </Space>
            </div>
        ),
        filterIcon: (filtered) => (
            <SearchOutlined style={{ color: filtered ? "#1890ff" : undefined }} />
        ),
        onFilter: (value, record) => {
            const rawValue =
                dataIndex === "status"
                    ? (
                        isMeaningfulValue(record.pages) &&
                        isMeaningfulValue(record.examDate) &&
                        isMeaningfulValue(record.examTime)
                            ? "Ready"
                            : "Pending"
                    )
                    : record?.[dataIndex];

            if (!isMeaningfulValue(rawValue)) {
                return false;
            }

            return String(rawValue)
                .toLowerCase()
                .includes(String(value).toLowerCase());
        },
        filterDropdownProps: {
            onOpenChange: (open) => {
                if (!open && searchedColumn === dataIndex && !searchText) {
                    setSearchedColumn("");
                }
            },
        },
    });

    const columns = useMemo(() => [
        {
            title: "Catch No",
            dataIndex: "catchNo",
            key: "catchNo",
            width: 160,
            fixed: 'left',
            ...getColumnSearchProps("catchNo"),
            sorter: (a, b) => compareTableValues(a.catchNo, b.catchNo),
            render: (value) =>
                isMeaningfulValue(value) ? <Text strong>{value}</Text> : <Text type="secondary">-</Text>,
        },
        // Dynamic fields columns
        ...displayFields.map(field => {
            const fieldName = field.name;
            const isPages = fieldName === 'Pages';
            const isExamDate = fieldName === 'ExamDate';
            const isExamTime = fieldName === 'ExamTime';

            return {
                title: fieldName,
                dataIndex: fieldName,
                key: `dynamic-${field.fieldId}`,
                width: 140,
                ...getColumnSearchProps(fieldName),
                sorter: (a, b) => compareTableValues(a[fieldName], b[fieldName]),
                render: (value, record) => {
                    if (editingRowKey === record.catchNo) {
                        if (isPages) {
                            return (
                                <InputNumber
                                    min={0}
                                    value={editingDraft[fieldName] === "" ? null : editingDraft[fieldName]}
                                    placeholder="Pages"
                                    size="small"
                                    style={{ width: "100%" }}
                                    onChange={(nextValue) =>
                                        setEditingDraft((prev) => ({
                                            ...prev,
                                            [fieldName]: nextValue === null ? "" : nextValue,
                                        }))
                                    }
                                />
                            );
                        } else if (isExamDate) {
                            return (
                                <DatePicker
                                    size="small"
                                    format="DD-MM-YYYY"
                                    value={parseDateValue(editingDraft[fieldName])}
                                    style={{ width: "100%" }}
                                    onChange={(date) =>
                                        setEditingDraft((prev) => ({
                                            ...prev,
                                            [fieldName]: date ? date.format("DD-MM-YYYY") : "",
                                        }))
                                    }
                                />
                            );
                        } else if (isExamTime) {
                            return (
                                <TimePicker
                                    size="small"
                                    format={TIME_FORMAT}
                                    use12Hours
                                    value={parseTimeValue(editingDraft[fieldName])}
                                    style={{ width: "100%" }}
                                    changeOnScroll
                                    needConfirm
                                    onChange={(time) =>
                                        setEditingDraft((prev) => ({
                                            ...prev,
                                            [fieldName]: time ? time.format(TIME_FORMAT) : "",
                                        }))
                                    }
                                />
                            );
                        } else {
                            return (
                                <Input
                                    value={editingDraft[fieldName] || ""}
                                    placeholder={fieldName}
                                    size="small"
                                    style={{ width: "100%" }}
                                    onChange={(e) =>
                                        setEditingDraft((prev) => ({
                                            ...prev,
                                            [fieldName]: e.target.value,
                                        }))
                                    }
                                />
                            );
                        }
                    }
                    return renderDisplayValue(value);
                },
            };
        }),
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 110,
            ...getColumnSearchProps("status"),
            sorter: (a, b) => {
                const hasAnyValue = (row) => {
                    return displayFields.some(field => isMeaningfulValue(row[field.name]));
                };
                return compareTableValues(
                    hasAnyValue(a) ? "Ready" : "Pending",
                    hasAnyValue(b) ? "Ready" : "Pending"
                );
            },
            render: (_, record) => {
                const hasAnyValue = displayFields.some(field => isMeaningfulValue(record[field.name]));

                return hasAnyValue ? (
                    <Text style={{ color: "#389e0d", fontWeight: 600 }}>
                        <CheckCircleOutlined /> Ready
                    </Text>
                ) : (
                    <Text type="warning">Pending</Text>
                );
            },
        },
        {
            title: "Actions",
            key: "actions",
            width: 140,
            fixed: 'right',
            render: (_, record) => (
                <Space size={0} wrap>
                    {editingRowKey === record.catchNo ? (
                        <>
                            <Button
                                type="link"
                                size="small"
                                onClick={() => saveEditingRow(record.catchNo)}
                            >
                                Save
                            </Button>
                            <Button
                                type="link"
                                size="small"
                                onClick={cancelEditingRow}
                            >
                                Cancel
                            </Button>
                        </>
                    ) : (
                        <Button
                            type="link"
                            size="small"
                            onClick={() => startEditingRow(record)}
                        >
                            Edit
                        </Button>
                    )}
                </Space>
            ),
        },
    ], [displayFields, editingRowKey, editingDraft, searchText, searchedColumn]);

    const availableCatchNumberOptions = missingDataRows
        .map((row) => row.catchNo)
        .filter((catchNo) => !selectedCatchNumbers.includes(catchNo));

    return (
        <div className="pt-2">
            <style>
                {`
          .missing-data-compact-upload.ant-upload-wrapper .ant-upload.ant-upload-drag {
            padding: 0 !important;
          }

          .missing-data-compact-upload.ant-upload-wrapper .ant-upload-drag .ant-upload-btn {
            padding: 0px 10px !important;
          }

          .missing-data-compact-upload.ant-upload-wrapper .ant-upload-drag p.ant-upload-drag-icon {
            margin-bottom: 4px !important;
          }

          .missing-data-compact-upload.ant-upload-wrapper .ant-upload-drag p.ant-upload-text {
            margin-bottom: 0 !important;
          }
        `}
            </style>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
            >
                <Card
                    bordered
                    style={{
                        border: "1px solid #d9d9d9",
                        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                        backgroundColor: "#f5f5f5",
                    }}
                >
                    <Space direction="vertical" size={12} style={{ width: "100%" }}>
                        <div className="rounded-xl border border-blue-100 bg-gradient-to-b from-white to-blue-50/60 p-3 shadow-sm sm:p-4">
                            <div className="mb-3 flex flex-col gap-2 sm:mb-4 md:flex-row md:items-start md:justify-between">
                                <div className="min-w-0 flex-1">
                                    <Title level={5} style={{ margin: 0 }}>
                                        Fill Missing Data
                                    </Title>
                                    <Text type="secondary" className="block text-xs leading-5 sm:max-w-xl">
                                        Select fields to display, generate template with desired fields, fill and upload for review.
                                    </Text>
                                </div>
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={() => setShowTemplateFieldsModal(true)}
                                    loading={loadingTemplateData}
                                    size="small"
                                    className="w-full rounded-lg font-semibold sm:w-auto"
                                >
                                    Generate Template
                                </Button>
                            </div>

                            <div className="grid items-start gap-3 md:gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(320px,42%)]">

                                {/* LEFT SECTION */}
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">

                                    {summaryItems(
                                        loadingTemplateData,
                                        templateRows,
                                        reviewRows,
                                        completedCount
                                    ).map((item) => (
                                        <div
                                            key={item.label}
                                            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4 sm:py-3"
                                        >
                                            <div className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                                                {item.label}
                                            </div>

                                            <div className={`mt-1 text-lg font-semibold ${item.valueClass}`}>
                                                {item.value}
                                            </div>
                                        </div>
                                    ))}

                                </div>


                                {/* RIGHT SECTION */}
                                <div className="w-full rounded-lg border border-slate-200 bg-white p-1 shadow-sm xl:justify-self-end">


                                    <Upload.Dragger
                                        className="missing-data-compact-upload"
                                        accept=".xlsx,.xls"
                                        fileList={fileList}
                                        beforeUpload={beforeUpload}
                                        onRemove={handleRemove}
                                        maxCount={1}
                                        style={{ padding: 0, minHeight: 10 }}
                                    >
                                        <p className="mb-1 text-xs font-medium text-slate-600">
                                            Upload your filled template here:
                                        </p>

                                        <UploadOutlined style={{ fontSize: 18 }} />
                                        <p className="text-xs mt-0.5 mb-0.5">Drag & drop or choose file</p>

                                    </Upload.Dragger>

                                </div>
                            </div>
                        </div>

                        <Card
                            title="Upload, Review and Submit"
                            style={{ boxShadow: "0 4px 8px rgba(0,0,0,0.08)" }}
                            bodyStyle={{ paddingTop: 0 }}
                            extra={
                                <Space size={8}>
                                    <Button
                                        onClick={() => setShowDisplayFieldsModal(true)}
                                        disabled={!reviewRows.length}
                                    >
                                        Display Fields
                                    </Button>
                                    <Button
                                        onClick={() => setShowBulkUpdate((prev) => !prev)}
                                        disabled={!reviewRows.length}
                                    >
                                        {showBulkUpdate ? "Hide Bulk Update" : "Bulk Update"}
                                    </Button>
                                    <Button
                                        type="primary"
                                        onClick={handleSubmit}
                                        disabled={!reviewRows.length}
                                        loading={submitting}
                                    >
                                        Submit
                                    </Button>
                                </Space>
                            }
                        >
                            <Space direction="vertical" size={16} style={{ width: "100%" }}>
                                {showBulkUpdate && (
                                    <div className="pt-2">
                                        <div className="rounded-xl border border-slate-200 bg-white p-3">
                                            <div className="mb-3">
                                                <Text type="secondary" className="mb-2 block text-[11px] font-medium">
                                                    Select Catch Numbers
                                                </Text>
                                                <Select
                                                    mode="multiple"
                                                    allowClear
                                                    showSearch
                                                    size="small"
                                                    placeholder="Choose catch numbers"
                                                    value={selectedCatchNumbers}
                                                    onChange={handleCatchNumberSelectionChange}
                                                    style={{ width: "100%" }}
                                                    optionFilterProp="label"
                                                    maxTagCount="responsive"
                                                    maxTagPlaceholder={(omittedValues) => `+${omittedValues.length}`}
                                                    options={availableCatchNumberOptions.map((catchNo) => ({
                                                        value: catchNo,
                                                        label: catchNo,
                                                    }))}
                                                />
                                            </div>
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                                {displayFields.map(field => {
                                                    const fieldName = field.name;
                                                    const isPages = fieldName === 'Pages';
                                                    const isExamDate = fieldName === 'ExamDate';
                                                    const isExamTime = fieldName === 'ExamTime';

                                                    return (
                                                        <div key={field.fieldId}>
                                                            <Text type="secondary" className="mb-1 block text-[11px] font-medium">
                                                                Set {fieldName}
                                                            </Text>
                                                            {isPages ? (
                                                                <InputNumber
                                                                    size="small"
                                                                    min={0}
                                                                    value={bulkValues[fieldName]}
                                                                    placeholder={fieldName}
                                                                    style={{ width: "100%" }}
                                                                    onChange={(value) =>
                                                                        setBulkValues((prev) => ({
                                                                            ...prev,
                                                                            [fieldName]: value,
                                                                        }))
                                                                    }
                                                                />
                                                            ) : isExamDate ? (
                                                                <DatePicker
                                                                    size="small"
                                                                    format="DD-MM-YYYY"
                                                                    style={{ width: "100%" }}
                                                                    value={parseDateValue(bulkValues[fieldName])}
                                                                    onChange={(date) =>
                                                                        setBulkValues((prev) => ({
                                                                            ...prev,
                                                                            [fieldName]: date ? date.format("DD-MM-YYYY") : "",
                                                                        }))
                                                                    }
                                                                />
                                                            ) : isExamTime ? (
                                                                <TimePicker
                                                                    size="small"
                                                                    format={TIME_FORMAT}
                                                                    use12Hours
                                                                    style={{ width: "100%" }}
                                                                    value={parseTimeValue(bulkValues[fieldName])}
                                                                    changeOnScroll
                                                                    needConfirm
                                                                    onChange={(time) =>
                                                                        setBulkValues((prev) => ({
                                                                            ...prev,
                                                                            [fieldName]: time ? time.format(TIME_FORMAT) : "",
                                                                        }))
                                                                    }
                                                                />
                                                            ) : (
                                                                <Input
                                                                    size="small"
                                                                    value={bulkValues[fieldName] || ""}
                                                                    placeholder={fieldName}
                                                                    style={{ width: "100%" }}
                                                                    onChange={(e) =>
                                                                        setBulkValues((prev) => ({
                                                                            ...prev,
                                                                            [fieldName]: e.target.value,
                                                                        }))
                                                                    }
                                                                />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                            <div className="mt-3 flex gap-2">
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    onClick={handleApplyToSelected}
                                                    className="rounded-md font-medium shadow-sm"
                                                >
                                                    Apply to Selected
                                                </Button>
                                                <Button
                                                    size="small"
                                                    onClick={() => {
                                                        setBulkValues({});
                                                        setSelectedCatchNumbers([]);
                                                    }}
                                                    className="rounded-md border-slate-300 font-medium text-slate-700"
                                                >
                                                    Clear
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                <Table
                                    columns={columns}
                                    dataSource={reviewRows}
                                    rowKey="catchNo"
                                    rowSelection={{
                                        selectedRowKeys,
                                        onChange: handleRowSelectionChange,
                                        hideSelectAll: true,
                                        columnTitle: (
                                            <Checkbox
                                                checked={
                                                    !!allReviewRowKeys.length &&
                                                    selectedRowKeys.length === allReviewRowKeys.length
                                                }
                                                indeterminate={
                                                    selectedRowKeys.length > 0 &&
                                                    selectedRowKeys.length < allReviewRowKeys.length
                                                }
                                                onChange={(event) =>
                                                    handleSelectAllRows(event.target.checked)
                                                }
                                            />
                                        ),
                                        preserveSelectedRowKeys: true,
                                    }}
                                    pagination={{
                                        current: tablePagination.current,
                                        pageSize: tablePagination.pageSize,
                                        showSizeChanger: true,
                                        pageSizeOptions: ["10", "20", "50", "100"],
                                        onChange: (page, pageSize) => {
                                            setTablePagination({
                                                current: page,
                                                pageSize,
                                            });
                                        },
                                    }}
                                    scroll={{ x: "max-content" }}
                                    locale={{
                                        emptyText: "Download the template, fill it, upload it, and review the rows here.",
                                    }}
                                />
                            </Space>
                        </Card>
                    </Space>
                </Card>

                {/* Display Fields Modal */}
                <Modal
                    title="Select Display Fields"
                    open={showDisplayFieldsModal}
                    onCancel={() => setShowDisplayFieldsModal(false)}
                    footer={[
                        <Button
                            key="selectAll"
                            size="small"
                            onClick={() => setDisplayFields([...availableFields])}
                            disabled={availableFields.length === 0}
                        >
                            Select All
                        </Button>,
                        <Button
                            key="clearAll"
                            size="small"
                            onClick={() => setDisplayFields([])}
                            disabled={displayFields.length === 0}
                        >
                            Clear All
                        </Button>,
                        <Button
                            key="ok"
                            type="primary"
                            onClick={() => setShowDisplayFieldsModal(false)}
                        >
                            OK
                        </Button>
                    ]}
                    width={500}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary">
                            Select unique fields from master to display in the table
                        </Text>
                    </div>
                    <Checkbox.Group
                        style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}
                        value={displayFields.map(f => f.fieldId)}
                        onChange={(checkedValues) => {
    const selected = availableFields.filter(f => checkedValues.includes(f.fieldId));
    setDisplayFields(selected);
    localStorage.setItem(
        "missingData_displayFields",
        JSON.stringify(checkedValues)
    );
}}
                    >
                        {availableFields.map(field => (
                            <Checkbox key={field.fieldId} value={field.fieldId}>
                                {field.name}
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                    {availableFields.length === 0 && (
                        <Text type="secondary">No unique fields available in master</Text>
                    )}
                </Modal>

                {/* Template Fields Modal */}
                <Modal
                    title="Select Template Fields"
                    open={showTemplateFieldsModal}
                    onCancel={() => setShowTemplateFieldsModal(false)}
                    footer={[
                        <Button
                            key="selectAll"
                            size="small"
                            onClick={() => setTemplateFields([...availableFields])}
                            disabled={availableFields.length === 0}
                        >
                            Select All
                        </Button>,
                        <Button
                            key="clearAll"
                            size="small"
                            onClick={() => setTemplateFields([])}
                            disabled={templateFields.length === 0}
                        >
                            Clear All
                        </Button>,
                        <Button
                            key="download"
                            type="primary"
                            onClick={handleDownloadTemplate}
                        >
                            Download Template
                        </Button>
                    ]}
                    width={500}
                >
                    <div style={{ marginBottom: 16 }}>
                        <Text type="secondary">
                            Select unique fields to include in the download template
                        </Text>
                    </div>
                    <Checkbox.Group
                        style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}
                        value={templateFields.map(f => f.fieldId)}
                        onChange={(checkedValues) => {
                            const selected = availableFields.filter(f => checkedValues.includes(f.fieldId));
                            setTemplateFields(selected);
                        }}
                    >
                        {availableFields.map(field => (
                            <Checkbox key={field.fieldId} value={field.fieldId}>
                                {field.name}
                            </Checkbox>
                        ))}
                    </Checkbox.Group>
                    {availableFields.length === 0 && (
                        <Text type="secondary">No unique fields available in master</Text>
                    )}
                </Modal>
            </motion.div>
        </div>
    );
};
export default MissingData;
