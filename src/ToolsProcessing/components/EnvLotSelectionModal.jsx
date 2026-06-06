import React from "react";
import { Modal, Alert, Checkbox, Card, Typography } from "antd";

const { Text } = Typography;

const EnvLotSelectionModal = ({
  visible,
  availableEnvLots,
  selectedEnvLots,
  onToggle,
  onSelectAll,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      title="Select Envelope Lots for Template Generation"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      width={600}
      okText="Generate for Selected Envelope Lots"
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Multiple envelope lots detected"
          description="Please select which envelope lot(s) you want to process for template generation. You can select all envelope lots or specific ones."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Checkbox
          checked={selectedEnvLots.length === availableEnvLots.length && availableEnvLots.length > 0}
          indeterminate={selectedEnvLots.length > 0 && selectedEnvLots.length < availableEnvLots.length}
          onChange={(e) => onSelectAll(e.target.checked)}
          style={{ marginBottom: 12, fontWeight: 500 }}
        >
          Select All Envelope Lots ({availableEnvLots.length})
        </Checkbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
        {availableEnvLots.map((envLot) => (
          <Card
            key={envLot.envLotNo}
            size="small"
            style={{
              backgroundColor: selectedEnvLots.includes(envLot.envLotNo) ? "#f0f5ff" : "#fafafa",
              border: selectedEnvLots.includes(envLot.envLotNo) ? "1px solid #91caff" : "1px solid #d9d9d9",
            }}
          >
            <Checkbox
              checked={selectedEnvLots.includes(envLot.envLotNo)}
              onChange={(e) => onToggle(envLot.envLotNo, e.target.checked)}
            >
              <Text strong style={{ fontSize: "14px" }}>Envelope Lot {envLot.envLotNo}</Text>
            </Checkbox>
          </Card>
        ))}
      </div>

      {selectedEnvLots.length > 0 && (
        <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
          <Text strong style={{ color: "#1890ff" }}>
            {selectedEnvLots.length} envelope lot(s) selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default EnvLotSelectionModal;
