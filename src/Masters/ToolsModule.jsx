import { useTranslation } from 'react-i18next';
import React, { useEffect, useState } from 'react';
import { Table, Button, Modal, Input, Space, message, Select, Tooltip } from 'antd';
import { EditOutlined, SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';
import useModulePermission from '../hooks/useModulePermission';

const { Option } = Select;

const ToolModule = () => {
    const { t } = useTranslation();
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
            message.error(t('masters.toolsModule.fetchFailed', 'Failed to fetch modules'));
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
            message.warning(t('common.validation.nameRequired', 'Name is required'));
            return;
        }

        // Check for duplicates
        const isDuplicate = modules.some(item =>
            item.name.toLowerCase() === name.toLowerCase() &&
            (!editingItem || item.id !== editingItem.id)
        );

        if (isDuplicate) {
            message.warning(t('masters.toolsModule.moduleExists', 'This module name already exists'));
            return;
        }

        // Prevent self-dependency
        if (editingItem && dependencyIds.includes(editingItem.id)) {
            message.error(t('masters.toolsModule.selfDependencyError', "Module cannot depend on itself"));
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
                message.success(t('common.feedback.updateSuccess', 'Updated successfully'));
            } else {
                await API.post('/Modules', payload);
                message.success(t('common.feedback.addSuccess', 'Added successfully'));
            }

            setModalVisible(false);
            fetchModules();
        } catch {
            message.error(t('common.feedback.saveFailed', 'Save failed'));
        }
    };

    const getColumnSearchProps = (dataIndex) => ({
        filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
            <div style={{ padding: 8 }}>
                <Input
                    placeholder={t('tables.searchColumn', { column: t(`tables.${dataIndex}`, dataIndex), defaultValue: `Search ${dataIndex}` })}
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
                        {t('common.actions.search', 'Search')}
                    </Button>
                    <Button onClick={() => clearFilters()} size="small" style={{ width: 90 }}>
                        {t('common.actions.reset', 'Reset')}
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
            title: t('tables.name', 'Name'),
            dataIndex: 'name',
            key: 'name',
            sorter: (a, b) => a.name.localeCompare(b.name),
            ...getColumnSearchProps('name'),
        },
        {
            title: t('masters.toolsModule.dependsOn', 'Depends On'),
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
            title: t('common.labels.actions', 'Actions'),
            key: 'actions',
            render: (_, record) => (
                <Space>
                    {canEdit ? (
                        <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    ) : (
                        <Tooltip title={t('common.actions.viewOnlyEditDisabled', 'View-only access: Editing is disabled')}>
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
                        {t('common.actions.add', 'Add')}
                    </Button>
                ) : (
                    <Tooltip title={t('common.actions.viewOnlyAddDisabled', 'View-only access: Creating new items is disabled')}>
                        <span>
                            <Button type="primary" disabled>
                                {t('common.actions.add', 'Add')}
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
                title={editingItem ? t('masters.toolsModule.editTitle', 'Edit Module') : t('masters.toolsModule.addTitle', 'Add Module')}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                okText={t('common.actions.save', 'Save')}
                cancelText={t('common.actions.cancel', 'Cancel')}
                okButtonProps={{ disabled: editingItem ? !canEdit : !canCreate }}
            >
                <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('masters.toolsModule.enterModuleName', 'Enter module name')}
                    style={{ marginBottom: 12 }}
                />
                <Select
                    mode="multiple" // 👈 allow multiple selection
                    placeholder={t('masters.toolsModule.selectDependentModules', 'Select dependent modules (optional)')}
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