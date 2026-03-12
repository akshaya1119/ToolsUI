import React, { useEffect, useMemo, useState } from "react";
import "@ant-design/v5-patch-for-react-19";
import {
    Button,
    Card,
    Checkbox,
    DatePicker,
    InputNumber,
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
    FileExcelOutlined,
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
const TIME_FORMAT = "hh:mm:ss A";
const TIME_PARSE_FORMATS = [
    TIME_FORMAT,
    "hh:mm A",
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
    const [bulkValues, setBulkValues] = useState({
        pages: null,
        examDate: "",
        examTime: "",
    });
    const [showBulkUpdate, setShowBulkUpdate] = useState(false);
    const [tablePagination, setTablePagination] = useState({
        current: 1,
        pageSize: 10,
    });

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
                    uniqueByCatch.set(catchNo, {
                        key: catchNo,
                        catchNo,
                        pages: item?.Pages ?? item?.pages ?? "",
                        examDate: item?.ExamDate ?? item?.examDate ?? "",
                        examTime: normalizeTimeValue(item?.ExamTime ?? item?.examTime ?? ""),
                    });
                }
            });

            const rows = Array.from(uniqueByCatch.values()).sort((a, b) =>
                String(a.catchNo).localeCompare(String(b.catchNo), undefined, {
                    numeric: true,
                    sensitivity: "base",
                })
            );

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

    useEffect(() => {
        loadCatchTemplateData();
    }, [projectId]);

    useEffect(() => {
        if (selectedRowKeys.length) {
            setShowBulkUpdate(true);
        }
    }, [selectedRowKeys]);

    const handleDownloadTemplate = async () => {
        if (!templateRows.length) {
            showToast("No catch data available to generate template", "warning");
            return;
        }

        const worksheetData = templateRows.map((row) => ({
            "Catch No": row.catchNo,
            Pages: row.pages || "",
            ExamDate: row.examDate || "",
            ExamTime: row.examTime || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(worksheetData);
        worksheet["!cols"] = [
            { wch: 22 },
            { wch: 12 },
            { wch: 16 },
            { wch: 16 },
        ];

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "MissingDataTemplate");
        XLSX.writeFile(
            workbook,
            `missing_data_template_project_${projectId || "sample"}.xlsx`
        );
        showToast("Template downloaded", "success");
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
                const pagesIndex = headers.findIndex((h) => h === "pages");
                const examDateIndex = headers.findIndex((h) => h === "examdate");
                const examTimeIndex = headers.findIndex((h) => h === "examtime");

                if ([catchIndex, pagesIndex, examDateIndex, examTimeIndex].some((idx) => idx === -1)) {
                    showToast(
                        "Template columns must be Catch No, Pages, ExamDate and ExamTime",
                        "error"
                    );
                    return;
                }

                const uniqueRows = new Map();

                jsonData.slice(1).forEach((row) => {
                    const catchNo = String(row[catchIndex] ?? "").trim();
                    if (!catchNo) return;

                    uniqueRows.set(catchNo, {
                        key: catchNo,
                        catchNo,
                        pages: row[pagesIndex] === "" ? "" : Number(row[pagesIndex]),
                        examDate: parseExcelDate(row[examDateIndex]),
                        examTime: normalizeTimeValue(row[examTimeIndex]),
                    });
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
        setEditingDraft({
            pages: record.pages,
            examDate: record.examDate,
            examTime: record.examTime,
        });
    };

    const cancelEditingRow = () => {
        setEditingRowKey(null);
        setEditingDraft({
            pages: "",
            examDate: "",
            examTime: "",
        });
    };

    const saveEditingRow = (catchNo) => {
        setMissingDataRows((prev) =>
            prev.map((row) =>
                row.catchNo === catchNo
                    ? {
                        ...row,
                        pages: editingDraft.pages === null ? "" : editingDraft.pages,
                        examDate: editingDraft.examDate || "",
                        examTime: editingDraft.examTime || "",
                    }
                    : row
            )
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

        setMissingDataRows((prev) =>
            prev.map((row) => (matcher(row) ? { ...row, ...effectivePatch } : row))
        );
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

        const payload = missingDataRows.map((row) => ({
            catchNo: row.catchNo,
            pages: row.pages === "" ? null : Number(row.pages),
            examDate: row.examDate || null,
            examTime: row.examTime || null,
        }));

        setSubmitting(true);
        try {
            console.log("Missing data payload to backend:", {
                projectId,
                data: payload,
            });
            showToast("Missing data payload logged in console", "success");
        } finally {
            setSubmitting(false);
        }
    };

    const columns = [
        {
            title: "Catch No",
            dataIndex: "catchNo",
            key: "catchNo",
            width: 160,
            sorter: (a, b) => compareTableValues(a.catchNo, b.catchNo),
            render: (value) => <Text strong>{value}</Text>,
        },
        {
            title: "Pages",
            dataIndex: "pages",
            key: "pages",
            width: 110,
            sorter: (a, b) => compareTableValues(a.pages, b.pages),
            render: (value, record) => (
                editingRowKey === record.catchNo ? (
                    <InputNumber
                        min={0}
                        value={editingDraft.pages === "" ? null : editingDraft.pages}
                        placeholder="Pages"
                        size="small"
                        style={{ width: "100%" }}
                        onChange={(nextValue) =>
                            setEditingDraft((prev) => ({
                                ...prev,
                                pages: nextValue === null ? "" : nextValue,
                            }))
                        }
                    />
                ) : (
                    value || <Text type="secondary">-</Text>
                )
            ),
        },
        {
            title: "Exam Date",
            dataIndex: "examDate",
            key: "examDate",
            width: 140,
            sorter: (a, b) => compareTableValues(a.examDate, b.examDate),
            render: (value, record) => (
                editingRowKey === record.catchNo ? (
                    <DatePicker
                        size="small"
                        format="DD-MM-YYYY"
                        value={parseDateValue(editingDraft.examDate)}
                        style={{ width: "100%" }}
                        onChange={(date) =>
                            setEditingDraft((prev) => ({
                                ...prev,
                                examDate: date ? date.format("DD-MM-YYYY") : "",
                            }))
                        }
                    />
                ) : (
                    value || <Text type="secondary">-</Text>
                )
            ),
        },
        {
            title: "Exam Time",
            dataIndex: "examTime",
            key: "examTime",
            width: 130,
            sorter: (a, b) => compareTableValues(a.examTime, b.examTime),
            render: (value, record) => (
                editingRowKey === record.catchNo ? (
                    <TimePicker
                        size="small"
                        format={TIME_FORMAT}
                        use12Hours
                        value={parseTimeValue(editingDraft.examTime)}
                        style={{ width: "100%" }}
                        changeOnScroll
                        needConfirm={false}
                        onChange={(time) =>
                            setEditingDraft((prev) => ({
                                ...prev,
                                examTime: time ? time.format(TIME_FORMAT) : "",
                            }))
                        }
                    />
                ) : (
                    value || <Text type="secondary">-</Text>
                )
            ),
        },
        {
            title: "Status",
            key: "status",
            width: 110,
            sorter: (a, b) =>
                compareTableValues(
                    a.pages !== "" && a.examDate !== "" && a.examTime !== "" ? "Ready" : "Pending",
                    b.pages !== "" && b.examDate !== "" && b.examTime !== "" ? "Ready" : "Pending"
                ),
            render: (_, record) => {
                const isComplete =
                    record.pages !== "" &&
                    record.examDate !== "" &&
                    record.examTime !== "";

                return isComplete ? (
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
    ];

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
                                        Download the template, fill `Pages`, `ExamDate`, and `ExamTime`, then upload it for review.
                                    </Text>
                                </div>
                                <Button
                                    type="primary"
                                    icon={<DownloadOutlined />}
                                    onClick={handleDownloadTemplate}
                                    loading={loadingTemplateData}
                                    size="small"
                                    className="w-full rounded-lg font-semibold sm:w-auto"
                                >
                                    Download Template
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
                                            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.8fr)_minmax(120px,1fr)_minmax(170px,1fr)_minmax(190px,1.15fr)_minmax(150px,0.95fr)_minmax(110px,0.8fr)] xl:items-end">
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
                                            <div>
                                                <Text type="secondary" className="mb-1 block text-[11px] font-medium">
                                                    Set Pages
                                                </Text>
                                                <InputNumber
                                                    size="small"
                                                    min={0}
                                                    value={bulkValues.pages}
                                                    placeholder="Pages"
                                                    style={{ width: "100%" }}
                                                    onChange={(value) =>
                                                        setBulkValues((prev) => ({
                                                            ...prev,
                                                            pages: value,
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Text type="secondary" className="mb-1 block text-[11px] font-medium">
                                                    Set Exam Date
                                                </Text>
                                                <DatePicker
                                                    size="small"
                                                    format="DD-MM-YYYY"
                                                    style={{ width: "100%" }}
                                                    value={parseDateValue(bulkValues.examDate)}
                                                    onChange={(date) =>
                                                        setBulkValues((prev) => ({
                                                            ...prev,
                                                            examDate: date ? date.format("DD-MM-YYYY") : "",
                                                        }))
                                                    }
                                                />
                                            </div>
                                            <div>
                                                <Text type="secondary" className="mb-1 block text-[11px] font-medium">
                                                    Set Exam Time
                                                </Text>
                                                <TimePicker
                                                    size="small"
                                                    format={TIME_FORMAT}
                                                    use12Hours
                                                    style={{ width: "100%" }}
                                                    value={parseTimeValue(bulkValues.examTime)}
                                                    changeOnScroll
                                                    needConfirm={false}
                                                    onChange={(time) =>
                                                        setBulkValues((prev) => ({
                                                            ...prev,
                                                            examTime: time ? time.format(TIME_FORMAT) : "",
                                                        }))
                                                    }
                                                />
                                            </div>
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
                                                        setBulkValues({
                                                            pages: null,
                                                            examDate: "",
                                                            examTime: "",
                                                        });
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
        </div>
    );
};

export default MissingData;
