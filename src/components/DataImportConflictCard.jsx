import React from "react";
import { AutoComplete, Button, Input, Space, Tag, Typography } from "antd";
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  DisconnectOutlined,
  FieldTimeOutlined,
  NumberOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import {
  CONFLICT_STATUS,
  STATUS_TAG_CONFIG,
} from "../utils/dataImportConflictConfig";

const { Text } = Typography;

const CONFLICT_ICONS = {
  catch_unique_field: <FieldTimeOutlined />,
  center_multiple_nodals: <ApartmentOutlined />,
  college_multiple_nodals: <ApartmentOutlined />,
  college_multiple_centers: <ApartmentOutlined />,
  required_field_empty: <WarningOutlined />,
  zero_nr_quantity: <NumberOutlined />,
  nodal_code_digit_mismatch: <DisconnectOutlined />,
};

const DataImportConflictCard = ({
  conflict,
  selectedValue,
  loading,
  onSelectionChange,
  onResolve,
  onIgnore,
}) => {
  const statusConfig = STATUS_TAG_CONFIG[conflict.status] || STATUS_TAG_CONFIG[CONFLICT_STATUS.PENDING];
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

  return (
    <div
      style={{
        border: `1px solid ${conflict.meta.accent}`,
        borderLeft: `4px solid ${conflict.meta.color}`,
        borderRadius: 10,
        background: "#fff",
        padding: 12,
      }}
    >
      <Space direction="vertical" size={10} style={{ width: "100%" }}>
        <Space wrap size={[8, 8]} style={{ width: "100%", justifyContent: "space-between" }}>
          <Space wrap size={[8, 8]}>
            <Tag color={conflict.meta.color} style={{ padding: "2px 8px", marginInlineEnd: 0 }}>
              <Space size={6}>
                {CONFLICT_ICONS[conflict.conflictType] || <WarningOutlined />}
                <span>{conflict.meta.title}</span>
              </Space>
            </Tag>
            <Tag color={statusConfig.color} style={{ marginInlineEnd: 0 }}>{statusConfig.label}</Tag>
          </Space>

          {(conflict.catchNo || conflict.rowIds?.length > 0 || conflict.centreCode || conflict.nodalCode || conflict.collegeCode) && (
            <Space wrap size={[6, 6]}>
              {conflict.catchNo && <Tag style={{ marginInlineEnd: 0 }}>Catch No: {conflict.catchNo}</Tag>}
              {conflict.rowIds?.length > 0 && <Tag style={{ marginInlineEnd: 0 }}>Row Id: {conflict.rowIds.join(", ")}</Tag>}
              {conflict.centreCode && <Tag style={{ marginInlineEnd: 0 }}>Centre: {conflict.centreCode}</Tag>}
              {conflict.nodalCode && <Tag style={{ marginInlineEnd: 0 }}>Nodal: {conflict.nodalCode}</Tag>}
              {conflict.collegeCode && <Tag style={{ marginInlineEnd: 0 }}>College Code: {conflict.collegeCode}</Tag>}
            </Space>
          )}
        </Space>

        <Text strong>{conflict.summary}</Text>

        <Space wrap size={[6, 6]}>
          {conflict.collegeName && <Tag style={{ marginInlineEnd: 0 }}>College: {conflict.collegeName}</Tag>}
          {conflict.field && <Tag style={{ marginInlineEnd: 0 }}>Field: {conflict.field}</Tag>}
          {conflict.uniqueField && <Tag style={{ marginInlineEnd: 0 }}>Resolve Field: {conflict.uniqueField}</Tag>}
        </Space>

        {conflict.valuesForSelection?.length > 0 && (
          <Space wrap size={[6, 6]}>
            {conflict.valuesForSelection.map((value) => (
              <Tag key={`${conflict.key}-${value}`} bordered style={{ marginInlineEnd: 0 }}>
                {value}
              </Tag>
            ))}
          </Space>
        )}

        {conflict.catchNos?.length > 0 && (
          <Text type="secondary" style={{ fontSize: 12 }}>
            Catch Nos: {conflict.catchNos.join(", ")}
          </Text>
        )}

        {conflict.resolveKind === "select" && (
          <Space direction="vertical" size={6}>
            <AutoComplete
              style={{ width: 220 }}
              placeholder={conflict.conflictType === "zero_nr_quantity" ? "Select or type NRQuantity" : "Select or type value"}
              value={normalizedSelectedValue}
              onChange={(value) => onSelectionChange(conflict.key, value)}
              options={(conflict.valuesForSelection || []).map((value) => ({
                value,
                label: value,
              }))}
            />
            {zeroQuantityHelp ? <Text type="secondary" style={{ fontSize: 12 }}>{zeroQuantityHelp}</Text> : null}
            <Space wrap size={[8, 8]}>
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
        )}

        {conflict.resolveKind === "input" && (
          <Space wrap size={[8, 8]}>
            <Input
              style={{ width: 220 }}
              placeholder={`Enter ${conflict.targetField}`}
              value={selectedValue}
              onChange={(event) => onSelectionChange(conflict.key, event.target.value)}
            />
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
        )}

        {conflict.resolveKind === "manual" && (
          <Text type="danger">This conflict must be resolved. Ignore is not available.</Text>
        )}

        {conflict.conflictType === "zero_nr_quantity" && (
          <Text type="secondary">Ignore is available only for zero NR quantity conflicts.</Text>
        )}

        {!conflict.canIgnore && conflict.resolveKind !== "manual" && (
          <Text type="secondary">Ignore is not available for this conflict type.</Text>
        )}
      </Space>
    </div>
  );
};

export default DataImportConflictCard;
