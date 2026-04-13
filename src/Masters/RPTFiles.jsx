import React, { useEffect, useMemo, useState } from "react";
import { Form, Modal, Select, message } from "antd";
import { MessageService } from "../services/MessageService";
import {
  extractParsedFields,
  getErrorMessage,
  getScopeLabel,
  normalizeId,
  normalizeKey,
  normalizeModuleIds,
  parseMappingJson,
  resolveTemplateId,
} from "../utils/rptTemplateUtils";
import {
  CopyOutlined,
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  SettingOutlined,
  HistoryOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
  CheckOutlined,
} from "@ant-design/icons";
import axios from "axios";
import { uploadWithDesignCheck } from "../services/reportApi";

const RPTFiles = () => {
  const url = import.meta.env.VITE_API_BASE_URL;
  const APIURL = import.meta.env.VITE_API_URL;
  const token = localStorage.getItem("token");

  const [groupOptions, setGroupOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
  const [userOptions, setUserOptions] = useState([]);
  const [groupLabel, setGroupLabel] = useState("");
  const [typeLabel, setTypeLabel] = useState("");
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [templateScope, setTemplateScope] = useState("group");
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

  const [versionsOpen, setVersionsOpen] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [versionsData, setVersionsData] = useState([]);
  const [versionsTemplate, setVersionsTemplate] = useState(null);
  const [pendingGenerateTemplate, setPendingGenerateTemplate] = useState(null);
  const [activatingVersionId, setActivatingVersionId] = useState(null);

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

  const selectionReady = Boolean(
    selectedType && (templateScope === "standard" || selectedGroup)
  );

  const showError = (err, fallback) => {
    message.error(getErrorMessage(err, fallback));
  };

  const onGroupChange = (value) => {
    setSelectedGroup(value || null);
  };

  const onTypeChange = (value) => {
    setSelectedType(value || null);
  };

  const onScopeChange = (value) => {
    setTemplateScope(value);
  };

  useEffect(() => {
    fetchGroup();
    fetchType();
    fetchProjects();
    fetchModules();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (templateScope === "standard") {
      setSelectedGroup(null);
    }
  }, [templateScope]);

  const fetchGroup = async () => {
    try {
      const formatted = await fetchGroupOptions(url);
      setGroupOptions(formatted);
      if (selectedGroup) {
        const found = formatted.find((g) => g.value === selectedGroup);
        setGroupLabel(found?.label || selectedGroup);
      }
    } catch (err) {
      console.error("Failed to fetch groups", err);
    }
  };

  const fetchType = async () => {
    try {
      const formatted = await fetchTypeOptions(url);
      setTypeOptions(formatted);
      if (selectedType) {
        const found = formatted.find((t) => t.value === selectedType);
        setTypeLabel(found?.label || selectedType);
      }
    } catch (err) {
      console.error("Failed to fetch paper types", err);
    }
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
    if (selectedGroup && groupOptions.length > 0) {
      const found = groupOptions.find((g) => g.value === selectedGroup);
      setGroupLabel(found?.label || selectedGroup);
    } else {
      setGroupLabel("");
    }
  }, [selectedGroup, groupOptions]);

  useEffect(() => {
    if (selectedType && typeOptions.length > 0) {
      const found = typeOptions.find((t) => t.value === selectedType);
      setTypeLabel(found?.label || selectedType);
    } else {
      setTypeLabel("");
    }
  }, [selectedType, typeOptions]);

  const fetchAvailableRPTFiles = async () => {
    if (!selectionReady) return;
    setLoadingTemplates(true);
    try {
      const data = await fetchTemplatesByGroup(APIURL, {
        typeId: selectedType,
        groupId: templateScope === "group" ? selectedGroup : null,
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
        template?.groupId ??
        (templateScope === "group" ? selectedGroup : 0) ??
        0;
      const typeId = template?.typeId ?? selectedType ?? 0;
      const options = await fetchMappingOptionsService(APIURL, {
        groupId,
        typeId,
      });
      console.log("[MappingOptions] groupId:", groupId, "typeId:", typeId, "options:", options);
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
  }, [selectedGroup, selectedType, templateScope]);

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
  }, [mappingModalOpen, selectedGroup, selectedType, mappingTemplate]);

  useEffect(() => {
    if (selectedGroup) addForm.setFieldsValue({ groupId: selectedGroup });
    if (selectedType) addForm.setFieldsValue({ typeId: selectedType });
  }, [selectedGroup, selectedType, addForm]);

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

  const uploadTemplate = async ({
    groupId,
    typeId,
    templateName,
    file,
    projectId,
    moduleIds,
    forceUpload,
    isUpdate = false,
    existingTemplateId = null,
  }) => {
    return uploadTemplateService(APIURL, {
      groupId,
      typeId,
      templateName,
      file,
      projectId,
      moduleIds,
      forceUpload,
    });
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
          groupId: templateScope === "group" ? values.groupId : null,
          typeId: values.typeId,
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
          groupId: templateScope === "group" ? values.groupId : null,
          typeId: values.typeId,
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
        targetGroupId: selectedGroup,
        targetTypeId: selectedType,
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
      await importTemplatesFromGroup(APIURL, { ...payload });
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
      };
      const mappingJson =
        mappingsPayload.length > 0 || (groupBySelections || []).length > 0 || (orderBySelections || []).length > 0 || (labelCopies ?? 1) > 1
          ? JSON.stringify(mappingPayload)
          : "";
      await saveTemplateMapping(
        APIURL,
        mappingTemplate.templateId,
        mappingJson,
      );
      message.success("Mapping saved.");
      setMappingNotFound(false);
      recordMappingUpdate(mappingTemplate.templateId);
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

  const runReportGeneration = () => {
    message.warning("Report generation is available from Project Templates.");
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
            groupId: record.groupId,
            typeId: record.typeId,
            templateName: record.templateName,
            file,
            moduleIds: record.moduleIds ?? record.ModuleIds ?? [],
            forceUpload,
            isUpdate: true, // Mark as update
            existingTemplateId: record.templateId, // Pass existing template ID
          });

        const onUploadSuccess = (result) => {
          onSuccess?.("ok");
          message.success("New version uploaded.");
          fetchAvailableRPTFiles();

          const uploadedTemplate = {
            templateId: result?.templateId,
            templateName: result?.templateName || record.templateName,
            groupId: record.groupId,
            typeId: record.typeId,
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
      }),
    [userMap, activatingVersionId, confirmActivateVersion, handleDownload],
  );

  const sourceOptionGroups = useMemo(() => {
    const options = Array.isArray(mappingOptions) ? [...mappingOptions] : [];
    console.log("[sourceOptionGroups] mappingOptions length:", mappingOptions?.length, "sample:", mappingOptions?.[0]);
    options.push({ value: "calc:SRNO", label: "Auto SR No.", raw: "SRNO" });
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
      <RPTFilesHeader
        templateScope={templateScope}
        onScopeChange={onScopeChange}
        selectedGroup={selectedGroup}
        onGroupChange={onGroupChange}
        groupOptions={groupOptions}
        selectedType={selectedType}
        onTypeChange={onTypeChange}
        typeOptions={typeOptions}
        groupLabel={groupLabel}
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
          tags={[
            templateScope === "standard" ? "Standard" : groupLabel,
            typeLabel,
          ]}
          data={availableRPTFiles}
          columns={columns}
          loading={loadingTemplates}
          selectionEmptyText="Select a group and type to view templates."
          noTemplatesTitle="No templates found for this group and type."
          noTemplatesSubtitle="You can import from an existing group or add a new template."
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
          disableAdd={false}
          disableImport={!selectionReady || templateScope !== "group"}
          showImportAction
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
              onSubmit: handleAddTemplate,
              submitting: addSubmitting,
              moduleOptions,
              children: (
                <>
                  {templateScope === "group" && (
                    <Form.Item
                      label="Group"
                      name="groupId"
                      rules={[{ required: true, message: "Group is required" }]}
                    >
                      <Select options={groupOptions} placeholder="Select group" />
                    </Form.Item>
                  )}
                  <Form.Item
                    label="Type"
                    name="typeId"
                    rules={[{ required: true, message: "Type is required" }]}
                  >
                    <Select options={typeOptions} placeholder="Select type" />
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

export default RPTFiles;
