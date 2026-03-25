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
  DatePicker,
  InputNumber,
  Modal,
  Space,
  Table,
  Tabs,
  Radio,
  Typography,
  Input,
  Tooltip,
} from "antd";
import { motion } from "framer-motion";
import { SearchOutlined } from "@ant-design/icons";
import { EditOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
import API from "../../hooks/api";
import useStore from "../../stores/ProjectData";
import { useToast } from "../../hooks/useToast";

dayjs.extend(customParseFormat);

const { Text } = Typography;
const DATE_FORMATS = ["DD-MM-YYYY", "YYYY-MM-DD", "DD/MM/YYYY", "MM/DD/YYYY"];

const isMeaningfulValue = (value) => {
  if (value === undefined || value === null) return false;
  if (typeof value === "number") return !Number.isNaN(value);
  const normalized = String(value).trim().toLowerCase();
  return normalized !== "" && normalized !== "undefined" && normalized !== "null";
};

const parseExamDate = (value) => {
  if (!value) return null;
  const parsed = dayjs(String(value).trim(), DATE_FORMATS, true);
  return parsed.isValid() ? parsed : null;
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

const LotsBifurcation = forwardRef((_, ref) => {
  const projectId = useStore((state) => state.projectId);
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [dateRange, setDateRange] = useState([null, null]);
  const [lotNumber, setLotNumber] = useState(null);
  const [activeLotTab, setActiveLotTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [bifurcationModalOpen, setBifurcationModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [lotAssignmentFilter, setLotAssignmentFilter] = useState("all");
  const [editingCatchNo, setEditingCatchNo] = useState(null);
  const [editingLotValue, setEditingLotValue] = useState(0);

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
          lotNumber: coerceNumber(
            item?.LotNo ?? item?.lotNo ?? item?.LotNumber ?? item?.lotNumber ?? 0,
            0
          ),
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
      console.error("Failed to load catch data for lots", error);
      showToast("Failed to load catch data", "error");
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [projectId]);


  const lotTabs = useMemo(() => {
    const uniqueLots = Array.from(
      new Set(rows.map((row) => coerceNumber(row.lotNumber, 0)))
    ).sort((a, b) => a - b);
    return ["all", ...uniqueLots.map((lot) => String(lot))];
  }, [rows]);

  const filteredRows = useMemo(() => {
    let list = rows;
    if (activeLotTab === "all") {
      if (lotAssignmentFilter === "assigned") {
        list = list.filter((row) => coerceNumber(row.lotNumber, 0) > 0);
      } else if (lotAssignmentFilter === "unassigned") {
        list = list.filter((row) => coerceNumber(row.lotNumber, 0) <= 0);
      }
      return list;
    }
    const lotValue = Number(activeLotTab);
    if (lotValue === 0) {
      return list.filter((row) => !parseExamDate(row.examDate));
    }
    return list.filter((row) => coerceNumber(row.lotNumber, 0) === lotValue);
  }, [rows, activeLotTab, lotAssignmentFilter]);

  useEffect(() => {
    const total = filteredRows.length;
    const maxPage = Math.max(1, Math.ceil(total / pageSize));
    if (currentPage > maxPage) {
      setCurrentPage(maxPage);
    }
  }, [filteredRows, pageSize, currentPage]);

  const saveLotAssignments = async (updates, successMessage) => {
    if (!projectId) return false;
    if (!updates?.length) return true;
    try {
      await API.put("/NRDataLots/assign", {
        projectId,
        updates: updates.map((item) => ({
          catchNo: item.catchNo,
          lotNo: coerceNumber(item.lotNo ?? item.lotNumber ?? 0, 0),
        })),
      });
      if (successMessage) {
        showToast(successMessage, "success");
      }
      return true;
    } catch (error) {
      console.error("Failed to save lot numbers", error);
      showToast("Failed to save lot numbers", "error");
      return false;
    }
  };

  const handleBifurcate = async () => {
    if (!dateRange?.[0] || !dateRange?.[1]) {
      showToast("Select a date range first", "warning");
      return;
    }

    if (lotNumber === null || lotNumber === undefined) {
      showToast("Enter a lot number", "warning");
      return;
    }

    const start = dateRange[0].startOf("day");
    const end = dateRange[1].endOf("day");

    const inRangeCatchNos = [];

    rows.forEach((row) => {
      const parsedDate = parseExamDate(row.examDate);
      if (!parsedDate) return;

      if (
        (parsedDate.isAfter(start) || parsedDate.isSame(start)) &&
        (parsedDate.isBefore(end) || parsedDate.isSame(end))
      ) {
        inRangeCatchNos.push(row.catchNo);
      }
    });

    if (!inRangeCatchNos.length) {
      showToast("No catch numbers found in the selected date range", "info");
      return;
    }

    if (inRangeCatchNos.length) {
      const targetLot = coerceNumber(lotNumber, 0);
      const inRangeSet = new Set(inRangeCatchNos);
      const prevRows = rows;
      const nextRows = rows.map((row) => {
        const hasValidDate = Boolean(parseExamDate(row.examDate));
        const isTargetLot = coerceNumber(row.lotNumber, 0) === targetLot;
        if (inRangeSet.has(row.catchNo)) {
          return { ...row, lotNumber: targetLot };
        }
        if (hasValidDate && isTargetLot) {
          return { ...row, lotNumber: 0 };
        }
        return row;
      });

      const updates = nextRows
        .filter(
          (row, index) =>
            coerceNumber(row.lotNumber, 0) !==
            coerceNumber(rows[index]?.lotNumber, 0)
        )
        .map((row) => ({ catchNo: row.catchNo, lotNo: row.lotNumber }));

      setRows(nextRows);

      const ok = await saveLotAssignments(
        updates,
        `Assigned ${inRangeCatchNos.length} catch numbers to lot ${lotNumber}`
      );
      if (!ok) {
        setRows(prevRows);
      }
    }

    setBifurcationModalOpen(false);
    setDateRange([null, null]);
    setLotNumber(null);
  };

  useImperativeHandle(ref, () => ({
    openBifurcationModal: () => setBifurcationModalOpen(true),
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

  const columns = [
    {
      title: "Catch No",
      dataIndex: "catchNo",
      key: "catchNo",
      width: 130,
      align: "center",
      sorter: (a, b) => String(a.catchNo).localeCompare(String(b.catchNo)),
      ...getColumnSearchProps("catchNo"),
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
      width: 170,
      render: (_, record) => {
        const isEditing = editingCatchNo === record.catchNo;
        if (!isEditing) {
          return (
            <Space size={6}>
              <span>{coerceNumber(record?.lotNumber, 0)}</span>
              <Button
                size="small"
                icon={<EditOutlined />}
                onClick={() => {
                  setEditingCatchNo(record.catchNo);
                  setEditingLotValue(coerceNumber(record?.lotNumber, 0));
                }}
              />
            </Space>
          );
        }

        return (
          <Space size={6}>
            <InputNumber
              min={0}
              value={editingLotValue}
              onChange={(value) => setEditingLotValue(coerceNumber(value, 0))}
            />
            <Button
              size="small"
              type="primary"
              onClick={async () => {
                const nextLot = coerceNumber(editingLotValue, 0);
                const ok = await saveLotAssignments(
                  [{ catchNo: record.catchNo, lotNo: nextLot }],
                  "Lot number saved"
                );
                if (ok) {
                  setRows((prev) =>
                    prev.map((row) =>
                      row.catchNo === record.catchNo
                        ? { ...row, lotNumber: nextLot }
                        : row
                    )
                  );
                  setEditingCatchNo(null);
                }
              }}
            >
              Save
            </Button>
            <Button
              size="small"
              onClick={() => {
                setEditingCatchNo(null);
                setEditingLotValue(0);
              }}
            >
              Cancel
            </Button>
          </Space>
        );
      },
      sorter: (a, b) => Number(a.lotNumber || 0) - Number(b.lotNumber || 0),
      ...getColumnSearchProps("lotNumber"),
    },
  ];

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
          <style>
            {`
              .lot-bifurcation-table .ant-table-thead > tr > th {
                background: #f1f5f9;
                font-weight: 600;
              }
              .lot-row-even td {
                background: #ffffff;
              }
              .lot-row-odd td {
                background: #f8fafc;
              }
              .lot-filter-bar {
                display: flex;
                align-items: center;
                gap: 8px;
                padding: 6px 10px;
                border: 1px solid #e2e8f0;
                border-radius: 8px;
                background: #ffffff;
                width: fit-content;
              }
              .lot-filter-label {
                font-size: 12px;
                font-weight: 600;
                color: #475569;
              }
              .lot-tab-row {
                display: flex;
                align-items: center;
                gap: 12px;
                flex-wrap: wrap;
              }
              .lot-tabs {
                flex: 1 1 420px;
                min-width: 260px;
              }
              .lot-tabs .ant-tabs-nav {
                margin-bottom: 0;
              }
              .lot-filter-bar {
                flex: 0 0 auto;
              }
              .lot-bifurcation-table .ant-table {
                max-width: 100%;
              }
              .lot-bifurcation-table .ant-table-container {
                overflow-x: auto;
              }
            `}
          </style>
          <Space direction="vertical" size={8} style={{ width: "100%" }}>
            <div className="lot-tab-row">
              <Tabs
                className="lot-tabs"
                activeKey={activeLotTab}
                onChange={(key) => setActiveLotTab(key)}
                items={lotTabs.map((lotKey) => ({
                  key: lotKey,
                  label:
                    lotKey === "all"
                      ? "All Lots"
                      : Number(lotKey) === 0
                      ? "Missing Exam Date"
                      : `Lot ${lotKey}`,
                }))}
              />
              {activeLotTab === "all" && (
                <div className="lot-filter-bar">
                  <span className="lot-filter-label">Show</span>
                  <Radio.Group
                    size="small"
                    optionType="button"
                    buttonStyle="solid"
                    value={lotAssignmentFilter}
                    onChange={(event) =>
                      setLotAssignmentFilter(event.target.value)
                    }
                  >
                    <Radio.Button value="all">All</Radio.Button>
                    <Radio.Button value="assigned">Assigned</Radio.Button>
                    <Radio.Button value="unassigned">Unassigned</Radio.Button>
                  </Radio.Group>
                </div>
              )}
            </div>

            <Table
              dataSource={filteredRows}
              columns={columns}
              rowKey="catchNo"
              loading={loading}
              size="small"
              tableLayout="auto"
              bordered
              className="lot-bifurcation-table"
              rowClassName={(_, index) =>
                index % 2 === 0 ? "lot-row-even" : "lot-row-odd"
              }
              pagination={{
                current: currentPage,
                pageSize,
                showSizeChanger: true,
                pageSizeOptions: ["10", "20", "50", "100"],
                onChange: (page, size) => {
                  setCurrentPage(page);
                  if (Number.isFinite(size)) {
                    setPageSize(size);
                  }
                },
                onShowSizeChange: (_, size) => {
                  setCurrentPage(1);
                  setPageSize(size);
                },
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} of ${total} records`,
              }}
              locale={{
                emptyText: "No catch numbers available for lots.",
              }}
            />
          </Space>
        </Card>
      </motion.div>

      <Modal
        title="Bifurcate Lots"
        open={bifurcationModalOpen}
        onCancel={() => {
          setBifurcationModalOpen(false);
          setDateRange([null, null]);
          setLotNumber(null);
        }}
        onOk={handleBifurcate}
        okText="Apply"
        okButtonProps={{ disabled: loading || !rows.length }}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <div>
            <Text type="secondary" className="mb-1 block text-[11px] font-medium">
              Start Date
            </Text>
            <DatePicker
              value={dateRange?.[0] || null}
              format="DD-MM-YYYY"
              style={{ width: "100%" }}
              onChange={(value) =>
                setDateRange((prev) => [value, prev?.[1] || null])
              }
            />
          </div>
          <div>
            <Text type="secondary" className="mb-1 block text-[11px] font-medium">
              End Date
            </Text>
            <DatePicker
              value={dateRange?.[1] || null}
              format="DD-MM-YYYY"
              style={{ width: "100%" }}
              onChange={(value) =>
                setDateRange((prev) => [prev?.[0] || null, value])
              }
            />
          </div>
          <div>
            <Text type="secondary" className="mb-1 block text-[11px] font-medium">
              Lot Number
            </Text>
            <InputNumber
              min={0}
              value={lotNumber}
              style={{ width: "100%" }}
              placeholder="Enter lot number"
              onChange={(value) => setLotNumber(value)}
            />
          </div>
        </Space>
      </Modal>

    </div>
  )
});

export default LotsBifurcation;
