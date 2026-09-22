import React from "react";
import { Card, Button, Typography, Space, Tag, Tabs, Select, Skeleton, Spin } from "antd";

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
  handleGenerateLotTemplate,
  handleGenerateAllLotTemplates,
  bulkGeneratingLots,
  onClose,
  // Project-level template helpers (quantity sheet handling)
  generatingTemplates,
  templateReportStatus,
  handleGenerateTemplate,
  isQuantitySheetTemplate,
  isCompositeSummaryTemplate,
  staleTemplateIds,
  getMappingUpdateTime,
}) => {
  if (!open) return null;

  const lotTemplates = getTemplatesForModuleKey("box");

  console.log("[LotWisePanel] Rendering - open:", open, "availableLots:", availableLots.length, "loadingLots:", loadingLots);

  try {
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
      style={{
        border: "1px solid #d9d9d9",
        boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        borderRadius: 8,
        alignSelf: "start",
        minHeight: "400px",
        width: "100%",
        maxWidth: "100%",
      }}
      bodyStyle={{ padding: "12px" }}
    >
      <div className="pipeline-panel-body" style={{ minHeight: "350px" }}>
        {loadingLots ? (
          <div style={{ padding: "24px" }}>
            <Spin spinning={true} tip="Loading lots..." style={{ display: "flex", justifyContent: "center" }}>
              <div style={{ height: "200px" }}>
                <Skeleton paragraph={{ rows: 4 }} />
              </div>
            </Spin>
          </div>
        ) : availableLots.length === 0 ? (
          <div style={{ textAlign: "center", padding: "20px" }}>
            <Text type="secondary">No lots found for this project</Text>
          </div>
        ) : (
          <Tabs
            activeKey={selectedLotTab != null ? selectedLotTab.toString() : "project-wide"}
            onChange={(key) => setSelectedLotTab(key === "project-wide" ? "project-wide" : Number(key))}
            type="card"
            size="small"
            items={[
              {
                // key: "project-wide",
                // label: (
                //   <Space size="small">
                //     <Text>Project-wide</Text>
                //   </Space>
                // ),
                children: (
                  <div style={{ padding: "12px" }}>
                    <div style={{ marginBottom: 24 }}>
                      {/* <div style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 12,
                        paddingBottom: 8,
                        borderBottom: "2px solid #f0f0f0"
                      }}>
                        <Text strong style={{ fontSize: "14px", color: "#1890ff" }}>
                          Generic Templates
                        </Text>
                      </div> */}

                      {getTemplatesForModuleKey("box").length === 0 ? (
                        <Text type="secondary">No templates linked to Box Breaking module.</Text>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                          {getTemplatesForModuleKey("box").map((template) => {
                            const templateId = resolveTemplateId(template);
                            const status = lotTemplateStatus[templateId];
                            const isStale = staleLotIds.has(templateId);
                            const isGenerating = generatingLotTemplates[templateId];

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
                                      {status?.exists && !isStale && (
                                        <Tag color="green" style={{ margin: 0 }}>Ready</Tag>
                                      )}
                                    </div>
                                  </div>
                                  <Space size="small">
                                    <Button
                                      size="small"
                                      type="primary"
                                      onClick={() => handleGenerateTemplate(template)}
                                      loading={isGenerating}
                                    >
                                      Generate
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
                )
              },
              ...availableLots.map((lot) => {
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
                  key: String(lot.lotNo),
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
                              disabled={!lotReportStatus?.[lot.lotNo] || lotTemplates.length === 0}
                            >
                              Generate All
                            </Button>
                          </Space>
                        </div>

                        {lotTemplates.length === 0 ? (
                          <Text type="secondary">No templates linked to Box Breaking module.</Text>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {lotTemplates.map((template) => {
                              const templateId = resolveTemplateId(template);
                              const isProjectWide = isQuantitySheetTemplate(resolveTemplateName(template)) || (isCompositeSummaryTemplate && isCompositeSummaryTemplate(resolveTemplateName(template)));
                              
                              const isGenerating = isProjectWide 
                                ? generatingTemplates[templateId]
                                : generatingLotTemplates[`${lot.lotNo}_${templateId}`];
                                
                             
                              const status = isProjectWide 
                                ? templateReportStatus[templateId]
                                : lotTemplateStatus[`${lot.lotNo}_${templateId}`];
                                
                              const isMappingStale = templateId && getMappingUpdateTime?.(templateId) != null;

                              const isStale = isProjectWide 
                                ? staleTemplateIds.has(templateId) || isMappingStale
                                : staleLotIds.has(`${lot.lotNo}_${templateId}`) || isMappingStale;
                              const canGenerate = !status?.exists || isStale;
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
                                      {isStale && status?.exists && (
                                        <Tag color="warning" style={{ fontSize: "10px", marginTop: 4 }}>
                                          Data updated - regeneration required
                                        </Tag>
                                      )}
                                    </div>
                                    <Space size="small">
                                      <Button
                                        size="small"
                                        type="primary"
                                        onClick={() => {
                                          if (isProjectWide) {
                                            handleGenerateTemplate(template);
                                          } else {
                                            handleGenerateLotTemplate(lot.lotNo, template);
                                          }
                                        }}
                                        loading={isGenerating}
                                        disabled={!lotReportStatus?.[lot.lotNo]}
                                      >
                                        Generate
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
              })]}
            tabBarStyle={{ margin: 0, paddingLeft: 12, paddingRight: 12 }}
          />
        )}
      </div>
    </Card>
    );
  } catch (error) {
    console.error("[LotWisePanel] Render error:", error);
    return (
      <Card style={{ minHeight: "400px" }}>
        <div style={{ padding: "24px", textAlign: "center" }}>
          <Text type="danger">Error rendering panel: {error.message}</Text>
        </div>
      </Card>
    );
  }
};

export default LotWisePanel;
