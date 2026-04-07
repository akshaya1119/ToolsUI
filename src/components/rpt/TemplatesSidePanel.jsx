import React from "react";
import { Button, Card, Space, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";
import ImportTemplatesForm from "./ImportTemplatesForm";
import TemplateAddForm from "./TemplateAddForm";

const TemplatesSidePanel = ({
  addModalOpen,
  importModalOpen,
  onClose,
  addFormProps = {},
  importFormProps = {},
  addTitle = "Add Template",
  importTitle = "Import Templates",
}) => {
  const showAdd = Boolean(addModalOpen);
  const panelTitle = showAdd ? addTitle : importTitle;

  return (
    <Card
      style={{ borderRadius: 12 }}
      bodyStyle={{ padding: 0 }}
      className="rpt-side-panel"
      title={
        <Space style={{ display: "flex", justifyContent: "space-between" }}>
          <Typography.Text strong>{panelTitle}</Typography.Text>
          <Button size="small" icon={<CloseOutlined />} onClick={onClose} />
        </Space>
      }
    >
      <div className="rpt-side-panel-body">
        {showAdd ? (
          <TemplateAddForm {...addFormProps} onCancel={onClose} />
        ) : (
          <ImportTemplatesForm {...importFormProps} onCancel={onClose} />
        )}
      </div>
    </Card>
  );
};

export default TemplatesSidePanel;
