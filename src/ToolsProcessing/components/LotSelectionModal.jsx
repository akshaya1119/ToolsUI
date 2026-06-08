import React from "react";
import { Modal, Alert, Checkbox, Card, Space, Badge, Typography } from "antd";

const { Text } = Typography;

const LotSelectionModal = ({
  visible,
  availableLots,
  selectedLots,
  onToggle,
  onSelectAll,
  onConfirm,
  onCancel,
}) => {
  return (
    <Modal
      title="Multiple lots detected"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      width={600}
      okText="Process Selected Lots"
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Multiple lots detected"
          description="Please select which lot(s) you want to process for Box Breaking. You can select all lots or specific ones."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Checkbox
          checked={selectedLots.length === availableLots.length && availableLots.length > 0}
          indeterminate={selectedLots.length > 0 && selectedLots.length < availableLots.length}
          onChange={(e) => onSelectAll(e.target.checked)}
          style={{ marginBottom: 12, fontWeight: 500 }}
        >
          Select All Lots ({availableLots.length})
        </Checkbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
        {availableLots.map((lot) => (
          <Card
            key={lot.lotNo}
            size="small"
            style={{
              backgroundColor: selectedLots.includes(lot.lotNo) ? "#f0f5ff" : "#fafafa",
              border: selectedLots.includes(lot.lotNo) ? "1px solid #91caff" : "1px solid #d9d9d9",
            }}
          >
            <Checkbox
              checked={selectedLots.includes(lot.lotNo)}
              onChange={(e) => onToggle(lot.lotNo, e.target.checked)}
            >
              <Space>
                <Text strong style={{ fontSize: "14px" }}>Lot {lot.lotNo}</Text>
                <Badge
                  count={lot.catchCount}
                  style={{ backgroundColor: "#52c41a" }}
                  title="Number of catches in this lot"
                />
                <Text type="secondary" style={{ fontSize: "12px" }}>catches</Text>
              </Space>
            </Checkbox>
          </Card>
        ))}
      </div>

      {selectedLots.length > 0 && (
        <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
          <Text strong style={{ color: "#1890ff" }}>
            {selectedLots.length} lot(s) selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default LotSelectionModal;
