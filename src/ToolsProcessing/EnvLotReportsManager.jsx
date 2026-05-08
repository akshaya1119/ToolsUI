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
    return date.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata' // Indian Standard Time
    });
  };

  const formatRelativeTime = (isoString) => {
    const date = new Date(isoString);
    const now = new Date();
    
    // Both dates are in UTC, so the difference calculation is correct
    const diffMs = now.getTime() - date.getTime();
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

    return (
      <Collapse
        ghost
        size="small"
        expandIcon={({ isActive }) => <CaretRightOutlined rotate={isActive ? 90 : 0} />}
        style={{ marginTop: 8 }}
        activeKey={activeKey}
        onChange={onActiveKeyChange}
      >
        <Panel
          key="reports"
          header={
            <Space size="small">
              <HistoryOutlined style={{ color: "#1890ff", fontSize: "12px" }} />
              <Text strong style={{ fontSize: "12px" }}>
                Generated Reports
              </Text>
              <Badge 
                count={sortedReports.length} 
                size="small" 
                style={{ backgroundColor: "#52c41a" }} 
              />
            </Space>
          }
          style={{ padding: 0 }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {sortedReports.map((report, index) => (
              <div
                key={report.id}
                style={{ 
                  padding: "6px 8px",
                  borderRadius: 4, 
                  backgroundColor: index === 0 ? "#f6ffed" : "#fafafa",
                  border: index === 0 ? "1px solid #b7eb8f" : "1px solid #e8e8e8",
                  boxShadow: index === 0 ? "0 1px 2px rgba(82, 196, 26, 0.1)" : "0 1px 2px rgba(0,0,0,0.03)",
                  transition: "all 0.2s ease",
                  cursor: "pointer"
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = index === 0 ? "#f0f9e7" : "#f0f0f0";
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = index === 0 ? "#f6ffed" : "#fafafa";
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 2 }}>
                      <Text strong style={{ fontSize: "10px", color: "#333", lineHeight: "14px" }}>
                        {report.templateName}
                      </Text>
                      {index === 0 && (
                        <Tag 
                          color="gold" 
                          style={{ 
                            margin: 0, 
                            fontSize: "8px", 
                            fontWeight: 500,
                            borderRadius: 2,
                            padding: "0px 3px",
                            lineHeight: "12px",
                            height: "12px"
                          }}
                        >
                          Latest
                        </Tag>
                      )}
                      <Text style={{ fontSize: "9px", color: "#666", fontWeight: 500 }}>
                        {formatRelativeTime(report.generatedAt)}
                      </Text>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <Tag 
                        color={index === 0 ? "green" : "blue"} 
                        style={{ 
                          margin: 0, 
                          fontSize: "9px", 
                          fontWeight: 500,
                          borderRadius: 2,
                          padding: "0px 4px",
                          lineHeight: "14px",
                          height: "14px"
                        }}
                      >
                        {formatEnvLotDisplay(report.envLotNumbers)}
                      </Tag>
                      <Text style={{ fontSize: "9px", color: "#999", lineHeight: "12px" }}>
                        {formatDateTime(report.generatedAt)}
                      </Text>
                    </div>
                  </div>
                  <Button
                    type="primary"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onDownload(report)}
                    style={{ 
                      fontSize: "10px",
                      height: "20px",
                      padding: "0 6px",
                      borderRadius: 3,
                      marginLeft: 6
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </Collapse>
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