import React from "react";
import { Button, Card, Select, Space, Switch, Table, Typography } from "antd";
import { CloseOutlined } from "@ant-design/icons";

const TemplatesMappingPanel = ({
  showMappingPanel,
  mappingTemplate,
  mappingNotFound,
  mappingOptionsLoading,
  parsedFields,
  mappingRows,
  sourceOptionGroups,
  mappingSelections,
  setMappingSelections,
  mappedFieldNames,
  groupBySelections,
  setGroupBySelections,
  showDuplicateToggle = false,
  duplicateLabelsEnabled = true,
  onDuplicateLabelsChange,
  handleSaveMapping,
  mappingLoading,
  closeMappingPanel,
}) => {
  if (!showMappingPanel) return null;

  return (
    <Card
      style={{ borderRadius: 8 }}
      bodyStyle={{ padding: 0 }}
      headStyle={{ padding: "6px 12px" }}
      className="rpt-mapping-card"
      title={
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography.Text strong style={{ fontSize: 13, lineHeight: "16px" }}>
            Template Mapping ({mappingTemplate?.templateName || "Selected template"})
          </Typography.Text>
          <Button size="small" icon={<CloseOutlined />} onClick={closeMappingPanel} />
        </div>
      }
    >
      <div className="rpt-mapping-card-body">
        {mappingNotFound && (
          <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
            No saved mapping found for this template yet.
          </Typography.Text>
        )}

        {showDuplicateToggle && (
          <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
            <Space style={{ display: "flex", justifyContent: "space-between" }}>
              <div>
                <Typography.Text strong>Duplicate box labels</Typography.Text>
                <Typography.Text type="secondary" style={{ display: "block" }}>
                  Generates two identical labels for each box.
                </Typography.Text>
              </div>
              <Switch
                checked={duplicateLabelsEnabled}
                onChange={onDuplicateLabelsChange}
              />
            </Space>
          </Card>
        )}

        <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text strong>Field Mapping</Typography.Text>
            <Button
              type="primary"
              onClick={handleSaveMapping}
              loading={mappingLoading}
              disabled={!mappingTemplate?.templateId}
            >
              Save Mapping
            </Button>
          </Space>
          {mappingOptionsLoading ? (
            <Typography.Text type="secondary">Loading available columns...</Typography.Text>
          ) : parsedFields.length === 0 ? (
            <Typography.Text type="secondary">
              No parsed fields to map for this template.
            </Typography.Text>
          ) : (
            <Table
              dataSource={mappingRows}
              pagination={false}
              size="small"
              scroll={{ y: 260 }}
              columns={[
                {
                  title: "RPT Field",
                  dataIndex: "field",
                  key: "field",
                  width: "45%",
                  render: (value) => <Typography.Text>{value}</Typography.Text>,
                },
                {
                  title: "Map To Column",
                  dataIndex: "mapTo",
                  key: "mapTo",
                  render: (_, record) => (
                    <Select
                      showSearch
                      allowClear
                      placeholder="Select source column"
                      value={mappingSelections[record.field]}
                      options={sourceOptionGroups}
                      style={{ width: "100%" }}
                      filterOption={(input, option) =>
                        (option?.label ?? "")
                          .toString()
                          .toLowerCase()
                          .includes(input.toLowerCase())
                      }
                      onChange={(value) =>
                        setMappingSelections((prev) => ({
                          ...prev,
                          [record.field]: value,
                        }))
                      }
                    />
                  ),
                },
              ]}
            />
          )}
        </Card>
        <div style={{ marginBottom: 12 }}>
          <Typography.Text strong>Mapped Fields:</Typography.Text>
          <Typography.Text
            type="secondary"
            style={{ display: "block", marginTop: 4, lineHeight: "1.4em" }}
          >
            {mappedFieldNames.length > 0 ? mappedFieldNames.join(", ") : "None"}
          </Typography.Text>
        </div>
        <Card size="small" bodyStyle={{ padding: 12 }}>
          <Typography.Text strong>Group By</Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block" }}>
            Select one or more columns to group the report output.
          </Typography.Text>
          <Select
            mode="multiple"
            allowClear
            placeholder="Choose group by columns"
            options={sourceOptionGroups}
            value={groupBySelections}
            onChange={(values) => setGroupBySelections(values)}
            style={{ width: "100%", marginTop: 8 }}
            filterOption={(input, option) =>
              (option?.label ?? "")
                .toString()
                .toLowerCase()
                .includes(input.toLowerCase())
            }
          />
        </Card>
        <div style={{ marginTop: 12 }} />
      </div>
    </Card>
  );
};

export default TemplatesMappingPanel;
