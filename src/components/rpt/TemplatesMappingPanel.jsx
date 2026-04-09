import React from "react";
import { Button, Card, InputNumber, Select, Space, Switch, Table, Typography } from "antd";
import { CloseOutlined, DeleteOutlined, PlusOutlined } from "@ant-design/icons";

// Strip table prefix (n., e., eb., b., x.) from a saved value for display
const stripPrefix = (value) => {
  if (!value) return value;
  return String(value).replace(/^(eb\.|n\.|e\.|b\.|x\.)/, "");
};

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
  orderBySelections,
  setOrderBySelections,
  labelCopies,
  setLabelCopies,
  showDuplicateToggle = false,
  duplicateLabelsEnabled = true,
  onDuplicateLabelsChange,
  handleSaveMapping,
  mappingLoading,
  closeMappingPanel,
}) => {
  if (!showMappingPanel) return null;

  const safeOrderBy = Array.isArray(orderBySelections) ? orderBySelections : [];

  const addOrderBy = () => {
    setOrderBySelections((prev) => [...(Array.isArray(prev) ? prev : []), { column: undefined, direction: "ASC" }]);
  };

  const removeOrderBy = (index) => {
    setOrderBySelections((prev) => (Array.isArray(prev) ? prev : []).filter((_, i) => i !== index));
  };

  const updateOrderBy = (index, field, value) => {
    setOrderBySelections((prev) =>
      (Array.isArray(prev) ? prev : []).map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // labelRender: always show clean name without prefix, even for saved values not in current options
  const labelRender = (props) => {
    const label = props.label || stripPrefix(props.value);
    return <span>{label}</span>;
  };

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
              <Switch checked={duplicateLabelsEnabled} onChange={onDuplicateLabelsChange} />
            </Space>
          </Card>
        )}

        <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Space style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <Typography.Text strong>Field Mapping</Typography.Text>
            <Space size={8}>
              <Typography.Text type="secondary" style={{ fontSize: 12 }}>Label Copies:</Typography.Text>
              <InputNumber
                min={1}
                max={20}
                value={labelCopies ?? 1}
                onChange={(val) => setLabelCopies && setLabelCopies(Number.isFinite(val) && val >= 1 ? Math.round(val) : 1)}
                style={{ width: 60 }}
                size="small"
              />
              <Button
                type="primary"
                onClick={handleSaveMapping}
                loading={mappingLoading}
                disabled={!mappingTemplate?.templateId}
              >
                Save Mapping
              </Button>
            </Space>
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
                      labelRender={labelRender}
                      style={{ width: "100%" }}
                      filterOption={(input, option) =>
                        (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
                      }
                      onChange={(value) =>
                        setMappingSelections((prev) => ({ ...prev, [record.field]: value }))
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

        <Card size="small" style={{ marginBottom: 12 }} bodyStyle={{ padding: 12 }}>
          <Typography.Text strong>Group By</Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block" }}>
            Select one or more columns to group the report output.
          </Typography.Text>
          <Select
            mode="multiple"
            allowClear
            placeholder="Choose group by columns"
            options={sourceOptionGroups}
            labelRender={labelRender}
            value={groupBySelections}
            onChange={(values) => setGroupBySelections(values)}
            style={{ width: "100%", marginTop: 8 }}
            filterOption={(input, option) =>
              (option?.label ?? "").toString().toLowerCase().includes(input.toLowerCase())
            }
          />
        </Card>

        <div style={{ marginTop: 12 }} />
      </div>
    </Card>
  );
};

export default TemplatesMappingPanel;
