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
import { MessageService } from "../services/MessageService";
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
import {
  extractParsedFields,
  buildReportFileName,
  getErrorMessage,
  getErrorMessageAsync,
  getScopeLabel,
  normalizeId,
  normalizeKey,
  normalizeModuleIds,
  parseMappingJson,
  resolveTemplateId,
} from "../utils/rptTemplateUtils";
import {
  buildTemplateColumns,
  buildVersionsColumns,
  rptTemplatesStyles,
} from "../components/rpt/rptTemplatesShared";
import {
  activateTemplateVersion as activateTemplateVersionService,
  downloadTemplateBlob as downloadTemplateBlobService,
  fetchGroupOptions,
  fetchMappingOptions as fetchMappingOptionsService,
  fetchModuleOptions,
  fetchProjectOptions,
  fetchTemplateDetails,
  fetchTemplateMapping,
  fetchTemplateVersions as fetchTemplateVersionsService,
  fetchTemplatesByGroup,
  fetchTypeOptions,
  fetchUsers as fetchUsersService,
  importTemplatesFromGroup,
  parseTemplateFields,
  restoreTemplate,
  saveTemplateMapping,
  softDeleteTemplate,
  updateTemplate,
  uploadTemplate as uploadTemplateService,
} from "../services/rptTemplatesService";
import ProjectTemplatesHeader from "./components/ProjectTemplates/ProjectTemplatesHeader";
import TemplatesCard from "../components/rpt/TemplatesCard";
import TemplatesSidePanel from "../components/rpt/TemplatesSidePanel";
import TemplatesMappingPanel from "../components/rpt/TemplatesMappingPanel";
import TemplatesVersionsModal from "../components/rpt/TemplatesVersionsModal";

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
  const [mappingOptions, setMappingOptions] = useState([]);
  const [mappingOptionsLoading, setMappingOptionsLoading] = useState(false);
  const [mappingSelections, setMappingSelections] = useState({});
  const [groupBySelections, setGroupBySelections] = useState([]);
  const [orderBySelections, setOrderBySelections] = useState([]);
  const [labelCopies, setLabelCopies] = useState(1);
  const [mappingPinnedFields, setMappingPinnedFields] = useState([]);
  const [staticVariables, setStaticVariables] = useState({});

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsData, setVersionsData] = useState([]);
  const [versionsTemplate, setVersionsTemplate] = useState(null);
  const [pendingGenerateTemplate, setPendingGenerateTemplate] = useState(null);
  const [activatingVersionId, setActivatingVersionId] = useState(null);
  // const templateId = selectedTemplate?.templateId || null;

  const [addFileList, setAddFileList] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importAvailability, setImportAvailability] = useState({
    loading: false,
    standardTypes: [],
    groupTypes: {},
    projectTypes: {},
  });
  const [editingTemplateId, setEditingTemplateId] = useState(null);
  const [editingTemplateName, setEditingTemplateName] = useState("");
  const [editingModuleIds, setEditingModuleIds] = useState([]);
  const [inlineEditSaving, setInlineEditSaving] = useState(false);
  const [editingVersionId, setEditingVersionId] = useState(null);
  const [editingVersionOptions, setEditingVersionOptions] = useState([]);
  const [editingVersionsLoading, setEditingVersionsLoading] = useState(false);

  const [addForm] = Form.useForm();
  const [importForm] = Form.useForm();
  const importScope = Form.useWatch("sourceScope", importForm);
  const importGroupId = Form.useWatch("sourceGroupId", importForm);
  const importProjectId = Form.useWatch("sourceProjectId", importForm);
  const importTypeId = Form.useWatch("sourceTypeId", importForm);

  const selectionReady = Boolean(projectId && projectGroupId && projectTypeId);

  const showError = (err, fallback) => {
    message.error(getErrorMessage(err, fallback));
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
    if (importModalOpen) {
      loadImportAvailability();
    }
  }, [importModalOpen, typeOptions, groupOptions, projectOptions]);

  useEffect(() => {
    fetchProjectContext();
  }, [projectId]);

  const fetchGroup = async () => {
    try {
      const formatted = await fetchGroupOptions(url);
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
      const formatted = await fetchTypeOptions(url);
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
      const formatted = await fetchProjectOptions({
        baseUrl: url,
        apiUrl: APIURL,
        normalizeId,
      });
      setProjectOptions(formatted);
    } catch (err) {
      console.error("Failed to fetch project names", err);
      setProjectOptions([]);
    }
  };

  const fetchModules = async () => {
    try {
      const formatted = await fetchModuleOptions(APIURL);
      setModuleOptions(formatted);
    } catch (err) {
      console.error("Failed to fetch modules", err);
      setModuleOptions([]);
    }
  };

  const fetchUsers = async () => {
    try {
      const data = await fetchUsersService({ baseUrl: url, token });
      setUserOptions(data);
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
      const data = await fetchTemplatesByGroup(APIURL, {
        typeId: projectTypeId,
        groupId: projectGroupId,
        projectId: normalizeId(projectId),
      });
      setAvailableRPTFiles(data || []);
    } catch (err) {
      console.error("Failed to fetch available RPT files", err);
      showError(err, "Failed to fetch templates.");
    } finally {
      setLoadingTemplates(false);
    }
  };

  const loadImportAvailability = async () => {
    if (!importModalOpen || typeOptions.length === 0) return;
    setImportAvailability((prev) => ({ ...prev, loading: true }));

    const standardTypes = [];
    const groupTypes = {};
    const projectTypes = {};

    try {
      for (const type of typeOptions) {
        const data = await fetchTemplatesByGroup(APIURL, { typeId: type.value });
        const hasStandard = (data || []).some(
          (item) => !normalizeId(item?.groupId) && !normalizeId(item?.projectId),
        );
        if (hasStandard) {
          standardTypes.push(type.value);
        }
      }

      for (const group of groupOptions) {
        const typeIds = [];
        for (const type of typeOptions) {
          const data = await fetchTemplatesByGroup(APIURL, {
            typeId: type.value,
            groupId: group.value,
          });
          const hasGroupTemplate = (data || []).some(
            (item) =>
              normalizeId(item?.groupId) === normalizeId(group.value) &&
              !normalizeId(item?.projectId),
          );
          if (hasGroupTemplate) {
            typeIds.push(type.value);
          }
        }
        if (typeIds.length > 0) {
          groupTypes[group.value] = typeIds;
        }
      }

      for (const project of projectOptions) {
        const typeCandidates = project?.typeId
          ? [project.typeId]
          : typeOptions.map((type) => type.value);
        const typeIds = [];
        for (const typeId of typeCandidates) {
          const data = await fetchTemplatesByGroup(APIURL, {
            typeId,
            groupId: project?.groupId,
            projectId: project?.value,
          });
          const hasProjectTemplate = (data || []).some(
            (item) => normalizeId(item?.projectId) === normalizeId(project?.value),
          );
          if (hasProjectTemplate) {
            typeIds.push(typeId);
          }
        }
        if (typeIds.length > 0) {
          projectTypes[project.value] = typeIds;
        }
      }
    } catch (err) {
      console.error("Failed to load import availability", err);
    } finally {
      setImportAvailability({
        loading: false,
        standardTypes,
        groupTypes,
        projectTypes,
      });
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
      const options = await fetchMappingOptionsService(APIURL, {
        groupId,
        typeId,
        projectId: normalizeId(template?.projectId) ?? normalizeId(projectId) ?? undefined,
        templateId: normalizeId(template?.templateId) ?? undefined,
      });
      setMappingOptions(options);
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
      setOrderBySelections([]);
      setLabelCopies(1);
      setMappingPinnedFields([]);
      setStaticVariables({});
    }
  }, [mappingModalOpen]);

  const showMappingPanel = Boolean(mappingModalOpen && mappingTemplate);
  const showSidePanel = Boolean(addModalOpen || importModalOpen);

  const filteredGroupOptions = useMemo(() => {
    if (importAvailability.loading) return groupOptions;
    return groupOptions.filter(
      (group) => (importAvailability.groupTypes[group.value] || []).length > 0,
    );
  }, [groupOptions, importAvailability]);

  const filteredProjectOptions = useMemo(() => {
    if (importAvailability.loading) return projectOptions;
    return projectOptions.filter(
      (project) =>
        (importAvailability.projectTypes[project.value] || []).length > 0,
    );
  }, [projectOptions, importAvailability]);

  const standardTypeOptions = useMemo(() => {
    if (importAvailability.loading) return typeOptions;
    return typeOptions.filter((type) =>
      importAvailability.standardTypes.includes(type.value),
    );
  }, [typeOptions, importAvailability]);

  const groupTypeOptions = useMemo(() => {
    if (!importGroupId) return [];
    if (importAvailability.loading) return typeOptions;
    const typesForGroup = importAvailability.groupTypes[importGroupId] || [];
    return typeOptions.filter((type) => typesForGroup.includes(type.value));
  }, [typeOptions, importAvailability, importGroupId]);

  const projectTypeOptions = useMemo(() => {
    if (!importProjectId) return [];
    if (importAvailability.loading) return typeOptions;
    const typesForProject = importAvailability.projectTypes[importProjectId] || [];
    return typeOptions.filter((type) => typesForProject.includes(type.value));
  }, [typeOptions, importAvailability, importProjectId]);

  const sourceTypeOptions = useMemo(() => {
    if (importScope === "standard") return standardTypeOptions;
    if (importScope === "group") return groupTypeOptions;
    if (importScope === "project") return projectTypeOptions;
    return typeOptions;
  }, [importScope, standardTypeOptions, groupTypeOptions, projectTypeOptions, typeOptions]);

  const disableSourceTypeSelect =
    (importScope === "group" && !importGroupId) ||
    (importScope === "project" && !importProjectId);

  const selectedImportProjectType = useMemo(() => {
    if (!importProjectId) return null;
    const match = projectOptions.find((project) => project.value === importProjectId);
    return match ? normalizeId(match.typeId) : null;
  }, [importProjectId, projectOptions]);

  useEffect(() => {
    if (importScope === "project") {
      if (selectedImportProjectType) {
        importForm.setFieldsValue({ sourceTypeId: selectedImportProjectType });
      } else {
        importForm.setFieldsValue({ sourceTypeId: undefined });
      }
    }
  }, [importScope, selectedImportProjectType, importForm]);

  const sourceScopeOptions = useMemo(() => {
    const allowAll = importAvailability.loading;
    const standardAvailable = allowAll ? true : standardTypeOptions.length > 0;
    const groupAvailable = allowAll ? true : filteredGroupOptions.length > 0;
    const projectAvailable = allowAll ? true : filteredProjectOptions.length > 0;
    return [
      { label: "Select import source", value: "", disabled: true },
      {
        label: "Standard Templates",
        value: "standard",
        disabled: !standardAvailable,
      },
      {
        label: "Group Templates (includes standard)",
        value: "group",
        disabled: !groupAvailable,
      },
      { label: "Project Templates", value: "project", disabled: !projectAvailable },
    ];
  }, [standardTypeOptions, filteredGroupOptions, filteredProjectOptions]);

  useEffect(() => {
    if (!importModalOpen) return;
    if (importScope === "group" && importGroupId) {
      if (!filteredGroupOptions.some((opt) => opt.value === importGroupId)) {
        importForm.setFieldsValue({ sourceGroupId: undefined });
      }
    }
    if (importScope === "project" && importProjectId) {
      if (!filteredProjectOptions.some((opt) => opt.value === importProjectId)) {
        importForm.setFieldsValue({ sourceProjectId: undefined });
      }
    }
    if (
      importTypeId &&
      !sourceTypeOptions.some((opt) => opt.value === importTypeId) &&
      importScope !== "project"
    ) {
      importForm.setFieldsValue({ sourceTypeId: undefined });
    }
  }, [
    importModalOpen,
    importScope,
    importGroupId,
    importProjectId,
    importTypeId,
    filteredGroupOptions,
    filteredProjectOptions,
    sourceTypeOptions,
    importForm,
    importScope,
  ]);

  useEffect(() => {
    if (mappingModalOpen) {
      fetchMappingOptions(mappingTemplate);
    }
  }, [mappingModalOpen, projectGroupId, projectTypeId, mappingTemplate]);

  const uploadTemplate = async (params) => {
    const {
      groupId,
      typeId,
      templateName,
      templateId,
      file,
      projectId,
      moduleIds,
      forceUpload,
    } = params;
    
    const formData = new FormData();
    formData.append("typeId", typeId);
    formData.append("templateName", templateName);
    if (templateId) {
      formData.append("templateId", templateId);
    }
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

    const data = res.data;

    if (data.requireConfirmation && !forceUpload) {
      if (data.designCheck?.changed === true) {
        const confirmed = await MessageService.confirm(
          <div>
            <p>
              <b>
                {data.designCheck.message ||
                  "Differences were found between your file and the active template."}
              </b>
            </p>
            {data.designCheck.changes && data.designCheck.changes.length > 0 && (
              <ul className="mt-2 list-disc pl-4 text-[10px] space-y-1">
                {data.designCheck.changes.map((change, index) => (
                  <li key={index}>{change}</li>
                ))}
              </ul>
            )}
            {!data.designCheck.changes && <p>No detailed changes available</p>}
          </div>,
          {
            title: "Design Changes Detected",
            confirmText: "Proceed",
            cancelText: "Cancel",
            type: 'warning'
          }
        );

        if (confirmed) {
          return await uploadTemplate({
            ...params,
            forceUpload: true,
          });
        }
        throw new Error("User cancelled upload");
      } else {
        const confirmed = await MessageService.confirm(
          "No changes detected. Do you still want to upload the template?",
          {
            title: "No Design Change",
            confirmText: "Upload Anyway",
            cancelText: "Cancel",
            type: 'info'
          }
        );

        if (confirmed) {
          return await uploadTemplate({
            ...params,
            forceUpload: true,
          });
        }
        throw new Error("User cancelled upload");
      }
    }

    return data;
  };

  const handleAddSubmit = async () => {
    try {
      const values = await addForm.validateFields();
      if (!addFileList || addFileList.length === 0) {
        message.warning("Please select a file to upload.");
        return;
      }
      setAddSubmitting(true);
      const file = addFileList[0].originFileObj || addFileList[0];
      
      const result = await uploadTemplate({
        groupId: projectGroupId,
        typeId: projectTypeId,
        projectId: normalizeId(projectId),
        templateName: values.templateName,
        file,
        moduleIds: values.moduleIds
      });

      message.success("Upload successful");
      setAddModalOpen(false);
      addForm.resetFields();
      setAddFileList([]);
      fetchAvailableRPTFiles();
      confirmMappingUpdate({
        templateId: result?.templateId,
        templateName: values.templateName,
        groupId: projectGroupId,
        typeId: projectTypeId,
        projectId: normalizeId(projectId),
      });
    } catch (err) {
      if (err.message !== "User cancelled upload") {
        showError(err, "Upload failed.");
      }
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
      if (values.sourceScope === "project" && !selectedImportProjectType) {
        message.warning("Selected project has no type configured.");
        return;
      }
      setImportSubmitting(true);
      const sourceScope = values.sourceScope || "group";
      const payload = {
        sourceScope,
        targetProjectId: normalizeId(projectId),
        targetGroupId: projectGroupId,
        targetTypeId: projectTypeId,
        copyMappings: values.copyMappings ?? true,
      };
      if (sourceScope === "group") {
        payload.sourceGroupId = values.sourceGroupId;
        payload.includeStandard = true;
        payload.sourceTypeId = values.sourceTypeId;
      } else if (sourceScope === "standard") {
        payload.sourceTypeId = values.sourceTypeId;
      } else if (sourceScope === "project") {
        payload.sourceProjectId = values.sourceProjectId;
        payload.sourceTypeId = selectedImportProjectType;
      }

      await importTemplatesFromGroup(APIURL, payload);
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

  const confirmForceUpload = async (onConfirm) => {
    const confirmed = await MessageService.confirm(
      "No changes detected between this file and the latest version.",
      {
        title: "No changes detected",
        confirmText: "Upload Anyway",
        cancelText: "Cancel",
        type: 'info'
      }
    );
    if (confirmed) onConfirm();
  };

  const confirmMappingUpdate = async (template) => {
    const confirmed = await MessageService.confirm(
      "Do you want to update the mapping for this new template version?",
      {
        title: "Update mapping?",
        confirmText: "Update Mapping",
        cancelText: "Skip",
        type: 'confirm'
      }
    );
    if (confirmed) openMappingModal(template);
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
      const details = await fetchTemplateDetails(
        APIURL,
        template.templateId,
      );
      const fieldsFromDetails = extractParsedFields(details);
      setParsedFields(fieldsFromDetails);
      if (!fieldsFromDetails || fieldsFromDetails.length === 0) {
        setParsedFieldsLoading(true);
        try {
          const parsedRes = await parseTemplateFields(
            APIURL,
            template.templateId,
          );
          const parsed = parsedRes?.parsedFields || [];
          setParsedFields(parsed);
        } catch (err) {
          showError(err, "Failed to parse fields for this template.");
        } finally {
          setParsedFieldsLoading(false);
        }
      }

      const res = await fetchTemplateMapping(APIURL, template.templateId);
      const mapping = res?.mappingJson ?? res?.MappingJson ?? "";
      const parsed = parseMappingJson(mapping);
      setMappingSelections(parsed.mappings || {});
      setGroupBySelections(Array.isArray(parsed.groupBy) ? parsed.groupBy : []);
      setOrderBySelections(Array.isArray(parsed.orderBy) ? parsed.orderBy : []);
      setLabelCopies(Number.isFinite(parsed.labelCopies) && parsed.labelCopies >= 1 ? parsed.labelCopies : 1);
      setStaticVariables(parsed.staticVariables || {});
      setMappingPinnedFields(Object.keys(parsed.mappings || {}));
      const emptyMapping =
        Object.keys(parsed.mappings || {}).length === 0 &&
        (!parsed.groupBy || parsed.groupBy.length === 0);
      setMappingNotFound(emptyMapping);
    } catch (err) {
      if (err?.response?.status === 404) {
        setMappingSelections({});
        setGroupBySelections([]);
        setMappingNotFound(true);
        setMappingPinnedFields([]);
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

  const recordMappingUpdate = (templateId) => {
    if (!templateId) return;
    const key = "rptTemplateMappingUpdatedAt";
    const now = new Date().toISOString();
    try {
      const raw = localStorage.getItem(key);
      const parsed = raw ? JSON.parse(raw) : {};
      const next = parsed && typeof parsed === "object" ? { ...parsed } : {};
      next[templateId] = now;
      localStorage.setItem(key, JSON.stringify(next));
    } catch (err) {
      localStorage.setItem(key, JSON.stringify({ [templateId]: now }));
    }
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
        orderBy: orderBySelections || [],
        labelCopies: labelCopies ?? 1,
        staticVariables: staticVariables || {},
      };
      const hasContent =
        mappingsPayload.length > 0 ||
        (groupBySelections || []).length > 0 ||
        (orderBySelections || []).length > 0 ||
        (labelCopies ?? 1) > 1 ||
        Object.keys(staticVariables || {}).length > 0;
      const mappingJson = hasContent ? JSON.stringify(mappingPayload) : "";
      await saveTemplateMapping(
        APIURL,
        mappingTemplate.templateId,
        mappingJson,
      );
      message.success("Mapping saved.");
      setMappingNotFound(false);
      recordMappingUpdate(mappingTemplate.templateId);
      setAvailableRPTFiles((prev) =>
        prev.map((t) =>
          t.templateId === mappingTemplate.templateId
            ? { ...t, hasMapping: true, mappingWarning: null }
            : t
        )
      );
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

  const fetchTemplateVersions = async (template) => {
    if (!template?.templateName || !template?.typeId) return;
    setVersionsLoading(true);
    try {
      const data = await fetchTemplateVersionsService(APIURL, {
        templateName: template.templateName,
        typeId: template.typeId,
        groupId: template.groupId,
        projectId: template.projectId,
      });
      setVersionsData(data || []);
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
    setActivatingVersionId(null);
  };

  const activateTemplateVersion = async (record) => {
    const templateId = resolveTemplateId(record);
    if (!templateId) {
      message.warning("Template not found.");
      return;
    }
    setActivatingVersionId(templateId);
    try {
      await activateTemplateVersionService(APIURL, templateId);
      message.success("Template activated.");
      recordMappingUpdate(templateId);
      if (versionsTemplate) {
        fetchTemplateVersions(versionsTemplate);
      }
      fetchAvailableRPTFiles();
    } catch (err) {
      console.error("Failed to activate template", err);
      showError(err, "Failed to activate template.");
    } finally {
      setActivatingVersionId(null);
    }
  };

  const confirmActivateVersion = async (record) => {
    const scopeLabel = getScopeLabel(record);
    const confirmed = await MessageService.confirm(
      `This will make v${record?.version} the active template for the ${scopeLabel.toLowerCase()} scope. All projects using this template in that scope will use this version.`,
      {
        title: "Set active version?",
        confirmText: "Set Active",
        cancelText: "Cancel",
        type: 'warning'
      }
    );
    if (confirmed) activateTemplateVersion(record);
  };

  const loadEditVersions = async (template) => {
    if (!template?.templateName || !template?.typeId) {
      setEditingVersionOptions([]);
      return;
    }
    setEditingVersionsLoading(true);
    try {
      const list = await fetchTemplateVersionsService(APIURL, {
        templateName: template.templateName,
        typeId: template.typeId,
        groupId: template.groupId,
        projectId: template.projectId,
      });
      const options = list.map((item) => ({
        value: resolveTemplateId(item),
        label: `v${item?.version}${item?.isActive ? " (Active)" : ""}`,
      }));
      setEditingVersionOptions(options);
      const active = list.find((item) => item?.isActive);
      const activeId = resolveTemplateId(active) ?? resolveTemplateId(template);
      setEditingVersionId(activeId);
    } catch (err) {
      console.error("Failed to fetch template versions", err);
      setEditingVersionOptions([]);
      setEditingVersionId(resolveTemplateId(template));
    } finally {
      setEditingVersionsLoading(false);
    }
  };

  const startInlineEdit = (template) => {
    setEditingTemplateId(template?.templateId ?? null);
    setEditingTemplateName(template?.templateName || "");
    setEditingModuleIds(
      normalizeModuleIds(template?.moduleIds ?? template?.ModuleIds),
    );
    setEditingVersionId(resolveTemplateId(template));
    setEditingVersionOptions(
      template?.version
        ? [{ value: resolveTemplateId(template), label: `v${template.version}` }]
        : [],
    );
    loadEditVersions(template);
  };

  const cancelInlineEdit = () => {
    setEditingTemplateId(null);
    setEditingTemplateName("");
    setEditingModuleIds([]);
    setEditingVersionId(null);
    setEditingVersionOptions([]);
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
      await updateTemplate(APIURL, editingTemplateId, {
        templateName: name,
        moduleIds: editingModuleIds || [],
        applyToAllVersions: true,
      });
      if (editingVersionId && editingVersionId !== editingTemplateId) {
        await activateTemplateVersionService(APIURL, editingVersionId);
      }
      message.success("Template updated.");
      recordMappingUpdate(editingTemplateId);
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

  const handleRemoveTemplate = (record) => {
    const scope = record?.projectId ? "project" : record?.groupId ? "group" : "standard";

    if (record?.isDeleted) {
      Modal.confirm({
        title: "Restore template?",
        content: `This will restore "${record?.templateName}" and set it as active in the ${scope} scope.`,
        okText: "Restore",
        cancelText: "Cancel",
        onOk: async () => {
          try {
            await restoreTemplate(APIURL, record.templateId);
            message.success("Template restored.");
            setAvailableRPTFiles((prev) =>
              prev.map((t) =>
                t.templateId === record.templateId ? { ...t, isDeleted: false, isActive: true } : t
              )
            );
          } catch (err) {
            console.error("Failed to restore template", err);
            showError(err, "Failed to restore template.");
          }
        },
      });
      return;
    }

    Modal.confirm({
      title: "Remove template?",
      content: `This will mark "${record?.templateName}" as deleted in the ${scope} scope. It stays visible but marked deleted — you can restore it from the Versions panel.`,
      okText: "Remove",
      okButtonProps: { danger: true },
      cancelText: "Cancel",
      onOk: async () => {
        try {
          await softDeleteTemplate(APIURL, record.templateId, scope);
          message.success("Template marked as deleted.");
          setAvailableRPTFiles((prev) =>
            prev.map((t) =>
              t.templateId === record.templateId ? { ...t, isDeleted: true } : t
            )
          );
        } catch (err) {
          console.error("Failed to remove template", err);
          showError(err, "Failed to remove template.");
        }
      },
    });
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
      const fileName = buildReportFileName({
        templateName: template?.templateName,
        projectName: projectName || (projectId ? `Project ${projectId}` : undefined),
        typeId: template?.typeId ?? projectTypeId,
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
      const { blob, fileName } = await downloadTemplateBlobService(
        APIURL,
        template,
      );
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
          if (err.message !== "User cancelled upload") {
            throw err;
          }
        }
      } catch (err) {
        onError?.(err);
        console.error("Upload failed", err);
        showError(err, "Upload failed.");
      }
    },
  });

  const columns = useMemo(
    () =>
      buildTemplateColumns({
        userMap,
        moduleMap,
        moduleOptions,
        editingTemplateId,
        editingTemplateName,
        setEditingTemplateName,
        editingModuleIds,
        setEditingModuleIds,
        editingVersionId,
        editingVersionOptions,
        editingVersionsLoading,
        setEditingVersionId,
        openMappingModal,
        openVersionsModal,
        handleDownload,
        rowUploadProps,
        startInlineEdit,
        saveInlineEdit,
        cancelInlineEdit,
        inlineEditSaving,
        onRemove: handleRemoveTemplate,
      }),
    [
      userMap,
      moduleMap,
      moduleOptions,
      editingTemplateId,
      editingTemplateName,
      editingModuleIds,
      editingVersionId,
      editingVersionOptions,
      editingVersionsLoading,
      inlineEditSaving,
      setEditingTemplateName,
      setEditingModuleIds,
      setEditingVersionId,
      openMappingModal,
      openVersionsModal,
      handleDownload,
      rowUploadProps,
      startInlineEdit,
      saveInlineEdit,
      cancelInlineEdit,
    ],
  );

  const versionsColumns = useMemo(
    () =>
      buildVersionsColumns({
        userMap,
        activatingVersionId,
        confirmActivateVersion,
        handleDownload,
        onGenerate: handleGenerateReportFromVersion,
      }),
    [
      userMap,
      activatingVersionId,
      confirmActivateVersion,
      handleDownload,
      handleGenerateReportFromVersion,
    ],
  );

  const sourceOptionGroups = useMemo(() => {
    const options = Array.isArray(mappingOptions) ? [...mappingOptions] : [];
    options.push({ value: "calc:SRNO", label: "Auto SR No." });
    return options;
  }, [mappingOptions]);

  const flatSourceOptions = useMemo(() => {
    return sourceOptionGroups.map((option) => ({
      value: option.value,
      label: option.label,
      normalized: normalizeKey(option.label ?? option.value),
    }));
  }, [sourceOptionGroups]);

  const mappingDisplayOrder = useMemo(() => {
    const pinned = new Set(mappingPinnedFields || []);
    const mapped = parsedFields
      .filter((field) => pinned.has(field))
      .sort((a, b) => a.localeCompare(b));
    const unmapped = parsedFields
      .filter((field) => !pinned.has(field))
      .sort((a, b) => a.localeCompare(b));
    return [...mapped, ...unmapped];
  }, [parsedFields, mappingPinnedFields]);

  const mappingRows = useMemo(
    () =>
      mappingDisplayOrder.map((field, index) => ({
        key: `${field}-${index}`,
        field,
        isMapped: Boolean(mappingSelections?.[field]),
      })),
    [mappingDisplayOrder, mappingSelections],
  );
  const mappedFieldNames = useMemo(
    () =>
      parsedFields
        .filter((field) => mappingSelections?.[field])
        .sort((a, b) => a.localeCompare(b)),
    [parsedFields, mappingSelections],
  );

  useEffect(() => {
    if (!mappingModalOpen) return;
    if (parsedFields.length === 0 || flatSourceOptions.length === 0) return;
    let autoMapped = [];
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
          autoMapped.push(field);
        }
      });
      return changed ? next : prev;
    });
    if (autoMapped.length > 0) {
      setMappingPinnedFields((prev) => {
        const next = new Set(prev || []);
        autoMapped.forEach((field) => next.add(field));
        return Array.from(next);
      });
    }
  }, [mappingModalOpen, parsedFields, flatSourceOptions]);

  return (
    <div className="rpt-templates">
      <style>{rptTemplatesStyles}</style>
      <ProjectTemplatesHeader
        projectLoading={projectLoading}
        projectLabel={projectLabel}
        projectName={projectName}
        projectId={projectId}
        groupLabel={groupLabel}
        projectGroupId={projectGroupId}
        typeLabel={typeLabel}
        projectTypeId={projectTypeId}
      />

      <div
        className={`rpt-main ${
          showMappingPanel || showSidePanel
            ? "rpt-main--with-panel"
            : "rpt-main--single"
        }`}
      >
        <TemplatesCard
          selectionReady={selectionReady}
          tags={["Project", groupLabel, typeLabel]}
          data={availableRPTFiles}
          columns={columns}
          loading={loadingTemplates}
          selectionEmptyText="Select a project with group and type to view templates."
          noTemplatesTitle="No templates found for this project."
          noTemplatesSubtitle="Uploading here creates a project-only version."
          onRefresh={fetchAvailableRPTFiles}
          onAdd={() => {
            setAddModalOpen(true);
            setImportModalOpen(false);
            setMappingModalOpen(false);
            setMappingTemplate(null);
            cancelInlineEdit();
          }}
          onImport={() => {
            setImportModalOpen(true);
            setAddModalOpen(false);
            setMappingModalOpen(false);
            setMappingTemplate(null);
            cancelInlineEdit();
            importForm.resetFields();
            importForm.setFieldsValue({ copyMappings: true });
          }}
          disableAdd={!selectionReady}
          disableImport={!selectionReady}
        />

        {showSidePanel && (
          <TemplatesSidePanel
            addModalOpen={addModalOpen}
            importModalOpen={importModalOpen}
            onClose={() => {
              setAddModalOpen(false);
              setImportModalOpen(false);
            }}
            addFormProps={{
              form: addForm,
              addFileList,
              setAddFileList,
              onSubmit: handleAddSubmit,
              submitting: addSubmitting,
              moduleOptions,
              children: (
                <>
                  <Form.Item label="Project" style={{ marginBottom: 8 }}>
                    <Input
                      value={
                        projectLabel ||
                        projectName ||
                        (projectId ? `Project ${projectId}` : "")
                      }
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
                  
                  
                
                  
                </>
              ),
            }}
            importFormProps={{
              form: importForm,
              importScope,
              sourceScopeOptions,
              filteredGroupOptions,
              filteredProjectOptions,
              importAvailability,
              importGroupId,
              importProjectId,
              sourceTypeOptions,
              disableSourceTypeSelect,
              selectedImportProjectTypeLabel: typeOptions.find(
                (type) => type.value === selectedImportProjectType,
              )?.label,
              importSubmitting,
              onSubmit: handleImportTemplates,
              showTargetProject: true,
              targetProjectLabel:
                projectLabel ||
                projectName ||
                (projectId ? `Project ${projectId}` : ""),
              children: (
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
              ),
            }}
          />
        )}

        <TemplatesMappingPanel
          showMappingPanel={showMappingPanel}
          mappingTemplate={mappingTemplate}
          mappingNotFound={mappingNotFound}
          mappingOptionsLoading={mappingOptionsLoading}
          parsedFields={parsedFields}
          mappingRows={mappingRows}
          sourceOptionGroups={sourceOptionGroups}
          mappingSelections={mappingSelections}
          setMappingSelections={setMappingSelections}
          mappedFieldNames={mappedFieldNames}
          groupBySelections={groupBySelections}
          setGroupBySelections={setGroupBySelections}
          orderBySelections={orderBySelections}
          setOrderBySelections={setOrderBySelections}
          labelCopies={labelCopies}
          setLabelCopies={setLabelCopies}
          staticVariables={staticVariables}
          setStaticVariables={setStaticVariables}
          handleSaveMapping={handleSaveMapping}
          mappingLoading={mappingLoading}
          closeMappingPanel={closeMappingPanel}
        />
      </div>

      <TemplatesVersionsModal
        versionsOpen={versionsOpen}
        versionsTemplate={versionsTemplate}
        closeVersionsModal={closeVersionsModal}
        pendingGenerateTemplate={pendingGenerateTemplate}
        setPendingGenerateTemplate={setPendingGenerateTemplate}
        runReportGeneration={runReportGeneration}
        versionsData={versionsData}
        versionsColumns={versionsColumns}
        versionsLoading={versionsLoading}
      />

    </div>
  );
};

export default ProjectTemplates;
