import React from "react";
import { Modal, Alert, Checkbox, Card, Space, Badge, Typography } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

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
  // Count lots without pages
  const lotsWithoutPages = availableLots.filter(lot => lot.hasZeroPages);
  const validLots = availableLots.filter(lot => !lot.hasZeroPages);
  const validSelectedLots = selectedLots.filter(lotNo => 
    availableLots.find(lot => lot.lotNo === lotNo && !lot.hasZeroPages)
  );

  const handleSelectAll = (checked) => {
    if (checked) {
      // Only select valid lots (those with pages)
      onSelectAll(checked, validLots.map(lot => lot.lotNo));
    } else {
      onSelectAll(false);
    }
  };

  const handleToggle = (lotNo, checked) => {
    // Find the lot to check if it has zero pages
    const lot = availableLots.find(l => l.lotNo === lotNo);
    if (lot && !lot.hasZeroPages) {
      onToggle(lotNo, checked);
    }
  };

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

        {lotsWithoutPages.length > 0 && (
          <Alert
            message="Some lots have missing page data"
            description={`${lotsWithoutPages.length} lot(s) with zero or missing page values cannot be processed. Only lots with valid page data are available for selection.`}
            type="warning"
            showIcon
            icon={<ExclamationCircleOutlined />}
            style={{ marginBottom: 16 }}
          />
        )}

        <Checkbox
          checked={validSelectedLots.length === validLots.length && validLots.length > 0}
          indeterminate={validSelectedLots.length > 0 && validSelectedLots.length < validLots.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          style={{ marginBottom: 12, fontWeight: 500 }}
          disabled={validLots.length === 0}
        >
          Select All Valid Lots ({validLots.length}/{availableLots.length})
        </Checkbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
        {availableLots.map((lot) => {
          const isDisabled = lot.hasZeroPages;
          const isSelected = validSelectedLots.includes(lot.lotNo);

          return (
            <Card
              key={lot.lotNo}
              size="small"
              style={{
                backgroundColor: isSelected ? "#f0f5ff" : isDisabled ? "#fafafa" : "#fafafa",
                border: isSelected ? "1px solid #91caff" : isDisabled ? "1px solid #ffb7b7" : "1px solid #d9d9d9",
                opacity: isDisabled ? 0.6 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => handleToggle(lot.lotNo, e.target.checked)}
                  disabled={isDisabled}
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
              </div>
              {isDisabled && (
                <div style={{ marginTop: 6, paddingLeft: 24 }}>
                  <Text type="danger" style={{ fontSize: "11px", display: "flex", alignItems: "center", gap: 4 }}>
                    <ExclamationCircleOutlined style={{ fontSize: "10px" }} />
                    Page data is missing or zero - cannot process this lot
                  </Text>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {validSelectedLots.length > 0 && (
        <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
          <Text strong style={{ color: "#1890ff" }}>
            {validSelectedLots.length} lot(s) selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default LotSelectionModal;
