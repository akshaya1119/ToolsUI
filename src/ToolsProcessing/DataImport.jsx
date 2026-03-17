import React, { useEffect, useState } from 'react';
import '@ant-design/v5-patch-for-react-19'
import { Row, Col, Card, Select, Upload, Button, Typography, Space, Table, Tabs, Checkbox, Input, Modal, Radio } from 'antd';
import { useToast } from '../hooks/useToast';
import { CheckCircleOutlined, UploadOutlined, ToolOutlined, SearchOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import { motion } from 'framer-motion';
import API from '../hooks/api';
import useStore from '../stores/ProjectData';
import useDebounce from '../services/useDebounce';
import MissingData from '../components/MissingData';
import DataImportConflictReport from '../components/DataImportConflictReport';

const { Text } = Typography;
const { Option } = Select;
const { TabPane } = Tabs;
const PRIMARY_COLOR = "#1677ff";

const DataImport = () => {
  const { showToast } = useToast();
  const [fileHeaders, setFileHeaders] = useState([]);
  const [expectedFields, setExpectedFields] = useState([]);
  const [fieldMappings, setFieldMappings] = useState({});
  const [excelData, setExcelData] = useState([]);
  const [conflicts, setConflicts] = useState(null);
  const [conflictSelections, setConflictSelections] = useState({});
  const [showData, setShowData] = useState(false);
  const [existingData, setExistingData] = useState([]); // ✅ default to []
  const [columns, setColumns] = useState([]); // ✅ default to []
  const [loading, setLoading] = useState(false); // ✅ added
  const [activeTab, setActiveTab] = useState("1");
  const token = localStorage.getItem('token');
  const projectId = useStore((state) => state.projectId);
  const [keepZeroQuantity, setKeepZeroQuantity] = useState(false);
  const [skipItems, setSkipItems] = useState(false);
  const [quantity, setQuantity] = useState(0);
  const [isCorrectedNrdataReport, setIsCorrectedNrdataReport] = useState(false);
  const [fileList, setFileList] = useState([]);
  const [requiredFieldNames, setRequiredFieldNames] = useState([]);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });
  const [searchText, setSearchText] = useState('');
  const [searchedColumn, setSearchedColumn] = useState('');
  const debouncedSearchText = useDebounce(searchText, 500);
  const [skippedRows, setSkippedRows] = useState([]);
  const [editableSkippedRows, setEditableSkippedRows] = useState([]); // user-edited cells
  const [selectedUploadedCatchNos, setSelectedUploadedCatchNos] = useState([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeModalSeparator, setMergeModalSeparator] = useState("/");
  const [mergeModuleId, setMergeModuleId] = useState(null);
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [uploadedTableSorter, setUploadedTableSorter] = useState({ field: null, order: null });
  // Load projects
  useEffect(() => {
    if (!projectId) return;
    API.get(`/Fields`)
      .then(res => {
        setExpectedFields(res.data);
        // Fetch project config and build required fields list
        API.get(`/ProjectConfigs/ByProject/${projectId}`)
          .then(configRes => {
            const config = configRes.data;
            const configuredFieldIds = new Set();

            // Collect all field IDs referenced in the project configuration
            (config.envelopeMakingCriteria || []).forEach(id => configuredFieldIds.add(id));
            (config.boxBreakingCriteria || []).forEach(id => configuredFieldIds.add(id));
            (config.duplicateRemoveFields || []).forEach(id => configuredFieldIds.add(id));
            (config.sortingBoxReport || []).forEach(id => configuredFieldIds.add(id));
            (config.innerBundlingCriteria || []).forEach(id => configuredFieldIds.add(id));

            const duplicateCriteria = Array.isArray(config.duplicateCriteria)
              ? config.duplicateCriteria
              : JSON.parse(config.duplicateCriteria || "[]");
            duplicateCriteria.forEach(id => configuredFieldIds.add(id));

            // Resolve field IDs to field names
            const fieldNames = res.data
              .filter(f => configuredFieldIds.has(f.fieldId))
              .map(f => f.name);

            // NRQuantity is always mandatory
            if (!fieldNames.includes("NRQuantity")) {
              fieldNames.push("NRQuantity");
            }

            setRequiredFieldNames(fieldNames);
          })
          .catch(err => {
            if (err.response?.status === 404) {
              console.warn("No project config found, using default required fields");
              setRequiredFieldNames(["NRQuantity"]);
            } else {
              console.error("Failed to fetch project config", err);
            }
          });
      })
      .catch(err => console.error("Failed to fetch fields", err));
  }, [projectId]);

  useEffect(() => {
    if (!projectId) return;
    fetchExistingData(projectId);
  }, [
    projectId,
    pagination.current,
    pagination.pageSize,
    debouncedSearchText,
    searchedColumn,
    uploadedTableSorter.field,
    uploadedTableSorter.order,
  ]);

  const fetchExistingData = async (projectId) => {
    if (!projectId) return;

    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/GetByProjectId/${projectId}`, {
        params: {
          pageSize: pagination.pageSize,
          pageNo: pagination.current,
          search: searchText || null,
          key: searchedColumn || null,
          sortField: uploadedTableSorter.field || null,
          sortOrder: uploadedTableSorter.order || null,
        },
      });
      setExistingData((res.data.items || []).map((item) => ({
        ...item,
        id: item.id ?? item.Id,
      })));
      setColumns((res.data.columns || []).filter((column) => column !== "NRDatas" && column !== "Id"))
      setPagination(prev => ({
        ...prev,
        total: res.data.totalCount
      }));
      setShowData(res.data.items && res.data.items.length > 0);
      setSelectedUploadedCatchNos([]);
    } catch (err) {
      console.error("Failed to fetch existing data", err);
      setExistingData([]);
      setShowData(false);
      setSelectedUploadedCatchNos([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchConflictReport = async () => {
    setActiveTab("2");
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/ErrorReport`, {
        params: {
          ProjectId: projectId,
        },
      });
      const report = {
        errors: res.data?.errors || res.data?.Errors || [],
      };
      const errors = report.errors;

      if (errors.length > 0) {
        setConflicts(report);
        showToast("Conflict report loaded", "success");
      } else {
        setConflicts({ errors: [] });
        showToast("No conflicts found", "info");
      }
    } catch (err) {
      console.error("Failed to fetch conflict report", err);
      showToast("Failed to load conflict report", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (record, selectedValue) => {
    const normalizedValue =
      selectedValue === undefined || selectedValue === null
        ? ""
        : String(selectedValue).trim();

    if (normalizedValue === "") {
      showToast('Please enter or select a value before saving.', "warning");
      return;
    }

    if (record.conflictType === "zero_nr_quantity") {
      const parsedValue = Number(normalizedValue);
      const minNrQuantity = record.minNrQuantity;
      const maxNrQuantity = record.maxNrQuantity;

      if (!Number.isFinite(parsedValue) || !Number.isInteger(parsedValue)) {
        showToast("Please enter a valid whole number for NRQuantity.", "warning");
        return;
      }

      if (parsedValue <= 0) {
        showToast("NRQuantity must be greater than 0.", "warning");
        return;
      }

      if (
        minNrQuantity !== undefined &&
        minNrQuantity !== null &&
        maxNrQuantity !== undefined &&
        maxNrQuantity !== null &&
        (parsedValue < minNrQuantity || parsedValue > maxNrQuantity)
      ) {
        showToast(`NRQuantity must be between ${minNrQuantity} and ${maxNrQuantity}.`, "warning");
        return;
      }
    }

    try {
      const payload = {
        conflictType: record.conflictType,
        catchNo: record.catchNo,
        catchNos: record.catchNos || [],
        rowIds: record.rowIds || [],
        importRowNos: record.importRowNos || [],
        uniqueField: record.uniqueField,
        field: record.field,
        selectedValue: normalizedValue,
        centreCode: record.centreCode,
        nodalCode: record.nodalCode,
        nodalCodeGroup: record.nodalCodeGroup,
        collegeName: record.collegeName,
        collegeCode: record.collegeCode,
        collegeKeyType: record.collegeKeyType,
        conflictingValues: record.conflictingValues || [],
        nodalCodes: record.nodalCodes || [],
        centerCodes: record.centerCodes || [],
      };

      await API.put(`/NRDatas?ProjectId=${projectId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(`Resolved conflict for ${record.catchNo || record.sourceValue || record.targetField}`, "success");
      await fetchConflictReport();
      await fetchExistingData(projectId);
    } catch (error) {
      console.error('Error saving resolution:', error);
      showToast('Failed to resolve conflict', "error");
    }
  };
  // Update state when user selects a value from dropdown
  const handleSelectionChange = (conflictKey, value) => {
    setConflictSelections((prev) => ({
      ...prev,
      [conflictKey]: value,
    }));
  };

  const handleIgnoreConflict = async (conflict) => {
    try {
      await API.put(`/NRDatas/conflicts/status?ProjectId=${projectId}`, {
        conflictType: conflict.conflictType,
        catchNo: conflict.catchNo,
        catchNos: conflict.catchNos || [],
        rowIds: conflict.rowIds || [],
        importRowNos: conflict.importRowNos || [],
        uniqueField: conflict.uniqueField,
        field: conflict.field,
        centreCode: conflict.centreCode,
        nodalCode: conflict.nodalCode,
        nodalCodeGroup: conflict.nodalCodeGroup,
        collegeName: conflict.collegeName,
        collegeCode: conflict.collegeCode,
        collegeKeyType: conflict.collegeKeyType,
        conflictingValues: conflict.conflictingValues || [],
        nodalCodes: conflict.nodalCodes || [],
        centerCodes: conflict.centerCodes || [],
        status: "ignored",
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setConflictSelections((prev) => {
        const updated = { ...prev };
        delete updated[conflict.key];
        return updated;
      });

      await fetchConflictReport();
      showToast("Conflict ignored", "success");
    } catch (error) {
      console.error("Error ignoring conflict:", error);
      showToast("Failed to ignore conflict", "error");
    }
  };

  const handleMergeSelectedRows = async (separator) => {
    if (selectedUploadedCatchNos.length !== 2) {
      showToast("Please select rows from exactly 2 catch numbers.", "warning");
      return;
    }

    try {
      setLoading(true);

      const selectedModule = (modules || []).find((m) => m?.id === mergeModuleId) || null;
      console.log("Merge payload module:", {
        moduleId: selectedModule?.id ?? null,
      });

      const res = await API.post(`/NRDatas/merge-catchnos?ProjectId=${projectId}`, {
        catchNos: selectedUploadedCatchNos,
        separator: separator || "/",
        moduleId: selectedModule?.id ?? null
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      showToast(res.data?.message || "Selected rows merged successfully.", "success");
      setSelectedUploadedCatchNos([]);
      await fetchExistingData(projectId);
      await fetchConflictReport();
      setActiveTab("1");
    } catch (error) {
      console.error("Error merging catch numbers:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Failed to merge selected rows";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
  };

  const openMergeModal = () => {
    if (activeTab !== "1") {
      setActiveTab("1");
    }

    if (selectedUploadedCatchNos.length !== 2) {
      showToast("Please select rows from exactly 2 catch numbers.", "warning");
      return;
    }

    setMergeModalSeparator("/");
    setMergeModuleId(null);
    setMergeModalOpen(true);
  };

  const confirmMerge = async () => {
    setMergeModalOpen(false);
    await handleMergeSelectedRows(mergeModalSeparator);
  };

  const loadModules = async () => {
    try {
      setLoadingModules(true);
      const res = await API.get(`/Modules`);
      setModules(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to load modules:", err);
      setModules([]);
      showToast("Failed to load modules", "error");
    } finally {
      setLoadingModules(false);
    }
  };

  useEffect(() => {
    if (!mergeModalOpen) return;
    if ((modules || []).length > 0) return;
    loadModules();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeModalOpen]);

  const selectedUploadedRowKeys = existingData
    .filter((row) => selectedUploadedCatchNos.includes(row.CatchNo))
    .map((row) => row.id);

  const handleUploadedTableChange = (nextPagination, filters, sorter) => {
    setPagination((prev) => ({
      ...prev,
      current: nextPagination.current,
      pageSize: nextPagination.pageSize,
    }));

    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    setUploadedTableSorter({
      field: normalizedSorter?.field ?? null,
      order: normalizedSorter?.order ?? null,
    });
  };


 
  const renderConflicts = () => {
    if (!conflicts) return <Text type="secondary">Click "Load Conflict Report" to see conflicts.</Text>;

    const errors = conflicts?.errors || [];
    if (errors.length === 0) {
      return <Text type="success">No conflicts found</Text>;
    }
    return (
      <div>
        
        <DataImportConflictReport
          conflicts={{ errors }}
          conflictSelections={conflictSelections}
          onSelectionChange={handleSelectionChange}
          onResolve={handleSave}
          onIgnore={handleIgnoreConflict}
          loading={loading}
        />
      </div>
    );
  };

  // Excel parsing
  const proceedWithReading = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target.result);
      const workbook = XLSX.read(data, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0];
      const rows = jsonData.slice(1).map(row => {
        let rowData = {};
        headers.forEach((header, index) => {
          const value = row[index];  // Define the value variable based on the current row's data
          rowData[header] = value;

          if (header === "ExamDate" && value) {
            rowData[header] = parseDate(value); // Parse date if it's for "ExamDate"
          }
        });

        return rowData;
      });

      setFileHeaders(headers);
      setExcelData(rows);
      setShowData(true);

      // Auto-map fields once after reading the file
      if (expectedFields.length > 0) {
        autoMapFields(headers, expectedFields);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const beforeUpload = (file) => {
    setFileList([file]); // Show the selected file
    setFileHeaders([]);
    setFieldMappings({});
    proceedWithReading(file);
    return false; // prevent auto upload
  };

  const autoMapFields = (headers, expected) => {
    const newMappings = {};
    const normalize = (str) => str.trim().toLowerCase().replace(/\s+/g, "");

    const keywordMappings = {
      catchno: ["catch", "catch number"],
      nodalcode: ["nodal", "nodal code"],
      examdate: ["date", "exam date"],
      examtime: ["time", "exam time"],
      nrquantity: ["count", "Nr", "cnt"],
      centercode: ["centre", "centre code"]
    };

    expected.forEach((expectedField) => {
      const normalizedExpected = normalize(expectedField.name);

      // Step 1: Try exact match
      const exactMatch = headers.find(
        (header) => normalize(header) === normalizedExpected
      );

      if (exactMatch) {
        newMappings[expectedField.fieldId] = exactMatch;
        return;
      }

      // Step 2: Try keyword-based matching
      const possibleKeywords = keywordMappings[normalizedExpected] || [];
      const keywordMatch = headers.find((header) => {
        const normalizedHeader = normalize(header);
        return possibleKeywords.some((keyword) =>
          normalizedHeader.includes(normalize(keyword))
        );
      });

      if (keywordMatch) {
        newMappings[expectedField.fieldId] = keywordMatch;
      }
    });

    setFieldMappings(newMappings);
  };

  const handleRemove = (file) => {
    setFileList([]); // Since only one file is allowed
    setFileHeaders([]);
    setFieldMappings({});
  };

  const isAnyFieldMapped = () => {
    return expectedFields.some(field => fieldMappings[field.fieldId]);
  };
  const resetForm = () => {
    setFileHeaders([]);
    setFileList([]);
    setFieldMappings({});
    setExcelData([]);
    setExpectedFields([]);
    setConflicts(null);
    setSkipItems(false)
    setQuantity(0);
    setKeepZeroQuantity(false);
    setIsCorrectedNrdataReport(false);
    setSkippedRows([]);
    setEditableSkippedRows([]);
  };

  const handleUpload = async () => {
    let mappedData = getMappedData();

    // Keep the original Excel row number in NRDatas JSON for conflict display.
    mappedData = mappedData.map(({ _rowIndex, _missingFields, ...cleanRow }) => ({
      ...cleanRow,
      ImportRowNo: String(Number(_rowIndex) + 2),
    }));

    if (mappedData.length === 0) {
      showToast("No valid rows to upload. Please map correctly and upload a file with data.", "error");
      return;
    }

    setLoading(true);

    if (keepZeroQuantity) {
      mappedData = mappedData.map((row) => {
        if (row.NRQuantity === 0) row.NRQuantity = quantity;
        return row;
      });
    }
    if (skipItems) {
      mappedData = mappedData.filter((row) => row.NRQuantity !== 0);
    }
    const payload = {
      projectId: Number(projectId),
      isCorrectedNrdataReport,
      data: mappedData.map(row => ({
        ...row,
        ExamDate: String(row.ExamDate),
      }))
    };

    try {
      if (isCorrectedNrdataReport) {
        const changedRes = await API.post(`/ChangedNr`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Changed NRData result:', changedRes.data);
        showToast(`Corrected NRData report uploaded (${mappedData.length} rows).`, "success");
      } else {
        const res = await API.post(`/NRDatas`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Validation result:', res.data);
        showToast(`Validation successful! ${mappedData.length} rows uploaded.`, "success");
      }

      resetForm();
      fetchExistingData(projectId);
    } catch (err) {
      console.error("Validation failed", err);

      const errorMessage =
        err?.response?.data?.message ||
        err?.response?.data ||
        err?.message ||
        "Validation failed";

      showToast(errorMessage, "error");
      resetForm();
    } finally {
      setLoading(false);
      setFileList([]);
    }
  };

  // const areRequiredFieldsMapped = () => {
  //   if (requiredFieldNames.length === 0) return true;
  //   return requiredFieldNames.every(fieldName => {
  //     const field = expectedFields.find(f => f.name === fieldName);
  //     return field && fieldMappings[field.fieldId];
  //   });
  // };

  const getMappedData = () => {
    if (!excelData.length || !fileHeaders.length) return [];
    const skipped = [];
    const mapped = excelData.map((row, rowIndex) => {
      const mappedRow = {};
      let isRowValid = true;
      const missingFields = [];

      expectedFields.forEach((field) => {
        const column = fieldMappings[field.fieldId];
        if (column) {
          let value = row[column] ?? null;
          if (field.name === "ExamDate" && value) {
            value = formatDateForBackend(parseDate(value));
          }
          if (requiredFieldNames.includes(field.name) && (value === null || value === undefined || value === "")) {
            isRowValid = false;
            missingFields.push(field.name);
          }
          mappedRow[field.name] = value;
        }
      });

      // Skip rows that are completely empty across all mapped columns
      const hasAnyValue = Object.values(mappedRow).some(v => v !== null && v !== undefined && v !== "");
      if (!hasAnyValue) return null;

      // If missing required fields, push to skipped to show in the UI table
      if (!isRowValid) {
        skipped.push({
          _rowIndex: rowIndex,
          _missingFields: missingFields,
          ...mappedRow,
        });
      }

      // ALWAYS return the row (with its index so we can merge edits later)
      return { _rowIndex: rowIndex, ...mappedRow };
    }).filter(row => row !== null);

    setSkippedRows(skipped);
    // Initialise editable state from the skipped rows (preserve any prior edits for the same row index)    
    setEditableSkippedRows(prev => {
      const prevByIndex = {};
      prev.forEach(r => { prevByIndex[r._rowIndex] = r; });
      return skipped.map(r => prevByIndex[r._rowIndex] ?? { ...r });
    });
    return mapped;
  };

  const formatDateForBackend = (date) => {
    if (date instanceof Date && !isNaN(date.getTime())) {
      const day = String(date.getDate()).padStart(2, '0'); // Ensure two-digit day
      const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are zero-based, so add 1
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return date; // Return the original value if it's not a valid date
  };

  const getColumnSearchProps = dataIndex => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8 }}>
        <Input
          autoFocus
          placeholder={`Search ${dataIndex}`}
          value={searchText}
          onChange={(e) => {
            const val = e.target.value;
            setSearchText(val);       // update search text
            setSearchedColumn(dataIndex); // set key immediately
          }}
          style={{ width: 188, marginBottom: 8, display: 'block' }}
        />
      </div>
    ),
    filterIcon: filtered => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    render: text =>
      searchedColumn === dataIndex ? (
        <span style={{ color: '#1890ff' }}>{text}</span>
      ) : (
        text
      ),
  });

  // columnsFromBackend = response.columns
  const enhancedColumns = columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    ellipsis: true,
    ...getColumnSearchProps(col),  // search/filter props
    sorter: true,
    sortOrder: uploadedTableSorter.field === col ? uploadedTableSorter.order : null,
  }));



  const deleteNRData = async (closeModal) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Await the delete call
      await API.delete(`/NRDatas/DeleteByProject/${projectId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Success message only
      showToast("NR data deleted successfully!", "success");

      // Clear local state
      setExistingData([]);
      setFileList([]);
      setFieldMappings({});
      setFileHeaders({});

      // Close modal
      if (closeModal) closeModal();

    } catch (error) {
      console.error("Error deleting NRData:", error);

      // Safely check for response data
      const errorMsg = error?.response?.data || error?.message || "Failed to delete NR data";
      showToast(errorMsg, "error");
    } finally {
      setLoading(false);
    }
  };


  const handleKeepZeroQuantityChange = (e) => {
    setKeepZeroQuantity(e.target.checked);
    if (e.target.checked) {
      setSkipItems(false);  // Deselect skipItems if keepZeroQuantity is selected
    }
  };
  // Function to handle quantity change
  const handleQuantityChange = (e) => {
    let newQuantity = parseInt(e.target.value, 10);

    // Ensure quantity is a valid number and does not go below 0
    if (newQuantity < 0) {
      newQuantity = 0;
    }

    // Update the quantity state
    setQuantity(newQuantity);
  };


  const handleSkipItemsChange = (e) => {
    setSkipItems(e.target.checked);
    if (e.target.checked) {
      setKeepZeroQuantity(false);  // Deselect keepZeroQuantity if skipItems is selected
    }
  };
  const iconStyle = { color: PRIMARY_COLOR, marginRight: 6 };

  const parseDate = (value) => {
    // If the value is a number, it's a date stored as a number in Excel
    if (typeof value === 'number') {
      // Excel stores dates as serial numbers, so convert it to a Date object
      return new Date(Math.round((value - 25569) * 86400 * 1000)); // Convert Excel date to JS date
    }

    // If the value is a string, try to parse it as a date
    if (typeof value === 'string' && Date.parse(value)) {
      return new Date(value);  // If it's a valid date string, parse it
    }

    // If it's neither, return the value as-is
    return value;
  };


  const downloadSkippedRowsReport = () => {
    if (skippedRows.length === 0) {
      showToast("No skipped rows to download", "info");
      return;
    }

    // Prepare data for Excel
    const reportData = skippedRows.map((item) => ({
      "Row Number": item.rowNumber,
      "Missing Fields": item.missingFields.join(", "),
      "Reason": item.reason,
      ...item.rowData, // Include all original row data
    }));

    // Create worksheet
    const worksheet = XLSX.utils.json_to_sheet(reportData);

    // Set column widths
    const columnWidths = [
      { wch: 12 }, // Row Number
      { wch: 30 }, // Missing Fields
      { wch: 40 }, // Reason
      ...fileHeaders.map(() => ({ wch: 15 })), // Original columns
    ];
    worksheet["!cols"] = columnWidths;

    // Create workbook
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Skipped Rows");

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 10);
    const filename = `skipped_rows_report_${timestamp}.xlsx`;

    // Download
    XLSX.writeFile(workbook, filename);
    showToast(`Downloaded report with ${skippedRows.length} skipped rows`, "success");
  };

  return (
    <div style={{ padding: 0 }}>
      {/* === PAGE HEADER === */}
      <Typography.Title level={3} style={{ marginBottom: 8 }}>
        Data Import
      </Typography.Title>

      {/* === DATA IMPORT SECTION === */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{
          scale: 1.01,
          boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
        }}
        transition={{ duration: 0.3 }}
      >
        <Card
          title={
            <div>
              <span>
                <ToolOutlined style={iconStyle} /> Data Import
              </span>
              <br />
              <Text type="secondary">Upload and map your data files here</Text>
            </div>
          }
          bordered={true}
          styles={{ body: { paddingTop: 12, paddingBottom: 12 } }}
          style={{
            width: "100%",
            boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            marginBottom: 2,
            paddingBottom: 0,
            backgroundColor: "#f5f5f5"
          }}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <div style={{ padding: 12, border: "1px solid #d9d9d9", borderRadius: 10, background: "#fff" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div>
                    <Text strong>File Upload</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: 1.3 }}>
                      Upload a corrected NRData report if you have already fixed your source file.
                    </Text>
                  </div>
              <Upload.Dragger
                name="file"
                accept=".xls,.xlsx,.csv"
                fileList={fileList}
                beforeUpload={beforeUpload}
                onRemove={handleRemove}
                maxCount={1}
              >
                <p className="ant-upload-drag-icon">📤</p>
                <p className="ant-upload-text">Upload Excel or CSV file</p>
                <Text type="secondary" style={{ display: "block" }}>
                  Drag and drop or click to choose a file.
                </Text>
                <Button icon={<UploadOutlined />}>Choose File</Button>
              </Upload.Dragger>

              
                </Space>
              </div>
            </Col>

            <Col xs={24} md={12}>
              <div style={{ padding: 12, border: "1px solid #d9d9d9", borderRadius: 10, background: "#fff" }}>
                <Space direction="vertical" size={10} style={{ width: "100%" }}>
                  <div>
                    <Text strong>Changed NR Data</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: 1.3}}>
                    Enable this when the file is a Changed NRData.
                  </Text>
                  </div>
                  <Checkbox
                    checked={isCorrectedNrdataReport}
                    onChange={(e) => setIsCorrectedNrdataReport(e.target.checked)}
                  >
                    Changed NR Data
                  </Checkbox>
                  
                </Space>

                <Space direction="vertical" size={10} style={{ width: "100%" , marginTop: 3}}>
                  <div>
                    <Text strong>Zero Quantity Handling</Text>
                    <Text type="secondary" style={{ display: "block", fontSize: 12, lineHeight: 1.3 }}>
                      Choose how to handle rows where NRQuantity is 0 before upload.
                    </Text>
                  </div>

                  <Checkbox
                    checked={keepZeroQuantity}
                    onChange={handleKeepZeroQuantityChange}
                  >
                    Keep items with 0 quantity and change their quantity
                  </Checkbox>

                  {keepZeroQuantity && (
                    <Input
                      type="number"
                      value={quantity}
                      onChange={handleQuantityChange}
                      placeholder="Enter quantity to replace 0"
                      min={0}
                    />
                  )}

                  <Checkbox
                    checked={skipItems}
                    onChange={handleSkipItemsChange}
                  >
                    Skip items with 0 quantity
                  </Checkbox>

                  
                </Space>
              </div>
            </Col>
          </Row>

          {/* === FIELD MAPPING SECTION === */}
          {fileHeaders.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              whileHover={{
                scale: 1.01,
                boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
              }}
              transition={{ duration: 0.3 }}
            >
              <Card
                title="Field Mapping"
                styles={{ body: { paddingTop: 12, paddingBottom: 12 } }}
                style={{
                  border: "1px solid #d9d9d9",
                  boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                }}
              >
                <Text
                  type="secondary"
                  style={{ display: "block", marginBottom: 16 }}
                >
                  Map fields from your file to expected fields
                </Text>

                <Row gutter={[16, 16]}>
                  {[...expectedFields]
                    .sort((a, b) => {
                      const aReq = requiredFieldNames.includes(a.name);
                      const bReq = requiredFieldNames.includes(b.name);
                      if (aReq && !bReq) return -1;
                      if (!aReq && bReq) return 1;
                      return 0;
                    })
                    .map((expectedField) => {
                      return (
                        <Col key={expectedField.fieldId} xs={24} md={8}>
                          <div style={{ marginBottom: 12 }}>
                            <div style={{ display: "flex", alignItems: "center" }}>
                              <Text
                                style={{
                                  marginRight: 8,
                                  color: fieldMappings[expectedField.fieldId]
                                    ? "#006400"
                                    : "inherit",
                                }}
                              >
                                {expectedField.name}
                                {requiredFieldNames.includes(expectedField.name) && (
                                  <span style={{ color: "#ff4d4f", marginLeft: 2 }}>*</span>
                                )}
                              </Text>
                              {fieldMappings[expectedField.fieldId] && (
                                <CheckCircleOutlined
                                  style={{ color: "#006400", fontSize: 16 }}
                                />
                              )}
                            </div>
                            <Select
                              style={{
                                width: "100%",
                                borderColor: fieldMappings[expectedField.fieldId]
                                  ? "#006400"
                                  : undefined,
                                boxShadow: fieldMappings[expectedField.fieldId]
                                  ? "0 0 5px #006400"
                                  : undefined,
                              }}
                              placeholder="Select matching column from file"
                              value={
                                fieldMappings[expectedField.fieldId]
                              }
                              onChange={(value) => {
                                setFieldMappings((prev) => ({
                                  ...prev,
                                  [expectedField.fieldId]: value,
                                }));
                              }}
                              allowClear
                              onClear={() => {
                                setFieldMappings((prev) => {
                                  const updated = { ...prev };
                                  delete updated[expectedField.fieldId];
                                  return updated;
                                });
                              }}
                            >
                              {fileHeaders
                                .filter(
                                  (header) =>
                                    !Object.values(fieldMappings).includes(header) ||
                                    fieldMappings[expectedField.fieldId] === header
                                )
                                .map((header, index) => (
                                  <Select.Option
                                    key={`${header}-${index}`}
                                    value={header}
                                  >
                                    {header}
                                  </Select.Option>
                                ))}
                            </Select>
                          </div>
                        </Col>
                      );
                    })}
                </Row>

                {isAnyFieldMapped() && (
                  <Space style={{ marginTop: 16, width: "100%", justifyContent: "space-between" }}>
                    <Button
                      type="primary"
                      onClick={handleUpload}
                    >
                      Upload Data
                    </Button>
                    {skippedRows.length > 0 && (
                      <Button
                        onClick={downloadSkippedRowsReport}
                        style={{ backgroundColor: "#faad14", borderColor: "#faad14", color: "#000" }}
                      >
                        📥 Download Missing Data Report ({skippedRows.length})
                      </Button>
                    )}
                  </Space>
                )}
              </Card>
            </motion.div>
          )}
        </Card>
      </motion.div>

      {/* === DATA AND CONFLICTS SECTION === */}
      <>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 32,
            marginBottom: 16,
          }}
        >
          {/* Left side: Title */}
          <Typography.Title level={4} style={{ margin: 0 }}>
            Data & Conflicts
          </Typography.Title>

          {/* Right side: Buttons */}
          <div style={{ display: "flex", gap: 8 }}>
            <Button
              onClick={fetchConflictReport}
              style={{
                backgroundColor: "#f0dc24ff",
                borderColor: "#FFEB3B",
                color: "#000",
              }}
            >
              ⚠️ Load Conflict
            </Button>

            <Button
              danger
              style={{
                backgroundColor: "#ff4d4f", // full red background
                borderColor: "#ff4d4f",
                color: "#fff",
              }}
              onClick={() => {
                const modal = Modal.confirm({
                  title: "Confirm Deletion",
                  content: "Are you sure you want to delete NR data for this project?",
                  okText: "Yes, Delete",
                  cancelText: "Cancel",
                  okButtonProps: { danger: true },
                  onOk: async () => {
                    await deleteNRData(() => modal.destroy());
                  },
                });
              }}
            >
              🗑️ Delete NR Data
            </Button>
          </div>
        </div>


        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{
            scale: 1.01,
            boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
          }}
          transition={{ duration: 0.3 }}
        >
          <Card
            bordered
            styles={{ body: { paddingTop: 12, paddingBottom: 12 } }}
            style={{ border: "1px solid #d9d9d9", boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
          >
            <Tabs
              activeKey={activeTab}
              onChange={(key) => setActiveTab(key)}
              style={{ marginTop: 8 }}
              tabBarExtraContent={
                <Button
                  type="primary"
                  size="small"
                  disabled={activeTab !== "1" || selectedUploadedCatchNos.length !== 2}
                  loading={loading}
                  onClick={openMergeModal}
                >
                  Merge Catch Numbers
                </Button>
              }
            >
              <TabPane tab="Uploaded Data" key="1">
                {enhancedColumns.length > 0 ? (
                  <Space direction="vertical" size={12} style={{ width: "100%" }}>
                   
                    <Table
                      dataSource={existingData}
                      columns={enhancedColumns}
                      pagination={{
                        ...pagination,
                        showSizeChanger: true,
                        pageSizeOptions: ['10', '20', '50', '100'],
                        showQuickJumper: true,
                      }}
                      rowKey="id"
                      rowSelection={{
                        selectedRowKeys: selectedUploadedRowKeys,
                        onSelect: (record, selected) => {
                          const catchNo = record.CatchNo;
                          if (!catchNo) {
                            return;
                          }

                          setSelectedUploadedCatchNos((prev) => {
                            if (selected) {
                              if (prev.includes(catchNo)) {
                                return prev;
                              }

                              if (prev.length >= 2) {
                                showToast("You can select rows from only 2 catch numbers at a time.", "warning");
                                return prev;
                              }

                              return [...prev, catchNo];
                            }

                            return prev.filter((item) => item !== catchNo);
                          });
                        },
                        onSelectAll: (selected, selectedRows, changeRows) => {
                          setSelectedUploadedCatchNos((prev) => {
                            let next = [...prev];

                            changeRows.forEach((row) => {
                              const catchNo = row.CatchNo;
                              if (!catchNo) {
                                return;
                              }

                              if (selected) {
                                if (!next.includes(catchNo) && next.length < 2) {
                                  next.push(catchNo);
                                }
                              } else {
                                next = next.filter((item) => item !== catchNo);
                              }
                            });

                            const uniqueCatchNos = Array.from(new Set(next));
                            if (selected && uniqueCatchNos.length > 2) {
                              showToast("You can select rows from only 2 catch numbers at a time.", "warning");
                              return uniqueCatchNos.slice(0, 2);
                            }

                            return uniqueCatchNos;
                          });
                        },
                        getCheckboxProps: (record) => ({
                          disabled:
                            Boolean(record.CatchNo) &&
                            selectedUploadedCatchNos.length >= 2 &&
                            !selectedUploadedCatchNos.includes(record.CatchNo),
                        }),
                      }}
                      scroll={{ x: "max-content" }}
                      loading={loading}
                      onChange={handleUploadedTableChange}
                    />
                  </Space>
                ) : (
                  <Typography.Text type="secondary">No data found</Typography.Text>
                )}

              </TabPane>

              <TabPane tab="Conflict Report" key="2">
                {renderConflicts()}
              </TabPane>
              <TabPane tab="Fill Missing Data" key="3">
                <MissingData />
              </TabPane>
            </Tabs>

            <Modal
              title="Merge Catch Numbers"
              open={mergeModalOpen}
              okText="Merge"
              onOk={confirmMerge}
              onCancel={() => setMergeModalOpen(false)}
              okButtonProps={{ disabled: selectedUploadedCatchNos.length !== 2, loading }}
            >
              <Space direction="vertical" size={12} style={{ width: "100%" }}>
                <Text type="secondary">
                  Choose how to join the catch numbers:
                </Text>
                <Radio.Group
                  value={mergeModalSeparator}
                  onChange={(event) => setMergeModalSeparator(event.target.value)}
                >
                  <Radio value="/">Catch1/Catch2</Radio>
                  <Radio value="-">Catch1-Catch2</Radio>
                </Radio.Group>
              </Space>
              <Space direction="vertical" size={12} style={{ width: "100%", marginTop: 16 }}>
                <Text type="secondary">
                  Which module you want to run after the merge:
                </Text>
                <Select
                  style={{ width: "100%" }}
                  placeholder={loadingModules ? "Loading modules..." : "Select a module (optional)"}
                  value={mergeModuleId}
                  loading={loadingModules}
                  allowClear
                  onChange={(value) => setMergeModuleId(value)}
                  options={(modules || []).map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
              </Space>
            </Modal>
          </Card>
        </motion.div>
      </>

    </div>
  );

};

export default DataImport;
