import React, { useState, useEffect } from 'react';
import { Table, Button, Input, Select, Switch, Space, Modal, Form, Card, Tag, Typography, message } from 'antd';
import { PlusOutlined, EditOutlined, ReloadOutlined, SearchOutlined, TranslationOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import axios from 'axios';
import usePermissionsStore from '../stores/UserPermissions';
import { loadDynamicTranslations } from '../i18n';

const { Title, Text } = Typography;
const { Option } = Select;

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const MessageManagement = () => {
  const { t, i18n } = useTranslation();
  const hasPermission = usePermissionsStore((state) => state.hasPermission);

  const canCreate = hasPermission('MESSAGE_MANAGEMENT', 'Create');
  const canEdit = hasPermission('MESSAGE_MANAGEMENT', 'Edit');

  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [search, setSearch] = useState('');
  const [moduleFilter, setModuleFilter] = useState('');
  const [missingHindiOnly, setMissingHindiOnly] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = async (currentPage = page, currentPageSize = pageSize) => {
    setLoading(true);
    try {
      const params = {
        pageNumber: currentPage,
        pageSize: currentPageSize,
        module: moduleFilter || undefined,
        search: search || undefined,
        missingHindiOnly: missingHindiOnly ? true : undefined
      };
      const res = await axios.get(`${API_BASE_URL}/MessageManagement`, { params });
      setMessages(res.data.items || []);
      setTotal(res.data.totalCount || 0);
    } catch (err) {
      console.error(err);
      message.error(t('common.feedback.error', 'Failed to load messages'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMessages(1, pageSize);
    setPage(1);
  }, [moduleFilter, missingHindiOnly]);

  const handleSearch = () => {
    fetchMessages(1, pageSize);
    setPage(1);
  };

  const handleOpenAdd = () => {
    setEditingRecord(null);
    form.resetFields();
    form.setFieldsValue({ module: 'Common', isActive: true });
    setModalVisible(true);
  };

  const handleOpenEdit = (record) => {
    setEditingRecord(record);
    form.resetFields();
    form.setFieldsValue({
      messageKey: record.messageKey,
      module: record.module,
      description: record.description,
      englishText: record.englishText,
      hindiText: record.hindiText,
      isActive: record.isActive
    });
    setModalVisible(true);
  };

  const handleToggleStatus = async (record, checked) => {
    try {
      await axios.patch(`${API_BASE_URL}/MessageManagement/${record.id}/status`, { isActive: checked });
      message.success(t('common.feedback.success', 'Status updated successfully'));
      await loadDynamicTranslations(i18n.language);
      fetchMessages(page, pageSize);
    } catch (err) {
      console.error(err);
      message.error(t('common.feedback.error', 'Failed to update status'));
    }
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      if (editingRecord) {
        await axios.put(`${API_BASE_URL}/MessageManagement/${editingRecord.id}`, {
          description: values.description,
          englishText: values.englishText,
          hindiText: values.hindiText,
          isActive: values.isActive
        });
        message.success(t('messages.saveSuccess', 'Message updated successfully'));
      } else {
        await axios.post(`${API_BASE_URL}/MessageManagement`, {
          messageKey: values.messageKey,
          module: values.module,
          description: values.description,
          englishText: values.englishText,
          hindiText: values.hindiText
        });
        message.success(t('messages.saveSuccess', 'Message created successfully'));
      }

      setModalVisible(false);
      await loadDynamicTranslations(i18n.language);
      fetchMessages(page, pageSize);
    } catch (err) {
      console.error(err);
      message.error(err.response?.data?.message || t('messages.saveError', 'Failed to save message'));
    } finally {
      setSubmitting(false);
    }
  };

  const columns = [
    {
      title: t('messages.messageKey', 'Message Key'),
      dataIndex: 'messageKey',
      key: 'messageKey',
      width: 220,
      render: (text) => <Text code strong>{text}</Text>
    },
    {
      title: t('messages.module', 'Module'),
      dataIndex: 'module',
      key: 'module',
      width: 130,
      render: (mod) => <Tag color="blue">{mod}</Tag>
    },
    {
      title: t('messages.englishText', 'English Text'),
      dataIndex: 'englishText',
      key: 'englishText',
      ellipsis: true
    },
    {
      title: t('messages.hindiText', 'Hindi Text'),
      dataIndex: 'hindiText',
      key: 'hindiText',
      ellipsis: true,
      render: (text) => text ? <span>{text}</span> : <Tag color="warning">Missing</Tag>
    },
    {
      title: t('common.status.status', 'Status'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 90,
      render: (isActive, record) => (
        <Switch
          checked={isActive}
          disabled={!canEdit}
          onChange={(checked) => handleToggleStatus(record, checked)}
          size="small"
        />
      )
    },
    {
      title: t('common.actions.actions', 'Actions'),
      key: 'actions',
      width: 90,
      render: (_, record) => (
        <Button
          type="text"
          icon={<EditOutlined />}
          disabled={!canEdit}
          onClick={() => handleOpenEdit(record)}
        />
      )
    }
  ];

  return (
    <div style={{ padding: '20px' }}>
      <Card
        title={
          <Space>
            <TranslationOutlined style={{ fontSize: 20, color: '#1890ff' }} />
            <div>
              <Title level={4} style={{ margin: 0 }}>{t('messages.title', 'Message Management')}</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>{t('messages.subtitle', 'Centralized Multilingual Text & Notification Management')}</Text>
            </div>
          </Space>
        }
        extra={
          canCreate && (
            <Button type="primary" icon={<PlusOutlined />} onClick={handleOpenAdd}>
              {t('messages.addMessage', 'Add New Message')}
            </Button>
          )
        }
      >
        <Space wrap style={{ marginBottom: 16, width: '100%', justifyContent: 'space-between' }}>
          <Space wrap>
            <Input
              placeholder={t('messages.searchPlaceholder', 'Search by key, English or Hindi text...')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={handleSearch}
              style={{ width: 280 }}
              allowClear
            />
            <Button icon={<SearchOutlined />} onClick={handleSearch}>
              {t('common.actions.search', 'Search')}
            </Button>
            <Select
              value={moduleFilter}
              onChange={setModuleFilter}
              style={{ width: 160 }}
            >
              <Option value="">{t('messages.allModules', 'All Modules')}</Option>
              <Option value="Common">Common</Option>
              <Option value="Navigation">Navigation</Option>
              <Option value="ProjectConfig">ProjectConfig</Option>
              <Option value="DataImport">DataImport</Option>
              <Option value="Processing">Processing</Option>
              <Option value="Reports">Reports</Option>
              <Option value="MasterConfig">MasterConfig</Option>
            </Select>
            <Space>
              <Switch
                checked={missingHindiOnly}
                onChange={setMissingHindiOnly}
              />
              <Text>{t('messages.missingHindiOnly', 'Missing Hindi Only')}</Text>
            </Space>
          </Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchMessages(page, pageSize)}>
            {t('common.actions.refresh', 'Refresh')}
          </Button>
        </Space>

        <Table
          columns={columns}
          dataSource={messages}
          rowKey="id"
          loading={loading}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
              fetchMessages(p, ps);
            }
          }}
        />
      </Card>

      <Modal
        title={editingRecord ? t('messages.editMessage', 'Edit Message') : t('messages.addMessage', 'Add New Message')}
        open={modalVisible}
        onOk={handleSubmit}
        confirmLoading={submitting}
        onCancel={() => setModalVisible(false)}
        width={600}
        okText={t('common.actions.save', 'Save')}
        cancelText={t('common.actions.cancel', 'Cancel')}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="messageKey"
            label={t('messages.messageKey', 'Message Key')}
            rules={[{ required: true, message: 'Message Key is required' }]}
          >
            <Input disabled={!!editingRecord} placeholder="e.g. common.actions.submit" />
          </Form.Item>

          <Form.Item
            name="module"
            label={t('messages.module', 'Module')}
            rules={[{ required: true, message: 'Module is required' }]}
          >
            <Select disabled={!!editingRecord}>
              <Option value="Common">Common</Option>
              <Option value="Navigation">Navigation</Option>
              <Option value="ProjectConfig">ProjectConfig</Option>
              <Option value="DataImport">DataImport</Option>
              <Option value="Processing">Processing</Option>
              <Option value="Reports">Reports</Option>
              <Option value="MasterConfig">MasterConfig</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="englishText"
            label={t('messages.englishText', 'English Text')}
            rules={[{ required: true, message: 'English Text is required' }]}
          >
            <Input.TextArea rows={3} placeholder="Standard English translation" />
          </Form.Item>

          <Form.Item
            name="hindiText"
            label={t('messages.hindiText', 'Hindi Text')}
          >
            <Input.TextArea rows={3} placeholder="हिंदी अनुवाद (वैकल्पिक)" />
          </Form.Item>

          <Form.Item
            name="description"
            label={t('messages.description', 'Description')}
          >
            <Input placeholder="Context or usage details" />
          </Form.Item>

          {editingRecord && (
            <Form.Item
              name="isActive"
              label={t('common.status.status', 'Status')}
              valuePropName="checked"
            >
              <Switch checkedChildren={t('common.status.active', 'Active')} unCheckedChildren={t('common.status.inactive', 'Inactive')} />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </div>
  );
};

export default MessageManagement;
