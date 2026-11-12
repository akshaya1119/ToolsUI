import React from "react";
import { Card, Button, Typography, Tag, Space, Tooltip } from "antd";
import EnvLotReportsManager from "../EnvLotReportsManager";

const { Text } = Typography;

const TemplatesPanel = ({
  open,
  moduleKey,
  moduleTitle,
  templates,
  templatesLoading,
  generatingTemplates,
  templateReportStatus,
  templateDownloads,
  staleTemplateIds,
  envLotReports,
  expandedReportsTemplates,
  bulkGenerating,
  bulkDownloading,
  isMappingNewerThanReport,
  resolveTemplateId,
  resolveTemplateName,
  handleGenerateTemplate,
  handleDownloadEnvLotReport,
  handleDeleteEnvLotReport,
  handleReportsExpansion,
  handleGenerateAllTemplates,
  handleDownloadAllTemplates,
  onClose,
  checkIsEnvelopeDependent,
  isQuantitySheetTemplate,
  canExecute = true,
  isDispatchExceeded = false,
  dispatchedLotMessage = null,
}) => {
  if (!open) return null;

  const hasAnyTemplateFile = templates && templates.some(template => (template.hasFileOnDisk !== false && template.HasFileOnDisk !== false) && !!(template.rptFilePath || template.RPTFilePath));

  return (
    <Card
      size="small"
      className="pipeline-panel"
      title={
        <div className="pipeline-panel-title">
          <Typography.Text strong>
            Templates{moduleTitle ? ` - ${moduleTitle}` : ""}
          </Typography.Text>
          <div className="pipeline-panel-actions">
            <Tooltip title={isDispatchExceeded ? (dispatchedLotMessage || "Dispatch date has exceeded (Read-Only)") : !canExecute ? "View-only access: Generating reports is disabled" : !hasAnyTemplateFile ? "Upload at least one template first" : ""}>
              <span>
                <Button
                  size="small"
                  type="primary"
                  onClick={handleGenerateAllTemplates}
                  loading={bulkGenerating}
                  disabled={!canExecute || isDispatchExceeded || !templates || templates.length === 0 || !hasAnyTemplateFile}
                >
                  Generate All
                </Button>
              </span>
            </Tooltip>

            <Button size="small" onClick={onClose}>
              Close
            </Button>
          </div>
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
        {isDispatchExceeded && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fff2f0", border: "1px solid #ffccc7", borderRadius: 6, color: "#cf1322", fontSize: 13 }}>
            {dispatchedLotMessage || "This lot has exceeded its dispatch date and is locked (read-only). Generating reports or re-processing is disabled."}
          </div>
        )}
        {templatesLoading ? (
          <Text type="secondary">Loading templates...</Text>
        ) : (
          <>
            {moduleKey && templates.length === 0 ? (
              <Text type="secondary">No templates linked to this module.</Text>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {templates.map((template) => {
                  const templateId = resolveTemplateId(template);
                  const isGenerating = templateId ? generatingTemplates[templateId] : false;
                  const reportStatus = templateId ? templateReportStatus[templateId] : null;
                  const hasMappingUpdate = templateId
                    ? isMappingNewerThanReport(templateId)
                    : false;
                  const isStale = staleTemplateIds.has(templateId);
                  const needsRegenerate = hasMappingUpdate || isStale;
                  const existsInDb = envLotReports.some((r) => r.templateId === templateId);
                  const reportExists = reportStatus?.exists || template.reportStatus || existsInDb;
                  // Only treat as "already generated" if it exists AND doesn't need regeneration
                  // For envelope-dependent templates with missing catches, should still be treated as "generate" (not "regenerate")
                  const alreadyGenerated = reportExists && !needsRegenerate && !existsInDb; // Exclude env lot reports from "alreadyGenerated" logic
                  
                  const isEnvelopeDependent = checkIsEnvelopeDependent ? checkIsEnvelopeDependent(template) : false;
                  const isQS = isQuantitySheetTemplate ? isQuantitySheetTemplate(resolveTemplateName(template)) : false;
                  const showBothButtons = isEnvelopeDependent && !isQS;
                  const hasTemplateFile = (template.hasFileOnDisk !== false && template.HasFileOnDisk !== false) && !!(template.rptFilePath || template.RPTFilePath);

                  return (
                    <Card
                      size="small"
                      key={templateId || resolveTemplateName(template)}
                      styles={{ body: { padding: 12 } }}
                      style={{ borderRadius: 8 }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: 8
                      }}>
                        <div style={{ fontWeight: 600 }}>
                          {resolveTemplateName(template)}
                          {alreadyGenerated && (
                            <Tag color="green" style={{ marginLeft: 8 }}>Ready</Tag>
                          )}
                          {reportExists && needsRegenerate && (
                            <Tag color="orange" style={{ marginLeft: 8 }}>Outdated</Tag>
                          )}
                        </div>
                        <Space>
                          <Tooltip title={isDispatchExceeded ? (dispatchedLotMessage || "Dispatch date has exceeded (Read-Only)") : !canExecute ? "View-only access: Generating reports is disabled" : !hasTemplateFile ? "Upload template first" : ""}>
                            <span>
                              <Button
                                size="small"
                                type={alreadyGenerated ? "default" : "primary"}
                                onClick={() => handleGenerateTemplate(template, alreadyGenerated ? "regenerate" : "generate")}
                                loading={isGenerating}
                                disabled={!canExecute || isDispatchExceeded || !hasTemplateFile}
                              >
                                Generate
                              </Button>
                            </span>
                          </Tooltip>
                        </Space>
                      </div>

                      <EnvLotReportsManager
                        reports={envLotReports}
                        templateId={templateId}
                        onDelete={handleDeleteEnvLotReport}
                        compact={true}
                        activeKey={expandedReportsTemplates.has(templateId) ? ['reports'] : []}
                        onActiveKeyChange={(activeKey) => handleReportsExpansion(templateId, activeKey)}
                      />
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};

export default TemplatesPanel;
