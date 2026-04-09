import React from "react";
import { Select, Typography } from "antd";

const RPTFilesHeader = ({
  templateScope,
  onScopeChange,
  selectedGroup,
  onGroupChange,
  groupOptions,
  selectedType,
  onTypeChange,
  typeOptions,
  groupLabel,
}) => {
  return (
    <div className="rpt-header">
      <Typography.Title level={4} style={{ margin: 0 }}>
        RPT Templates
      </Typography.Title>
      <div className="rpt-filters">
        <div className="rpt-filter">
          <Select
            placeholder="Scope"
            value={templateScope}
            onChange={onScopeChange}
            options={[
              { label: "Group", value: "group" },
              { label: "Standard", value: "standard" },
            ]}
            style={{ width: "100%" }}
            size="large"
          />
        </div>
        <div className="rpt-filter">
          <Select
            placeholder="Select Group"
            value={selectedGroup}
            onChange={onGroupChange}
            options={groupOptions}
            style={{ width: "100%" }}
            size="large"
            allowClear
            clearIcon={<span style={{ fontSize: 12 }}>x</span>}
            disabled={templateScope === "standard"}
          />
          {!selectedGroup && templateScope === "group" && (
            <Typography.Text type="danger" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
              Please select a group
            </Typography.Text>
          )}
        </div>
        <div className="rpt-filter">
          <Select
            placeholder="Select Type"
            value={selectedType}
            onChange={onTypeChange}
            options={typeOptions}
            style={{ width: "100%" }}
            size="large"
            allowClear
            clearIcon={<span style={{ fontSize: 12 }}>x</span>}
          />
          {!selectedType && (
            <Typography.Text type="danger" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
              Please select a type
            </Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default RPTFilesHeader;
