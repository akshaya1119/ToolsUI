import { useState, useEffect } from 'react';
import { Card, Select, Button, Space, message, Row, Col, Typography } from 'antd';
import {
  DownloadOutlined,
  EyeOutlined,
  FileTextOutlined,
  ReloadOutlined,
  AppstoreOutlined,
  FormOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import useStore from '../stores/ProjectData';
import { getModules, getTemplates, downloadReport } from '../services/reportApi';

const { Option } = Select;
const { Text } = Typography;

const RPTReports = () => {
  const projectName = useStore((s) => s.projectName);
  const projectId = Number(useStore((s) => s.projectId));
  const groupId = localStorage.getItem('selectedGroup');
  const typeId = localStorage.getItem('selectedType');
  
  const [modules, setModules] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [selectedModule, setSelectedModule] = useState();
  const [selectedTemplate, setSelectedTemplate] = useState();
  const [reportType, setReportType] = useState('pdf');

  const [loadingModules, setLoadingModules] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const isValid = !!(selectedModule && selectedTemplate);

  useEffect(() => {
    fetchModules();
  }, []);

 useEffect(() => {
  console.log(typeId,groupId)
  if (typeId && groupId) {
    fetchTemplates();
  } else {
    setTemplates([]);
    setSelectedTemplate(undefined);
  }
}, [typeId, groupId, projectId]); // watch only the necessary values

  const fetchModules = async () => {
    setLoadingModules(true);
    try {
      const data = await getModules();
      setModules(data || []);
    } catch {
      message.error('Failed to load modules');
    } finally {
      setLoadingModules(false);
    }
  };
const fetchTemplates = async () => {
  if (!typeId || !groupId) return;

  setLoadingTemplates(true);
  try {
    console.log("Fetching templates with:", { typeId, groupId, projectId });

    const data = await getTemplates(typeId, groupId, projectId);
    setTemplates(data || []);
  } catch (error) {
    console.error("Error fetching templates:", error);
    message.error("Failed to load templates");
  } finally {
    setLoadingTemplates(false);
  }
};
const handleReset = () => {
    setSelectedModule(undefined);
    setSelectedTemplate(undefined);
    setTemplates([]);
    setReportType('pdf');
    message.success('Selection cleared');
  };

  const handlePreview = async () => {
    if (!isValid) return message.warning('Select module & template');

    await previewReport({
      projectId,
      templateId: selectedTemplate,
      reportType
    });
  };

  const handleDownload = async () => {
    if (!isValid) return message.warning('Select module & template');

    await downloadReport({
      templateId: selectedTemplate
    });
  };

  const handleGenerate = async () => {
    if (!isValid) return message.warning('Select module & template');

    message.success('Report generated successfully (hook API here)');
  };

  return (
    <div style={{ padding: 30, background: '#f5f7fa', minHeight: '100vh' }}>
      <Card
        style={{ maxWidth: 900, margin: 'auto', borderRadius: 12 }}
      >
        {/* HEADER */}
        <div style={{ marginBottom: 25 }}>
          <Space>
            <FileTextOutlined style={{ fontSize: 26, color: '#1677ff' }} />
            <div>
              <div style={{ fontSize: 20, fontWeight: 600 }}>
                RPT Report Generator
              </div>
              <Text type="secondary">
                {projectName}
              </Text>
            </div>
          </Space>
        </div>

        {/* FORM */}
        <Row gutter={[16, 16]}>

          {/* MODULE */}
          <Col xs={24} md={12}>
            <Text strong>
              <AppstoreOutlined /> Module
            </Text>
            <Select
              allowClear
              value={selectedModule}
              onChange={setSelectedModule}
              loading={loadingModules}
              placeholder="Select Module"
              style={{ width: '100%' }}
              size="large"
            >
              {modules.map(m => (
                <Option key={m.id} value={m.id}>
                  {m.name}
                </Option>
              ))}
            </Select>
          </Col>

          {/* TEMPLATE */}
          <Col xs={24} md={12}>
            <Text strong>
              <FormOutlined /> Template
            </Text>
            <Select
              allowClear
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              loading={loadingTemplates}
              disabled={!selectedModule}
              placeholder="Select Template"
              style={{ width: '100%' }}
              size="large"
            >
              {templates.map(t => (
                <Option key={t.templateId} value={t.templateId}>
                  {t.templateName}
                </Option>
              ))}
            </Select>
          </Col>

          {/* FORMAT */}
          {/* <Col xs={24} md={12}>
            <Text strong>Format</Text>
            <Select
              value={reportType}
              onChange={setReportType}
              style={{ width: '100%' }}
              size="large"
            >
              <Option value="pdf">PDF</Option>
              <Option value="excel">Excel</Option>
            </Select>
          </Col> */}

        </Row>

        {/* ACTIONS */}
        <div style={{ marginTop: 30, display: 'flex', justifyContent: 'space-between' }}>
          <Button icon={<ReloadOutlined />} onClick={handleReset}>
            Clear
          </Button>

          <Space>
            <Button
              icon={<EyeOutlined />}
              disabled={!isValid}
              onClick={handlePreview}
            >
              Preview
            </Button>

            <Button
              icon={<DownloadOutlined />}
              disabled={!isValid}
              onClick={handleDownload}
            >
              Download
            </Button>

            <Button
              type="primary"
              icon={<PlayCircleOutlined />}
              disabled={!isValid}
              onClick={handleGenerate}
            >
              Generate
            </Button>
          </Space>
        </div>

      </Card>
    </div>
  );
};

export default RPTReports;