import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import API from "../../hooks/api";
import axios from "axios";
import { Table, Select, Input, Tag, Empty, Dropdown, Button } from "antd";
import { SearchOutlined, DownloadOutlined } from "@ant-design/icons";
import { Columns } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import * as XLSX from "xlsx";

const { Option } = Select;

export default function MasterConfigReport() {
  const url = import.meta.env.VITE_API_BASE_URL;

  const [data, setData] = useState([]);
  const [groups, setGroups] = useState([]);
  const [types, setTypes] = useState([]);
  const [groupMap, setGroupMap] = useState({});
  const [typeMap, setTypeMap] = useState({});
  const [loading, setLoading] = useState(false);

  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const [filterGroup, setFilterGroup] = useState(null);
  const [filterType, setFilterType] = useState(null);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);

  // Column visibility
  const ALWAYS_VISIBLE = ['groupId', 'typeId'];
  const ALL_TOGGLEABLE = [
    "modules", "innerEnvelope", "outerEnvelope",
    "boxBreakingCriteria", "duplicateRemoveFields", "sortingBoxReport",
    "envelopeMakingCriteria", "duplicateCriteria", "innerBundlingCriteria",
    "boxCapacity", "enhancement", "boxNumber", "omrSerialNumber",
    "bookletSerialNumber", "resetOnSymbolChange", "isInnerBundlingDone",
    "resetOmrSerialOnCatchChange", "resetBookletSerialOnCatchChange",
  ];
  const [visibleColumns, setVisibleColumns] = useState(new Set([...ALWAYS_VISIBLE, ...ALL_TOGGLEABLE]));

  const handleColumnToggle = useCallback((colKey) => {
    if (ALWAYS_VISIBLE.includes(colKey)) return; // Prevent toggling always-visible columns
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(colKey) ? next.delete(colKey) : next.add(colKey);
      return next;
    });
  }, []);

  const handleSelectAll = useCallback((checked) => {
    if (checked) {
      setVisibleColumns(new Set([...ALWAYS_VISIBLE, ...ALL_TOGGLEABLE]));
    } else {
      setVisibleColumns(new Set(ALWAYS_VISIBLE));
    }
  }, []);

  const isAllChecked = useMemo(() => {
    return ALL_TOGGLEABLE.every(col => visibleColumns.has(col));
  }, [visibleColumns]);

  const isIndeterminate = useMemo(() => {
    const checkedCount = ALL_TOGGLEABLE.filter(col => visibleColumns.has(col)).length;
    return checkedCount > 0 && checkedCount < ALL_TOGGLEABLE.length;
  }, [visibleColumns]);

  const COLUMN_LABELS = {
    groupId: "Group",
    typeId: "Type",
    modules: "Modules",
    innerEnvelope: "Inner Envelope",
    outerEnvelope: "Outer Envelope",
    boxBreakingCriteria: "Box Breaking Criteria",
    duplicateRemoveFields: "Duplicate Remove Fields",
    sortingBoxReport: "Sorting Box Report",
    envelopeMakingCriteria: "Envelope Making Criteria",
    duplicateCriteria: "Duplicate Criteria",
    innerBundlingCriteria: "Inner Bundling Criteria",
    boxCapacity: "Box Capacity",
    enhancement: "Enhancement",
    boxNumber: "Box No.",
    omrSerialNumber: "OMR Serial No.",
    bookletSerialNumber: "Booklet Serial No.",
    resetOnSymbolChange: "Reset on Symbol Change",
    isInnerBundlingDone: "Inner Bundling Done",
    resetOmrSerialOnCatchChange: "Reset OMR on Catch Change",
    resetBookletSerialOnCatchChange: "Reset Booklet on Catch Change",
  };

  const debounceRef = useRef(null);
  const handleSearchInputChange = (e) => {
    const val = e.target.value;
    setSearchInput(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearch(val);
      setPagination((prev) => ({ ...prev, current: 1 }));
    }, 400);
  };

  const handleSearchClear = () => {
    setSearchInput("");
    setSearch("");
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const fetchDropdownOptions = async () => {
    try {
      const [groupsRes, typesRes] = await Promise.all([
        axios.get(`${url}/Groups`),
        axios.get(`${url}/PaperTypes`),
      ]);
      const groupsData = (groupsRes.data || []).map((g) => ({
        id: g.id ?? g.groupId,
        name: g.name ?? g.groupName,
      }));
      const typesData = (typesRes.data || []).map((t) => ({
        id: t.typeId ?? t.id,
        name: t.types ?? t.name,
      }));
      
      setGroups(groupsData);
      setTypes(typesData);
      
      const gMap = {};
      groupsData.forEach(g => gMap[g.id] = g.name);
      const tMap = {};
      typesData.forEach(t => tMap[t.id] = t.name);
      
      setGroupMap(gMap);
      setTypeMap(tMap);
    } catch {
      // Dropdowns are optional
    }
  };

  const fetchReport = useCallback(
    async (page, pageSize, sField, sOrder, sSearch, sGroup, sType) => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.append("pageNumber", page);
        params.append("pageSize", pageSize);
        if (sSearch?.trim()) params.append("search", sSearch.trim());
        if (sGroup != null) params.append("groupId", sGroup);
        if (sType != null) params.append("typeId", sType);
        if (sField) params.append("sortBy", sField);
        if (sOrder) params.append("sortOrder", sOrder);

        const response = await API.get(`/MProjectConfigs/Report?${params.toString()}`);
        const result = response.data;

        setData(result.data ?? []);
        setPagination({
          current: result.currentPage ?? page,
          pageSize: result.pageSize ?? pageSize,
          total: result.total ?? 0,
        });
      } catch (err) {
        console.error("Failed to load master config report", err);
        setData([]);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchDropdownOptions();
  }, []);

  useEffect(() => {
    fetchReport(
      pagination.current,
      pagination.pageSize,
      sortField,
      sortOrder,
      search,
      filterGroup,
      filterType
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, sortField, sortOrder, search, filterGroup, filterType]);

  const handleGroupChange = (val) => {
    setFilterGroup(val ?? null);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTypeChange = (val) => {
    setFilterType(val ?? null);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const handleTableChange = (pag, _filters, sorter) => {
    setSortField(sorter?.field ?? null);
    setSortOrder(
      sorter?.order ? (sorter.order === "ascend" ? "asc" : "desc") : null
    );
    setPagination((prev) => ({
      ...prev,
      current: pag.current ?? prev.current,
      pageSize: pag.pageSize ?? prev.pageSize,
    }));
  };

  // Helper function to format field list with "Sort by" format
  const formatSortByFields = (text) => {
    if (!text || text === "-") return "-";
    const fields = text.split(",").map(f => f.trim()).filter(f => f);
    if (fields.length === 0) return "-";
    if (fields.length === 1) return `Sort by ${fields[0]}`;
    const lastField = fields[fields.length - 1];
    const otherFields = fields.slice(0, -1);
    return `Sort by ${otherFields.join(" then by ")} then by ${lastField}`;
  };

  // Helper function to format comma-separated fields with "and"
  const formatCommaAndFields = (text) => {
    if (!text || text === "-") return "-";
    const fields = text.split(",").map(f => f.trim()).filter(f => f);
    if (fields.length === 0) return "-";
    if (fields.length === 1) return fields[0];
    const lastField = fields[fields.length - 1];
    const otherFields = fields.slice(0, -1);
    return `${otherFields.join(", ")} and ${lastField}`;
  };

  // Get all data with proper formatting for download
  const getFormattedData = async () => {
    try {
      const params = new URLSearchParams();
      params.append("pageNumber", 1);
      params.append("pageSize", 999999); // Fetch all records
      if (search?.trim()) params.append("search", search.trim());
      if (filterGroup != null) params.append("groupId", filterGroup);
      if (filterType != null) params.append("typeId", filterType);
      if (sortField) params.append("sortBy", sortField);
      if (sortOrder) params.append("sortOrder", sortOrder);

      const response = await API.get(`/MProjectConfigs/Report?${params.toString()}`);
      return response.data.data ?? [];
    } catch (err) {
      console.error("Failed to fetch data for download:", err);
      return [];
    }
  };

  // Prepare row data based on visible columns
  const prepareRowData = (row, colKeys) => {
    const rowData = {};
    
    colKeys.forEach(colKey => {
      switch (colKey) {
        case "groupId":
          rowData["Group"] = groupMap[row.groupId] || row.groupId;
          break;
        case "typeId":
          rowData["Type"] = typeMap[row.typeId] || row.typeId;
          break;
        case "modules":
          rowData["Modules"] = row.modules || "-";
          break;
        case "innerEnvelope":
          rowData["Inner Envelope"] = row.innerEnvelope || "-";
          break;
        case "outerEnvelope":
          rowData["Outer Envelope"] = row.outerEnvelope || "-";
          break;
        case "boxBreakingCriteria":
          rowData["Box Breaking Criteria"] = formatCommaAndFields(row.boxBreakingCriteria);
          break;
        case "duplicateRemoveFields":
          rowData["Duplicate Remove Fields"] = formatCommaAndFields(row.duplicateRemoveFields);
          break;
        case "sortingBoxReport":
          rowData["Sorting Box Report"] = formatSortByFields(row.sortingBoxReport);
          break;
        case "envelopeMakingCriteria":
          rowData["Envelope Making Criteria"] = formatSortByFields(row.envelopeMakingCriteria);
          break;
        case "duplicateCriteria":
          rowData["Duplicate Criteria"] = formatCommaAndFields(row.duplicateCriteria);
          break;
        case "innerBundlingCriteria":
          rowData["Inner Bundling Criteria"] = formatCommaAndFields(row.innerBundlingCriteria);
          break;
        case "boxCapacity":
          rowData["Box Capacity"] = row.boxCapacity ?? "-";
          break;
        case "enhancement":
          rowData["Enhancement"] = row.enhancement ?? "-";
          break;
        case "boxNumber":
          rowData["Box No."] = row.boxNumber || "-";
          break;
        case "omrSerialNumber":
          rowData["OMR Serial No."] = row.omrSerialNumber || "-";
          break;
        case "bookletSerialNumber":
          rowData["Booklet Serial No."] = row.bookletSerialNumber || "-";
          break;
        case "resetOnSymbolChange":
          rowData["Reset on Symbol Change"] = row.resetOnSymbolChange ? "Yes" : "No";
          break;
        case "isInnerBundlingDone":
          rowData["Inner Bundling Done"] = row.isInnerBundlingDone ? "Yes" : "No";
          break;
        case "resetOmrSerialOnCatchChange":
          rowData["Reset OMR on Catch Change"] = row.resetOmrSerialOnCatchChange ? "Yes" : "No";
          break;
        case "resetBookletSerialOnCatchChange":
          rowData["Reset Booklet on Catch Change"] = row.resetBookletSerialOnCatchChange ? "Yes" : "No";
          break;
        default:
          break;
      }
    });
    
    return rowData;
  };

  const downloadAsExcel = async () => {
    try {
      const allData = await getFormattedData();
      if (allData.length === 0) {
        alert("No data to download");
        return;
      }

      const visibleColKeys = Array.from(visibleColumns).filter(col => 
        !ALWAYS_VISIBLE.includes(col) || col === "groupId" || col === "typeId"
      );

      const formattedData = allData.map(row => prepareRowData(row, visibleColKeys));
      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      
      // Adjust column widths
      const columnWidths = Object.keys(formattedData[0] || {}).map(() => 20);
      worksheet["!cols"] = columnWidths.map(w => ({ wch: w }));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Master Config");
      XLSX.writeFile(workbook, `MasterConfigReport_${new Date().toISOString().split("T")[0]}.xlsx`);
    } catch (err) {
      console.error("Excel download failed:", err);
      alert("Failed to download Excel file");
    }
  };

  const downloadAsPDF = async () => {
    try {
      const allData = await getFormattedData();
      if (allData.length === 0) {
        alert("No data to download");
        return;
      }

      const visibleColKeys = Array.from(visibleColumns).filter(col => 
        !ALWAYS_VISIBLE.includes(col) || col === "groupId" || col === "typeId"
      );

      const formattedData = allData.map(row => prepareRowData(row, visibleColKeys));
      const headers = Object.keys(formattedData[0] || {});

      // Use landscape orientation for better table display
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a4"
      });
      
      const pageWidth = pdf.internal.pageSize.getWidth();
      
      // Add title
      pdf.setFontSize(16);
      pdf.text("Master Configuration Report", pageWidth / 2, 15, { align: "center" });

      // Create table
      const tableData = formattedData.map(row => 
        headers.map(header => row[header])
      );

      pdf.autoTable({
        head: [headers],
        body: tableData,
        startY: 25,
        theme: "grid",
        headStyles: {
          fillColor: [25, 103, 210], // Blue color
          textColor: [255, 255, 255],
          fontStyle: "bold",
          fontSize: 11,
          padding: 5,
          halign: "center",
          valign: "middle",
        },
        bodyStyles: {
          fontSize: 10,
          padding: 5,
          halign: "left",
          valign: "middle",
        },
        columnStyles: {
          ...headers.reduce((acc, _, idx) => {
            acc[idx] = { cellWidth: (pageWidth - 20) / headers.length };
            return acc;
          }, {}),
        },
        margin: { left: 10, right: 10, top: 20, bottom: 20 },
        didDrawPage: (data) => {
          // Footer with page number
          const pageSize = pdf.internal.pageSize;
          const pageHeight = pageSize.getHeight();
          const pageWidth = pageSize.getWidth();
          pdf.setFontSize(9);
          pdf.text(
            `Page ${data.pageCount}`,
            pageWidth / 2,
            pageHeight - 10,
            { align: "center" }
          );
        },
      });

      pdf.save(`MasterConfigReport_${new Date().toISOString().split("T")[0]}.pdf`);
    } catch (err) {
      console.error("PDF download failed:", err);
      alert("Failed to download PDF file");
    }
  };

  const handleDownload = (type) => {
    if (type === "excel") {
      downloadAsExcel();
    } else if (type === "pdf") {
      downloadAsPDF();
    }
  };

  // Define all columns, then filter based on visibility
  const allColumns = [
    {
      title: "Group",
      dataIndex: "groupId",
      key: "groupId",
      width: 80,
      fixed: "left",
      sorter: true,
      render: (id) => {
        const name = groupMap[id] || `ID: ${id}`;
        return <Tag color="blue" style={{ fontWeight: 600 }}>{name}</Tag>;
      },
    },
    {
      title: "Type",
      dataIndex: "typeId",
      key: "typeId",
      width: 80,
      fixed: "left",
      sorter: true,
      render: (id) => {
        const name = typeMap[id] || `ID: ${id}`;
        return <Tag color="purple" style={{ fontWeight: 600 }}>{name}</Tag>;
      },
    },
    {
      title: "Modules",
      dataIndex: "modules",
      key: "modules",
      width: 160,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        return (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
            {text.split(",").map((m, i) => (
              <Tag key={i} color="cyan" style={{ margin: 0, fontSize: "11px" }}>{m.trim()}</Tag>
            ))}
          </div>
        );
      },
    },
    {
      title: "Inner Envelope",
      dataIndex: "innerEnvelope",
      key: "innerEnvelope",
      width: 100,
      sorter: true,
      render: (t) =>
        t && t !== "-" ? <Tag color="gold" style={{ fontSize: "11px" }}>{t}</Tag> : "-",
    },
    {
      title: "Outer Envelope",
      dataIndex: "outerEnvelope",
      key: "outerEnvelope",
      width: 100,
      sorter: true,
      render: (t) =>
        t && t !== "-" ? <Tag color="volcano" style={{ fontSize: "11px" }}>{t}</Tag> : "-",
    },
    {
      title: "Box Breaking Criteria",
      dataIndex: "boxBreakingCriteria",
      key: "boxBreakingCriteria",
      width: 120,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        const fields = text.split(",").map(f => f.trim()).filter(f => f);
        if (fields.length === 0) return "-";
        if (fields.length === 1) return fields[0];
        const lastField = fields[fields.length - 1];
        const otherFields = fields.slice(0, -1);
        return `${otherFields.join(", ")} and ${lastField}`;
      },
    },
    {
      title: "Duplicate Remove Fields",
      dataIndex: "duplicateRemoveFields",
      key: "duplicateRemoveFields",
      width: 120,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        const fields = text.split(",").map(f => f.trim()).filter(f => f);
        if (fields.length === 0) return "-";
        if (fields.length === 1) return fields[0];
        const lastField = fields[fields.length - 1];
        const otherFields = fields.slice(0, -1);
        return `${otherFields.join(", ")} and ${lastField}`;
      },
    },
    {
      title: "Sorting Box Report",
      dataIndex: "sortingBoxReport",
      key: "sortingBoxReport",
      width: 120,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        const fields = text.split(",").map(f => f.trim()).filter(f => f);
        if (fields.length === 0) return "-";
        
        if (fields.length === 1) {
          return `Sort by ${fields[0]}`;
        }
        
        const lastField = fields[fields.length - 1];
        const otherFields = fields.slice(0, -1);
        return `Sort by ${otherFields.join(" then by ")} then by ${lastField}`;
      },
    },
    {
      title: "Envelope Making Criteria",
      dataIndex: "envelopeMakingCriteria",
      key: "envelopeMakingCriteria",
      width: 120,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        const fields = text.split(",").map(f => f.trim()).filter(f => f);
        if (fields.length === 0) return "-";
        
        if (fields.length === 1) {
          return `Sort by ${fields[0]}`;
        }
        
        const lastField = fields[fields.length - 1];
        const otherFields = fields.slice(0, -1);
        return `Sort by ${otherFields.join(" then by ")} then by ${lastField}`;
      },
    },
    {
      title: "Duplicate Criteria",
      dataIndex: "duplicateCriteria",
      key: "duplicateCriteria",
      width: 110,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        const fields = text.split(",").map(f => f.trim()).filter(f => f);
        if (fields.length === 0) return "-";
        if (fields.length === 1) return fields[0];
        const lastField = fields[fields.length - 1];
        const otherFields = fields.slice(0, -1);
        return `${otherFields.join(", ")} and ${lastField}`;
      },
    },
    {
      title: "Inner Bundling Criteria",
      dataIndex: "innerBundlingCriteria",
      key: "innerBundlingCriteria",
      width: 120,
      sorter: true,
      render: (text) => {
        if (!text || text === "-") return "-";
        const fields = text.split(",").map(f => f.trim()).filter(f => f);
        if (fields.length === 0) return "-";
        if (fields.length === 1) return fields[0];
        const lastField = fields[fields.length - 1];
        const otherFields = fields.slice(0, -1);
        return `${otherFields.join(", ")} and ${lastField}`;
      },
    },
    {
      title: "Box Capacity",
      dataIndex: "boxCapacity",
      key: "boxCapacity",
      width: 80,
      align: "center",
      sorter: true,
      render: (v) => v ?? "-",
    },
    {
      title: "Enhancement",
      dataIndex: "enhancement",
      key: "enhancement",
      width: 80,
      align: "center",
      sorter: true,
      render: (v) => v > 0 ? v : "0",
    },
    {
      title: "Box No.",
      dataIndex: "boxNumber",
      key: "boxNumber",
      width: 70,
      align: "center",
      sorter: true,
    },
    {
      title: "OMR Serial No.",
      dataIndex: "omrSerialNumber",
      key: "omrSerialNumber",
      width: 85,
      align: "center",
      sorter: true,
    },
    {
      title: "Booklet Serial No.",
      dataIndex: "bookletSerialNumber",
      key: "bookletSerialNumber",
      width: 95,
      align: "center",
      sorter: true,
      render: (v) => v ?? "-",
    },
    {
      title: "Reset on Symbol Change",
      dataIndex: "resetOnSymbolChange",
      key: "resetOnSymbolChange",
      width: 110,
      align: "center",
      sorter: true,
      render: (v) => v ? <Tag color="green" style={{ fontSize: "11px" }}>Yes</Tag> : <Tag color="red" style={{ fontSize: "11px" }}>No</Tag>,
    },
    {
      title: "Inner Bundling Done",
      dataIndex: "isInnerBundlingDone",
      key: "isInnerBundlingDone",
      width: 100,
      align: "center",
      sorter: true,
      render: (v) => v ? <Tag color="green" style={{ fontSize: "11px" }}>Yes</Tag> : <Tag color="red" style={{ fontSize: "11px" }}>No</Tag>,
    },
    {
      title: "Reset OMR on Catch Change",
      dataIndex: "resetOmrSerialOnCatchChange",
      key: "resetOmrSerialOnCatchChange",
      width: 115,
      align: "center",
      sorter: true,
      render: (v) => v ? <Tag color="green" style={{ fontSize: "11px" }}>Yes</Tag> : <Tag color="red" style={{ fontSize: "11px" }}>No</Tag>,
    },
    {
      title: "Reset Booklet on Catch Change",
      dataIndex: "resetBookletSerialOnCatchChange",
      key: "resetBookletSerialOnCatchChange",
      width: 120,
      align: "center",
      sorter: true,
      render: (v) => v ? <Tag color="green" style={{ fontSize: "11px" }}>Yes</Tag> : <Tag color="red" style={{ fontSize: "11px" }}>No</Tag>,
    },
  ];

  // Filter columns based on visibility
  const columns = useMemo(
    () => allColumns.filter(col => visibleColumns.has(col.key)),
    [allColumns, visibleColumns]
  );

  return (
    <div style={{ padding: "24px", height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden", gap: "16px" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, margin: "0 0 8px 0", color: "#1f2937", flexShrink: 0 }}>
        Master Configuration Report
      </h1>

      <div style={{
        background: "#fff",
        borderRadius: 10,
        padding: "16px 20px",
        marginBottom: 0,
        display: "flex",
        gap: 12,
        flexWrap: "wrap",
        alignItems: "center",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        border: "1px solid #e5e7eb",
        flexShrink: 0,
      }}>
        <Input
          placeholder="Search group, type or module..."
          prefix={<SearchOutlined style={{ color: "#9ca3af" }} />}
          value={searchInput}
          onChange={handleSearchInputChange}
          onClear={handleSearchClear}
          allowClear
          style={{ width: 280 }}
        />

        {groups.length > 0 && (
          <Select
            placeholder="Filter by Group"
            allowClear
            value={filterGroup}
            onChange={handleGroupChange}
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
          >
            {groups.map((g) => <Option key={g.id} value={g.id}>{g.name}</Option>)}
          </Select>
        )}

        {types.length > 0 && (
          <Select
            placeholder="Filter by Type"
            allowClear
            value={filterType}
            onChange={handleTypeChange}
            style={{ width: 200 }}
            showSearch
            optionFilterProp="children"
          >
            {types.map((t) => <Option key={t.id} value={t.id}>{t.name}</Option>)}
          </Select>
        )}

        {/* Column Visibility Button */}
        <Dropdown
          menu={{
            items: [
              {
                key: "select-all",
                label: (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      userSelect: "none",
                      padding: "4px 0",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isAllChecked}
                      indeterminate={isIndeterminate}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer" }}
                    />
                    <strong>Select All</strong>
                  </div>
                ),
              },
              {
                type: "divider",
              },
              ...ALL_TOGGLEABLE.map(colKey => ({
                key: colKey,
                label: (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      cursor: "pointer",
                      userSelect: "none",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.has(colKey)}
                      onChange={() => handleColumnToggle(colKey)}
                      onClick={(e) => e.stopPropagation()}
                      style={{ cursor: "pointer" }}
                    />
                    {COLUMN_LABELS[colKey] || colKey}
                  </div>
                ),
              })),
            ],
          }}
          trigger={["click"]}
        >
          <Button style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <Columns size={16} />
            Columns
          </Button>
        </Dropdown>

        {/* Download Button */}
        <Dropdown
          menu={{
            items: [
              {
                key: "excel",
                label: "Download as Excel",
                onClick: () => handleDownload("excel"),
              },
              {
                key: "pdf",
                label: "Download as PDF",
                onClick: () => handleDownload("pdf"),
              },
            ],
          }}
        >
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            style={{ display: "flex", alignItems: "center", gap: "6px" }}
          >
            Download
          </Button>
        </Dropdown>

        <div style={{ marginLeft: "auto", color: "#6b7280", fontSize: 13 }}>
          Showing{" "}
          <strong>
            {data.length === 0
              ? 0
              : `${(pagination.current - 1) * pagination.pageSize + 1}-${
                  (pagination.current - 1) * pagination.pageSize + data.length
                }`}
          </strong>{" "}
          of <strong>{pagination.total}</strong> records
        </div>
      </div>

      <div style={{
        background: "#fff",
        borderRadius: 10,
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        border: "1px solid #e5e7eb",
        overflow: "hidden",
        flex: 1,
        display: "flex",
        flexDirection: "column",
        minHeight: 0,
        padding: "12px",
      }}>
        {!loading && data.length === 0 ? (
          <Empty description="No master configurations found" style={{ padding: 60 }} />
        ) : (
          <Table
            dataSource={data}
            columns={columns}
            rowKey="id"
            scroll={{ x: 2200, y: "calc(100vh - 450px)" }}
            onChange={handleTableChange}
            loading={loading}
            pagination={{
              current: pagination.current,
              pageSize: pagination.pageSize,
              total: pagination.total,
              showSizeChanger: true,
              pageSizeOptions: ["10", "15", "25", "50"],
            }}
            size="middle"
            rowClassName={(_, index) => index % 2 === 0 ? "mcr-row-light" : "mcr-row-dark"}
          />
        )}
      </div>

      <style>{`
        .mcr-row-light td { background: #fff !important; }
        .mcr-row-dark td { background: #f9fafb !important; }
        .ant-table-thead > tr > th {
          background: #f5f5f5 !important;
          color: #333 !important;
          font-weight: 600 !important;
          font-size: 11px !important;
          border-bottom: 1px solid #e8e8e8 !important;
          padding: 8px 6px !important;
          line-height: 1.3 !important;
          height: auto !important;
          word-break: break-word !important;
          white-space: normal !important;
        }
        .ant-table-cell { 
          font-size: 12px !important;
          padding: 10px 8px !important;
          line-height: 1.4 !important;
          word-break: break-word !important;
          white-space: normal !important;
        }
        .ant-table-body > tr > td {
          border-bottom: 1px solid #f0f0f0 !important;
          vertical-align: middle !important;
        }
        .ant-table-column-sorter {
          margin-left: 4px !important;
        }
        .ant-table-row {
          height: auto !important;
        }
      `}</style>
    </div>
  );
}
