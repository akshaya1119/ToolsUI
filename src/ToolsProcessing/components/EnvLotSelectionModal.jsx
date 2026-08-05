import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import {
  Modal,
  Alert,
  Checkbox,
  Card,
  Typography,
  Input,
  Tag,
  Spin,
  message
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
  showAssigned = false,
  projectId
}) => {
  const navigate = useNavigate();
  const apiBaseUrl = (import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || '').replace(/\/api\/?$/i, '');
  const storeStaleEnvLotIds = useStore(
    (state) => state.staleEnvLotIds || []
  );

  const [envLotSearch, setEnvLotSearch] = useState("");
  const [unverifiedCatch, setUnverifiedCatch] = useState(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const debounceTimer = useRef(null);

  // Run debounced verification check when user stops typing for 3 seconds
  const checkCatchVerification = async (catchNo) => {
    if (!catchNo || showAssigned || !projectId) {
      setUnverifiedCatch(null);
      setIsVerifying(false);
      return;
    }

    // 1. If catch is already in the verified/unassigned list, just filter — no API needed
    const verifiedCatch = unassignedCatches.find(
      c => c.catchNo?.toString().toLowerCase() === catchNo.toLowerCase()
    );
    if (verifiedCatch) {
      setUnverifiedCatch(null);
      setIsVerifying(false);
      return;
    }

    // 2. Check verification status from API
    try {
      const { data } = await axios.get(
        `${apiBaseUrl}/api/NRDataLots/GetCatchVerificationStatus/${projectId}/${catchNo}`
      );

      if (data.verificationStatus === 0 || data.verificationStatus === 2) {
        setUnverifiedCatch({
    catchNo,
    verificationStatus: data.verificationStatus,
  });;
      } else {
        // Verified but not in unassigned list — show info
        message.info("Catch is already verified.");
        setUnverifiedCatch(null);
      }
    } catch (err) {
      setUnverifiedCatch(null);
      if (err.response?.status === 404) {
        message.error("Catch not found.");
      } else {
        message.error("Failed to check catch status.");
      }
    } finally {
      setIsVerifying(false);
    }
  };

  const handleInputChange = (e) => {
    const value = e.target.value;
    setEnvLotSearch(value);

    // Clear unverified state immediately when input changes
    setUnverifiedCatch(null);

    // Cancel any pending debounce
    if (debounceTimer.current) clearTimeout(debounceTimer.current);

    if (!value.trim()) {
      setIsVerifying(false);
      return;
    }

    // Only show verifying spinner for catches not already in the local list
    const alreadyInList = unassignedCatches.some(
      c => c.catchNo?.toString().toLowerCase().includes(value.trim().toLowerCase())
    );
    if (!alreadyInList && !showAssigned && projectId) {
      setIsVerifying(true);
    }

    // Debounce: fire verification check 1.5 seconds after user stops typing
    debounceTimer.current = setTimeout(() => {
      checkCatchVerification(value.trim());
    }, 2000);
  };

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, []);

  // Assigned Env Lots OR Unassigned Catches
  const sourceItems = showAssigned
    ? assignedEnvLots
    : unassignedCatches;
//  console.log("sourceItems", sourceItems);
//  console.log("showAssigned:", showAssigned);
// console.log("assignedEnvLots:", assignedEnvLots);
// console.log("unassignedCatches:", unassignedCatches);
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
      onOk={unverifiedCatch? () =>navigate( `/headerverification?catch=${unverifiedCatch.catchNo}&status=${unverifiedCatch.verificationStatus}`): onConfirm}
      onCancel={onCancel}
      width={600}
      okText={unverifiedCatch ? "Verify Catch" : "Generate"}
      cancelText="Cancel"
      okButtonProps={{ disabled: !unverifiedCatch && (sourceItems.length === 0 || selectedEnvLots.length === 0) }}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          description={
            showAssigned
              ? "Select assigned batches for processing."
              : "Select unassigned catches for processing."
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />

        <Input.Search
          placeholder={
            showAssigned
              ? "Search Batch / Catch"
              : "Search Catch No"
          }
          value={envLotSearch}
          allowClear
          onChange={handleInputChange}
          onClear={() => { setEnvLotSearch(""); setUnverifiedCatch(null); if (debounceTimer.current) clearTimeout(debounceTimer.current); }}
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
          Show assigned batches
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
          Select All {showAssigned ? "Batches" : "Catches"} (
          {filteredItems.length})
        </Checkbox>
      </div>

      {sourceItems.length === 0 && !unverifiedCatch && !isVerifying ? (
        <Alert
          message={showAssigned ? "No batches to process" : "No catches to process"}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
      ) : filteredItems.length === 0 && !unverifiedCatch && isVerifying ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", marginBottom: 16, color: "#595959" }}>
          <Spin size="small" />
          <span>Checking catch verification status...</span>
        </div>
      ) : filteredItems.length === 0 && !unverifiedCatch && !isVerifying ? (
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
        {unverifiedCatch && (
          <Card
            size="small"
            style={{
              backgroundColor: "#fff2e8",
              border: "1px solid #ffbb96",
              marginBottom: 8
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Text strong style={{ fontSize: "14px", color: "#d4380d" }}>
                  Catch No : {unverifiedCatch.catchNo}
                </Text>
                <Tag color="error">Not Verified</Tag>
              </div>
              <Text type="secondary" style={{ fontSize: "12px" }}>
                This catch requires header verification.
              </Text>
            </div>
          </Card>
        )}
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
                          Batch {item.envLotNo}
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
              ? "batch(es)"
              : "catch(es)"}{" "}
            selected
          </Text>
        </div>
      )}
    </Modal>
  );
};

export default EnvLotSelectionModal;