import { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Select, Button, Space, message, Row, Col, Typography } from 'antd';
import { DownloadOutlined, EyeOutlined, FileTextOutlined, ReloadOutlined, TeamOutlined, FileOutlined, FormOutlined } from '@ant-design/icons';
import { downloadReport, previewReport } from './hooks/reportApi';

const { Option } = Select;
const { Text } = Typography;

const CrystalReports = () => {
  const url = import.meta.env.VITE_API_BASE_URL;

  const [groups, setGroup] = useState([]);
  const [types, setType] = useState([]);
  const [templates, setTemplates] = useState([]);

  const [selectedGroup, setSelectedGroup] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [loadingGroups, setLoadingGroups] = useState(false);
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  const [downloading, setDownloading] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    fetchGroup();
    fetchType();
  }, []);

  // 👇 fetch groups
  const fetchGroup = async () => {
    setLoadingGroups(true);
    try {
      const res = await axios.get(`${url}/Groups`);
      setGroup(res.data || []);
    } catch (err) {
      console.error("Failed to fetch groups", err);
    } finally {
      setLoadingGroups(false);
    }
  };

  // 👇 fetch paper types
  const fetchType = async () => {
    setLoadingTypes(true);
    try {
      const res = await axios.get(`${url}/PaperTypes`);
      setType(res.data || []);
    } catch (err) {
      console.error("Failed to fetch paper types", err);
    } finally {
      setLoadingTypes(false);
    }
  };

  // 👇 fetch templates (based on type)
  const fetchTemplates = async (typeId) => {
    setLoadingTemplates(true);
    try {
      const res = await axios.get(`${url}/Templates?typeId=${typeId}`);
      setTemplates(res.data || []);
    } catch (err) {
      console.error("Failed to fetch templates", err);
    } finally {
      setLoadingTemplates(false);
    }
  };

  // 👇 when type changes → load templates
  useEffect(() => {
    if (selectedType) {
      fetchTemplates(selectedType);
    } else {
      setTemplates([]);
      setSelectedTemplate(null);
    }
  }, [selectedType]);

  // 👇 download
  const handleDownload = async () => {
    if (!selectedGroup || !selectedType || !selectedTemplate) {
      message.warning("Please select all fields");
      return;
    }

    setDownloading(true);
    try {
      await downloadReport({
        groupId: selectedGroup,
        typeId: selectedType,
        templateId: selectedTemplate,
      });

      message.success("Downloaded successfully");
    } catch (err) {
      console.error(err);
      message.error("Download failed");
    } finally {
      setDownloading(false);
    }
  };

  // 👇 preview
  const handlePreview = async () => {
    if (!selectedGroup || !selectedType || !selectedTemplate) {
      message.warning("Please select all fields");
      return;
    }

    setPreviewing(true);
    try {
      await previewReport({
        groupId: selectedGroup,
        typeId: selectedType,
        templateId: selectedTemplate,
      });

      message.success("Preview opened");
    } catch (err) {
      console.error(err);
      message.error("Preview failed");
    } finally {
      setPreviewing(false);
    }
  };

  // Reset all selections
  const handleReset = () => {
    setSelectedGroup(null);
    setSelectedType(null);
    setSelectedTemplate(null);
    setTemplates([]);
    message.info('Selections cleared');
  };

  // Check if all fields are selected
  const isFormValid = selectedGroup && selectedType && selectedTemplate;

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: '#f5f7fa', 
      padding: '40px 20px',
      animation: 'fadeIn 0.5s ease-in'
    }}>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .report-select .ant-select-selector {
            border-radius: 8px !important;
            transition: all 0.3s ease !important;
          }
          .report-select:hover .ant-select-selector {
            border-color: #1677ff !important;
            box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.1) !important;
          }
          .report-btn {
            border-radius: 8px !important;
            height: 40px !important;
            font-weight: 500 !important;
            transition: all 0.3s ease !important;
          }
          .report-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
          }
        `}
      </style>

      <Card
        style={{
          maxWidth: 900,
          margin: '0 auto',
          borderRadius: 12,
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
          border: 'none'
        }}
      >
        {/* Header Section */}
        <div style={{ 
          marginBottom: 32, 
          paddingBottom: 20, 
          borderBottom: '1px solid #f0f0f0' 
        }}>
          <Space align="center">
            <FileTextOutlined style={{ 
              color: '#1677ff', 
              fontSize: 28,
              background: '#e6f4ff',
              padding: 10,
              borderRadius: 8
            }} />
            <div>
              <div style={{ fontSize: 22, fontWeight: 600, color: '#262626' }}>
                Crystal Reports
              </div>
              <Text type="secondary" style={{ fontSize: 14 }}>
                Generate and download custom reports
              </Text>
            </div>
          </Space>
        </div>

        {/* Form Fields */}
        <Row gutter={[24, 24]}>
          {/* Group Selection */}
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#262626' }}>
                <TeamOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                Select Group
              </Text>
            </div>
            <Select
              className="report-select"
              placeholder="Choose a group"
              loading={loadingGroups}
              value={selectedGroup}
              onChange={setSelectedGroup}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              size="large"
            >
              {groups.map(g => (
                <Option key={g.id} value={g.id}>
                  <TeamOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                  {g.name}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Paper Type Selection */}
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#262626' }}>
                <FileOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                Paper Type
              </Text>
            </div>
            <Select
              className="report-select"
              placeholder="Choose paper type"
              loading={loadingTypes}
              value={selectedType}
              onChange={setSelectedType}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              size="large"
            >
              {types.map(t => (
                <Option key={t.typeId} value={t.typeId}>
                  <FileOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                  {t.types}
                </Option>
              ))}
            </Select>
          </Col>

          {/* Template Selection */}
          <Col xs={24} md={12}>
            <div style={{ marginBottom: 8 }}>
              <Text strong style={{ fontSize: 14, color: '#262626' }}>
                <FormOutlined style={{ marginRight: 6, color: '#1677ff' }} />
                Template
              </Text>
            </div>
            <Select
              className="report-select"
              placeholder="Choose a template"
              loading={loadingTemplates}
              value={selectedTemplate}
              onChange={setSelectedTemplate}
              disabled={!selectedType}
              showSearch
              filterOption={(input, option) =>
                option.children.toLowerCase().includes(input.toLowerCase())
              }
              style={{ width: '100%' }}
              size="large"
            >
              {templates.map(t => (
                <Option key={t.id} value={t.id}>
                  <FormOutlined style={{ marginRight: 8, color: '#8c8c8c' }} />
                  {t.name}
                </Option>
              ))}
            </Select>
          </Col>
        </Row>

        {/* Action Buttons */}
        <div style={{ 
          marginTop: 32, 
          paddingTop: 24, 
          borderTop: '1px solid #f0f0f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 12
        }}>
          <Button
            className="report-btn"
            icon={<ReloadOutlined />}
            onClick={handleReset}
            disabled={!selectedGroup && !selectedType && !selectedTemplate}
          >
            Reset
          </Button>

          <Space>
            <Button
              className="report-btn"
              icon={<EyeOutlined />}
              onClick={handlePreview}
              loading={previewing}
              disabled={!isFormValid}
            >
              Preview
            </Button>

            <Button
              className="report-btn"
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              loading={downloading}
              disabled={!isFormValid}
            >
              Download
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  );
};

export default CrystalReports;
