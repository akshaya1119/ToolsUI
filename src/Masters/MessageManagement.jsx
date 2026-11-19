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

  // Column-specific search states
  const [columnFilters, setColumnFilters] = useState({
    messageKey: '',
    englishText: '',
    hindiText: ''
  });

  // Sorting state (backend sorting)
  const [sortField, setSortField] = useState('');
  const [sortOrder, setSortOrder] = useState('');

  const [modalVisible, setModalVisible] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const fetchMessages = async (
    currentPage = page,
    currentPageSize = pageSize,
    currentColFilters = columnFilters,
    currentSortField = sortField,
    currentSortOrder = sortOrder
  ) => {
    setLoading(true);
    try {
      const params = {
        pageNumber: currentPage,
        pageSize: currentPageSize,
        module: moduleFilter || undefined,
        search: search || undefined,
        missingHindiOnly: missingHindiOnly ? true : undefined,
        keySearch: currentColFilters.messageKey || undefined,
        englishSearch: currentColFilters.englishText || undefined,
        hindiSearch: currentColFilters.hindiText || undefined,
        sortBy: currentSortField || undefined,
        sortOrder: currentSortOrder || undefined
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

  const handleTableChange = (pagination, filters, sorter) => {
    const newPage = pagination.current;
    const newPageSize = pagination.pageSize;
    const newSortField = sorter.field || '';
    const newSortOrder = sorter.order || '';

    setPage(newPage);
    setPageSize(newPageSize);
    setSortField(newSortField);
    setSortOrder(newSortOrder);

    fetchMessages(newPage, newPageSize, columnFilters, newSortField, newSortOrder);
  };

  const getColumnSearchProps = (dataIndex, label) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={t('tables.searchColumn', { column: label, defaultValue: `Search ${label}` })}
          value={selectedKeys[0] !== undefined ? selectedKeys[0] : (columnFilters[dataIndex] || '')}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => {
            const val = selectedKeys[0] || '';
            const updated = { ...columnFilters, [dataIndex]: val };
            setColumnFilters(updated);
            confirm();
            setPage(1);
            fetchMessages(1, pageSize, updated, sortField, sortOrder);
          }}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => {
              const val = selectedKeys[0] || '';
              const updated = { ...columnFilters, [dataIndex]: val };
              setColumnFilters(updated);
              confirm();
              setPage(1);
              fetchMessages(1, pageSize, updated, sortField, sortOrder);
            }}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            {t('common.actions.search', 'Search')}
          </Button>
          <Button
            onClick={() => {
              clearFilters && clearFilters();
              setSelectedKeys([]);
              const updated = { ...columnFilters, [dataIndex]: '' };
              setColumnFilters(updated);
              confirm();
              setPage(1);
              fetchMessages(1, pageSize, updated, sortField, sortOrder);
            }}
            size="small"
            style={{ width: 90 }}
          >
            {t('common.actions.reset', 'Reset')}
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: columnFilters[dataIndex] || filtered ? '#1890ff' : undefined }} />
    ),
  });

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
      sorter: true,
      sortOrder: sortField === 'messageKey' ? sortOrder : false,
      ...getColumnSearchProps('messageKey', t('messages.messageKey', 'Message Key')),
      render: (text) => (
        <span style={{ wordBreak: 'break-all', display: 'inline-block' }}>
          <Text code strong>{text}</Text>
        </span>
      )
    },
    {
      title: t('common.labels.module', 'Module'),
      dataIndex: 'module',
      key: 'module',
      width: 130,
      sorter: true,
      sortOrder: sortField === 'module' ? sortOrder : false,
      render: (mod) => <Tag color="blue">{mod}</Tag>
    },
    {
      title: t('messages.englishText', 'English Text'),
      dataIndex: 'englishText',
      key: 'englishText',
      width: 370,
      sorter: true,
      sortOrder: sortField === 'englishText' ? sortOrder : false,
      ...getColumnSearchProps('englishText', t('messages.englishText', 'English Text')),
      render: (text) => (
        <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>
          {text}
        </div>
      )
    },
    {
      title: t('messages.hindiText', 'Hindi Text'),
      dataIndex: 'hindiText',
      key: 'hindiText',
      width: 370,
      sorter: true,
      sortOrder: sortField === 'hindiText' ? sortOrder : false,
      ...getColumnSearchProps('hindiText', t('messages.hindiText', 'Hindi Text')),
      render: (text) => text ? (
        <div style={{ wordBreak: 'break-word', whiteSpace: 'normal', overflowWrap: 'break-word' }}>
          {text}
        </div>
      ) : <Tag color="warning">Missing</Tag>
    },
    {
      title: t('common.labels.status', 'Status'),
      dataIndex: 'isActive',
      key: 'isActive',
      width: 100,
      sorter: true,
      sortOrder: sortField === 'isActive' ? sortOrder : false,
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
      title: t('common.labels.actions', 'Actions'),
      key: 'actions',
      width: 80,
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
          scroll={{ x: 1300 }}
          onChange={handleTableChange}
          pagination={{
            current: page,
            pageSize: pageSize,
            total: total,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (totalCount, range) => `${range[0]}-${range[1]} / ${totalCount}`
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
            label={t('common.labels.module', 'Module')}
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
              label={t('common.labels.status', 'Status')}
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
