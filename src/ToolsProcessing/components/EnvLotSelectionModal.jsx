import React, { useState } from "react";
import { Modal, Alert, Checkbox, Card, Typography, Input } from "antd";

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
  const [envLotSearch, setEnvLotSearch] = useState("");

  return (
    <Modal
      title="Select Catches For processing"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      width={600}
      okText="Generate"
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message="Catches with missing Envelope Lot"
          description="Select the catch numbers you want to process."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Input.Search
          placeholder="Search Catch No"
          value={envLotSearch}
          allowClear
          onChange={(e) => setEnvLotSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />
        <Checkbox
          checked={selectedEnvLots.length === availableEnvLots.length && availableEnvLots.length > 0}
          indeterminate={selectedEnvLots.length > 0 && selectedEnvLots.length < availableEnvLots.length}
          onChange={(e) => onSelectAll(e.target.checked)}
          style={{ marginBottom: 12, fontWeight: 500 }}
        >
          Select All Catches ({availableEnvLots.length})
        </Checkbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
         {availableEnvLots
            .filter(item => String(item.catchNo).toLowerCase().includes(envLotSearch.trim().toLowerCase()))
            .map((catchItem) => (
            <Card
              key={catchItem.catchNo}
              size="small"
              style={{
                backgroundColor: selectedEnvLots.includes(catchItem.catchNo) ? "#f0f5ff" : "#fafafa",
                border: selectedEnvLots.includes(catchItem.catchNo) ? "1px solid #91caff" : "1px solid #d9d9d9"
              }}
            >
              <Checkbox
                checked={selectedEnvLots.includes(catchItem.catchNo)}
                onChange={(e) => onToggle(catchItem.catchNo, e.target.checked)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <Text strong style={{ fontSize: "14px" }}>Catch No {catchItem.catchNo}</Text>
                </div>
              </Checkbox>
            </Card>
          ))}
      </div>

      {selectedEnvLots.length > 0 && (
        <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
          <Text strong style={{ color: "#1890ff" }}>
            {selectedEnvLots.length} catche(s) selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default EnvLotSelectionModal;
