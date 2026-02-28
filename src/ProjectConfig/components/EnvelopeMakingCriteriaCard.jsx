import React from "react";
import { Card, Select, Typography, Tag, InputNumber, Checkbox } from "antd";
import { ContainerFilled, LockFilled } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";

const { Text } = Typography;
const { Option } = Select;

const EnvelopeMakingCriteriaCard = ({
  isEnabled,
  fields,
  selectedEnvelopeFields,
  setSelectedEnvelopeFields,
  startOmrEnvelopeNumber,
  setStartOmrEnvelopeNumber,
  resetOmrSerialOnCentreChange,
  setResetOmrSerialOnCentreChange,
}) => {
  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <ContainerFilled style={iconStyle} /> Envelope Making Criteria (Serial Numbering)
            </span>
            <br />
            <Text type="secondary">
              Define conditions that numbers Envelope
            </Text>
          </div>
        }
        extra={
          !isEnabled("Envelope Breaking") ? (
            <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
              Disabled
            </Tag>
          ) : null
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
          <div>
            <Text strong>Starting OMR Serial Number</Text>
            <InputNumber
              min={1}
              disabled={!isEnabled("Envelope Breaking")}
              value={startOmrEnvelopeNumber}
              onChange={(value) => setStartOmrEnvelopeNumber(value)}
              placeholder="Enter Start OMR Serial Number"
              style={{ width: "100%" }}
            />
          </div>
          <div>
            <Text strong>Select sort fields</Text>
            <Select
              mode="multiple"
              disabled={!isEnabled("Envelope Breaking")}
              allowClear
              showSearch
              style={{ width: "100%", marginTop: 4 }}
              placeholder="Select one or more fields"
              value={selectedEnvelopeFields}
              onChange={setSelectedEnvelopeFields}
              optionFilterProp="children"
            >
              {fields.map((f) => (
                <Option key={f.fieldId} value={f.fieldId}>
                  {f.name}
                </Option>
              ))}
            </Select>
          </div>
          <div style={{ gridColumn: "1 / -1", marginTop: 8 }}>
            <Checkbox
              disabled={!isEnabled("Envelope Breaking")}
              checked={resetOmrSerialOnCentreChange}
              onChange={(e) => setResetOmrSerialOnCentreChange(e.target.checked)}
            >
              <Text strong>Reset OMR Serial Number on Catch Change</Text>
            </Checkbox>
          </div>
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default EnvelopeMakingCriteriaCard;