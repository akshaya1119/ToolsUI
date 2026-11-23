import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, Space, Switch, message } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';

const Field = () => {
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [name, setName] = useState('');
    const [isUnique, setIsUnique] = useState(false);

    const fetchFields = async () => {
        setLoading(true);
        try {
            const res = await API.get('/Fields');
            setFields(res.data);
        } catch (err) {
            message.error('Failed to fetch fields');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFields();
    }, []);

    const handleAdd = () => {9+
        setEditingItem(null); 
        setName('');
        setIsUnique(false);
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        setName(record.name);
        setIsUnique(record.isUnique);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name) {
            message.warning('Name is required');
            return;
        }

        // Check for duplicates
        const isDuplicate = fields.some(item => 
            item.name.toLowerCase() === name.toLowerCase() && 
            (!editingItem || item.fieldId !== editingItem.fieldId)
        );

        if (isDuplicate) {
            message.warning('This field name already exists');
            return;
        }

        try {
            if (editingItem) {
                await API.put(`/Fields/${editingItem.fieldId}`, {
                    fieldId: editingItem.fieldId,
                    name,
                    isUnique,
                });
                message.success('Updated successfully');
            } else {
                await API.post('/Fields', {
                    fieldId: 0, // or omit if backend generates it
                    name,
                    isUnique,
                });
                message.success('Added successfully');
            }

            setModalVisible(false);
            fetchFields();
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
            title: 'Name',
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            ...getColumnSearchProps('name'),
        },
        {
            title: 'Is Unique',
            dataIndex: 'isUnique',
            key: 'isUnique',
            render: (value) => (value ? 'Yes' : 'No'),
            sorter: (a, b) => a.isUnique - b.isUnique,
            filters: [
                { text: 'Yes', value: true },
                { text: 'No', value: false },
            ],
            onFilter: (value, record) => record.isUnique === value,
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                </Space>
            ),
        },
    ];

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                <Button type="primary" onClick={handleAdd}>
                    Add
                </Button>
            </div>
            <Table
                dataSource={fields}
                columns={columns}
                rowKey="fieldId"
                loading={loading}
            />
            <Modal
                title={editingItem ? 'Edit Field' : 'Add Field'}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                okText="Save"
            >
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter name"
                    style={{ marginBottom: 16 }}
                />
                <div>
                    <span style={{ marginRight: 8 }}>Is Unique:</span>
                    <Switch checked={isUnique} onChange={setIsUnique} />
                </div>
            </Modal>
        </div>
    );
};

export default Field;
