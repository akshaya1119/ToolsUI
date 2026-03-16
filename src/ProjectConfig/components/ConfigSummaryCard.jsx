import React from "react";
import { Card, List, Button, Typography, Row, Col, message } from "antd";
import { CarryOutFilled } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle } from "./constants";

const { Text } = Typography;

const ConfigSummaryCard = ({
  enabledModules,
  envelopeConfigured,
  boxConfigured,
  extraConfigured,
  duplicateConfigured, // <-- new prop
  handleSave,
  projectId,
  isMasterConfig,
}) => {

  const isAnyConfigMade = envelopeConfigured || boxConfigured || extraConfigured || duplicateConfigured;
  const summaryItems = [
    {
      label: "Enabled Modules",
      value: enabledModules.length,
      strong: true,
    },
    {
      label: "Envelope Setup",
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
        <Button
          type="primary"
          block
          onClick={handleSave}
          disabled={!projectId || !isAnyConfigMade}
          className="mt-4 mb-2"
        >
          Save Configuration
        </Button>
        <Button
          type="default"
          block
          onClick={() => {
            const groupId = localStorage.getItem("selectedGroup");
            const typeId = localStorage.getItem("selectedType");

            if (!groupId || !typeId) {
              message.warning("Group or Type not selected in Dashboard");
              return;
            }

            handleSave(true, parseInt(typeId), parseInt(groupId));
          }}
          disabled={!isAnyConfigMade || isMasterConfig}
          style={{ marginTop: '8px' }}
        >
          Save as Master Configuration
        </Button>
      </Card>
    </AnimatedCard>
  );
};

export default ConfigSummaryCard;
