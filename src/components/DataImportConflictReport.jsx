import React from "react";
import { AutoComplete, Button, Collapse, Empty, Input, Space, Table, Tabs, Tag, Typography } from "antd";
import { CheckCircleOutlined } from "@ant-design/icons";
import {
  CONFLICT_STATUS,
  STATUS_TAG_CONFIG,
  getConflictTypeConfig,
} from "../utils/dataImportConflictConfig";

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

const formatCatchNosPreview = (catchNos) => {
  if (!catchNos?.length) {
    return "";
  }

  const preview = catchNos.slice(0, 5).join(", ");
  const remaining = catchNos.length - 5;

  return remaining > 0
    ? `${preview} +${remaining} more`
    : preview;
};

const formatCatchNosLabel = (catchNos) => {
  if (!catchNos?.length) {
    return "";
  }

  const preview = formatCatchNosPreview(catchNos);
  return catchNos.length === 1 ? preview : `${preview} (${catchNos.length})`;
};

const formatNumberPreview = (values) => {
  if (!values?.length) {
    return "";
  }

  const preview = values.slice(0, 5).join(", ");
  const remaining = values.length - 5;

  return remaining > 0 ? `${preview} +${remaining} more` : preview;
};

const formatNumberLabel = (values) => {
  if (!values?.length) {
    return "";
  }

  const preview = formatNumberPreview(values);
  return values.length === 1 ? preview : `${preview} (${values.length})`;
};

const cleanupConflictSummary = (summary, conflictType, uniqueField, catchNo, field, importRowNos) => {
  const normalizedSummary = summary || "";

  if (conflictType === "catch_unique_field") {
    const fallbackSummary = `Catch No ${catchNo} has multiple ${uniqueField}.`;
    return normalizedSummary.replace(/ has multiple (.+?) values\./i, " has multiple $1.") || fallbackSummary;
  }

  if (conflictType === "required_field_empty") {
    const catchSuffix = catchNo ? ` (Catch No ${catchNo})` : "";

    if (importRowNos?.length) {
      return `${field} is missing for row ${formatNumberLabel(importRowNos)}${catchSuffix}.`;
    }

    const withoutDbRow = normalizedSummary.replace(/\s*for row \d+/i, "");
    if (withoutDbRow) {
      return withoutDbRow;
    }

    return `${field} is missing${catchSuffix}.`;
  }

  return normalizedSummary;
};

const shouldShowCatchNos = (conflict) => {
  if (!conflict.catchNos?.length) {
    return false;
  }

  if (conflict.catchNos.length === 1 && conflict.catchNo && conflict.catchNos[0] === conflict.catchNo) {
    return false;
  }

  return true;
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
  const importRowNos = toArray(getValue(item, "importRowNos", "ImportRowNos"));
  const nodalCodes = toArray(getValue(item, "nodalCodes", "NodalCodes"));
  const centerCodes = toArray(getValue(item, "centerCodes", "CenterCodes"));
  const canIgnore = Boolean(getValue(item, "canIgnore", "CanIgnore"));
  const status = (getValue(item, "status", "Status") || CONFLICT_STATUS.PENDING).toLowerCase();
  const minNrQuantity = getValue(item, "minNrQuantity", "MinNrQuantity");
  const maxNrQuantity = getValue(item, "maxNrQuantity", "MaxNrQuantity");

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
    importRowNos,
    nodalCodes,
    centerCodes,
    minNrQuantity,
    maxNrQuantity,
    meta,
    targetField: uniqueField || field,
    sourceField: null,
    sourceValue: null,
    valuesForSelection: conflictingValues,
    resolveKind: meta.resolveKind,
    summary: "",
    groupLabel: meta.groupLabel,
  };

  details.summary = cleanupConflictSummary(
    getValue(item, "summary", "Summary") || "",
    conflictType,
    uniqueField,
    catchNo,
    field,
    details.importRowNos
  );

  if (conflictType === "catch_unique_field") {
    details.sourceField = "CatchNo";
    details.sourceValue = catchNo;
    details.summary = details.summary || `Catch No ${catchNo} has multiple ${uniqueField}.`;
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
    details.sourceValue = nodalCode;
    details.valuesForSelection = nodalCode ? [nodalCode] : conflictingValues;
    details.summary =
      details.summary || `Nodal code ${nodalCode} has a digit mismatch.`;
    return details;
  }

  if (conflictType === "required_field_empty") {
    details.summary = details.summary || `${field} is missing for ${catchNos.length} catch number(s).`;
    return details;
  }

  if (conflictType === "zero_nr_quantity") {
    details.valuesForSelection = Array.from(
      new Set(
        [minNrQuantity, maxNrQuantity]
          .filter((value) => value !== undefined && value !== null)
          .map((value) => String(value))
      )
    );
    const quantityRange =
      minNrQuantity !== undefined && minNrQuantity !== null && maxNrQuantity !== undefined && maxNrQuantity !== null
        ? ` Use a value between ${minNrQuantity} and ${maxNrQuantity}.`
        : "";
    details.summary = details.summary || `NRQuantity is 0 for ${catchNos.length} catch number(s).${quantityRange}`;
    return details;
  }

  details.resolveKind = "manual";
  details.summary = details.summary || getValue(item, "error", "Error") || "Review this conflict.";
  return details;
};

const renderMetaTags = (conflict) => {
  const metaItems = [
    conflict.catchNo ? `Catch No: ${conflict.catchNo}` : null,
    conflict.centreCode ? `Centre: ${conflict.centreCode}` : null,
    conflict.nodalCode ? `Nodal: ${conflict.nodalCode}` : null,
    conflict.collegeName ? `College: ${conflict.collegeName}` : null,
    conflict.collegeCode ? `College Code: ${conflict.collegeCode}` : null,
    conflict.field ? `Field: ${conflict.field}` : null,
    conflict.uniqueField ? `Resolve Field: ${conflict.uniqueField}` : null,
  ].filter(Boolean);

  if (!metaItems.length) {
    return <Text type="secondary">No extra details</Text>;
  }

  return (
    <Space wrap size={[4, 4]}>
      {metaItems.map((label) => (
        <Tag key={`${conflict.key}-${label}`} style={{ marginInlineEnd: 0, paddingInline: 5, lineHeight: "16px", fontSize: 11 }}>
          {label}
        </Tag>
      ))}
    </Space>
  );
};

const renderValueTags = (values, key) => {
  if (!values?.length) {
    return <Text type="secondary">-</Text>;
  }

  return (
    <Space wrap size={[4, 4]}>
      {values.map((value) => (
        <Tag key={`${key}-${value}`} bordered style={{ marginInlineEnd: 0, paddingInline: 5, lineHeight: "16px", fontSize: 11 }}>
          {value}
        </Tag>
      ))}
    </Space>
  );
};

const renderResolvedFieldValues = (conflict) => {
  if (conflict.conflictType === "zero_nr_quantity") {
    const currentValue = { label: "Current", value: "0" };
    const rangeValues = [
      conflict.minNrQuantity !== undefined && conflict.minNrQuantity !== null
        ? { label: "Min", value: String(conflict.minNrQuantity) }
        : null,
      conflict.maxNrQuantity !== undefined && conflict.maxNrQuantity !== null
        ? { label: "Max", value: String(conflict.maxNrQuantity) }
        : null,
    ].filter(Boolean);

    return (
      <Space direction="vertical" size={4}>
        <Tag key={`${conflict.key}-${currentValue.label}-${currentValue.value}`} bordered style={{ marginInlineEnd: 0, width: "fit-content", paddingInline: 5, lineHeight: "16px", fontSize: 11 }}>
          {currentValue.label}: {currentValue.value}
        </Tag>
        {rangeValues.length > 0 ? (
          <Space wrap size={[4, 4]}>
            {rangeValues.map((item) => (
              <Tag key={`${conflict.key}-${item.label}-${item.value}`} bordered style={{ marginInlineEnd: 0, paddingInline: 5, lineHeight: "16px", fontSize: 11 }}>
                {item.label}: {item.value}
              </Tag>
            ))}
          </Space>
        ) : null}
      </Space>
    );
  }

  return renderValueTags(conflict.valuesForSelection, conflict.key);
};

const renderActionCell = (conflict, selectedValue, loading, onSelectionChange, onResolve, onIgnore) => {
  const isIgnored = conflict.status === CONFLICT_STATUS.IGNORED;
  const canRenderIgnore = conflict.canIgnore && typeof onIgnore === "function";
  const normalizedSelectedValue =
    selectedValue === undefined || selectedValue === null ? undefined : String(selectedValue);
  const zeroQuantityHelp =
    conflict.conflictType === "zero_nr_quantity" &&
    conflict.minNrQuantity !== undefined &&
    conflict.minNrQuantity !== null &&
    conflict.maxNrQuantity !== undefined &&
    conflict.maxNrQuantity !== null
      ? `Min: ${conflict.minNrQuantity}, Max: ${conflict.maxNrQuantity}`
      : null;

  if (conflict.resolveKind === "select") {
    return (
      <Space direction="vertical" size={6}>
        <AutoComplete
          size="small"
          style={{ width: 160 }}
          placeholder={conflict.conflictType === "zero_nr_quantity" ? "Select or type NRQuantity" : "Select or type value"}
          value={normalizedSelectedValue}
          onChange={(value) => onSelectionChange(conflict.key, value)}
          options={(conflict.valuesForSelection || []).map((value) => ({
            value,
            label: value,
          }))}
        />
        {zeroQuantityHelp ? <Text type="secondary" style={{ fontSize: 11 }}>{zeroQuantityHelp}</Text> : null}
        <Space wrap size={[4, 4]}>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={normalizedSelectedValue === undefined || normalizedSelectedValue.trim() === ""}
            loading={loading}
            onClick={() => onResolve(conflict, normalizedSelectedValue.trim())}
          >
            Resolve
          </Button>
          {canRenderIgnore && (
            <Button size="small" disabled={isIgnored} onClick={() => onIgnore(conflict)}>
              {isIgnored ? "Ignored" : "Ignore"}
            </Button>
          )}
        </Space>
      </Space>
    );
  }

  if (conflict.resolveKind === "input") {
    return (
      <Space direction="vertical" size={6}>
        <Input
          size="small"
          style={{ width: 160 }}
          placeholder={`Enter ${conflict.targetField}`}
          value={selectedValue}
          onChange={(event) => onSelectionChange(conflict.key, event.target.value)}
        />
        <Space wrap size={[4, 4]}>
          <Button
            type="primary"
            size="small"
            icon={<CheckCircleOutlined />}
            disabled={selectedValue === undefined || selectedValue === null || String(selectedValue).trim() === ""}
            loading={loading}
            onClick={() => onResolve(conflict, String(selectedValue).trim())}
          >
            Resolve
          </Button>
          {canRenderIgnore && (
            <Button size="small" disabled={isIgnored} onClick={() => onIgnore(conflict)}>
              {isIgnored ? "Ignored" : "Ignore"}
            </Button>
          )}
        </Space>
      </Space>
    );
  }

  return <Text type="secondary">Review only</Text>;
};

const buildColumns = (conflictSelections, onSelectionChange, onResolve, onIgnore, loading, resolvedFieldLabel) => [
  {
    title: "Summary",
    key: "conflict",
    width: 360,
    render: (_, conflict) => {
      return (
        <Space direction="vertical" size={4}>
          <Text strong style={{ lineHeight: 1.2, fontSize: 13 }}>{conflict.summary}</Text>
          {shouldShowCatchNos(conflict) && (
            <Text style={{ fontSize: 11, lineHeight: 1.15, color: "rgba(0, 0, 0, 0.72)" }}>
              Catch Nos: {formatCatchNosLabel(conflict.catchNos)}
            </Text>
          )}
        </Space>
      );
    },
  },
  {
    title: "Status",
    key: "status",
    width: 100,
    render: (_, conflict) => {
      const statusConfig = STATUS_TAG_CONFIG[conflict.status] || STATUS_TAG_CONFIG[CONFLICT_STATUS.PENDING];

      return (
        <Tag color={statusConfig.color} style={{ marginInlineEnd: 0, paddingInline: 5, lineHeight: "16px", fontSize: 11 }}>
          {statusConfig.label}
        </Tag>
      );
    },
  },
  {
    title: "Details",
    key: "details",
    width: 300,
    render: (_, conflict) => renderMetaTags(conflict),
  },
  {
    title: resolvedFieldLabel || "Resolved Field",
    key: "resolvedField",
    width: 240,
    render: (_, conflict) => renderResolvedFieldValues(conflict),
  },
  {
    title: "Action",
    key: "action",
    width: 220,
    render: (_, conflict) =>
      renderActionCell(
        conflict,
        conflictSelections[conflict.key],
        loading,
        onSelectionChange,
        onResolve,
        onIgnore
      ),
  },
];

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

  const rawErrors = Array.isArray(conflicts) ? conflicts : conflicts?.errors || conflicts?.Errors || [];

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
      <Tabs
        items={Object.entries(groupedConflicts).map(([groupLabel, items]) => ({
          key: groupLabel,
          label: `${groupLabel} (${items.length})`,
          children: (
            <Collapse
              size="small"
              defaultActiveKey={Array.from(new Set(items.map((item) => item.meta.title))).slice(0, 1)}
              items={Object.entries(
                items.reduce((acc, conflict) => {
                  const typeKey = conflict.meta.title;
                  if (!acc[typeKey]) {
                    acc[typeKey] = [];
                  }
                  acc[typeKey].push(conflict);
                  return acc;
                }, {})
              ).map(([typeLabel, typeItems]) => ({
                key: typeLabel,
                label: `${typeLabel} (${typeItems.length})`,
                children: (
                  <Table
                    columns={buildColumns(
                      conflictSelections,
                      onSelectionChange,
                      onResolve,
                      onIgnore,
                      loading,
                      typeItems[0]?.targetField
                    )}
                    dataSource={typeItems}
                    rowKey="key"
                    pagination={false}
                    size="small"
                    scroll={{ x: 1180 }}
                    rowClassName={() => "compact-conflict-row"}
                    style={{ width: "100%" }}
                  />
                ),
              }))}
            />
          ),
        }))}
      />
      <style>
        {`
          .ant-collapse-small > .ant-collapse-item > .ant-collapse-header {
            padding: 8px 10px !important;
            font-size: 12px;
          }

          .ant-collapse-small > .ant-collapse-item > .ant-collapse-content > .ant-collapse-content-box {
            padding: 6px 0 0 0 !important;
          }

          .compact-conflict-row > td {
            padding: 6px 8px !important;
            vertical-align: top;
          }

          .compact-conflict-row .ant-space-vertical {
            gap: 2px !important;
          }

          .compact-conflict-row .ant-typography {
            margin-bottom: 0;
          }

          .compact-conflict-row .ant-btn-sm {
            height: 22px;
            padding: 0 7px;
            font-size: 11px;
          }

          .compact-conflict-row .ant-select-sm,
          .compact-conflict-row .ant-input-sm {
            font-size: 11px;
          }
        `}
      </style>
    </Space>
  );
};

export default DataImportConflictReport;
