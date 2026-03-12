import {
  Card,
  Select,
  Radio,
  Form,
  InputNumber,
  Typography,
  Tag,
  Row,
  Col,
  Button,
  Switch,
} from "antd";
import { FolderAddFilled, LockFilled, UndoOutlined, PlusOutlined, MinusCircleOutlined } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import {
  cardStyle,
  iconStyle,
  PRIMARY_COLOR,
  EXTRA_ALIAS_NAME,
} from "./constants";
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
  const DIRTY_STYLE = {
    borderLeft: "3px solid #faad14",
    paddingLeft: 6,
    borderRadius: 2,
  };

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <FolderAddFilled style={iconStyle} /> Extra Processing
              Configuration
            </span>
            <br />
            <Text type="secondary">Configure extra packet calculations</Text>
          </div>
        }
        extra={
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
          {extraTypes.map((et) => {
            return (
              <Col key={et.extraTypeId} span={12}>
                <div
                  style={{
                    border: "1px solid #f0f0f0",
                    padding: "12px",
                    borderRadius: "8px",
                    height: "100%",
                    ...(isDirty(
                      extraProcessingConfig[et.type],
                      importedSnapshot?.extraProcessingConfig?.[et.type],
                    )
                      ? DIRTY_STYLE
                      : {}),
                  }}
                >
                  <Title level={5}>{et.type}</Title>

                  {/* Envelope Dropdowns */}
                  <div style={{ marginTop: 12 }}>
                    <Row gutter={8}>
                      <Col span={12}>
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 4 }}
                        >
                          Inner Envelope
                        </Text>
                        <Select
                          placeholder="Select Inner Envelopes"
                          style={{ width: "100%" }}
                          value={
                            extraProcessingConfig[et.type]?.envelopeType
                              ?.inner || []
                          }
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
                        <Text
                          strong
                          style={{ display: "block", marginBottom: 4 }}
                        >
                          Outer Envelope
                        </Text>
                        <Select
                          placeholder="Select Outer Envelopes"
                          style={{ width: "100%" }}
                          value={
                            extraProcessingConfig[et.type]?.envelopeType
                              ?.outer || []
                          }
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
                  {/* <Radio.Group
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
                </Radio.Group> */}
                  <Radio.Group
                    value={extraTypeSelection[et.type]}
                    onChange={(e) => {
                      const mode = e.target.value;

                      setExtraTypeSelection((prev) => ({
                        ...prev,
                        [et.type]: mode,
                      }));

                      setExtraProcessingConfig((prev) => ({
                        ...prev,
                        [et.type]: {
                          ...prev[et.type],
                          fixedQty: prev[et.type]?.fixedQty ?? 0,
                          percentage: prev[et.type]?.percentage ?? 0,
                          range:
                            mode === "Range"
                              ? prev[et.type]?.range?.length
                                ? prev[et.type].range
                                : [{ to: 0, value: 0 }]
                              : (prev[et.type]?.range ?? []),
                          rangeType: prev[et.type]?.rangeType ?? "Fixed",
                        },
                      }));
                    }}
                  >
                    <Radio value="Fixed">Fixed Qty</Radio>
                    <Radio value="Range">Range</Radio>
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

                  {/* {extraTypeSelection[et.type] === "Range" && (
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
                )} */}
                  {extraTypeSelection[et.type] === "Range" && (
                    <>
                      <Row
                        align="middle"
                        justify="space-between"
                        style={{ marginTop: 12, marginBottom: 8 }}
                      >
                        <Text strong>Range Configuration</Text>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {extraProcessingConfig[et.type]?.rangeType === "Percentage" ? "Percentage" : "Fixed Qty"}
                          </Text>
                          <Switch
                            checked={
                              extraProcessingConfig[et.type]?.rangeType === "Percentage"
                            }
                            checkedChildren="%"
                            unCheckedChildren="#"
                            onChange={(checked) =>
                              setExtraProcessingConfig((prev) => ({
                                ...prev,
                                [et.type]: {
                                  ...prev[et.type],
                                  rangeType: checked ? "Percentage" : "Fixed",
                                },
                              }))
                            }
                          />
                        </div>
                      </Row>

                      {/* Header Row */}
                      <Row gutter={6} style={{ marginBottom: 4 }}>
                        <Col span={5}>
                          <Text strong style={{ fontSize: 12 }}>From</Text>
                        </Col>
                        <Col span={6}>
                          <Text strong style={{ fontSize: 12 }}>To</Text>
                        </Col>
                        <Col span={7}>
                          <Text strong style={{ fontSize: 12 }}>Value</Text>
                        </Col>
                        <Col span={6}>
                          <Text strong style={{ fontSize: 12 }}>Actions</Text>
                        </Col>
                      </Row>

                      {/* Range Rows */}
                      {(extraProcessingConfig[et.type]?.range || []).map((r, i) => {
                        const from =
                          i === 0
                            ? 0
                            : (extraProcessingConfig[et.type].range[i - 1]?.to ?? 0) + 1;
                        return (
                          <Row
                            gutter={6}
                            key={i}
                            align="middle"
                            style={{ marginTop: 6 }}
                          >
                            <Col span={5}>
                              <InputNumber
                                value={from}
                                disabled
                                size="small"
                                style={{ width: "100%" }}
                              />
                            </Col>

                            <Col span={6}>
                              <InputNumber
                                size="small"
                                placeholder="To"
                                value={r.to}
                                style={{ width: "100%" }}
                                onChange={(v) => {
                                  const prevTo =
                                    i === 0
                                      ? -1
                                      : (extraProcessingConfig[et.type].range[i - 1]?.to ?? -1);

                                  if (v <= prevTo) return;

                                  const updated = [...extraProcessingConfig[et.type].range];
                                  updated[i].to = v ?? 0;

                                  setExtraProcessingConfig((prev) => ({
                                    ...prev,
                                    [et.type]: {
                                      ...prev[et.type],
                                      range: updated,
                                    },
                                  }));
                                }}
                              />
                            </Col>

                            <Col span={7}>
                              <InputNumber
                                size="small"
                                placeholder={
                                  extraProcessingConfig[et.type]?.rangeType === "Fixed"
                                    ? "Qty"
                                    : "%"
                                }
                                min={0}
                                max={
                                  extraProcessingConfig[et.type]?.rangeType === "Percentage"
                                    ? 100
                                    : undefined
                                }
                                value={r.value}
                                style={{ width: "100%" }}
                                onChange={(v) => {
                                  const updated = [...extraProcessingConfig[et.type].range];
                                  updated[i].value = v ?? 0;

                                  setExtraProcessingConfig((prev) => ({
                                    ...prev,
                                    [et.type]: {
                                      ...prev[et.type],
                                      range: updated,
                                    },
                                  }));
                                }}
                              />
                            </Col>

                            <Col span={6}>
                              <div style={{ display: "flex", gap: 4 }}>
                                <Button
                                  icon={<PlusOutlined />}
                                  size="small"
                                  type="primary"
                                  ghost
                                  onClick={() => {
                                    const updated = [
                                      ...extraProcessingConfig[et.type].range,
                                      { to: 0, value: 0 },
                                    ];

                                    setExtraProcessingConfig((prev) => ({
                                      ...prev,
                                      [et.type]: {
                                        ...prev[et.type],
                                        range: updated,
                                      },
                                    }));
                                  }}
                                />
                                <Button
                                  icon={<MinusCircleOutlined />}
                                  danger
                                  size="small"
                                  type="primary"
                                  ghost
                                  onClick={() => {
                                    const updated = extraProcessingConfig[et.type].range.filter(
                                      (_, idx) => idx !== i
                                    );

                                    setExtraProcessingConfig((prev) => ({
                                      ...prev,
                                      [et.type]: {
                                        ...prev[et.type],
                                        range: updated,
                                      },
                                    }));
                                  }}
                                />
                              </div>
                            </Col>
                          </Row>
                        );
                      })}
                    </>
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
            );
          })}
        </Row>
      </Card>
    </AnimatedCard>
  );
};

export default ExtraProcessingCard;
