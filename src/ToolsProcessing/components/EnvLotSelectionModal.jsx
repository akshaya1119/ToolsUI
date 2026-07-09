import React, { useState } from "react";
import {
  Modal,
  Alert,
  Checkbox,
  Card,
  Typography,
  Input,
  Tag
} from "antd";
import useStore from "../../stores/ProjectData";

const { Text } = Typography;

const EnvLotSelectionModal = ({
  visible,
  assignedEnvLots = [],
  unassignedCatches = [],
  selectedEnvLots = [],
  onToggle,
  onSelectAll,
  onToggleShowAssigned,
  onConfirm,
  onCancel,
  generatedEnvLots = [],
  templateIsOutdated = false,
  staleEnvLotIds = [],
  showAssigned = false
}) => {
  const storeStaleEnvLotIds = useStore(
    (state) => state.staleEnvLotIds || []
  );

  const [envLotSearch, setEnvLotSearch] = useState("");

  // Assigned Env Lots OR Unassigned Catches
  const sourceItems = showAssigned
    ? assignedEnvLots
    : unassignedCatches;
 console.log("sourceItems", sourceItems);
 console.log("showAssigned:", showAssigned);
console.log("assignedEnvLots:", assignedEnvLots);
console.log("unassignedCatches:", unassignedCatches);
  const filteredItems = sourceItems.filter((item) => {
    const search = envLotSearch.trim().toLowerCase();

    if (!search) return true;

    if (showAssigned) {
      return (
        String(item.envLotNo)
          .toLowerCase()
          .includes(search) ||
        (item.catches || []).some((c) =>
          String(c).toLowerCase().includes(search)
        )
      );
    }

    return String(item.catchNo)
      .toLowerCase()
      .includes(search);
  });

  const allSelected =
    filteredItems.length > 0 &&
    filteredItems.every((item) => {
      const itemId = showAssigned
        ? item.envLotNo
        : item.catchNo;

      return selectedEnvLots.includes(itemId);
    });

  const partiallySelected =
    selectedEnvLots.length > 0 && !allSelected;

  return (
    <Modal
      title="Select Catches For Processing"
      open={visible}
      onOk={onConfirm}
      onCancel={onCancel}
      width={600}
      okText="Generate"
      cancelText="Cancel"
      okButtonProps={{ disabled: sourceItems.length === 0 }}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          description={
            showAssigned
              ? "Select assigned envelope lots for processing."
              : "Select unassigned catches for processing."
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Input.Search
          placeholder={
            showAssigned
              ? "Search Env Lot / Catch"
              : "Search Catch No"
          }
          value={envLotSearch}
          allowClear
          onChange={(e) => setEnvLotSearch(e.target.value)}
          style={{ marginBottom: 12 }}
        />

        <Checkbox
          checked={showAssigned}
          onChange={(e) =>
            onToggleShowAssigned?.(e.target.checked)
          }
          style={{
            marginBottom: 12,
            marginRight: 12
          }}
        >
          Show assigned envelope lots
        </Checkbox>

        <Checkbox
          checked={allSelected}
          indeterminate={partiallySelected}
          onChange={(e) =>
            onSelectAll(e.target.checked)
          }
          disabled={sourceItems.length === 0}
          style={{
            marginBottom: 12,
            fontWeight: 500
          }}
        >
          Select All {showAssigned ? "Lots" : "Catches"} (
          {filteredItems.length})
        </Checkbox>
      </div>

      {sourceItems.length === 0 ? (
        <Alert
          message={showAssigned ? "No envelope lots to process" : "No catches to process"}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : filteredItems.length === 0 ? (
        <Alert
          message="No results found"
          description="Try adjusting your search criteria"
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : null}

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          maxHeight: 400,
          overflowY: "auto"
        }}
      >
        {filteredItems.map((item) => {
          const itemId = showAssigned
            ? item.envLotNo
            : item.catchNo;

          const isSelected =
            selectedEnvLots.includes(itemId);

          return (
            <Card
              key={itemId}
              size="small"
              style={{
                backgroundColor: isSelected
                  ? "#f0f5ff"
                  : "#fafafa",
                border: isSelected
                  ? "1px solid #91caff"
                  : "1px solid #d9d9d9"
              }}
            >
              <Checkbox
                checked={isSelected}
                onChange={(e) =>
                  onToggle(itemId, e.target.checked)
                }
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  {showAssigned ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column"
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center"
                        }}
                      >
                        <Text
                          strong
                          style={{
                            fontSize: "14px"
                          }}
                        >
                          Env Lot {item.envLotNo}
                        </Text>

                        {(
                          storeStaleEnvLotIds
                            .map(Number)
                            .includes(
                              Number(item.envLotNo)
                            ) ||
                          staleEnvLotIds
                            .map(Number)
                            .includes(
                              Number(item.envLotNo)
                            )
                        ) && (
                          <Tag
                            color="orange"
                            style={{
                              marginLeft: 8
                            }}
                          >
                            Outdated
                          </Tag>
                        )}
                      </div>

                      <Text
                        type="secondary"
                        style={{
                          fontSize: "12px"
                        }}
                      >
                        Catches:{" "}
                        {(item.catches || []).join(", ")}
                      </Text>
                    </div>
                  ) : (
                    <Text
                      strong
                      style={{
                        fontSize: "14px"
                      }}
                    >
                      Catch No {item.catchNo}
                    </Text>
                  )}
                </div>
              </Checkbox>
            </Card>
          );
        })}
      </div>

      {selectedEnvLots.length > 0 && (
        <div
          style={{
            marginTop: 16,
            padding: "8px 12px",
            backgroundColor: "#e6f7ff",
            borderRadius: 4
          }}
        >
          <Text
            strong
            style={{
              color: "#1890ff"
            }}
          >
            {selectedEnvLots.length}{" "}
            {showAssigned
              ? "lot(s)"
              : "catch(es)"}{" "}
            selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default EnvLotSelectionModal;