import { Card, List, Button, Typography, Row, Col } from "antd";
import { CarryOutFilled } from "@ant-design/icons";
import { useTranslation } from "react-i18next";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle } from "./constants";

const { Text } = Typography;

const ConfigSummaryCard = ({
  enabledModules,
  envelopeConfigured,
  boxConfigured,
  extraConfigured,
  duplicateConfigured,
  handleSave,
  projectId,
  isMasterConfig,
  selectedType,
  selectedGroup,
}) => {
  const { t } = useTranslation();

  // In project config mode, type/group come from localStorage (set when project was selected on dashboard)
  const effectiveType = selectedType ?? localStorage.getItem("selectedType");
  const effectiveGroup = selectedGroup ?? localStorage.getItem("selectedGroup");

  const isAnyConfigMade = envelopeConfigured || boxConfigured || extraConfigured || duplicateConfigured;
  const summaryItems = [
    {
      label: t('projectConfig.enabledModules', "Enabled Modules"),
      value: enabledModules.length,
      strong: true,
    },
    {
      label: t('projectConfig.envelopeSetupEnhancement', "Envelope Setup & Enhancement"),
      value: envelopeConfigured ? t('projectConfig.configured', "Configured") : t('projectConfig.notConfigured', "Not Configured"),
      danger: !envelopeConfigured,
    },
    {
      label: t('projectConfig.boxBreaking', "Box Breaking"),
      value: boxConfigured ? t('projectConfig.configured', "Configured") : t('projectConfig.notConfigured', "Not Configured"),
      danger: !boxConfigured,
    },
    {
      label: t('projectConfig.extraProcessing', "Extra Processing"),
      value: extraConfigured ? t('projectConfig.configured', "Configured") : t('projectConfig.notConfigured', "Not Configured"),
      danger: !extraConfigured,
    },
    {
      label: t('projectConfig.duplicateTool', "Duplicate Tool"),
      value: duplicateConfigured ? t('projectConfig.configured', "Configured") : t('projectConfig.notConfigured', "Not Configured"),
      danger: !duplicateConfigured
    },
  ];

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <CarryOutFilled style={iconStyle} />{t('projectConfig.summaryTitle', "Configuration Summary")}
            </span>
            <br />
            <Text type="secondary">
              {t('projectConfig.summaryDesc', "Please review the summary before saving configurations")}
            </Text>
          </div>
        }
      >
        <List
          size="small"
          dataSource={summaryItems}
          renderItem={(item) => (
            <List.Item>
              <Row style={{ width: "100%" }}>
                <Col span={12}>
                  <Text>{item.label}</Text>
                </Col>
                <Col span={12} style={{ textAlign: "right" }}>
                  {item.danger ? (
                    <Text type="danger">{item.value}</Text>
                  ) : item.strong ? (
                    <Text strong>{item.value}</Text>
                  ) : (
                    <Text>{item.value}</Text>
                  )}
                </Col>
              </Row>
            </List.Item>
          )}
        />
        {/* Master Config: Only Save button */}
        {isMasterConfig && (
          <Button
            type="primary"
            block
            onClick={() => handleSave()}
            disabled={!isAnyConfigMade}
            className="mt-4"
          >
            {t('common.actions.save', "Save")}
          </Button>
        )}

        {/* Project Config: Save Configuration and Save as Master Configuration buttons */}
        {!isMasterConfig && (
          <>
            <Button
              type="primary"
              block
              onClick={() => handleSave()}
              disabled={!projectId || !isAnyConfigMade}
              className="mt-4 mb-2"
            >
              {t('projectConfig.saveConfiguration', "Save Configuration")}
            </Button>
            <Button
              type="default"
              block
              onClick={() => handleSave(true, effectiveType, effectiveGroup, true)}
              disabled={!isAnyConfigMade || !effectiveType || !effectiveGroup}
              style={{ marginTop: '8px' }}
            >
              {t('projectConfig.saveAsMaster', "Save as Master Configuration")}
            </Button>
          </>
        )}
      </Card>
    </AnimatedCard>
  );
};

export default ConfigSummaryCard;

