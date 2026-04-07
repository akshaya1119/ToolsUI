import React from "react";
import { Button, Form, Input, Select, Space, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";

const TemplateAddForm = ({
  form,
  moduleOptions = [],
  addFileList = [],
  setAddFileList,
  onCancel,
  onSubmit,
  submitting,
  children,
  moduleLabel = "Modules",
  modulePlaceholder = "Select modules",
  moduleRules = [{ required: true, message: "Select at least one module" }],
}) => {
  return (
    <Form layout="vertical" form={form}>
      <Form.Item
        label="Template Name"
        name="templateName"
        rules={[{ required: true, message: "Template name is required" }]}
      >
        <Input placeholder="Enter template name" />
      </Form.Item>
      {children}
      <Form.Item label={moduleLabel} name="moduleIds" rules={moduleRules}>
        <Select
          mode="multiple"
          options={moduleOptions}
          placeholder={modulePlaceholder}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item label="RPT File">
        <Upload.Dragger
          accept=".rpt"
          multiple={false}
          beforeUpload={() => false}
          onChange={(info) => setAddFileList(info.fileList.slice(-1))}
          onRemove={() => setAddFileList([])}
          fileList={addFileList}
        >
          <p className="ant-upload-drag-icon">
            <InboxOutlined />
          </p>
          <p className="ant-upload-text">Click or drag an RPT file to upload</p>
          <p className="ant-upload-hint">Only .rpt files are supported.</p>
        </Upload.Dragger>
      </Form.Item>
      <Space style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="primary" onClick={onSubmit} loading={submitting}>
          Upload Template
        </Button>
      </Space>
    </Form>
  );
};

export default TemplateAddForm;
