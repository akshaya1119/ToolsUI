import React from "react";
import { Card, Button, Typography, Space, Tag, Tabs, Select } from "antd";

const { Text } = Typography;

const LotWisePanel = ({
  open,
  projectId,
  url3,
  loadingLots,
  availableLots,
  selectedLotTab,
  setSelectedLotTab,
  getTemplatesForModuleKey,
  resolveTemplateId,
  resolveTemplateName,
  lotTemplateStatus,
  staleLotIds,
  generatingLotReport,
  lotReportStatus,
  getBoxVersionsForLot,
  handleGenerateAllLots,
  generatingLotTemplates,
  downloadingLotTemplates,
  handleGenerateLotTemplate,
  handleDownloadLotTemplate,
  handleGenerateAllLotTemplates,
  handleDownloadAllLots,
  bulkGeneratingLots,
  bulkDownloadingLots,
  onClose,
}) => {
  if (!open) return null;

  const lotTemplates = getTemplatesForModuleKey("box");

  return (
    <Card
      size="small"
      className="pipeline-panel pipeline-panel-wide"
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography.Text strong>
            Lot-wise Templates and Reports - Box Breaking
          </Typography.Text>
          <Button size="small" onClick={onClose}>
            Close
          </Button>
        </div>
      }
      bodyStyle={{ padding: 0 }}
      style={{
        border: "1px solid #d9d9d9",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        borderRadius: 8,
        alignSelf: "start",
      }}
    >
      <div className="pipeline-panel-body">
        {loadingLots ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Text type="secondary">Loading lots...</Text>
          </div>
        ) : availableLots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Text type="secondary">No lots found for this project</Text>
          </div>
        ) : (
          <Tabs
            activeKey={selectedLotTab?.toString()}
            onChange={(key) => setSelectedLotTab(Number(key))}
            type="card"
            size="small"
            items={availableLots.map((lot) => {
              // Count generated templates for this lot
              const generatedCount = lotTemplates.filter((template) => {
                const templateId = resolveTemplateId(template);
                if (!templateId) return false;
                const statusKey = `${lot.lotNo}_${templateId}`;
                const status = lotTemplateStatus[statusKey];
                const isStale = staleLotIds.has(statusKey);
                return status?.exists && !isStale;
              }).length;

              const hasStale = lotTemplates.some((template) => {
                const templateId = resolveTemplateId(template);
                if (!templateId) return false;
                const statusKey = `${lot.lotNo}_${templateId}`;
                return staleLotIds.has(statusKey);
              });

              return {
                key: lot.lotNo.toString(),
                label: (
                  <Space size="small">
                    <Text>Lot {lot.lotNo}</Text>
                    {hasStale && (
                      <Tag color="orange" style={{ margin: 0 }}>
                        ⟳
                      </Tag>
                    )}
                  </Space>
                ),
                children: (
                  <div style={{ padding: "12px" }}>
                    {/* Reports Section - Now First */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        paddingBottom: 8,
                        borderBottom: "2px solid #f0f0f0"
                      }}>
                        <Text strong style={{ fontSize: "14px", color: "#52c41a" }}>
                          Reports
                        </Text>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {/* Box Breaking Report */}
                        <Card
                          size="small"
                          bodyStyle={{ padding: "8px 12px" }}
                          style={{ borderRadius: 4, backgroundColor: "#fafafa" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Text strong style={{ fontSize: "13px" }}>
                                  Box Breaking Report
                                </Text>
                                <Text type="secondary" style={{ fontSize: "11px" }}>
                                  Lot {lot.lotNo}
                                </Text>
                                {lotReportStatus[lot.lotNo] ? (
                                  lot.minStep < 6 ? (
                                    <Tag color="orange" style={{ margin: 0 }}>
                                      Outdated
                                    </Tag>
                                  ) : (
                                    <Tag color="green" style={{ margin: 0 }}>
                                      Ready
                                    </Tag>
                                  )
                                ) : null}
                              </div>
                            </div>
                            <Space size="small">
                              {getBoxVersionsForLot(lot.lotNo).length > 0 && (
                                <Select
                                  placeholder="Download"
                                  size="small"
                                  style={{ width: 140 }}
                                  value={undefined}
                                  onChange={(fileName) => {
                                    const fileUrl = `${url3}/${projectId}/${fileName}`;
                                    const link = document.createElement("a");
                                    link.href = fileUrl;
                                    link.download = fileName;
                                    link.target = "_blank";
                                    document.body.appendChild(link);
                                    link.click();
                                    document.body.removeChild(link);
                                  }}
                                  options={getBoxVersionsForLot(lot.lotNo).map((v) => ({
                                    value: v.fileName,
                                    label: v.version > 0 ? `v${v.version} (${v.generatedAt})` : `Latest (${v.generatedAt})`,
                                  }))}
                                />
                              )}
                              <Button
                                size="small"
                                type={getBoxVersionsForLot(lot.lotNo).length > 0 ? "default" : "primary"}
                                onClick={() => handleGenerateAllLots(lot.lotNo)}
                                loading={generatingLotReport[lot.lotNo]}
                              >
                                {lotReportStatus[lot.lotNo] ? "Regenerate" : "Generate"}
                              </Button>
                            </Space>
                          </div>
                        </Card>
                      </div>
                    </div>

                    {/* Templates Section - Now Second */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        paddingBottom: 8,
                        borderBottom: "2px solid #f0f0f0"
                      }}>
                        <Text strong style={{ fontSize: "14px", color: "#1890ff" }}>
                          Templates
                        </Text>
                        <Space size="small">
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => handleGenerateAllLotTemplates(lot.lotNo)}
                            loading={bulkGeneratingLots}
                            disabled={lotTemplates.length === 0 || lotTemplates.every((template) => {
                              const templateId = resolveTemplateId(template);
                              if (!templateId) return true;
                              const statusKey = `${lot.lotNo}_${templateId}`;
                              const status = lotTemplateStatus[statusKey];
                              const isStale = staleLotIds.has(statusKey);
                              return status?.exists && !isStale;
                            })}
                          >
                            Generate All
                          </Button>
                          <Button
                            size="small"
                            onClick={() => handleDownloadAllLots(lot.lotNo)}
                            loading={bulkDownloadingLots}
                            disabled={lotTemplates.length === 0 || !lotTemplates.every((template) => {
                              const templateId = resolveTemplateId(template);
                              if (!templateId) return false;
                              const statusKey = `${lot.lotNo}_${templateId}`;
                              const status = lotTemplateStatus[statusKey];
                              const isStale = staleLotIds.has(statusKey);
                              return status?.exists && !isStale;
                            })}
                          >
                            Download All
                          </Button>
                        </Space>
                      </div>

                      {lotTemplates.length === 0 ? (
                        <Text type="secondary">No templates linked to Box Breaking module.</Text>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {lotTemplates.map((template) => {
                            const templateId = resolveTemplateId(template);
                            const statusKey = `${lot.lotNo}_${templateId}`;
                            const isGenerating = generatingLotTemplates[statusKey];
                            const isDownloading = downloadingLotTemplates[statusKey];
                            const status = lotTemplateStatus[statusKey];
                            const isStale = staleLotIds.has(statusKey);
                            const canGenerate = !status?.exists || isStale;
                            const hasDownload = status?.exists && !isStale;

                            return (
                              <Card
                                size="small"
                                key={templateId || resolveTemplateName(template)}
                                bodyStyle={{ padding: "8px 12px" }}
                                style={{ borderRadius: 4, backgroundColor: "#fafafa" }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                      <Text strong style={{ fontSize: "13px" }}>
                                        {resolveTemplateName(template)}
                                      </Text>
                                      {((status?.exists && !isStale) || (template.reportStatus && !isStale)) && (
                                        <Tag color="green" style={{ margin: 0 }}>Ready</Tag>
                                      )}
                                      {status?.exists && !isStale && status.generatedAt && (
                                        <Text type="secondary" style={{ fontSize: "11px" }}>
                                          Generated {new Date(status.generatedAt).toLocaleString()}
                                        </Text>
                                      )}
                                    </div>
                                    {(isStale || !template.reportStatus) && status?.exists && (
                                      <Tag color="warning" style={{ fontSize: "10px", marginTop: 4 }}>
                                        Data updated - regeneration required
                                      </Tag>
                                    )}
                                  </div>
                                  <Space size="small">
                                    {canGenerate ? (
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => handleGenerateLotTemplate(lot.lotNo, template)}
                                        loading={isGenerating}
                                      >
                                        Generate
                                      </Button>
                                    ) : (
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => handleGenerateLotTemplate(lot.lotNo, template)}
                                        loading={isGenerating}
                                      >
                                        Regenerate
                                      </Button>
                                    )}
                                    <Button
                                      size="small"
                                      onClick={() => handleDownloadLotTemplate(lot.lotNo, template)}
                                      loading={isDownloading}
                                      disabled={!hasDownload}
                                    >
                                      Download
                                    </Button>
                                  </Space>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ),
              };
            })}
            tabBarStyle={{ margin: 0, paddingLeft: 12, paddingRight: 12 }}
          />
        )}
      </div>
    </Card>
  );
};

export default LotWisePanel;
