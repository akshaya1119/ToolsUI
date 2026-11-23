import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, Space, message, Select } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';

const { Option } = Select;

const ToolModule = () => {
    const [modules, setModules] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [name, setName] = useState('');
    const [dependencyIds, setDependencyIds] = useState([]); // now array

    const fetchModules = async () => {
        setLoading(true);
        try {
            const res = await API.get('/Modules');
            setModules(res.data);
        } catch (err) {
            message.error('Failed to fetch modules');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchModules();
    }, []);

    const handleAdd = () => {
        setEditingItem(null);
        setName('');
        setDependencyIds([]);
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        setName(record.name);
        setDependencyIds(record.parentModuleIds || []); // array
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!name) {
            message.warning('Name is required');
            return;
        }

        // Check for duplicates
        const isDuplicate = modules.some(item =>
            item.name.toLowerCase() === name.toLowerCase() &&
            (!editingItem || item.id !== editingItem.id)
        );

        if (isDuplicate) {
            message.warning('This module name already exists');
            return;
        }

        // Prevent self-dependency
        if (editingItem && dependencyIds.includes(editingItem.id)) {
            message.error("Module cannot depend on itself");
            return;
        }

        const payload = {
            id: editingItem ? editingItem.id : 0,
            name,
            parentModuleIds: dependencyIds // send array to backend
        };

        try {
            if (editingItem) {
                await API.put(`/Modules/${editingItem.id}`, payload);
                message.success('Updated successfully');
            } else {
                await API.post('/Modules', payload);
                message.success('Added successfully');
            }

            setModalVisible(false);
            fetchModules();
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
            title: 'Depends On',
            key: 'dependsOn',
            render: (_, record) => (
                <span>
                    {record.parentModuleNames?.length
                        ? record.parentModuleNames.join(', ')
                        : '—'}
                </span>
            ),
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
                    Add Module
                </Button>
            </div>
            <Table
                dataSource={modules}
                columns={columns}
                rowKey="id"
                loading={loading}
            />
            <Modal
                title={editingItem ? 'Edit Module' : 'Add Module'}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                okText="Save"
            >
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter module name"
                    style={{ marginBottom: 12 }}
                />
                <Select
                    mode="multiple" // 👈 allow multiple selection
                    placeholder="Select dependent modules (optional)"
                    value={dependencyIds}
                    onChange={(value) => setDependencyIds(value)}
                    allowClear
                    style={{ width: '100%' }}
                >
                    {modules
                        .filter(m => !editingItem || m.id !== editingItem.id) // prevent self-dependency
                        .map(module => (
                            <Option key={module.id} value={module.id}>
                                {module.name}
                            </Option>
                        ))}
                </Select>
            </Modal>
        </div>
    );
};

export default ToolModule;