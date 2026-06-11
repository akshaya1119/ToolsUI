import React, { useState } from "react";
import { Modal, Alert, Checkbox, Card, Typography, Input, Tag } from "antd";
import useStore from "../../stores/ProjectData";

const { Text } = Typography;

const EnvLotSelectionModal = ({
  visible,
  availableEnvLots,
  selectedEnvLots,
  onToggle,
  onSelectAll,
  onConfirm,
  onCancel,
  isRegenerate = false,
  generatedEnvLots = [],
  templateIsOutdated = false,
  staleEnvLotIds = []
}) => {
  const storeStaleEnvLotIds = useStore((state) => state.staleEnvLotIds || []);
  const [envLotSearch, setEnvLotSearch] = useState("");

  const filteredItems = availableEnvLots.filter((item) => {
    const search = envLotSearch.trim().toLowerCase();
    if (!search) return true;
    if (isRegenerate) {
        return String(item.envLotNo).toLowerCase().includes(search) || 
               item.catches.some(c => String(c).toLowerCase().includes(search));
    }
    return String(item.catchNo).toLowerCase().includes(search);
  });

  return (
    <Modal
      title={isRegenerate ? "Select Envelope Lots to Regenerate" : "Select Catches For Processing"}
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      width={600}
      okText={isRegenerate ? "Regenerate" : "Generate"}
      cancelText="Cancel"
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message={isRegenerate ? "Existing Envelope Lot Assignments" : "Catches with missing Envelope Lot"}
          description={isRegenerate ? "Select the envelope lots you want to regenerate." : "Select the catch numbers you want to process."}
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
        <Input.Search
          placeholder={isRegenerate ? "Search Env Lot or Catch No" : "Search Catch No"}
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
          Select All {isRegenerate ? "Lots" : "Catches"} ({availableEnvLots.length})
        </Checkbox>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 400, overflowY: "auto" }}>
         {filteredItems.map((item) => {
            const itemId = isRegenerate ? item.envLotNo : item.catchNo;
            const isSelected = selectedEnvLots.includes(itemId);
            
            return (
              <Card
                key={itemId}
                size="small"
                style={{
                  backgroundColor: isSelected ? "#f0f5ff" : "#fafafa",
                  border: isSelected ? "1px solid #91caff" : "1px solid #d9d9d9"
                }}
              >
                <Checkbox
                  checked={isSelected}
                  onChange={(e) => onToggle(itemId, e.target.checked)}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    {isRegenerate ? (
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                <Text strong style={{ fontSize: "14px" }}>Env Lot {item.envLotNo}</Text>
                                {((Array.isArray(storeStaleEnvLotIds) && storeStaleEnvLotIds.map(n => Number(n)).includes(Number(item.envLotNo))) ||
                                  (Array.isArray(staleEnvLotIds) && staleEnvLotIds.map(n => Number(n)).includes(Number(item.envLotNo)))) && (
                                  <Tag color="orange" style={{ marginLeft: 8 }}>Outdated</Tag>
                                )}
                            </div>
                            <Text type="secondary" style={{ fontSize: "12px" }}>Catches: {item.catches.join(', ')}</Text>
                        </div>
                    ) : (
                        <Text strong style={{ fontSize: "14px" }}>Catch No {item.catchNo}</Text>
                    )}
                  </div>
                </Checkbox>
              </Card>
            );
          })}
      </div>

      {selectedEnvLots.length > 0 && (
        <div style={{ marginTop: 16, padding: "8px 12px", backgroundColor: "#e6f7ff", borderRadius: 4 }}>
          <Text strong style={{ color: "#1890ff" }}>
            {selectedEnvLots.length} {isRegenerate ? "lot(s)" : "catche(s)"} selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default EnvLotSelectionModal;
