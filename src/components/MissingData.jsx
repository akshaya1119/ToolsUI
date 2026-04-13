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
    String(value).trim().toLowerCase().replace(/\s+/g, "");

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
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [searchText, setSearchText] = useState("");
    const [searchedColumn, setSearchedColumn] = useState("");
    const [tablePagination, setTablePagination] = useState({
        current: 1,
        pageSize: 10,
    });
    const [showFieldSelectionModal, setShowFieldSelectionModal] = useState(false);
    const [fieldSelectionMode, setFieldSelectionMode] = useState('template'); // 'template' or 'display'
    const [availableFields, setAvailableFields] = useState([]);
    const [selectedTemplateFields, setSelectedTemplateFields] = useState(() => {
        // Load from localStorage on initial render
        const saved = localStorage.getItem('missingData_templateFields');
        return saved ? JSON.parse(saved) : [];
    });
    const [selectedDisplayFields, setSelectedDisplayFields] = useState(() => {
        // Load from localStorage on initial render
        const saved = localStorage.getItem('missingData_displayFields');
        return saved ? JSON.parse(saved) : [];
    });
    const [loadingFields, setLoadingFields] = useState(false);
    const [allCatchData, setAllCatchData] = useState([]); // Store all catch data with all fields
    const [bulkValues, setBulkValues] = useState({
        pages: null,
        examDate: "",
        examTime: "",
    });
    
    // Save template fields to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('missingData_templateFields', JSON.stringify(selectedTemplateFields));
    }, [selectedTemplateFields]);
    
    // Save display fields to localStorage whenever they change
    useEffect(() => {
        localStorage.setItem('missingData_displayFields', JSON.stringify(selectedDisplayFields));
    }, [selectedDisplayFields]);
    
    // Initialize bulk values when display fields change
    useEffect(() => {
        setBulkValues(prev => {
            const newValues = {};
            selectedDisplayFields.forEach(fieldName => {
                const fieldLower = fieldName.toLowerCase();
                newValues[fieldName] = fieldLower === 'pages' ? (prev[fieldName] || null) : (prev[fieldName] || "");
            });
            return newValues;
        });
    }, [selectedDisplayFields]);

    const loadCatchTemplateData = async () => {
        if (!projectId) {
            setTemplateRows([]);
            setAllCatchData([]);
            return;
        }

        setLoadingTemplateData(true);
        try {
            // Use the new endpoint that returns all catch data with all fields
            const res = await API.get(`/NRDatas/unique-catch-data/${projectId}`);
            console.log("Raw unique catch data from backend:", res.data);
            
            const allData = Array.isArray(res.data) ? res.data : [];
            
            // Store all data for template generation
            setAllCatchData(allData);
            
            if (allData.length > 0) {
                console.log("First catch data structure:", allData[0]);
                console.log("First catch data keys:", Object.keys(allData[0]));
            }
            
            // Create display rows with only selected display fields
            const displayRows = allData.map((item) => {
                const rowData = {
                    key: item.catchNo,
                    catchNo: item.catchNo,
                };
                
                // Add only selected display fields
                selectedDisplayFields.forEach(fieldName => {
                    // Check both exact case and case-insensitive
                    if (item.hasOwnProperty(fieldName)) {
                        rowData[fieldName] = item[fieldName] ?? "";
                    } else {
                        // Try case-insensitive match
                        const matchingKey = Object.keys(item).find(
                            key => key.toLowerCase() === fieldName.toLowerCase()
                        );
                        rowData[fieldName] = matchingKey ? (item[matchingKey] ?? "") : "";
                    }
                    
                    // Special handling for time fields
                    const fieldLower = fieldName.toLowerCase();
                    if (fieldLower === 'examtime' && rowData[fieldName]) {
                        rowData[fieldName] = normalizeTimeValue(rowData[fieldName]);
                    }
                });
                
                return rowData;
            });

            console.log("Display rows with selected fields:", displayRows);
            setTemplateRows(displayRows);
            setMissingDataRows(displayRows.map((row) => ({ ...row })));
        } catch (error) {
            console.error("Failed to load missing data template rows", error);
            showToast("Failed to load catch data for template", "error");
            setTemplateRows([]);
            setMissingDataRows([]);
            setAllCatchData([]);
        } finally {
            setLoadingTemplateData(false);
        }
    };

    useEffect(() => {
        loadCatchTemplateData();
    }, [projectId, selectedDisplayFields]);

    useEffect(() => {
        if (selectedRowKeys.length) {
            setShowBulkUpdate(true);
        }
    }, [selectedRowKeys]);

    const fetchUniqueFields = async () => {
        setLoadingFields(true);
        try {
            const res = await API.get('/Fields');
            console.log("Fetched fields - Full response:", res.data);
            
            // Log each field to see the structure
            if (res.data && res.data.length > 0) {
                console.log("First field structure:", res.data[0]);
                console.log("Field keys:", Object.keys(res.data[0]));
            }
            
            // Only CatchNo is constant - filter it out
            const staticFields = ['catchno'];
            
            // Handle both PascalCase (IsUnique) and camelCase (isUnique)
            const uniqueFields = res.data.filter(field => {
                const isUnique = field.IsUnique === true || field.isUnique === true;
                const fieldName = (field.Name || field.name || '').toLowerCase();
                const isStaticField = staticFields.includes(fieldName);
                
                console.log(`Field "${field.Name || field.name}" - IsUnique: ${field.IsUnique}, isUnique: ${field.isUnique}, isStatic: ${isStaticField}, filtered: ${isUnique && !isStaticField}`);
                
                return isUnique && !isStaticField;
            });
            
            console.log("Filtered unique fields (will be stored in NRDatas JSON):", uniqueFields);
            setAvailableFields(uniqueFields);
        } catch (error) {
            console.error("Failed to fetch unique fields", error);
            showToast("Failed to load available fields", "error");
        } finally {
            setLoadingFields(false);
        }
    };

    const handleOpenFieldSelection = (mode) => {
        setFieldSelectionMode(mode);
        fetchUniqueFields();
        setShowFieldSelectionModal(true);
    };

    const handleFieldSelectionOk = () => {
        setShowFieldSelectionModal(false);
        
        // If template mode and fields selected, trigger download
        if (fieldSelectionMode === 'template' && getCurrentSelectedFields().length > 0) {
            handleDownloadTemplate();
        }
        
        // If display mode, reload data
        if (fieldSelectionMode === 'display') {
            loadCatchTemplateData();
        }
    };
    
    const getCurrentSelectedFields = () => {
        return fieldSelectionMode === 'template' ? selectedTemplateFields : selectedDisplayFields;
    };
    
    const setCurrentSelectedFields = (fields) => {
        if (fieldSelectionMode === 'template') {
            setSelectedTemplateFields(fields);
        } else {
            setSelectedDisplayFields(fields);
        }
    };

    const handleDownloadTemplate = async () => {
        if (allCatchData.length === 0) {
            showToast("No catch data available to generate template", "warning");
            return;
        }

        if (selectedTemplateFields.length === 0) {
            showToast("Please select at least one field for the template", "warning");
            return;
        }

        // Use allCatchData which has all fields from the backend
        // If field exists in allCatchData, use it; otherwise leave empty
        const worksheetData = allCatchData.map((catchData) => {
            const rowData = {
                "Catch No": catchData.catchNo,
            };
            
            // Add all selected template fields
            selectedTemplateFields.forEach(fieldName => {
                // Check both exact case and case-insensitive
                if (catchData.hasOwnProperty(fieldName)) {
                    rowData[fieldName] = catchData[fieldName] ?? "";
                } else {
                    // Try case-insensitive match
                    const matchingKey = Object.keys(catchData).find(
                        key => key.toLowerCase() === fieldName.toLowerCase()
                    );
                    rowData[fieldName] = matchingKey ? (catchData[matchingKey] ?? "") : "";
                }
            });
            
            return rowData;
        });

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        const columnWidths = [
            { wch: 22 }, // Catch No
            ...selectedTemplateFields.map(() => ({ wch: 16 }))
        ];
        worksheet["!cols"] = columnWidths;

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MissingDataTemplate");
        XLSX.writeFile(
            workbook,
            `missing_data_template_project_${projectId || "sample"}.xlsx`
        );
        showToast("Template downloaded successfully", "success");
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
                const catchIndex = headers.findIndex((h) => h === "catchno");

                if (catchIndex === -1) {
                    showToast("Template must include Catch No column", "error");
                    return;
                }

                // Find indices for all selected dynamic fields
                const dynamicFieldIndices = {};
                selectedTemplateFields.forEach(fieldName => {
                    const index = headers.findIndex(h => h === normalizeHeader(fieldName));
                    if (index !== -1) {
                        dynamicFieldIndices[fieldName] = index;
                    }
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
                    Object.entries(dynamicFieldIndices).forEach(([fieldName, index]) => {
                        const fieldLower = fieldName.toLowerCase();
                        if (fieldLower === 'pages') {
                            rowData[fieldName] = row[index] === "" ? "" : Number(row[index]);
                        } else if (fieldLower === 'examdate') {
                            rowData[fieldName] = parseExcelDate(row[index]);
                        } else if (fieldLower === 'examtime') {
                            rowData[fieldName] = normalizeTimeValue(row[index]);
                        } else {
                            rowData[fieldName] = row[index] ?? "";
                        }
                    });

                    uniqueRows.set(catchNo, rowData);
                });

                const mergedRows = templateRows.map((templateRow) => {
                    const uploaded = uniqueRows.get(templateRow.catchNo);
                    return uploaded
                        ? {
                            ...templateRow,
                            ...uploaded,
                        }
                        : { ...templateRow };
                });

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
        setTablePagination({
            current: 1,
            pageSize: 10,
        });
    };

    const reviewRows = useMemo(() => missingDataRows, [missingDataRows]);
    const allReviewRowKeys = useMemo(
        () => reviewRows.map((row) => row.catchNo),
        [reviewRows]
    );

    const completedCount = useMemo(
        () =>
            missingDataRows.filter(
                (row) =>
                    row.pages !== "" &&
                    row.examDate !== "" &&
                    row.examTime !== ""
            ).length,
        [missingDataRows]
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
        const draft = {
            pages: record.pages,
            examDate: record.examDate,
            examTime: record.examTime,
        };
        
        // Add dynamic fields to draft
        selectedDisplayFields.forEach(fieldName => {
            draft[fieldName] = record[fieldName] || "";
        });
        
        setEditingDraft(draft);
    };

    const cancelEditingRow = () => {
        setEditingRowKey(null);
        const draft = {
            pages: "",
            examDate: "",
            examTime: "",
        };
        
        // Reset dynamic fields
        selectedDisplayFields.forEach(fieldName => {
            draft[fieldName] = "";
        });
        
        setEditingDraft(draft);
    };

    const saveEditingRow = (catchNo) => {
        setMissingDataRows((prev) =>
            prev.map((row) => {
                if (row.catchNo === catchNo) {
                    const updatedRow = {
                        ...row,
                        pages: editingDraft.pages === null ? "" : editingDraft.pages,
                        examDate: editingDraft.examDate || "",
                        examTime: editingDraft.examTime || "",
                    };
                    
                    // Update dynamic fields
                    selectedDisplayFields.forEach(fieldName => {
                        updatedRow[fieldName] = editingDraft[fieldName] || "";
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

        console.log("Applying patch:", effectivePatch);

        if (!Object.keys(effectivePatch).length) {
            showToast("Enter at least one bulk value first", "warning");
            return;
        }

        setMissingDataRows((prev) => {
            const updated = prev.map((row) => {
                if (matcher(row)) {
                    console.log("Updating row:", row.catchNo, "with patch:", effectivePatch);
                    return { ...row, ...effectivePatch };
                }
                return row;
            });
            return updated;
        });
        
        showToast("Bulk update applied successfully", "success");
    };

    const handleApplyToSelected = () => {
        const targetCatchNos = Array.from(
            new Set([...selectedRowKeys, ...selectedCatchNumbers])
        );

        if (!targetCatchNos.length) {
            showToast("Select rows or catch numbers first", "warning");
            return;
        }

        console.log("Applying to catch numbers:", targetCatchNos);
        console.log("Bulk values:", bulkValues);

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

        if (selectedDisplayFields.length === 0) {
            showToast("Please select display fields first", "warning");
            return;
        }

        const payload = missingDataRows.map((row) => {
            const rowData = {
                catchNo: row.catchNo,
            };
            
            // All selected display fields go into additionalFields (including Pages, ExamDate, ExamTime)
            const additionalFields = {};
            selectedDisplayFields.forEach(fieldName => {
                if (isMeaningfulValue(row[fieldName])) {
                    const fieldLower = fieldName.toLowerCase();
                    if (fieldLower === 'pages') {
                        additionalFields[fieldName] = Number(row[fieldName]);
                    } else {
                        additionalFields[fieldName] = String(row[fieldName]).trim();
                    }
                }
            });
            
            if (Object.keys(additionalFields).length > 0) {
                rowData.additionalFields = additionalFields;
            }
            
            return rowData;
        });

        console.log("Payload before filtering:", payload);

        const rowsToSubmit = payload.filter(row => 
            row.additionalFields && Object.keys(row.additionalFields).length > 0
        );

        console.log("Rows to submit:", rowsToSubmit);

        if (!rowsToSubmit.length) {
            showToast("At least one field value is required", "warning");
            return;
        }

        setSubmitting(true);
        try {
            console.log("Sending to API:", {
                projectId,
                data: rowsToSubmit,
            });
            
            const response = await API.post("/NRDatas/missing-data", {
                projectId,
                data: rowsToSubmit,
            });
            
            console.log("API Response:", response.data);
            showToast("Missing data saved successfully", "success");
            await loadCatchTemplateData();
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
            console.error("Error response:", error?.response);
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
        // All other columns are dynamic based on selected display fields
        ...selectedDisplayFields.map(fieldName => {
            const fieldLower = fieldName.toLowerCase();
            const isPages = fieldLower === 'pages';
            const isExamDate = fieldLower === 'examdate';
            const isExamTime = fieldLower === 'examtime';
            
            return {
                title: fieldName,
                dataIndex: fieldName,
                key: fieldName,
                width: 140,
                ...getColumnSearchProps(fieldName),
                sorter: (a, b) => compareTableValues(a[fieldName], b[fieldName]),
                render: (value, record) => {
                    if (editingRowKey === record.catchNo) {
                        // Editing mode
                        if (isPages) {
                            return (
                                <InputNumber
                                    min={0}
                                    value={editingDraft[fieldName] === "" ? null : editingDraft[fieldName]}
                                    placeholder={fieldName}
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
                                    size="small"
                                    value={editingDraft[fieldName] || ""}
                                    placeholder={fieldName}
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
                    } else {
                        // Display mode
                        return renderDisplayValue(value);
                    }
                },
            };
        }),
        {
            title: "Status",
            dataIndex: "status",
            key: "status",
            width: 110,
            fixed: 'right',
            ...getColumnSearchProps("status"),
            sorter: (a, b) => {
                const aHasData = selectedDisplayFields.some(f => isMeaningfulValue(a[f]));
                const bHasData = selectedDisplayFields.some(f => isMeaningfulValue(b[f]));
                return compareTableValues(
                    aHasData ? "Ready" : "Pending",
                    bHasData ? "Ready" : "Pending"
                );
            },
            render: (_, record) => {
                const hasData = selectedDisplayFields.some(f => isMeaningfulValue(record[f]));

                return hasData ? (
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
    ], [selectedDisplayFields, editingRowKey, editingDraft, getColumnSearchProps]);

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
                                </div>
                                <Space>
                                    <Button
                                        size="small"
                                        onClick={() => handleOpenFieldSelection('template')}
                                        className="rounded-lg font-semibold"
                                        type="primary"
                                    >
                                        Generate Template
                                    </Button>
                                </Space>
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
                                        size="small"
                                        onClick={() => handleOpenFieldSelection('display')}
                                    >
                                        Select Display Fields
                                    </Button>
                                    <Button
                                        onClick={() => setShowBulkUpdate((prev) => !prev)}
                                        disabled={!reviewRows.length || selectedDisplayFields.length === 0}
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
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:items-end" style={{ 
                                                gridTemplateColumns: `repeat(auto-fit, minmax(180px, 1fr))`
                                            }}>
                                            <div>
                                                <Text type="secondary" className="mb-1 block text-[11px] font-medium">
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
                                            {/* Dynamic fields for bulk update */}
                                            {selectedDisplayFields.map(fieldName => {
                                                const fieldLower = fieldName.toLowerCase();
                                                const isPages = fieldLower === 'pages';
                                                const isExamDate = fieldLower === 'examdate';
                                                const isExamTime = fieldLower === 'examtime';
                                                
                                                return (
                                                    <div key={fieldName}>
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
                                            <div>
                                                <Text type="secondary" className="mb-1 block text-[11px] font-medium">
                                                    &nbsp;
                                                </Text>
                                                <Button
                                                    size="small"
                                                    type="primary"
                                                    onClick={handleApplyToSelected}
                                                    className="w-full rounded-md font-medium shadow-sm"
                                                >
                                                    Apply to Selected
                                                </Button>
                                            </div>
                                            <div>
                                                <Text type="secondary" className="mb-1 block text-[11px] font-medium">
                                                    &nbsp;
                                                </Text>
                                                <Button
                                                    size="small"
                                                    onClick={() => {
                                                        const resetValues = {};
                                                        selectedDisplayFields.forEach(fieldName => {
                                                            const fieldLower = fieldName.toLowerCase();
                                                            resetValues[fieldName] = fieldLower === 'pages' ? null : "";
                                                        });
                                                        setBulkValues(resetValues);
                                                        setSelectedCatchNumbers([]);
                                                    }}
                                                    className="w-full rounded-md border-slate-300 font-medium text-slate-700"
                                                >
                                                    Clear
                                                </Button>
                                            </div>
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
            </motion.div>

            {/* Field Selection Modal */}
            <Modal
                title={fieldSelectionMode === 'template' ? 'Select Template Fields' : 'Select Display Fields'}
                open={showFieldSelectionModal}
                onOk={handleFieldSelectionOk}
                onCancel={() => setShowFieldSelectionModal(false)}
                width={600}
                footer={[
                    <Button 
                        key="clear" 
                        onClick={() => setCurrentSelectedFields([])}
                        disabled={getCurrentSelectedFields().length === 0}
                    >
                        Clear All
                    </Button>,
                    <Button 
                        key="selectAll" 
                        onClick={() => setCurrentSelectedFields(availableFields.map(f => f.name || f.Name))}
                        disabled={availableFields.length === 0 || getCurrentSelectedFields().length === availableFields.length}
                    >
                        Select All
                    </Button>,
                    <Button key="ok" type="primary" onClick={handleFieldSelectionOk}>
                        {fieldSelectionMode === 'template' ? 'Download Template' : 'OK'}
                    </Button>,
                ]}
            >
                <div style={{ marginBottom: 16 }}>
                    <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                        {fieldSelectionMode === 'template' 
                            ? 'Select fields to include in the Excel template for data entry.'
                            : 'Select fields to display in the review table below.'}
                    </Text>
                    {getCurrentSelectedFields().length > 0 && (
                        <div style={{ marginTop: 8 }}>
                            <Text strong style={{ fontSize: 12 }}>
                                Selected: {getCurrentSelectedFields().length} field{getCurrentSelectedFields().length !== 1 ? 's' : ''}
                            </Text>
                        </div>
                    )}
                </div>
                {loadingFields ? (
                    <Text>Loading fields...</Text>
                ) : availableFields.length === 0 ? (
                    <div>
                        <Text type="warning" style={{ display: 'block', marginBottom: 8 }}>
                            No unique fields found. This might be a data issue.
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Please check the browser console for debugging information, or verify that fields in the database have IsUnique = true.
                        </Text>
                    </div>
                ) : (
                    <Checkbox.Group
                        style={{ width: '100%' }}
                        value={getCurrentSelectedFields()}
                        onChange={setCurrentSelectedFields}
                    >
                        <Space direction="vertical" style={{ width: '100%' }}>
                            {availableFields.map(field => {
                                const fieldName = field.name || field.Name;
                                const isSelected = getCurrentSelectedFields().includes(fieldName);
                                return (
                                    <Checkbox 
                                        key={field.fieldId || field.FieldId} 
                                        value={fieldName}
                                    >
                                        {fieldName} {isSelected && <CheckCircleOutlined style={{ color: '#52c41a', marginLeft: 4 }} />}
                                    </Checkbox>
                                );
                            })}
                        </Space>
                    </Checkbox.Group>
                )}
            </Modal>
        </div>
    );
};

export default MissingData;
