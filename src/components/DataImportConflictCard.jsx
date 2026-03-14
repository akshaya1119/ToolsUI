import React from "react";
import { Button, Card, Input, Select, Space, Tag, Typography } from "antd";
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

  return (
    <Card
      key={conflict.key}
      style={{
        borderLeft: `6px solid ${conflict.meta.color}`,
        background: conflict.meta.background,
        boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
      }}
      styles={{
        body: { padding: 16 },
      }}
    >
      <Space direction="vertical" size={12} style={{ width: "100%" }}>
        <Space wrap>
          <Tag color={conflict.meta.color} style={{ padding: "4px 10px" }}>
            <Space size={6}>
              {CONFLICT_ICONS[conflict.conflictType] || <WarningOutlined />}
              <span>{conflict.meta.title}</span>
            </Space>
          </Tag>
          <Tag color={statusConfig.color}>{statusConfig.label}</Tag>
          {conflict.catchNo && <Tag>Catch No: {conflict.catchNo}</Tag>}
          {conflict.rowIds?.length > 0 && <Tag>Row Id: {conflict.rowIds.join(", ")}</Tag>}
          {conflict.centreCode && <Tag>Centre: {conflict.centreCode}</Tag>}
          {conflict.nodalCode && <Tag>Nodal: {conflict.nodalCode}</Tag>}
          {conflict.collegeName && <Tag>College: {conflict.collegeName}</Tag>}
          {conflict.collegeCode && <Tag>College Code: {conflict.collegeCode}</Tag>}
          {conflict.field && <Tag>Field: {conflict.field}</Tag>}
          {conflict.uniqueField && <Tag>Resolve Field: {conflict.uniqueField}</Tag>}
        </Space>

        <div
          style={{
            border: `1px solid ${conflict.meta.accent}`,
            borderRadius: 10,
            padding: 12,
            background: "rgba(255,255,255,0.65)",
          }}
        >
          <Text strong>{conflict.summary}</Text>
        </div>

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
              options={(conflict.valuesForSelection || []).map((value) => ({
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
            {canRenderIgnore && (
              <Button disabled={isIgnored} onClick={() => onIgnore(conflict)}>
                {isIgnored ? "Ignored" : "Ignore"}
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
            {canRenderIgnore && (
              <Button disabled={isIgnored} onClick={() => onIgnore(conflict)}>
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
    </Card>
  );
};

export default DataImportConflictCard;
