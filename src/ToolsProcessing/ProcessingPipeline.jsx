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
  Space,
} from "antd";
import { motion } from "framer-motion";
import axios from "axios";
import API from "../hooks/api";
import useStore from "../stores/ProjectData";
import { buildReportFileName } from "../utils/rptTemplateUtils";

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
  }, [projectId]);

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
    setTemplatePanel({ open: true, moduleKey });
  };

  const closeTemplatePanel = () => {
    setTemplatePanel({ open: false, moduleKey: null });
  };

  useEffect(() => {
    if (!templatePanel.open || !templatePanel.moduleKey) return;
    loadTemplateReportStatus(templatePanel.moduleKey);
  }, [templatePanel.open, templatePanel.moduleKey, templateOptions, projectId]);

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

    const payload = {
      projectId: Number(projectId),
      templateId: Number(templateId),
    };
    const messageKey = `generate-report-${payload.templateId}-${Date.now()}`;
    setGeneratingTemplates((prev) => ({ ...prev, [templateId]: true }));
    message.loading({
      content: "Generating report...",
      key: messageKey,
      duration: 0,
    });

    try {
      const res = await axios.post(
        `${rptApiUrl}/report/generate-dynamic`,
        payload,
        { responseType: "blob" }
      );
      const fileName = buildReportFileName({
        templateName: template?.templateName,
        projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
        typeId: template?.typeId ?? typeId,
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
    } catch (err) {
      console.error("Generate report failed", err);
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to generate report.";
      message.error({ content: msg, key: messageKey, duration: 6 });
    } finally {
      setGeneratingTemplates((prev) => ({ ...prev, [templateId]: false }));
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
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Please generate the report first.";
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
      const msg =
        err?.response?.data?.message ||
        err?.response?.data ||
        "Failed to download all reports.";
      message.error(msg);
    } finally {
      setBulkDownloading(false);
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
      render: (_, record, index) => {
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
        return (
          <Button
            size="small"
            onClick={() => openTemplatePanel(record.key)}
            disabled={!isReady || !hasTemplates}
          >
            Templates{hasTemplates ? ` (${moduleTemplates.length})` : ""}
          </Button>
        );
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
  ];

  return (
    <div className=" p-4">
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

      <div className="mb-4">
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
          className={showTemplatePanel ? "pipeline-main pipeline-main--with-panel" : "pipeline-main pipeline-main--single"}
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
                          const canGenerate = templateId
                            ? !reportStatus?.exists || hasMappingUpdate || isStale
                            : true;
                          return (
                            <Card
                              size="small"
                              key={templateId || resolveTemplateName(template)}
                              bodyStyle={{ padding: 12 }}
                              style={{ borderRadius: 8 }}
                            >
                              <div style={{ fontWeight: 600, marginBottom: 8 }}>
                                {resolveTemplateName(template)}
                              </div>
                              <Space>
                                <Button
                                  size="small"
                                  type="primary"
                                  onClick={() => handleGenerateTemplate(template)}
                                  loading={isGenerating}
                                  disabled={!canGenerate}
                                >
                                  Generate
                                </Button>
                                <Button
                                  size="small"
                                  onClick={() => handleDownloadTemplate(template)}
                                  disabled={!hasDownload}
                                >
                                  Download
                                </Button>
                              </Space>
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

      <style>{`
        .pipeline-main {
          display: grid;
          gap: 12px;
          align-items: start;
        }
        .pipeline-main--with-panel {
          grid-template-columns: minmax(0, 1fr) minmax(320px, 360px);
        }
        .pipeline-main--single {
          grid-template-columns: minmax(0, 1fr);
        }
        .pipeline-table-card {
          min-width: 0;
        }
        .pipeline-panel {
          position: sticky;
          top: 12px;
        }
        .pipeline-panel-body {
          padding: 12px;
          max-height: calc(100vh - 260px);
          overflow-y: auto;
        }
        .pipeline-panel-title {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pipeline-panel-actions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }
        .pipeline-panel-actions .ant-btn {
          white-space: nowrap;
        }
        @media (max-width: 1200px) {
          .pipeline-main--with-panel {
            grid-template-columns: minmax(0, 1fr);
          }
          .pipeline-panel {
            position: static;
          }
        }
      `}</style>
    </div>
  );
};

export default ProcessingPipeline;
