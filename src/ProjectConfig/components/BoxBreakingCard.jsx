import React from "react";
import { Card, Select, Typography, Tag, Checkbox, InputNumber, Button } from "antd";
import { DatabaseFilled, LockFilled, UndoOutlined, DeleteOutlined } from "@ant-design/icons";
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
  selectedUniversityExtraBoxFields,
  setSelectedUniversityExtraBoxFields,
  selectedOfficeExtraBoxFields,
  setSelectedOfficeExtraBoxFields,
  selectedNodalExtraBoxFields,
  setSelectedNodalExtraBoxFields,
  extraProcessingConfig,
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
  onReset,
  onClear,
  importedSnapshot,
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 6, borderRadius: 2 };
  
  // Helper function to manage field concatenation criteria
  const handleBoxBreakingFields = (selectedFields) => {
    setSelectedBoxFields(selectedFields);
    if (selectedFields.length > 0) {
      setBoxBreakingCriteria(prev => prev.includes("boxFields") ? prev : [...prev, "boxFields"]);
    } else {
      setBoxBreakingCriteria(prev => prev.filter(i => i !== "boxFields"));
    }

    if (selectedUniversityExtraBoxFields.length === 0 || JSON.stringify(selectedUniversityExtraBoxFields) === JSON.stringify(selectedBoxFields)) {
      setSelectedUniversityExtraBoxFields(selectedFields);
    }
    if (selectedOfficeExtraBoxFields.length === 0 || JSON.stringify(selectedOfficeExtraBoxFields) === JSON.stringify(selectedBoxFields)) {
      setSelectedOfficeExtraBoxFields(selectedFields);
    }
    if (selectedNodalExtraBoxFields.length === 0 || JSON.stringify(selectedNodalExtraBoxFields) === JSON.stringify(selectedBoxFields)) {
      setSelectedNodalExtraBoxFields(selectedFields);
    }
  };

  const handleUniversityExtraBoxBreakingFields = (selectedFields) => {
    setSelectedUniversityExtraBoxFields(selectedFields);
    // You can add specific criteria mapping if needed
  };

  const handleOfficeExtraBoxBreakingFields = (selectedFields) => {
    setSelectedOfficeExtraBoxFields(selectedFields);
    // You can add specific criteria mapping if needed
  };

  const handleNodalExtraBoxBreakingFields = (selectedFields) => {
    setSelectedNodalExtraBoxFields(selectedFields);
    // You can add specific criteria mapping if needed
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

  const isExtraConfigured = (keyword) => {
    if (!extraProcessingConfig) return false;
    const key = Object.keys(extraProcessingConfig).find(k => k.toLowerCase().includes(keyword.toLowerCase()));
    if (!key) return false;
    const config = extraProcessingConfig[key];
    const hasFixed = config.fixedQty > 0;
    const hasPercentage = config.percentage > 0;
    const hasRange = Array.isArray(config.range) && config.range.some(r => r.value > 0);
    const hasNodal = config.isPerNodal && Array.isArray(config.nodalConfigs) && config.nodalConfigs.some(nc => nc.value > 0);
    return hasFixed || hasPercentage || hasRange || hasNodal;
  };

  const isUniversityEnabled = isEnabled("Box Breaking") && isExtraConfigured("university");
  const isOfficeEnabled = isEnabled("Box Breaking") && isExtraConfigured("office");
  const isNodalEnabled = isEnabled("Box Breaking") && isExtraConfigured("nodal");

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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnabled("Box Breaking") && (
              <>
                <Button
                  type="text"
                  size="small"
                  icon={<UndoOutlined />}
                  onClick={onReset}
                  style={{ color: PRIMARY_COLOR }}
                >
                  Reset
                </Button>
                <Button
                  type="text"
                  size="small"
                  icon={<DeleteOutlined />}
                  onClick={onClear}
                  style={{ color: "#ff4d4f" }}
                >
                  Clear
                </Button>
              </>
            )}
            {!isEnabled("Box Breaking") && (
              <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
                Disabled
              </Tag>
            )}
          </div>
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
          <div className="flex gap-2" style={isDirty(selectedCapacity, importedSnapshot?.selectedCapacity) || isDirty(startBoxNumber, importedSnapshot?.startBoxNumber) ? DIRTY_STYLE : {}}>
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
          <div style={{ marginTop: 8, ...(isDirty(resetOnSymbolChange, importedSnapshot?.resetOnSymbolChange) ? DIRTY_STYLE : {}) }}>
            <Checkbox
              checked={resetOnSymbolChange}
              onChange={(e) => setResetOnSymbolChange(e.target.checked)}
              disabled={!isEnabled("Box Breaking")}
            >
              Reset Box Number on Course Change
            </Checkbox>
          </div>
          {/* Select fields to concatenate */}
          <div style={isDirty(selectedDuplicatefields, importedSnapshot?.selectedDuplicatefields) ? DIRTY_STYLE : {}}>
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
          <div style={isDirty(selectedSortingField, importedSnapshot?.selectedSortingField) ? DIRTY_STYLE : {}}>
            <Text strong>Sorting Report Fields</Text>
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
            <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginTop: 2 }}>
              {getDynamicSortLabel(selectedSortingField)}
            </Text>
          </div>
          {/* Inner Bundling */}
          <div style={isDirty(isInnerBundlingDone, importedSnapshot?.isInnerBundlingDone) || isDirty(innerBundlingCriteria, importedSnapshot?.innerBundlingCriteria) ? DIRTY_STYLE : {}}>
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
          <div style={isDirty(selectedBoxFields, importedSnapshot?.selectedBoxFields) ? DIRTY_STYLE : {}}>
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
          <div style={isDirty(selectedUniversityExtraBoxFields, importedSnapshot?.selectedUniversityExtraBoxFields) ? DIRTY_STYLE : {}}>
            <Text strong>Select Box Breaking field for University Extra</Text>
            <Select
              mode="multiple"
              disabled={!isUniversityEnabled}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedUniversityExtraBoxFields}
              onChange={handleUniversityExtraBoxBreakingFields}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
          <div style={isDirty(selectedOfficeExtraBoxFields, importedSnapshot?.selectedOfficeExtraBoxFields) ? DIRTY_STYLE : {}}>
            <Text strong>Select Box Breaking field for Office Extra</Text>
            <Select
              mode="multiple"
              disabled={!isOfficeEnabled}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedOfficeExtraBoxFields}
              onChange={handleOfficeExtraBoxBreakingFields}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
          <div style={isDirty(selectedNodalExtraBoxFields, importedSnapshot?.selectedNodalExtraBoxFields) ? DIRTY_STYLE : {}}>
            <Text strong>Select Box Breaking field for Nodal Extra</Text>
            <Select
              mode="multiple"
              disabled={!isNodalEnabled}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedNodalExtraBoxFields}
              onChange={handleNodalExtraBoxBreakingFields}
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
