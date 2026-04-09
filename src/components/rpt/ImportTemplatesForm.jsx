import React from "react";
import { Button, Form, Input, Select, Space, Switch, Typography } from "antd";

const ImportTemplatesForm = ({
  form,
  importScope,
  sourceScopeOptions,
  filteredGroupOptions,
  filteredProjectOptions,
  importAvailability,
  importGroupId,
  importProjectId,
  sourceTypeOptions,
  disableSourceTypeSelect,
  selectedImportProjectTypeLabel,
  importSubmitting,
  onCancel,
  onSubmit,
  showTargetProject = false,
  targetProjectLabel = "",
}) => {
  const showTypeSelect = importScope !== "project";
  const showMissingTypesMessage =
    showTypeSelect &&
    ((importScope === "standard" && sourceTypeOptions.length === 0) ||
      (importScope === "group" && importGroupId && sourceTypeOptions.length === 0)) &&
    !importAvailability.loading;

  const showProjectTypeMissing =
    importScope === "project" && importProjectId && !selectedImportProjectTypeLabel;

  return (
    <Form
      layout="vertical"
      form={form}
      initialValues={{ copyMappings: true }}
      preserve={false}
    >
      {showTargetProject && (
        <Form.Item label="Target Project" style={{ marginBottom: 8 }}>
          <Input value={targetProjectLabel} placeholder="Target Project" disabled />
        </Form.Item>
      )}

      <Form.Item
        label="Import From"
        name="sourceScope"
        rules={[
          {
            validator: (_, value) =>
              value ? Promise.resolve() : Promise.reject("Import source is required"),
          },
        ]}
        style={{ marginBottom: 8 }}
      >
        <Select
          options={sourceScopeOptions}
          placeholder="Select import source"
          showSearch
          optionFilterProp="label"
          allowClear
        />
      </Form.Item>

      <Form.Item shouldUpdate noStyle>
        {({ getFieldValue }) => {
          const scope = getFieldValue("sourceScope");
          if (scope === "group") {
            return (
              <Form.Item
                label="Source Group"
                name="sourceGroupId"
                rules={[
                  {
                    validator: (_, value) =>
                      value ? Promise.resolve() : Promise.reject("Source group is required"),
                  },
                ]}
                style={{ marginBottom: 8 }}
              >
                <Select
                  options={[
                    {
                      label: "Select source group",
                      value: "",
                      disabled: true,
                    },
                    ...filteredGroupOptions,
                  ]}
                  placeholder="Select source group"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  loading={importAvailability.loading}
                  notFoundContent={
                    importAvailability.loading
                      ? "Loading templates..."
                      : "No templates available for any group."
                  }
                />
              </Form.Item>
            );
          }
          if (scope === "project") {
            return (
              <Form.Item
                label="Source Project"
                name="sourceProjectId"
                rules={[
                  {
                    validator: (_, value) =>
                      value ? Promise.resolve() : Promise.reject("Source project is required"),
                  },
                ]}
                style={{ marginBottom: 8 }}
              >
                <Select
                  options={[
                    {
                      label: "Select source project",
                      value: "",
                      disabled: true,
                    },
                    ...filteredProjectOptions,
                  ]}
                  placeholder="Select source project"
                  showSearch
                  optionFilterProp="label"
                  allowClear
                  loading={importAvailability.loading}
                  notFoundContent={
                    importAvailability.loading
                      ? "Loading templates..."
                      : "No templates available for any project."
                  }
                />
              </Form.Item>
            );
          }
          return null;
        }}
      </Form.Item>

      {showTypeSelect ? (
        <>
          <Form.Item
            label="Source Type"
            name="sourceTypeId"
            rules={[
              {
                validator: (_, value) =>
                  value ? Promise.resolve() : Promise.reject("Source type is required"),
              },
            ]}
            style={{ marginBottom: 8 }}
          >
            <Select
              options={[
                { label: "Select source type", value: "", disabled: true },
                ...sourceTypeOptions,
              ]}
              placeholder="Select source type"
              showSearch
              optionFilterProp="label"
              allowClear
              disabled={disableSourceTypeSelect}
              loading={importAvailability.loading}
              notFoundContent={
                importAvailability.loading
                  ? "Loading templates..."
                  : "No templates available for this selection."
              }
            />
          </Form.Item>
          {showMissingTypesMessage && (
            <Typography.Text type="secondary" style={{ display: "block", marginBottom: 8 }}>
              No templates available for this selection.
            </Typography.Text>
          )}
        </>
      ) : (
        <Form.Item label="Source Type" style={{ marginBottom: 8 }}>
          <Input
            value={selectedImportProjectTypeLabel || "Project type"}
            disabled
          />
          {showProjectTypeMissing && (
            <Typography.Text type="secondary" style={{ display: "block", marginTop: 4 }}>
              Project type is missing for this source.
            </Typography.Text>
          )}
        </Form.Item>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <div>
          <Typography.Text strong>Copy mappings</Typography.Text>
          <Typography.Text type="secondary" style={{ display: "block" }}>
            If enabled, existing mappings are cloned as well.
          </Typography.Text>
        </div>
        <Form.Item
          name="copyMappings"
          valuePropName="checked"
          initialValue={true}
          style={{ marginBottom: 0 }}
        >
          <Switch />
        </Form.Item>
      </div>
      <Space style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" onClick={onSubmit} loading={importSubmitting}>
          Import Templates
        </Button>
      </Space>
    </Form>
  );
};

export default ImportTemplatesForm;
