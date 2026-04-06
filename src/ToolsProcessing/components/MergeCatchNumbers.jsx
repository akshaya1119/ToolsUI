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
  InputNumber,
  Modal,
  Radio,
  Select,
  Space,
  Table,
  Tooltip,
} from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { motion } from "framer-motion";
import API from "../../hooks/api";
import useStore from "../../stores/ProjectData";
import { useToast } from "../../hooks/useToast";

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

const normalizeText = (value) => String(value ?? "").trim();

const filterSelectOption = (input, option) => {
  const label = option?.label ?? option?.value ?? "";
  return normalizeText(label)
    .toLowerCase()
    .includes(normalizeText(input).toLowerCase());
};

const safeJsonParse = (value) => {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") return parsed;
    return null;
  } catch (err) {
    return null;
  }
};

const readJsonValue = (obj, key) => {
  if (!obj || !key) return "";
  const matchKey = Object.keys(obj).find(
    (candidate) => candidate.toLowerCase() === key.toLowerCase()
  );
  if (!matchKey) return "";
  const value = obj[matchKey];
  return value === undefined || value === null ? "" : String(value);
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
  const [manualSelectedCatchNos, setManualSelectedCatchNos] = useState([]);
  const [selectedSuggestionKeys, setSelectedSuggestionKeys] = useState([]);
  const [mergeModalOpen, setMergeModalOpen] = useState(false);
  const [mergeSeparator, setMergeSeparator] = useState("/");
  const [mergeModuleIds, setMergeModuleIds] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchedColumn, setSearchedColumn] = useState("");
  const [suggestionFields, setSuggestionFields] = useState(["C"]);
  const [mergeExamDate, setMergeExamDate] = useState("");
  const [mergeExamTime, setMergeExamTime] = useState("");
  const [abcdMode, setAbcdMode] = useState("single");
  const [abcdSelections, setAbcdSelections] = useState({
    A: "",
    B: "",
    C: "",
    D: "",
  });
  const [abcdSearchText, setAbcdSearchText] = useState({
    A: "",
    B: "",
    C: "",
    D: "",
  });
  const [abcdSeparators, setAbcdSeparators] = useState({
    A: "/",
    B: "/",
    C: "/",
    D: "/",
  });
  const [extraConfigs, setExtraConfigs] = useState([]);
  const [extraValues, setExtraValues] = useState({});
  const [extraTouched, setExtraTouched] = useState({});
  const [loadingExtras, setLoadingExtras] = useState(false);
  const [loadingExtraEnvelopes, setLoadingExtraEnvelopes] = useState(false);
  const [extraEnvelopeMap, setExtraEnvelopeMap] = useState({});
  const [extraEnvelopeLoaded, setExtraEnvelopeLoaded] = useState(false);
  const [extrasInitialized, setExtrasInitialized] = useState(false);
  const [extrasLoaded, setExtrasLoaded] = useState(false);

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

        const nrDatasRaw =
          item?.NRDatas ?? item?.nrDatas ?? item?.nrdatas ?? item?.NrDatas ?? "";
        const nrDatas = safeJsonParse(nrDatasRaw);

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
          totalQuantity: coerceNumber(
            item?.Quantity ?? item?.quantity ?? item?.NRQuantity ?? item?.nrQuantity ?? 0,
            0
          ),
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
          aValue: readJsonValue(nrDatas, "A"),
          bValue: readJsonValue(nrDatas, "B"),
          cValue: readJsonValue(nrDatas, "C"),
          dValue: readJsonValue(nrDatas, "D"),
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

  const openMergeModal = () => {
    if (selectedCatchNos.length < 2) {
      showToast("Select at least 2 catch numbers to merge.", "warning");
      return;
    }
    setMergeSeparator("/");
    setMergeModuleIds([]);
    setMergeExamDate("");
    setMergeExamTime("");
    setAbcdMode("single");
    setAbcdSelections({ A: "", B: "", C: "", D: "" });
    setAbcdSearchText({ A: "", B: "", C: "", D: "" });
    setAbcdSeparators({ A: "/", B: "/", C: "/", D: "/" });
    setExtraValues({});
    setExtraTouched({});
    setExtrasInitialized(false);
    setExtraEnvelopeMap({});
    setExtraEnvelopeLoaded(false);
    setMergeModalOpen(true);
  };

  const confirmMerge = async () => {
    if (selectedCatchNos.length < 2) {
      showToast("Select at least 2 catch numbers to merge.", "warning");
      return;
    }

    const buildMergedValues = (fieldKey, separator) => {
      const values = [];
      selectedRows.forEach((row) => {
        const value = normalizeText(row[fieldKey]);
        if (value && !values.includes(value)) {
          values.push(value);
        }
      });
      return values.join(separator || "/");
    };
    const abcdValues =
      abcdMode === "all"
        ? {
            A: buildMergedValues("aValue", abcdSeparators.A),
            B: buildMergedValues("bValue", abcdSeparators.B),
            C: buildMergedValues("cValue", abcdSeparators.C),
            D: buildMergedValues("dValue", abcdSeparators.D),
          }
        : {
            A: abcdSelections.A,
            B: abcdSelections.B,
            C: abcdSelections.C,
            D: abcdSelections.D,
          };

    const extraQuantities = (extraConfigs || [])
      .map((config) => {
        const extraType =
          config?.extraType ?? config?.ExtraType ?? config?.extraId ?? config?.ExtraId;
        return {
          extraType,
          quantity: coerceNumber(extraValues?.[extraType], 0),
        };
      })
      .filter((item) => item.extraType && extraTouched?.[item.extraType]);

    try {
      setLoading(true);
      const res = await API.post(
        `/NRDatas/merge-catchnos?ProjectId=${projectId}`,
        {
          catchNos: selectedCatchNos,
          separator: mergeSeparator || "/",
          moduleId: mergeModuleIds?.[0] ?? null,
          moduleIds: mergeModuleIds,
          examDate: mergeExamDate || examDateOptions[0] || selectedRows[0]?.examDate || null,
          examTime: mergeExamTime || examTimeOptions[0] || selectedRows[0]?.examTime || null,
          abcdValues,
          extraQuantities,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      showToast(res.data?.message || "Catch numbers merged successfully.", "success");
      setManualSelectedCatchNos([]);
      setSelectedSuggestionKeys([]);
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

  const loadExtraConfigs = async () => {
    if (!projectId) return;
    try {
      setLoadingExtras(true);
      const res = await API.get(`/ExtrasConfigurations/ByProject/${projectId}`);
      setExtraConfigs(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      if (err?.response?.status === 404) {
        setExtraConfigs([]);
        return;
      }
      console.error("Failed to load extra configurations:", err);
      setExtraConfigs([]);
      showToast("Failed to load extra configurations", "error");
    } finally {
      setLoadingExtras(false);
      setExtrasLoaded(true);
    }
  };

  const loadExtraEnvelopes = async () => {
    if (!projectId || selectedCatchNos.length === 0) {
      setExtraEnvelopeMap({});
      setExtraEnvelopeLoaded(true);
      return;
    }
    try {
      setLoadingExtraEnvelopes(true);
      const res = await API.post(`/ExtraEnvelopes/ByCatchNos`, {
        ProjectId: projectId,
        CatchNos: selectedCatchNos,
      });
      const items = Array.isArray(res.data) ? res.data : [];
      const map = {};
      items.forEach((item) => {
        const catchNo = normalizeText(
          item?.catchNo ?? item?.CatchNo ?? item?.catchNO ?? item?.Catchno
        );
        if (!catchNo) return;
        const extraType =
          item?.extraType ?? item?.ExtraType ?? item?.extraId ?? item?.ExtraId;
        if (!extraType) return;
        const qty = coerceNumber(
          item?.quantity ??
            item?.Quantity ??
            item?.extraQuantity ??
            item?.ExtraQuantity ??
            0,
          0
        );
        if (!map[catchNo]) map[catchNo] = {};
        map[catchNo][extraType] = coerceNumber(map[catchNo][extraType], 0) + qty;
      });
      setExtraEnvelopeMap(map);
    } catch (err) {
      console.error("Failed to load extra quantities:", err);
      setExtraEnvelopeMap({});
      showToast("Failed to load extra quantities", "error");
    } finally {
      setLoadingExtraEnvelopes(false);
      setExtraEnvelopeLoaded(true);
    }
  };

  useEffect(() => {
    if (!mergeModalOpen) return;
    if (extrasLoaded) return;
    loadExtraConfigs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeModalOpen, extrasLoaded]);

  useEffect(() => {
    if (mergeModalOpen) return;
    setExtrasInitialized(false);
    setExtraValues({});
    setExtraTouched({});
    setExtrasLoaded(false);
    setExtraEnvelopeLoaded(false);
    setExtraEnvelopeMap({});
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
        title: "A",
        dataIndex: "aValue",
        key: "aValue",
        width: 200,
        ellipsis: true,
        sorter: (a, b) => String(a.aValue || "").localeCompare(String(b.aValue || "")),
        ...getColumnSearchProps("aValue"),
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
        title: "B",
        dataIndex: "bValue",
        key: "bValue",
        width: 160,
        ellipsis: true,
        sorter: (a, b) => String(a.bValue || "").localeCompare(String(b.bValue || "")),
        ...getColumnSearchProps("bValue"),
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
        title: "C",
        dataIndex: "cValue",
        key: "cValue",
        width: 220,
        ellipsis: true,
        sorter: (a, b) => String(a.cValue || "").localeCompare(String(b.cValue || "")),
        ...getColumnSearchProps("cValue"),
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
        title: "D",
        dataIndex: "dValue",
        key: "dValue",
        width: 160,
        ellipsis: true,
        sorter: (a, b) => String(a.dValue || "").localeCompare(String(b.dValue || "")),
        ...getColumnSearchProps("dValue"),
        render: (value) =>
          value ? (
            <Tooltip title={value}>
              <span>{value}</span>
            </Tooltip>
          ) : (
            ""
          ),
      },
    ],
    [searchedColumn, searchText]
  );

  const suggestionOptions = useMemo(
    () => [
      { value: "A", label: "A - Exam" },
      { value: "B", label: "B - Subject" },
      { value: "C", label: "C - Paper Title" },
      { value: "D", label: "D - Paper Code" },
      { value: "ExamDate", label: "Exam Date" },
      { value: "ExamTime", label: "Exam Time" },
    ],
    []
  );

  const suggestedGroups = useMemo(() => {
    const groups = new Map();
    const activeFields = suggestionFields.length ? suggestionFields : ["C"];

    rows.forEach((row) => {
      const aValue = normalizeText(row.aValue);
      const bValue = normalizeText(row.bValue);
      const cValue = normalizeText(row.cValue);
      const dValue = normalizeText(row.dValue);
      const examDate = normalizeText(row.examDate);
      const examTime = normalizeText(row.examTime);

      const fieldParts = [];
      const labelParts = [];
      for (const field of activeFields) {
        if (field === "A") {
          if (!aValue) return;
          fieldParts.push(`A:${aValue}`);
          labelParts.push(`A: ${aValue}`);
        } else if (field === "B") {
          if (!bValue) return;
          fieldParts.push(`B:${bValue}`);
          labelParts.push(`B: ${bValue}`);
        } else if (field === "C") {
          if (!cValue) return;
          fieldParts.push(`C:${cValue}`);
          labelParts.push(`C: ${cValue}`);
        } else if (field === "D") {
          if (!dValue) return;
          fieldParts.push(`D:${dValue}`);
          labelParts.push(`D: ${dValue}`);
        } else if (field === "ExamDate") {
          if (!examDate) return;
          fieldParts.push(`ExamDate:${examDate}`);
          labelParts.push(`Date: ${examDate}`);
        } else if (field === "ExamTime") {
          if (!examTime) return;
          fieldParts.push(`ExamTime:${examTime}`);
          labelParts.push(`Time: ${examTime}`);
        }
      }

      if (!fieldParts.length) return;
      const key = fieldParts.join("||");
      const label = labelParts.join(" • ");

      if (!groups.has(key)) {
        groups.set(key, {
          key,
          label,
          catchNos: new Set(),
        });
      }
      groups.get(key).catchNos.add(String(row.catchNo));
    });

    return Array.from(groups.values())
      .map((group) => ({
        key: group.key,
        label: group.label,
        catchNos: Array.from(group.catchNos),
      }))
      .filter((group) => group.catchNos.length > 1)
      .sort((a, b) => {
        if (b.catchNos.length !== a.catchNos.length) {
          return b.catchNos.length - a.catchNos.length;
        }
        return a.label.localeCompare(b.label);
      });
  }, [rows, suggestionFields]);

  useEffect(() => {
    setSelectedSuggestionKeys([]);
  }, [suggestionFields]);

  const suggestionCatchNos = useMemo(() => {
    const keys = new Set(selectedSuggestionKeys);
    const catchSet = new Set();
    suggestedGroups.forEach((group) => {
      if (!keys.has(group.key)) return;
      (group.catchNos || []).forEach((catchNo) => catchSet.add(String(catchNo)));
    });
    return Array.from(catchSet);
  }, [selectedSuggestionKeys, suggestedGroups]);

  const selectedCatchNos = useMemo(() => {
    const set = new Set();
    manualSelectedCatchNos.forEach((value) => set.add(String(value)));
    suggestionCatchNos.forEach((value) => set.add(String(value)));
    return Array.from(set);
  }, [manualSelectedCatchNos, suggestionCatchNos]);

  const selectedCatchSet = useMemo(
    () => new Set(selectedCatchNos.map((value) => String(value))),
    [selectedCatchNos]
  );

  const suggestionCatchSet = useMemo(
    () => new Set(suggestionCatchNos.map((value) => String(value))),
    [suggestionCatchNos]
  );

  const selectedRows = useMemo(
    () => rows.filter((row) => selectedCatchSet.has(String(row.catchNo))),
    [rows, selectedCatchSet]
  );

  const examDateOptions = useMemo(
    () =>
      Array.from(
        new Set(selectedRows.map((row) => normalizeText(row.examDate)).filter(Boolean))
      ),
    [selectedRows]
  );

  const examTimeOptions = useMemo(
    () =>
      Array.from(
        new Set(selectedRows.map((row) => normalizeText(row.examTime)).filter(Boolean))
      ),
    [selectedRows]
  );

  const abcdFieldOptions = useMemo(() => {
    const collect = (values) =>
      Array.from(new Set(values.map((value) => normalizeText(value)).filter(Boolean)));
    return {
      A: collect(selectedRows.map((row) => row.aValue)),
      B: collect(selectedRows.map((row) => row.bValue)),
      C: collect(selectedRows.map((row) => row.cValue)),
      D: collect(selectedRows.map((row) => row.dValue)),
    };
  }, [selectedRows]);

  useEffect(() => {
    if (!mergeModalOpen) return;
    setMergeExamDate((prev) => prev || examDateOptions[0] || "");
    setMergeExamTime((prev) => prev || examTimeOptions[0] || "");
    setAbcdMode("single");
    setAbcdSelections((prev) => ({
      A: prev.A || abcdFieldOptions.A?.[0] || "",
      B: prev.B || abcdFieldOptions.B?.[0] || "",
      C: prev.C || abcdFieldOptions.C?.[0] || "",
      D: prev.D || abcdFieldOptions.D?.[0] || "",
    }));
    setAbcdSearchText({ A: "", B: "", C: "", D: "" });
    setAbcdSeparators((prev) => ({
      A: prev.A || "/",
      B: prev.B || "/",
      C: prev.C || "/",
      D: prev.D || "/",
    }));
  }, [mergeModalOpen, examDateOptions, examTimeOptions, abcdFieldOptions]);

  useEffect(() => {
    if (!mergeModalOpen) return;
    setExtraEnvelopeLoaded(false);
    loadExtraEnvelopes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mergeModalOpen, selectedCatchNos, projectId]);

  useEffect(() => {
    if (!mergeModalOpen) return;
    if (!extraEnvelopeLoaded || !extrasLoaded) return;
    if (!extrasInitialized) {
      const initialValues = {};
      if (extraConfigs.length > 0) {
        extraConfigs.forEach((config) => {
          const extraType =
            config?.extraType ??
            config?.ExtraType ??
            config?.extraId ??
            config?.ExtraId;
          if (!extraType) return;
          const sum = selectedCatchNos.reduce((total, catchNo) => {
            const key = normalizeText(catchNo);
            const value = extraEnvelopeMap?.[key]?.[extraType];
            return total + coerceNumber(value, 0);
          }, 0);
          initialValues[extraType] = sum;
        });
      }
      setExtraValues(initialValues);
      setExtrasInitialized(true);
    }
  }, [
    mergeModalOpen,
    extraConfigs,
    selectedCatchNos,
    extraEnvelopeMap,
    extraEnvelopeLoaded,
    extrasLoaded,
    extrasInitialized,
  ]);

  useEffect(() => {
    if (typeof onSelectionCountChange === "function") {
      onSelectionCountChange(selectedCatchNos.length);
    }
  }, [onSelectionCountChange, selectedCatchNos.length]);

  const tableRows = useMemo(() => {
    const withIndex = rows.map((row, index) => ({ ...row, __index: index }));
    return withIndex
      .sort((a, b) => {
        const aSelected = selectedCatchSet.has(String(a.catchNo));
        const bSelected = selectedCatchSet.has(String(b.catchNo));
        if (aSelected !== bSelected) return aSelected ? -1 : 1;
        return a.__index - b.__index;
      })
      .map(({ __index, ...row }) => row);
  }, [rows, selectedCatchSet]);

  const toggleSuggestion = (groupKey) => {
    setSelectedSuggestionKeys((prev) => {
      const set = new Set(prev);
      if (set.has(groupKey)) {
        set.delete(groupKey);
      } else {
        set.add(groupKey);
      }
      return Array.from(set);
    });
  };

  const totalExtraQuantity = useMemo(
    () =>
      (extraConfigs || []).reduce((sum, config) => {
        const extraType =
          config?.extraType ?? config?.ExtraType ?? config?.extraId ?? config?.ExtraId;
        return sum + coerceNumber(extraValues?.[extraType], 0);
      }, 0),
    [extraConfigs, extraValues]
  );

  const dateMismatch = examDateOptions.length > 1;
  const timeMismatch = examTimeOptions.length > 1;
  const scheduleMismatch = dateMismatch || timeMismatch;
  const abcdMismatch = Object.values(abcdFieldOptions).some(
    (options) => (options || []).length > 1
  );
  const missingAbcdSelection =
    abcdMode === "single" &&
    abcdMismatch &&
    ["A", "B", "C", "D"].some(
      (key) =>
        (abcdFieldOptions?.[key] || []).length > 1 &&
        !normalizeText(abcdSelections?.[key])
    );
  const missingAbcdSeparator =
    abcdMode === "all" &&
    abcdMismatch &&
    ["A", "B", "C", "D"].some(
      (key) =>
        (abcdFieldOptions?.[key] || []).length > 1 &&
        !normalizeText(abcdSeparators?.[key])
    );
  const isMergeDisabled =
    selectedCatchNos.length < 2 ||
    loading ||
    (scheduleMismatch && !mergeExamDate) ||
    (scheduleMismatch && !mergeExamTime) ||
    missingAbcdSelection ||
    missingAbcdSeparator;

  return (
    <div className="pt-0">
      <style>
        {`
          .merge-modal-shell {
            display: flex;
            flex-direction: column;
            gap: 8px;
            font-family: inherit;
          }
          .merge-modal-hero {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            padding: 6px 8px;
            border-radius: 10px;
            background: #f9fafb;
            border: 1px solid #e5e7eb;
            color: #0f172a;
          }
          .merge-modal-hero-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            width: 100%;
            flex-wrap: nowrap;
          }
          .merge-modal-title {
            font-size: 13px;
            font-weight: 700;
          }
          .merge-modal-sub {
            display: none;
          }
          .merge-modal-warning {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 2px 8px;
            border-radius: 999px;
            background: #fee2e2;
            color: #b91c1c;
            font-size: 11px;
            font-weight: 600;
            border: 1px solid #fecaca;
          }
          .merge-modal-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
          }
          .merge-modal-count {
            padding: 2px 8px;
            border-radius: 999px;
            background: #e2e8f0;
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
          }
          .merge-modal-grid {
            display: grid;
            grid-template-columns: 1fr;
            gap: 8px;
          }
          @media (min-width: 820px) {
            .merge-modal-grid {
              grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
              gap: 10px;
            }
          }
          .merge-modal-col {
            min-width: 0;
          }
          .merge-modal-panel {
            border-radius: 10px;
            border: 1px solid #e5e7eb;
            background: #ffffff;
            padding: 8px 10px;
            min-width: 0;
          }
          .merge-modal-panel-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 8px;
            margin-bottom: 6px;
          }
          .merge-modal-panel-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.08em;
            color: #1e293b;
          }
          .merge-modal-panel-desc {
            display: none;
          }
          .merge-modal-chip {
            display: inline-flex;
            align-items: center;
            padding: 2px 8px;
            border-radius: 999px;
            background: #f1f5f9;
            color: #0f172a;
            font-size: 11px;
            font-weight: 600;
          }
          .merge-modal-radio .ant-radio-button-wrapper {
            border-radius: 6px !important;
            border-color: #d1d5db;
            color: #0f172a;
            height: 26px;
            line-height: 24px;
            padding: 0 10px;
            margin-right: 6px;
          }
          .merge-modal-radio .ant-radio-button-wrapper:not(:first-child)::before {
            display: none;
          }
          .merge-modal-radio .ant-radio-button-wrapper-checked {
            background: #1677ff;
            border-color: #1677ff;
            color: #ffffff;
          }
          .merge-modal-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            padding: 6px 8px;
            border-radius: 8px;
            border: 1px solid #e5e7eb;
            background: #f9fafb;
          }
          .merge-modal-row label {
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
          }
          .abcd-grid {
            margin-top: 6px;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 8px;
          }
          .abcd-field {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .abcd-label {
            font-size: 11px;
            font-weight: 600;
            color: #475569;
          }
          .abcd-label span {
            color: #0f172a;
            font-weight: 700;
            margin-right: 6px;
          }
          .merge-suggest-panel {
            border: 1px solid #e5e7eb;
            background: #ffffff;
            border-radius: 12px;
            padding: 12px 14px;
          }
          .merge-suggest-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
            margin-bottom: 10px;
          }
          .merge-suggest-title {
            font-size: 13px;
            font-weight: 700;
            color: #0f172a;
          }
          .merge-suggest-sub {
            font-size: 11px;
            color: #64748b;
          }
          .merge-suggest-list {
            display: flex;
            flex-direction: column;
            gap: 8px;
          }
          .merge-suggest-item {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 6px 10px;
            align-items: center;
            padding: 8px 10px;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            background: #f9fafb;
          }
          .merge-suggest-item.selected {
            border-color: #93c5fd;
            background: #eff6ff;
          }
          .merge-suggest-label {
            font-size: 12px;
            font-weight: 600;
            color: #0f172a;
          }
          .merge-suggest-catches {
            font-size: 11px;
            color: #475569;
          }
          .merge-suggest-actions {
            grid-row: span 2;
          }
        `}
      </style>
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
            <div className="merge-suggest-panel">
              <div className="merge-suggest-header">
                <div>
                  <div className="merge-suggest-title">Merge Suggestions</div>
                  <div className="merge-suggest-sub">
                    Choose fields to group catch numbers. Default is C (Paper Title).
                  </div>
                </div>
                <Select
                  size="small"
                  mode="multiple"
                  value={suggestionFields}
                  onChange={(value) =>
                    setSuggestionFields(value?.length ? value : ["C"])
                  }
                  options={suggestionOptions}
                  placeholder="Pick fields"
                  maxTagCount={2}
                  style={{ minWidth: 240 }}
                />
              </div>
              {suggestedGroups.length === 0 ? (
                <div style={{ fontSize: 11, color: "#64748b" }}>
                  No suggestions found for the selected fields.
                </div>
              ) : (
                <div className="merge-suggest-list">
                  {suggestedGroups.map((group) => {
                    const isSelected = selectedSuggestionKeys.includes(group.key);
                    return (
                    <div
                      key={group.key}
                      className={`merge-suggest-item${isSelected ? " selected" : ""}`}
                    >
                      <div className="merge-suggest-label">
                        {group.label} ({group.catchNos.length})
                      </div>
                      <div className="merge-suggest-actions">
                        <Button
                          size="small"
                          type={isSelected ? "primary" : "default"}
                          onClick={() => toggleSuggestion(group.key)}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </Button>
                      </div>
                      <div className="merge-suggest-catches">
                        {group.catchNos.join(", ")}
                      </div>
                    </div>
                  );
                  })}
                </div>
              )}
            </div>
            <Table
              dataSource={tableRows}
              columns={columns}
              rowKey="catchNo"
              loading={loading}
              size="small"
              tableLayout="fixed"
              rowSelection={{
                selectedRowKeys: selectedCatchNos,
                onChange: (keys, selectedRows) => {
                  const uniqueCatchNos = Array.from(
                    new Set(selectedRows.map((row) => row.catchNo).filter(Boolean))
                  );
                  const manual = uniqueCatchNos
                    .map((value) => String(value))
                    .filter((value) => !suggestionCatchSet.has(String(value)));
                  setManualSelectedCatchNos(manual);
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
        width={820}
        okText="Merge"
        onOk={confirmMerge}
        onCancel={() => setMergeModalOpen(false)}
        okButtonProps={{ disabled: isMergeDisabled, loading }}
        styles={{ body: { maxHeight: "70vh", overflowY: "auto" } }}
      >
        <div className="merge-modal-shell">
          <div className="merge-modal-hero">
            <div className="merge-modal-hero-row">
              <div className="merge-modal-title">Merge Summary</div>
              {scheduleMismatch && (
                <div className="merge-modal-warning font-bold">
                  Exam date/time are different
                </div>
              )}
              {selectedCatchNos.length > 0 && (
                <div className="merge-modal-count">
                  {selectedCatchNos.length} selected
                </div>
              )}
            </div>
          </div>

          <div className="merge-modal-grid">
            <div className="merge-modal-col">
              <div className="merge-modal-panel">
                <div className="merge-modal-panel-header">
                  <span className="merge-modal-panel-title">Merge Pattern</span>
                </div>
                <div style={{ marginTop: 8 }}>
                  <Radio.Group
                    className="merge-modal-radio"
                    optionType="button"
                    buttonStyle="solid"
                    value={mergeSeparator}
                    onChange={(event) => setMergeSeparator(event.target.value)}
                  >
                    <Radio.Button value="/">Catch1/Catch2</Radio.Button>
                    <Radio.Button value="-">Catch1-Catch2</Radio.Button>
                  </Radio.Group>
                </div>
              </div>

              {scheduleMismatch && (
                <div className="merge-modal-panel">
                  <div className="merge-modal-panel-header">
                    <span className="merge-modal-panel-title">Exam Date & Time</span>
                  </div>
                  <div
                    style={{
                      marginTop: 6,
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                      gap: 6,
                    }}
                  >
                    {dateMismatch && (
                      <Select
                        size="small"
                        placeholder="Select exam date"
                        value={mergeExamDate || undefined}
                        onChange={(value) => setMergeExamDate(value)}
                        showSearch
                        optionFilterProp="label"
                        filterOption={filterSelectOption}
                        options={examDateOptions.map((option) => ({
                          value: option,
                          label: option,
                        }))}
                      />
                    )}
                    {timeMismatch && (
                      <Select
                        size="small"
                        placeholder="Select exam time"
                        value={mergeExamTime || undefined}
                        onChange={(value) => setMergeExamTime(value)}
                        showSearch
                        optionFilterProp="label"
                        filterOption={filterSelectOption}
                        options={examTimeOptions.map((option) => ({
                          value: option,
                          label: option,
                        }))}
                      />
                    )}
                  </div>
                </div>
              )}
              {extraConfigs.length > 0 && (
                <div className="merge-modal-panel">
                  <div className="merge-modal-panel-header">
                    <span className="merge-modal-panel-title">Extra Quantities</span>
                    <span className="merge-modal-chip">{totalExtraQuantity} total</span>
                  </div>
                  <div style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 6 }}>
                    {(extraConfigs || []).map((config) => {
                      const extraType =
                        config?.extraType ??
                        config?.ExtraType ??
                        config?.extraId ??
                        config?.ExtraId;
                      const label =
                        extraType === 1
                          ? "Nodal Extra"
                          : extraType === 2
                          ? "University Extra"
                          : extraType === 3
                          ? "Office Extra"
                          : `Extra Type ${extraType}`;
                      return (
                        <div className="merge-modal-row" key={`${extraType}`}>
                          <label>{label}</label>
                          <InputNumber
                            min={0}
                            size="small"
                            value={extraValues?.[extraType] ?? 0}
                            onChange={(value) => {
                              setExtraValues((prev) => ({
                                ...prev,
                                [extraType]: coerceNumber(value, 0),
                              }));
                              setExtraTouched((prev) => ({
                                ...prev,
                                [extraType]: true,
                              }));
                            }}
                            disabled={loadingExtras || loadingExtraEnvelopes}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="merge-modal-panel">
                <div className="merge-modal-panel-header">
                  <span className="merge-modal-panel-title">Post-Merge Module</span>
                </div>
                <Select
                  size="small"
                  mode="multiple"
                  style={{ width: "100%", marginTop: 6 }}
                  placeholder={
                    loadingModules ? "Loading modules..." : "Select modules (optional)"
                  }
                  value={mergeModuleIds}
                  loading={loadingModules}
                  allowClear
                  onChange={(value) => setMergeModuleIds(value)}
                  showSearch
                  optionFilterProp="label"
                  filterOption={filterSelectOption}
                  options={(modules || []).map((m) => ({
                    value: m.id,
                    label: m.name,
                  }))}
                />
              </div>
            </div>

            <div className="merge-modal-col">
              {abcdMismatch && (
                <div className="merge-modal-panel">
                  <div className="merge-modal-panel-header">
                    <span className="merge-modal-panel-title">ABCD Resolution</span>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <Radio.Group
                      className="merge-modal-radio"
                      optionType="button"
                      buttonStyle="solid"
                      value={abcdMode}
                      onChange={(event) => setAbcdMode(event.target.value)}
                    >
                      <Radio.Button value="single">Use one ABCD set</Radio.Button>
                      <Radio.Button value="all">Keep all available ABCD</Radio.Button>
                    </Radio.Group>
                  </div>
                  {abcdMode === "single" && (
                    <div className="abcd-grid">
                      {[
                        { key: "A", label: "Exam" },
                        { key: "B", label: "Subject" },
                        { key: "C", label: "Paper Name" },
                        { key: "D", label: "Paper Code" },
                      ].map((field) => {
                        const options = abcdFieldOptions?.[field.key] || [];
                        if (options.length <= 1) return null;
                        return (
                          <div key={field.key} className="abcd-field">
                            <div className="abcd-label">
                              <span>{field.key}</span>
                              {field.label}
                            </div>
                            <Select
                              size="small"
                              placeholder={`Select ${field.label}`}
                              mode="tags"
                              maxTagCount={1}
                              searchValue={abcdSearchText?.[field.key] || ""}
                              value={
                                abcdSelections?.[field.key]
                                  ? [abcdSelections[field.key]]
                                  : []
                              }
                              onSearch={(value) =>
                                setAbcdSearchText((prev) => ({
                                  ...prev,
                                  [field.key]: value,
                                }))
                              }
                              onBlur={() => {
                                const typed = normalizeText(abcdSearchText?.[field.key]);
                                if (typed) {
                                  setAbcdSelections((prev) => ({
                                    ...prev,
                                    [field.key]: typed,
                                  }));
                                  setAbcdSearchText((prev) => ({
                                    ...prev,
                                    [field.key]: "",
                                  }));
                                }
                              }}
                              onInputKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  const typed = normalizeText(abcdSearchText?.[field.key]);
                                  if (typed) {
                                    setAbcdSelections((prev) => ({
                                      ...prev,
                                      [field.key]: typed,
                                    }));
                                    setAbcdSearchText((prev) => ({
                                      ...prev,
                                      [field.key]: "",
                                    }));
                                  }
                                }
                              }}
                              onChange={(values) => {
                                const nextValue = Array.isArray(values)
                                  ? values[values.length - 1]
                                  : values;
                                setAbcdSelections((prev) => ({
                                  ...prev,
                                  [field.key]: nextValue || "",
                                }));
                                setAbcdSearchText((prev) => ({
                                  ...prev,
                                  [field.key]: "",
                                }));
                              }}
                              tokenSeparators={[","]}
                              options={options.map((value) => ({
                                value,
                                label: value,
                              }))}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {abcdMode === "all" && (
                    <div style={{ marginTop: 6 }}>
                      <div className="abcd-grid">
                        {[
                          { key: "A", label: "Exam" },
                          { key: "B", label: "Subject" },
                          { key: "C", label: "Paper Name" },
                          { key: "D", label: "Paper Code" },
                        ].map((field) => {
                          const options = abcdFieldOptions?.[field.key] || [];
                          if (options.length <= 1) return null;
                          return (
                            <div key={field.key} className="abcd-field">
                              <div className="abcd-label">
                                <span>{field.key}</span>
                                {field.label}
                              </div>
                              <Radio.Group
                                className="merge-modal-radio"
                                optionType="button"
                                buttonStyle="solid"
                                value={abcdSeparators?.[field.key] || "/"}
                                onChange={(event) =>
                                  setAbcdSeparators((prev) => ({
                                    ...prev,
                                    [field.key]: event.target.value,
                                  }))
                                }
                              >
                                <Radio.Button value="/">
                                  {field.key}/{field.key}
                                </Radio.Button>
                                <Radio.Button value="-">
                                  {field.key}-{field.key}
                                </Radio.Button>
                              </Radio.Group>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
});

export default MergeCatchNumbers;
