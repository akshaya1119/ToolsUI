import React, { useState, useEffect } from "react";
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
  Modal,
} from "antd";
import API from "../../hooks/api";
import { FolderAddFilled, LockFilled, UndoOutlined, PlusOutlined, MinusCircleOutlined, DeleteOutlined } from "@ant-design/icons";
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
  onClear,
  importedSnapshot,
  projectId,
  allowNodalConfig = true,
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

  const extraEnabled = isEnabled(EXTRA_ALIAS_NAME);

  const getOuterCapacity = (type) => {
    const config = extraProcessingConfig[type];
    const names = config?.envelopeType?.outer;
    const name = Array.isArray(names) && names.length === 1 ? names[0] : null;
    if (!name) return null;
    
    // Try to find in envelopeOptions prop first
    const env = (envelopeOptions || []).find(e => e.envelopeName === name);
    if (env && env.capacity > 0) return env.capacity;
    
    // Fallback to regex on the name string
    const match = String(name).match(/(\d+)/);
    return match ? parseInt(match[1], 10) : null;
  };

  const [nodalModalOpen, setNodalModalOpen] = useState({});
  // Local state for editing nodal configs in modal
  const [nodalModalDraft, setNodalModalDraft] = useState({});
  const [nodalModalError, setNodalModalError] = useState({});
  const [nodalCodes, setNodalCodes] = useState([]);
  const [loadingNodals, setLoadingNodals] = useState(false);
useEffect(() => {
  const finalId = projectId || localStorage.getItem("projectId");

  console.log(" Using projectId:", finalId);

  if (!finalId) {
    console.log(" No projectId anywhere");
    return;
  }

  API.get(`/ExtrasConfigurations/DistinctNodals/${finalId}`)
    .then((res) => {
      const codes = (res.data || []).map((c) => ({
        value: c,
        label: c,
      }));
      setNodalCodes(codes);
    })
    .catch(console.error);
}, []);

useEffect(() => {
  if (!allowNodalConfig) {
    setExtraProcessingConfig((prev) => {
      const cleaned = { ...prev };

      Object.keys(cleaned).forEach((key) => {
        if (cleaned[key]?.isPerNodal) {
          cleaned[key] = {
            ...cleaned[key],
            isPerNodal: false,
            nodalConfigs: [],
            nodalMode: undefined,
          };
        }
      });

      return cleaned;
    });
  }
}, [allowNodalConfig]);

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
            {extraEnabled && (
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
            {!extraEnabled && (
              <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>
                Disabled
              </Tag>
            )}
          </div>
        }
      >
        <Row gutter={[16, 16]}>
          {extraTypes.filter((et) => {
    const isNodalExtra = et?.type?.toLowerCase()?.includes("nodal");
    if (!allowNodalConfig && isNodalExtra) return false;
    return true;
  }).map((et) => {
            const selectedNodals =
  extraProcessingConfig[et.type]?.nodalConfigs?.flatMap(c => c.nodalCodes || []) || [];
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
                          disabled={!extraEnabled}
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
                          disabled={!extraEnabled}
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

                  {(() => {
                    const isNodalExtra = et?.type?.toLowerCase()?.includes('nodal');
                     if (!allowNodalConfig && isNodalExtra) {return null;}
                    const isPerNodal = extraProcessingConfig[et.type]?.isPerNodal;
                    return (
                      <>
                        {allowNodalConfig && isNodalExtra && (
                          <Row align="middle" style={{ marginTop: 12, marginBottom: 8, padding: '8px', background: '#fafafa', borderRadius: '4px', border: '1px solid #f0f0f0' }}>
                           <Col span={24}>
                             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                               <Text strong>Nodal Configuration:</Text>
                               <Radio.Group
                                 value={isPerNodal ? 'different' : 'same'}
                                 onChange={(e) => {
                                   const isPer = e.target.value === 'different';
                                   console.log(` Toggling nodal mode for ${et.type}:`, isPer ? 'Custom per nodal' : 'Apply to all');
                                   setExtraProcessingConfig(prev => ({
                                     ...prev,
                                     [et.type]: {
                                       ...prev[et.type],
                                       isPerNodal: isPer,
                                       nodalMode: isPer ? (prev[et.type]?.nodalMode || "Fixed") : undefined // Initialize nodalMode when toggling to per-nodal
                                     }
                                   }));
                                 }}
                                 disabled={!extraEnabled}
                               >
                                 <Radio value="same">Apply to all</Radio>
                                 <Radio value="different">Custom per nodal</Radio>
                               </Radio.Group>
                             </div>
                           </Col>
                         </Row>
                        )}
                        {!isPerNodal ? (
                          <>
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
                    disabled={!extraEnabled}
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
                        disabled={!extraEnabled}
                        style={{ width: "100%" }}
                      />
                      {(() => {
                        const outerValue = getOuterCapacity(et.type);
                        const qty = extraProcessingConfig[et.type]?.fixedQty || 0;
                        if (outerValue && outerValue > 0 && qty > 0 && qty % outerValue !== 0) {
                          return (
                            <div style={{ color: "#ff4d4f", fontSize: "12px", marginTop: "4px", padding: '4px', background: '#fff2f0', borderRadius: '4px', border: '1px solid #ffccc7' }}>
                              Quantities must be multiples of outer envelope capacity ({outerValue}).
                            </div>
                          );
                        }
                        return null;
                      })()}
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
                            disabled={!extraEnabled}
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
                                disabled={!extraEnabled}
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
                                disabled={!extraEnabled}
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
                                  disabled={!extraEnabled}
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
                                  disabled={!extraEnabled}
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
                        disabled={!extraEnabled}
                        style={{ width: "100%" }}
                      />
                    </Form.Item>
                  )}
                          </>
                        ) : allowNodalConfig ? (
                          <div >
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
  <Tag color="blue">
    {extraProcessingConfig[et.type]?.nodalConfigs?.length || 0} nodal overrides
  </Tag>

  <Button
    type="link"
    onClick={() => {
      // Open modal and set draft to current config
      setNodalModalDraft(prev => ({
        ...prev,
        [et.type]: JSON.parse(JSON.stringify(extraProcessingConfig[et.type]?.nodalConfigs || [{ nodalCodes: [], value: 0 }]))
      }));
      setNodalModalError(prev => ({ ...prev, [et.type]: false }));
      setNodalModalOpen(prev => ({ ...prev, [et.type]: true }));
    }}
  >
    Configure
  </Button>
</div>

                            <Modal
                              title={`Configure Nodal Values for ${et.extraTitle || et.type}`}
                              open={nodalModalOpen[et.type]}
                              maskClosable={false}
                              width={600}
                              destroyOnClose
                              okButtonProps={{
                                disabled: (() => {
                                  const draft = nodalModalDraft[et.type];
                                  if (!Array.isArray(draft) || draft.length === 0) return true;
                                  // All rows must have at least one nodal and a value
                                  if (!draft.every(cfg => Array.isArray(cfg.nodalCodes) && cfg.nodalCodes.length > 0 && cfg.value !== null && cfg.value !== undefined && cfg.value !== '')) return true;
                                  // All nodals must be assigned, no duplicates, no missing
                                  const allNodalValues = nodalCodes.map(n => n.value);
                                  const selected = draft.flatMap(cfg => cfg.nodalCodes || []);
                                  // Check for duplicates
                                  const uniqueSelected = Array.from(new Set(selected));
                                  if (uniqueSelected.length !== selected.length) return true;
                                  // Check all nodals are assigned
                                  if (uniqueSelected.length !== allNodalValues.length) return true;
                                  if (!allNodalValues.every(n => uniqueSelected.includes(n))) return true;

                                  // Outer envelope multiple validation (only for Fixed mode)
                                  const isFixedMode = extraProcessingConfig[et.type]?.nodalMode === "Fixed" || !extraProcessingConfig[et.type]?.nodalMode;
                                  if (isFixedMode) {
                                    const outerValue = getOuterCapacity(et.type);
                                    if (outerValue && outerValue > 0) {
                                      if (!draft.every(cfg => Number(cfg.value) % outerValue === 0)) return true;
                                    }
                                  }
                                  return false;
                                })()
                              }}
                              onOk={() => {
                                // Validate all nodal codes selected and value present
                                if (!Array.isArray(nodalModalDraft[et.type]) || nodalModalDraft[et.type].length === 0 ||
                                  !nodalModalDraft[et.type].every(cfg => Array.isArray(cfg.nodalCodes) && cfg.nodalCodes.length > 0 && cfg.value !== null && cfg.value !== undefined && cfg.value !== '')) {
                                  setNodalModalError(prev => ({ ...prev, [et.type]: true }));
                                  return;
                                }
                                setExtraProcessingConfig(prev => ({
                                  ...prev,
                                  [et.type]: {
                                    ...prev[et.type],
                                    nodalConfigs: nodalModalDraft[et.type]
                                  }
                                }));
                                setNodalModalOpen(prev => ({ ...prev, [et.type]: false }));
                                setNodalModalError(prev => ({ ...prev, [et.type]: false }));
                              }}
                              onCancel={() => {
                                // Discard changes
                                setNodalModalOpen(prev => ({ ...prev, [et.type]: false }));
                                setNodalModalError(prev => ({ ...prev, [et.type]: false }));
                              }}
                            >
                              {/* Warning for Invalid Multiples */}
                              {(() => {
                                const draft = nodalModalDraft[et.type];
                                if (!draft) return null;
                                const isFixedMode = extraProcessingConfig[et.type]?.nodalMode === "Fixed" || !extraProcessingConfig[et.type]?.nodalMode;
                                if (!isFixedMode) return null;

                                const outerValue = getOuterCapacity(et.type);
                                if (outerValue && outerValue > 0) {
                                  const hasInvalidMultiple = draft.some(cfg => Number(cfg.value) > 0 && Number(cfg.value) % outerValue !== 0);
                                  if (hasInvalidMultiple) {
                                    return (
                                      <div style={{ padding: '8px', background: '#fff2f0', border: '1px solid #ffccc7', borderRadius: '4px', marginBottom: 16, color: '#ff4d4f' }}>
                                        Wait! Some quantities are not multiples of the outer envelope capacity ({outerValue}).
                                      </div>
                                    );
                                  }
                                }
                                return null;
                              })()}
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                                <Text strong>Nodal Configuration List</Text>
                                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {extraProcessingConfig[et.type]?.nodalMode === "Percentage" ? "Percentage" : "Fixed Qty"}
                                  </Text>
                                  <Switch
                                    checked={extraProcessingConfig[et.type]?.nodalMode === "Percentage"}
                                    checkedChildren="%"
                                    unCheckedChildren="#"
                                    disabled={!extraEnabled}
                                    onChange={(checked) =>
                                      setExtraProcessingConfig((prev) => ({
                                        ...prev,
                                        [et.type]: {
                                          ...prev[et.type],
                                          nodalMode: checked ? "Percentage" : "Fixed",
                                        },
                                      }))
                                    }
                                  />
                                </div>
                              </div>
                              
                              <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    // Add all remaining nodals into a single row's multi-select
                                    const allNodalValues = nodalCodes.map(n => n.value);
                                    setNodalModalDraft(prev => {
                                      const current = Array.isArray(prev[et.type]) ? [...prev[et.type]] : [];
                                      // Find all nodals already selected in any row
                                      const selected = current.flatMap(cfg => cfg.nodalCodes || []);
                                      // Find nodals not yet selected
                                      const remaining = allNodalValues.filter(n => !selected.includes(n));
                                      if (remaining.length === 0) return prev;
                                      // Try to find an empty row to use, else add a new row
                                      let updated = [...current];
                                      let emptyRowIdx = updated.findIndex(cfg => !cfg.nodalCodes || cfg.nodalCodes.length === 0);
                                      if (emptyRowIdx !== -1) {
                                        // Merge remaining into the empty row
                                        updated[emptyRowIdx] = {
                                          ...updated[emptyRowIdx],
                                          nodalCodes: remaining,
                                        };
                                      } else {
                                        updated.push({ nodalCodes: remaining, value: 0 });
                                      }
                                      return { ...prev, [et.type]: updated };
                                    });
                                  }}
                                >Select Remaining</Button>
                              </div>
                              <div style={{ maxHeight: '450px', overflowY: 'auto', overflowX: 'hidden', padding: '0 8px' }}>
                                <Row gutter={12} style={{ 
                                  marginBottom: 12, 
                                  padding: '8px 4px', 
                                  background: '#f5f5f5', 
                                  borderRadius: '6px',
                                  position: 'sticky',
                                  top: 0,
                                  zIndex: 1,
                                  borderBottom: '1px solid #d9d9d9'
                                }}>
                                  <Col span={11}><Text strong style={{ fontSize: 13 }}>Nodal Codes</Text></Col>
                                  <Col span={9}><Text strong style={{ fontSize: 13 }}>{extraProcessingConfig[et.type]?.nodalMode === "Percentage" ? "Value (%)" : "Quantity (#)"}</Text></Col>
                                  <Col span={4} style={{ textAlign: 'center' }}><Text strong style={{ fontSize: 13 }}>Actions</Text></Col>
                                </Row>

                                {(Array.isArray(nodalModalDraft[et.type]) && nodalModalDraft[et.type].length > 0
                                  ? nodalModalDraft[et.type]
                                  : [{ nodalCodes: [], value: 0 }]).map((config, i, arr) => (
                                  <Row gutter={12} key={i} align="middle" style={{ 
                                    marginBottom: 10, 
                                    padding: '8px', 
                                    background: '#fff', 
                                    border: '1px solid #f0f0f0', 
                                    borderRadius: '6px',
                                    transition: 'all 0.3s'
                                  }}>
                                    <Col span={11}>
                                      <Select
                                        mode="multiple"
                                        showSearch
                                        placeholder="Select Nodal"
                                        value={config.nodalCodes || []}
                                        disabled={!extraEnabled}
                                        style={{ width: "100%" }}
                                        onChange={(vals) => {
                                          const updated = Array.isArray(nodalModalDraft[et.type]) ? [...nodalModalDraft[et.type]] : [];
                                          updated[i] = { ...updated[i], nodalCodes: vals };
                                          setNodalModalDraft(prev => ({ ...prev, [et.type]: updated }));
                                        }}
                                        // Prevent duplicate nodal selection: only show nodals not selected in other rows, or already selected in this row
                                        options={nodalCodes.filter(n => {
                                          // Gather all nodals selected in other rows
                                          const allSelected = (Array.isArray(nodalModalDraft[et.type]) ? nodalModalDraft[et.type] : [])
                                            .flatMap((cfg, idx) => idx !== i ? (cfg.nodalCodes || []) : []);
                                          // Show if not selected elsewhere, or if already in this row
                                          return !allSelected.includes(n.value) || (config.nodalCodes || []).includes(n.value);
                                        })}
                                      />
                                    </Col>
                                    <Col span={9}>
                                      <InputNumber
                                        min={0}
                                        max={extraProcessingConfig[et.type]?.nodalMode === "Percentage" ? 100 : undefined}
                                        disabled={!extraEnabled}
                                        value={config.value || 0}
                                        style={{ width: "100%" }}
                                        onChange={(val) => {
                                          const updated = Array.isArray(nodalModalDraft[et.type]) ? [...nodalModalDraft[et.type]] : [];
                                          updated[i] = { ...updated[i], value: val || 0 };
                                          setNodalModalDraft(prev => ({ ...prev, [et.type]: updated }));
                                        }}
                                      />
                                    </Col>
                                    <Col span={4}>
                                      <div style={{ display: "flex", gap: 6, justifyContent: 'center' }}>
                                        {i === arr.length - 1 && (
                                          <Button
                                            icon={<PlusOutlined />}
                                            size="small"
                                            type="primary"
                                            shape="circle"
                                            disabled={!extraEnabled}
                                            onClick={() => {
                                              const updated = Array.isArray(nodalModalDraft[et.type]) ? [...nodalModalDraft[et.type]] : [];
                                              updated.push({ nodalCodes: [], value: 0 });
                                              setNodalModalDraft(prev => ({ ...prev, [et.type]: updated }));
                                            }}
                                          />
                                        )}
                                        {arr.length > 1 && (
                                          <Button
                                            icon={<MinusCircleOutlined />}
                                            danger
                                            size="small"
                                            type="text"
                                            disabled={!extraEnabled}
                                            onClick={() => {
                                              const updated = Array.isArray(nodalModalDraft[et.type]) ? nodalModalDraft[et.type].filter((_, idx) => idx !== i) : [];
                                              setNodalModalDraft(prev => ({ ...prev, [et.type]: updated }));
                                            }}
                                          />
                                        )}
                                      </div>
                                    </Col>
                                  </Row>
                                ))}
                              </div>
                              {nodalModalError[et.type] && (
                                <div style={{ color: 'red', marginTop: 8 }}>
                                  Each row must have at least one nodal selected and a value.
                                </div>
                              )}
                            </Modal>
                          </div>
                        ): null }
                      </>
                    );
                  })()}
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

