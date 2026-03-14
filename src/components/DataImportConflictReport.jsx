import React from "react";
import { Alert, Empty, Space, Tabs, Typography } from "antd";
import DataImportConflictCard from "./DataImportConflictCard";
import { CONFLICT_STATUS, getConflictTypeConfig } from "../utils/dataImportConflictConfig";

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
    getValue(item, "nodalCodeGroup", "NodalCodeGroup"),
    getValue(item, "collegeName", "CollegeName"),
    getValue(item, "collegeCode", "CollegeCode"),
    getValue(item, "collegeKeyType", "CollegeKeyType"),
    getValue(item, "field", "Field"),
    getValue(item, "uniqueField", "UniqueField"),
    ...toArray(getValue(item, "rowIds", "RowIds")),
    ...toArray(getValue(item, "conflictingValues", "ConflictingValues")),
  ];

  return keyParts.filter(Boolean).join("|");
};

const normalizeConflict = (item) => {
  const conflictType = getValue(item, "conflictType", "ConflictType") || "unknown";
  const meta = getConflictTypeConfig(conflictType);
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
  const rowIds = toArray(getValue(item, "rowIds", "RowIds"));
  const nodalCodes = toArray(getValue(item, "nodalCodes", "NodalCodes"));
  const centerCodes = toArray(getValue(item, "centerCodes", "CenterCodes"));
  const canIgnore = Boolean(getValue(item, "canIgnore", "CanIgnore"));
  const status = (getValue(item, "status", "Status") || CONFLICT_STATUS.PENDING).toLowerCase();

  const details = {
    key: getConflictKey(item),
    conflictType,
    canIgnore,
    status,
    uniqueField,
    field,
    catchNo,
    centreCode,
    nodalCode,
    nodalCodeGroup,
    collegeName,
    collegeCode,
    collegeKeyType,
    conflictingValues,
    catchNos,
    rowIds,
    nodalCodes,
    centerCodes,
    meta,
    targetField: uniqueField || field,
    sourceField: null,
    sourceValue: null,
    valuesForSelection: conflictingValues,
    resolveKind: meta.resolveKind,
    summary: getValue(item, "summary", "Summary") || "",
    groupLabel: meta.groupLabel,
  };

  if (conflictType === "catch_unique_field") {
    details.sourceField = "CatchNo";
    details.sourceValue = catchNo;
    details.summary = details.summary || `Catch No ${catchNo} has multiple ${uniqueField} values.`;
    return details;
  }

  if (conflictType === "center_multiple_nodals") {
    details.sourceField = "CenterCode";
    details.sourceValue = centreCode;
    details.valuesForSelection = nodalCodes;
    details.summary = details.summary || `Centre ${centreCode} is linked with multiple nodal codes.`;
    return details;
  }

  if (conflictType === "college_multiple_nodals") {
    details.sourceField = collegeKeyType === "CollegeCode" ? "CollegeCode" : "CollegeName";
    details.sourceValue = collegeCode || collegeName;
    details.valuesForSelection = nodalCodes;
    details.summary = details.summary || `College ${collegeCode || collegeName} is linked with multiple nodal codes.`;
    return details;
  }

  if (conflictType === "college_multiple_centers") {
    details.sourceField = collegeKeyType === "CollegeCode" ? "CollegeCode" : "CollegeName";
    details.sourceValue = collegeCode || collegeName;
    details.valuesForSelection = centerCodes;
    details.summary = details.summary || `College ${collegeCode || collegeName} is linked with multiple exam centres.`;
    return details;
  }

  if (conflictType === "nodal_code_digit_mismatch") {
    details.sourceField = "NodalCode";
    details.sourceValue = nodalCodeGroup;
    details.valuesForSelection = conflictingValues;
    details.summary = details.summary || `Nodal codes ${conflictingValues.join(", ")} look like the same code with different digit counts.`;
    return details;
  }

  if (conflictType === "required_field_empty") {
    details.summary = details.summary || `${field} is missing for ${catchNos.length} catch number(s).`;
    return details;
  }

  if (conflictType === "zero_nr_quantity") {
    details.summary = details.summary || `NRQuantity is 0 for ${catchNos.length} catch number(s).`;
    return details;
  }

  details.resolveKind = "manual";
  details.summary = details.summary || getValue(item, "error", "Error") || "Review this conflict.";
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

  const normalizedConflicts = rawErrors.map(normalizeConflict);
  const groupedConflicts = normalizedConflicts.reduce((acc, conflict) => {
    const groupKey = conflict.groupLabel;
    if (!acc[groupKey]) {
      acc[groupKey] = [];
    }
    acc[groupKey].push(conflict);
    return acc;
  }, {});

  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      <Alert
        type="info"
        showIcon
        message="Each conflict type has its own color and status so it can be identified quickly. Ignored items remain visible with their status."
      />
      <Tabs
        items={Object.entries(groupedConflicts).map(([groupLabel, items]) => ({
          key: groupLabel,
          label: `${groupLabel} (${items.length})`,
          children: (
            <Space direction="vertical" size={16} style={{ width: "100%" }}>
              {items.map((conflict) => (
                <DataImportConflictCard
                  key={conflict.key}
                  conflict={conflict}
                  selectedValue={conflictSelections[conflict.key]}
                  loading={loading}
                  onSelectionChange={onSelectionChange}
                  onResolve={onResolve}
                  onIgnore={onIgnore}
                />
              ))}
            </Space>
          ),
        }))}
      />
    </Space>
  );
};

export default DataImportConflictReport;
