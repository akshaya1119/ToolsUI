import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, Space, message, Select, Tooltip } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';
import useModulePermission from '../hooks/useModulePermission';

const { Option } = Select;

const ToolModule = () => {
    const { canView, canCreate, canEdit } = useModulePermission('MASTER_MODULES');
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
        if (canView) {
            fetchModules();
        }
    }, [canView]);

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
                    {canEdit ? (
                        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    ) : (
                        <Tooltip title="View-only access: Editing is disabled">
                            <span><Button type="link" icon={<EditOutlined />} disabled /></span>
                        </Tooltip>
                    )}
                </Space>
            ),
        },
    ];

    if (!canView) {
        return (
            <div style={{ padding: 24, background: '#fff', borderRadius: 8, border: '1px solid #ffd591' }}>
                <p style={{ color: '#d46b08', margin: 0, fontWeight: 500 }}>
                    Access Denied: You do not have permission to view Tools Module Master.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {canCreate ? (
                    <Button type="primary" onClick={handleAdd}>
                        Add Module
                    </Button>
                ) : (
                    <Tooltip title="View-only access: Creating new items is disabled">
                        <span>
                            <Button type="primary" disabled>
                                Add Module
                            </Button>
                        </span>
                    </Tooltip>
                )}
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
                okButtonProps={{ disabled: editingItem ? !canEdit : !canCreate }}
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