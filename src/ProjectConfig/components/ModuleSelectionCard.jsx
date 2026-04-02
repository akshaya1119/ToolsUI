import React from "react";
import { Card, Checkbox, Typography } from "antd";
import { SettingFilled  } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle } from "./constants";

const { Text } = Typography;

// Modules allowed without Envelope Setup and Enhancement
const ALWAYS_ALLOWED = ["Duplicate Tool", "Extra Configuration"];

const ModuleSelectionCard = ({ mergedModules, enabledModules, setEnabledModules }) => {
  const envelopeEnabled = enabledModules.includes("Envelope Setup and Enhancement");

  const handleChange = (newValues) => {
    // If Envelope Setup and Enhancement is being unchecked, strip all non-allowed modules
    if (!newValues.includes("Envelope Setup and Enhancement")) {
      setEnabledModules(newValues.filter((m) => ALWAYS_ALLOWED.includes(m)));
    } else {
      setEnabledModules(newValues);
    }
  };

  return (
    <AnimatedCard>
      <Card
        style={cardStyle}
        title={
          <div>
            <span>
              <SettingFilled  style={iconStyle} /> Module Selection
            </span>
            <br />
            <Text type="secondary">
              Enable or disable modules based on project requirements
            </Text>
          </div>
        }
      >
        <Checkbox.Group
          style={{ display: "block", marginTop: 12 }}
          value={enabledModules}
          onChange={handleChange}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              columnGap: 12,
              rowGap: 8,
            }}
          >
            {mergedModules.map((tool) => {
              const isAlwaysAllowed = ALWAYS_ALLOWED.includes(tool.name);
              const isGateModule = tool.name === "Envelope Setup and Enhancement";
              const isDisabled = !envelopeEnabled && !isAlwaysAllowed && !isGateModule;
              return (
                <Checkbox key={tool.id} value={tool.name} disabled={isDisabled}>
                  <b style={{ color: isDisabled ? "#aaa" : undefined }}>{tool.name}</b>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tool.description}
                  </Text>
                </Checkbox>
              );
            })}
          </div>
        </Checkbox.Group>
      </Card>
    </AnimatedCard>
  );
};

export default ModuleSelectionCard;