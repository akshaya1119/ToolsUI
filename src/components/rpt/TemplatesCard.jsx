import React from "react";
import { Button, Card, Empty, Space, Table, Tag, Typography } from "antd";
import { CopyOutlined, PlusOutlined, ReloadOutlined } from "@ant-design/icons";

const TemplatesCard = ({
  selectionReady,
  tags = [],
  onRefresh,
  onAdd,
  onImport,
  disableAdd = false,
  disableImport = false,
  selectionEmptyText,
  noTemplatesTitle,
  noTemplatesSubtitle,
  data = [],
  columns,
  loading,
  showImportAction = true,
}) => {
  const visibleTags = tags.filter(Boolean);
  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 16 }}
      title={
        <Space>
          <Typography.Text strong>Templates</Typography.Text>
          {selectionReady &&
            visibleTags.map((tag) => (
              <Tag key={tag}>{tag}</Tag>
            ))}
        </Space>
      }
      extra={
        <Space>
          <Button title=" Refresh" icon={<ReloadOutlined />} onClick={onRefresh} disabled={!selectionReady} />
          <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} disabled={disableAdd}>
            Add
          </Button>
          {showImportAction && (
            <Button icon={<CopyOutlined />} onClick={onImport} disabled={disableImport}>
              Import
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
              Add Template
            </Button>
            {showImportAction && (
              <Button icon={<CopyOutlined />} onClick={onImport} disabled={disableImport}>
                Import Templates
              </Button>
            )}
          </Space>
        </Empty>
      ) : (
        <Table
          rowKey="templateId"
          dataSource={data}
          columns={columns}
          pagination={false}
          loading={loading}
        />
      )}
    </Card>
  );
};

export default TemplatesCard;
