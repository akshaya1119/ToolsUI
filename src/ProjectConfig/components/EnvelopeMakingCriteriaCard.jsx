import React, { useEffect, useState } from "react";
import { Card, Select, Typography, Tag, InputNumber, Checkbox, Button } from "antd";
import { ContainerFilled, LockFilled, UndoOutlined } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";

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
  importedSnapshot,
  typeId,
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 4 };

  const resolveDefaultMssCount = (value) => {
    const numericType = Number(value);
    if (numericType === 2) return 1; // Paper
    if (numericType === 1) return 3; // Booklet
    return 1;
  };

  const [mssCount, setMssCount] = useState(() => resolveDefaultMssCount(typeId));
  const [mssTouched, setMssTouched] = useState(false);
  const [mssInsertPosition, setMssInsertPosition] = useState("end");

  useEffect(() => {
    if (!mssTouched) {
      setMssCount(resolveDefaultMssCount(typeId));
    }
  }, [typeId, mssTouched]);

  const getDynamicSortLabel = (selectedIds) => {
    if (!selectedIds || selectedIds.length === 0) {
      return "Sort by this field then by this after comma separated";
    }
    const names = selectedIds.map(id => {
      const field = fields.find(f => f.fieldId === id);
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnabled("Envelope Breaking") && (
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                onClick={onReset}
                style={{ color: PRIMARY_COLOR }}
              >
                Reset
              </Button>
            )}
            {!isEnabled("Envelope Breaking") && (
              <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
                Disabled
              </Tag>
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
          <div style={{ flex: "1 1 100%", ...( isDirty(selectedEnvelopeFields, importedSnapshot?.selectedEnvelopeFields) ? DIRTY_STYLE : {}) }}>
            <Text strong>Select sort fields</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled("Envelope Breaking")}
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
              disabled={!isEnabled("Envelope Breaking")}
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
              disabled={!isEnabled("Envelope Breaking")}
              value={startOmrEnvelopeNumber}
              onChange={(value) => setStartOmrEnvelopeNumber(value ?? 0)}
              placeholder="Enter Start OMR Serial Number"
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>

          {/* Reset Booklet Serial - 50% */}
          <div style={{ flex: "1 1 48%", ...(isDirty(resetBookletSerialOnCatchChange, importedSnapshot?.resetBookletSerialOnCatchChange) ? DIRTY_STYLE : {}) }}>
            <Checkbox
              disabled={!isEnabled("Envelope Breaking")}
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
              disabled={!isEnabled("Envelope Breaking")}
              value={startBookletSerialNumber}
              onChange={(value) => setStartBookletSerialNumber(value ?? 0)}
              placeholder="Enter Start Booklet Serial Number"
              style={{ width: "100%", marginTop: 4 }}
            />
          </div>

          {/* MSS Count - 50% */}
          <div style={{ flex: "1 1 48%" }}>
            <Text strong>MSS Count</Text>
            <InputNumber
              min={0}
              disabled={!isEnabled("Envelope Breaking")}
              value={mssCount}
              onChange={(value) => {
                setMssTouched(true);
                setMssCount(value ?? 0);
              }}
              placeholder="Enter MSS count"
              style={{ width: "100%", marginTop: 4 }}
            />
            <Text type="secondary" style={{ display: "block", fontSize: 12, marginTop: 2 }}>
              {Number(typeId) === 2
                ? "Type: Paper (default MSS count 1)"
                : Number(typeId) === 1
                  ? "Type: Booklet (default MSS count 3)"
                  : "Type not set (default MSS count 1)"}
            </Text>
          </div>

          {/* MSS Row Insert Position - 50% */}
          <div style={{ flex: "1 1 48%" }}>
            <Text strong>MSS Row Insert Position</Text>
            <Select
              disabled={!isEnabled("Envelope Breaking")}
              value={mssInsertPosition}
              onChange={setMssInsertPosition}
              style={{ width: "100%", marginTop: 4 }}
            >
              <Option value="start">Start</Option>
              <Option value="end">End</Option>
            </Select>
          </div>
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default EnvelopeMakingCriteriaCard;
