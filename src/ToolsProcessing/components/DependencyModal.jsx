import React from "react";
import { Modal, Button } from "antd";

const DependencyModal = ({ visible, unprocessedSteps, onCancel, onConfirm }) => {
  return (
    <Modal
      title="Unprocessed Dependencies Detected"
      open={visible}
      onCancel={onCancel}
      footer={[
        <Button key="include" type="primary" onClick={onConfirm}>
          Process All Dependencies
        </Button>,
      ]}
    >
      <p style={{ marginBottom: 16 }}>
        The following reports have not been processed yet and are required before running your selected module:
      </p>
      <ul style={{ marginBottom: 16 }}>
        {unprocessedSteps.map((step) => (
          <li key={step.key}>{step.title}</li>
        ))}
      </ul>
      <p>
        <strong>What would you like to do?</strong>
      </p>
      <ul style={{ marginLeft: 20 }}>
        <li><strong>Process Only Selected:</strong> Run only your selected module (may fail if dependencies are missing)</li>
        <li><strong>Process All Dependencies:</strong> Run all unprocessed dependencies first, then your selected module</li>
      </ul>
    </Modal>
  );
};

export default DependencyModal;
