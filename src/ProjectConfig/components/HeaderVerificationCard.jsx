import React from "react";
import { Card, Select, Typography, Tag, Button } from "antd";
import { TableOutlined, LockFilled, UndoOutlined, DeleteOutlined } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";

const { Text } = Typography;
const { Option } = Select;

// Fields that are compulsory and should not be selectable in the configuration
const COMPULSORY_FIELDS = ["catchno", "lot", "batch", "remark", "examdate", "examtime", "status", "actions"];

const HeaderVerificationCard = ({
  isEnabled,
  fields,
  selectedHeaderVerificationFields,
  setSelectedHeaderVerificationFields,
  onReset,
  onClear,
  importedSnapshot
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 4 };

  // Filter out compulsory fields from the selectable options
  const selectableFields = fields.filter(
    (f) => !COMPULSORY_FIELDS.includes(f.name.toLowerCase().replace(/\s/g, ''))
  );

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <TableOutlined style={iconStyle} /> Header Verification Fields
            </span>
            <br />
            <Text type="secondary">
              Select imported/uploaded DB fields to display during Header Verification.
            </Text>
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnabled && (
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
            {!isEnabled && (
              <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
                Disabled
              </Tag>
            )}
          </div>
        }
      >
        <div style={{ marginTop: 12 }}>
          <div style={isDirty(selectedHeaderVerificationFields, importedSnapshot?.selectedHeaderVerificationFields) ? DIRTY_STYLE : {}}>
            <Text strong>Select Display Fields</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select optional fields for Header Verification"
              value={selectedHeaderVerificationFields}
              onChange={setSelectedHeaderVerificationFields}
              optionFilterProp="children"
            >
              {selectableFields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
            <Text type="secondary" style={{ fontSize: "12px", display: "block", marginTop: 4 }}>
              If no fields are selected, only compulsory fields will be shown (and A,B,C,D as fallback for backward compatibility).
            </Text>
          </div>
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default HeaderVerificationCard;
