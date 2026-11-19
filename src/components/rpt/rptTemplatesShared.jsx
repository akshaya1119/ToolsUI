import React from "react";
import { Button, Input, Select, Space, Tag, Tooltip, Typography, Upload } from "antd";
import i18n from "../../i18n";
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
    grid-template-columns: minmax(0, 2fr) minmax(280px, 1fr);
  }
  .rpt-main--single {
    grid-template-columns: minmax(0, 1fr);
  }
  .rpt-mapping-card-body {
    padding: 12px;
    max-height: calc(100vh - 220px);
    overflow-y: auto;
  }
  .rpt-mapping-card-body::-webkit-scrollbar {
    width: 6px;
  }
  .rpt-mapping-card-body::-webkit-scrollbar-track {
    background: transparent;
  }
  .rpt-mapping-card-body::-webkit-scrollbar-thumb {
    background: #d9d9d9;
    border-radius: 4px;
  }
  .rpt-mapping-card-body::-webkit-scrollbar-thumb:hover {
    background: #bfbfbf;
  }
  .rpt-mapping-card {
    position: sticky;
    top: 16px;
    align-self: start;
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
  canEdit = true,
  canDelete = true,
  canCreate = true,
  canUpload = true,
  canMap = true,
}) => [
  {
    title: i18n.t("common.labels.templateName", "Template"),
    dataIndex: "templateName",
    key: "templateName",
    fixed: "left",
    width: 220,
    render: (value, record) => {
      const scopeLabel = record?.projectId
        ? i18n.t("common.labels.project", "Project")
        : record?.groupId
          ? i18n.t("common.labels.group", "Group")
          : i18n.t("templates.standard", "Standard");
      if (editingTemplateId === record?.templateId) {
        return (
          <Space direction="vertical" size={4}>
            <Input
              size="small"
              value={editingTemplateName}
              onChange={(event) => setEditingTemplateName(event.target.value)}
              placeholder={i18n.t("common.labels.templateName", "Template name")}
            />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {i18n.t("templates.templateWithScope", { scope: scopeLabel, defaultValue: `${scopeLabel} template` })}
            </Typography.Text>
          </Space>
        );
      }
      return (
        <Space direction="vertical" size={0}>
          <Space size={6}>
            <Typography.Text strong>{value}</Typography.Text>
            {record?.isDeleted && (
              <Tag color="red" style={{ fontSize: 11 }}>{i18n.t("templates.deleted", "Deleted")}</Tag>
            )}
            {!record?.isDeleted && !record?.hasMapping && (
              <Tooltip title={i18n.t("templates.noMappingWarning", "No mapping configured — this template will not appear in the processing pipeline.")}>
                <WarningOutlined style={{ color: "#faad14", fontSize: 14 }} />
              </Tooltip>
            )}
          </Space>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            {i18n.t("templates.templateWithScope", { scope: scopeLabel, defaultValue: `${scopeLabel} template` })}
          </Typography.Text>
          {!record?.isDeleted && !record?.hasMapping && (
            <Typography.Text type="warning" style={{ fontSize: 11, color: "#d46b08" }}>
              {i18n.t("templates.noMappingExcluded", "No mapping — excluded from pipeline")}
            </Typography.Text>
          )}
        </Space>
      );
    },
  },
  {
    title: i18n.t("common.labels.generated", "Generated"),
    key: "createdDate",
    width: 180,
    sorter: (a, b) => {
      const dateA = new Date(a?.createdDate || a?.CreatedDate || 0).getTime();
      const dateB = new Date(b?.createdDate || b?.CreatedDate || 0).getTime();
      return dateB - dateA;
    },
    render: (_, record) => {
      const date = record?.createdDate || record?.CreatedDate;
      if (!date) return <Typography.Text type="secondary">-</Typography.Text>;
      return <Typography.Text>{formatDateTime(date)}</Typography.Text>;
    },
  },
  {
    title: i18n.t("common.labels.subName", "Sub Name"),
    dataIndex: "subName",
    key: "subName",
    width: 150,
    render: (value, record) => (
      <Typography.Text>
        {value ?? record?.SubName ?? "-"}
      </Typography.Text>
    ),
  },
  {
    title: i18n.t("common.labels.version", "Version"),
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
            placeholder={i18n.t("templates.selectVersion", "Select version")}
            style={{ width: "100%" }}
          />
        );
      }
      return <Tag color="blue">v{value}</Tag>;
    },
  },
  {
    title: i18n.t("templates.uploadedBy", "Uploaded By"),
    key: "uploadedBy",
    width: 160,
    render: (_, record) => (
      <Typography.Text>{resolveUploaderLabel(userMap, record)}</Typography.Text>
    ),
  },
  {
    title: i18n.t("templates.dependentModules", "Dependent Modules"),
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
            placeholder={i18n.t("templates.selectModules", "Select modules")}
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
                    {i18n.t("templates.more", { count: display.more, defaultValue: `+${display.more} more` })}
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
    title: i18n.t("templates.mapping", "Mapping"),
    key: "mapping",
    width: 110,
    render: (_, record) => (
      <Tooltip title={!canMap ? i18n.t("permission.mappingNotPermitted", "You do not have permission to perform template mapping.") : undefined}>
        <span>
          <Button
            size="small"
            icon={<SettingOutlined />}
            onClick={() => openMappingModal(record)}
            disabled={!canMap}
          >
            {i18n.t("templates.mapping", "Mapping")}
          </Button>
        </span>
      </Tooltip>
    ),
  },
  {
    title: i18n.t("templates.history", "History"),
    key: "history",
    width: 110,
    render: (_, record) => (
      <Button
        size="small"
        icon={<HistoryOutlined />}
        onClick={() => openVersionsModal(record)}
      >
        {i18n.t("templates.versions", "Versions")}
      </Button>
    ),
  },
  {
    title: i18n.t("common.labels.actions", "Actions"),
    key: "actions",
    width: 180,
    render: (_, record) =>
      editingTemplateId === record?.templateId ? (
        <Space size={6}>
          <Tooltip title={i18n.t("common.actions.save", "Save")}>
            <Button
              size="small"
              type="primary"
              shape="circle"
              icon={<CheckOutlined />}
              onClick={saveInlineEdit}
              loading={inlineEditSaving}
            />
          </Tooltip>
          <Tooltip title={i18n.t("common.actions.cancel", "Cancel")}>
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
            title={i18n.t("common.actions.download", "Download")}
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            {" "}
          </Button>
          {canUpload ? (
            <Upload {...rowUploadProps(record)}>
              <Button
                size="small"
                icon={<UploadOutlined />}
                title={i18n.t("templates.uploadNewVersion", "Upload New Version")}
              >
                {" "}
              </Button>
            </Upload>
          ) : (
            <Tooltip title={i18n.t("permission.uploadNotPermitted", "You do not have permission to upload templates.")}>
              <span>
                <Button
                  size="small"
                  icon={<UploadOutlined />}
                  disabled
                >
                  {" "}
                </Button>
              </span>
            </Tooltip>
          )}
          <Button
            size="small"
            icon={<EditOutlined />}
            title={i18n.t("templates.editTemplate", "Edit Template")}
            onClick={() => startInlineEdit(record)}
          >
            {" "}
          </Button>
          {onRemove && (
            <Tooltip title={record?.isDeleted ? i18n.t("templates.restoreTemplateTooltip", "Restore template") : i18n.t("templates.removeFromScopeTooltip", "Remove from this scope")}>
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
    width: 100,
    render: (value) => (
      <Space size={4}>
        <Tag color="blue">v{value}</Tag>
      </Space>
    ),
  },
  {
    title: "Sub Name",
    key: "subName",
    width: 150,
    render: (_, record) => {
      const val = record?.subName ?? record?.SubName;
      return val ? (
        <Typography.Text>{val}</Typography.Text>
      ) : (
        <Typography.Text type="secondary">-</Typography.Text>
      );
    },
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
