import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useState,
} from "react";
import "@ant-design/v5-patch-for-react-19";
import {
  Button,
  Card,
  Input,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tooltip,
  Typography,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import API from "../../hooks/api";
import useStore from "../../stores/ProjectData";
import { useToast } from "../../hooks/useToast";

const { Text } = Typography;

const isMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return !Number.isNaN(value);
  const normalized = String(value).trim().toLowerCase();
  return normalized !== "" && normalized !== "undefined" && normalized !== "null";
};

const coerceNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const mergeRows = (base, patch) => ({
  ...base,
  examDate: isMeaningfulValue(base.examDate) ? base.examDate : patch.examDate,
  examTime: isMeaningfulValue(base.examTime) ? base.examTime : patch.examTime,
  quantity: isMeaningfulValue(base.quantity) ? base.quantity : patch.quantity,
  subjectName: isMeaningfulValue(base.subjectName)
    ? base.subjectName
    : patch.subjectName,
  pages: isMeaningfulValue(base.pages) ? base.pages : patch.pages,
  lotNumber: isMeaningfulValue(base.lotNumber)
    ? base.lotNumber
    : patch.lotNumber,
});

const MergeCatchNumbers = forwardRef(({ onSelectionCountChange }, ref) => {
  const projectId = useStore((state) => state.projectId);
  const { showToast } = useToast();
  const token = localStorage.getItem("token");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedCatchNos, setSelectedCatchNos] = useState([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSeparator, setMergeSeparator] = useState("/");
  const [mergeModuleId, setMergeModuleId] = useState(null);
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");

  const loadRows = async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/GetByProjectId/${projectId}`, {
        params: {
          pageSize: 100000,
          pageNo: 1,
        },
      });

      const items = Array.isArray(res.data?.items) ? res.data.items : [];
      const uniqueByCatch = new Map();

      items.forEach((item) => {
        const catchNo = item?.CatchNo ?? item?.catchNo;
        if (!catchNo) return;

        const row = {
          key: catchNo,
          catchNo,
          centerCode:
            item?.CenterCode ??
            item?.CentreCode ??
            item?.centerCode ??
            item?.centreCode ??
            "",
          examDate: item?.ExamDate ?? item?.examDate ?? "",
          examTime: item?.ExamTime ?? item?.examTime ?? "",
          quantity:
            item?.NRQuantity ??
            item?.nrQuantity ??
            item?.Quantity ??
            item?.quantity ??
            "",
          subjectName:
            item?.SubjectName ??
            item?.subjectName ??
            item?.PaperName ??
            item?.paperName ??
            item?.PaperCode ??
            item?.paperCode ??
            "",
          pages: item?.Pages ?? item?.pages ?? "",
          lotNumber: coerceNumber(item?.LotNumber ?? item?.lotNumber ?? 0, 0),
        };

        if (uniqueByCatch.has(catchNo)) {
          uniqueByCatch.set(catchNo, mergeRows(uniqueByCatch.get(catchNo), row));
        } else {
          uniqueByCatch.set(catchNo, row);
        }
      });

      const list = Array.from(uniqueByCatch.values()).sort((a, b) =>
        String(a.catchNo).localeCompare(String(b.catchNo), undefined, {
          numeric: true,
          sensitivity: "base",
        })
      );

      setRows(list);
    } catch (error) {
      console.error("Failed to load catch data for merge", error);
      showToast("Failed to load catch data", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [projectId]);

  useEffect(() => {
    if (typeof onSelectionCountChange === "function") {
      onSelectionCountChange(selectedCatchNos.length);
    }
  }, [onSelectionCountChange, selectedCatchNos.length]);

  const openMergeModal = () => {
    if (selectedCatchNos.length < 2) {
      showToast("Select at least 2 catch numbers to merge.", "warning");
      return;
    }
    setMergeSeparator("/");
    setMergeModuleId(null);
    setMergeModalOpen(true);
  };

  const confirmMerge = async () => {
    if (selectedCatchNos.length < 2) {
      showToast("Select at least 2 catch numbers to merge.", "warning");
      return;
    }
    try {
      setLoading(true);
      const res = await API.post(
        `/NRDatas/merge-catchnos?ProjectId=${projectId}`,
        {
          catchNos: selectedCatchNos,
          separator: mergeSeparator || "/",
          moduleId: mergeModuleId ?? null,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      showToast(res.data?.message || "Catch numbers merged successfully.", "success");
      setSelectedRowKeys([]);
      setSelectedCatchNos([]);
      setMergeModalOpen(false);
      await loadRows();
    } catch (error) {
      console.error("Error merging catch numbers:", error);
      const errorMessage =
        error?.response?.data?.message ||
        error?.response?.data ||
        error?.message ||
        "Failed to merge selected catch numbers";
      showToast(errorMessage, "error");
    } finally {
      setLoading(false);
    }
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

  useImperativeHandle(ref, () => ({
    openMergeModal: () => openMergeModal(),
  }));

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
          <Button type="primary" size="small" onClick={() => confirm()}>
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
      const rawValue = record?.[dataIndex];
      if (rawValue === undefined || rawValue === null) return false;
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
    filteredValue: searchedColumn === dataIndex && searchText ? [searchText] : null,
  });

  const columns = useMemo(
    () => [
      {
        title: "Catch No",
        dataIndex: "catchNo",
        key: "catchNo",
        width: 130,
        sorter: (a, b) => String(a.catchNo).localeCompare(String(b.catchNo)),
        ...getColumnSearchProps("catchNo"),
      },
      {
        title: "Center",
        dataIndex: "centerCode",
        key: "centerCode",
        width: 120,
        sorter: (a, b) =>
          String(a.centerCode || "").localeCompare(String(b.centerCode || "")),
        ...getColumnSearchProps("centerCode"),
      },
      {
        title: "Exam Date",
        dataIndex: "examDate",
        key: "examDate",
        width: 120,
        sorter: (a, b) =>
          String(a.examDate || "").localeCompare(String(b.examDate || "")),
        ...getColumnSearchProps("examDate"),
      },
      {
        title: "Exam Time",
        dataIndex: "examTime",
        key: "examTime",
        width: 140,
        sorter: (a, b) =>
          String(a.examTime || "").localeCompare(String(b.examTime || "")),
        ...getColumnSearchProps("examTime"),
      },
      {
        title: "Quantity",
        dataIndex: "quantity",
        key: "quantity",
        width: 90,
        sorter: (a, b) => Number(a.quantity || 0) - Number(b.quantity || 0),
        ...getColumnSearchProps("quantity"),
      },
      {
        title: "Subject Name",
        dataIndex: "subjectName",
        key: "subjectName",
        width: 220,
        ellipsis: true,
        sorter: (a, b) =>
          String(a.subjectName || "").localeCompare(String(b.subjectName || "")),
        ...getColumnSearchProps("subjectName"),
        render: (value) =>
          value ? (
            <Tooltip title={value}>
              <span>{value}</span>
            </Tooltip>
          ) : (
            ""
          ),
      },
      {
        title: "Pages",
        dataIndex: "pages",
        key: "pages",
        width: 80,
        sorter: (a, b) => Number(a.pages || 0) - Number(b.pages || 0),
        ...getColumnSearchProps("pages"),
      },
      {
        title: "Lot Number",
        dataIndex: "lotNumber",
        key: "lotNumber",
        width: 110,
        render: (value) => coerceNumber(value, 0),
        sorter: (a, b) => Number(a.lotNumber || 0) - Number(b.lotNumber || 0),
        ...getColumnSearchProps("lotNumber"),
      },
    ],
    [searchedColumn, searchText]
  );

  return (
    <div className="pt-0">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card
          variant="outlined"
          style={{
            borderColor: "#e5e7eb",
            boxShadow: "0 6px 16px rgba(15, 23, 42, 0.08)",
            backgroundColor: "#f8fafc",
          }}
          styles={{ body: { paddingTop: 12 } }}
        >
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Table
              dataSource={rows}
              columns={columns}
              rowKey="catchNo"
              loading={loading}
              size="small"
              tableLayout="fixed"
              rowSelection={{
                selectedRowKeys,
                onChange: (keys, selectedRows) => {
                  setSelectedRowKeys(keys);
                  setSelectedCatchNos(selectedRows.map((row) => row.catchNo));
                },
              }}
              pagination={{
                pageSize: 20,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} records`,
              }}
              scroll={{ x: "max-content" }}
              locale={{
                emptyText: "No catch numbers available for merge.",
              }}
            />
          </Space>
        </Card>
      </motion.div>

      <Modal
        title="Merge Catch Numbers"
        open={mergeModalOpen}
        okText="Merge"
        onOk={confirmMerge}
        onCancel={() => setMergeModalOpen(false)}
        okButtonProps={{ disabled: selectedCatchNos.length < 2, loading }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Text type="secondary">
            Choose how to join the selected catch numbers:
          </Text>
          <Radio.Group
            value={mergeSeparator}
            onChange={(event) => setMergeSeparator(event.target.value)}
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
    </div>
  );
});

export default MergeCatchNumbers;
