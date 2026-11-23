import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, InputNumber, Space, message } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';

const EnvelopeType = () => {
  const [envelopes, setEnvelopes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [envelopeName, setEnvelopeName] = useState('');
  const [capacity, setCapacity] = useState('');

  const fetchEnvelopes = async () => {
    setLoading(true);
    try {
      const res = await API.get('/EnvelopeTypes');
      setEnvelopes(res.data);
    } catch {
      message.error('Failed to fetch envelope types');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnvelopes();
  }, []);

  const handleAdd = () => {
    setEditingItem(null);
    setEnvelopeName('');
    setCapacity('');
    setModalVisible(true);
  };

  const handleEdit = (record) => {
    setEditingItem(record);
    setEnvelopeName(record.envelopeName);
    setCapacity(record.capacity);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!envelopeName || capacity === '') {
      message.warning('Please fill all fields');
      return;
    }

    // Check for duplicates
    const isDuplicate = envelopes.some(item =>
      item.envelopeName.toLowerCase() === envelopeName.toLowerCase() &&
      (!editingItem || item.envelopeId !== editingItem.envelopeId)
    );

    if (isDuplicate) {
      message.warning('This envelope name already exists');
      return;
    }
    if(!(capacity>0)){
      message.error('Capacity should be greater than 0')
    }

    const payload = {
      envelopeId: editingItem ? editingItem.envelopeId : 0,
      envelopeName,
      capacity: parseInt(capacity)
    };

    try {
      if (editingItem) {
        await API.put(
          `/EnvelopeTypes/${editingItem.envelopeId}`,
          payload
        );
        message.success('Updated successfully');
      } else {
        await API.post('/EnvelopeTypes', payload);
        message.success('Added successfully');
      }

      setModalVisible(false);
      fetchEnvelopes();
    } catch {
      message.error('Save failed');
    }
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }}>
        <Input
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0]}
          onChange={(e) => setSelectedKeys(e.target.value ? [e.target.value] : [])}
          onPressEnter={() => confirm()}
          style={{ marginBottom: 8, display: 'block' }}
        />
        <Space>
          <Button
            type="primary"
            onClick={() => confirm()}
            icon={<SearchOutlined />}
            size="small"
            style={{ width: 90 }}
          >
            Search
          </Button>
          <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1890ff' : undefined }} />
    ),
    onFilter: (value, record) =>
      record[dataIndex] ? record[dataIndex].toString().toLowerCase().includes(value.toLowerCase()) : '',
  });

  const columns = [
    {
      title: 'Envelope Name',
      dataIndex: 'envelopeName',
      key: 'envelopeName',
      sorter: (a, b) => a.envelopeName.localeCompare(b.envelopeName),
      ...getColumnSearchProps('envelopeName'),
    },
    {
      title: 'Capacity',
      dataIndex: 'capacity',
      key: 'capacity',
      sorter: (a, b) => a.capacity - b.capacity,
      ...getColumnSearchProps('capacity'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
        </Space>
      )
    }
  ];

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
        <Button type="primary" onClick={handleAdd} style={{ marginBottom: 16 }}>
          Add
        </Button>
      </div>

      <Table
        dataSource={envelopes}
        columns={columns}
        rowKey="envelopeId"
        loading={loading}
      />
      <Modal
        title={editingItem ? 'Edit Envelope Type' : 'Add Envelope Type'}
        open={modalVisible}
        onOk={handleSave}
        onCancel={() => setModalVisible(false)}
        okText="Save"
      >

        <Input
          placeholder="Envelope name"
          value={envelopeName}
          onChange={(e) => setEnvelopeName(e.target.value)}
        />
        <InputNumber
          placeholder="Capacity"
          value={capacity}
          min={1} // ✅ prevents entering negative or zero values
          onChange={(value) => {
            if (value && value >= 1) {
              setCapacity(value);
            } else {
              setCapacity(null); // or 1 as fallback
            }
          }}
          style={{ width: '100%' }}
        />
      </Modal>
    </div>
  );
};

export default EnvelopeType;
