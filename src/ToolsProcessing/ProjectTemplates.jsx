import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CopyOutlined,
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  HistoryOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import axios from "axios";
import useStore from "../stores/ProjectData";

const ProjectTemplates = () => {
  const url = import.meta.env.VITE_API_BASE_URL;
  const APIURL = import.meta.env.VITE_API_URL;
  const rptApiUrl = import.meta.env.VITE_RPT_API_URL;
  const token = localStorage.getItem("token");

  const projectId = useStore((state) => state.projectId);
  const projectName = useStore((state) => state.projectName);

  const [groupOptions, setGroupOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [groupLabel, setGroupLabel] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [projectGroupId, setProjectGroupId] = useState(null);
  const [projectTypeId, setProjectTypeId] = useState(null);
  const [projectLabel, setProjectLabel] = useState("");
  const [projectLoading, setProjectLoading] = useState(false);
  const [projectOptions, setProjectOptions] = useState([]);
  const [moduleOptions, setModuleOptions] = useState([]);

  const [availableRPTFiles, setAvailableRPTFiles] = useState([]);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [mappingTemplate, setMappingTemplate] = useState(null);
  const [mappingLoading, setMappingLoading] = useState(false);
  const [mappingNotFound, setMappingNotFound] = useState(false);
  const [parsedFields, setParsedFields] = useState([]);
  const [parsedFieldsLoading, setParsedFieldsLoading] = useState(false);
  const [mappingOptions, setMappingOptions] = useState({
    nrColumns: [],
    envColumns: [],
    envBreakageColumns: [],
    boxColumns: [],
    nrJsonKeys: [],
  });
  const [mappingOptionsLoading, setMappingOptionsLoading] = useState(false);
  const [mappingSelections, setMappingSelections] = useState({});
  const [groupBySelections, setGroupBySelections] = useState([]);

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsData, setVersionsData] = useState([]);
  const [versionsTemplate, setVersionsTemplate] = useState(null);
  const [pendingGenerateTemplate, setPendingGenerateTemplate] = useState(null);

  const [addFileList, setAddFileList] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingModuleIds, setEditingModuleIds] = useState([]);
  const [inlineEditSaving, setInlineEditSaving] = useState(false);

  const [addForm] = Form.useForm();
  const [importForm] = Form.useForm();

  const selectionReady = Boolean(projectId && projectGroupId && projectTypeId);

  const normalizeId = (value) => {
    const num = Number(value);
    return Number.isFinite(num) && num > 0 ? num : null;
  };

  const getErrorMessage = (err, fallback) => {
    if (!err) return fallback;
    const data = err?.response?.data;
    if (typeof data === "string" && data.trim()) return data;
    if (typeof data?.message === "string" && data.message.trim())
      return data.message;
    if (typeof data?.Message === "string" && data.Message.trim())
      return data.Message;
    if (Array.isArray(data) && data.length) return data.join(", ");
    if (data?.errors) {
      const first = Object.values(data.errors).flat()[0];
      if (first) return first;
    }
    if (typeof err?.message === "string" && err.message.trim())
      return err.message;
    return fallback;
  };

  const showError = (err, fallback) => {
    message.error(getErrorMessage(err, fallback));
  };

  const getErrorMessageAsync = async (err, fallback) => {
    const data = err?.response?.data;
    if (typeof Blob !== "undefined" && data instanceof Blob) {
      try {
        const text = await data.text();
        if (!text) return fallback;
        try {
          const parsed = JSON.parse(text);
          return getErrorMessage({ response: { data: parsed } }, fallback);
        } catch {
          return text;
        }
      } catch {
        return fallback;
      }
    }
    return getErrorMessage(err, fallback);
  };

  useEffect(() => {
    fetchGroup();
    fetchType();
    fetchProjects();
    fetchModules();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (!importModalOpen) return;
    importForm.resetFields();
    importForm.setFieldsValue({ copyMappings: true });
  }, [importModalOpen, importForm]);

  useEffect(() => {
    fetchProjectContext();
  }, [projectId]);

  const fetchGroup = async () => {
    try {
      const res = await axios.get(`${url}/Groups`);
      const formatted = (res.data || []).map((group) => ({
        label: group.name || group.groupName,
        value: group.id || group.groupId,
      }));
      setGroupOptions(formatted);
      if (projectGroupId) {
        const found = formatted.find((g) => g.value === projectGroupId);
        setGroupLabel(found?.label || projectGroupId);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const fetchType = async () => {
    try {
      const res = await axios.get(`${url}/PaperTypes`);
      const formatted = (res.data || []).map((type) => ({
        label: type.types,
        value: type.typeId,
      }));
      setTypeOptions(formatted);
      if (projectTypeId) {
        const found = formatted.find((t) => t.value === projectTypeId);
        setTypeLabel(found?.label || projectTypeId);
      }
    } catch (err) {
      console.error("Failed to fetch paper types", err);
    }
  };

  const fetchProjectContext = async () => {
    const normalizedProjectId = normalizeId(projectId);
    if (!normalizedProjectId) {
      setProjectGroupId(null);
      setProjectTypeId(null);
      setProjectLabel("");
      return;
    }

    setProjectLoading(true);
    try {
      const res = await axios.get(`${url}/Project`);
      const list = Array.isArray(res.data) ? res.data : [];
      const found = list.find(
        (project) =>
          normalizeId(project?.projectId ?? project?.id) === normalizedProjectId,
      );

      if (found) {
        setProjectGroupId(normalizeId(found?.groupId));
        setProjectTypeId(normalizeId(found?.typeId));
        setProjectLabel(found?.name || found?.projectName || projectName || "");
        return;
      }
    } catch (err) {
      console.error("Failed to fetch project context", err);
    } finally {
      setProjectLoading(false);
    }

    const fallbackGroup = normalizeId(localStorage.getItem("selectedGroup"));
    const fallbackType = normalizeId(localStorage.getItem("selectedType"));
    setProjectGroupId(fallbackGroup);
    setProjectTypeId(fallbackType);
    setProjectLabel(projectName || "");
  };

  const fetchProjects = async () => {
    try {
      const res = await axios.get(`${url}/Project`);
      const list = Array.isArray(res.data) ? res.data : [];
      const formatted = list
        .map((project) => ({
          label: project?.name ? project.name : `Project ${project?.projectId}`,
          value: project?.projectId,
        }))
        .filter((p) => p.value);
      setProjectOptions(formatted);
    } catch (err) {
      console.error("Failed to fetch project names", err);
      try {
        const res = await axios.get(`${APIURL}/Projects?page=1&pageSize=1000`);
        const data = Array.isArray(res.data?.data) ? res.data.data : res.data;
        const formatted = (data || []).map((project) => {
          const id = project.projectId ?? project.id;
          const name = project.name ?? project.projectName;
          return {
            label: name ? `${name} (ID ${id})` : `Project ${id}`,
            value: id,
          };
        });
        setProjectOptions(formatted.filter((p) => p.value));
      } catch (innerErr) {
        console.error("Failed to fetch projects", innerErr);
        setProjectOptions([]);
      }
    }
  };

  const fetchModules = async () => {
    try {
      const res = await axios.get(`${APIURL}/Modules`);
      const formatted = (res.data || []).map((m) => ({
        label: m.name,
        value: m.id,
      }));
      setModuleOptions(formatted);
    } catch (err) {
      console.error("Failed to fetch modules", err);
      setModuleOptions([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await axios.get(`${url}/User`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      setUserOptions(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error("Failed to fetch users", err);
      setUserOptions([]);
    }
  };


  useEffect(() => {
    if (projectGroupId && groupOptions.length > 0) {
      const found = groupOptions.find((g) => g.value === projectGroupId);
      setGroupLabel(found?.label || projectGroupId);
    } else {
      setGroupLabel("");
    }
  }, [projectGroupId, groupOptions]);

  useEffect(() => {
    if (projectTypeId && typeOptions.length > 0) {
      const found = typeOptions.find((t) => t.value === projectTypeId);
      setTypeLabel(found?.label || projectTypeId);
    } else {
      setTypeLabel("");
    }
  }, [projectTypeId, typeOptions]);

  const fetchAvailableRPTFiles = async () => {
    if (!selectionReady) return;
    setLoadingTemplates(true);
    try {
      const params = new URLSearchParams();
      params.set("typeId", projectTypeId);
      params.set("groupId", projectGroupId);
      params.set("projectId", normalizeId(projectId));
      const res = await axios.get(
        `${APIURL}/RPTTemplates/by-group?${params.toString()}`,
      );
      setAvailableRPTFiles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch available RPT files", err);
      showError(err, "Failed to fetch templates.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const fetchMappingOptions = async (template) => {
    setMappingOptionsLoading(true);
    try {
      const groupId =
        normalizeId(template?.groupId) ??
        normalizeId(projectGroupId) ??
        0;
      const typeId =
        normalizeId(template?.typeId) ??
        normalizeId(projectTypeId) ??
        0;
      const res = await axios.get(`${APIURL}/RPTTemplates/mapping-options`, {
        params: {
          groupId,
          typeId,
        },
      });
      setMappingOptions({
        nrColumns: res.data?.nrColumns || [],
        envColumns: res.data?.envColumns || [],
        envBreakageColumns: res.data?.envBreakageColumns || [],
        boxColumns: res.data?.boxColumns || [],
        nrJsonKeys: res.data?.nrJsonKeys || [],
      });
    } catch (err) {
      console.error("Failed to load mapping options", err);
      showError(err, "Failed to load mapping options.");
    } finally {
      setMappingOptionsLoading(false);
    }
  };

  useEffect(() => {
    if (selectionReady) {
      fetchAvailableRPTFiles();
    } else {
      setAvailableRPTFiles([]);
    }
  }, [projectId, projectGroupId, projectTypeId]);

  useEffect(() => {
    if (!mappingModalOpen) {
      setParsedFields([]);
      setParsedFieldsLoading(false);
      setMappingNotFound(false);
      setMappingSelections({});
      setGroupBySelections([]);
    }
  }, [mappingModalOpen]);

  const showMappingPanel = Boolean(mappingModalOpen && mappingTemplate);
  const showSidePanel = Boolean(addModalOpen || importModalOpen);

  useEffect(() => {
    if (mappingModalOpen) {
      fetchMappingOptions(mappingTemplate);
    }
  }, [mappingModalOpen, projectGroupId, projectTypeId, mappingTemplate]);

  const uploadTemplate = async ({
    groupId,
    typeId,
    templateName,
    file,
    projectId,
    moduleIds,
    forceUpload,
  }) => {
    const formData = new FormData();
    formData.append("typeId", typeId);
    formData.append("templateName", templateName);
    formData.append("file", file);
    if (groupId !== null && groupId !== undefined) {
      formData.append("groupId", groupId);
    }
    if (projectId !== null && projectId !== undefined) {
      formData.append("projectId", projectId);
    }
    if (Array.isArray(moduleIds)) {
      moduleIds.forEach((id) => formData.append("moduleIds", id));
    }
    if (forceUpload) {
      formData.append("forceUpload", "true");
    }

    const res = await axios.post(`${APIURL}/RPTTemplates/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  };

  const handleAddTemplate = async () => {
    try {
      const values = await addForm.validateFields();
      const file = addFileList[0]?.originFileObj || addFileList[0];
      if (!file) {
        message.warning("Please select a .rpt file.");
        return;
      }

      setAddSubmitting(true);
      const doUpload = async (forceUpload = false) =>
        uploadTemplate({
          groupId: projectGroupId,
          typeId: projectTypeId,
          projectId: normalizeId(projectId),
          templateName: values.templateName,
          file,
          moduleIds: values.moduleIds || [],
          forceUpload,
        });

      const onSuccess = (result) => {
        message.success("Template uploaded successfully.");
        setAddModalOpen(false);
        setAddFileList([]);
        addForm.resetFields(["templateName", "moduleIds"]);
        if (selectionReady) fetchAvailableRPTFiles();

        const uploadedTemplate = {
          templateId: result?.templateId,
          templateName: result?.templateName || values.templateName,
          groupId: projectGroupId,
          typeId: projectTypeId,
          projectId: normalizeId(projectId),
        };

        if (uploadedTemplate.templateId) {
          openMappingModal(uploadedTemplate);
        }
      };

      try {
        const result = await doUpload(false);
        onSuccess(result);
      } catch (err) {
        const allowForce =
          err?.response?.status === 409 && err?.response?.data?.allowForceUpload;
        if (allowForce) {
          setAddSubmitting(false);
          confirmForceUpload(async () => {
            const forced = await doUpload(true);
            onSuccess(forced);
          });
          return;
        }
        throw err;
      }
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to upload template", err);
      showError(err, "Failed to upload template. Please try again.");
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleImportTemplates = async () => {
    if (!selectionReady) {
      message.warning("Select a project with group and type first.");
      return;
    }

    try {
      const values = await importForm.validateFields();
      setImportSubmitting(true);
      const sourceScope = values.sourceScope || "group";
      const payload = {
        sourceScope,
        targetProjectId: normalizeId(projectId),
        targetGroupId: projectGroupId,
        targetTypeId: projectTypeId,
        copyMappings: values.copyMappings ?? true,
      };
      if (values.sourceTypeId) {
        payload.sourceTypeId = values.sourceTypeId;
      }

      if (sourceScope === "group") {
        payload.sourceGroupId = values.sourceGroupId;
        payload.includeStandard = true;
      } else if (sourceScope === "project") {
        payload.sourceProjectId = values.sourceProjectId;
      }

      await axios.post(`${APIURL}/RPTTemplates/import-from-group`, payload);
      message.success("Templates imported successfully.");
      setImportModalOpen(false);
      importForm.resetFields();
      fetchAvailableRPTFiles();
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to import templates", err);
      showError(err, "Failed to import templates. Please try again.");
    } finally {
      setImportSubmitting(false);
    }
  };

  const confirmForceUpload = (onConfirm) => {
    Modal.confirm({
      title: "No changes detected",
      content: "No changes detected between this file and the latest version.",
      okText: "Upload Anyway",
      cancelText: "Cancel",
      onOk: onConfirm,
    });
  };

  const confirmMappingUpdate = (template) => {
    Modal.confirm({
      title: "Update mapping?",
      content:
        "Do you want to update the mapping for this new template version?",
      okText: "Update Mapping",
      cancelText: "Skip",
      onOk: () => openMappingModal(template),
    });
  };

  const openMappingModal = async (template) => {
    setAddModalOpen(false);
    setImportModalOpen(false);
    cancelInlineEdit();
    setMappingTemplate(template);
    setMappingModalOpen(true);
    setMappingLoading(true);
    setMappingNotFound(false);
    setParsedFields(extractParsedFields(template));
    fetchMappingOptions(template);
    try {
      const details = await axios.get(
        `${APIURL}/RPTTemplates/${template.templateId}`,
      );
      const fieldsFromDetails = extractParsedFields(details.data);
      setParsedFields(fieldsFromDetails);
      if (!fieldsFromDetails || fieldsFromDetails.length === 0) {
        setParsedFieldsLoading(true);
        try {
          const parsedRes = await axios.post(
            `${APIURL}/RPTTemplates/${template.templateId}/parse-fields`,
          );
          const parsed = parsedRes.data?.parsedFields || [];
          setParsedFields(parsed);
        } catch (err) {
          showError(err, "Failed to parse fields for this template.");
        } finally {
          setParsedFieldsLoading(false);
        }
      }

      const res = await axios.get(
        `${APIURL}/RPTTemplates/${template.templateId}/mapping`,
      );
      const mapping = res.data?.mappingJson ?? res.data?.MappingJson ?? "";
      const parsed = parseMappingJson(mapping);
      setMappingSelections(parsed.mappings || {});
      setGroupBySelections(Array.isArray(parsed.groupBy) ? parsed.groupBy : []);
      const emptyMapping =
        Object.keys(parsed.mappings || {}).length === 0 &&
        (!parsed.groupBy || parsed.groupBy.length === 0);
      setMappingNotFound(emptyMapping);
    } catch (err) {
      if (err?.response?.status === 404) {
        setMappingSelections({});
        setGroupBySelections([]);
        setMappingNotFound(true);
      } else {
        showError(err, "Failed to load mapping.");
      }
    } finally {
      setMappingLoading(false);
    }
  };

  const closeMappingPanel = () => {
    setMappingModalOpen(false);
    setMappingTemplate(null);
  };

  const handleSaveMapping = async () => {
    if (!mappingTemplate?.templateId) return;
    setMappingLoading(true);
    try {
      const mappingsPayload = parsedFields
        .map((field) => ({
          rptField: field,
          source: mappingSelections[field],
        }))
        .filter((item) => item.source);
      const mappingPayload = {
        mappings: mappingsPayload,
        groupBy: groupBySelections || [],
      };
      const mappingJson =
        mappingsPayload.length > 0 || (groupBySelections || []).length > 0
          ? JSON.stringify(mappingPayload)
          : "";
      await axios.post(
        `${APIURL}/RPTTemplates/${mappingTemplate.templateId}/mapping`,
        {
          mappingJson,
        },
      );
      message.success("Mapping saved.");
      setMappingNotFound(false);
      closeMappingPanel();
    } catch (err) {
      console.error("Failed to save mapping", err);
      showError(err, "Failed to save mapping.");
    } finally {
      setMappingLoading(false);
    }
  };

  const handleAutoMap = () => {
    if (parsedFields.length === 0 || flatSourceOptions.length === 0) return;
    setMappingSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      parsedFields.forEach((field) => {
        if (next[field]) return;
        const match = flatSourceOptions.find(
          (option) => option.normalized === normalizeKey(field),
        );
        if (match) {
          next[field] = match.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  };

  const downloadTemplateBlob = async (template) => {
    const res = await axios.get(
      `${APIURL}/RPTTemplates/${template.templateId}/download`,
      { responseType: "blob" },
    );
    const contentDisposition = res.headers["content-disposition"] || "";
    const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
    const fileName =
      fileNameMatch?.[1] || `${template.templateName || "template"}.rpt`;
    return { blob: res.data, fileName };
  };

  const extractParsedFields = (template) => {
    if (!template) return [];
    const raw =
      template.parsedFieldsJson ??
      template.ParsedFieldsJson ??
      template.parsedFields ??
      template.ParsedFields ??
      null;
    if (Array.isArray(raw)) return raw;
    if (typeof raw === "string" && raw.trim().length > 0) {
      try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return [];
  };

  const normalizeKey = (value) =>
    (value ?? "")
      .toString()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "");

  const parseMappingJson = (raw) => {
    if (!raw) return { mappings: {}, groupBy: [] };
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        const map = {};
        parsed.forEach((item) => {
          if (item?.rptField && item?.source) map[item.rptField] = item.source;
        });
        return { mappings: map, groupBy: [] };
      }
      if (Array.isArray(parsed?.mappings)) {
        const map = {};
        parsed.mappings.forEach((item) => {
          if (item?.rptField && item?.source) map[item.rptField] = item.source;
        });
        return { mappings: map, groupBy: parsed?.groupBy || [] };
      }
      if (parsed?.mappings && typeof parsed.mappings === "object") {
        return { mappings: parsed.mappings, groupBy: parsed?.groupBy || [] };
      }
      if (parsed && typeof parsed === "object") {
        return { mappings: parsed, groupBy: [] };
      }
    } catch (err) {
      return { mappings: {}, groupBy: [] };
    }
    return { mappings: {}, groupBy: [] };
  };

  const userMap = useMemo(() => {
    const map = new Map();
    (userOptions || []).forEach((user) => {
      const id = user?.userId ?? user?.UserId;
      if (id) map.set(id, user);
    });
    return map;
  }, [userOptions]);

  const moduleMap = useMemo(() => {
    const map = new Map();
    (moduleOptions || []).forEach((m) => {
      if (m?.value) map.set(m.value, m.label);
    });
    return map;
  }, [moduleOptions]);

  const normalizeModuleIds = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) return raw.filter((id) => Number.isFinite(Number(id)));
    if (typeof raw === "string") {
      try {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.filter((id) => Number.isFinite(Number(id)));
        }
      } catch {
        // fall through to comma parsing
      }
      return raw
        .split(",")
        .map((val) => Number(val.trim()))
        .filter((id) => Number.isFinite(id));
    }
    return [];
  };

  const resolveModuleLabels = (record) => {
    const ids = normalizeModuleIds(record?.moduleIds ?? record?.ModuleIds);
    if (!ids.length) return "-";
    const labels = ids.map((id) => moduleMap.get(id) || `#${id}`);
    const visible = labels.slice(0, 2);
    if (labels.length <= 2) return visible.join(", ");
    return `${visible.join(", ")} +${labels.length - 2} more`;
  };

  const resolveModuleTooltip = (record) => {
    const ids = normalizeModuleIds(record?.moduleIds ?? record?.ModuleIds);
    if (!ids.length) return "-";
    return ids.map((id) => moduleMap.get(id) || `#${id}`).join(", ");
  };

  const getModuleDisplay = (record) => {
    const ids = normalizeModuleIds(record?.moduleIds ?? record?.ModuleIds);
    if (!ids.length) return { line1: "-", line2: "", more: 0, hasMore: false };
    const labels = ids.map((id) => moduleMap.get(id) || `#${id}`);
    const line1 = labels[0] || "-";
    const line2Labels = labels[1] ? [labels[1]] : [];
    const more = labels.length - 2;
    return {
      line1,
      line2: line2Labels.join(", "),
      more: more > 0 ? more : 0,
      hasMore: labels.length > 2,
    };
  };


  const resolveUploaderLabel = (record) => {
    const uploaderId =
      record?.uploadedByUserId ??
      record?.UploadedByUserId ??
      record?.createdByUserId ??
      record?.CreatedByUserId ??
      null;
    if (!uploaderId) return "-";
    const user = userMap.get(uploaderId);
    const name = [user?.firstName, user?.lastName].filter(Boolean).join(" ");
    return name || user?.userName || `User ${uploaderId}`;
  };

  const formatDateTime = (value) => {
    if (!value) return "-";
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return "-";
    return parsed.toLocaleString();
  };

  const getScopeLabel = (record) =>
    record?.projectId ? "Project" : record?.groupId ? "Group" : "Standard";

  const fetchTemplateVersions = async (template) => {
    if (!template?.templateName || !template?.typeId) return;
    setVersionsLoading(true);
    try {
      const res = await axios.get(`${APIURL}/RPTTemplates/versions`, {
        params: {
          templateName: template.templateName,
          typeId: template.typeId,
          groupId: template.groupId,
          projectId: template.projectId,
        },
      });
      setVersionsData(res.data || []);
    } catch (err) {
      console.error("Failed to fetch template versions", err);
      showError(err, "Failed to load template history.");
      setVersionsData([]);
    } finally {
      setVersionsLoading(false);
    }
  };

  const openVersionsModal = (template) => {
    setVersionsTemplate(template);
    setVersionsOpen(true);
    fetchTemplateVersions(template);
  };

  const closeVersionsModal = () => {
    setVersionsOpen(false);
    setVersionsTemplate(null);
    setVersionsData([]);
    setPendingGenerateTemplate(null);
  };

  const startInlineEdit = (template) => {
    setEditingTemplateId(template?.templateId ?? null);
    setEditingTemplateName(template?.templateName || "");
    setEditingModuleIds(
      normalizeModuleIds(template?.moduleIds ?? template?.ModuleIds),
    );
  };

  const cancelInlineEdit = () => {
    setEditingTemplateId(null);
    setEditingTemplateName("");
    setEditingModuleIds([]);
  };

  const saveInlineEdit = async () => {
    if (!editingTemplateId) return;
    const name = editingTemplateName.trim();
    if (!name) {
      message.warning("Template name is required.");
      return;
    }
    try {
      setInlineEditSaving(true);
      await axios.put(`${APIURL}/RPTTemplates/${editingTemplateId}`, {
        templateName: name,
        moduleIds: editingModuleIds || [],
        applyToAllVersions: true,
      });
      message.success("Template updated.");
      cancelInlineEdit();
      fetchAvailableRPTFiles();
      if (versionsOpen && versionsTemplate?.templateId === editingTemplateId) {
        fetchTemplateVersions(versionsTemplate);
      }
    } catch (err) {
      console.error("Failed to update template", err);
      showError(err, "Failed to update template.");
    } finally {
      setInlineEditSaving(false);
    }
  };

  const runReportGeneration = async (template) => {
    if (!projectId) {
      message.warning("Please select a project");
      return;
    }
    if (!template?.templateId) {
      message.warning("Template not found.");
      return;
    }
    if (!rptApiUrl) {
      message.error("RPT API URL is not configured.");
      return;
    }
    const payload = {
      projectId: Number(projectId),
      templateId: Number(template.templateId),
    };
    const messageKey = `generate-report-${payload.templateId}-${Date.now()}`;
    message.loading({
      content: "Generating report...",
      key: messageKey,
      duration: 0,
    });
    try {
      const res = await axios.post(
        `${rptApiUrl}/report/generate-dynamic`,
        payload,
        { responseType: "blob" },
      );
      const contentDisposition = res.headers["content-disposition"] || "";
      const fileNameMatch = contentDisposition.match(/filename="?([^\"]+)"?/i);
      const fileName =
        fileNameMatch?.[1] ||
        `report_template${payload.templateId}_proj${payload.projectId}.pdf`;
      const fileBlob = new Blob([res.data], { type: "application/pdf" });
      const url = window.URL.createObjectURL(fileBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      message.success({ content: "Report generated.", key: messageKey });
    } catch (err) {
      console.error("Generate report failed", err);
      const msg = await getErrorMessageAsync(err, "Failed to generate report.");
      message.error({ content: msg, key: messageKey, duration: 6 });
    }
  };

  const handleGenerateReportFromVersion = (template) => {
    if (!template) return;
    if (template?.isActive) {
      runReportGeneration(template);
      return;
    }
    setPendingGenerateTemplate(template);
  };

  const handleDownload = async (template) => {
    try {
      const { blob, fileName } = await downloadTemplateBlob(template);
      const fileBlob = new Blob([blob], { type: "application/octet-stream" });
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
      showError(err, "Failed to download template.");
    }
  };

  const rowUploadProps = (record) => ({
    accept: ".rpt",
    multiple: false,
    showUploadList: false,
    customRequest: async ({ file, onSuccess, onError }) => {
      try {
        const doUpload = async (forceUpload = false) =>
          uploadTemplate({
            groupId: projectGroupId,
            typeId: projectTypeId,
            projectId: normalizeId(projectId),
            templateName: record.templateName,
            file,
            moduleIds: record.moduleIds ?? record.ModuleIds ?? [],
            forceUpload,
          });

        const onUploadSuccess = (result) => {
          onSuccess?.("ok");
          message.success("New version uploaded.");
          fetchAvailableRPTFiles();

          const uploadedTemplate = {
            templateId: result?.templateId,
            templateName: result?.templateName || record.templateName,
            groupId: projectGroupId,
            typeId: projectTypeId,
            projectId: normalizeId(projectId),
          };

          if (uploadedTemplate.templateId) {
            confirmMappingUpdate(uploadedTemplate);
          }
        };

        try {
          const result = await doUpload(false);
          onUploadSuccess(result);
        } catch (err) {
          const allowForce =
            err?.response?.status === 409 && err?.response?.data?.allowForceUpload;
          if (allowForce) {
            confirmForceUpload(async () => {
              const forced = await doUpload(true);
              onUploadSuccess(forced);
            });
            return;
          }
          throw err;
        }
      } catch (err) {
        onError?.(err);
        console.error("Upload failed", err);
        showError(err, "Upload failed.");
      }
    },
  });

  const columns = useMemo(
    () => [
      {
        title: "Template",
        dataIndex: "templateName",
        key: "templateName",
        render: (value, record) => {
          const scopeLabel = record?.projectId
            ? "Project"
            : record?.groupId
              ? "Group"
              : "Standard";
          if (editingTemplateId === record?.templateId) {
            return (
              <Space direction="vertical" size={4}>
                <Input
                  size="small"
                  value={editingTemplateName}
                  onChange={(event) => setEditingTemplateName(event.target.value)}
                  placeholder="Template name"
                />
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {scopeLabel} template
                </Typography.Text>
              </Space>
            );
          }
          return (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {scopeLabel} template
            </Typography.Text>
          </Space>
          );
        },
      },
      {
        title: "Version",
        dataIndex: "version",
        key: "version",
        width: 100,
        render: (value) => <Tag color="blue">v{value}</Tag>,
      },
      {
        title: "Uploaded By",
        key: "uploadedBy",
        width: 160,
        render: (_, record) => (
          <Typography.Text>{resolveUploaderLabel(record)}</Typography.Text>
        ),
      },
      {
        title: "Dependent Modules",
        key: "dependentModules",
        width: 220,
        render: (_, record) => {
          if (editingTemplateId === record?.templateId) {
            return (
              <Select
                mode="multiple"
                size="small"
                options={moduleOptions}
                value={editingModuleIds}
                onChange={(values) => setEditingModuleIds(values)}
                placeholder="Select modules"
                showSearch
                optionFilterProp="label"
                style={{ width: "100%" }}
              />
            );
          }
          const display = getModuleDisplay(record);
          return (
            <Tooltip title={resolveModuleTooltip(record)}>
              <div style={{ maxWidth: 200 }}>
                <Typography.Text
                  style={{
                    display: "block",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "clip",
                    lineHeight: "1.2em",
                  }}
                >
                  {display.line1}
                </Typography.Text>
                {display.line2 || display.more > 0 ? (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <Typography.Text
                      style={{
                        flex: 1,
                        minWidth: 0,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        lineHeight: "1.2em",
                      }}
                    >
                      {display.line2}
                    </Typography.Text>
                    {display.more > 0 && (
                      <Typography.Text>
                        +{display.more > 0 ? display.more : 0} more
                      </Typography.Text>
                    )}
                  </div>
                ) : null}
              </div>
            </Tooltip>
          );
        },
      },
      {
        title: "Mapping",
        key: "mapping",
        width: 110,
        render: (_, record) => (
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => openMappingModal(record)}
          >
            Mapping
          </Button>
        ),
      },
      {
        title: "History",
        key: "history",
        width: 110,
        render: (_, record) => (
          <Button
            size="small"
            icon={<HistoryOutlined />}
            onClick={() => openVersionsModal(record)}
          >
            Versions
          </Button>
        ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 180,
        render: (_, record) =>
          editingTemplateId === record?.templateId ? (
            <Space size={6}>
              <Tooltip title="Save">
                <Button
                  size="small"
                  type="primary"
                  shape="circle"
                  icon={<CheckOutlined />}
                  onClick={saveInlineEdit}
                  loading={inlineEditSaving}
                />
              </Tooltip>
              <Tooltip title="Cancel">
                <Button
                  size="small"
                  shape="circle"
                  icon={<CloseOutlined />}
                  onClick={cancelInlineEdit}
                  disabled={inlineEditSaving}
                />
              </Tooltip>
            </Space>
          ) : (
            <Space size={6}>
              <Button
                size="small"
                title="Download"
                icon={<DownloadOutlined />}
                onClick={() => handleDownload(record)}
              >
                {" "}
              </Button>
              <Upload {...rowUploadProps(record)}>
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  title="Upload New Version"
                >
                  {" "}
                </Button>
              </Upload>
              <Button
                size="small"
                icon={<EditOutlined />}
                title="Edit Template"
                onClick={() => startInlineEdit(record)}
              >
                {" "}
              </Button>
            </Space>
          ),
      },
    ],
    [
      availableRPTFiles,
      projectGroupId,
      projectTypeId,
      projectId,
      userMap,
      moduleMap,
      moduleOptions,
      editingTemplateId,
      editingTemplateName,
      editingModuleIds,
      inlineEditSaving,
    ],
  );

  const versionsColumns = useMemo(
    () => [
      {
        title: "Version",
        dataIndex: "version",
        key: "version",
        width: 140,
        render: (value, record) => (
          <Space size={4}>
            <Tag color="blue">v{value}</Tag>
          </Space>
        ),
      },
      {
        title: "Scope",
        key: "scope",
        width: 120,
        render: (_, record) => <Tag>{getScopeLabel(record)}</Tag>,
      },
      {
        title: "Uploaded On",
        key: "uploadedOn",
        width: 180,
        render: (_, record) => (
          <Typography.Text>{formatDateTime(record?.createdDate)}</Typography.Text>
        ),
      },
      {
        title: "Uploaded By",
        key: "uploadedBy",
        width: 160,
        render: (_, record) => (
          <Typography.Text>{resolveUploaderLabel(record)}</Typography.Text>
        ),
      },
      {
        title: "Status",
        key: "status",
        width: 120,
        render: (_, record) =>
          record?.isActive ? (
            <Tag color="green">Active</Tag>
          ) : (
            <Tag>Archived</Tag>
          ),
      },
      {
        title: "Actions",
        key: "actions",
        width: 200,
        render: (_, record) => (
          <Space size={6}>
            <Button
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              Download
            </Button>
            <Button
              size="small"
              type="primary"
              onClick={() => handleGenerateReportFromVersion(record)}
            >
              Generate
            </Button>
          </Space>
        ),
      },
    ],
    [userMap],
  );

  const sourceOptionGroups = useMemo(() => {
    const options = [];
    const seen = new Set();
    const pushOptions = (items, prefix, extraLabel) => {
      if (!Array.isArray(items) || items.length === 0) return;
      items.forEach((item) => {
        const key = normalizeKey(item);
        if (seen.has(key)) return;
        seen.add(key);
        options.push({
          value: `${prefix}${item}`,
          label: extraLabel ? `${item} ${extraLabel}` : `${item}`,
          raw: item,
        });
      });
    };

    pushOptions(mappingOptions.boxColumns, "b.");
    pushOptions(mappingOptions.envColumns, "e.");
    pushOptions(mappingOptions.envBreakageColumns, "eb.");
    pushOptions(mappingOptions.nrColumns, "n.");
    pushOptions(mappingOptions.nrJsonKeys, "n.", "(json)");
    if (!seen.has(normalizeKey("SRNO"))) {
      options.push({ value: "calc:SRNO", label: "Auto SR No.", raw: "SRNO" });
      seen.add(normalizeKey("SRNO"));
    }
    return options;
  }, [mappingOptions]);

  const flatSourceOptions = useMemo(() => {
    const flattened = [];
    sourceOptionGroups.forEach((option) => {
      const baseName = option.raw ?? option.value;
      flattened.push({
        value: option.value,
        label: option.label,
        normalized: normalizeKey(baseName),
      });
    });
    return flattened;
  }, [sourceOptionGroups]);

  const mappingRows = useMemo(() => {
    const rows = parsedFields.map((field, index) => ({
      key: `${field}-${index}`,
      field,
      isMapped: Boolean(mappingSelections?.[field]),
    }));
    return rows.sort((a, b) => {
      if (a.isMapped === b.isMapped) return 0;
      return a.isMapped ? -1 : 1;
    });
  }, [parsedFields, mappingSelections]);

  useEffect(() => {
    if (!mappingModalOpen) return;
    if (parsedFields.length === 0 || flatSourceOptions.length === 0) return;
    setMappingSelections((prev) => {
      let changed = false;
      const next = { ...prev };
      parsedFields.forEach((field) => {
        if (next[field]) return;
        const match = flatSourceOptions.find(
          (option) => option.normalized === normalizeKey(field),
        );
        if (match) {
          next[field] = match.value;
          changed = true;
        }
      });
      return changed ? next : prev;
    });
  }, [mappingModalOpen, parsedFields, flatSourceOptions]);

  return (
    <div className="rpt-templates">
      <style>{`
        .rpt-templates { padding: 10px; }
        .rpt-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 16px;
          gap: 12px;
          flex-wrap: wrap;
        }
        .rpt-filters {
          display: flex;
          gap: 8px;
          align-items: flex-start;
          flex: 1;
          max-width: 720px;
          flex-wrap: wrap;
        }
        .rpt-filter { flex: 1; min-width: 170px; }
        .rpt-main {
          display: grid;
          gap: 12px;
          align-items: start;
        }
        .rpt-main--with-panel {
          grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
        }
        .rpt-main--single {
          grid-template-columns: minmax(0, 1fr);
        }
        .rpt-mapping-card-body {
          padding: 12px;
          max-height: calc(100vh - 220px);
          overflow-y: auto;
        }
        .rpt-side-panel-body {
          padding: 12px;
        }
        @media (max-width: 1200px) {
          .rpt-main--with-panel {
            grid-template-columns: minmax(0, 1fr);
          }
          .rpt-mapping-card {
            order: 2;
          }
          .rpt-side-panel {
            order: -1;
          }
        }
        @media (max-width: 768px) {
          .rpt-header {
            align-items: stretch;
          }
          .rpt-filters {
            max-width: none;
          }
          .rpt-filter {
            min-width: 140px;
          }
          .rpt-mapping-card-body {
            max-height: none;
          }
        }
      `}</style>
      <div className="rpt-header">
        <Typography.Title level={4} style={{ margin: 0 }}>
          Project Templates
        </Typography.Title>
        <div className="rpt-filters">
          <div className="rpt-filter">
            <Input
              placeholder="Project"
              value={
                projectLoading
                  ? "Loading project..."
                  : projectLabel ||
                    projectName ||
                    (projectId ? `Project ${projectId}` : "")
              }
              size="large"
              disabled
            />
            {!projectId && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Please select a project
              </Typography.Text>
            )}
          </div>
          <div className="rpt-filter">
            <Input
              placeholder="Group"
              value={groupLabel || ""}
              size="large"
              disabled
            />
            {!projectGroupId && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Group is missing for this project
              </Typography.Text>
            )}
          </div>
          <div className="rpt-filter">
            <Input
              placeholder="Type"
              value={typeLabel || ""}
              size="large"
              disabled
            />
            {!projectTypeId && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Type is missing for this project
              </Typography.Text>
            )}
          </div>
        </div>
      </div>

      <div
        className={`rpt-main ${
          showMappingPanel || showSidePanel
            ? "rpt-main--with-panel"
            : "rpt-main--single"
        }`}
      >
        <Card
          style={{ borderRadius: 12 }}
          bodyStyle={{ padding: 16 }}
          title={
            <Space>
              <Typography.Text strong>Templates</Typography.Text>
              {selectionReady && (
                <>
                  <Tag>Project</Tag>
                  <Tag>{groupLabel}</Tag>
                  <Tag>{typeLabel}</Tag>
                </>
              )}
            </Space>
          }
          extra={
            <Space>
              <Button
              title=" Refresh"
                icon={<ReloadOutlined />}
                onClick={fetchAvailableRPTFiles}
                disabled={!selectionReady}
              >
               
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  setAddModalOpen(true);
                  setImportModalOpen(false);
                  setMappingModalOpen(false);
                  setMappingTemplate(null);
                  cancelInlineEdit();
                }}
                disabled={!selectionReady}
              >
                Add
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => {
                  setImportModalOpen(true);
                  setAddModalOpen(false);
                  setMappingModalOpen(false);
                  setMappingTemplate(null);
                  cancelInlineEdit();
                  importForm.resetFields();
                  importForm.setFieldsValue({ copyMappings: true });
                }}
                disabled={!selectionReady}
              >
                Import
              </Button>
            </Space>
          }
        >
          {!selectionReady ? (
            <Empty
              description="Select a project with group and type to view templates."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : availableRPTFiles.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={6}>
                  <Typography.Text>
                    No templates found for this project.
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    Uploading here creates a project-only version.
                  </Typography.Text>
                </Space>
              }
            >
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => {
                    setAddModalOpen(true);
                    setImportModalOpen(false);
                    setMappingModalOpen(false);
                    setMappingTemplate(null);
                    cancelInlineEdit();
                  }}
                >
                  Add Template
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => {
                    setImportModalOpen(true);
                    setAddModalOpen(false);
                    setMappingModalOpen(false);
                    setMappingTemplate(null);
                    cancelInlineEdit();
                    importForm.resetFields();
                    importForm.setFieldsValue({ copyMappings: true });
                  }}
                  disabled={!selectionReady}
                >
                  Import Templates
                </Button>
              </Space>
            </Empty>
          ) : (
            <Table
              rowKey="templateId"
              dataSource={availableRPTFiles}
              columns={columns}
              pagination={false}
              loading={loadingTemplates}
            />
          )}
        </Card>

        {showSidePanel && (
          <Card
            style={{ borderRadius: 12 }}
            bodyStyle={{ padding: 0 }}
            className="rpt-side-panel"
            title={
              <Space style={{ display: "flex", justifyContent: "space-between" }}>
                <Typography.Text strong>
                  {addModalOpen ? "Add Template" : "Import Templates"}
                </Typography.Text>
                <Button
                  size="small"
                  icon={<CloseOutlined />}
                  onClick={() => {
                    setAddModalOpen(false);
                    setImportModalOpen(false);
                  }}
                />
              </Space>
            }
          >
            <div className="rpt-side-panel-body">
              {addModalOpen ? (
                <Form layout="vertical" form={addForm}>
                  <Form.Item
                    label="Template Name"
                    name="templateName"
                    rules={[{ required: true, message: "Template name is required" }]}
                  >
                    <Input placeholder="Enter template name" />
                  </Form.Item>
                  <Form.Item label="Project" style={{ marginBottom: 8 }}>
                    <Input
                      value={projectLabel || projectName || ""}
                      placeholder="Project"
                      disabled
                    />
                  </Form.Item>
                  <Form.Item label="Group" style={{ marginBottom: 8 }}>
                    <Input value={groupLabel || ""} placeholder="Group" disabled />
                  </Form.Item>
                  <Form.Item label="Type" style={{ marginBottom: 8 }}>
                    <Input value={typeLabel || ""} placeholder="Type" disabled />
                  </Form.Item>
                  <Form.Item
                    label="Modules"
                    name="moduleIds"
                    rules={[{ required: true, message: "Select at least one module" }]}
                  >
                    <Select
                      mode="multiple"
                      options={moduleOptions}
                      placeholder="Select modules"
                      showSearch
                      optionFilterProp="label"
                    />
                  </Form.Item>
                  <Form.Item label="RPT File">
                    <Upload.Dragger
                      accept=".rpt"
                      multiple={false}
                      beforeUpload={() => false}
                      onChange={(info) => setAddFileList(info.fileList.slice(-1))}
                      onRemove={() => setAddFileList([])}
                      fileList={addFileList}
                    >
                      <p className="ant-upload-drag-icon">
                        <InboxOutlined />
                      </p>
                      <p className="ant-upload-text">
                        Click or drag an RPT file to upload
                      </p>
                      <p className="ant-upload-hint">
                        Only .rpt files are supported.
                      </p>
                    </Upload.Dragger>
                  </Form.Item>
                  <Space style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button onClick={() => setAddModalOpen(false)}>Cancel</Button>
                    <Button
                      type="primary"
                      onClick={handleAddTemplate}
                      loading={addSubmitting}
                    >
                      Upload Template
                    </Button>
                  </Space>
                </Form>
              ) : (
                <Form
                  layout="vertical"
                  form={importForm}
                  initialValues={{ copyMappings: true }}
                  preserve={false}
                >
                  <Form.Item label="Target Project" style={{ marginBottom: 8 }}>
                    <Input
                      value={
                        projectLabel ||
                        projectName ||
                        (projectId ? `Project ${projectId}` : "")
                      }
                      placeholder="Target Project"
                      disabled
                    />
                  </Form.Item>

                  <Form.Item
                    label="Import From"
                    name="sourceScope"
                    rules={[
                      {
                        validator: (_, value) =>
                          value
                            ? Promise.resolve()
                            : Promise.reject("Import source is required"),
                      },
                    ]}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      options={[
                        { label: "Select import source", value: "", disabled: true },
                        { label: "Standard Templates", value: "standard" },
                        { label: "Group Templates (includes standard)", value: "group" },
                        { label: "Project Templates", value: "project" },
                      ]}
                      placeholder="Select import source"
                      showSearch
                      optionFilterProp="label"
                      allowClear
                    />
                  </Form.Item>

                  <Form.Item shouldUpdate noStyle>
                    {({ getFieldValue }) => {
                      const scope = getFieldValue("sourceScope");
                      if (scope === "group") {
                        return (
                          <Form.Item
                            label="Source Group"
                            name="sourceGroupId"
                            rules={[
                              {
                                validator: (_, value) =>
                                  value
                                    ? Promise.resolve()
                                    : Promise.reject("Source group is required"),
                              },
                            ]}
                            style={{ marginBottom: 8 }}
                          >
                            <Select
                              options={[
                                {
                                  label: "Select source group",
                                  value: "",
                                  disabled: true,
                                },
                                ...groupOptions,
                              ]}
                              placeholder="Select source group"
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </Form.Item>
                        );
                      }
                      if (scope === "project") {
                        return (
                          <Form.Item
                            label="Source Project"
                            name="sourceProjectId"
                            rules={[
                              {
                                validator: (_, value) =>
                                  value
                                    ? Promise.resolve()
                                    : Promise.reject("Source project is required"),
                              },
                            ]}
                            style={{ marginBottom: 8 }}
                          >
                            <Select
                              options={[
                                {
                                  label: "Select source project",
                                  value: "",
                                  disabled: true,
                                },
                                ...projectOptions,
                              ]}
                              placeholder="Select source project"
                              showSearch
                              optionFilterProp="label"
                              allowClear
                            />
                          </Form.Item>
                        );
                      }
                      return null;
                    }}
                  </Form.Item>

                  <Form.Item
                    label="Source Type"
                    name="sourceTypeId"
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      options={[
                        { label: "All types (optional)", value: "", disabled: true },
                        ...typeOptions,
                      ]}
                      placeholder="All types (optional)"
                      showSearch
                      optionFilterProp="label"
                      allowClear
                    />
                  </Form.Item>

                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 12,
                      marginBottom: 16,
                    }}
                  >
                    <div>
                      <Typography.Text strong>Copy mappings</Typography.Text>
                      <Typography.Text type="secondary" style={{ display: "block" }}>
                        If enabled, existing mappings are cloned as well.
                      </Typography.Text>
                    </div>
                    <Form.Item
                      name="copyMappings"
                      valuePropName="checked"
                      initialValue={true}
                      style={{ marginBottom: 0 }}
                    >
                      <Switch />
                    </Form.Item>
                  </div>
                  <Space style={{ display: "flex", justifyContent: "flex-end" }}>
                    <Button onClick={() => setImportModalOpen(false)}>Cancel</Button>
                    <Button
                      type="primary"
                      onClick={handleImportTemplates}
                      loading={importSubmitting}
                    >
                      Import Templates
                    </Button>
                  </Space>
                </Form>
              )}
            </div>
          </Card>
        )}

        {showMappingPanel && (
          <Card
            style={{
              borderRadius: 12,
            }}
            bodyStyle={{ padding: 0 }}
            className="rpt-mapping-card"
            title={
              <Space direction="vertical" size={2} style={{ width: "100%" }}>
                <Space style={{ display: "flex", justifyContent: "space-between" }}>
                  <Typography.Text strong>Template Mapping ( {mappingTemplate?.templateName || "Selected template"})</Typography.Text>
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={closeMappingPanel}
                  />
                </Space>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                 
                  Update mapping and group-by for the selected template.
                </Typography.Text>
              </Space>
            }
          >
            <div className="rpt-mapping-card-body">
            {mappingNotFound && (
              <Typography.Text
                type="secondary"
                style={{ display: "block", marginBottom: 8 }}
              >
                No saved mapping found for this template yet.
              </Typography.Text>
            )}
            
            <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
              <Space
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: 8,
                }}
              >
                <Typography.Text strong>Field Mapping</Typography.Text>
                <Button onClick={handleAutoMap} disabled={mappingOptionsLoading}>
                  Auto-map
                </Button>
              </Space>
              {mappingOptionsLoading ? (
                <Typography.Text type="secondary">
                  Loading available columns...
                </Typography.Text>
              ) : parsedFields.length === 0 ? (
                <Typography.Text type="secondary">
                  No parsed fields to map for this template.
                </Typography.Text>
              ) : (
                <Table
                  dataSource={mappingRows}
                  pagination={false}
                  size="small"
                  scroll={{ y: 260 }}
                  columns={[
                    {
                      title: "RPT Field",
                      dataIndex: "field",
                      key: "field",
                      width: "45%",
                      render: (value) => <Typography.Text>{value}</Typography.Text>,
                    },
                    {
                      title: "Map To Column",
                      key: "mapTo",
                      render: (_, record) => (
                        <Select
                          showSearch
                          allowClear
                          placeholder="Select source column"
                          value={mappingSelections[record.field]}
                          options={sourceOptionGroups}
                          style={{ width: "100%" }}
                          filterOption={(input, option) =>
                            (option?.label ?? "")
                              .toString()
                              .toLowerCase()
                              .includes(input.toLowerCase())
                          }
                          onChange={(value) =>
                            setMappingSelections((prev) => ({
                              ...prev,
                              [record.field]: value,
                            }))
                          }
                        />
                      ),
                    },
                  ]}
                />
              )}
            </Card>
            <Card size="small" bodyStyle={{ padding: 12 }}>
              <Typography.Text strong>Group By</Typography.Text>
              <Typography.Text type="secondary" style={{ display: "block" }}>
                Select one or more columns to group the report output.
              </Typography.Text>
              <Select
                mode="multiple"
                allowClear
                placeholder="Choose group by columns"
                options={sourceOptionGroups}
                value={groupBySelections}
                onChange={(values) => setGroupBySelections(values)}
                style={{ width: "100%", marginTop: 8 }}
                filterOption={(input, option) =>
                  (option?.label ?? "")
                    .toString()
                    .toLowerCase()
                    .includes(input.toLowerCase())
                }
              />
            </Card>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 12 }}>
              <Button
                type="primary"
                onClick={handleSaveMapping}
                loading={mappingLoading}
                disabled={!mappingTemplate?.templateId}
              >
                Save Mapping
              </Button>
            </div>
          </div>
          </Card>
        )}
      </div>

      <Modal
        title={`Template Versions${versionsTemplate?.templateName ? ` - ${versionsTemplate.templateName}` : ""}`}
        open={versionsOpen}
        onCancel={closeVersionsModal}
        footer={null}
        width={860}
      >
        <Space direction="vertical" size={8} style={{ width: "100%" }}>
          <Typography.Text type="secondary">
            Showing all saved versions for this template.
          </Typography.Text>
          {pendingGenerateTemplate && (
            <Card
              size="small"
              style={{ background: "#fff7e6", borderColor: "#ffd591" }}
              bodyStyle={{ padding: 12 }}
            >
              <Space
                align="start"
                style={{ display: "flex", justifyContent: "space-between" }}
              >
                <Space>
                  <ExclamationCircleOutlined style={{ color: "#d46b08" }} />
                  <Typography.Text>
                    You are using version v{pendingGenerateTemplate.version}. Output
                    may differ from the latest template.
                  </Typography.Text>
                </Space>
                <Space>
                  <Button
                    size="small"
                    onClick={() => setPendingGenerateTemplate(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => {
                      const target = pendingGenerateTemplate;
                      setPendingGenerateTemplate(null);
                      runReportGeneration(target);
                    }}
                  >
                    Generate
                  </Button>
                </Space>
              </Space>
            </Card>
          )}
          <Table
            rowKey="templateId"
            dataSource={versionsData}
            columns={versionsColumns}
            pagination={false}
            loading={versionsLoading}
            locale={{ emptyText: "No versions found." }}
          />
        </Space>
      </Modal>

    </div>
  );
};

export default ProjectTemplates;
