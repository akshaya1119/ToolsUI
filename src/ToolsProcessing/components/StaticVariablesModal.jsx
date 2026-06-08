import React from "react";
import { Modal, Typography, Input } from "antd";

const StaticVariablesModal = ({ open, template, variables, values, onChange, onConfirm, onCancel }) => {
  return (
    <Modal
      title={`Enter values for "${template?.templateName || "Report"}"`}
      open={open}
      onOk={onConfirm}
      onCancel={onCancel}
      okText="Generate Report"
      width={480}
    >
      <Typography.Text type="secondary" style={{ display: "block", marginBottom: 16 }}>
        This report has fields that require custom text. Fill in the values below (pre-filled with saved defaults).
      </Typography.Text>
      {Object.entries(variables || {}).map(([fieldName]) => (
        <div key={fieldName} style={{ marginBottom: 12 }}>
          <Typography.Text strong style={{ display: "block", marginBottom: 4 }}>
            {fieldName}
          </Typography.Text>
          <Input
            value={values[fieldName] ?? ""}
            onChange={(e) => onChange(fieldName, e.target.value)}
            placeholder={`Enter value for ${fieldName}`}
          />
        </div>
      ))}
    </Modal>
  );
};

export default StaticVariablesModal;
