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
  const normalized = String(value).trim();
  const parsed = dayjs(normalized, DATE_FORMATS, true);
  if (parsed.isValid()) return parsed;
  const relaxed = dayjs(normalized);
  return relaxed.isValid() ? relaxed : null;
};

const coerceNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const formatDate = (value) => (value ? dayjs(value).format("DD-MM-YYYY") : "");

const getDateBounds = (dates) => {
  let start = null;
  let end = null;
  dates.forEach((date) => {
    if (!date) return;
    if (!start || date.isBefore(start)) start = date;
    if (!end || date.isAfter(end)) end = date;
  });
  return { start, end };
};

const getNextLotNumber = (rows, targetLot) => {
  const lots = rows
    .map((row) => coerceNumber(row.lotNumber, 0))
    .filter((lot) => lot > targetLot);
  if (!lots.length) return null;
  return Math.min(...lots);
};

const getPrevLotNumber = (rows, targetLot) => {
  const lots = rows
    .map((row) => coerceNumber(row.lotNumber, 0))
    .filter((lot) => lot > 0 && lot < targetLot);
  if (!lots.length) return null;
  return Math.max(...lots);
};

const getLotRange = (rows, lotNumber) => {
  const dates = rows
    .filter((row) => coerceNumber(row.lotNumber, 0) === lotNumber)
    .map((row) => parseExamDate(row.examDate))
    .filter(Boolean);
  if (!dates.length) return null;
  return getDateBounds(dates);
};

const getAutoStartDate = (rows, targetLot) => {
  const dates = rows
    .map((row) => parseExamDate(row.examDate))
    .filter(Boolean)
    .sort((a, b) => a.valueOf() - b.valueOf());

  if (!dates.length) return null;

  const normalizedTarget = coerceNumber(targetLot, 0);
  if (normalizedTarget > 0) {
    const prevLotNumber = getPrevLotNumber(rows, normalizedTarget);
    if (!prevLotNumber) return dates[0];

    const prevRange = getLotRange(rows, prevLotNumber);
    if (!prevRange?.end) return dates[0];

    return dates.find((date) => date.isAfter(prevRange.end, "day")) || null;
  }

  const unassignedDates = rows
    .filter((row) => coerceNumber(row.lotNumber, 0) <= 0)
    .map((row) => parseExamDate(row.examDate))
    .filter(Boolean)
    .sort((a, b) => a.valueOf() - b.valueOf());

  return unassignedDates[0] || dates[0] || null;
};

const hasLotDate = (rows, lotNumber, date) =>
  rows.some((row) => {
    if (coerceNumber(row.lotNumber, 0) !== lotNumber) return false;
    const parsed = parseExamDate(row.examDate);
    return parsed ? parsed.isSame(date, "day") : false;
  });

const hasLotDateInRange = (rows, lotNumber, start, end) =>
  rows.some((row) => {
    if (coerceNumber(row.lotNumber, 0) !== lotNumber) return false;
    const parsed = parseExamDate(row.examDate);
    if (!parsed) return false;
    return (
      (parsed.isAfter(start) || parsed.isSame(start, "day")) &&
      (parsed.isBefore(end) || parsed.isSame(end, "day"))
    );
  });

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
  const [startTouched, setStartTouched] = useState(false);
  const [activeLotTab, setActiveLotTab] = useState("all");
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [bifurcationModalOpen, setBifurcationModalOpen] = useState(false);
  const [pageSize, setPageSize] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);
  const [lotAssignmentFilter, setLotAssignmentFilter] = useState("all");
  const [editingCatchNo, setEditingCatchNo] = useState(null);
  const [editingLotValue, setEditingLotValue] = useState(0);
  const [endPickerValue, setEndPickerValue] = useState(null);

  const closeBifurcationPanel = () => {
    setBifurcationModalOpen(false);
    setDateRange([null, null]);
    setLotNumber(null);
    setEndPickerValue(null);
    setStartTouched(false);
  };

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

  useEffect(() => {
    if (activeLotTab !== "0") {
      setEditingCatchNo(null);
      setEditingLotValue(0);
    }
  }, [activeLotTab]);

  useEffect(() => {
    if (!bifurcationModalOpen) return;
    if (!rows.length) return;
    if (startTouched) return;

    const targetLot = lotNumber;
    const autoStart = getAutoStartDate(rows, targetLot);
    if (!autoStart) return;

    setDateRange((prev) => [autoStart, prev?.[1] || null]);
    setEndPickerValue(autoStart);
  }, [bifurcationModalOpen, rows, lotNumber, startTouched]);

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

    const targetLot = coerceNumber(lotNumber, 0);
    const inRangeSet = new Set(inRangeCatchNos);

    const outOfRangeTargetRows = rows.filter((row) => {
      const parsedDate = parseExamDate(row.examDate);
      if (!parsedDate) return false;
      const isTargetLot = coerceNumber(row.lotNumber, 0) === targetLot;
      return isTargetLot && !inRangeSet.has(row.catchNo);
    });

    const applyBifurcation = async ({
      mergeToNextLot,
      nextLotNumber,
      allowBoundaryOverlap,
      forceBoundaryToNextLot,
      boundaryDateForNext,
      boundaryDateForPrev,
      prevLotNumber,
      nextLotStartLotNumber,
    }) => {
      const prevRows = rows;
      const shouldShiftPrevTail = Boolean(prevLotNumber && hasPrevOverlap);
      const nextRows = rows.map((row) => {
        const parsedDate = parseExamDate(row.examDate);
        const hasValidDate = Boolean(parsedDate);
        const isTargetLot = coerceNumber(row.lotNumber, 0) === targetLot;
        const isPrevLot =
          prevLotNumber &&
          coerceNumber(row.lotNumber, 0) === coerceNumber(prevLotNumber, 0);
        if (inRangeSet.has(row.catchNo)) {
          if (
            allowBoundaryOverlap &&
            forceBoundaryToNextLot &&
            boundaryDateForNext &&
            nextLotNumber
          ) {
            if (parsedDate && parsedDate.isSame(boundaryDateForNext, "day")) {
              return { ...row, lotNumber: nextLotNumber };
            }
          }
          return { ...row, lotNumber: targetLot };
        }
        if (
          shouldShiftPrevTail &&
          isPrevLot &&
          parsedDate &&
          parsedDate.isAfter(end, "day")
        ) {
          return {
            ...row,
            lotNumber: nextLotNumber ? nextLotNumber : 0,
          };
        }
        if (hasValidDate && isTargetLot) {
          return {
            ...row,
            lotNumber: mergeToNextLot && nextLotNumber ? nextLotNumber : 0,
          };
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
      } else if (targetLot > 0) {
        setActiveLotTab(String(targetLot));
      }

      closeBifurcationPanel();
      return true;
    };

    const nextLotNumber = getNextLotNumber(rows, targetLot);
    const prevLotNumber = getPrevLotNumber(rows, targetLot);
    const prevRange = prevLotNumber ? getLotRange(rows, prevLotNumber) : null;
    const nextRange = nextLotNumber ? getLotRange(rows, nextLotNumber) : null;
    const boundaryDateForPrev =
      prevRange && start.isSame(prevRange.end, "day") && prevLotNumber
        ? prevRange.end
        : null;
    const boundaryDateForNext =
      nextRange && end.isSame(nextRange.start, "day") && nextLotNumber
        ? nextRange.start
        : null;
    const hasPrevBoundary =
      boundaryDateForPrev &&
      hasLotDate(rows, prevLotNumber, boundaryDateForPrev);
    const hasNextBoundary =
      boundaryDateForNext &&
      hasLotDate(rows, nextLotNumber, boundaryDateForNext);
    const hasPrevOverlap =
      prevRange &&
      hasLotDateInRange(rows, prevLotNumber, start, end);
    const hasNextOverlap =
      nextRange &&
      hasLotDateInRange(rows, nextLotNumber, start, end);
    const hasPrevTailBeyondRange =
      prevRange && end.isBefore(prevRange.end, "day");

    if (prevRange && !end.isAfter(prevRange.start, "day")) {
      showToast(
        `Lot ${targetLot} must come after Lot ${prevLotNumber}. Select dates after ${formatDate(
          prevRange.start
        )}.`,
        "warning"
      );
      return;
    }

    if (nextRange && !start.isBefore(nextRange.end, "day")) {
      showToast(
        `Lot ${targetLot} must come before Lot ${nextLotNumber}. Select dates before ${formatDate(
          nextRange.end
        )}.`,
        "warning"
      );
      return;
    }

    if (hasNextOverlap && !hasNextBoundary) {
      showToast(
        `Date ${formatDate(
          nextRange.start
        )} is already covered in Lot ${nextLotNumber}. Please change the date range (end before this date) or adjust Lot ${nextLotNumber}.`,
        "warning"
      );
      return;
    }

    const proceedWithBifurcation = (allowBoundaryOverlap) => {
      if (nextLotNumber && outOfRangeTargetRows.length) {
        const nextLotDates = rows
          .filter(
            (row) => coerceNumber(row.lotNumber, 0) === nextLotNumber
          )
          .map((row) => parseExamDate(row.examDate))
          .filter(Boolean);
        const movedDates = outOfRangeTargetRows
          .map((row) => parseExamDate(row.examDate))
          .filter(Boolean);
        const { start: nextStart, end: nextEnd } = getDateBounds([
          ...nextLotDates,
          ...movedDates,
        ]);
        const rangeLabel =
          nextStart && nextEnd
            ? `${formatDate(nextStart)} - ${formatDate(nextEnd)}`
            : null;

        Modal.confirm({
          title: "Merge into next lot?",
          content: (
            <Space direction="vertical" size={4}>
              <Text>
                Some catch numbers from Lot {targetLot} fall outside the selected
                range.
              </Text>
              <Text>
                They will be merged into Lot {nextLotNumber}.
              </Text>
              {rangeLabel && (
                <Text type="secondary">
                  Lot {nextLotNumber} will cover {rangeLabel}.
                </Text>
              )}
            </Space>
          ),
          okText: "Proceed",
          cancelText: "Cancel",
          onOk: () =>
            applyBifurcation({
              mergeToNextLot: true,
              nextLotNumber,
              allowBoundaryOverlap,
              forceBoundaryToNextLot: Boolean(hasNextBoundary),
              boundaryDateForNext: hasNextBoundary ? boundaryDateForNext : null,
              boundaryDateForPrev: hasPrevBoundary ? boundaryDateForPrev : null,
              prevLotNumber,
              nextLotStartLotNumber: nextLotNumber,
            }),
        });
        return;
      }

      applyBifurcation({
        mergeToNextLot: false,
        nextLotNumber,
        allowBoundaryOverlap,
        forceBoundaryToNextLot: Boolean(hasNextBoundary),
        boundaryDateForNext: hasNextBoundary ? boundaryDateForNext : null,
        boundaryDateForPrev: hasPrevBoundary ? boundaryDateForPrev : null,
        prevLotNumber,
        nextLotStartLotNumber: nextLotNumber,
      });
    };

    if (hasPrevOverlap || hasNextBoundary) {
      const overlapEndForPrev =
        prevRange && end.isBefore(prevRange.end) ? end : prevRange?.end;
      const prevTailTargetLabel = nextLotNumber
        ? `Lot ${nextLotNumber}`
        : "unassigned";
      Modal.confirm({
        title: "Force overlap?",
        content: (
          <Space direction="vertical" size={4}>
            {hasPrevOverlap && (
              <Text>
                Dates {formatDate(start)} - {formatDate(overlapEndForPrev)} are
                already covered in Lot {prevLotNumber}. If you proceed, they
                will be moved to Lot {targetLot}.
              </Text>
            )}
            {hasPrevOverlap && hasPrevTailBeyondRange && (
              <Text>
                Dates after {formatDate(end)} from Lot {prevLotNumber} will be
                moved to {prevTailTargetLabel}.
              </Text>
            )}
            {hasNextBoundary && (
              <Text>
                Date {formatDate(boundaryDateForNext)} is already covered in Lot{" "}
                {nextLotNumber}. If you proceed, it will stay in Lot{" "}
                {nextLotNumber}.
              </Text>
            )}
          </Space>
        ),
        okText: "Proceed",
        cancelText: "Cancel",
        onOk: () => proceedWithBifurcation(true),
      });
      return;
    }

    proceedWithBifurcation(false);
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
        const allowInlineEdit = activeLotTab === "0";
        const isEditing = editingCatchNo === record.catchNo;
        if (!allowInlineEdit) {
          return <span>{coerceNumber(record?.lotNumber, 0)}</span>;
        }
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
            {bifurcationModalOpen && (
              <Card
                size="small"
                style={{
                  background:
                    "linear-gradient(120deg, rgba(59,130,246,0.08), rgba(255,255,255,1) 35%)",
                  borderColor: "#dbeafe",
                  boxShadow: "0 10px 22px rgba(15, 23, 42, 0.08)",
                }}
                bodyStyle={{ padding: 14 }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    alignItems: "center",
                    marginBottom: 10,
                  }}
                >
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "#1d4ed8",
                        color: "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: 12,
                      }}
                    >
                      LOT
                    </div>
                    <div>
                      <Text strong style={{ fontSize: 14 }}>
                        Bifurcate Lots
                      </Text>
                      <Text
                        type="secondary"
                        style={{ display: "block", fontSize: 12 }}
                      >
                        Select a date range and lot number. Conflicts will ask for
                        confirmation.
                      </Text>
                    </div>
                  </div>
                  <Space>
                    <Button size="small" onClick={closeBifurcationPanel}>
                      Close
                    </Button>
                  </Space>
                </div>

                <div
                  style={{
                    background: "#ffffff",
                    borderRadius: 10,
                    border: "1px solid #e2e8f0",
                    padding: 12,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                      gap: 12,
                      alignItems: "end",
                    }}
                  >
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                        Start Date
                      </Text>
                      <DatePicker
                        value={dateRange?.[0] || null}
                        format="DD-MM-YYYY"
                        style={{ width: "100%", marginTop: 6 }}
                        onChange={(value) => {
                          setStartTouched(true);
                          setDateRange((prev) => {
                            const nextEnd =
                              prev?.[1] &&
                              value &&
                              prev[1].isBefore(value, "day")
                                ? null
                                : prev?.[1] || null;
                            return [value, nextEnd];
                          });
                          if (value) {
                            setEndPickerValue(value);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                        End Date
                      </Text>
                      <DatePicker
                        value={dateRange?.[1] || null}
                        format="DD-MM-YYYY"
                        style={{ width: "100%", marginTop: 6 }}
                        onChange={(value) =>
                          setDateRange((prev) => [prev?.[0] || null, value])
                        }
                        disabledDate={(current) => {
                          const start = dateRange?.[0];
                          if (!start || !current) return false;
                          return current.isBefore(start, "day");
                        }}
                        pickerValue={
                          endPickerValue ||
                          dateRange?.[1] ||
                          dateRange?.[0] ||
                          undefined
                        }
                        onPanelChange={(value) => setEndPickerValue(value)}
                        onOpenChange={(open) => {
                          if (open && dateRange?.[0]) {
                            setEndPickerValue(dateRange[0]);
                          }
                        }}
                      />
                    </div>
                    <div>
                      <Text type="secondary" style={{ fontSize: 11, fontWeight: 600 }}>
                        Lot Number
                      </Text>
                      <InputNumber
                        min={0}
                        value={lotNumber}
                        style={{ width: "100%", marginTop: 6 }}
                        placeholder="Enter lot number"
                        onChange={(value) => setLotNumber(value)}
                      />
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        justifyContent: "flex-end",
                        paddingTop: 6,
                      }}
                    >
                      <Button onClick={closeBifurcationPanel}>Cancel</Button>
                      <Button
                        type="primary"
                        onClick={handleBifurcate}
                        disabled={loading || !rows.length}
                      >
                        Apply
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}
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

    </div>
  )
});

export default LotsBifurcation;
