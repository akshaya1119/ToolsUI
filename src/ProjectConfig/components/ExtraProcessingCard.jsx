import React, { useEffect } from "react";
import { Card, Select, Radio, Form, InputNumber, Typography, Tag, Divider, Row, Col } from "antd";
import { FolderAddFilled, LockFilled } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR, EXTRA_ALIAS_NAME } from "./constants";

const { Text, Title } = Typography;
const { Option } = Select;

const ExtraProcessingCard = ({
  isEnabled,
  extraTypes,
  extraTypeSelection,
  setExtraTypeSelection,
  extraProcessingConfig,
  setExtraProcessingConfig,
  envelopeOptions,
}) => {


  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <FolderAddFilled style={iconStyle} /> Extra Processing Configuration
            </span>
            <br />
            <Text type="secondary">Configure extra packet calculations</Text>
          </div>
        }
        extra={
          !isEnabled(EXTRA_ALIAS_NAME) ? (
            <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
              Disabled
            </Tag>
          ) : null
        }
      >
        {extraTypes.map((et, index) => (
          <div key={et.extraTypeId}>
            {index > 0 && <Divider />}
            <Title level={5}>{et.type}</Title>

            {/* Envelope Dropdowns */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr",
                gap: 12,
                marginTop: 12,
              }}
            >
              <Row>
                <Col className="mr-2">
                  <Select
                    placeholder="Select Inner Envelopes"
                    value={extraProcessingConfig[et.type]?.envelopeType?.inner || []}
                    onChange={(vals) =>
                      setExtraProcessingConfig((prev) => ({
                        ...prev,
                        [et.type]: {
                          ...prev[et.type],
                          envelopeType: {
                            ...prev[et.type]?.envelopeType,
                            inner: vals,
                          },
                        },
                      }))
                    }
                  >
                    {envelopeOptions.map((e) => (
                      <Option key={e.envelopeId} value={e.envelopeName}>
                        {e.envelopeName} (Capacity: {e.capacity})
                      </Option>
                    ))}
                  </Select>
                </Col>

                <Col className="ml-2">
                  <Select
                    placeholder="Select Outer Envelopes"
                    value={extraProcessingConfig[et.type]?.envelopeType?.outer || []}
                    onChange={(vals) =>
                      setExtraProcessingConfig((prev) => ({
                        ...prev,
                        [et.type]: {
                          ...prev[et.type],
                          envelopeType: {
                            ...prev[et.type]?.envelopeType,
                            outer: vals,
                          },
                        },
                      }))
                    }
                  >
                    {envelopeOptions.map((e) => (
                      <Option key={e.envelopeId} value={e.envelopeName}>
                        {e.envelopeName} (Capacity: {e.capacity})
                      </Option>
                    ))}
                  </Select>
                </Col>
              </Row>
            </div>

            {/* Radio group for mode */}
            <Radio.Group
              value={extraTypeSelection[et.type]}
              onChange={(e) =>
                setExtraTypeSelection((prev) => ({
                  ...prev,
                  [et.type]: e.target.value,
                }))
              }
              disabled={!isEnabled(EXTRA_ALIAS_NAME)}
              style={{ marginTop: 16 }}
            >
              <Radio value="Fixed">Fixed Qty</Radio>
              <Radio value="Range">Range (%)</Radio>
              <Radio value="Percentage">Percentage</Radio>
            </Radio.Group>

            {/* Inputs depending on type selection */}
            {(extraTypeSelection[et.type] ?? "Fixed") === "Fixed" && (
              <Form.Item style={{ marginTop: 12 }}>
                <InputNumber
                  placeholder="Enter fixed quantity"
                  min={0}
                  value={extraProcessingConfig[et.type]?.fixedQty || 0}
                  onChange={(v) =>
                    setExtraProcessingConfig((prev) => ({
                      ...prev,
                      [et.type]: { ...prev[et.type], fixedQty: v ?? 0 },
                    }))
                  }
                  disabled={!isEnabled(EXTRA_ALIAS_NAME)}
                />
              </Form.Item>
            )}

            {extraTypeSelection[et.type] === "Range" && (
              <Form.Item style={{ marginTop: 12 }}>
                <InputNumber
                  placeholder="Enter range (%)"
                  min={0}
                  max={100}
                  step={0.1}
                  value={extraProcessingConfig[et.type]?.range || 0}
                  onChange={(v) =>
                    setExtraProcessingConfig((prev) => ({
                      ...prev,
                      [et.type]: { ...prev[et.type], range: v ?? 0 },
                    }))
                  }
                  disabled={!isEnabled(EXTRA_ALIAS_NAME)}
                />
              </Form.Item>
            )}

            {extraTypeSelection[et.type] === "Percentage" && (
              <Form.Item style={{ marginTop: 12 }}>
                <InputNumber
                  placeholder="Enter percentage (%)"
                  min={0}
                  max={100}
                  step={0.1}
                  value={extraProcessingConfig[et.type]?.percentage || 0}
                  onChange={(v) =>
                    setExtraProcessingConfig((prev) => ({
                      ...prev,
                      [et.type]: { ...prev[et.type], percentage: v ?? 0 },
                    }))
                  }
                  disabled={!isEnabled(EXTRA_ALIAS_NAME)}
                />
              </Form.Item>
            )}
          </div>
        ))}
      </Card>
    </AnimatedCard>
  );
};

export default ExtraProcessingCard;