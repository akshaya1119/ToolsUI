import React from "react";
import { Button, Form, Input, Select, Space, Upload } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useTranslation } from "react-i18next";

const TemplateAddForm = ({
  form,
  moduleOptions = [],
  addFileList = [],
  setAddFileList,
  onCancel,
  onSubmit,
  submitting,
  children,
  moduleLabel,
  modulePlaceholder,
  moduleRules,
}) => {
  const { t } = useTranslation();
  const effectiveModuleLabel = moduleLabel || t("templates.modules", "Modules");
  const effectiveModulePlaceholder = modulePlaceholder || t("templates.selectModules", "Select modules");
  const effectiveModuleRules = moduleRules || [{ required: true, message: t("templates.selectAtLeastOneModule", "Select at least one module") }];

  return (
    <Form layout="vertical" form={form}>
      <Form.Item
        label={t("templates.templateName", "Template Name")}
        name="templateName"
        rules={[{ required: true, message: t("templates.templateNameRequired", "Template name is required") }]}
        required
      >
        <Input placeholder={t("templates.enterTemplateName", "Enter template name")} />
      </Form.Item>
      <Form.Item
        label={t("templates.subName", "Sub Name")}
        name="subName"
      >
        <Input placeholder={t("templates.enterSubName", "Enter template subname")} />
      </Form.Item>
      {children}
      <Form.Item 
        label={effectiveModuleLabel} 
        name="moduleIds" 
        rules={effectiveModuleRules}
        required
      >
        <Select
          mode="multiple"
          options={moduleOptions}
          placeholder={effectiveModulePlaceholder}
          showSearch
          optionFilterProp="label"
        />
      </Form.Item>
      <Form.Item label={t("templates.rptFile", "RPT File")} required>
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
          <p className="ant-upload-text">{t("templates.clickOrDrag", "Click or drag an RPT file to upload")}</p>
          <p className="ant-upload-hint">{t("templates.onlyRptSupported", "Only .rpt files are supported.")}</p>
        </Upload.Dragger>
      </Form.Item>
      <Space style={{ display: "flex", justifyContent: "flex-end" }}>
        <Button onClick={onCancel}>{t("templates.cancel", "Cancel")}</Button>
        <Button type="primary" onClick={onSubmit} loading={submitting}>
          {t("templates.uploadTemplate", "Upload Template")}
        </Button>
      </Space>
    </Form>
  );
};

export default TemplateAddForm;
