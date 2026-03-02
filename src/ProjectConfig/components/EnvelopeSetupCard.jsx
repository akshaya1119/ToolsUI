import React from "react";
import { Card, Select, Typography, Tag, Button } from "antd";
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
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 4 };
  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <MailFilled style={iconStyle} /> Envelope Setup
            </span>
            <br />
            <Text type="secondary">
              Configure inner and outer envelope types and capacities
            </Text>
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnabled("Envelope Breaking") && (
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
            {!isEnabled("Envelope Breaking") && (
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
            gridTemplateColumns: "1fr 1fr",
            columnGap: 12,
            rowGap: 8,
            marginTop: 12,
          }}
        >
          <div style={isDirty(innerEnvelopes, importedSnapshot?.innerEnvelopes) ? DIRTY_STYLE : {}}>
            <Text strong>Inner Envelopes</Text>
          </div>
          <div style={isDirty(outerEnvelopes, importedSnapshot?.outerEnvelopes) ? DIRTY_STYLE : {}}>
            <Text strong>Outer Envelopes</Text>
          </div>

          <Select
            mode="multiple"
            disabled={!isEnabled("Envelope Breaking")}
            value={innerEnvelopes}
            onChange={setInnerEnvelopes}
          >
            {envelopeOptions.map((e) => (
              <Option key={e.envelopeId} value={e.envelopeName}>
                {e.envelopeName} (Cap: {e.capacity})
              </Option>
            ))}
          </Select>

          <Select
            mode="multiple"
            disabled={!isEnabled("Envelope Breaking")}
            value={outerEnvelopes}
            onChange={setOuterEnvelopes}
          >
            {envelopeOptions.map((e) => (
              <Option key={e.envelopeId} value={e.envelopeName}>
                {e.envelopeName} (Cap: {e.capacity})
              </Option>
            ))}
          </Select>
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default EnvelopeSetupCard;