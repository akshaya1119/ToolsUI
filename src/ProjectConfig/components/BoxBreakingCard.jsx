import React from "react";
import { Card, Select, Typography, Tag, Checkbox, InputNumber } from "antd";
import { DatabaseFilled, LockFilled } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";

const { Text } = Typography;
const { Option } = Select;

const BoxBreakingCard = ({
  isEnabled,
  setBoxBreakingCriteria,
  fields,
  selectedBoxFields,
  setSelectedBoxFields,
  selectedCapacity,
  setSelectedCapacity,
  boxCapacities,
  startBoxNumber,
  setStartBoxNumber,
  selectedDuplicatefields,
  setSelectedDuplicatefields,
  selectedSortingField,
  setSelectedSortingField,
  resetOnSymbolChange,
  setResetOnSymbolChange,
  isInnerBundlingDone,
  setIsInnerBundlingDone,
  innerBundlingCriteria,
  setInnerBundlingCriteria,
}) => {
  // Helper function to manage field concatenation criteria
  const handleBoxBreakingFields = (selectedFields) => {
    setSelectedBoxFields(selectedFields);
    if (selectedFields.length > 0) {
      setBoxBreakingCriteria(prev => prev.includes("boxFields") ? prev : [...prev, "boxFields"]);
    } else {
      setBoxBreakingCriteria(prev => prev.filter(i => i !== "boxFields"));
    }
  };

  const handleSorting = (selectedFields) => {
    setSelectedSortingField(selectedFields);
    if (selectedFields.length > 0) {
      setBoxBreakingCriteria(prev => prev.includes("sortingFields") ? prev : [...prev, "sortingFields"]);
    } else {
      setBoxBreakingCriteria(prev => prev.filter(i => i !== "sortingFields"));
    }
  };

  const handleDuplicateFields = (selectedFields) => {
    setSelectedDuplicatefields(selectedFields);
    if (selectedFields.length > 0) {
      setBoxBreakingCriteria(prev => prev.includes("duplicateFields") ? prev : [...prev, "duplicateFields"]);
    } else {
      setBoxBreakingCriteria(prev => prev.filter(i => i !== "duplicateFields"));
    }
  };

  const handleInnerBundling = (selectedFields) => {
    setInnerBundlingCriteria(selectedFields);
  };

  { console.log(startBoxNumber) }

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <DatabaseFilled style={iconStyle} /> Box Breaking Criteria
            </span>
            <br />
            <Text type="secondary">
              Define conditions that trigger creation of new boxes
            </Text>
          </div>
        }
        extra={
          !isEnabled("Box Breaking") ? (
            <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
              Disabled
            </Tag>
          ) : null
        }
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            columnGap: 12,
            rowGap: 8,
            marginTop: 12,
          }}
        >

          {/* Breaking by Capacity checkbox and Select */}
          <div className="flex gap-2">
            <div>
              <Checkbox
                checked={true} // Always enabled
                disabled
              >
                Breaking by Capacity <Text type="secondary"></Text>
              </Checkbox>

              <Select
                disabled={!isEnabled("Box Breaking")}
                value={selectedCapacity}
                onChange={setSelectedCapacity}
                style={{ width: "100%" }}
                placeholder="Select or enter capacity"
              >
                {boxCapacities.map((capacity) => (
                  <Option key={capacity.boxCapacityId} value={capacity.boxCapacityId}>
                    {capacity.capacity}
                  </Option>
                ))}
              </Select>
            </div>
            <div>
              <Text type="secondary">Starting Box Number</Text>
              <InputNumber
                disabled={!isEnabled("Box Breaking")}
                min={1}
                value={startBoxNumber}
                onChange={(value) => setStartBoxNumber(value)}
                placeholder="Enter Start Box Number"
                style={{ width: "100%" }}
              />
            </div>

          </div>

          {/* Reset Box Number on Course Change */}
          <div style={{ marginTop: 8 }}>
            <Checkbox
              checked={resetOnSymbolChange}
              onChange={(e) => setResetOnSymbolChange(e.target.checked)}
              disabled={!isEnabled("Box Breaking")}
            >
              Reset Box Number on Course Change
            </Checkbox>
          </div>
          {/* Select fields to concatenate */}
          <div>
            <Text strong>Fields on which Duplicates has to be removed</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled("Box Breaking")}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedDuplicatefields}
              onChange={handleDuplicateFields}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <Text strong>Sorting Report way</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled("Box Breaking")}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedSortingField}
              onChange={handleSorting}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
          {/* Inner Bundling */}
          <div>
            <div style={{ marginBottom: 4 }}>
              <Checkbox
                checked={isInnerBundlingDone}
                onChange={(e) => setIsInnerBundlingDone(e.target.checked)}
                disabled={!isEnabled("Box Breaking")}
              >
                <Text strong>Is Inner Bundling in this project?</Text>
              </Checkbox>
            </div>
            <Select
              mode="multiple"
              disabled={!isEnabled("Box Breaking") || !isInnerBundlingDone}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select fields for inner bundling criteria"
              value={innerBundlingCriteria}
              onChange={handleInnerBundling}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
          <div>
            <Text strong>Select Box Breaking field</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled("Box Breaking")}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedBoxFields}
              onChange={handleBoxBreakingFields}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default BoxBreakingCard;
