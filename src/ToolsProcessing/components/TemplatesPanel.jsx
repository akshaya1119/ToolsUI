import React from "react";
import { Card, Button, Typography, Tag, Space } from "antd";
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
}) => {
  if (!open) return null;

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
            <Button
              size="small"
              type="primary"
              onClick={handleGenerateAllTemplates}
              loading={bulkGenerating}
            >
              Generate All
            </Button>
            <Button
              size="small"
              onClick={handleDownloadAllTemplates}
              loading={bulkDownloading}
            >
              Download All
            </Button>
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
                          <Button
                            size="small"
                            type={alreadyGenerated ? "default" : "primary"}
                            onClick={() => handleGenerateTemplate(template, alreadyGenerated ? "regenerate" : "generate")}
                            loading={isGenerating}
                          >
                            Generate
                          </Button>
                        </Space>
                      </div>

                      <EnvLotReportsManager
                        reports={envLotReports}
                        templateId={templateId}
                        onDownload={handleDownloadEnvLotReport}
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
