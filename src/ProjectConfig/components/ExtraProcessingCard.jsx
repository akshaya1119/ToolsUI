import React, { useEffect } from "react";
import { Card, Select, Radio, Form, InputNumber, Typography, Tag, Divider, Row, Col, Button } from "antd";
import { FolderAddFilled, LockFilled, UndoOutlined } from "@ant-design/icons";
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
  onReset,
  importedSnapshot,
}) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 6, borderRadius: 2 };


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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isEnabled(EXTRA_ALIAS_NAME) && (
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
            {!isEnabled(EXTRA_ALIAS_NAME) && (
              <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
                Disabled
              </Tag>
            )}
          </div>
        }
      >
        <Row gutter={[16, 16]}>
          {extraTypes.map((et, index) => (
            <Col key={et.extraTypeId} span={12}>
              <div style={{ 
                border: "1px solid #f0f0f0", 
                padding: "12px", 
                borderRadius: "8px", 
                height: "100%",
                ...(isDirty(extraProcessingConfig[et.type], importedSnapshot?.extraProcessingConfig?.[et.type]) ? DIRTY_STYLE : {})
              }}>
                <Title level={5}>{et.type}</Title>

                {/* Envelope Dropdowns */}
                <div style={{ marginTop: 12 }}>
                  <Row gutter={8}>
                    <Col span={12}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>Inner Envelope</Text>
                      <Select
                        placeholder="Select Inner Envelopes"
                        style={{ width: "100%" }}
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

                    <Col span={12}>
                      <Text strong style={{ display: "block", marginBottom: 4 }}>Outer Envelope</Text>
                      <Select
                        placeholder="Select Outer Envelopes"
                        style={{ width: "100%" }}
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
                  disabled={!isEnabled("Extra Configuration")}
                  style={{ marginTop: 16 }}
                >
                  <Radio value="Fixed">Fixed Qty</Radio>
                  <Radio value="Range">Range (%)</Radio>
                  <Radio value="Percentage">Percentage</Radio>
                </Radio.Group>

                {/* Inputs depending on type selection */}
                {(extraTypeSelection[et.type] ?? "Fixed") === "Fixed" && (
                  <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
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
                      disabled={!isEnabled("Extra Configuration")}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                )}

                {extraTypeSelection[et.type] === "Range" && (
                  <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
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
                      disabled={!isEnabled("Extra Configuration")}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                )}

                {extraTypeSelection[et.type] === "Percentage" && (
                  <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
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
                      disabled={!isEnabled("Extra Configuration")}
                      style={{ width: "100%" }}
                    />
                  </Form.Item>
                )}
              </div>
            </Col>
          ))}
        </Row>
      </Card>
    </AnimatedCard>
  );
};

export default ExtraProcessingCard;