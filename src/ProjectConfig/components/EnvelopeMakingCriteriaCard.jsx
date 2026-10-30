import React, { useEffect, useState } from "react";
import { Card, Select, Typography, Tag, InputNumber, Checkbox, Button, Tooltip, Space, Input, Divider, message } from "antd";
import {
  ContainerFilled,
  LockFilled,
  UndoOutlined,
  DeleteOutlined,
  CheckOutlined,
  CloseOutlined,
  EditOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";
import API from "../../hooks/api";

const { Text } = Typography;
const { Option } = Select;

const EnvelopeMakingCriteriaCard = ({
  isEnabled,
  fields,
  selectedEnvelopeFields,
  setSelectedEnvelopeFields,
  startOmrEnvelopeNumber,
  setStartOmrEnvelopeNumber,
  resetOmrSerialOnCatchChange,
  setResetOmrSerialOnCatchChange,
  startBookletSerialNumber,
  setStartBookletSerialNumber,
  resetBookletSerialOnCatchChange,
  setResetBookletSerialOnCatchChange,
  onReset,
  onClear,
  importedSnapshot,
  mssList,
  selectedMss,
  setSelectedMss,
  mssInsertPosition,
  setMssInsertPosition,
  useCustomCatchSerial = false,
  setUseCustomCatchSerial = () => {},
  customCatchSerials = [],
  setCustomCatchSerials = () => {},
  projectId = null,
  canEdit = true,
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 4 };

  const [availableCatches, setAvailableCatches] = useState([]);
  const [loadingCatches, setLoadingCatches] = useState(false);
  const [selectedCatch, setSelectedCatch] = useState(null);
  const [startSerialInput, setStartSerialInput] = useState(1);
  const [customCatchInput, setCustomCatchInput] = useState("");
  const [editingCatch, setEditingCatch] = useState(null);

  // Fetch available catches for the project
  useEffect(() => {
    if (projectId) {
      setLoadingCatches(true);
      API.get(`/ProjectConfigs/Catches/${projectId}`)
        .then((res) => {
          if (Array.isArray(res.data)) {
            setAvailableCatches(res.data);
          }
        })
        .catch((err) => {
          console.error("Failed to fetch catches:", err);
        })
        .finally(() => setLoadingCatches(false));
    }
  }, [projectId]);

  const handleSaveCatchSerial = () => {
    if (!selectedCatch) {
      message.warning("Please select or enter a catch number.");
      return;
    }
    const startVal = Number(startSerialInput) || 1;
    const currentList = Array.isArray(customCatchSerials) ? [...customCatchSerials] : [];
    const existingIndex = currentList.findIndex(
      (item) => item.catchNo?.toString().toLowerCase() === selectedCatch.toString().toLowerCase()
    );

    if (existingIndex >= 0) {
      currentList[existingIndex] = {
        ...currentList[existingIndex],
        catchNo: selectedCatch,
        startSerial: startVal,
      };
      message.success(`Updated Catch ${selectedCatch} starting serial to ${startVal}`);
    } else {
      currentList.push({
        catchNo: selectedCatch,
        startSerial: startVal,
      });
      message.success(`Saved Catch ${selectedCatch} starting serial: ${startVal}`);
    }

    setCustomCatchSerials(currentList);
    setSelectedCatch(null);
    setStartSerialInput(1);
    setEditingCatch(null);
  };

  const handleCancelCatchSerial = () => {
    setSelectedCatch(null);
    setStartSerialInput(1);
    setEditingCatch(null);
    setCustomCatchInput("");
  };

  const handleEditCatchSerial = (item) => {
    setSelectedCatch(item.catchNo);
    setStartSerialInput(item.startSerial);
    setEditingCatch(item.catchNo);
  };

  const handleDeleteCatchSerial = (catchNo) => {
    const currentList = (customCatchSerials || []).filter(
      (item) => item.catchNo?.toString().toLowerCase() !== catchNo.toString().toLowerCase()
    );
    setCustomCatchSerials(currentList);
    if (editingCatch === catchNo) {
      handleCancelCatchSerial();
    }
    message.info(`Removed Catch ${catchNo}`);
  };

  const handleAddCustomCatch = () => {
    if (customCatchInput && customCatchInput.trim()) {
      const trimmed = customCatchInput.trim();
      if (!availableCatches.includes(trimmed)) {
        setAvailableCatches((prev) => [...prev, trimmed]);
      }
      setSelectedCatch(trimmed);
      setCustomCatchInput("");
    }
  };

  // Build catch options for dropdown
  const allCatchValues = Array.from(
    new Set([
      ...(selectedCatch ? [selectedCatch] : []),
      ...availableCatches,
      ...(customCatchSerials || []).map((c) => c.catchNo).filter(Boolean),
    ])
  );
  const catchOptions = allCatchValues.map((c) => ({ label: c, value: c }));

  const getDynamicSortLabel = (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) {
      return "Sort by this field then by this after comma separated";
    }
    const names = selectedIds.map((id) => {
      const field = fields.find((f) => f.fieldId === id);
      return field ? field.name : id;
    });
    return `Sort by ${names.join(" then by ")}`;
  };

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <ContainerFilled style={iconStyle} /> Envelope Making Criteria (Serial Numbering)
            </span>
            <br />
            <Text type="secondary">
              Define conditions that numbers Envelope
            </Text>
          </div>
        }
        extra={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isEnabled("Envelope Setup and Enhancement") && (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={() => {
                    handleCancelCatchSerial();
                    onReset();
                  }}
                  disabled={!canEdit}
                  style={{ color: canEdit ? PRIMARY_COLOR : undefined }}
                >
                  Reset
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={() => {
                    handleCancelCatchSerial();
                    onClear();
                  }}
                  disabled={!canEdit}
                  style={{ color: canEdit ? "#ff4d4f" : undefined }}
                >
                  Clear
                </Button>
              </>
            )}
            {!isEnabled("Envelope Setup and Enhancement") && (
              <Tag color="default">Not Enabled</Tag>
            )}
          </div>
        }
      >
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 16,
            marginTop: 12,
          }}
        >
          {/* Select Sort Fields - Full Width */}
          <div style={{ flex: "1 1 100%", ...(isDirty(selectedEnvelopeFields, importedSnapshot?.selectedEnvelopeFields) ? DIRTY_STYLE : {}) }}>
            <Text strong>Select sort fields</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedEnvelopeFields}
              onChange={setSelectedEnvelopeFields}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
            <Text
              type="secondary"
              style={{ fontSize: "12px", display: "block", marginTop: 2 }}
            >
              {getDynamicSortLabel(selectedEnvelopeFields)}
            </Text>
          </div>

          {/* Reset OMR - 50% */}
          <div style={{ flex: "1 1 48%", ...(isDirty(resetOmrSerialOnCatchChange, importedSnapshot?.resetOmrSerialOnCatchChange) ? DIRTY_STYLE : {}) }}>
            <Checkbox
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              checked={resetOmrSerialOnCatchChange}
              onChange={(e) =>
                setResetOmrSerialOnCatchChange(e.target.checked)
              }
            >
              <Text strong>Reset OMR Serial on Catch Change</Text>
            </Checkbox>
          </div>

          {/* Starting OMR - 50% */}
          <div style={{ flex: "1 1 48%", ...(isDirty(startOmrEnvelopeNumber, importedSnapshot?.startOmrEnvelopeNumber) ? DIRTY_STYLE : {}) }}>
            <Text strong>Starting OMR Serial Number</Text>
            <InputNumber
              min={0}
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              value={startOmrEnvelopeNumber}
              onChange={(value) => setStartOmrEnvelopeNumber(value ?? 0)}
              placeholder="Enter Start OMR Serial Number"
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>

          {/* Reset Booklet Serial - 50% */}
          <div style={{ flex: "1 1 48%", ...(isDirty(resetBookletSerialOnCatchChange, importedSnapshot?.resetBookletSerialOnCatchChange) ? DIRTY_STYLE : {}) }}>
            <Checkbox
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              checked={resetBookletSerialOnCatchChange}
              onChange={(e) =>
                setResetBookletSerialOnCatchChange(e.target.checked)
              }
            >
              <Text strong>Reset Booklet Serial on Catch Change</Text>
            </Checkbox>
          </div>

          {/* Starting Booklet Serial - 50% */}
          <div style={{ flex: "1 1 48%", ...(isDirty(startBookletSerialNumber, importedSnapshot?.startBookletSerialNumber) ? DIRTY_STYLE : {}) }}>
            <Text strong>Starting Booklet Serial Number</Text>
            <InputNumber
              min={0}
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              value={startBookletSerialNumber}
              onChange={(value) => setStartBookletSerialNumber(value ?? 0)}
              placeholder="Enter Start Booklet Serial Number"
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>

          {/* MSS Types */}
          <div style={{ flex: "1 1 48%", ...(isDirty(selectedMss, importedSnapshot?.selectedMss) ? DIRTY_STYLE : {}) }}>
            <Text strong style={{ display: "block", marginBottom: 4 }}>MSS Types</Text>
            {mssList && mssList.length > 0 ? (
              <Checkbox.Group
                disabled={!isEnabled("Envelope Setup and Enhancement")}
                value={selectedMss}
                onChange={setSelectedMss}
                options={mssList.map(m => ({ label: m.mssType, value: m.id }))}
                style={{ display: "flex", flexDirection: "column", gap: "8px" }}
              />
            ) : (
              <Text type="secondary">No MSS Types available</Text>
            )}
          </div>

          {/* MSS Row Insert Position - 50% */}
          <div style={{ flex: "1 1 48%", ...(isDirty(mssInsertPosition, importedSnapshot?.mssInsertPosition) ? DIRTY_STYLE : {}) }}>
            <Text strong>MSS Row Insert Position</Text>
            <Select
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              value={mssInsertPosition}
              onChange={setMssInsertPosition}
              style={{ width: "100%", marginTop: 4 }}
            >
              <Option value="start">Start</Option>
              <Option value="end">End</Option>
            </Select>
          </div>

          {/* Custom Catch-wise Serial - Checkbox */}
          <div
            style={{
              flex: "1 1 100%",
              marginTop: 4,
              paddingTop: 8,
              borderTop: "1px dashed #f0f0f0",
              ...(isDirty(useCustomCatchSerial, importedSnapshot?.useCustomCatchSerial) ? DIRTY_STYLE : {}),
            }}
          >
            <Checkbox
              disabled={!isEnabled("Envelope Setup and Enhancement")}
              checked={useCustomCatchSerial}
              onChange={(e) => setUseCustomCatchSerial(e.target.checked)}
            >
              <Text strong>Custom Catch-wise Serial</Text>
            </Checkbox>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginLeft: 24, marginTop: 2 }}>
              Define custom starting serial number for individual catches. Each catch will start with its configured serial.
            </Text>
          </div>

          {/* Custom Catch-wise Serial Details Configuration */}
          {useCustomCatchSerial && (
            <div
              style={{
                flex: "1 1 100%",
                background: "#f9fbfd",
                border: "1px solid #d9e2ec",
                borderRadius: 8,
                padding: 12,
                marginTop: 2,
                ...(isDirty(customCatchSerials, importedSnapshot?.customCatchSerials) ? DIRTY_STYLE : {}),
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <Text strong style={{ fontSize: 13, color: "#102a43" }}>
                  {editingCatch ? `Editing Catch: ${editingCatch}` : "Add Catch Starting Serial"}
                </Text>
                {customCatchSerials && customCatchSerials.length > 0 && (
                  <Tag color="cyan">
                    {customCatchSerials.length} Catch{customCatchSerials.length > 1 ? "es" : ""} Configured
                  </Tag>
                )}
              </div>

              {/* Form Controls: Catch Select, Serial Start No, Save (✔) & Cancel (✖) */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  marginBottom: 12,
                  padding: 8,
                  background: "#fff",
                  borderRadius: 6,
                  border: "1px solid #e2e8f0",
                }}
              >
                <div style={{ flex: "1 1 180px", minWidth: 140 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 2 }}>
                    Catch Selection <span style={{ color: "#ff4d4f" }}>*</span>
                  </Text>
                  <Select
                    showSearch
                    allowClear
                    placeholder="Select / Type Catch"
                    value={selectedCatch}
                    onChange={setSelectedCatch}
                    loading={loadingCatches}
                    style={{ width: "100%" }}
                    disabled={!isEnabled("Envelope Setup and Enhancement")}
                    filterOption={(input, option) =>
                      (option?.label ?? option?.value ?? "")
                        .toString()
                        .toLowerCase()
                        .includes(input.toLowerCase())
                    }
                    options={catchOptions}
                    dropdownRender={(menu) => (
                      <>
                        {menu}
                        <Divider style={{ margin: "6px 0" }} />
                        <div style={{ display: "flex", gap: 6, padding: "0 8px 6px" }}>
                          <Input
                            placeholder="Type custom catch"
                            size="small"
                            value={customCatchInput}
                            onChange={(e) => setCustomCatchInput(e.target.value)}
                            onKeyDown={(e) => {
                              e.stopPropagation();
                              if (e.key === "Enter") handleAddCustomCatch();
                            }}
                          />
                          <Button size="small" type="primary" onClick={handleAddCustomCatch}>
                            Add
                          </Button>
                        </div>
                      </>
                    )}
                  />
                </div>

                <div style={{ flex: "0 0 130px", minWidth: 110 }}>
                  <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 2 }}>
                    Serial Start No <span style={{ color: "#ff4d4f" }}>*</span>
                  </Text>
                  <InputNumber
                    min={1}
                    placeholder="Start No"
                    value={startSerialInput}
                    onChange={(val) => setStartSerialInput(val ?? 1)}
                    style={{ width: "100%" }}
                    disabled={!isEnabled("Envelope Setup and Enhancement")}
                  />
                </div>

                {/* Save and Cancel buttons with Tick (✔) and Cross (✖) icons */}
                <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                  <Tooltip title="Save Catch Serial (Tick)">
                    <Button
                      type="primary"
                      icon={<CheckOutlined />}
                      onClick={handleSaveCatchSerial}
                      disabled={!isEnabled("Envelope Setup and Enhancement") || !selectedCatch}
                      style={{
                        backgroundColor: "#52c41a",
                        borderColor: "#52c41a",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Save
                    </Button>
                  </Tooltip>
                  <Tooltip title="Cancel (Cross)">
                    <Button
                      danger
                      icon={<CloseOutlined />}
                      onClick={handleCancelCatchSerial}
                      disabled={!isEnabled("Envelope Setup and Enhancement")}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      Cancel
                    </Button>
                  </Tooltip>
                </div>
              </div>

              {/* Table of configured catch serials */}
              {customCatchSerials && customCatchSerials.length > 0 ? (
                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    border: "1px solid #e2e8f0",
                    borderRadius: 6,
                    background: "#fff",
                  }}
                >
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e2e8f0" }}>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#475569" }}>Catch No</th>
                        <th style={{ padding: "6px 10px", textAlign: "left", color: "#475569" }}>Serial Start No</th>
                        <th style={{ padding: "6px 10px", textAlign: "center", width: 70, color: "#475569" }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customCatchSerials.map((item, idx) => (
                        <tr
                          key={item.catchNo || idx}
                          style={{
                            borderBottom: "1px solid #f1f5f9",
                            background: editingCatch === item.catchNo ? "#f0fdf4" : undefined,
                          }}
                        >
                          <td style={{ padding: "6px 10px", fontWeight: 600 }}>
                            <Tag color="geekblue">{item.catchNo}</Tag>
                          </td>
                          <td style={{ padding: "6px 10px", fontWeight: 600, color: "#1677ff" }}>
                            {item.startSerial}
                          </td>
                          <td style={{ padding: "6px 10px", textAlign: "center" }}>
                            <Space size={2}>
                              <Tooltip title="Edit this catch">
                                <Button
                                  type="text"
                                  size="small"
                                  icon={<EditOutlined style={{ color: "#1677ff" }} />}
                                  onClick={() => handleEditCatchSerial(item)}
                                />
                              </Tooltip>
                              <Tooltip title="Delete">
                                <Button
                                  type="text"
                                  size="small"
                                  danger
                                  icon={<DeleteOutlined />}
                                  onClick={() => handleDeleteCatchSerial(item.catchNo)}
                                />
                              </Tooltip>
                            </Space>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div
                  style={{
                    padding: "10px",
                    background: "#fff",
                    border: "1px dashed #cbd5e1",
                    borderRadius: 6,
                    textAlign: "center",
                  }}
                >
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    No custom catch serial configured yet. Select a catch above, set serial start no, and click Save (✔).
                  </Text>
                </div>
              )}
            </div>
          )}
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default EnvelopeMakingCriteriaCard;
