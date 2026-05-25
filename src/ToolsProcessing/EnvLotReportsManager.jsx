import React, { useState } from "react";
import {
  Card,
  Table,
  Button,
  Typography,
  Space,
  Tag,
  Popconfirm,
  Empty,
  Tooltip,
  Collapse,
  Badge,
  Divider,
} from "antd";
import { 
  DownloadOutlined, 
  DeleteOutlined, 
  FileTextOutlined, 
  HistoryOutlined,
  CaretRightOutlined 
} from "@ant-design/icons";

const { Text } = Typography;
const { Panel } = Collapse;

const EnvLotReportsManager = ({ 
  reports = [], 
  templateId,
  onDownload, 
  onDelete, 
  loading = false,
  compact = false,
  activeKey = null, // Add activeKey prop to control expansion
  onActiveKeyChange = null // Add callback for when expansion changes
}) => {
  // Filter reports for specific template if templateId is provided
  const filteredReports = templateId 
    ? reports.filter(report => report.templateId === templateId)
    : reports;

  const formatEnvLotDisplay = (envLotNumbers) => {
    if (!envLotNumbers || envLotNumbers.length === 0) return "No lots";
    if (envLotNumbers.length === 1) return `Env Lot ${envLotNumbers[0]}`;
    return `Env Lots ${envLotNumbers.join(', ')}`;
  };

  const formatDateTime = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatDateTime(isoString);
  };

  if (compact && filteredReports.length === 0) {
    return null; // Don't show anything if no reports in compact mode
  }

  if (compact) {
    // Sort reports by generation time (latest first)
    const sortedReports = [...filteredReports].sort((a, b) => 
      new Date(b.generatedAt) - new Date(a.generatedAt)
    );

    const latestReport = sortedReports[0];
    const otherReports = sortedReports.slice(1);

    return (
      <div style={{ marginTop: 8 }}>
        {/* Latest Report Block */}
        <div
          style={{ 
            padding: "8px 10px",
            borderRadius: 6, 
            backgroundColor: "#f6ffed",
            border: "1px solid #b7eb8f",
            boxShadow: "0 1px 2px rgba(82, 196, 26, 0.1)",
            marginBottom: otherReports.length > 0 ? 4 : 0
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 2 }}>
                <HistoryOutlined style={{ color: "#52c41a", fontSize: "14px" }} />
                <Text strong style={{ fontSize: "12px", color: "#333" }}>
                  Latest Result
                </Text>
                <Tag 
                  color="green" 
                  style={{ 
                    margin: 0, 
                    fontSize: "10px", 
                    fontWeight: 600,
                    borderRadius: 3,
                    padding: "0px 4px",
                    lineHeight: "16px"
                  }}
                >
                  {formatRelativeTime(latestReport.generatedAt)}
                </Tag>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Text style={{ fontSize: "11px", color: "#666", fontWeight: 500 }}>
                  {formatEnvLotDisplay(latestReport.envLotNumbers)}
                </Text>
                <Text type="secondary" style={{ fontSize: "10px" }}>
                  by {latestReport.generatedBy} • {formatDateTime(latestReport.generatedAt)}
                </Text>
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              icon={<DownloadOutlined />}
              onClick={() => onDownload(latestReport)}
              style={{ 
                borderRadius: 4,
                boxShadow: "0 2px 4px rgba(22, 119, 255, 0.15)"
              }}
            >
              Download
            </Button>
          </div>
        </div>

        {/* Older Reports Collapse */}
        {otherReports.length > 0 && (
          <Collapse
            ghost
            size="small"
            expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
            activeKey={activeKey}
            onChange={onActiveKeyChange}
            style={{ border: "none", backgroundColor: "transparent" }}
          >
            <Panel
              key="reports"
              header={
                <Text type="secondary" style={{ fontSize: "11px", fontWeight: 500 }}>
                  Previous Versions ({otherReports.length})
                </Text>
              }
              style={{ padding: 0 }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 4, paddingLeft: 12 }}>
                {otherReports.map((report) => (
                  <div
                    key={report.id}
                    style={{ 
                      padding: "4px 8px",
                      borderRadius: 4, 
                      backgroundColor: "#fafafa",
                      border: "1px solid #f0f0f0",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}
                  >
                    <div style={{ minWidth: 0, flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <Text style={{ fontSize: "11px", fontWeight: 500 }}>
                          {formatRelativeTime(report.generatedAt)}
                        </Text>
                        <Tag style={{ margin: 0, fontSize: "9px", lineHeight: "14px", height: "14px" }}>
                          {formatEnvLotDisplay(report.envLotNumbers)}
                        </Tag>
                      </div>
                      <Text type="secondary" style={{ fontSize: "9px", display: "block" }}>
                        {formatDateTime(report.generatedAt)}
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => onDownload(report)}
                      style={{ fontSize: "10px", color: "#1677ff" }}
                    />
                  </div>
                ))}
              </div>
            </Panel>
          </Collapse>
        )}
      </div>
    );
  }

  // Full table view for main reports manager
  const sortedReports = [...filteredReports].sort((a, b) => 
    new Date(b.generatedAt) - new Date(a.generatedAt)
  );

  const columns = [
    {
      title: "Template",
      dataIndex: "templateName",
      key: "templateName",
      render: (text, record) => (
        <Space>
          <FileTextOutlined />
          <Text strong>{text}</Text>
        </Space>
      ),
    },
    {
      title: "Envelope Lots",
      dataIndex: "envLotNumbers",
      key: "envLotNumbers",
      render: (envLotNumbers) => (
        <Tag color="blue">{formatEnvLotDisplay(envLotNumbers)}</Tag>
      ),
    },
    {
      title: "Generated On",
      dataIndex: "generatedAt",
      key: "generatedAt",
      render: (date) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {formatDateTime(date)}
        </Text>
      ),
    },
    {
      title: "Generated By",
      dataIndex: "generatedBy",
      key: "generatedBy",
      render: (user) => (
        <Text type="secondary" style={{ fontSize: "12px" }}>
          {user}
        </Text>
      ),
    },
    {
      title: "Actions",
      key: "actions",
      width: 120,
      render: (_, record) => (
        <Tooltip title="Download Report">
          <Button
            type="primary"
            size="small"
            icon={<DownloadOutlined />}
            onClick={() => onDownload(record)}
          >
            Download
          </Button>
        </Tooltip>
      ),
    },
  ];

  if (sortedReports.length === 0) {
    return (
      <Card
        size="small"
        title="Generated Envelope Lot Reports"
        style={{
          border: "1px solid #d9d9d9",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
          borderRadius: 8,
        }}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="No reports generated yet"
        />
      </Card>
    );
  }

  return (
    <Card
      size="small"
      title={
        <Space>
          <FileTextOutlined />
          <span>Generated Envelope Lot Reports ({filteredReports.length})</span>
        </Space>
      }
      style={{
        border: "1px solid #d9d9d9",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        borderRadius: 8,
        marginBottom: 16,
      }}
    >
      <Table
        columns={columns}
        dataSource={filteredReports}
        rowKey="id"
        pagination={false}
        loading={loading}
        size="small"
        scroll={{ x: 600 }}
      />
    </Card>
  );
};

export default EnvLotReportsManager;