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
  description = "Please select which lot(s) you want to process for Box Breaking. You can select all lots or specific ones.",
  okText = "Process Selected Lots",
  isQuantitySheet = false,
}) => {
  // Count lots without pages
  const lotsWithoutPages = availableLots.filter(lot => lot.hasZeroPages);
  const validLots = availableLots.filter(lot => !lot.hasZeroPages);
  const validSelectedLots = selectedLots.filter(lotNo => 
    availableLots.find(lot => lot.lotNo === lotNo && !lot.hasZeroPages)
  );

  const handleSelectAll = (checked) => {
    if (checked) {
      // For quantity sheet, select all lots including those with zero pages
      // For other templates, only select valid lots (those with pages)
      const lotsToSelect = isQuantitySheet 
        ? availableLots.map(lot => lot.lotNo)
        : validLots.map(lot => lot.lotNo);
      onSelectAll(checked, lotsToSelect);
    } else {
      onSelectAll(false);
    }
  };

  const handleToggle = (lotNo, checked) => {
    // For quantity sheet, allow toggling all lots regardless of pages
    // For other templates, only allow toggling lots with valid pages
    const lot = availableLots.find(l => l.lotNo === lotNo);
    if (isQuantitySheet || (lot && !lot.hasZeroPages)) {
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
      okText={okText}
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        {!isQuantitySheet && (
          <Alert
            message="Multiple lots detected"
            description={description}
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        {!isQuantitySheet && lotsWithoutPages.length > 0 && (
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
          checked={isQuantitySheet 
            ? selectedLots.length === availableLots.length && availableLots.length > 0
            : validSelectedLots.length === validLots.length && validLots.length > 0}
          indeterminate={isQuantitySheet 
            ? selectedLots.length > 0 && selectedLots.length < availableLots.length
            : validSelectedLots.length > 0 && validSelectedLots.length < validLots.length}
          onChange={(e) => handleSelectAll(e.target.checked)}
          style={{ marginBottom: 12, fontWeight: 500 }}
          disabled={availableLots.length === 0}
        >
          Select All Lots ({isQuantitySheet ? `${selectedLots.length}/${availableLots.length}` : `${validSelectedLots.length}/${validLots.length}`})
        </Checkbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
        {availableLots.map((lot) => {
          const isDisabled = !isQuantitySheet && lot.hasZeroPages;
          const isSelected = selectedLots.includes(lot.lotNo);

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
