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

  const selectionReady = Boolean(selectedGroup && selectedType);

  const onGroupChange = (value) => {
    setSelectedGroup(value || null);
  };

  const onTypeChange = (value) => {
    setSelectedType(value || null);
  };

  useEffect(() => {
    fetchGroup();
    fetchType();
  }, []);

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
      const res = await axios.get(
        `${APIURL}/RPTTemplates/by-group?groupId=${selectedGroup}&typeId=${selectedType}`,
        {
          params: {
            groupId: selectedGroup,
            typeId: selectedType,
          },
        },
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
      const groupId = template?.groupId ?? selectedGroup ?? 0;
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
  }, [selectedGroup, selectedType]);

  useEffect(() => {
    if (!mappingModalOpen) {
      setParsedFields([]);
      setParsedFieldsLoading(false);
      setMappingNotFound(false);
      setMappingSelections({});
      setGroupBySelections([]);
    }
  }, [mappingModalOpen]);

  useEffect(() => {
    if (mappingModalOpen) {
      fetchMappingOptions(mappingTemplate);
    }
  }, [mappingModalOpen, selectedGroup, selectedType, mappingTemplate]);

  useEffect(() => {
    if (selectedGroup) addForm.setFieldsValue({ groupId: selectedGroup });
    if (selectedType) addForm.setFieldsValue({ typeId: selectedType });
  }, [selectedGroup, selectedType, addForm]);

  const uploadTemplate = async ({ groupId, typeId, templateName, file }) => {
    const formData = new FormData();
    formData.append("groupId", groupId);
    formData.append("typeId", typeId);
    formData.append("templateName", templateName);
    formData.append("file", file);

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
      const result = await uploadTemplate({
        groupId: values.groupId,
        typeId: values.typeId,
        templateName: values.templateName,
        file,
      });

      message.success("Template uploaded successfully.");
      setAddModalOpen(false);
      setAddFileList([]);
      addForm.resetFields(["templateName"]);
      if (selectionReady) fetchAvailableRPTFiles();

      const uploadedTemplate = {
        templateId: result?.templateId,
        templateName: result?.templateName || values.templateName,
        groupId: values.groupId,
        typeId: values.typeId,
      };

      if (uploadedTemplate.templateId) {
        openMappingModal(uploadedTemplate);
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
      await axios.post(`${APIURL}/RPTTemplates/import-from-group`, {
        sourceGroupId: values.sourceGroupId,
        sourceTypeId: values.sourceTypeId,
        targetGroupId: selectedGroup,
        targetTypeId: selectedType,
        copyMappings: values.copyMappings ?? true,
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
      setMappingModalOpen(false);
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

  const buildOptionGroup = (label, prefix, items, extraLabel) => {
    if (!Array.isArray(items) || items.length === 0) return null;
    const options = items.map((item) => ({
      value: `${prefix}${item}`,
      label: extraLabel ? `${prefix}${item} ${extraLabel}` : `${prefix}${item}`,
      raw: item,
    }));
    return { label, options };
  };

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
        const result = await uploadTemplate({
          groupId: record.groupId,
          typeId: record.typeId,
          templateName: record.templateName,
          file,
        });
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
        render: (value) => (
          <Space direction="vertical" size={0}>
            <Typography.Text strong>{value}</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              Active version
            </Typography.Text>
          </Space>
        ),
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
        width: 320,
        render: (_, record) => (
          <Space>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => handleDownload(record)}
            >
              Download
            </Button>
            <Upload {...rowUploadProps(record)}>
              <Button icon={<UploadOutlined />}>Upload New Version</Button>
            </Upload>
            <Button
              icon={<EditOutlined />}
              onClick={() => openMappingModal(record)}
            >
              Mapping
            </Button>
          </Space>
        ),
      },
    ],
    [availableRPTFiles],
  );

  const sourceOptionGroups = useMemo(() => {
    const groups = [];
    const seen = new Set();
    const pushGroup = (group) => {
      if (!group?.options?.length) return;
      const uniqueOptions = group.options.filter((option) => {
        if (seen.has(option.value)) return false;
        seen.add(option.value);
        return true;
      });
      if (uniqueOptions.length > 0) {
        groups.push({ label: group.label, options: uniqueOptions });
      }
    };

    pushGroup(buildOptionGroup("NRData Columns", "n.", mappingOptions.nrColumns));
    pushGroup(
      buildOptionGroup("NRData JSON Keys", "n.", mappingOptions.nrJsonKeys, "(json)"),
    );
    pushGroup(
      buildOptionGroup(
        "EnvelopeBreakingResults Columns",
        "e.",
        mappingOptions.envColumns,
      ),
    );
    pushGroup(
      buildOptionGroup(
        "BoxBreakingResults Columns",
        "b.",
        mappingOptions.boxColumns,
      ),
    );
    pushGroup({
      label: "Calculated",
      options: [
        { value: "calc:SRNO", label: "calc:SRNO (Auto SR No.)", raw: "SRNO" },
      ],
    });
    return groups;
  }, [mappingOptions]);

  const flatSourceOptions = useMemo(() => {
    const flattened = [];
    sourceOptionGroups.forEach((group) => {
      group.options.forEach((option) => {
        const baseName = option.raw ?? option.value;
        flattened.push({
          value: option.value,
          label: option.label,
          normalized: normalizeKey(baseName),
        });
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
    <div style={{ padding: 12 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Typography.Title level={4} style={{ margin: 0 }}>
          RPT Templates
        </Typography.Title>
        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "flex-start",
            flex: 1,
            maxWidth: 520,
          }}
        >
          <div style={{ flex: 1, minWidth: 0 }}>
            <Select
              placeholder="Select Group"
              value={selectedGroup}
              onChange={onGroupChange}
              options={groupOptions}
              style={{ width: "100%" }}
              size="large"
              allowClear
              clearIcon={<span style={{ fontSize: 12 }}>x</span>}
            />
            {!selectedGroup && (
              <Typography.Text
                type="danger"
                style={{ fontSize: 11, display: "block", marginTop: 2 }}
              >
                Please select a group
              </Typography.Text>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
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

      <Card
        style={{ borderRadius: 8 }}
        bodyStyle={{ padding: 16 }}
        title={
          <Space>
            <Typography.Text strong>Templates</Typography.Text>
            {selectionReady && (
              <>
                <Tag>{groupLabel}</Tag>
                <Tag>{typeLabel}</Tag>
              </>
            )}
          </Space>
        }
        extra={
          <Space>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchAvailableRPTFiles}
              disabled={!selectionReady}
            >
              Refresh
            </Button>
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
              disabled={!selectionReady}
            >
              Import From Group
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
              >
                Import From Group
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
          <Form.Item
            label="Group"
            name="groupId"
            rules={[{ required: true, message: "Group is required" }]}
          >
            <Select options={groupOptions} placeholder="Select group" />
          </Form.Item>
          <Form.Item
            label="Type"
            name="typeId"
            rules={[{ required: true, message: "Type is required" }]}
          >
            <Select options={typeOptions} placeholder="Select type" />
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
        title="Import Templates From Existing Group"
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
            label="Source Group"
            name="sourceGroupId"
            rules={[{ required: true, message: "Source group is required" }]}
          >
            <Select options={groupOptions} placeholder="Select source group" />
          </Form.Item>
          <Form.Item
            label="Source Type"
            name="sourceTypeId"
            rules={[{ required: true, message: "Source type is required" }]}
          >
            <Select options={typeOptions} placeholder="Select source type" />
          </Form.Item>
          <Divider style={{ margin: "12px 0" }} />
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
            <Form.Item name="copyMappings" valuePropName="checked" noStyle>
              <Switch defaultChecked />
            </Form.Item>
          </Space>
        </Form>
      </Modal>

      <Modal
        title={
          <Space direction="vertical" size={2}>
            <Typography.Text strong>Template Mapping</Typography.Text>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {mappingTemplate?.templateName || ""}
            </Typography.Text>
          </Space>
        }
        open={mappingModalOpen}
        onCancel={() => setMappingModalOpen(false)}
        onOk={handleSaveMapping}
        confirmLoading={mappingLoading}
        okText="Save Mapping"
        width={640}
      >
        <Typography.Paragraph type="secondary" style={{ marginBottom: 12 }}>
          Paste or edit the mapping JSON for this template. Save it if the mapping
          needs to change after uploading a new version.
        </Typography.Paragraph>
        {mappingNotFound && (
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            No saved mapping found for this template yet.
          </Typography.Text>
        )}
        <Card
          size="small"
          style={{ marginBottom: 12, background: "#fafafa" }}
          bodyStyle={{ padding: 12 }}
        >
          <Typography.Text strong>Parsed Fields</Typography.Text>
          {parsedFields.length === 0 ? (
            <Typography.Text type="secondary" style={{ display: "block" }}>
              {parsedFieldsLoading ? "Parsing fields..." : "No parsed fields stored yet."}
            </Typography.Text>
          ) : (
            <Space wrap style={{ marginTop: 6 }}>
              {parsedFields.map((field) => (
                <Tag key={field}>{field}</Tag>
              ))}
            </Space>
          )}
        </Card>
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
      </Modal>
    </div>
  );
};

export default RPTFiles;
