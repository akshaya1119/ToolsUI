import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, Space, message } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';

const BoxCapacity = () => {
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
        fetchBoxCapacities();
    }, []);

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
