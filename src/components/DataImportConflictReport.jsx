import React from "react";
import { Alert, Button, Card, Empty, Input, Select, Space, Tabs, Tag, Typography } from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  FieldTimeOutlined,
  NumberOutlined,
  WarningOutlined,
} from "@ant-design/icons";

const { Text } = Typography;

const getValue = (item, ...keys) => {
  for (const key of keys) {
    if (item?.[key] !== undefined && item?.[key] !== null) {
      return item[key];
    }
  }
  return undefined;
};

const toArray = (value) => {
  if (Array.isArray(value)) return value.filter(Boolean);
  if (value === undefined || value === null || value === "") return [];
  return [value];
};

const getConflictKey = (item) => {
  const keyParts = [
    getValue(item, "conflictType", "ConflictType"),
    getValue(item, "catchNo", "CatchNo"),
    getValue(item, "centreCode", "CentreCode"),
    getValue(item, "nodalCode", "NodalCode"),
    getValue(item, "collegeName", "CollegeName"),
    getValue(item, "collegeCode", "CollegeCode"),
    getValue(item, "collegeKeyType", "CollegeKeyType"),
    getValue(item, "field", "Field"),
    getValue(item, "uniqueField", "UniqueField"),
    ...toArray(getValue(item, "conflictingValues", "ConflictingValues")),
  ];

  return keyParts.filter(Boolean).join("|");
};

const getConflictMeta = (conflictType) => {
  switch (conflictType) {
    case "catch_unique_field":
      return {
        title: "Catch No Conflict",
        color: "#1677ff",
        background: "#f0f7ff",
        icon: <FieldTimeOutlined />,
      };
    case "center_multiple_nodals":
      return {
        title: "Centre to Multiple Nodals",
        color: "#fa8c16",
        background: "#fff7e6",
        icon: <ApartmentOutlined />,
      };
    case "college_multiple_nodals":
      return {
        title: "College to Multiple Nodals",
        color: "#eb2f96",
        background: "#fff0f6",
        icon: <ApartmentOutlined />,
      };
    case "college_multiple_centers":
      return {
        title: "College to Multiple Centres",
        color: "#2f54eb",
        background: "#f0f5ff",
        icon: <ApartmentOutlined />,
      };
    case "nodal_multiple_centers":
      return {
        title: "Nodal to Multiple Centres",
        color: "#722ed1",
        background: "#f9f0ff",
        icon: <ApartmentOutlined />,
      };
    case "required_field_empty":
      return {
        title: "Required Field Missing",
        color: "#ff4d4f",
        background: "#fff1f0",
        icon: <WarningOutlined />,
      };
    case "zero_nr_quantity":
      return {
        title: "Zero NR Quantity",
        color: "#13c2c2",
        background: "#e6fffb",
        icon: <NumberOutlined />,
      };
    case "nodal_code_digit_mismatch":
      return {
        title: "Nodal Digit Mismatch",
        color: "#d4380d",
        background: "#fff2e8",
        icon: <DisconnectOutlined />,
      };
    default:
      return {
        title: "Conflict",
        color: "#595959",
        background: "#fafafa",
        icon: <WarningOutlined />,
      };
  }
};

const getConflictGroupLabel = (conflictType) => {
  switch (conflictType) {
    case "catch_unique_field":
      return "Catch Conflicts";
    case "center_multiple_nodals":
      return "Centre/Nodal Conflicts";
    case "college_multiple_nodals":
      return "College Mapping Conflicts";
    case "college_multiple_centers":
      return "College Mapping Conflicts";
    case "nodal_multiple_centers":
      return "Centre/Nodal Conflicts";
    case "required_field_empty":
      return "Required Field Conflicts";
    case "zero_nr_quantity":
      return "Quantity Conflicts";
    case "nodal_code_digit_mismatch":
      return "Nodal Code Conflicts";
    default:
      return "Other Conflicts";
  }
};

const normalizeConflict = (item) => {
  const conflictType = getValue(item, "conflictType", "ConflictType")
    || (getValue(item, "catchNo", "CatchNo") && getValue(item, "uniqueField", "UniqueField") ? "catch_unique_field" : "unknown");
  const uniqueField = getValue(item, "uniqueField", "UniqueField");
  const field = getValue(item, "field", "Field");
  const catchNo = getValue(item, "catchNo", "CatchNo");
  const centreCode = getValue(item, "centreCode", "CentreCode");
  const nodalCode = getValue(item, "nodalCode", "NodalCode");
  const nodalCodeGroup = getValue(item, "nodalCodeGroup", "NodalCodeGroup");
  const collegeName = getValue(item, "collegeName", "CollegeName");
  const collegeCode = getValue(item, "collegeCode", "CollegeCode");
  const collegeKeyType = getValue(item, "collegeKeyType", "CollegeKeyType");
  const conflictingValues = toArray(getValue(item, "conflictingValues", "ConflictingValues"));
  const catchNos = toArray(getValue(item, "catchNos", "CatchNos"));
  const nodalCodes = toArray(getValue(item, "nodalCodes", "NodalCodes"));
  const centerCodes = toArray(getValue(item, "centerCodes", "CenterCodes"));
  const canIgnore = Boolean(getValue(item, "canIgnore", "CanIgnore"));

  const details = {
    key: getConflictKey(item),
    conflictType,
    canIgnore,
    uniqueField,
    field,
    catchNo,
    collegeName,
    collegeCode,
    collegeKeyType,
    conflictingValues,
    catchNos,
    meta: getConflictMeta(conflictType),
    targetField: uniqueField || field,
    sourceField: null,
    sourceValue: null,
    matchValues: null,
    valuesForSelection: conflictingValues,
    resolveKind: "select",
    summary: "",
    groupLabel: getConflictGroupLabel(conflictType),
  };

  if (conflictType === "catch_unique_field") {
    details.sourceField = "CatchNo";
    details.sourceValue = catchNo;
    details.summary = `Catch No ${catchNo} has multiple ${uniqueField} values.`;
    return details;
  }

  if (conflictType === "center_multiple_nodals") {
    details.sourceField = "CenterCode";
    details.sourceValue = centreCode;
    details.valuesForSelection = nodalCodes;
    details.summary = `Centre ${centreCode} is linked with multiple nodal codes.`;
    return details;
  }

  if (conflictType === "college_multiple_nodals") {
    details.sourceField = collegeKeyType === "CollegeCode" ? "CollegeCode" : "CollegeName";
    details.sourceValue = collegeCode || collegeName;
    details.valuesForSelection = nodalCodes;
    details.summary = `College ${collegeCode || collegeName} is linked with multiple nodal codes.`;
    return details;
  }

  if (conflictType === "college_multiple_centers") {
    details.sourceField = collegeKeyType === "CollegeCode" ? "CollegeCode" : "CollegeName";
    details.sourceValue = collegeCode || collegeName;
    details.valuesForSelection = centerCodes;
    details.summary = `College ${collegeCode || collegeName} is linked with multiple exam centres.`;
    return details;
  }

  if (conflictType === "nodal_multiple_centers") {
    details.sourceField = "NodalCode";
    details.sourceValue = nodalCode;
    details.valuesForSelection = centerCodes;
    details.summary = `Nodal ${nodalCode} is linked with multiple exam centres.`;
    return details;
  }

  if (conflictType === "nodal_code_digit_mismatch") {
    details.sourceField = "NodalCode";
    details.sourceValue = nodalCodeGroup;
    details.matchValues = conflictingValues;
    details.summary = `Nodal codes ${conflictingValues.join(", ")} look like the same code with different digit counts.`;
    return details;
  }

  if (conflictType === "required_field_empty") {
    details.resolveKind = "input";
    details.summary = `${field} is missing for ${catchNos.length} catch number(s).`;
    return details;
  }

  if (conflictType === "zero_nr_quantity") {
    details.resolveKind = "ignore-only";
    details.summary = `NRQuantity is 0 for ${catchNos.length} catch number(s).`;
    return details;
  }

  details.resolveKind = "manual";
  details.summary = getValue(item, "error", "Error") || "Review this conflict.";
  return details;
};

const DataImportConflictReport = ({
  conflicts,
  conflictSelections,
  onSelectionChange,
  onResolve,
  onIgnore,
  loading,
}) => {
  if (!conflicts) {
    return <Text type="secondary">Click "Load Conflict" to see conflicts.</Text>;
  }

  const rawErrors = Array.isArray(conflicts)
    ? conflicts
    : conflicts?.errors || conflicts?.Errors || [];

  if (!rawErrors.length) {
    return <Empty description="No conflicts found" image={Empty.PRESENTED_IMAGE_SIMPLE} />;
  }

  const normalizedConflicts = rawErrors
    .map(normalizeConflict)
    .filter((conflict) => !conflict.ignored);

  const groupedConflicts = normalizedConflicts.reduce((acc, conflict) => {
    const groupKey = conflict.groupLabel;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(conflict);
    return acc;
  }, {});

  const renderConflictCards = (items) => (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {items.map((conflict) => {
        const selectedValue = conflictSelections[conflict.key];

        return (
          <Card
            key={conflict.key}
            style={{
              borderLeft: `6px solid ${conflict.meta.color}`,
              background: conflict.meta.background,
              boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
            }}
            bodyStyle={{ padding: 16 }}
          >
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Space wrap>
                <Tag color={conflict.meta.color} style={{ padding: "4px 10px" }}>
                  <Space size={6}>
                    {conflict.meta.icon}
                    <span>{conflict.meta.title}</span>
                  </Space>
                </Tag>
                {conflict.catchNo && <Tag>Catch No: {conflict.catchNo}</Tag>}
                {conflict.collegeName && <Tag>College: {conflict.collegeName}</Tag>}
                {conflict.collegeCode && <Tag>College Code: {conflict.collegeCode}</Tag>}
                {conflict.field && <Tag>Field: {conflict.field}</Tag>}
                {conflict.uniqueField && <Tag>Resolve Field: {conflict.uniqueField}</Tag>}
              </Space>

              <Text strong>{conflict.summary}</Text>

              {conflict.valuesForSelection?.length > 0 && (
                <Space wrap>
                  {conflict.valuesForSelection.map((value) => (
                    <Tag key={`${conflict.key}-${value}`} bordered>
                      {value}
                    </Tag>
                  ))}
                </Space>
              )}

              {conflict.catchNos?.length > 0 && (
                <Text type="secondary">Catch Nos: {conflict.catchNos.join(", ")}</Text>
              )}

              {conflict.resolveKind === "select" && (
                <Space wrap>
                  <Select
                    style={{ width: 260 }}
                    placeholder="Select value to keep"
                    value={selectedValue}
                    onChange={(value) => onSelectionChange(conflict.key, value)}
                    options={conflict.valuesForSelection.map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    disabled={!selectedValue}
                    loading={loading}
                    onClick={() => onResolve(conflict, selectedValue)}
                  >
                    Resolve
                  </Button>
                  {conflict.canIgnore && (
                    <Button onClick={() => onIgnore(conflict.key)}>
                      Ignore
                    </Button>
                  )}
                </Space>
              )}

              {conflict.resolveKind === "input" && (
                <Space wrap>
                  <Input
                    style={{ width: 260 }}
                    placeholder={`Enter ${conflict.targetField}`}
                    value={selectedValue}
                    onChange={(event) => onSelectionChange(conflict.key, event.target.value)}
                  />
                  <Button
                    type="primary"
                    icon={<CheckCircleOutlined />}
                    disabled={selectedValue === undefined || selectedValue === null || String(selectedValue).trim() === ""}
                    loading={loading}
                    onClick={() => onResolve(conflict, String(selectedValue).trim())}
                  >
                    Resolve
                  </Button>
                </Space>
              )}

              {conflict.resolveKind === "manual" && (
                <Text type="danger">This conflict must be resolved. Ignore is not available.</Text>
              )}

              {conflict.resolveKind === "ignore-only" && (
                <Space wrap>
                  <Button onClick={() => onIgnore(conflict.key)}>
                    Ignore
                  </Button>
                  <Text type="secondary">Ignore is allowed only because NRQuantity is 0.</Text>
                </Space>
              )}
            </Space>
          </Card>
        );
      })}
    </Space>
  );

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Conflicts are grouped into tabs and each type keeps its own color so they can be identified quickly."
      />
      <Tabs
        items={Object.entries(groupedConflicts).map(([groupLabel, items]) => ({
          key: groupLabel,
          label: `${groupLabel} (${items.length})`,
          children: renderConflictCards(items),
        }))}
      />
    </Space>
  );
};

export default DataImportConflictReport;
