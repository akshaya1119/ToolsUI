import React from "react";
import { Card, Checkbox, Typography, Button } from "antd";
import { SettingFilled, LockFilled, UndoOutlined, DeleteOutlined } from "@ant-design/icons";
import AnimatedCard from "./AnimatedCard";
import { cardStyle, iconStyle, PRIMARY_COLOR } from "./constants";

const { Text } = Typography;

// Modules allowed without Envelope Setup and Enhancement
const ALWAYS_ALLOWED = ["Duplicate Tool", "Extra Configuration"];

const ModuleSelectionCard = ({ mergedModules, enabledModules, setEnabledModules, onReset, onClear, importedSnapshot }) => {
  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 4 };

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
              <SettingFilled style={iconStyle} /> Module Selection
            </span>
            <br />
            <Text type="secondary">
              Enable or disable modules based on project requirements
            </Text>
          </div>
        }
        extra={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
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
          </div>
        }
      >
        <div style={isDirty(enabledModules, importedSnapshot?.enabledModules) ? DIRTY_STYLE : {}}>
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
        </div>
      </Card>
    </AnimatedCard>
  );
};

export default ModuleSelectionCard;