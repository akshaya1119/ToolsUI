import React from "react";
import { Button, Card, Empty, Space, Table, Tag, Tooltip, Typography } from "antd";
import { CopyOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const TemplatesCard = ({
  selectionReady,
  tags = [],
  onRefresh,
  onAdd,
  onImport,
  disableAdd = false,
  disableAddTooltip,
  disableImport = false,
  selectionEmptyText,
  noTemplatesTitle,
  noTemplatesSubtitle,
  data = [],
  columns,
  loading,
  showImportAction = true,
  onSaveAsMaster,
  isSavingMaster,
  rowSelection,
}) => {
  const { t } = useTranslation();
  const visibleTags = tags.filter(Boolean);
  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
      title={
        <Space>
          <Typography.Text strong>{t("common.labels.templates", "Templates")}</Typography.Text>
          {selectionReady &&
            visibleTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
        </Space>
      }
      extra={
        <Space>
          <Button title={t("common.actions.refresh", "Refresh")} icon={<ReloadOutlined />} onClick={onRefresh} disabled={!selectionReady} />
          {onSaveAsMaster && (
            <Button
              icon={<CopyOutlined />}
              onClick={onSaveAsMaster}
              disabled={!rowSelection || !rowSelection.selectedRowKeys || rowSelection.selectedRowKeys.length === 0}
              loading={isSavingMaster}
            >
              {t("templates.saveAsMaster", "Save as Master")}
            </Button>
          )}
          <Tooltip title={disableAdd ? disableAddTooltip : undefined}>
            <span>
              <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={disableAdd}>
                {t("common.actions.add", "Add")}
              </Button>
            </span>
          </Tooltip>
          {showImportAction && (
            <Button icon={<CopyOutlined />} onClick={onImport} disabled={disableImport}>
              {t("common.actions.import", "Import")}
            </Button>
          )}
        </Space>
      }
    >
      {!selectionReady ? (
        <Empty
          description={selectionEmptyText}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      ) : data.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <Space direction="vertical" size={6}>
              <Typography.Text>{noTemplatesTitle}</Typography.Text>
              <Typography.Text type="secondary">{noTemplatesSubtitle}</Typography.Text>
            </Space>
          }
        >
          <Space>
            <Button type="primary" icon={<PlusOutlined />} onClick={onAdd}>
              {t("templates.addTemplate", "Add Template")}
            </Button>
            {showImportAction && (
              <Button icon={<CopyOutlined />} onClick={onImport} disabled={disableImport}>
                {t("templates.importTemplates", "Import Templates")}
              </Button>
            )}
          </Space>
        </Empty>
      ) : (
        <Table
          rowSelection={rowSelection}
          rowKey="templateId"
          dataSource={data}
          columns={columns}
          pagination={false}
          loading={loading}
          size="small"
          scroll={{ x: 'max-content' }}
        />
      )}
    </Card>
  );
};

export default TemplatesCard;
