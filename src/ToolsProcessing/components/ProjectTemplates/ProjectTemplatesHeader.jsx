import React from "react";
import { Input, Typography } from "antd";
import { useTranslation } from 'react-i18next';

const ProjectTemplatesHeader = ({
  projectLoading,
  projectLabel,
  projectName,
  projectId,
  groupLabel,
  projectGroupId,
  typeLabel,
  projectTypeId,
}) => {
  const { t } = useTranslation();
  return (
    <div className="rpt-header">
      <Typography.Title level={4} style={{ margin: 0 }}>
        {t("menu.projectTemplates")}
      </Typography.Title>
      <div className="rpt-filters">
        <div className="rpt-filter">
          <Input
            placeholder="Project"
            value={
              projectLoading
                ? "Loading project..."
                : projectLabel ||
                projectName ||
                (projectId ? `Project ${projectId}` : "")
            }
            size="large"
            disabled
          />
          {!projectId && (
            <Typography.Text
              type="danger"
              style={{ fontSize: 11, display: "block", marginTop: 2 }}
            >
              Please select a project
            </Typography.Text>
          )}
        </div>
        <div className="rpt-filter">
          <Input placeholder="Group" value={groupLabel || ""} size="large" disabled />
          {!projectGroupId && (
            <Typography.Text
              type="danger"
              style={{ fontSize: 11, display: "block", marginTop: 2 }}
            >
              Group is missing for this project
            </Typography.Text>
          )}
        </div>
        <div className="rpt-filter">
          <Input placeholder="Type" value={typeLabel || ""} size="large" disabled />
          {!projectTypeId && (
            <Typography.Text
              type="danger"
              style={{ fontSize: 11, display: "block", marginTop: 2 }}
            >
              Type is missing for this project
            </Typography.Text>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProjectTemplatesHeader;
