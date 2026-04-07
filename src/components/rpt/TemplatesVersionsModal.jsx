import React from "react";
import { Button, Card, Modal, Space, Table, Typography } from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";

const TemplatesVersionsModal = ({
  versionsOpen,
  versionsTemplate,
  closeVersionsModal,
  pendingGenerateTemplate,
  setPendingGenerateTemplate,
  runReportGeneration,
  versionsData,
  versionsColumns,
  versionsLoading,
}) => {
  return (
    <Modal
      title={`Template Versions${
        versionsTemplate?.templateName ? ` - ${versionsTemplate.templateName}` : ""
      }`}
      open={versionsOpen}
      onCancel={closeVersionsModal}
      footer={null}
      width={860}
    >
      <Space direction="vertical" size={8} style={{ width: "100%" }}>
        <Typography.Text type="secondary">
          Showing all saved versions for this template.
        </Typography.Text>
        {pendingGenerateTemplate && (
          <Card
            size="small"
            style={{ background: "#fff7e6", borderColor: "#ffd591" }}
            bodyStyle={{ padding: 12 }}
          >
            <Space align="start" style={{ display: "flex", justifyContent: "space-between" }}>
              <Space>
                <ExclamationCircleOutlined style={{ color: "#d46b08" }} />
                <Typography.Text>
                  You are using version v{pendingGenerateTemplate.version}. Output may
                  differ from the latest template.
                </Typography.Text>
              </Space>
              <Space>
                <Button size="small" onClick={() => setPendingGenerateTemplate(null)}>
                  Cancel
                </Button>
                <Button
                  size="small"
                  type="primary"
                  onClick={() => {
                    const target = pendingGenerateTemplate;
                    setPendingGenerateTemplate(null);
                    runReportGeneration(target);
                  }}
                >
                  Generate
                </Button>
              </Space>
            </Space>
          </Card>
        )}
        <Table
          rowKey="templateId"
          dataSource={versionsData}
          columns={versionsColumns}
          pagination={false}
          loading={versionsLoading}
          locale={{ emptyText: "No versions found." }}
        />
      </Space>
    </Modal>
  );
};

export default TemplatesVersionsModal;
