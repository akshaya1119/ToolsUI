import React, { useEffect, useState } from "react";
import { Card, Select, Checkbox, InputNumber, Typography, Space, Tag, Button, Row, Col } from "antd";
import API from "./../hooks/api";
import useStore from "./../stores/ProjectData";
import { CopyFilled, LockFilled, UndoOutlined } from "@ant-design/icons";
import { iconStyle, PRIMARY_COLOR } from "../ProjectConfig/components/constants";

const { Text } = Typography;
const { Option } = Select;

const DuplicateTool = ({ isEnabled, duplicateConfig = {}, setDuplicateConfig, onReset, importedSnapshot }) => {
  const projectId = useStore((state) => state.projectId);
  const [fields, setFields] = useState([]);

  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 6, borderRadius: 2 };

  useEffect(() => {
    if (!projectId) return;
    API.get(`/Fields`)
      .then((res) => setFields(res.data || []))
      .catch((err) => console.error("Failed to fetch fields", err));
  }, [projectId]);

  const enabled = isEnabled("Duplicate Tool");

  const handleFieldChange = (value) => {
    setDuplicateConfig((prev) => ({ ...prev, duplicateCriteria: value }));
  };

  const handleEnhancementChange = (checked) => {
    setDuplicateConfig((prev) => ({
      ...prev,
      enhancementEnabled: checked,
    }));
  };

  const handlePercentChange = (val) => {
    setDuplicateConfig((prev) => ({ ...prev, enhancement: val }));
  };

  return (
    <Card
      title={
        <div>
          <span>
            <CopyFilled style={iconStyle} /> Duplicate Tool
          </span>
          <br />
          <Text type="secondary">
            Define conditions that trigger creation of new boxes
          </Text>
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {enabled && (
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
          {!enabled && (
            <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>Disabled</Tag>
          )}
        </div>
      }
      bordered
      style={{ marginTop: 16, marginBottom: 16, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
    >
      <Row gutter={24} style={{ width: "100%" }}>

        {/* 3/4 Width */}
        <Col span={18} style={isDirty(duplicateConfig?.duplicateCriteria, importedSnapshot?.duplicateConfig?.duplicateCriteria) ? DIRTY_STYLE : {}}>
          <Text strong>Select fields to concatenate</Text>
          <Select
            mode="multiple"
            allowClear
            showSearch
            disabled={!enabled}
            style={{ width: "100%", marginTop: 4 }}
            placeholder="Select one or more fields"
            value={duplicateConfig?.duplicateCriteria || []}
            onChange={handleFieldChange}
            optionFilterProp="children"
          >
            {fields.map((f) => (
              <Option key={f.fieldId} value={f.fieldId}>
                {f.name}
              </Option>
            ))}
          </Select>
        </Col>

        {/* 1/4 Width */}
        <Col span={6} style={isDirty(duplicateConfig?.enhancement, importedSnapshot?.duplicateConfig?.enhancement) ? DIRTY_STYLE : {}}>
          <Text strong>Enhancement</Text>

          <InputNumber
            value={duplicateConfig?.enhancement || 0}
            disabled={!enabled}
            onChange={handlePercentChange}
            style={{ marginTop: 8, width: "100%" }}
            addonAfter="%"
            min={0}
            max={100}
          />
        </Col>

      </Row>
    </Card>
  );
};

export default DuplicateTool;
