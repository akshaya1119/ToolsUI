import React from "react";
import { Button, Input, Select, Space, Tag, Tooltip, Typography, Upload } from "antd";
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  HistoryOutlined,
  SettingOutlined,
  UploadOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  formatDateTime,
  getModuleDisplay,
  getScopeLabel,
  resolveModuleTooltip,
  resolveTemplateId,
  resolveUploaderLabel,
} from "../../utils/rptTemplateUtils";

export const rptTemplatesStyles = `
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
  .rpt-mapping-card .ant-card-head {
    min-height: 32px;
    padding: 4px 8px;
  }
  .rpt-mapping-card .ant-card-head-title {
    padding: 0;
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
`;

export const buildTemplateColumns = ({
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
  onRemove,
}) => [
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
          <Space size={6}>
            <Typography.Text strong>{value}</Typography.Text>
            {record?.isDeleted && (
              <Tag color="red" style={{ fontSize: 11 }}>Deleted</Tag>
            )}
            {!record?.isDeleted && !record?.hasMapping && (
              <Tooltip title="No mapping configured — this template will not appear in the processing pipeline.">
                <WarningOutlined style={{ color: "#faad14", fontSize: 14 }} />
              </Tooltip>
            )}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {scopeLabel} template
          </Typography.Text>
          {!record?.isDeleted && !record?.hasMapping && (
            <Typography.Text type="warning" style={{ fontSize: 11, color: "#d46b08" }}>
              No mapping — excluded from pipeline
            </Typography.Text>
          )}
        </Space>
      );
    },
  },
  {
    title: "Version",
    dataIndex: "version",
    key: "version",
    width: 100,
    render: (value, record) => {
      if (editingTemplateId === record?.templateId) {
        return (
          <Select
            size="small"
            value={editingVersionId}
            options={editingVersionOptions}
            loading={editingVersionsLoading}
            onChange={(next) => setEditingVersionId(next)}
            placeholder="Select version"
            style={{ width: "100%" }}
          />
        );
      }
      return <Tag color="blue">v{value}</Tag>;
    },
  },
  {
    title: "Uploaded By",
    key: "uploadedBy",
    width: 160,
    render: (_, record) => (
      <Typography.Text>{resolveUploaderLabel(userMap, record)}</Typography.Text>
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
      const display = getModuleDisplay(moduleMap, record);
      return (
        <Tooltip title={resolveModuleTooltip(moduleMap, record)}>
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
          {onRemove && (
            <Tooltip title={record?.isDeleted ? "Restore template" : "Remove from this scope"}>
              <Button
                size="small"
                danger={!record?.isDeleted}
                icon={record?.isDeleted ? <CheckOutlined /> : <DeleteOutlined />}
                onClick={() => onRemove(record)}
              />
            </Tooltip>
          )}
        </Space>
      ),
  },
];

export const buildVersionsColumns = ({
  userMap,
  activatingVersionId,
  confirmActivateVersion,
  handleDownload,
  onGenerate,
}) => [
  {
    title: "Version",
    dataIndex: "version",
    key: "version",
    width: 140,
    render: (value) => (
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
      <Typography.Text>{resolveUploaderLabel(userMap, record)}</Typography.Text>
    ),
  },
  {
    title: "Status",
    key: "status",
    width: 120,
    render: (_, record) => {
      if (record?.isDeleted) return <Tag color="red">Deleted</Tag>;
      return record?.isActive ? <Tag color="green">Active</Tag> : <Tag>Archived</Tag>;
    },
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
          icon={<CheckOutlined />}
          onClick={() => confirmActivateVersion(record)}
          loading={resolveTemplateId(record) === activatingVersionId}
          disabled={record?.isActive && !record?.isDeleted}
        >
          {record?.isDeleted ? "Restore & Activate" : "Set Active"}
        </Button>
        {onGenerate && (
          <Button size="small" type="primary" onClick={() => onGenerate(record)}>
            Generate
          </Button>
        )}
      </Space>
    ),
  },
];
