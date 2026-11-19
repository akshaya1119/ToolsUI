import React, { useEffect, useState } from "react";
import { Card, Select, Typography, Tag, Button } from "antd";
import { useTranslation } from "react-i18next";
import API from "./../hooks/api";
import useStore from "./../stores/ProjectData";
import { CopyFilled, LockFilled, UndoOutlined, DeleteOutlined } from "@ant-design/icons";
import { iconStyle, PRIMARY_COLOR } from "../ProjectConfig/components/constants";

const { Text } = Typography;
const { Option } = Select;

const DuplicateTool = ({ isEnabled, duplicateConfig = {}, setDuplicateConfig, onReset, onClear, importedSnapshot }) => {
  const { t } = useTranslation();
  const projectId = useStore((state) => state.projectId);
  const [fields, setFields] = useState([]);

  const isDirty = (current, snapshotVal) => {
    if (!importedSnapshot || importedSnapshot === "pending") return false;
    return JSON.stringify(current) !== JSON.stringify(snapshotVal);
  };
  const DIRTY_STYLE = { borderLeft: "3px solid #faad14", paddingLeft: 6, borderRadius: 2 };

  useEffect(() => {
    if (!projectId) return;
    API.get(`/Fields`)
      .then((res) => setFields(res.data || []))
      .catch((err) => console.error("Failed to fetch fields", err));
  }, [projectId]);

  const enabled = isEnabled("Duplicate Tool");

  const handleFieldChange = (value) => {
    setDuplicateConfig((prev) => ({ ...prev, duplicateCriteria: value }));
  };

  return (
    <Card
      title={
        <div>
          <span>
            <CopyFilled style={iconStyle} /> {t('projectConfig.duplicateTool', 'Duplicate Tool')}
          </span>
          <br />
          <Text type="secondary">
            {t('projectConfig.duplicateToolSubtitle', 'Define conditions that trigger creation of new boxes')}
          </Text>
        </div>
      }
      extra={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {enabled && (
            <>
              <Button
                type="text"
                size="small"
                icon={<UndoOutlined />}
                onClick={onReset}
                style={{ color: PRIMARY_COLOR }}
              >
                {t('common.actions.reset', 'Reset')}
              </Button>
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                onClick={onClear}
                style={{ color: "#ff4d4f" }}
              >
                {t('common.actions.clear', 'Clear')}
              </Button>
            </>
          )}
          {!enabled && (
            <Tag icon={<LockFilled style={{ color: PRIMARY_COLOR }} />}>{t('projectConfig.disabledTag', 'Disabled')}</Tag>
          )}
        </div>
      }
      bordered
      style={{ marginTop: 16, marginBottom: 16, boxShadow: "0 4px 8px rgba(0,0,0,0.1)" }}
    >
      <div style={isDirty(duplicateConfig?.duplicateCriteria, importedSnapshot?.duplicateConfig?.duplicateCriteria) ? DIRTY_STYLE : {}}>
        <Text strong>{t('projectConfig.selectFieldsToConcatenate', 'Select fields to concatenate')}</Text>
        <Select
          mode="multiple"
          allowClear
          showSearch
          disabled={!enabled}
          style={{ width: "100%", marginTop: 4 }}
          placeholder={t('projectConfig.selectOneOrMoreFields', 'Select one or more fields')}
          value={duplicateConfig?.duplicateCriteria || []}
          onChange={handleFieldChange}
          optionFilterProp="children"
        >
          {fields.map((f) => (
            <Option key={f.fieldId} value={f.fieldId}>
              {f.name}
            </Option>
          ))}
        </Select>
      </div>
    </Card>
  );
};

export default DuplicateTool;
