import React from "react";
import { Modal, Alert, List, Button, Space, Divider, Typography } from "antd";
import { ExclamationCircleOutlined, CheckCircleOutlined } from "@ant-design/icons";

const { Text, Paragraph } = Typography;

const ConfigChangeModal = ({
  visible,
  changedFields,
  affectedReports,
  onConfirm,
  onCancel,
  loading = false,
}) => {
  // Map report keys to friendly names
  const reportNames = {
    duplicate: "Duplicate Processing",
    extra: "Extra Configuration",
    envelope: "Envelope Breaking",
    box: "Box Breaking",
    envelopeSummary: "Envelope Summary",
    catchSummary: "Catch Summary Report",
  };

  return (
    <Modal
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ExclamationCircleOutlined style={{ color: "#faad14", fontSize: 20 }} />
          <span>Configuration Changes Detected</span>
        </div>
      }
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>,
        <Button
          key="confirm"
          type="primary"
          onClick={onConfirm}
          loading={loading}
          danger
        >
          Re-run Reports
        </Button>,
      ]}
      width={650}
      centered
    >
      <Alert
        message="Your project configuration has been updated"
        description="To ensure accurate reports, the following modules will be re-processed with the new settings."
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
      />

      <Divider />

      <Paragraph strong style={{ marginBottom: 12 }}>
        Configuration changes:
      </Paragraph>

      <List
        dataSource={changedFields}
        renderItem={(field) => (
          <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
            <CheckCircleOutlined style={{ color: "#52c41a", marginRight: 8 }} />
            <Text>{field}</Text>
          </List.Item>
        )}
        style={{
          backgroundColor: "#fafafa",
          padding: 12,
          borderRadius: 4,
          marginBottom: 16,
        }}
      />

      <Divider />

      <Paragraph strong style={{ marginBottom: 12 }}>
        Reports to be re-generated:
      </Paragraph>

      <List
        dataSource={affectedReports || []}
        renderItem={(report) => (
          <List.Item style={{ paddingLeft: 0, paddingRight: 0 }}>
            <CheckCircleOutlined style={{ color: "#1890ff", marginRight: 8 }} />
            <Text>{reportNames[report] || report}</Text>
          </List.Item>
        )}
        style={{
          backgroundColor: "#e6f7ff",
          padding: 12,
          borderRadius: 4,
          marginBottom: 16,
        }}
      />

      <Divider />


      <Alert
        message="Tip: You can review the selected reports before starting the re-run"
        type="info"
        showIcon
        style={{ marginTop: 16 }}
      />
    </Modal>
  );
};

export default ConfigChangeModal;
