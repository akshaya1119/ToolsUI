import { Card, List, Button, Typography, Row, Col } from "antd";
import { CarryOutFilled } from "@ant-design/icons";
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

  // In project config mode, type/group come from localStorage (set when project was selected on dashboard)
  const effectiveType = selectedType ?? localStorage.getItem("selectedType");
  const effectiveGroup = selectedGroup ?? localStorage.getItem("selectedGroup");

  const isAnyConfigMade = envelopeConfigured || boxConfigured || extraConfigured || duplicateConfigured;
  const summaryItems = [
    {
      label: "Enabled Modules",
      value: enabledModules.length,
      strong: true,
    },
    {
      label: "Envelope Setup & Enhancement",
      value: envelopeConfigured ? "Configured" : "Not Configured",
      danger: !envelopeConfigured,
    },
    {
      label: "Box Breaking",
      value: boxConfigured ? "Configured" : "Not Configured",
      danger: !boxConfigured,
    },
    {
      label: "Extra Processing",
      value: extraConfigured ? "Configured" : "Not Configured",
      danger: !extraConfigured,
    },
    {
      label: "Duplicate Tool",
      value: duplicateConfigured ? "Configured" : "Not Configured",
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
              <CarryOutFilled style={iconStyle} />Configuration Summary
            </span>
            <br />
            <Text type="secondary">
              Please review the summary before saving configurations
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
            Save
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
              Save Configuration
            </Button>
            <Button
              type="default"
              block
              onClick={() => handleSave(true, effectiveType, effectiveGroup, true)}
              disabled={!isAnyConfigMade || !effectiveType || !effectiveGroup}
              style={{ marginTop: '8px' }}
            >
              Save as Master Configuration
            </Button>
          </>
        )}
      </Card>
    </AnimatedCard>
  );
};

export default ConfigSummaryCard;

