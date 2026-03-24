import React from "react";
import { Card, Select, Typography, Tag, Button, InputNumber, Checkbox, Row, Col } from "antd";
import { MailFilled, LockFilled, UndoOutlined } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";

const { Text } = Typography;
const { Option } = Select;

const EnvelopeSetupCard = ({
  isEnabled,
  innerEnvelopes,
  setInnerEnvelopes,
  outerEnvelopes,
  setOuterEnvelopes,
  envelopeOptions,
  onReset,
  importedSnapshot,
  duplicateConfig,
  setDuplicateConfig,
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 4 };

  const envelopeModuleEnabled =
    isEnabled("Envelope Setup and Enhancement") || isEnabled("Envelope Breaking");

  const enhancementValue = duplicateConfig?.enhancement ?? 0;
  const enhancementLocked = !envelopeModuleEnabled;

  const handleEnhancementToggle = (checked) => {
    setDuplicateConfig((prev) => ({
      ...prev,
      enhancementEnabled: checked,
      enhancement: checked ? (prev?.enhancement ?? 0) : 0,
    }));
  };

  const handleEnhancementValueChange = (val) => {
    const value = Number(val || 0);
    setDuplicateConfig((prev) => ({
      ...prev,
      enhancement: value,
      enhancementEnabled: value > 0,
    }));
  };

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <MailFilled style={iconStyle} /> Envelope Setup and Enhancement
            </span>
            <br />
            <Text type="secondary">
              Configure inner and outer envelope types and capacities
            </Text>
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {envelopeModuleEnabled && (
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
            {!envelopeModuleEnabled && (
              <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
                Disabled
              </Tag>
            )}
          </div>
        }
      >
        <Row gutter={[16, 12]} style={{ marginTop: 12 }}>
          <Col xs={24} md={8}>
            <div style={isDirty(duplicateConfig?.enhancement, importedSnapshot?.duplicateConfig?.enhancement) ? DIRTY_STYLE : {}}>
              <Text strong>Enhancement</Text>
              
              <InputNumber
                value={enhancementValue}
                disabled={enhancementLocked}
                onChange={handleEnhancementValueChange}
                style={{ marginTop: 4, width: "100%" }}
                addonAfter="%"
                min={0}
                max={100}
              />
              
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={isDirty(innerEnvelopes, importedSnapshot?.innerEnvelopes) ? DIRTY_STYLE : {}}>
              <Text strong>Inner Envelopes</Text>
              <Select
                mode="multiple"
                disabled={!envelopeModuleEnabled}
                value={innerEnvelopes}
                onChange={setInnerEnvelopes}
                style={{ width: "100%", marginTop: 4 }}
              >
                {envelopeOptions.map((e) => (
                  <Option key={e.envelopeId} value={e.envelopeName}>
                    {e.envelopeName} (Cap: {e.capacity})
                  </Option>
                ))}
              </Select>
            </div>
          </Col>

          <Col xs={24} md={8}>
            <div style={isDirty(outerEnvelopes, importedSnapshot?.outerEnvelopes) ? DIRTY_STYLE : {}}>
              <Text strong>Outer Envelopes</Text>
              <Select
                mode="multiple"
                disabled={!envelopeModuleEnabled}
                value={outerEnvelopes}
                onChange={setOuterEnvelopes}
                style={{ width: "100%", marginTop: 4 }}
              >
                {envelopeOptions.map((e) => (
                  <Option key={e.envelopeId} value={e.envelopeName}>
                    {e.envelopeName} (Cap: {e.capacity})
                  </Option>
                ))}
              </Select>
            </div>
          </Col>
        </Row>
      </Card>
    </AnimatedCard>
  );
};

export default EnvelopeSetupCard;
