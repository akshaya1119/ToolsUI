import { useEffect, useMemo, useState } from "react";
import {
  Progress,
  Badge,
  Button,
  Card,
  Form,
  Input,
  Table,
  Tag,
  Typography,
  message,
  Checkbox,
  Alert,
  Modal,
  Space,
  Tabs,
} from "antd";
import { motion } from "framer-motion";
import axios from "axios";
import API from "../hooks/api";
import useStore from "../stores/ProjectData";
import { buildReportFileName, getErrorMessageAsync, parseMappingJson, retryAsync, getErrorDetails } from "../utils/rptTemplateUtils";
import EnvLotReportsManager from "./EnvLotReportsManager";

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
  const [extraConfigData, setExtraConfigData] = useState([]);
  const [configChanged, setConfigChanged] = useState(false);
  const [changedFieldsInfo, setChangedFieldsInfo] = useState([]);
  const [dependencyModal, setDependencyModal] = useState({ visible: false, unprocessedSteps: [], selectedStep: null });
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [templateOptions, setTemplateOptions] = useState([]);
  const [templatePanel, setTemplatePanel] = useState({ open: false, moduleKey: null });
  const [templateDownloads, setTemplateDownloads] = useState({});
  const [generatingTemplates, setGeneratingTemplates] = useState({});
  const [templateReportStatus, setTemplateReportStatus] = useState({});
  const [bulkGenerating, setBulkGenerating] = useState(false);
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [mappingUpdateMap, setMappingUpdateMap] = useState({});
  const [staleTemplateIds, setStaleTemplateIds] = useState(new Set());
  const [lotWisePanel, setLotWisePanel] = useState({ open: false, moduleKey: null });
  const [availableLots, setAvailableLots] = useState([]);
  const [selectedLotTab, setSelectedLotTab] = useState(null);
  const [loadingLots, setLoadingLots] = useState(false);
  const [generatingLotTemplates, setGeneratingLotTemplates] = useState({});
  const [downloadingLotTemplates, setDownloadingLotTemplates] = useState({});
  const [lotTemplateStatus, setLotTemplateStatus] = useState({});
  const [staleLotIds, setStaleLotIds] = useState(new Set());
  const [bulkGeneratingLots, setBulkGeneratingLots] = useState(false);
  const [bulkDownloadingLots, setBulkDownloadingLots] = useState(false);
  const [generatingLotReport, setGeneratingLotReport] = useState({});
  const [staticVarModal, setStaticVarModal] = useState({ open: false, template: null, variables: {}, values: {}, resolve: null });
  const [lotSelectionModal, setLotSelectionModal] = useState({
    visible: false,
    availableLots: [],
    selectedLots: [],
    loading: false,
    resolve: null
  });
  const [envLotSelectionModal, setEnvLotSelectionModal] = useState({
    visible: false,
    availableEnvLots: [],
    selectedEnvLots: [],
    loading: false,
    resolve: null
  });
  const [envLotSearch, setEnvLotSearch] = useState("");
  const [existingReportModal, setExistingReportModal] = useState({
    visible: false,
    report: null,
    resolve: null
  });
  const [lotReportStatus, setLotReportStatus] = useState({});
  const [envLotReports, setEnvLotReports] = useState([]); // Store generated envelope lot reports
  const [expandedReportsTemplates, setExpandedReportsTemplates] = useState(new Set()); // Track which templates have expanded reports
  const [errorDetailsModal, setErrorDetailsModal] = useState({ visible: false, error: null, retryFn: null, templateId: null });
  const projectId = useStore((state) => state.projectId);
  const projectName = useStore((state) => state.projectName);
  const storedGroupId = localStorage.getItem("selectedGroup");
  const storedTypeId = localStorage.getItem("selectedType");
  const groupId = storedGroupId ? Number(storedGroupId) : null;
  const typeId = storedTypeId ? Number(storedTypeId) : null;

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

  const rptApiUrl = import.meta.env.VITE_RPT_API_URL;
  const mappingUpdateKey = "rptTemplateMappingUpdatedAt";

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
          // For box breaking, check if any lot-specific file exists
          if (key === "box") {
            try {
              const lots = await fetchLotsForSelection();
              if (lots && lots.length > 0) {
                // Check if at least one lot has a box breaking report
                const lotResults = await Promise.all(
                  lots.map(async (lot) => {
                    try {
                      const lotFileName = `BoxBreaking_${lot.lotNo}.xlsx`;
                      const res = await API.get(
                        `/EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${lotFileName}`
                      );
                      return res.data.exists;
                    } catch (err) {
                      return false;
                    }
                  })
                );
                const exists = lotResults.some(result => result);
                results[fileName] = exists;
                
                if (exists) {
                  console.log("Updating step", key, "to completed");
                  updateStepStatus(key, {
                    status: "completed",
                    fileUrl: null,
                    duration: "--:--",
                  });
                }
              }
            } catch (err) {
              console.error(`Failed to check lot files for box breaking`, err);
              results[fileName] = false;
            }
          } else {
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
          }
        } catch (err) {
          console.error(`Failed to check file: ${fileName}`, err);
          results[fileName] = false;
        }
      })
    );
  };

  const fetchTemplates = async () => {
    if (!groupId || !typeId || !projectId) {
      setTemplateOptions([]);
      return;
    }
    setTemplatesLoading(true);
    try {
      const res = await API.get("/RPTTemplates/by-group", {
        params: {
          groupId,
          typeId,
          projectId,
        },
      });
      setTemplateOptions(
        (res.data || []).filter((t) => t.hasMapping !== false && !t.isDeleted)
      );
    } catch (err) {
      console.error("Failed to fetch templates", err);
      message.error("Failed to load templates for this project.");
    } finally {
      setTemplatesLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchTemplates();
    } else {
      setTemplateOptions([]);
    }
  }, [projectId, groupId, typeId]);

  useEffect(() => {
    setTemplatePanel({ open: false, moduleKey: null });
    setTemplateDownloads({});
    setGeneratingTemplates({});
    setTemplateReportStatus({});
    setStaleTemplateIds(new Set());
    // Clear envelope lot reports when project changes but don't clear if projectId is null (initial load)
    if (projectId) {
      setEnvLotReports([]);
    }
  }, [projectId]);

  // Cleanup blob URLs when component unmounts
  useEffect(() => {
    return () => {
      envLotReports.forEach(report => {
        if (report.url) {
          window.URL.revokeObjectURL(report.url);
        }
      });
    };
  }, []);

  // Load envelope lot reports from API on component mount
  useEffect(() => {
    const loadEnvLotReports = async () => {
      if (!projectId) {
        console.log('No projectId, skipping load');
        return;
      }
      
      try {
        console.log('Loading envelope lot reports for project:', projectId);
        
        const response = await API.get(`/EnvelopeLotReports/ByProject/${projectId}`);
        console.log('Raw API response:', response);
        console.log('Response data:', response.data);
        const reports = response.data || [];
        
        if (reports.length === 0) {
          console.log('No reports found in database for project', projectId);
          setEnvLotReports([]);
          return;
        }
        
        // Transform API data to match our component format
        const transformedReports = reports.map((report, index) => {
          console.log(`Transforming report ${index}:`, report);
          return {
            id: `${report.templateId}_${report.envLotNumbers}_${report.id}`,
            templateId: report.templateId,
            templateName: report.templateName,
            envLotNumbers: report.envLotNumbers.split(',').map(num => parseInt(num.trim())),
            envLotKey: report.envLotNumbers,
            fileName: report.fileName,
            generatedAt: report.generatedAt,
            generatedBy: report.generatedBy,
            filePath: report.filePath, // Include the server file path
            url: null, // Will be set when downloading
            dbId: report.id // Store the database ID for deletion
          };
        });
        
        console.log('Transformed reports:', transformedReports);
        setEnvLotReports(transformedReports);
      } catch (err) {
        console.error("Failed to load envelope lot reports from API", err);
        console.error("Error details:", err.response?.data);
        console.error("Error status:", err.response?.status);
        console.error("Error config:", err.config);
        setEnvLotReports([]);
      }
    };

    loadEnvLotReports();
  }, [projectId]);

  // Remove localStorage save effect since we're using API now

  const loadMappingUpdates = () => {
    try {
      const raw = localStorage.getItem(mappingUpdateKey);
      const parsed = raw ? JSON.parse(raw) : {};
      setMappingUpdateMap(parsed && typeof parsed === "object" ? parsed : {});
    } catch (err) {
      setMappingUpdateMap({});
    }
  };

  const clearMappingUpdate = (templateId) => {
    if (!templateId) return;
    try {
      const raw = localStorage.getItem(mappingUpdateKey);
      const parsed = raw ? JSON.parse(raw) : {};
      if (parsed && typeof parsed === "object" && templateId in parsed) {
        const next = { ...parsed };
        delete next[templateId];
        localStorage.setItem(mappingUpdateKey, JSON.stringify(next));
        setMappingUpdateMap(next);
      }
    } catch (err) {
      // ignore storage cleanup errors
    }
  };

  const getMappingUpdateTime = (templateId) => mappingUpdateMap?.[templateId] || null;

  const isMappingNewerThanReport = (templateId) => {
    if (!templateId) return false;
    const updatedAt = getMappingUpdateTime(templateId);
    if (!updatedAt) return false;
    const updatedTime = Date.parse(updatedAt);
    if (!Number.isFinite(updatedTime)) return true;
    const generatedAt = templateReportStatus[templateId]?.generatedAt;
    if (!generatedAt) return true;
    const generatedTime = Date.parse(generatedAt);
    if (!Number.isFinite(generatedTime)) return true;
    return updatedTime > generatedTime;
  };

  useEffect(() => {
    loadMappingUpdates();
  }, [projectId]);

  useEffect(() => {
    const handleStorage = (event) => {
      if (event?.key === mappingUpdateKey) {
        loadMappingUpdates();
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

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

        // Fetch Extra Configuration
        const extrasRes = await API.get(`/ExtrasConfigurations/ByProject/${projectId}`).catch(() => ({ data: [] }));
        setExtraConfigData(Array.isArray(extrasRes.data) ? extrasRes.data : []);

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

  const runBoxBreaking = async (projectId, lotNumbers = null) => {
    const payload = lotNumbers && lotNumbers.length > 0 ? lotNumbers : [];
    const res = await API.post(`/BoxBreakingProcessing/ProcessBoxBreaking?ProjectId=${projectId}`, payload);
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

  const fetchLotsForSelection = async () => {
    try {
      // Use the endpoint provided by user
      const res = await API.get(`/NRDataLots/GetByProjectId/${projectId}`);
      const allData = res.data || [];
      
      // Group by lot and count catches manually, ensuring strict uniqueness
      const lotMap = new Map();
      allData.forEach(item => {
        const lotNumber = item.lotNo ?? item.LotNo;
        const catchNo = item.catchNo ?? item.CatchNo;
        const lotKey = String(lotNumber).trim();

        if (lotNumber && lotNumber > 0 && lotKey !== "") {
          if (!lotMap.has(lotKey)) {
            lotMap.set(lotKey, {
              lotNo: lotNumber,
              catches: new Set()
            });
          }
          if (catchNo) {
            lotMap.get(lotKey).catches.add(catchNo);
          }
        }
      });
      
      // Convert to expected format
      const lots = Array.from(lotMap.values()).map(group => ({
        lotNo: group.lotNo,
        catchCount: group.catches.size
      })).sort((a, b) => a.lotNo - b.lotNo);
      
      return lots;
    } catch (err) {
      console.error("Failed to fetch lots for selection", err);
      // Fallback to internal route if NRDatas fails
      try {
        const res = await API.get(`/NRDataLots/GetByProjectId/${projectId}`);
        return res.data || [];
      } catch (err) {
        // Fallback to by-project endpoint if GetByProjectId doesn't exist
        console.log("Using fallback endpoint for lots");
        const res = await API.get(`/NRDataLots/by-project/${projectId}`);
        const allData = res.data || [];

        // Group by lot and count catches manually
        const lotMap = new Map();
        allData.forEach(item => {
          if (item.lotNo > 0) {
            if (!lotMap.has(item.lotNo)) {
              lotMap.set(item.lotNo, new Set());
            }
            if (item.catchNo) {
              lotMap.get(item.lotNo).add(item.catchNo);
            }
          }
        });

        // Convert to expected format
        const lots = Array.from(lotMap.entries()).map(([lotNo, catches]) => ({
          lotNo,
          catchCount: catches.size
        })).sort((a, b) => a.lotNo - b.lotNo);

        return lots;
      }
    }
  };

  const fetchMissingEnvLotCatchesForSelection = async (projectIdParam) => {
    try {
      const res = await API.get(`/NRDataLots/GetMissingEnvLotCatches/${projectIdParam}`);
      const rawData = res.data || [];
      return rawData.map(item => ({
        catchNo: (item.catchNo ?? item.CatchNo ?? "").toString().trim(),
        count: item.count ?? item.Count ?? 0,
      })).filter(item => item.catchNo);
    } catch (err) {
      console.error("Failed to fetch missing EnvLot catches for selection", err);
      message.error("Failed to load catches missing envelope lot assignments.");
      return [];
    }
  };

  const assignEnvLotByCatchNos = async (catchNos) => {
    try {
      const normalizedCatchNos = Array.from(
        new Set(
          (catchNos || [])
            .map((c) => (c ?? "").toString().trim())
            .filter((c) => c)
        )
      );

      if (normalizedCatchNos.length === 0) {
        return null;
      }

      const res = await API.post("/NRDataLots/AssignEnvLotByCatches", {
        projectId: Number(projectId),
        catchNos: normalizedCatchNos,
      });
      return res.data;
    } catch (err) {
      console.error("Failed to assign EnvLot by catches", err);
      const errorMessage = err?.response?.data?.message || "Failed to assign envelope lot.";
      message.error(errorMessage);
      return null;
    }
  };

  const revertEnvLotByCatchNos = async (catchNos) => {
    try {
      const normalizedCatchNos = Array.from(
        new Set(
          (catchNos || [])
            .map((c) => (c ?? "").toString().trim())
            .filter((c) => c)
        )
      );

      if (normalizedCatchNos.length === 0) {
        return false;
      }

      const res = await API.post("/NRDataLots/UnassignEnvLotByCatches", {
        projectId: Number(projectId),
        catchNos: normalizedCatchNos,
      });

      if (res?.status === 200) {
        message.warning("Report generation failed. Env lot assignment was reverted.");
        return true;
      }

      return false;
    } catch (err) {
      console.error("Failed to revert EnvLot assignment", err);
      return false;
    }
  };

  const showEnvLotSelectionModal = (envLots) => {
    setEnvLotSearch("");
    return new Promise((resolve) => {
      setEnvLotSelectionModal({
        visible: true,
        availableEnvLots: envLots,
        selectedEnvLots: [],
        loading: false,
        resolve
      });
    });
  };

  const handleEnvLotSelectionConfirm = () => {
    const { selectedEnvLots, resolve } = envLotSelectionModal;
    
    if (selectedEnvLots.length === 0) {
      message.warning("Please select at least one catch to process");
      return;
    }

    setEnvLotSelectionModal({ 
      visible: false, 
      availableEnvLots: [], 
      selectedEnvLots: [], 
      loading: false,
      resolve: null 
    });
    setEnvLotSearch("");
    
    if (resolve) {
      resolve(selectedEnvLots);
    }
  };

  const handleEnvLotSelectionCancel = () => {
    const { resolve } = envLotSelectionModal;
    
    setEnvLotSelectionModal({ 
      visible: false, 
      availableEnvLots: [], 
      selectedEnvLots: [], 
      loading: false,
      resolve: null 
    });
    setEnvLotSearch("");
    
    if (resolve) {
      resolve(null);
    }
  };

  const handleSelectAllEnvLots = (checked) => {
    if (checked) {
      setEnvLotSelectionModal(prev => ({
        ...prev,
        selectedEnvLots: prev.availableEnvLots.map(lot => lot.catchNo)
      }));
    } else {
      setEnvLotSelectionModal(prev => ({
        ...prev,
        selectedEnvLots: []
      }));
    }
  };

  const handleEnvLotToggle = (catchNo, checked) => {
    setEnvLotSelectionModal(prev => {
      const newSelectedEnvLots = checked
        ? [...prev.selectedEnvLots, catchNo]
        : prev.selectedEnvLots.filter(l => l !== catchNo);
      
      return {
        ...prev,
        selectedEnvLots: newSelectedEnvLots
      };
    });
  };

  const showExistingReportModal = (report) => {
    return new Promise((resolve) => {
      setExistingReportModal({
        visible: true,
        report,
        resolve
      });
    });
  };

  const handleExistingReportDownload = async () => {
    const { report, resolve } = existingReportModal;
    setExistingReportModal({ visible: false, report: null, resolve: null });
    
    // Automatically expand the reports section for this template when downloading
    if (report?.templateId) {
      setExpandedReportsTemplates(prev => {
        const newSet = new Set(prev);
        newSet.add(report.templateId);
        return newSet;
      });
    }
    
    if (resolve) {
      resolve('download');
    }
  };

  const handleExistingReportGenerate = () => {
    const { resolve } = existingReportModal;
    setExistingReportModal({ visible: false, report: null, resolve: null });
    if (resolve) {
      resolve('generate');
    }
  };

  const handleExistingReportCancel = () => {
    const { resolve } = existingReportModal;
    setExistingReportModal({ visible: false, report: null, resolve: null });
    if (resolve) {
      resolve('cancel');
    }
  };

  const handleReportsExpansion = (templateId, activeKey) => {
    setExpandedReportsTemplates(prev => {
      const newSet = new Set(prev);
      if (activeKey && activeKey.includes('reports')) {
        newSet.add(templateId);
      } else {
        newSet.delete(templateId);
      }
      return newSet;
    });
  };

  const showLotSelectionModal = (lots) => {
    return new Promise((resolve) => {
      setLotSelectionModal({
        visible: true,
        availableLots: lots,
        selectedLots: lots.map(lot => lot.lotNo), // Select all by default
        loading: false,
        resolve
      });
    });
  };

  const handleLotSelectionConfirm = () => {
    const { selectedLots, resolve } = lotSelectionModal;

    if (selectedLots.length === 0) {
      message.warning("Please select at least one lot to process");
      return;
    }

    setLotSelectionModal({
      visible: false,
      availableLots: [],
      selectedLots: [],
      loading: false,
      resolve: null
    });

    if (resolve) {
      resolve(selectedLots);
    }
  };

  const handleLotSelectionCancel = () => {
    const { resolve } = lotSelectionModal;

    setLotSelectionModal({
      visible: false,
      availableLots: [],
      selectedLots: [],
      loading: false,
      resolve: null
    });

    if (resolve) {
      resolve(null); // Return null to indicate cancellation
    }
  };

  const handleSelectAllLots = (checked) => {
    if (checked) {
      setLotSelectionModal(prev => ({
        ...prev,
        selectedLots: prev.availableLots.map(lot => lot.lotNo)
      }));
    } else {
      setLotSelectionModal(prev => ({
        ...prev,
        selectedLots: []
      }));
    }
  };

  const handleLotToggle = (lotNo, checked) => {
    setLotSelectionModal(prev => {
      const newSelectedLots = checked
        ? [...prev.selectedLots, lotNo]
        : prev.selectedLots.filter(l => l !== lotNo);

      return {
        ...prev,
        selectedLots: newSelectedLots
      };
    });
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

  const normalizeModuleIds = (raw) => {
    if (raw == null) return [];
    if (Array.isArray(raw)) {
      return raw.map((val) => Number(val)).filter((id) => Number.isFinite(id));
    }
    if (typeof raw === "number") return [raw];
    if (typeof raw === "string") {
      return raw
        .split(",")
        .map((val) => Number(val.trim()))
        .filter((id) => Number.isFinite(id));
    }
    return [];
  };

  const resolveTemplateId = (template) => {
    const raw =
      template?.templateId ??
      template?.TemplateId ??
      template?.id ??
      template?.Id ??
      null;
    const num = Number(raw);
    return Number.isFinite(num) ? num : null;
  };

  const resolveTemplateName = (template) => {
    const name =
      template?.templateName ??
      template?.TemplateName ??
      template?.name ??
      template?.Name ??
      "";
    if (name) return name;
    const id = resolveTemplateId(template);
    return id ? `Template ${id}` : "Template";
  };

  const isQuantitySheetTemplate = (templateName) => {
    if (!templateName) return false;
    const n = templateName.toLowerCase().replace(/\s/g, "");
    return n.includes("quantitysheet") || n.includes("qtysheet");
  };

  const moduleKeyToIdMap = useMemo(() => {
    const map = {};
    Object.entries(moduleKeyToNameMap).forEach(([key, name]) => {
      const match = allModules.find(
        (m) => String(m.name || "").toLowerCase() === String(name).toLowerCase()
      );
      if (match?.id) map[key] = match.id;
    });
    return map;
  }, [allModules]);

  const templatesByModuleId = useMemo(() => {
    const map = new Map();
    (templateOptions || []).forEach((template) => {
      const ids = normalizeModuleIds(
        template?.moduleIds ?? template?.ModuleIds
      );
      ids.forEach((id) => {
        const list = map.get(id) || [];
        list.push(template);
        map.set(id, list);
      });
    });
    return map;
  }, [templateOptions]);

  const getTemplatesForModuleKey = (moduleKey) => {
    const moduleId = moduleKeyToIdMap[moduleKey];
    if (!moduleId) return [];
    return templatesByModuleId.get(moduleId) || [];
  };

  const loadTemplateReportStatus = async (moduleKey) => {
    if (!rptApiUrl || !projectId) return;
    const templates = getTemplatesForModuleKey(moduleKey);
    if (!templates.length) return;
    try {
      const results = await Promise.all(
        templates.map(async (template) => {
          const templateId = resolveTemplateId(template);
          if (!templateId) return null;
          const res = await axios.get(`${rptApiUrl}/report/generated-exists`, {
            params: {
              templateId,
              projectId: Number(projectId),
            },
          });
          return { templateId, data: res?.data };
        })
      );

      setTemplateReportStatus((prev) => {
        const next = { ...prev };
        results.forEach((item) => {
          if (!item?.templateId) return;
          next[item.templateId] = {
            exists: Boolean(item?.data?.exists),
            fileName: item?.data?.fileName || null,
            generatedAt: item?.data?.generatedAt || null,
          };
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to check generated reports", err);
    }
  };

  const openTemplatePanel = (moduleKey) => {
    setLotWisePanel({ open: false, moduleKey: null }); // Ensure lot-wise is closed
    setTemplatePanel({ open: true, moduleKey });
  };

  const closeTemplatePanel = () => {
    setTemplatePanel({ open: false, moduleKey: null });
  };

  useEffect(() => {
    if (!templatePanel.open || !templatePanel.moduleKey) return;
    loadTemplateReportStatus(templatePanel.moduleKey);
  }, [templatePanel.open, templatePanel.moduleKey, templateOptions, projectId]);

  // Fetch static variables defined in a template's mapping and prompt user to fill them
  const promptStaticVariables = (template, savedDefaults) => {
    return new Promise((resolve) => {
      const entries = Object.entries(savedDefaults || {});
      if (entries.length === 0) {
        resolve({});
        return;
      }
      const initialValues = Object.fromEntries(entries.map(([k, v]) => [k, v]));
      setStaticVarModal({ open: true, template, variables: savedDefaults, values: initialValues, resolve });
    });
  };

  const handleStaticVarConfirm = () => {
    const { resolve, values } = staticVarModal;
    setStaticVarModal({ open: false, template: null, variables: {}, values: {}, resolve: null });
    if (resolve) resolve(values);
  };

  const handleStaticVarCancel = () => {
    const { resolve } = staticVarModal;
    setStaticVarModal({ open: false, template: null, variables: {}, values: {}, resolve: null });
    if (resolve) resolve(null); // null = cancelled
  };

  const getTemplateStaticVariables = async (templateId) => {
    try {
      const APIURL = import.meta.env.VITE_API_URL;
      const res = await axios.get(`${APIURL}/RPTTemplates/${templateId}/mapping`);
      const raw = res?.data?.mappingJson ?? res?.data?.MappingJson ?? "";
      const parsed = parseMappingJson(raw);
      return parsed.staticVariables || {};
    } catch {
      return {};
    }
  };

  const handleGenerateTemplate = async (template) => {
    if (!projectId) {
      message.warning("Please select a project");
      return;
    }
    const templateId = resolveTemplateId(template);
    if (!templateId) {
      message.warning("Template not found.");
      return;
    }
    if (!rptApiUrl) {
      message.error("RPT API URL is not configured.");
      return;
    }

    // Check for static variables and prompt user
    const savedDefaults = await getTemplateStaticVariables(templateId);
    let staticVariables = {};
    if (Object.keys(savedDefaults).length > 0) {
      const userValues = await promptStaticVariables(template, savedDefaults);
      if (userValues === null) return; // user cancelled
      staticVariables = userValues;
    }

    // Fetch available catches missing envelope lot assignment and assign a new EnvLot automatically
    let envLotNumbers = [];
    const isQS = isQuantitySheetTemplate(resolveTemplateName(template));
    
    // Check if template depends on envelope breaking module
    const envelopeBreakingModuleId = moduleKeyToIdMap["envelopebreaking"];
    const templateModuleIds = normalizeModuleIds(template?.moduleIds ?? template?.ModuleIds);
    const isEnvelopeDependent = envelopeBreakingModuleId && templateModuleIds.includes(envelopeBreakingModuleId);

    // Only show env lot modal for reports dependent on envelope breakages (excluding QS)
    let assignedCatchNos = [];
    if (!isQS && isEnvelopeDependent) {
      const missingCatchItems = await fetchMissingEnvLotCatchesForSelection(projectId);
      if (missingCatchItems.length > 0) {
        const selectedCatchNos = await showEnvLotSelectionModal(missingCatchItems);
        if (selectedCatchNos === null) {
          return; // user cancelled
        }

        if (selectedCatchNos.length > 0) {
          const assignResult = await assignEnvLotByCatchNos(selectedCatchNos);
          if (!assignResult || !assignResult.assignedEnvLotNo) {
            return;
          }

          envLotNumbers = [assignResult.assignedEnvLotNo];
          assignedCatchNos = selectedCatchNos;
        }
      }
    }

    // Check if report already exists for this template and envelope lots combination
    // For QS, an empty envLotNumbers array means generic (all lots)
    const envLotKey = envLotNumbers.length > 0 ? envLotNumbers.sort((a, b) => a - b).join(',') : (isQS ? "" : null);
    
    if (envLotKey !== null) {
      const existingReport = envLotReports.find(report => 
        report.templateId === templateId && (report.envLotKey === envLotKey || (!report.envLotKey && envLotKey === ""))
      );
      
      if (existingReport) {
        // Show confirmation modal for existing report
        const shouldProceed = await showExistingReportModal(existingReport);
        if (shouldProceed === 'download') {
          // Download existing report
          await handleDownloadEnvLotReport(existingReport);
          return;
        } else if (shouldProceed === 'cancel') {
          return; // User cancelled
        }
        // If shouldProceed === 'generate', continue with generation
      }
    }

    const payload = {
      projectId: Number(projectId),
      templateId: Number(templateId),
      ...(Object.keys(staticVariables).length > 0 ? { staticVariables } : {}),
      ...(envLotNumbers.length > 0 ? { LotNos: envLotNumbers.join(',') } : {}),
    };
    const messageKey = `generate-report-${payload.templateId}-${Date.now()}`;
    setGeneratingTemplates((prev) => ({ ...prev, [templateId]: true }));
    message.loading({
      content: "Generating report...",
      key: messageKey,
      duration: 0,
    });

    try {
      // Wrap the API call with retry logic
      const res = await retryAsync(
        () => axios.post(
          `${rptApiUrl}/report/generate-dynamic`,
          payload,
          { responseType: "blob" }
        ),
        3, // max 3 attempts
        1000 // initial delay 1 second
      );
      
      // Extract file path from response headers (try different case variations)
      const filePath = res.headers['x-generated-file-path'] || 
                      res.headers['X-Generated-File-Path'] || 
                      res.headers['X-GENERATED-FILE-PATH'] || null;
      console.log('Generated file path:', filePath);
      console.log('All response headers:', res.headers);
      
      const fileName = buildReportFileName({
        templateName: template?.templateName,
        projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
        typeId: template?.typeId ?? typeId,
        envLotNumbers: envLotNumbers, // Include envelope lot numbers
      });
      const fileBlob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(fileBlob);

      setTemplateDownloads((prev) => {
        const existing = prev[templateId];
        if (existing?.url) {
          window.URL.revokeObjectURL(existing.url);
        }
        return { ...prev, [templateId]: { url, fileName } };
      });
      setTemplateReportStatus((prev) => ({
        ...prev,
        [templateId]: {
          ...(prev[templateId] || {}),
          exists: true,
          fileName,
          generatedAt: new Date().toISOString(),
        },
      }));
      clearMappingUpdate(templateId);
      // Clear stale flag for this specific template once regenerated
      setStaleTemplateIds((prev) => {
        const next = new Set(prev);
        next.delete(templateId);
        return next;
      });

      message.success({ content: "Report generated.", key: messageKey });
      
      // Save the generated envelope lot report to database
      try {
        const reportData = {
          projectId: Number(projectId),
          templateId,
          templateName: template?.templateName || `Template ${templateId}`,
          envLotNumbers: envLotNumbers.sort((a, b) => a - b).join(','),
          fileName,
          generatedBy: 'Current User', // You can replace this with actual user info
          filePath: filePath // Include the server file path
        };

        console.log('Saving report to database:', reportData);
        const saveResponse = await API.post('/EnvelopeLotReports', reportData);
        console.log('Report saved successfully:', saveResponse.data);
        const savedReport = saveResponse.data;

        // Update local state with the saved report
        const newReport = {
          id: `${templateId}_${reportData.envLotNumbers}_${savedReport.id}`,
          templateId,
          templateName: template?.templateName || `Template ${templateId}`,
          envLotNumbers: [...envLotNumbers].sort((a, b) => a - b),
          envLotKey: reportData.envLotNumbers,
          fileName,
          generatedAt: savedReport.generatedAt,
          generatedBy: savedReport.generatedBy,
          filePath: savedReport.filePath, // Include the server file path
          url,
          dbId: savedReport.id
        };
        
        setEnvLotReports(prev => {
          // Remove any existing report with the same template and envLotKey combination
          const filtered = prev.filter(report => 
            !(report.templateId === templateId && report.envLotKey === reportData.envLotNumbers)
          );
          return [newReport, ...filtered]; // Add new report at the beginning
        });

        // Automatically expand the reports section for this template
        setExpandedReportsTemplates(prev => {
          const newSet = new Set(prev);
          newSet.add(templateId);
          return newSet;
        });

      } catch (saveErr) {
        console.error("Failed to save report to database", saveErr);
        console.error("Error details:", saveErr.response?.data);
        message.warning("Report generated but failed to save to database. It will be lost on refresh.");
        
        // Still show the report locally even if database save fails
        const reportKey = envLotNumbers.sort((a, b) => a - b).join(',');
        const newReport = {
          id: `${templateId}_${reportKey}_${Date.now()}`,
          templateId,
          templateName: template?.templateName || `Template ${templateId}`,
          envLotNumbers: [...envLotNumbers].sort((a, b) => a - b),
          envLotKey: reportKey,
          fileName,
          generatedAt: new Date().toISOString(),
          generatedBy: 'Current User',
          filePath: filePath, // Include the server file path even if DB save fails
          url,
        };
        
        setEnvLotReports(prev => {
          const filtered = prev.filter(report => 
            !(report.templateId === templateId && report.envLotKey === reportKey)
          );
          return [newReport, ...filtered];
        });

        // Automatically expand the reports section for this template even if DB save fails
        setExpandedReportsTemplates(prev => {
          const newSet = new Set(prev);
          newSet.add(templateId);
          return newSet;
        });
      }
    } catch (err) {
      console.error("Generate report failed", err);
      const msg = await getErrorMessageAsync(err, "Failed to generate report.");
      const errorDetails = getErrorDetails(err);

      // If we created a temporary envelope lot assignment, revert it on failure
      if (assignedCatchNos.length > 0) {
        await revertEnvLotByCatchNos(assignedCatchNos);
      }

      // Show error with details and retry option
      message.error({ content: msg, key: messageKey, duration: 6 });

      // Show error details modal if available
      if (errorDetails) {
        setErrorDetailsModal({
          visible: true,
          error: errorDetails,
          retryFn: () => {
            setErrorDetailsModal({ visible: false, error: null, retryFn: null, templateId: null });
            // Retry the report generation
            handleGenerateTemplate(template);
          },
          templateId
        });
      }
    } finally {
      setGeneratingTemplates((prev) => ({ ...prev, [templateId]: false }));
    }
  };

  const handleDownloadEnvLotReport = async (report) => {
    // Build filename with envelope lot numbers
    const fileName = buildReportFileName({
      templateName: report.templateName,
      projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
      typeId: null, // We don't have typeId in report object
      envLotNumbers: report.envLotNumbers,
    });

    if (report.url) {
      // Use cached blob URL if available
      const link = document.createElement("a");
      link.href = report.url;
      link.download = fileName; // Use the filename with envelope lot numbers
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success("Download started.");
    } else if (report.filePath) {
      // Construct download URL using RPT service URL from .env and relative file path
      try {
        message.loading({ content: "Downloading report from server...", key: `download-${report.id}` });
        
        // Build full URL: VITE_RPT_API_URL + /files/ + relative path
        const rptApiUrl = import.meta.env.VITE_RPT_API_URL;
        const downloadUrl = `${rptApiUrl}/files/${encodeURIComponent(report.filePath)}`;
        
        const link = document.createElement("a");
        link.href = downloadUrl;
        link.download = fileName;
        link.target = "_blank";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        message.success({ content: "Download started.", key: `download-${report.id}` });
      } catch (err) {
        console.error("Failed to download from server path", err);
        // Fallback to API download
        await downloadFromApi(report, fileName);
      }
    } else {
      // Fallback to API download
      await downloadFromApi(report, fileName);
    }
  };

  const downloadFromApi = async (report, fileName) => {
    // Try to re-download from server if blob URL is not available (after page refresh)
    if (!rptApiUrl || !projectId) {
      message.error("Cannot download report. Please regenerate the report.");
      return;
    }

    try {
      message.loading({ content: "Downloading report...", key: `download-${report.id}` });
      
      // Reconstruct the lot numbers for the API call
      const lotNos = report.envLotNumbers.join(',');
      
      const res = await axios.get(`${rptApiUrl}/report/generated-download`, {
        params: {
          templateId: report.templateId,
          projectId: Number(projectId),
          LotNos: lotNos,
        },
        responseType: "blob",
      });

      const fileBlob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName || report.fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      message.success({ content: "Download started.", key: `download-${report.id}` });
    } catch (err) {
      console.error("Failed to download report", err);
      message.error({ 
        content: "Failed to download report. Please regenerate it.", 
        key: `download-${report.id}` 
      });
    }
  };

  const handleDeleteEnvLotReport = async (reportId) => {
    try {
      const report = envLotReports.find(r => r.id === reportId);
      if (!report) {
        message.error("Report not found.");
        return;
      }

      // Delete from database if it has a dbId
      if (report.dbId) {
        await API.delete(`/EnvelopeLotReports/${report.dbId}`);
      }

      // Remove from local state
      setEnvLotReports(prev => {
        const reportToRemove = prev.find(r => r.id === reportId);
        if (reportToRemove?.url) {
          window.URL.revokeObjectURL(reportToRemove.url);
        }
        return prev.filter(r => r.id !== reportId);
      });
      
      message.success("Report deleted successfully.");
    } catch (err) {
      console.error("Failed to delete report", err);
      message.error("Failed to delete report from database.");
    }
  };

  const handleDownloadTemplate = async (template) => {
    const templateId = resolveTemplateId(template);
    if (!templateId) {
      message.warning("Template not found.");
      return;
    }
    const cached = templateDownloads[templateId];
    if (cached?.url) {
      const link = document.createElement("a");
      link.href = cached.url;
      link.download = cached.fileName || "report.pdf";
      document.body.appendChild(link);
      link.click();
      link.remove();
      message.success("Download started.");
      return;
    }

    if (!rptApiUrl || !projectId) {
      message.warning("Please generate the report first.");
      return;
    }

    try {
      const res = await axios.get(`${rptApiUrl}/report/generated-download`, {
        params: {
          templateId,
          projectId: Number(projectId),
        },
        responseType: "blob",
      });
      const fileName = buildReportFileName({
        templateName: template?.templateName,
        projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
        typeId: template?.typeId ?? typeId,
      });
      const fileBlob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Download started.");
    } catch (err) {
      console.error("Download failed", err);
      const msg = await getErrorMessageAsync(err, "Please generate the report first.");
      message.error(msg);
    }
  };

  const handleGenerateAllTemplates = async () => {
    if (!templatePanel.moduleKey) return;
    const templates = getTemplatesForModuleKey(templatePanel.moduleKey);
    const pending = templates.filter((template) => {
      const templateId = resolveTemplateId(template);
      if (!templateId) return false;
      const exists = templateReportStatus[templateId]?.exists;
      return !exists || isMappingNewerThanReport(templateId) || staleTemplateIds.has(templateId);
    });

    if (pending.length === 0) {
      message.info("All templates are already generated.");
      return;
    }

    setBulkGenerating(true);
    try {
      await Promise.all(pending.map((template) => handleGenerateTemplate(template)));
      await loadTemplateReportStatus(templatePanel.moduleKey);
    } finally {
      setBulkGenerating(false);
    }
  };

  const handleDownloadAllTemplates = async () => {
    if (!templatePanel.moduleKey) return;
    if (!rptApiUrl || !projectId) {
      message.warning("Please generate the report first.");
      return;
    }
    const templates = getTemplatesForModuleKey(templatePanel.moduleKey);
    const ids = templates
      .map((template) => resolveTemplateId(template))
      .filter(Boolean);

    if (!ids.length) {
      message.warning("No templates available.");
      return;
    }

    const missing = ids.filter((id) => !templateReportStatus[id]?.exists);
    if (missing.length > 0) {
      message.warning("Please generate all templates before downloading.");
      return;
    }

    // Build friendly file names in the same order as ids
    const fileNames = templates
      .filter((t) => resolveTemplateId(t))
      .map((t) =>
        buildReportFileName({
          templateName: t?.templateName,
          projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
          typeId: t?.typeId ?? typeId,
        })
      );

    setBulkDownloading(true);
    try {
      const res = await axios.get(`${rptApiUrl}/report/generated-download-zip`, {
        params: {
          projectId: Number(projectId),
          templateIds: ids.join(","),
          fileNames: fileNames.join(","),
        },
        responseType: "blob",
      });
      const contentDisposition = res.headers["content-disposition"] || "";
      const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const fileName =
        fileNameMatch?.[1] ||
        `reports_project${projectId}_${new Date().toISOString().slice(0, 10)}.zip`;
      const fileBlob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success("Download started.");
    } catch (err) {
      console.error("Download all failed", err);
      const msg = await getErrorMessageAsync(err, "Failed to download all reports.");
      message.error(msg);
    } finally {
      setBulkDownloading(false);
    }
  };

  const openLotWisePanel = async (moduleKey) => {
    if (moduleKey !== "box") {
      message.info("Lot-wise templates are only available for Box Breaking");
      return;
    }

    // First check if there are templates for box breaking
    const boxTemplates = getTemplatesForModuleKey("box");
    if (boxTemplates.length === 0) {
      message.warning("No templates are linked to the Box Breaking module. Please configure templates first.");
      return;
    }

    setTemplatePanel({ open: false, moduleKey: null }); // Ensure standard panel is closed
    setLotWisePanel({ open: true, moduleKey });
    await fetchAvailableLots();
  };

  const closeLotWisePanel = () => {
    setLotWisePanel({ open: false, moduleKey: null });
    setAvailableLots([]);
    setSelectedLotTab(null);
  };

  const fetchAvailableLots = async () => {
    if (!projectId) return;
    setLoadingLots(true);
    try {
      // Try the new endpoint first
      let lots = [];
      try {
        const res = await API.get(`/NRDataLots/GetByProjectId/${projectId}`);
        lots = res.data || [];
      } catch (err) {
        // Fallback to by-project endpoint if GetByProjectId doesn't exist
        console.log("Using fallback endpoint for lots");
        const res = await API.get(`/NRDataLots/GetByProjectId/${projectId}`);
        const allData = res.data || [];

        // Group by lot and count catches manually
        const lotMap = new Map();
        allData.forEach(item => {
          if (item.lotNo > 0) {
            if (!lotMap.has(item.lotNo)) {
              lotMap.set(item.lotNo, new Set());
            }
            if (item.catchNo) {
              lotMap.get(item.lotNo).add(item.catchNo);
            }
          }
        });

        // Convert to expected format
        lots = Array.from(lotMap.entries()).map(([lotNo, catches]) => ({
          lotNo,
          catchCount: catches.size
        })).sort((a, b) => a.lotNo - b.lotNo);
      }

      setAvailableLots(lots);
      // Set first lot as default selected tab
      if (lots.length > 0) {
        setSelectedLotTab(lots[0].lotNo);
      }
      // Load template status for all lots
      await loadLotTemplateStatus(lots);
      // Check lot report existence
      await checkLotReportExistence(lots);
    } catch (err) {
      console.error("Failed to fetch lots", err);
      message.error("Failed to load lots for this project");
      setAvailableLots([]);
    } finally {
      setLoadingLots(false);
    }
  };

  const checkLotReportExistence = async (lots) => {
    if (!projectId || !lots || lots.length === 0) return;

    try {
      const results = await Promise.all(
        lots.map(async (lot) => {
          try {
            const fileName = `BoxBreaking_${lot.lotNo}.xlsx`;
            const res = await API.get(
              `/EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${fileName}`
            );
            return {
              lotNo: lot.lotNo,
              exists: res.data.exists || false,
            };
          } catch (err) {
            console.error(`Failed to check report for lot ${lot.lotNo}`, err);
            return {
              lotNo: lot.lotNo,
              exists: false,
            };
          }
        })
      );

      setLotReportStatus((prev) => {
        const next = { ...prev };
        results.forEach((item) => {
          next[item.lotNo] = item.exists;
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to check lot report existence", err);
    }
  };

  const loadLotTemplateStatus = async (lots) => {
    if (!projectId || !lots || lots.length === 0) return;

    const boxTemplates = getTemplatesForModuleKey("box");
    if (boxTemplates.length === 0) return;

    try {
      const results = await Promise.all(
        lots.flatMap((lot) =>
          boxTemplates.map(async (template) => {
            const templateId = resolveTemplateId(template);
            if (!templateId) return null;

            try {
              const res = await axios.get(`${rptApiUrl}/report/generated-exists`, {
                params: {
                  templateId,
                  projectId: Number(projectId),
                  lotNumber: lot.lotNo,
                },
              });
              return {
                lotNo: lot.lotNo,
                templateId,
                data: res?.data
              };
            } catch (err) {
              return {
                lotNo: lot.lotNo,
                templateId,
                data: null
              };
            }
          })
        )
      );

      setLotTemplateStatus((prev) => {
        const next = { ...prev };
        results.forEach((item) => {
          if (!item?.lotNo || !item?.templateId) return;
          const statusKey = `${item.lotNo}_${item.templateId}`;
          next[statusKey] = {
            exists: Boolean(item?.data?.exists),
            fileName: item?.data?.fileName || null,
            generatedAt: item?.data?.generatedAt || null,
          };
        });
        return next;
      });
    } catch (err) {
      console.error("Failed to check lot template status", err);
    }
  };

  const handleGenerateLotTemplate = async (lotNo, template) => {
    if (!projectId) {
      message.warning("Please select a project");
      return;
    }

    const templateId = resolveTemplateId(template);
    if (!templateId) {
      message.warning("Template not found.");
      return;
    }

    if (!rptApiUrl) {
      message.error("RPT API URL is not configured.");
      return;
    }

    const statusKey = `${lotNo}_${templateId}`;
    const messageKey = `generate-lot-${statusKey}-${Date.now()}`;
    setGeneratingLotTemplates(prev => ({ ...prev, [statusKey]: true }));
    message.loading({
      content: `Generating ${resolveTemplateName(template)} for Lot ${lotNo}...`,
      key: messageKey,
      duration: 0,
    });

    try {
      const payload = {
        projectId: Number(projectId),
        templateId: Number(templateId),
        lotNumber: lotNo,
      };

      // Wrap with retry logic
      await retryAsync(
        () => axios.post(
          `${rptApiUrl}/report/generate-dynamic`,
          payload,
          { responseType: "blob" }
        ),
        3, // max 3 attempts
        1000 // initial delay 1 second
      );

      // Update status
      setLotTemplateStatus((prev) => ({
        ...prev,
        [statusKey]: {
          exists: true,
          fileName: buildReportFileName({
            templateName: template?.templateName,
            projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
            typeId: template?.typeId ?? typeId,
            lotNumber: lotNo,
          }),
          generatedAt: new Date().toISOString(),
        },
      }));

      // Remove from stale list
      setStaleLotIds((prev) => {
        const next = new Set(prev);
        next.delete(statusKey);
        return next;
      });

      message.success({
        content: `Generated ${resolveTemplateName(template)} for Lot ${lotNo}`,
        key: messageKey,
      });
    } catch (err) {
      console.error("Failed to generate lot template", err);
      const errorMsg = await getErrorMessageAsync(err, "Failed to generate template");
      const errorDetails = getErrorDetails(err);
      message.error({
        content: errorMsg,
        key: messageKey,
        duration: 6,
      });
      
      // Show error details modal if available
      if (errorDetails) {
        setErrorDetailsModal({
          visible: true,
          error: errorDetails,
          retryFn: () => {
            setErrorDetailsModal({ visible: false, error: null, retryFn: null, templateId: null });
            handleGenerateLotTemplate(lotNo, template);
          },
          templateId
        });
      }
    } finally {
      setGeneratingLotTemplates(prev => ({ ...prev, [statusKey]: false }));
    }
  };

  const handleDownloadLotTemplate = async (lotNo, template) => {
    if (!projectId) {
      message.warning("Please select a project");
      return;
    }

    const templateId = resolveTemplateId(template);
    if (!templateId) {
      message.warning("Template not found.");
      return;
    }

    if (!rptApiUrl) {
      message.error("RPT API URL is not configured.");
      return;
    }

    const statusKey = `${lotNo}_${templateId}`;
    setDownloadingLotTemplates(prev => ({ ...prev, [statusKey]: true }));

    try {
      const res = await axios.get(`${rptApiUrl}/report/generated-download`, {
        params: {
          templateId,
          projectId: Number(projectId),
          lotNumber: lotNo,
        },
        responseType: "blob",
      });

      const fileName = buildReportFileName({
        templateName: template?.templateName,
        projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
        typeId: template?.typeId ?? typeId,
        lotNumber: lotNo,
      });

      const fileBlob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success(`Downloaded ${resolveTemplateName(template)} for Lot ${lotNo}`);
    } catch (err) {
      console.error("Failed to download lot template", err);
      const msg = await getErrorMessageAsync(err, "Please generate the template first.");
      message.error(msg);
    } finally {
      setDownloadingLotTemplates(prev => ({ ...prev, [statusKey]: false }));
    }
  };

  const handleGenerateAllLots = async (lotNo) => {
    if (!projectId) {
      message.warning("No project selected");
      return;
    }

    if (!lotNo) {
      message.warning("Please select a lot");
      return;
    }

    setGeneratingLotReport(prev => ({ ...prev, [lotNo]: true }));
    const messageKey = `generate-lot-report-${lotNo}-${Date.now()}`;
    message.loading({
      content: `Generating Box Breaking report for Lot ${lotNo}...`,
      key: messageKey,
      duration: 0,
    });

    try {
      // Call runBoxBreaking with the specific lot number
      await runBoxBreaking(projectId, [lotNo]);

      // After report generation, check lot report existence to update status
      const lots = await fetchLotsForSelection();
      await checkLotReportExistence(lots);

      message.success({
        content: `Successfully generated Box Breaking report for Lot ${lotNo}`,
        key: messageKey,
      });
    } catch (err) {
      console.error("Failed to generate lot report", err);
      message.error({
        content: err?.response?.data?.message || "Failed to generate report",
        key: messageKey,
        duration: 6,
      });
    } finally {
      setGeneratingLotReport(prev => ({ ...prev, [lotNo]: false }));
    }
  };

  const handleGenerateAllLotTemplates = async (lotNo) => {
    if (!projectId) {
      message.warning("No project selected");
      return;
    }

    if (!lotNo) {
      message.warning("Please select a lot");
      return;
    }

    // Get templates for the box breaking module
    const lotTemplates = getTemplatesForModuleKey("box");

    if (lotTemplates.length === 0) {
      message.warning("No templates available for this lot");
      return;
    }

    // Filter templates that need generation
    const templatesToGenerate = lotTemplates.filter((template) => {
      const templateId = resolveTemplateId(template);
      if (!templateId) return false;
      const statusKey = `${lotNo}_${templateId}`;
      const status = lotTemplateStatus[statusKey];
      const isStale = staleLotIds.has(statusKey);
      return !status?.exists || isStale;
    });

    if (templatesToGenerate.length === 0) {
      message.info("All templates for this lot are already generated.");
      return;
    }

    setBulkGeneratingLots(true);
    const messageKey = `generate-all-lot-templates-${lotNo}-${Date.now()}`;
    message.loading({
      content: `Generating ${templatesToGenerate.length} template(s) for Lot ${lotNo}...`,
      key: messageKey,
      duration: 0,
    });

    try {
      for (const template of templatesToGenerate) {
        await handleGenerateLotTemplate(lotNo, template);
      }
      message.success({
        content: `Successfully generated ${templatesToGenerate.length} template(s) for Lot ${lotNo}`,
        key: messageKey,
      });
    } catch (err) {
      message.error({
        content: "Failed to generate all templates",
        key: messageKey,
      });
    } finally {
      setBulkGeneratingLots(false);
    }
  };

  const handleDownloadAllLots = async (lotNo) => {
    if (!projectId) {
      message.warning("No project selected");
      return;
    }

    if (!lotNo) {
      message.warning("Please select a lot");
      return;
    }

    const lotTemplates = getTemplatesForModuleKey("box");
    const templateIds = lotTemplates
      .map((template) => resolveTemplateId(template))
      .filter(Boolean);

    if (templateIds.length === 0) {
      message.warning("No templates available for this lot");
      return;
    }

    // Check if all templates are generated
    const allGenerated = templateIds.every((templateId) => {
      const statusKey = `${lotNo}_${templateId}`;
      const status = lotTemplateStatus[statusKey];
      const isStale = staleLotIds.has(statusKey);
      return status?.exists && !isStale;
    });

    if (!allGenerated) {
      message.warning("Please generate all templates before downloading");
      return;
    }

    setBulkDownloadingLots(true);
    const messageKey = `download-all-lot-${lotNo}-${Date.now()}`;
    message.loading({
      content: `Downloading templates for Lot ${lotNo}...`,
      key: messageKey,
      duration: 0,
    });

    try {
      const res = await axios.get(`${rptApiUrl}/report/generated-download-zip`, {
        params: {
          projectId: Number(projectId),
          templateIds: templateIds.join(","),
          lotNumber: lotNo,
        },
        responseType: "blob",
      });

      const contentDisposition = res.headers["content-disposition"] || "";
      const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const fileName = fileNameMatch?.[1] || `Lot${lotNo}_Reports_${projectId}_${new Date().toISOString().slice(0, 10)}.zip`;

      const fileBlob = new Blob([res.data], { type: "application/zip" });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success({
        content: `Downloaded all templates for Lot ${lotNo}`,
        key: messageKey,
      });
    } catch (err) {
      console.error("Failed to download all lot templates", err);
      const msg = await getErrorMessageAsync(err, "Failed to download all templates");
      message.error({
        content: msg,
        key: messageKey,
        duration: 6,
      });
    } finally {
      setBulkDownloadingLots(false);
    }
  };

  const handleDownloadLotReport = async (lotNo, reportType = "BoxBreaking") => {
    if (!projectId) {
      message.warning("Please select a project");
      return;
    }

    try {
      // Construct the expected filename pattern: BoxBreaking_lotNo.xlsx
      const fileName = `${reportType}_${lotNo}.xlsx`;

      // Validate that the lot number is in the filename
      // Extract lot numbers from filename (format: BoxBreaking_101_102_103.xlsx)
      const fileNamePattern = `${reportType}_`;
      if (!fileName.startsWith(fileNamePattern)) {
        message.error("Invalid file name format");
        return;
      }

      // Extract lot numbers from filename (everything between reportType_ and .xlsx)
      const lotNumbersStr = fileName
        .replace(`${reportType}_`, "")
        .replace(".xlsx", "");

      const lotNumbers = lotNumbersStr.split("_").map(num => Number(num));

      // Validate that the selected lot number is in the file
      if (!lotNumbers.includes(lotNo)) {
        message.error(`Lot ${lotNo} is not included in this file. File contains lots: ${lotNumbers.join(", ")}`);
        return;
      }

      const fileUrl = `${url3}/${projectId}/${fileName}?DateTime=${new Date().toISOString()}`;

      // Create a temporary link and trigger download
      const link = document.createElement("a");
      link.href = fileUrl;
      link.download = fileName;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      message.success(`Downloading ${reportType} report for Lot ${lotNo}`);
    } catch (err) {
      console.error("Failed to download lot report", err);
      message.error("Failed to download report");
    }
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
        value: extraConfigData && extraConfigData.length > 0
          ? extraConfigData.map(ec => {
              const type = ec.extraType ?? ec.ExtraType;
              const mode = ec.mode ?? ec.Mode;
              const nodalValue = ec.nodalValue ?? ec.NodalValue;
              const typeName = type === 1 ? "Nodal" : type === 2 ? "University" : "Office";
              const isPerNodal = nodalValue ? " (Different per Nodal)" : " (Unified)";
              return `${typeName}: ${mode}${isPerNodal}`;
            })
          : ["Not configured"],
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
    const freshlyRunSteps = new Set();
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

        // Check if report already exists — skip only if user did NOT explicitly select this module
        const fileName = fileNames[step.key];
        let reportExists = false;

        if (fileName && !modulesToProcess.includes(step.key)) {
          try {
            const res = await API.get(
              `/EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${fileName}`
            );
            reportExists = res.data.exists;
          } catch (err) {
            console.error(`Failed to check file existence: ${fileName}`, err);
          }
        }

        // If report already exists and not explicitly selected, mark as completed and skip
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
          else if (step.key === "box") {
            // Fetch available lots before running box breaking
            const lots = await fetchLotsForSelection();

            if (lots.length > 0) {
              // Show lot selection modal for all cases
              const selectedLots = await showLotSelectionModal(lots);

              if (selectedLots === null) {
                // User cancelled - stop processing
                message.info("Box breaking cancelled by user");
                updateStepStatus(step.key, { status: "pending" });
                break;
              }

              // Run box breaking with selected lots
              await runBoxBreaking(projectId, selectedLots);
            } else {
              // No lots found
              message.warning("No lots found for this project");
              updateStepStatus(step.key, { status: "failed" });
              break;
            }
          }
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

      // Mark modules with templates as stale if their processing step was re-run
      // Also mark downstream modules (steps that come after a re-run step) as stale
      const freshlyRun = modulesToProcess.filter((key) => completedSteps.has(key));
      const staleIds = new Set();
      freshlyRun.forEach((runKey) => {
        const runIndex = allOrder.findIndex((s) => s.key === runKey);
        allOrder.slice(runIndex).forEach((s) => {
          getTemplatesForModuleKey(s.key).forEach((t) => {
            const id = resolveTemplateId(t);
            if (id) staleIds.add(id);
          });
        });
      });
      if (staleIds.size > 0) {
        setStaleTemplateIds((prev) => new Set([...prev, ...staleIds]));
        // Reset report status for stale templates so Generate All re-enables
        setTemplateReportStatus((prev) => {
          const next = { ...prev };
          staleIds.forEach((id) => {
            if (next[id]) next[id] = { ...next[id], exists: false };
          });
          return next;
        });
      }

      // Mark lot-wise templates as stale if box breaking was re-run
      if (freshlyRun.includes("box")) {
        // Fetch lots to mark templates as stale
        const lots = await fetchLotsForSelection();
        const staleKeys = new Set();

        if (lots.length > 0) {
          const boxTemplates = getTemplatesForModuleKey("box");
          
          lots.forEach((lot) => {
            boxTemplates.forEach((template) => {
              const templateId = resolveTemplateId(template);
              if (templateId) {
                const statusKey = `${lot.lotNo}_${templateId}`;
                staleKeys.add(statusKey);
              }
            });
          });

          console.log("Marking lot templates as stale:", Array.from(staleKeys));

          // Mark all lot-template combinations as stale
          setStaleLotIds(staleKeys);

          // Reset lot template status to force regeneration
          setLotTemplateStatus((prev) => {
            const next = { ...prev };
            staleKeys.forEach((statusKey) => {
              // Mark as not existing to enable Generate button
              next[statusKey] = { exists: false, fileName: null, generatedAt: null };
            });
            console.log("Updated lot template status:", next);
            return next;
          });

          // Check lot report existence after box breaking completes
          await checkLotReportExistence(lots);

          // Also update availableLots if panel is open
          if (lotWisePanel.open) {
            setAvailableLots(lots);
          }
        }
        
        // Mark all lot-template combinations as stale
        setStaleLotIds(staleKeys);
        
        // Reset lot template status
        setLotTemplateStatus((prev) => {
          const next = { ...prev };
          staleKeys.forEach((statusKey) => {
            if (next[statusKey]) {
              next[statusKey] = { ...next[statusKey], exists: false };
            }
          });
          return next;
        });
      }

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

  const showTemplatePanel = templatePanel.open;
  const showLotWisePanel = lotWisePanel.open;

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
      title: "Templates",
      dataIndex: "templates",
      key: "templates",
      render: (_, record) => {
        const moduleTemplates = getTemplatesForModuleKey(record.key);
        const hasTemplates = moduleTemplates.length > 0;
        const isReady = record.status === "completed";
        const isBoxBreaking = record.key === "box";

        return (
          <Space size="small">
            <Button
              size="small"
              onClick={() =>
                isBoxBreaking
                  ? openLotWisePanel(record.key)
                  : openTemplatePanel(record.key)
              }
              disabled={!isReady || !hasTemplates}
            >
              Templates{hasTemplates ? ` (${moduleTemplates.length})` : ""}
            </Button>
          </Space>
        );
      },
    },
    {
      title: "Report",
      dataIndex: "report",
      key: "report",
      render: (url, record) => {
        if (record.key === "box") return <Text type="secondary">—</Text>;
        return url ? (
          <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-500">
            Download
          </a>
        ) : (
          <Text type="secondary">—</Text>
        );
      },
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
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
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
      {/* Static Variables Input Modal */}
      <Modal
        title={`Enter values for "${staticVarModal.template?.templateName || "Report"}"`}
        open={staticVarModal.open}
        onOk={handleStaticVarConfirm}
        onCancel={handleStaticVarCancel}
        okText="Generate Report"
        width={480}
      >
        <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
          This report has fields that require custom text. Fill in the values below (pre-filled with saved defaults).
        </Typography.Text>
        {Object.entries(staticVarModal.variables || {}).map(([fieldName]) => (
          <div key={fieldName} style={{ marginBottom: 12 }}>
            <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
              {fieldName}
            </Typography.Text>
            <Input
              value={staticVarModal.values[fieldName] ?? ""}
              onChange={(e) =>
                setStaticVarModal((prev) => ({
                  ...prev,
                  values: { ...prev.values, [fieldName]: e.target.value },
                }))
              }
              placeholder={`Enter value for ${fieldName}`}
            />
          </div>
        ))}
      </Modal>

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
        <Typography.Title level={3} style={{ marginBottom: 6 }}>
          Processing Pipeline
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

      <div className="mb-2">
        <p className="text-sm font-medium mb-1">Overall Progress</p>
        <Progress percent={percent} showInfo={false} />
        <div className="text-right text-sm mt-1">
          Step {Math.max(currentStep, 0)} of {Math.max(steps.length, 0)}
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div
          className={showTemplatePanel || showLotWisePanel ? "pipeline-main pipeline-main--with-panel" : "pipeline-main pipeline-main--single"}
        >
          <Card
            size="small"
            title="Enabled Modules Status & Reports"
            className="pipeline-table-card"
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
              />
            )}
          </Card>

          {showTemplatePanel && (
            <Card
              size="small"
              className="pipeline-panel"
              title={
                <div className="pipeline-panel-title">
                  <Typography.Text strong>
                    Templates
                    {templatePanel.moduleKey
                      ? ` - ${steps.find((s) => s.key === templatePanel.moduleKey)?.title || "Module"}`
                      : ""}
                  </Typography.Text>
                  <div className="pipeline-panel-actions">
                    <Button
                      size="small"
                      type="primary"
                      onClick={handleGenerateAllTemplates}
                      loading={bulkGenerating}
                    >
                      Generate All
                    </Button>
                    <Button
                      size="small"
                      onClick={handleDownloadAllTemplates}
                      loading={bulkDownloading}
                    >
                      Download All
                    </Button>
                    <Button size="small" onClick={closeTemplatePanel}>
                      Close
                    </Button>
                  </div>
                </div>
              }
              bodyStyle={{ padding: 0 }}
              style={{
                border: "1px solid #d9d9d9",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                borderRadius: 8,
                alignSelf: "start",
              }}
            >
              <div className="pipeline-panel-body">
                {templatesLoading ? (
                  <Text type="secondary">Loading templates...</Text>
                ) : (
                  <>
                    {templatePanel.moduleKey &&
                      getTemplatesForModuleKey(templatePanel.moduleKey).length === 0 ? (
                      <Text type="secondary">No templates linked to this module.</Text>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                        {getTemplatesForModuleKey(templatePanel.moduleKey || "").map((template) => {
                          const templateId = resolveTemplateId(template);
                          const isGenerating = templateId ? generatingTemplates[templateId] : false;
                          const reportStatus = templateId ? templateReportStatus[templateId] : null;
                          const hasDownload = templateId
                            ? Boolean(templateDownloads[templateId]?.url || reportStatus?.exists)
                            : false;
                          const hasMappingUpdate = templateId
                            ? isMappingNewerThanReport(templateId)
                            : false;
                          const isStale = staleTemplateIds.has(templateId);
                          const needsRegenerate = hasMappingUpdate || isStale;
                          const alreadyGenerated = reportStatus?.exists && !needsRegenerate;
                          return (
                            <Card
                              size="small"
                              key={templateId || resolveTemplateName(template)}
                              bodyStyle={{ padding: 12 }}
                              style={{ borderRadius: 8 }}
                            >
                              <div style={{ 
                                display: 'flex', 
                                justifyContent: 'space-between', 
                                alignItems: 'center', 
                                marginBottom: 8 
                              }}>
                                <div style={{ fontWeight: 600 }}>
                                  {resolveTemplateName(template)}
                                </div>
                                <Button
                                  size="small"
                                  type={alreadyGenerated ? "default" : "primary"}
                                  onClick={() => handleGenerateTemplate(template)}
                                  loading={isGenerating}
                                >
                                  {alreadyGenerated ? "Regenerate" : "Generate"}
                                </Button>
                              </div>
                              
                              {/* Compact Envelope Lot Reports for this template */}
                              <EnvLotReportsManager
                                reports={envLotReports}
                                templateId={templateId}
                                onDownload={handleDownloadEnvLotReport}
                                onDelete={handleDeleteEnvLotReport}
                                compact={true}
                                activeKey={expandedReportsTemplates.has(templateId) ? ['reports'] : []}
                                onActiveKeyChange={(activeKey) => handleReportsExpansion(templateId, activeKey)}
                              />
                            </Card>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            </Card>
          )}

          {showLotWisePanel && (
            <Card
              size="small"
              className="pipeline-panel pipeline-panel-wide"
              title={
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Typography.Text strong>
                    Lot-wise Templates and Reports - Box Breaking
                  </Typography.Text>
                  <Button size="small" onClick={closeLotWisePanel}>
                    Close
                  </Button>
                </div>
              }
              bodyStyle={{ padding: 0 }}
              style={{
                border: "1px solid #d9d9d9",
                boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                borderRadius: 8,
                alignSelf: "start",
              }}
            >
              <div className="pipeline-panel-body">
                {loadingLots ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Text type="secondary">Loading lots...</Text>
                  </div>
                ) : availableLots.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px" }}>
                    <Text type="secondary">No lots found for this project</Text>
                  </div>
                ) : (
                  <Tabs
                    activeKey={selectedLotTab?.toString()}
                    onChange={(key) => setSelectedLotTab(key === "project-wide" ? "project-wide" : Number(key))}
                    type="card"
                    size="small"
                    items={[
                      {
                        key: "project-wide",
                        label: (
                          <Space size="small">
                            <Text>Project-wide</Text>
                          </Space>
                        ),
                        children: (
                          <div style={{ padding: "12px" }}>
                            <div style={{ marginBottom: 24 }}>
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                                paddingBottom: 8,
                                borderBottom: "2px solid #f0f0f0"
                              }}>
                                <Text strong style={{ fontSize: "14px", color: "#1890ff" }}>
                                  Generic Templates
                                </Text>
                              </div>

                              {getTemplatesForModuleKey("box").length === 0 ? (
                                <Text type="secondary">No templates linked to Box Breaking module.</Text>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {getTemplatesForModuleKey("box").map((template) => {
                                    const templateId = resolveTemplateId(template);
                                    const status = templateReportStatus[templateId];
                                    const isStale = staleTemplateIds.has(templateId);
                                    const isGenerating = generatingTemplates[templateId];
                                    
                                    return (
                                      <Card
                                        size="small"
                                        key={templateId || resolveTemplateName(template)}
                                        bodyStyle={{ padding: "8px 12px" }}
                                        style={{ borderRadius: 4, backgroundColor: "#fafafa" }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                              <Text strong style={{ fontSize: "13px" }}>
                                                {resolveTemplateName(template)}
                                              </Text>
                                              {status?.exists && !isStale && (
                                                <Tag color="green" style={{ margin: 0 }}>Ready</Tag>
                                              )}
                                            </div>
                                          </div>
                                          <Space size="small">
                                            <Button
                                              size="small"
                                              type="primary"
                                              onClick={() => handleGenerateTemplate(template)}
                                              loading={isGenerating}
                                            >
                                              Generate
                                            </Button>
                                            <Button
                                              size="small"
                                              onClick={() => handleDownloadTemplate(template)}
                                              disabled={!status?.exists}
                                            >
                                              Download
                                            </Button>
                                          </Space>
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      },
                      ...availableLots.map((lot) => {
                      const lotTemplates = getTemplatesForModuleKey("box");

                      // Count generated templates for this lot
                      const generatedCount = lotTemplates.filter((template) => {
                        const templateId = resolveTemplateId(template);
                        if (!templateId) return false;
                        const statusKey = `${lot.lotNo}_${templateId}`;
                        const status = lotTemplateStatus[statusKey];
                        const isStale = staleLotIds.has(statusKey);
                        return status?.exists && !isStale;
                      }).length;

                      const hasStale = lotTemplates.some((template) => {
                        const templateId = resolveTemplateId(template);
                        if (!templateId) return false;
                        const statusKey = `${lot.lotNo}_${templateId}`;
                        return staleLotIds.has(statusKey);
                      });

                      return {
                        key: lot.lotNo.toString(),
                        label: (
                          <Space size="small">
                            <Text>Lot {lot.lotNo}</Text>
                            {hasStale && (
                              <Tag color="orange" style={{ margin: 0 }}>
                                ⟳
                              </Tag>
                            )}
                          </Space>
                        ),
                        children: (
                          <div style={{ padding: "12px" }}>
                            {/* Reports Section - Now First */}
                            <div style={{ marginBottom: 24 }}>
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                                paddingBottom: 8,
                                borderBottom: "2px solid #f0f0f0"
                              }}>
                                <Text strong style={{ fontSize: "14px", color: "#52c41a" }}>
                                  Reports
                                </Text>
                              </div>

                              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                {/* Box Breaking Report */}
                                <Card
                                  size="small"
                                  bodyStyle={{ padding: "8px 12px" }}
                                  style={{ borderRadius: 4, backgroundColor: "#fafafa" }}
                                >
                                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <div style={{ flex: 1 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <Text strong style={{ fontSize: "13px" }}>
                                          Box Breaking Report
                                        </Text>
                                        <Text type="secondary" style={{ fontSize: "11px" }}>
                                          Lot {lot.lotNo}
                                        </Text>
                                        {lotReportStatus[lot.lotNo] && (
                                          <Tag color="green" style={{ margin: 0 }}>
                                            Ready
                                          </Tag>
                                        )}
                                      </div>
                                    </div>
                                    {lotReportStatus[lot.lotNo] ? (
                                      <Button
                                        size="small"
                                        onClick={() => handleDownloadLotReport(lot.lotNo, "BoxBreaking")}
                                      >
                                        Download
                                      </Button>
                                    ) : (
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => handleGenerateAllLots(lot.lotNo)}
                                        loading={generatingLotReport[lot.lotNo]}
                                      >
                                        Generate
                                      </Button>
                                    )}
                                  </div>
                                </Card>
                              </div>
                            </div>

                            {/* Templates Section - Now Second */}
                            <div style={{ marginBottom: 24 }}>
                              <div style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                                marginBottom: 12,
                                paddingBottom: 8,
                                borderBottom: "2px solid #f0f0f0"
                              }}>
                                <Text strong style={{ fontSize: "14px", color: "#1890ff" }}>
                                  Templates
                                </Text>
                                <Space size="small">
                                  <Button
                                    size="small"
                                    type="primary"
                                    onClick={() => handleGenerateAllLotTemplates(lot.lotNo)}
                                    loading={bulkGeneratingLots}
                                    disabled={lotTemplates.length === 0 || lotTemplates.every((template) => {
                                      const templateId = resolveTemplateId(template);
                                      if (!templateId) return true;
                                      const statusKey = `${lot.lotNo}_${templateId}`;
                                      const status = lotTemplateStatus[statusKey];
                                      const isStale = staleLotIds.has(statusKey);
                                      return status?.exists && !isStale;
                                    })}
                                  >
                                    Generate All
                                  </Button>
                                  <Button
                                    size="small"
                                    onClick={() => handleDownloadAllLots(lot.lotNo)}
                                    loading={bulkDownloadingLots}
                                    disabled={lotTemplates.length === 0 || !lotTemplates.every((template) => {
                                      const templateId = resolveTemplateId(template);
                                      if (!templateId) return false;
                                      const statusKey = `${lot.lotNo}_${templateId}`;
                                      const status = lotTemplateStatus[statusKey];
                                      const isStale = staleLotIds.has(statusKey);
                                      return status?.exists && !isStale;
                                    })}
                                  >
                                    Download All
                                  </Button>
                                </Space>
                              </div>

                              {lotTemplates.length === 0 ? (
                                <Text type="secondary">No templates linked to Box Breaking module.</Text>
                              ) : (
                                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                                  {lotTemplates.map((template) => {
                                    const templateId = resolveTemplateId(template);
                                    const statusKey = `${lot.lotNo}_${templateId}`;
                                    const isGenerating = generatingLotTemplates[statusKey];
                                    const isDownloading = downloadingLotTemplates[statusKey];
                                    const status = lotTemplateStatus[statusKey];
                                    const isStale = staleLotIds.has(statusKey);
                                    const canGenerate = !status?.exists || isStale;
                                    const hasDownload = status?.exists && !isStale;

                                    return (
                                      <Card
                                        size="small"
                                        key={templateId || resolveTemplateName(template)}
                                        bodyStyle={{ padding: "8px 12px" }}
                                        style={{ borderRadius: 4, backgroundColor: "#fafafa" }}
                                      >
                                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                          <div style={{ flex: 1 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                              <Text strong style={{ fontSize: "13px" }}>
                                                {resolveTemplateName(template)}
                                              </Text>
                                              {status?.exists && !isStale && status.generatedAt && (
                                                <Text type="secondary" style={{ fontSize: "11px" }}>
                                                  Generated {new Date(status.generatedAt).toLocaleString()}
                                                </Text>
                                              )}
                                            </div>
                                            {isStale && (
                                              <Tag color="warning" style={{ fontSize: "10px", marginTop: 4 }}>
                                                Data updated - regeneration required
                                              </Tag>
                                            )}
                                          </div>
                                          <Space size="small">
                                            {canGenerate ? (
                                              <Button
                                                size="small"
                                                type="primary"
                                                onClick={() => {
                                                  if (isQuantitySheetTemplate(resolveTemplateName(template))) {
                                                    handleGenerateTemplate(template);
                                                  } else {
                                                    handleGenerateLotTemplate(lot.lotNo, template);
                                                  }
                                                }}
                                                loading={isGenerating}
                                              >
                                                Generate
                                              </Button>
                                            ) : (
                                              <Button
                                                size="small"
                                                type="primary"
                                                onClick={() => {
                                                  if (isQuantitySheetTemplate(resolveTemplateName(template))) {
                                                    handleGenerateTemplate(template);
                                                  } else {
                                                    handleGenerateLotTemplate(lot.lotNo, template);
                                                  }
                                                }}
                                                loading={isGenerating}
                                              >
                                                Regenerate
                                              </Button>
                                            )}
                                            <Button
                                              size="small"
                                              onClick={() => handleDownloadLotTemplate(lot.lotNo, template)}
                                              loading={isDownloading}
                                              disabled={!hasDownload}
                                            >
                                              Download
                                            </Button>
                                          </Space>
                                        </div>
                                      </Card>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          </div>
                        ),
                      };
                    })]}
                    tabBarStyle={{ margin: 0, paddingLeft: 12, paddingRight: 12 }}
                  />
                )}
              </div>
            </Card>
          )}
        </div>
      </motion.div>

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

      {/* Lot Selection Modal */}
        <Modal
        title="Select Lots for Box Breaking"
        open={lotSelectionModal.visible}
        onOk={handleLotSelectionConfirm}
        onCancel={handleLotSelectionCancel}
        width={600}
        okText="Process Selected Lots"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Multiple lots detected"
            description="Please select which lot(s) you want to process for Box Breaking. You can select all lots or specific ones."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Checkbox
            checked={lotSelectionModal.selectedLots.length === lotSelectionModal.availableLots.length && lotSelectionModal.availableLots.length > 0}
            indeterminate={lotSelectionModal.selectedLots.length > 0 && lotSelectionModal.selectedLots.length < lotSelectionModal.availableLots.length}
            onChange={(e) => handleSelectAllLots(e.target.checked)}
            style={{ marginBottom: 12, fontWeight: 500 }}
          >
            Select All Lots ({lotSelectionModal.availableLots.length})
          </Checkbox>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
          {lotSelectionModal.availableLots.map((lot) => (
            <Card
              key={lot.lotNo}
              size="small"
              style={{
                backgroundColor: lotSelectionModal.selectedLots.includes(lot.lotNo) ? "#f0f5ff" : "#fafafa",
                border: lotSelectionModal.selectedLots.includes(lot.lotNo) ? "1px solid #91caff" : "1px solid #d9d9d9"
              }}
            >
              <Checkbox
                checked={lotSelectionModal.selectedLots.includes(lot.lotNo)}
                onChange={(e) => handleLotToggle(lot.lotNo, e.target.checked)}
              >
                <Space>
                  <Text strong style={{ fontSize: "14px" }}>Lot {lot.lotNo}</Text>
                  <Badge
                    count={lot.catchCount}
                    style={{ backgroundColor: "#52c41a" }}
                    title="Number of catches in this lot"
                  />
                  <Text type="secondary" style={{ fontSize: "12px" }}>catches</Text>
                </Space>
              </Checkbox>
            </Card>
          ))}
        </div>

        {lotSelectionModal.selectedLots.length > 0 && (
          <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
            <Text strong style={{ color: "#1890ff" }}>
              {lotSelectionModal.selectedLots.length} lot(s) selected
            </Text>
          </div>
        )}
      </Modal>

      <Modal
        title="Select Catches For processing"
        open={envLotSelectionModal.visible}
        onOk={handleEnvLotSelectionConfirm}
        onCancel={handleEnvLotSelectionCancel}
        width={600}
        okText="Generate"
        cancelText="Cancel"
      >
        <div style={{ marginBottom: 16 }}>
          <Alert
            message="Catches with missing Envelope Lot"
            description="Select the catch numbers you want to process."
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />

          <Input.Search
            placeholder="Search Catch No"
            value={envLotSearch}
            allowClear
            onChange={(e) => setEnvLotSearch(e.target.value)}
            style={{ marginBottom: 12 }}
          />

          <Checkbox
            checked={envLotSelectionModal.selectedEnvLots.length === envLotSelectionModal.availableEnvLots.length && envLotSelectionModal.availableEnvLots.length > 0}
            indeterminate={envLotSelectionModal.selectedEnvLots.length > 0 && envLotSelectionModal.selectedEnvLots.length < envLotSelectionModal.availableEnvLots.length}
            onChange={(e) => handleSelectAllEnvLots(e.target.checked)}
            style={{ marginBottom: 12, fontWeight: 500 }}
          >
            Select All Catches ({envLotSelectionModal.availableEnvLots.length})
          </Checkbox>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
          {envLotSelectionModal.availableEnvLots
            .filter(item => String(item.catchNo).toLowerCase().includes(envLotSearch.trim().toLowerCase()))
            .map((catchItem) => (
              <Card
                key={catchItem.catchNo}
                size="small"
                style={{
                  backgroundColor: envLotSelectionModal.selectedEnvLots.includes(catchItem.catchNo) ? "#f0f5ff" : "#fafafa",
                  border: envLotSelectionModal.selectedEnvLots.includes(catchItem.catchNo) ? "1px solid #91caff" : "1px solid #d9d9d9"
                }}
              >
                <Checkbox
                  checked={envLotSelectionModal.selectedEnvLots.includes(catchItem.catchNo)}
                  onChange={(e) => handleEnvLotToggle(catchItem.catchNo, e.target.checked)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <Text strong style={{ fontSize: "14px" }}>Catch No {catchItem.catchNo}</Text>
                  </div>
                </Checkbox>
              </Card>
            ))}
        </div>

        {envLotSelectionModal.selectedEnvLots.length > 0 && (
          <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
            <Text strong style={{ color: "#1890ff" }}>
              {envLotSelectionModal.selectedEnvLots.length} catch(es) selected
            </Text>
          </div>
        )}
      </Modal>

      {/* Existing Report Modal */}
      <Modal
        title="Report Already Exists"
        open={existingReportModal.visible}
        onCancel={handleExistingReportCancel}
        width={500}
        footer={[
          <Button key="cancel" onClick={handleExistingReportCancel}>
            Cancel
          </Button>,
          <Button key="download" type="default" onClick={handleExistingReportDownload}>
            Download Existing
          </Button>,
          <Button key="generate" type="primary" onClick={handleExistingReportGenerate}>
            Generate New
          </Button>
        ]}
      >
        {existingReportModal.report && (
          <div>
            <Alert
              message="A report already exists for this template and envelope lot combination"
              description={
                <div style={{ marginTop: 8 }}>
                  <p><strong>Template:</strong> {existingReportModal.report.templateName}</p>
                  <p><strong>Envelope Lots:</strong> {existingReportModal.report.envLotNumbers.join(', ')}</p>
                  <p><strong>Generated:</strong> {new Date(existingReportModal.report.generatedAt).toLocaleString()}</p>
                  <p><strong>Generated By:</strong> {existingReportModal.report.generatedBy}</p>
                </div>
              }
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <p>You can download the existing report or generate a new one to replace it.</p>
          </div>
        )}
      </Modal>

      {/* Error Details Modal */}
      <Modal
        title="Report Generation Error"
        open={errorDetailsModal.visible}
        onCancel={() => setErrorDetailsModal({ visible: false, error: null, retryFn: null, templateId: null })}
        width={700}
        footer={[
          <Button key="close" onClick={() => setErrorDetailsModal({ visible: false, error: null, retryFn: null, templateId: null })}>
            Close
          </Button>,
          errorDetailsModal.retryFn && (
            <Button key="retry" type="primary" onClick={errorDetailsModal.retryFn}>
              Retry Report Generation
            </Button>
          )
        ]}
      >
        {errorDetailsModal.error && (
          <div>
            <Alert
              message="An error occurred while generating the report"
              description="The error details are shown below. You can retry the generation or contact support if the problem persists."
              type="error"
              showIcon
              style={{ marginBottom: 16 }}
            />
            
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: "16px" }}>Error Details:</Text>
              <div style={{ 
                backgroundColor: "#f5f5f5", 
                padding: "12px", 
                borderRadius: "4px", 
                marginTop: "8px",
                fontFamily: "monospace",
                fontSize: "12px",
                maxHeight: "400px",
                overflowY: "auto",
                wordBreak: "break-word"
              }}>
                <p><strong>Type:</strong> {errorDetailsModal.error.type || 'Unknown'}</p>
                <p><strong>Message:</strong> {errorDetailsModal.error.message || 'No message'}</p>
                {errorDetailsModal.error.innerMessage && (
                  <p><strong>Inner Message:</strong> {errorDetailsModal.error.innerMessage}</p>
                )}
                {errorDetailsModal.error.templateId && (
                  <p><strong>Template ID:</strong> {errorDetailsModal.error.templateId}</p>
                )}
                {errorDetailsModal.error.projectId && (
                  <p><strong>Project ID:</strong> {errorDetailsModal.error.projectId}</p>
                )}
                {errorDetailsModal.error.lotNos && (
                  <p><strong>Lot Numbers:</strong> {errorDetailsModal.error.lotNos}</p>
                )}
                {errorDetailsModal.error.timestamp && (
                  <p><strong>Timestamp:</strong> {errorDetailsModal.error.timestamp}</p>
                )}
                {errorDetailsModal.error.stackTrace && (
                  <>
                    <p><strong>Stack Trace:</strong></p>
                    <pre style={{ margin: "8px 0", padding: "8px", backgroundColor: "#fff", borderLeft: "2px solid #f5222d" }}>
                      {errorDetailsModal.error.stackTrace}
                    </pre>
                  </>
                )}
              </div>
            </div>

            <Alert
              message="Retry Tips"
              description={
                <ul style={{ margin: 0, paddingLeft: "20px" }}>
                  <li>Check if all required templates and data are available</li>
                  <li>Verify database connectivity</li>
                  <li>Try generating with fewer lots or simpler parameters</li>
                  <li>Contact system administrator if problem persists</li>
                </ul>
              }
              type="info"
              showIcon
              style={{ marginTop: 16 }}
            />
          </div>
        )}
      </Modal>

      <style>{`
        .pipeline-main {
          display: grid;
          gap: 16px;
          align-items: start;
          width: 100%;
        }
        .pipeline-main--with-panel {
          grid-template-columns: 1fr 450px;
        }
        .pipeline-main--single {
          grid-template-columns: 1fr;
        }
        .pipeline-table-card {
          min-width: 0;
          overflow: hidden;
        }
        .pipeline-panel {
          position: sticky;
          top: 12px;
          min-width: 0;
        }
        .pipeline-panel-wide {
          /* Removed rigid min-width to allow fluid shrinking */
        }
        .pipeline-panel-body {
          padding: 12px;
          max-height: calc(100vh - 220px);
          overflow-y: auto;
        }
        .pipeline-panel-title {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }
        .pipeline-panel-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .pipeline-panel-actions .ant-btn {
          white-space: nowrap;
          flex: 1 1 auto;
        }
        .ant-tabs-tab.ant-tabs-tab-active {
          background-color: #f0f5ff !important;
          border-color: #91caff !important;
        }
        .ant-tabs-tab.ant-tabs-tab-active .ant-tabs-tab-btn {
          color: #1677ff !important;
          font-weight: 500 !important;
        }

        /* Large Desktop */
        @media (min-width: 1600px) {
          .pipeline-main--with-panel {
            grid-template-columns: 1fr 550px;
          }
        }

        /* Standard Desktop */
        @media (max-width: 1440px) {
          .pipeline-main--with-panel {
            grid-template-columns: 1fr 400px;
          }
        }

        /* Small Desktop / Tablet Landscape */
        @media (max-width: 1200px) {
          .pipeline-main--with-panel {
            grid-template-columns: 1fr 350px;
            gap: 12px;
          }
          .pipeline-panel-title {
            font-size: 13px;
          }
        }

        /* Tablet Portrait and below */
        @media (max-width: 992px) {
          .pipeline-main--with-panel {
            grid-template-columns: 1fr;
          }
          .pipeline-panel {
            position: static;
            width: 100%;
          }
        }

        /* Mobile */
        @media (max-width: 576px) {
           .p-4 { padding: 8px !important; }
           .ant-card-head-title { font-size: 14px; white-space: normal; }
           .pipeline-panel-actions { flex-direction: column; }
           .pipeline-panel-actions .ant-btn { width: 100%; }
        }
      `}</style>
    </div>
  );
};

export default ProcessingPipeline;
