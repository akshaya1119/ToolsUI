import { useEffect, useMemo, useState } from "react";
import {
  Progress,
  Badge,
  Button,
  Card,
  Table,
  Tag,
  Typography,
  message,
  Checkbox,
  Alert,
  Modal,
  Tabs,
} from "antd";
import { motion } from "framer-motion";
import API from "../hooks/api";
import useStore from "../stores/ProjectData";

const { Text } = Typography;

const url3 = import.meta.env.VITE_API_FILE_URL;

const ProcessingPipeline = () => {
  const [enabledModuleNames, setEnabledModuleNames] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [steps, setSteps] = useState([]);
  const [selectedModules, setSelectedModules] = useState([]);
  const [allModules, setAllModules] = useState([]);
  const [projectConfig, setProjectConfig] = useState(null);
  const [configChanged, setConfigChanged] = useState(false);
  const [changedFieldsInfo, setChangedFieldsInfo] = useState([]);
  const [dependencyModal, setDependencyModal] = useState({ visible: false, unprocessedSteps: [], selectedStep: null });
  const [selectedModuleForDetails, setSelectedModuleForDetails] = useState(null);
  const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
  const [detailViewType, setDetailViewType] = useState("reports"); // "reports" | "templates"
  const [detailGrouping, setDetailGrouping] = useState("lot"); // "lot" | "catch"
  const [selectedItems, setSelectedItems] = useState({}); // { groupName: [itemIds] }
  const projectId = useStore((state) => state.projectId);

  const currentStep = useMemo(
    () =>
      steps.findIndex((s) => s.status === "in-progress") + 1 ||
      steps.filter((s) => s.status === "completed").length,
    [steps]
  );

  const percent = useMemo(
    () =>
      steps.length
        ? (steps.filter((s) => s.status === "completed").length /
          steps.length) *
        100
        : 0,
    [steps]
  );

  const checkReportExistence = async (projectId) => {
    const fileNames = {
      duplicate: "DuplicateTool.xlsx",
      extra: "ExtrasCalculation.xlsx",
      enhancement: "EnhancementReport.xlsx", 
      envelopebreaking: "EnvelopeBreaking.xlsx",
      box: "BoxBreaking.xlsx",
      envelopeSummary: "EnvelopeSummary.xlsx",
      catchSummary: "CatchSummary.xlsx",
      catchOmrSerialing: "CatchWiseBookletAndOmrSerialing.xlsx",
    };

    const results = {};

    await Promise.all(
      Object.entries(fileNames).map(async ([key, fileName]) => {
        try {
          const res = await API.get(
            `/EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${fileName}`
          );
          const exists = res.data.exists;
          results[fileName] = exists;

          if (exists) {
            const fileUrl = `${url3}/${projectId}/${fileName}?DateTime=${new Date().toISOString()}`;
            console.log("Updating step", key, "to completed");
            updateStepStatus(key, {
              status: "completed",
              fileUrl,
              duration: "--:--",
            });
          }
        } catch (err) {
          console.error(`Failed to check file: ${fileName}`, err);
          results[fileName] = false;
        }
      })
    );
  };


  const computeRunOrder = (names = []) => {
    const lowerNames = names.map((n) => String(n).toLowerCase());
    console.log("Module names:", lowerNames);
    const order = [];

    // Real module-based steps — use specific substrings to avoid cross-matching
    if (lowerNames.some((n) => n.includes("duplicate")))
      order.push({ key: "duplicate", title: "Duplicate Processing" });
    if (lowerNames.includes("envelope setup and enhancement"))
      order.push({ key: "enhancement", title: "Enhancement Processing" });
    if (lowerNames.some((n) => n.includes("extra")))
      order.push({ key: "extra", title: "Extra Configuration" });
    // Use exact phrase "envelope breaking" to avoid matching "envelope summary"
    if (lowerNames.some((n) => n.includes("envelope breaking")))
      order.push({ key: "envelopebreaking", title: "Envelope Breaking" });
    if (lowerNames.some((n) => n.includes("box")))
      order.push({ key: "box", title: "Box Breaking" });

    // Summary steps — always run after box breaking (not dependent on module names)
    // Only add if explicitly enabled
    if (lowerNames.some((n) => n.includes("envelope summary")))
      order.push({ key: "envelopeSummary", title: "Envelope Summary" });
    if (lowerNames.some((n) => n.includes("catch summary")))
      order.push({ key: "catchSummary", title: "Catch Summary Report" });
    if (lowerNames.some((n) => n.includes("catchomrserialing") || n.includes("catch omr serialing")))
      order.push({ key: "catchOmrSerialing", title: "Catch OMR Serialing" });

    console.log("Final order:", order);
    return order;
  };
  // Load enabled modules when project changes
  useEffect(() => {
    if (!projectId) {
      setEnabledModuleNames([]);
      setProjectConfig(null);
      return;
    }
    const loadEnabled = async () => {
      try {
        setLoadingModules(true);
        const cfgRes = await API.get(`/ProjectConfigs/${projectId}`);
        const cfg = Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data;

        // Store full config for display
        setProjectConfig(cfg);

        let moduleEntries = cfg?.modules || [];

        // If IDs, map to names
        if (moduleEntries.length && typeof moduleEntries[0] === "number") {
          const modsRes = await API.get(`/Modules`);
          const allMods = modsRes.data || [];
          setAllModules(allMods);
          const idToName = new Map(allMods.map((m) => [m.id, m.name]));
          moduleEntries = moduleEntries
            .sort((a, b) => a - b)                // Sort ascending
            .map((id) => idToName.get(id))       // Map ID to name
            .filter(Boolean);
        } else {
          // If already names, still fetch all modules once for dependency resolution
          const modsRes = await API.get(`/Modules`);
          setAllModules(modsRes.data || []);
        }
        setEnabledModuleNames(moduleEntries || []);
        const order = computeRunOrder(moduleEntries);
        const initialSteps = order.map((o) => ({
          key: o.key,
          title: o.title,
          status: "pending",
          duration: null,
          fileUrl: null,
        }));
        setSteps(initialSteps);
        setSelectedModules([]);
        await checkReportExistence(projectId);
      } catch (err) {
        console.error("Failed to load enabled modules", err);
        setEnabledModuleNames([]);
        setSteps([]);
        setProjectConfig(null);
      } finally {
        setLoadingModules(false);
      }
    };

    loadEnabled();
  }, [projectId]);

  // Listen for configuration changes from sessionStorage
  useEffect(() => {
    const configChangeData = sessionStorage.getItem("configChangeData");
    if (configChangeData) {
      try {
        const data = JSON.parse(configChangeData);
        if (data.projectId === projectId && data.affectedReports) {
          // Auto-select the affected reports
          setSelectedModules(data.affectedReports);
          setConfigChanged(true);
          setChangedFieldsInfo(data.changedModules || []);

          // Clear the sessionStorage
          sessionStorage.removeItem("configChangeData");

          message.info(`${data.affectedReports.length} report(s) selected for re-processing`);
        }
      } catch (err) {
        console.error("Failed to parse config change data", err);
      }
    }
  }, [projectId]);

  // Run order helper

  const runDuplicate = async (projectId) => {
    const queryParams = {
      ProjectId: projectId,
    };
    const query = new URLSearchParams(queryParams).toString();
    const res = await API.post(`/Duplicate?${query}`);
    const data = res?.data || {};
    const duplicatesRemoved = data.mergedRows ?? data.mergedRows ?? 0;
    message.success(`Duplicate processing completed. Duplicates removed: ${duplicatesRemoved}`);
  };

  const runEnhancement = async (projectId) => {
    const res = await API.post(`/Duplicate/Enhancement?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Enhancement processing completed");
  };

  const runExtras = async (projectId) => {
    const res = await API.post(`/ExtraEnvelopes?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Extras calculation completed");
  };

  const runEnvelope = async (projectId) => {
    const res = await API.post(`/EnvelopeBreakages/EnvelopeConfiguration?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Envelope breaking completed");
  };

  const runBoxBreaking = async (projectId) => {
    const res = await API.post(`/BoxBreakingProcessing/ProcessBoxBreaking?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Box breaking completed");
  };

  const runCatchSummary = async (projectId) => {
    const res = await API.get(`/EnvelopeBreakages/CatchEnvelopeSummaryWithExtras?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Box breaking completed");
  };

  const runEnvelopeSummary = async (projectId) => {
    const res = await API.get(`/EnvelopeBreakages/EnvelopeSummaryReport?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Box breaking completed");
  };

  const runCatchOmrSerialing = async (projectId) => {
    const res = await API.get(`/EnvelopeBreakageProcessing/CatchWithOmrSerialing?ProjectId=${projectId}`);
    message.success(res?.data?.message || "Catch OMR Serialing completed");
  };


  const updateStepStatus = (key, patch) => {
    setSteps((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  };

  const handleModuleSelection = (moduleKey, checked) => {
    if (!checked) {
      setSelectedModules((prev) => prev.filter((key) => key !== moduleKey));
      return;
    }

    // --- RECURSIVE DEPENDENCY RESOLUTION ---
    const getRecursiveAncestors = (key, memo = new Set()) => {
      if (memo.has(key)) return memo;
      memo.add(key);

      const moduleKeyToNameMap = {
        duplicate: "Duplicate Tool",
        enhancement: "Envelope Setup and Enhancement",
        extra: "Extra Configuration",
        envelopebreaking: "Envelope Breaking",
        box: "Box Breaking",
        envelopeSummary: "Envelope Summary",
        catchSummary: "Catch Summary Report",
        catchOmrSerialing: "Catchomrserialingreport",
      };

      const name = moduleKeyToNameMap[key];
      if (!name) return memo;

      const module = allModules.find(m => m.name.toLowerCase() === name.toLowerCase());
      if (!module) return memo;

      const parentIds = module.parentModuleIds || (module.parentModuleId ? [module.parentModuleId] : []);
      
      parentIds.forEach(pid => {
        const parent = allModules.find(m => m.id === pid);
        if (parent) {
          // Map parent name back to key
          const parentKey = Object.keys(moduleKeyToNameMap).find(
            k => moduleKeyToNameMap[k].toLowerCase() === parent.name.toLowerCase()
          );
          if (parentKey) {
            getRecursiveAncestors(parentKey, memo);
          }
        }
      });

      return memo;
    };

    const ancestors = Array.from(getRecursiveAncestors(moduleKey));
    
    setSelectedModules((prev) => {
      // Filter ancestors to only include those NOT completed (except the clicked one)
      const keysToSelect = ancestors.filter(key => {
        const step = steps.find(s => s.key === key);
        return (step && step.status !== "completed") || key === moduleKey;
      });

      // Merge with existing selections
      return Array.from(new Set([...prev, ...keysToSelect]));
    });
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedModules(steps.map((s) => s.key));
    } else {
      setSelectedModules([]);
    }
  };

  const getConfigForModule = (moduleKey) => {
    if (!projectConfig) return null;

    const getNames = (criteria) => {
      if (!criteria) return ["Not configured"]; // return as array
      if (Array.isArray(criteria)) return criteria.map(String);
      if (criteria.names && Array.isArray(criteria.names)) return criteria.names.map(String);
      return [String(criteria)];
    };

    const configMap = {
      duplicate: {
        value: [`Duplicate Remove: ${getNames(projectConfig.duplicateCriteria).join(", ")}`],
      },
      enhancement: {
        value: projectConfig.enhancement
          ? [`Enhancement: ${projectConfig.enhancement}`]
          : ["Not configured"],
      },
      extra: {
        value: ["Not configured"],
      },
      envelopebreaking: {
        value: [`Sorting: ${getNames(projectConfig.envelopeMakingCriteria)}`],
      },
      box: {
        value: [
          `Box Breaking: ${getNames(projectConfig.boxBreakingCriteria).join(", ")}`,
          `Sorting: ${getNames(projectConfig.sortingBoxReport).join(", ")}`,
          `Duplicate Removal: ${getNames(projectConfig.duplicateRemoveFields).join(", ")}`,
        ],
      },
      envelopeSummary: {
        value: ["Summary Report"],
      },
      catchSummary: {
        value: ["Summary Report"],
      },
      catchOmrSerialing: {
        value: ["Catch Wise Booklet & OMR Serialing"],
      },
    };

    return configMap[moduleKey];
  };

  const handleAudit = async () => {
    if (!projectId) {
      message.warning("Please select a project");
      return;
    }

    if (selectedModules.length === 0) {
      message.warning("Please select at least one module to run");
      return;
    }

    const allOrder = computeRunOrder(enabledModuleNames);

    // Check for unprocessed dependencies
    const selectedIndices = selectedModules.map(key => allOrder.findIndex(s => s.key === key));
    const maxSelectedIndex = Math.max(...selectedIndices);

    const unprocessedSteps = [];
    for (let i = 0; i < maxSelectedIndex; i++) {
      const stepKey = allOrder[i].key;
      const isSelected = selectedModules.includes(stepKey);
      const isCompleted = steps.find(s => s.key === stepKey)?.status === "completed";

      if (!isSelected && !isCompleted) {
        unprocessedSteps.push(allOrder[i]);
      }
    }

    // If there are unprocessed dependencies, show modal
    if (unprocessedSteps.length > 0) {
      setDependencyModal({
        visible: true,
        unprocessedSteps,
        selectedStep: selectedModules[selectedModules.length - 1],
      });
      return;
    }

    // Proceed with processing
    await processModules(selectedModules);
  };

  const processModules = async (modulesToProcess) => {
    const allOrder = computeRunOrder(enabledModuleNames);
    const initialSteps = allOrder.map((o) => ({
      key: o.key,
      title: o.title,
      status: "pending",
      duration: null,
      fileUrl: null,
    }));
    setSteps(initialSteps);
    setIsProcessing(true);
    const stepTimers = new Map();
    const completedSteps = new Set();
    const fileNames = {
      duplicate: "DuplicateTool.xlsx",
      extra: "ExtrasCalculation.xlsx",
      enhancement: "EnhancementProcessing.xlsx",
      envelope: "EnvelopeBreaking.xlsx",
      box: "BoxBreaking.xlsx",
      envelopeSummary: "EnvelopeSummary.xlsx",
      catchSummary: "CatchSummary.xlsx",
      catchOmrSerialing: "CatchWiseBookletAndOmrSerialing.xlsx",
    };

    try {
      for (const step of allOrder) {
        // If this step is not selected, skip it
        if (!modulesToProcess.includes(step.key)) {
          continue;
        }

        // Check if all previous steps (in the sequence) are either completed or not selected
        const stepIndex = allOrder.findIndex((s) => s.key === step.key);
        let canRun = true;

        if (stepIndex > 0) {
          for (let i = 0; i < stepIndex; i++) {
            const prevStepKey = allOrder[i].key;
            const isPrevSelected = modulesToProcess.includes(prevStepKey);
            const isPrevCompleted = completedSteps.has(prevStepKey);

            // If previous step is selected but not completed, we can't run this step
            if (isPrevSelected && !isPrevCompleted) {
              canRun = false;
              break;
            }
          }
        }

        // If previous steps not completed, stop here
        if (!canRun) {
          message.warning(`Cannot run ${step.title}. Previous steps must be completed first.`);
          break;
        }

        // Check if report already exists
        const fileName = fileNames[step.key];
        let reportExists = false;

        if (fileName) {
          try {
            const res = await API.get(
              `/EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${fileName}`
            );
            reportExists = res.data.exists;
          } catch (err) {
            console.error(`Failed to check file existence: ${fileName}`, err);
          }
        }

        // If report already exists, mark as completed and skip processing
        if (reportExists) {
          const fileUrl = `${url3}/${projectId}/${fileName}?DateTime=${new Date().toISOString()}`;
          updateStepStatus(step.key, {
            status: "completed",
            fileUrl,
            duration: "00:00",
          });
          completedSteps.add(step.key);
          continue;
        }

        // Process the step
        updateStepStatus(step.key, { status: "in-progress" });
        stepTimers.set(step.key, Date.now());

        try {
          if (step.key === "duplicate") await runDuplicate(projectId);
          else if (step.key === "enhancement") await runEnhancement(projectId);
          else if (step.key === "extra") await runExtras(projectId);
          else if (step.key === "envelopebreaking") await runEnvelope(projectId);
          else if (step.key === "box") await runBoxBreaking(projectId);
          else if (step.key === "envelopeSummary") await runEnvelopeSummary(projectId);
          else if (step.key === "catchSummary") await runCatchSummary(projectId);
          else if (step.key === "catchOmrSerialing") await runCatchOmrSerialing(projectId);

          const durationMs = Date.now() - (stepTimers.get(step.key) || Date.now());
          const mm = String(Math.floor(durationMs / 60000)).padStart(2, "0");
          const ss = String(Math.floor((durationMs % 60000) / 1000)).padStart(2, "0");
          updateStepStatus(step.key, {
            status: "completed",
            duration: `${mm}:${ss}`,
            fileUrl: null,
          });
          completedSteps.add(step.key);
        } catch (stepErr) {
          console.error(`Step ${step.key} failed`, stepErr);
          updateStepStatus(step.key, { status: "failed" });
          throw stepErr;
        }
      }
      await checkReportExistence(projectId);
      message.success("Data processing completed");

      // Clear selections and close alert after successful processing
      setSelectedModules([]);
      setConfigChanged(false);
    } catch (err) {
      console.error("Processing failed", err);
      message.error(err?.response?.data?.message || err?.message || "Processing failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDependencyModalOk = (includeDependent) => {
    setDependencyModal({ visible: false, unprocessedSteps: [], selectedStep: null });

    if (includeDependent) {
      // Add unprocessed steps to selected modules
      const allOrder = computeRunOrder(enabledModuleNames);
      const selectedStep = dependencyModal.selectedStep;
      const selectedIndex = allOrder.findIndex(s => s.key === selectedStep);

      const modulesToAdd = [];
      for (let i = 0; i < selectedIndex; i++) {
        const stepKey = allOrder[i].key;
        const isCompleted = steps.find(s => s.key === stepKey)?.status === "completed";

        if (!isCompleted && !selectedModules.includes(stepKey)) {
          modulesToAdd.push(stepKey);
        }
      }

      const newSelectedModules = [...selectedModules, ...modulesToAdd];
      setSelectedModules(newSelectedModules);

      // Process all modules including dependencies
      processModules(newSelectedModules);
    } else {
      // Process only the selected module
      processModules(selectedModules);
    }
  };

  // Build table data
  const data = steps.map((step) => {
    const moduleName = enabledModuleNames.find((name) => {
      const normalized = String(name).toLowerCase();
      // Exact matching for summary steps
      if (step.key === "envelopeSummary") return normalized.includes("envelope summary");
      if (step.key === "catchSummary") return normalized.includes("catch summary");
      // For other steps, use the key
      return normalized.includes(step.key);
    }) || step.title;

    return {
      key: step.key,
      moduleName: moduleName,
      status: step.status || "pending",
      report: step.fileUrl,
    };
  });

  const columns = [
    {
      title: () => (
        <Checkbox
          checked={selectedModules.length === steps.length && steps.length > 0}
          indeterminate={selectedModules.length > 0 && selectedModules.length < steps.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          disabled={isProcessing || steps.length === 0}
        >
          Select
        </Checkbox>
      ),
      dataIndex: "select",
      key: "select",
      width: 100,
      render: (_, record) => {
        let disabled = isProcessing;

        return (
          <Checkbox
            checked={selectedModules.includes(record.key)}
            onChange={(e) => handleModuleSelection(record.key, e.target.checked)}
            disabled={disabled}
          />
        );
      },
    },
    {
      title: "Module Name",
      dataIndex: "moduleName",
      key: "moduleName",
      render: (text) => <b>{text}</b>,
    },
    {
      title: "Configuration",
      dataIndex: "configuration",
      key: "configuration",
      render: (_, record) => {
        const config = getConfigForModule(record.key);
        if (!config) return <Text type="secondary">—</Text>;

        // For box breaking and duplicate, show each item on new line; for others, join on one line
        const isMultiLine = (record.key === "box" || record.key === "duplicate") && Array.isArray(config.value) && config.value.length > 1;

        return (
          <div style={{ fontSize: "12px" }}>
            {isMultiLine ? (
              config.value.map((item, idx) => (
                <div key={idx} style={{ color: "#666", marginBottom: idx < config.value.length - 1 ? 8 : 0 }}>
                  {item}
                </div>
              ))
            ) : (
              <div style={{ color: "#666" }}>
                {Array.isArray(config.value) ? config.value.join(", ") : config.value}
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: "Status",
      dataIndex: "status",
      key: "status",
      render: (status) => {
        const colorMap = {
          completed: "green",
          "in-progress": "blue",
          failed: "red",
          pending: "orange",
          skipped: "default",
        };
        return <Tag color={colorMap[status] || "default"}>{status}</Tag>;
      },
    },
    {
      title: "Report",
      dataIndex: "report",
      key: "report",
      render: (url) =>
        url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
            Download
          </a>
        ) : (
          <Text type="secondary">—</Text>
        ),
    },
    // {
    //   title: "Actions",
    //   key: "actions",
    //   width: 120,
    //   render: (_, record) => {
    //     const hasData = record.report || record.status === "completed";
    //     return 
    //   },
    // },
  ];

  // Check if module has data
  const moduleHasData = (record) => {
    return record.report || record.status === "completed";
  };

  // Handle opening detail panel
  const handleOpenDetailPanel = (record) => {
    if (!moduleHasData(record)) return;
    
    setSelectedModuleForDetails(record);
    setIsDetailPanelOpen(true);
    
    // Initialize all items as selected by default
    const mockLotData = {
      "LOT-001": [
        { id: "lot1-1", name: "report1.pdf", url: "#" },
        { id: "lot1-2", name: "report2.pdf", url: "#" },
      ],
      "LOT-002": [
        { id: "lot2-1", name: "report3.pdf", url: "#" },
      ],
    };

    const mockCatchData = {
      "CATCH-A": [
        { id: "catch-a-1", name: "report1.pdf", url: "#" },
      ],
      "CATCH-B": [
        { id: "catch-b-1", name: "report2.pdf", url: "#" },
      ],
    };

    const dataToUse = detailGrouping === "lot" ? mockLotData : mockCatchData;
    
    // Select all items by default
    const initialSelection = {};
    Object.entries(dataToUse).forEach(([groupName, items]) => {
      initialSelection[groupName] = items.map(item => item.id);
    });
    setSelectedItems(initialSelection);
  };

  // Handle closing detail panel
  const handleCloseDetailPanel = () => {
    setIsDetailPanelOpen(false);
    setSelectedModuleForDetails(null);
    setSelectedItems({});
  };

  // Handle row click
  const handleRowClick = (record) => {
    if (moduleHasData(record)) {
      handleOpenDetailPanel(record);
    }
  };

  // Handle item selection
  const handleItemToggle = (groupName, itemId) => {
    setSelectedItems(prev => {
      const groupItems = prev[groupName] || [];
      const isSelected = groupItems.includes(itemId);
      
      return {
        ...prev,
        [groupName]: isSelected
          ? groupItems.filter(id => id !== itemId)
          : [...groupItems, itemId]
      };
    });
  };

  // Handle group selection
  const handleGroupToggle = (groupName, allItemIds) => {
    setSelectedItems(prev => {
      const groupItems = prev[groupName] || [];
      const allSelected = allItemIds.every(id => groupItems.includes(id));
      
      return {
        ...prev,
        [groupName]: allSelected ? [] : allItemIds
      };
    });
  };

  // Get total selected count
  const getTotalSelectedCount = () => {
    return Object.values(selectedItems).reduce((sum, items) => sum + items.length, 0);
  };

  // Render detail panel content
  const renderDetailPanel = () => {
      if (!selectedModuleForDetails) {
        return (
          <div style={{ 
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center", 
            height: "100%",
            color: "#999",
            fontSize: "14px"
          }}>
            Select a module to view details
          </div>
        );
      }

      const { moduleName, status, key: moduleKey } = selectedModuleForDetails;
      const config = getConfigForModule(moduleKey);

      // Mock data structure - replace with actual API data when available
      const mockLotData = {
        "LOT-001": [
          { id: "lot1-1", name: "report1.pdf", url: "#" },
          { id: "lot1-2", name: "report2.pdf", url: "#" },
        ],
        "LOT-002": [
          { id: "lot2-1", name: "report3.pdf", url: "#" },
        ],
      };

      const mockCatchData = {
        "CATCH-A": [
          { id: "catch-a-1", name: "report1.pdf", url: "#" },
        ],
        "CATCH-B": [
          { id: "catch-b-1", name: "report2.pdf", url: "#" },
        ],
      };

      const dataToDisplay = detailGrouping === "lot" ? mockLotData : mockCatchData;
      const totalSelected = getTotalSelectedCount();

      // Render data list with grouping
      const renderDataList = () => (
        <div style={{ 
          flex: 1, 
          overflowY: "auto", 
          padding: "16px"
        }}>
          {Object.entries(dataToDisplay).map(([groupName, items]) => {
            const groupItemIds = items.map(item => item.id);
            const groupSelectedItems = selectedItems[groupName] || [];
            const allSelected = groupItemIds.every(id => groupSelectedItems.includes(id));
            const someSelected = groupSelectedItems.length > 0 && !allSelected;

            return (
              <div key={groupName} style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <Checkbox
                    checked={allSelected}
                    indeterminate={someSelected}
                    onChange={() => handleGroupToggle(groupName, groupItemIds)}
                  />
                  <Text strong style={{ fontSize: "13px" }}>
                    {groupName}
                  </Text>
                </div>
                <div style={{ paddingLeft: 32 }}>
                  {items.map((item, idx) => {
                    const isSelected = groupSelectedItems.includes(item.id);
                    return (
                      <div key={item.id} style={{ 
                        display: "flex", 
                        alignItems: "center", 
                        justifyContent: "space-between",
                        padding: "6px 0",
                        borderBottom: idx < items.length - 1 ? "1px solid #f5f5f5" : "none"
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleItemToggle(groupName, item.id)}
                          />
                          <Text style={{ fontSize: "12px" }}>{item.name}</Text>
                        </div>
                        <Button type="link" size="small" style={{ fontSize: "12px" }}>
                          Download
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      );

      // Tab items for Reports and Templates
      const tabItems = [
        {
          key: "reports",
          label: "Reports",
          children: (
            <div style={{ display: "flex",flexDirection: "column", height: "100%" }}>
              {/* Grouping Toggle */}
              <div 
  style={{ 
    padding: "12px 16px", 
    borderBottom: "1px solid #f0f0f0",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center"
  }}
>
  <Button.Group size="small">
    <Button
      type={detailGrouping === "lot" ? "primary" : "default"}
      onClick={() => setDetailGrouping("lot")}
    >
      Lot-wise
    </Button>
    <Button
      type={detailGrouping === "catch" ? "primary" : "default"}
      onClick={() => setDetailGrouping("catch")}
    >
      Catch-wise
    </Button>
  </Button.Group>

  <Button size="small" type="primary">
    Generate All
  </Button>
</div>

              {/* Action Buttons */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  
                  <Button size="small">Download All</Button>
                  <Button size="small" disabled={totalSelected === 0}>
                    Download Selected ({totalSelected})
                  </Button>
                </div>
              </div>

              {/* Data List */}
              {renderDataList()}
            </div>
          ),
        },
        {
          key: "templates",
          label: "Templates",
          children: (
            <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
              {/* Grouping Toggle */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <Button.Group size="small">
                  <Button
                    type={detailGrouping === "lot" ? "primary" : "default"}
                    onClick={() => setDetailGrouping("lot")}
                  >
                    Lot-wise
                  </Button>
                  <Button
                    type={detailGrouping === "catch" ? "primary" : "default"}
                    onClick={() => setDetailGrouping("catch")}
                  >
                    Catch-wise
                  </Button>
                </Button.Group>
              </div>

              {/* Action Buttons */}
              <div style={{ padding: "12px 16px", borderBottom: "1px solid #f0f0f0" }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <Button size="small" type="primary">Generate All</Button>
                  <Button size="small">Download All</Button>
                  <Button size="small" disabled={totalSelected === 0}>
                    Download Selected ({totalSelected})
                  </Button>
                </div>
              </div>

              {/* Data List */}
              {renderDataList()}
            </div>
          ),
        },
      ];

      return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
          {/* Header */}
<div style={{ 
  padding: "12px 16px", 
  borderBottom: "1px solid #f0f0f0",
  backgroundColor: "#fafafa",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center"
}}>
  <Text strong style={{ fontSize: "14px" }}>
    {moduleName} Details
  </Text>

  <Button 
    type="text" 
    size="small" 
    onClick={handleCloseDetailPanel}
  >
    ✕
  </Button>
</div>

          {/* Tabs for Reports/Templates */}
          <Tabs
            activeKey={detailViewType}
            onChange={setDetailViewType}
            items={tabItems}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            tabBarStyle={{ margin: 0, paddingLeft: 16, paddingRight: 16 }}
          />
        </div>
      );
    }

  return (
    <div className="p-4">
      {configChanged && (
        <Alert
          message="Configuration Updated"
          description={`The following settings have changed: ${changedFieldsInfo.join(", ")}. Please re-run the reports to ensure accuracy.`}
          type="warning"
          showIcon
          closable
          onClose={() => setConfigChanged(false)}
          style={{ marginBottom: 16 }}
        />
      )}

      <div className="flex justify-between items-center mb-4">
        <Typography.Title level={3} style={{ marginBottom: 24 }}>
          Project Configuration
        </Typography.Title>
        <div className="text-sm flex items-center gap-2">
          <span>Status:</span>
          {isProcessing ? (
            <Badge status="processing" text="Processing" color="blue" />
          ) : (
            <Badge status="default" text="Idle" color="gray" />
          )}
          <Button type="primary" onClick={handleAudit} disabled={!projectId || isProcessing || selectedModules.length === 0}>
            Start {selectedModules.length > 0 && `(${selectedModules.length} selected)`}
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <p className="text-sm font-medium mb-1">Overall Progress</p>
        <Progress percent={percent} showInfo={false} />
        <div className="text-right text-sm mt-1">
          Step {Math.max(currentStep, 0)} of {Math.max(steps.length, 0)}
        </div>
      </div>

      {/* Split Layout */}
      <div style={{ display: "flex", gap: 16, transition: "all 0.3s ease" }}>
        {/* Left Side - Table */}
        <motion.div 
          style={{ flex: isDetailPanelOpen ? "0 0 70%" : "1" }}
          animate={{ flex: isDetailPanelOpen ? "0 0 70%" : "1" }}
          transition={{ duration: 0.3 }}
        >
          <Card
            size="small"
            title="Enabled Modules Status & Reports"
            style={{
              marginBottom: 12,
              border: "1px solid #d9d9d9",
              boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
            }}
          >
            {enabledModuleNames.length === 0 ? (
              <p>No modules selected for this project</p>
            ) : (
              <Table
                columns={columns}
                dataSource={data}
                pagination={false}
                loading={loadingModules}
                rowKey="key"
                onRow={(record) => ({
                  onClick: () => handleRowClick(record),
                  style: { 
                    cursor: moduleHasData(record) ? "pointer" : "default"
                  },
                  onMouseEnter: (e) => {
                    if (moduleHasData(record)) {
                      e.currentTarget.style.backgroundColor = "#f5f5f5";
                    }
                  },
                  onMouseLeave: (e) => {
                    e.currentTarget.style.backgroundColor = "";
                  }
                })}
              />
            )}
          </Card>
        </motion.div>

        {/* Right Side - Detail Panel */}
        {isDetailPanelOpen && (
          <motion.div 
            style={{ flex: "0 0 30%" }}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.3 }}
          >
            <Card
              size="small"
              title="Detail View"
              style={{
                height: "calc(100vh - 220px)",
                border: "1px solid #d9d9d9",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
              }}
              bodyStyle={{ padding: 0, height: "calc(100% - 48px)", overflow: "hidden" }}
            >
              {renderDetailPanel()}
            </Card>
          </motion.div>
        )}
      </div>

      <Modal
        title="Unprocessed Dependencies Detected"
        open={dependencyModal.visible}
        onCancel={() => setDependencyModal({ visible: false, unprocessedSteps: [], selectedStep: null })}
        footer={[
          // <Button key="skip" onClick={() => handleDependencyModalOk(false)}>
          //   Process Only Selected
          // </Button>,
          <Button key="include" type="primary" onClick={() => handleDependencyModalOk(true)}>
            Process All Dependencies
          </Button>,
        ]}
      >
        <p style={{ marginBottom: 16 }}>
          The following reports have not been processed yet and are required before running your selected module:
        </p>
        <ul style={{ marginBottom: 16 }}>
          {dependencyModal.unprocessedSteps.map((step) => (
            <li key={step.key}>{step.title}</li>
          ))}
        </ul>
        <p>
          <strong>What would you like to do?</strong>
        </p>
        <ul style={{ marginLeft: 20 }}>
          <li><strong>Process Only Selected:</strong> Run only your selected module (may fail if dependencies are missing)</li>
          <li><strong>Process All Dependencies:</strong> Run all unprocessed dependencies first, then your selected module</li>
        </ul>
      </Modal>
    </div>
  );
};

export default ProcessingPipeline;
