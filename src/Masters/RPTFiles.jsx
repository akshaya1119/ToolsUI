import React, { useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import {
  CopyOutlined,
  CloseOutlined,
  DownloadOutlined,
  EditOutlined,
  InboxOutlined,
  PlusOutlined,
  ReloadOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import axios from "axios";

const RPTFiles = () => {
  const url = import.meta.env.VITE_API_BASE_URL;
  const APIURL = import.meta.env.VITE_API_URL;

  const [groupOptions, setGroupOptions] = useState([]);
  const [typeOptions, setTypeOptions] = useState([]);
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

  const [addFileList, setAddFileList] = useState([]);
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [importSubmitting, setImportSubmitting] = useState(false);

  const [addForm] = Form.useForm();
  const [importForm] = Form.useForm();

  const selectionReady = Boolean(
    selectedType && (templateScope === "standard" || selectedGroup)
  );

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
  }, []);

  useEffect(() => {
    if (templateScope === "standard") {
      setSelectedGroup(null);
    }
  }, [templateScope]);

  const fetchGroup = async () => {
    try {
      const res = await axios.get(`${url}/Groups`);
      const formatted = (res.data || []).map((group) => ({
        label: group.name || group.groupName,
        value: group.id || group.groupId,
      }));
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
      const res = await axios.get(`${url}/PaperTypes`);
      const formatted = (res.data || []).map((type) => ({
        label: type.types,
        value: type.typeId,
      }));
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
      const params = new URLSearchParams();
      params.set("typeId", selectedType);
      if (templateScope === "group" && selectedGroup) {
        params.set("groupId", selectedGroup);
      }
      const res = await axios.get(
        `${APIURL}/RPTTemplates/by-group?${params.toString()}`,
      );
      setAvailableRPTFiles(res.data || []);
    } catch (err) {
      console.error("Failed to fetch available RPT files", err);
      message.error("Failed to fetch templates.");
    } finally {
      setLoadingTemplates(false);
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
      message.error("Failed to load mapping options.");
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
    }
  }, [mappingModalOpen]);

  const showMappingPanel = Boolean(mappingModalOpen && mappingTemplate);

  useEffect(() => {
    if (mappingModalOpen) {
      fetchMappingOptions(mappingTemplate);
    }
  }, [mappingModalOpen, selectedGroup, selectedType, mappingTemplate]);

  useEffect(() => {
    if (selectedGroup) addForm.setFieldsValue({ groupId: selectedGroup });
    if (selectedType) addForm.setFieldsValue({ typeId: selectedType });
  }, [selectedGroup, selectedType, addForm]);

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

  const promptMappingUpdate = (template) => {
    Modal.confirm({
      title: "Any mapping changes required?",
      content:
        "If this template structure changed, update the mapping now so it can be used correctly.",
      okText: "Update Mapping",
      cancelText: "Skip",
      onOk: () => openMappingModal(template),
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
          Modal.confirm({
            title: "No changes detected",
            content:
              err?.response?.data?.message ||
              "No changes were detected in this RPT. Upload anyway?",
            okText: "Upload Anyway",
            cancelText: "Cancel",
            onOk: async () => {
              const forced = await doUpload(true);
              onSuccess(forced);
            },
          });
          return;
        }
        throw err;
      }
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to upload template", err);
      message.error(
        err?.response?.data || "Failed to upload template. Please try again.",
      );
    } finally {
      setAddSubmitting(false);
    }
  };

  const handleImportTemplates = async () => {
    try {
      const values = await importForm.validateFields();
      setImportSubmitting(true);
      const sourceScope = values.sourceScope || "group";
      const payload = {
        sourceScope,
        targetGroupId: selectedGroup,
        targetTypeId: selectedType,
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
      await axios.post(`${APIURL}/RPTTemplates/import-from-group`, {
        ...payload,
      });
      message.success("Templates imported successfully.");
      setImportModalOpen(false);
      importForm.resetFields();
      fetchAvailableRPTFiles();
    } catch (err) {
      if (err?.errorFields) return;
      console.error("Failed to import templates", err);
      message.error(
        err?.response?.data || "Failed to import templates. Please try again.",
      );
    } finally {
      setImportSubmitting(false);
    }
  };

  const openMappingModal = async (template) => {
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
          message.error(
            err?.response?.data || "Failed to parse fields for this template.",
          );
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
        message.error("Failed to load mapping.");
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
      message.error(err?.response?.data || "Failed to save mapping.");
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
      message.error(err?.response?.data || "Failed to download template.");
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
            promptMappingUpdate(uploadedTemplate);
          }
        };

        try {
          const result = await doUpload(false);
          onUploadSuccess(result);
        } catch (err) {
          const allowForce =
            err?.response?.status === 409 && err?.response?.data?.allowForceUpload;
          if (allowForce) {
            Modal.confirm({
              title: "No changes detected",
              content:
                err?.response?.data?.message ||
                "No changes were detected in this RPT. Upload anyway?",
              okText: "Upload Anyway",
              cancelText: "Cancel",
              onOk: async () => {
                const forced = await doUpload(true);
                onUploadSuccess(forced);
              },
            });
            return;
          }
          throw err;
        }
      } catch (err) {
        onError?.(err);
        console.error("Upload failed", err);
        message.error(err?.response?.data || "Upload failed.");
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
        title: "Actions",
        key: "actions",
        width: 140,
        render: (_, record) => (
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
              title="Mapping"
              onClick={() => openMappingModal(record)}
            >
              {" "}
            </Button>
          </Space>
        ),
      },
    ],
    [availableRPTFiles],
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

  const mappingRows = useMemo(
    () =>
      parsedFields.map((field, index) => ({
        key: `${field}-${index}`,
        field,
      })),
    [parsedFields],
  );

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
        @media (max-width: 1200px) {
          .rpt-main--with-panel {
            grid-template-columns: minmax(0, 1fr);
          }
          .rpt-mapping-card {
            order: 2;
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
          RPT Templates
        </Typography.Title>
        <div className="rpt-filters">
          <div className="rpt-filter">
            <Select
              placeholder="Scope"
              value={templateScope}
              onChange={onScopeChange}
              options={[
                { label: "Group", value: "group" },
                { label: "Standard", value: "standard" },
              ]}
              style={{ width: "100%" }}
              size="large"
            />
          </div>
          <div className="rpt-filter">
            <Select
              placeholder="Select Group"
              value={selectedGroup}
              onChange={onGroupChange}
              options={groupOptions}
              style={{ width: "100%" }}
              size="large"
              allowClear
              clearIcon={<span style={{ fontSize: 12 }}>x</span>}
              disabled={templateScope === "standard"}
            />
            {!selectedGroup && templateScope === "group" && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Please select a group
              </Typography.Text>
            )}
          </div>
          <div className="rpt-filter">
            <Select
              placeholder="Select Type"
              value={selectedType}
              onChange={onTypeChange}
              options={typeOptions}
              style={{ width: "100%" }}
              size="large"
              allowClear
              clearIcon={<span style={{ fontSize: 12 }}>x</span>}
            />
            {!selectedType && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Please select a type
              </Typography.Text>
            )}
          </div>
        </div>
      </div>

      <div
        className={`rpt-main ${
          showMappingPanel ? "rpt-main--with-panel" : "rpt-main--single"
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
                  {templateScope === "standard" ? (
                    <Tag>Standard</Tag>
                  ) : (
                    <Tag>{groupLabel}</Tag>
                  )}
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
                onClick={() => setAddModalOpen(true)}
              >
                Add
              </Button>
              <Button
                icon={<CopyOutlined />}
                onClick={() => setImportModalOpen(true)}
                disabled={!selectionReady || templateScope !== "group"}
              >
                Import
              </Button>
            </Space>
          }
        >
          {!selectionReady ? (
            <Empty
              description="Select a group and type to view templates."
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          ) : availableRPTFiles.length === 0 ? (
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <Space direction="vertical" size={6}>
                  <Typography.Text>
                    No templates found for this group and type.
                  </Typography.Text>
                  <Typography.Text type="secondary">
                    You can import from an existing group or add a new template.
                  </Typography.Text>
                </Space>
              }
            >
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={() => setAddModalOpen(true)}
                >
                  Add Template
                </Button>
                <Button
                  icon={<CopyOutlined />}
                  onClick={() => setImportModalOpen(true)}
                  disabled={templateScope !== "group"}
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
        title="Add Template"
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        onOk={handleAddTemplate}
        confirmLoading={addSubmitting}
        okText="Upload Template"
        width={520}
      >
        <Form layout="vertical" form={addForm}>
          <Form.Item
            label="Template Name"
            name="templateName"
            rules={[{ required: true, message: "Template name is required" }]}
          >
            <Input placeholder="Enter template name" />
          </Form.Item>
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
              <p className="ant-upload-hint">Only .rpt files are supported.</p>
            </Upload.Dragger>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="Import Templates"
        open={importModalOpen}
        onCancel={() => setImportModalOpen(false)}
        onOk={handleImportTemplates}
        confirmLoading={importSubmitting}
        okText="Import Templates"
        width={520}
      >
        <Form
          layout="vertical"
          form={importForm}
          initialValues={{ copyMappings: true }}
        >
          <Form.Item
            label="Import From"
            name="sourceScope"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject("Import source is required"),
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
                          value ? Promise.resolve() : Promise.reject("Source group is required"),
                      },
                    ]}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      options={[
                        { label: "Select source group", value: "", disabled: true },
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
                          value ? Promise.resolve() : Promise.reject("Source project id is required"),
                      },
                    ]}
                    style={{ marginBottom: 8 }}
                  >
                    <Select
                      options={[
                        { label: "Select source project", value: "", disabled: true },
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

          <Form.Item name="copyMappings" valuePropName="checked">
            <Space
              align="center"
              style={{ display: "flex", justifyContent: "space-between" }}
            >
              <div>
                <Typography.Text strong>Copy mappings</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block" }}>
                  If enabled, existing mappings are cloned as well.
                </Typography.Text>
              </div>
              <Switch />
            </Space>
          </Form.Item>
        </Form>
      </Modal>

    </div>
  );
};

export default RPTFiles;
