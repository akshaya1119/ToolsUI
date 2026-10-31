import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, Space, message, Tooltip } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';
import useModulePermission from '../hooks/useModulePermission';

const BoxCapacity = () => {
    const { canView, canCreate, canEdit } = useModulePermission('MASTER_BOX_CAPACITY');
    const [boxCapacities, setBoxCapacities] = useState([]);
    const [loading, setLoading] = useState(false);
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [capacity, setCapacity] = useState('');

    const fetchBoxCapacities = async () => {
        setLoading(true);
        try {
            const res = await API.get('/BoxCapacities');
            setBoxCapacities(res.data);
        } catch (err) {
            message.error('Failed to fetch box capacities');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (canView) {
            fetchBoxCapacities();
        }
    }, [canView]);

    const handleAdd = () => {
        setEditingItem(null);
        setCapacity('');
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        setCapacity(record.capacity);
        setModalVisible(true);
    };

    const handleSave = async () => {
        if (!capacity) {
            message.warning('Capacity is required');
            return;
        }

        // Check for duplicates
        const isDuplicate = boxCapacities.some(item => 
            item.capacity=== parseInt(capacity) && 
            (!editingItem || item.boxCapacityId !== editingItem.boxCapacityId)
        );

        if (isDuplicate) {
            message.warning('This capacity already exists');
            return;
        }

        try {
            if (editingItem) {
                await API.put(`/BoxCapacities/${editingItem.boxCapacityId}`, {
                    boxCapacityId: editingItem.boxCapacityId,
                    capacity
                });
                message.success('Updated successfully');
            } else {
                await API.post('/BoxCapacities', {
                    capacity
                });
                message.success('Added successfully');
            }

            setModalVisible(false);
            fetchBoxCapacities();
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
            title: 'Capacity',
            dataIndex: 'capacity',
            key: 'capacity',
           sorter: (a, b) => a.capacity - b.capacity,
            ...getColumnSearchProps('capacity'),
        },
        {
            title: 'Actions',
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
                    Access Denied: You do not have permission to view Box Capacity Master.
                </p>
            </div>
        );
    }

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
                {canCreate ? (
                    <Button type="primary" onClick={handleAdd}>
                        Add
                    </Button>
                ) : (
                    <Tooltip title="View-only access: Creating new items is disabled">
                        <span>
                            <Button type="primary" disabled>
                                Add
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </div>
            <Table
                dataSource={boxCapacities}
                columns={columns}
                rowKey="boxCapacityId"
                loading={loading}
            />
            <Modal
                title={editingItem ? 'Edit Capacity' : 'Add Capacity'}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                okText="Save"
                okButtonProps={{ disabled: editingItem ? !canEdit : !canCreate }}
            >
                <Input
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    placeholder="Enter capacity"
                />
            </Modal>
        </div>
    );
};

export default BoxCapacity;
