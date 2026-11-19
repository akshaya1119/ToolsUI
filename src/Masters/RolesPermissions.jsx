import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Tabs, Table, Checkbox, Button, Select, Card, Tag, Space, message,
  Modal, Input, Typography, Tooltip, Popconfirm, Divider, Row, Col, Badge,
  Dropdown
} from 'antd';
import {
  SafetyCertificateOutlined, TeamOutlined, ReloadOutlined,
  SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined,
  SearchOutlined, CheckCircleFilled, CloseCircleFilled, FilterOutlined,
  AppstoreOutlined, EyeOutlined, CheckSquareOutlined, DownOutlined,
  ExclamationCircleOutlined, UndoOutlined, StopOutlined, CheckCircleOutlined,
  MinusCircleOutlined, ThunderboltOutlined
} from '@ant-design/icons';
import API from '../hooks/api';
import usePermissionsStore from '../stores/UserPermissions';
import useModulePermission from '../hooks/useModulePermission';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;

const ACTION_COLUMNS = [
  { key: 'canView', label: 'View', tooltip: 'Grants read-only access to view pages, tables, records, and export reports' },
  { key: 'canCreate', label: 'Create', tooltip: 'Allows adding new records or uploading files' },
  { key: 'canEdit', label: 'Edit', tooltip: 'Permits modifying existing data, configurations, or running processing operations' },
  { key: 'canDelete', label: 'Delete', tooltip: 'Allows removing, archiving, or purging records' },
];

const RolesPermissions = () => {
  const { t } = useTranslation();
  const { canView, canCreate, canEdit, canDelete } = useModulePermission('ROLES_PERMISSIONS');
  // Tab 1: Roles Management (Default), Tab 2: Role Permissions
  const [activeTab, setActiveTabState] = useState(() => {
    return sessionStorage.getItem('roles_permissions_active_tab') || '1';
  });

  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    sessionStorage.setItem('roles_permissions_active_tab', tab);
  };

  // Shared Data
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const refreshCurrentPermissions = usePermissionsStore((state) => state.fetchPermissions);

  // --- TAB 1: Roles Management State ---
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ roleName: '' });
  const [savingRole, setSavingRole] = useState(false);

  // --- TAB 2: Role Permissions Matrix State ---
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId]);
  const isDeveloperRole = useMemo(() => {
    return selectedRole?.id === 1 || selectedRole?.roleName?.toLowerCase() === 'developer';
  }, [selectedRole]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [initialRolePermissions, setInitialRolePermissions] = useState([]);
  const [specialActions, setSpecialActions] = useState({});
  const [initialSpecialActions, setInitialSpecialActions] = useState({});
  const [specialActionDefs, setSpecialActionDefs] = useState([]);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  // Tab 2: Table Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // 1. Initial Load
  useEffect(() => {
    fetchRoles();
    fetchModules();
    fetchSpecialActionDefs();
  }, []);

  const fetchSpecialActionDefs = async () => {
    try {
      const res = await API.get('/Permissions/special-actions');
      setSpecialActionDefs(res.data || []);
    } catch (err) {
      console.warn('Failed to load special action definitions', err);
    }
  };

  const fetchRoles = async () => {
    setLoadingRoles(true);
    try {
      const res = await API.get('/Permissions/roles');
      const data = res.data || [];
      setRoles(data);
      if (data.length > 0 && !selectedRoleId) {
        setSelectedRoleId(data[0].id);
      }
    } catch (err) {
      message.error('Failed to load roles: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingRoles(false);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await API.get('/Permissions/modules');
      // Ensure Dashboard is not included in configurable modules
      const list = (res.data || []).filter((m) => m.code !== 'DASHBOARD');
      setModules(list);
    } catch (err) {
      console.warn('Failed to fetch modules list', err);
    }
  };

  // 2. Fetch permissions when selected role changes
  useEffect(() => {
    if (selectedRoleId) {
      fetchRolePermissions(selectedRoleId);
    }
  }, [selectedRoleId]);

  const fetchRolePermissions = async (roleId) => {
    setLoadingRolePerms(true);
    try {
      const res = await API.get(`/Permissions/role/${roleId}`);
      let perms = (res.data?.permissions || []).filter((p) => p.moduleCode !== 'DASHBOARD');
      const special = res.data?.specialActions || {};

      setRolePermissions(perms);
      setInitialRolePermissions(JSON.parse(JSON.stringify(perms)));
      setSpecialActions(special);
      setInitialSpecialActions(JSON.parse(JSON.stringify(special)));
    } catch (err) {
      message.error('Failed to load permissions for role: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingRolePerms(false);
    }
  };

  // Permission Mutations for Role Permissions
  const handleRolePermissionChange = (moduleCode, actionKey, checked) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    setRolePermissions((prev) =>
      prev.map((item) =>
        item.moduleCode === moduleCode ? { ...item, [actionKey]: checked } : item
      )
    );
  };

  const handleSpecialActionChange = (actionCode, checked) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    setSpecialActions((prev) => ({
      ...prev,
      [actionCode]: checked
    }));
  };

  const handleApplyPreset = (moduleCode, preset) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }

    setRolePermissions((prev) =>
      prev.map((item) => {
        if (item.moduleCode !== moduleCode) return item;
        if (preset === 'full') {
          return { ...item, canView: true, canCreate: true, canEdit: true, canDelete: true };
        }
        if (preset === 'readonly') {
          return { ...item, canView: true, canCreate: false, canEdit: false, canDelete: false };
        }
        if (preset === 'none') {
          return { ...item, canView: false, canCreate: false, canEdit: false, canDelete: false };
        }
        return item;
      })
    );
  };

  const handleBulkPreset = (preset) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    setRolePermissions((prev) =>
      prev.map((item) => {
        if (preset === 'grant_all') {
          return { ...item, canView: true, canCreate: true, canEdit: true, canDelete: true };
        }
        if (preset === 'readonly_all') {
          return { ...item, canView: true, canCreate: false, canEdit: false, canDelete: false };
        }
        if (preset === 'revoke_all') {
          return { ...item, canView: false, canCreate: false, canEdit: false, canDelete: false };
        }
        return item;
      })
    );
    if (preset === 'grant_all') message.success('Granted all permissions across all modules.');
    if (preset === 'readonly_all') message.info('Applied Read-Only access across all modules.');
    if (preset === 'revoke_all') message.warning('Revoked all permissions across all modules.');
  };

  const handleDiscardRoleChanges = () => {
    setRolePermissions(JSON.parse(JSON.stringify(initialRolePermissions)));
    setSpecialActions(JSON.parse(JSON.stringify(initialSpecialActions)));
    message.info('Reverted unsaved role permission modifications.');
  };

  const handleSaveRolePermissions = async () => {
    if (!canEdit) {
      message.warning('You have view-only access. Saving role permissions is disabled.');
      return;
    }
    if (!selectedRoleId) return;
    setSavingRolePerms(true);
    try {
      await API.put(`/Permissions/role/${selectedRoleId}`, {
        permissions: rolePermissions,
        specialActions: specialActions
      });
      message.success(`Permissions for role '${selectedRole?.roleName || selectedRoleId}' saved successfully!`);
      setInitialRolePermissions(JSON.parse(JSON.stringify(rolePermissions)));
      setInitialSpecialActions(JSON.parse(JSON.stringify(specialActions)));
      refreshCurrentPermissions();
    } catch (err) {
      message.error('Failed to save permissions: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingRolePerms(false);
    }
  };

  // Role Management Operations
  const handleOpenRoleModal = (role = null) => {
    if (!canEdit) {
      message.warning('You have view-only access. Managing roles is disabled.');
      return;
    }
    setEditingRole(role);
    setRoleForm({
      roleName: role ? role.roleName : '',
    });
    setIsRoleModalVisible(true);
  };

  const handleSaveRole = async () => {
    if (!canEdit) {
      message.warning('You have view-only access. Managing roles is disabled.');
      return;
    }
    if (!roleForm.roleName.trim()) {
      message.warning('Role Name is required');
      return;
    }

    setSavingRole(true);
    try {
      if (editingRole) {
        await API.put(`/Permissions/roles/${editingRole.id}`, { roleName: roleForm.roleName.trim() });
        message.success('Role updated successfully');
      } else {
        await API.post('/Permissions/roles', { roleName: roleForm.roleName.trim() });
        message.success('Custom role created successfully');
      }
      setIsRoleModalVisible(false);
      fetchRoles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Operation failed');
    } finally {
      setSavingRole(false);
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!canDelete) {
      message.warning('You have view-only access. Deleting roles is disabled.');
      return;
    }
    try {
      await API.delete(`/Permissions/roles/${roleId}`);
      message.success('Role deleted successfully');
      fetchRoles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to delete role');
    }
  };

  // --- TAB 2: Unsaved Changes Detection ---
  const modifiedRowsMap = useMemo(() => {
    const map = new Map();
    if (!initialRolePermissions.length) return map;

    rolePermissions.forEach((curr) => {
      const orig = initialRolePermissions.find((x) => x.moduleCode === curr.moduleCode);
      if (!orig) return;
      const isChanged =
        curr.canView !== orig.canView ||
        curr.canCreate !== orig.canCreate ||
        curr.canEdit !== orig.canEdit ||
        curr.canDelete !== orig.canDelete;
      if (isChanged) {
        map.set(curr.moduleCode, true);
      }
    });

    return map;
  }, [rolePermissions, initialRolePermissions]);

  const hasSpecialActionsChanged = useMemo(() => {
    const allKeys = Array.from(new Set([...Object.keys(specialActions), ...Object.keys(initialSpecialActions)]));
    return allKeys.some((k) => !!specialActions[k] !== !!initialSpecialActions[k]);
  }, [specialActions, initialSpecialActions]);

  const hasUnsavedChanges = modifiedRowsMap.size > 0 || hasSpecialActionsChanged;

  // --- TAB 2: Filtered Matrix Data ---
  const filteredMatrixData = useMemo(() => {
    return rolePermissions.filter((item) => {
      const mod = modules.find((m) => m.code === item.moduleCode);
      const displayName = mod ? mod.displayName : item.moduleCode;

      const query = searchQuery.trim().toLowerCase();
      if (query) {
        const matchesName = displayName.toLowerCase().includes(query);
        const matchesCode = item.moduleCode.toLowerCase().includes(query);
        if (!matchesName && !matchesCode) return false;
      }

      const activeCount = [
        item.canView, item.canCreate, item.canEdit, item.canDelete
      ].filter(Boolean).length;

      const modSupported = (mod?.supportedActions || ['View', 'Create', 'Edit', 'Delete'])
        .filter(a => ['View', 'Create', 'Edit', 'Delete'].includes(a));
      const totalPossible = modSupported.length;

      if (statusFilter === 'configured') return activeCount > 0;
      if (statusFilter === 'full') return activeCount >= totalPossible && totalPossible > 0;
      if (statusFilter === 'none') return activeCount === 0;

      return true;
    });
  }, [rolePermissions, modules, searchQuery, statusFilter]);

  // Quick Action Menu Builder for a Row (Tab 2)
  const getQuickActionMenu = (record) => ({
    items: [
      {
        key: 'full',
        label: 'Full Access (All Permissions)',
        icon: <CheckCircleFilled style={{ color: '#16a34a' }} />,
        onClick: () => handleApplyPreset(record.moduleCode, 'full'),
      },
      {
        key: 'readonly',
        label: 'Read Only (View Only)',
        icon: <EyeOutlined style={{ color: '#2563eb' }} />,
        onClick: () => handleApplyPreset(record.moduleCode, 'readonly'),
      },
      {
        type: 'divider',
      },
      {
        key: 'none',
        label: 'No Access (Clear All)',
        icon: <CloseCircleFilled style={{ color: '#dc2626' }} />,
        danger: true,
        onClick: () => handleApplyPreset(record.moduleCode, 'none'),
      },
    ],
  });

  // Table Columns for Tab 2: Role Permissions Matrix
  const roleMatrixColumns = [
    {
      title: 'Module / Feature',
      dataIndex: 'moduleCode',
      key: 'moduleCode',
      fixed: 'left',
      width: 280,
      render: (code) => {
        const mod = modules.find((m) => m.code === code);
        const isModified = modifiedRowsMap.has(code);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {isModified ? (
              <span
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  backgroundColor: '#f59e0b',
                  flexShrink: 0
                }}
                title="Modified in this session"
              />
            ) : (
              <span style={{ width: 4, height: 32, flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b', lineHeight: 1.3 }}>
                {mod ? mod.displayName : code}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                  {code}
                </span>
                {isModified && (
                  <Tag color="warning" style={{ fontSize: 10, padding: '0 4px', margin: 0, lineHeight: '16px' }}>
                    Unsaved
                  </Tag>
                )}
              </div>
            </div>
          </div>
        );
      }
    },
    ...ACTION_COLUMNS.map((action) => ({
      title: (
        <Tooltip title={action.tooltip}>
          <span style={{ cursor: 'help', fontWeight: 600 }}>{action.label}</span>
        </Tooltip>
      ),
      dataIndex: action.key,
      key: action.key,
      align: 'center',
      width: 105,
      render: (checked, record) => {
        const mod = modules.find((m) => m.code === record.moduleCode);
        const supported = mod?.supportedActions;
        // Check if this action is supported for this module
        const actionName = action.label; // 'View', 'Create', 'Edit', 'Delete', 'Execute', 'Export'
        const isSupported = !supported || supported.includes(actionName);

        if (!isSupported) {
          return <span style={{ color: '#cbd5e1' }}>—</span>;
        }

        return (
          <Checkbox
            checked={checked}
            disabled={!canEdit}
            onChange={(e) => handleRolePermissionChange(record.moduleCode, action.key, e.target.checked)}
          />
        );
      }
    })),
    {
      title: 'Status',
      key: 'summary',
      align: 'center',
      width: 150,
      render: (_, record) => {
        const mod = modules.find((m) => m.code === record.moduleCode);
        // Only consider the 4 standard actions (View, Create, Edit, Delete)
        const supported = (mod?.supportedActions || ['View', 'Create', 'Edit', 'Delete'])
          .filter(a => ['View', 'Create', 'Edit', 'Delete'].includes(a));
        const totalSupported = supported.length;

        const count = [
          supported.includes('View') && record.canView,
          supported.includes('Create') && record.canCreate,
          supported.includes('Edit') && record.canEdit,
          supported.includes('Delete') && record.canDelete,
        ].filter(Boolean).length;

        let statusColor = 'default';
        let statusText = 'No Access';
        if (count === totalSupported && totalSupported > 0) {
          statusColor = 'success';
          statusText = 'Full Access';
        } else if (count > 0) {
          statusColor = 'processing';
          statusText = `${count} of ${totalSupported} Allowed`;
        }

        return (
          <Space size={6}>
            <Tag color={statusColor} style={{ margin: 0, fontSize: 11, fontWeight: 500 }}>
              {statusText}
            </Tag>
            <Dropdown menu={getQuickActionMenu(record)} trigger={['click']} disabled={!canEdit}>
              <Button size="small" type="text" icon={<DownOutlined style={{ fontSize: 10 }} />} disabled={!canEdit} />
            </Dropdown>
          </Space>
        );
      }
    }
  ];

  if (!canView) {
    return (
      <div style={{ padding: '32px 16px', maxWidth: 600, margin: '0 auto' }}>
        <Alert
          message="Access Restricted"
          description="You do not have administrative permission to view Roles & Permissions."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div>
      {!canEdit && (
        <Alert
          message="Read-Only Mode"
          description="You have view-only access to Roles & Permissions. Modification and saving are disabled."
          type="info"
          showIcon
          style={{ marginBottom: 16, borderRadius: 8 }}
        />
      )}

      {/* NAVIGATION TABS (Tab 1: Roles Management, Tab 2: Role Permissions) */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="line"
        size="middle"
        style={{ marginBottom: 16 }}
        items={[
          {
            key: '1',
            label: (
              <span>
                <TeamOutlined style={{ marginRight: 6 }} />
                Roles Management
              </span>
            ),
          },
          {
            key: '2',
            label: (
              <span>
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                Role Permissions
              </span>
            ),
          },
        ]}
      />

      {/* TAB 1: ROLES MANAGEMENT */}
      {activeTab === '1' && (
        <Card
          bordered
          style={{
            borderRadius: 10,
            boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
            borderColor: '#e2e8f0',
          }}
          bodyStyle={{ padding: '20px' }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <div>
              <Title level={5} style={{ margin: 0, color: '#0f172a' }}>System & Custom Roles</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Configure system roles or create custom organization roles for granular access control.
              </Text>
            </div>
            <Tooltip title={!canCreate || !canEdit ? 'View-only: Creating roles is disabled' : ''}>
              <span>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!canCreate || !canEdit}
                  onClick={() => handleOpenRoleModal(null)}
                  style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                >
                  Create Custom Role
                </Button>
              </span>
            </Tooltip>
          </div>

          <Table
            dataSource={roles}
            rowKey="id"
            loading={loadingRoles}
            pagination={false}
            size="middle"
            columns={[
              { title: 'ID', dataIndex: 'id', key: 'id', width: 70 },
              {
                title: 'Role Name',
                dataIndex: 'roleName',
                key: 'roleName',
                render: (text, r) => (
                  <Space>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{text}</span>
                    {r.isSystemRole && <Tag color="blue">Built-in</Tag>}
                  </Space>
                )
              },
              {
                title: 'Assigned Members',
                dataIndex: 'userCount',
                key: 'userCount',
                width: 160,
                render: (cnt) => (
                  <Badge
                    count={cnt || 0}
                    showZero
                    overflowCount={999}
                    style={{ backgroundColor: '#10b981' }}
                  />
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 160,
                render: (_, r) => {
                  const isBuiltInRole = r.isSystemRole || (r.id >= 1 && r.id <= 5);
                  const isEditDisabled = !canEdit || isBuiltInRole;
                  const editTooltip = isBuiltInRole
                    ? 'Built-in system roles (IDs 1-5) cannot be renamed'
                    : (!canEdit ? 'View-only: Editing roles is disabled' : '');

                  return (
                    <Space size="small">
                      <Tooltip title={editTooltip}>
                        <span>
                          <Button
                            size="small"
                            icon={<EditOutlined />}
                            disabled={isEditDisabled}
                            onClick={() => handleOpenRoleModal(r)}
                          >
                            {t('common.actions.edit', 'Edit')}
                          </Button>
                        </span>
                      </Tooltip>
                      {!isBuiltInRole && (
                        <Popconfirm
                          title={t('rolesPermissions.deleteRoleTitle', 'Delete Role')}
                          description={t('rolesPermissions.deleteRoleConfirm', 'Are you sure you want to delete this custom role?')}
                          onConfirm={() => handleDeleteRole(r.id)}
                          okText={t('common.actions.yes', 'Yes')}
                          cancelText={t('common.actions.no', 'No')}
                          disabled={!canDelete}
                        >
                          <Tooltip title={!canDelete ? 'View-only: Deleting roles is disabled' : ''}>
                            <span>
                              <Button size="small" danger icon={<DeleteOutlined />} disabled={!canDelete}>
                                {t('common.actions.delete', 'Delete')}
                              </Button>
                            </span>
                          </Tooltip>
                        </Popconfirm>
                      )}
                    </Space>
                  );
                }
              }
            ]}
          />
        </Card>
      )}

      {/* TAB 2: ROLE PERMISSIONS MATRIX */}
      {activeTab === '2' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '16px 22px' }}
          >
            <Row gutter={[24, 16]} align="middle">
              {/* Role Selection */}
              <Col xs={24} sm={12} md={9} lg={9}>
                <Space direction="vertical" size={5} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Select Role to Configure
                  </Text>
                  <Select
                    style={{ width: '100%' }}
                    value={selectedRoleId}
                    onChange={setSelectedRoleId}
                    loading={loadingRoles}
                    showSearch
                    optionFilterProp="children"
                  >
                    {roles.map((r) => (
                      <Option key={r.id} value={r.id}>
                        {r.roleName} {r.isSystemRole && '(Built-in)'}
                      </Option>
                    ))}
                  </Select>
                </Space>
              </Col>

              {/* Role Metadata Display */}
              {selectedRole && (
                <Col xs={24} sm={12} md={7} lg={7}>
                  <Space direction="vertical" size={5} style={{ width: '100%' }}>
                    <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Role Classification
                    </Text>
                    <div
                      style={{
                        height: 32,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        padding: '0 12px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: 6,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <Tag
                        color={selectedRole.isSystemRole ? 'blue' : 'purple'}
                        style={{ margin: 0, borderRadius: 4, fontWeight: 500 }}
                      >
                        {selectedRole.isSystemRole ? 'System Built-in Role' : 'Custom Role'}
                      </Tag>
                    </div>
                  </Space>
                </Col>
              )}

              {/* Action Buttons */}
              <Col xs={24} sm={24} md={selectedRole ? 8 : 15} lg={selectedRole ? 8 : 15} style={{ textAlign: 'right' }}>
                <Space size={8} wrap style={{ marginTop: selectedRole ? 16 : 0 }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => fetchRolePermissions(selectedRoleId)}
                    loading={loadingRolePerms}
                  >
                    Refresh
                  </Button>
                  {hasUnsavedChanges && (
                    <Button
                      icon={<UndoOutlined />}
                      onClick={handleDiscardRoleChanges}
                    >
                      Discard
                    </Button>
                  )}
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={savingRolePerms}
                    disabled={!hasUnsavedChanges || !canEdit}
                    onClick={handleSaveRolePermissions}
                    style={{
                      ...(!hasUnsavedChanges || !canEdit
                        ? { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#94a3b8' }
                        : { backgroundColor: '#2563eb', borderColor: '#2563eb', color: '#ffffff' })
                    }}
                  >
                    Save Changes
                  </Button>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Quick Presets & Filter Bar */}
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '14px 20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <Space size={12} wrap>
                <Input
                  placeholder="Search modules..."
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: 220 }}
                  allowClear
                />
                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 170 }}
                >
                  <Option value="all">All Modules</Option>
                  <Option value="configured">Configured (Any Access)</Option>
                  <Option value="full">Full Access (All Supported)</Option>
                  <Option value="none">No Access</Option>
                </Select>
              </Space>

              <Space size={8} wrap>
                <Text style={{ fontSize: 12, color: '#64748b', fontWeight: 500, marginRight: 4 }}>
                  Batch Presets:
                </Text>
                <Button
                  size="small"
                  icon={<CheckSquareOutlined />}
                  disabled={!canEdit}
                  onClick={() => handleBulkPreset('grant_all')}
                >
                  Grant All
                </Button>
                <Button
                  size="small"
                  icon={<EyeOutlined />}
                  disabled={!canEdit}
                  onClick={() => handleBulkPreset('readonly_all')}
                >
                  Read-Only All
                </Button>
                <Button
                  size="small"
                  danger
                  icon={<StopOutlined />}
                  disabled={!canEdit}
                  onClick={() => handleBulkPreset('revoke_all')}
                >
                  Revoke All
                </Button>
              </Space>
            </div>
          </Card>

          {/* Role Permissions Matrix Table */}
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                  Role Access Matrix: {selectedRole?.roleName || 'Role'}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {hasUnsavedChanges && (
                  <Tag color="warning" icon={<ExclamationCircleOutlined />}>
                    {modifiedRowsMap.size} module(s) modified
                  </Tag>
                )}
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Showing {filteredMatrixData.length} of {rolePermissions.length} modules
                </Text>
              </div>
            </div>

            <Table
              dataSource={filteredMatrixData}
              columns={roleMatrixColumns}
              rowKey="moduleCode"
              loading={loadingRolePerms}
              pagination={false}
              size="middle"
              scroll={{ x: 950, y: 560 }}
              rowClassName={(record) => modifiedRowsMap.has(record.moduleCode) ? 'bg-amber-50/40' : ''}
              locale={{
                emptyText: (
                  <div style={{ padding: '32px 0', textAlign: 'center' }}>
                    <InfoCircleOutlined style={{ fontSize: 28, color: '#cbd5e1', marginBottom: 8 }} />
                    <p style={{ color: '#64748b', margin: 0 }}>No modules match current search/filter.</p>
                  </div>
                )
              }}
            />
          </Card>

          {/* SPECIAL ACTIONS SECTION */}
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ThunderboltOutlined style={{ color: '#d97706', fontSize: 18 }} />
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>
                  {t('rolesPermissions.specialActionsTitle', 'Dedicated Special Actions')}
                </Title>
              </div>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t('rolesPermissions.specialActionsDesc', 'High-impact business operations requiring explicit role assignment in addition to module View and standard permissions.')}
              </Text>
            </div>

            <Table
              size="middle"
              rowKey="code"
              pagination={false}
              bordered
              dataSource={specialActionDefs}
              columns={[
                {
                  title: t('rolesPermissions.actionName', 'Special Action'),
                  key: 'actionName',
                  width: '38%',
                  render: (_, sa) => (
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                          {sa.displayName}
                        </span>
                        <Tag color="blue" style={{ fontFamily: 'monospace', fontSize: 10, margin: 0 }}>
                          {sa.code}
                        </Tag>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                        {sa.description}
                      </div>
                    </div>
                  ),
                },
                {
                  title: t('rolesPermissions.parentModulePrereq', 'Parent Module & Prerequisite'),
                  key: 'parentModule',
                  width: '32%',
                  render: (_, sa) => {
                    const parentMod = modules.find((m) => m.code === sa.parentModule);
                    const ACTION_ENUM_MAP = {
                      0: 'View',
                      1: 'Create',
                      2: 'Edit',
                      3: 'Delete',
                      4: 'Execute',
                      5: 'Export'
                    };
                    const actionName = typeof sa.requiredStandardAction === 'number'
                      ? ACTION_ENUM_MAP[sa.requiredStandardAction] || 'Edit'
                      : sa.requiredStandardAction;

                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Parent:</span>
                          <Tag color="geekblue" style={{ margin: 0, fontSize: 11 }}>
                            {parentMod?.displayName || sa.parentModule}
                          </Tag>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontSize: 11, color: '#94a3b8' }}>Requires:</span>
                          <Tag color="orange" style={{ margin: 0, fontSize: 11 }}>
                            {actionName}
                          </Tag>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  title: t('rolesPermissions.prerequisiteStatus', 'Prerequisite Status'),
                  key: 'prereqStatus',
                  width: '18%',
                  align: 'center',
                  render: (_, sa) => {
                    const parentMod = modules.find((m) => m.code === sa.parentModule);
                    const roleModPerm = rolePermissions.find((p) => p.moduleCode === sa.parentModule);
                    const hasParentView = !!roleModPerm?.canView;
                    const ACTION_ENUM_MAP = {
                      0: 'View',
                      1: 'Create',
                      2: 'Edit',
                      3: 'Delete',
                      4: 'Execute',
                      5: 'Export'
                    };
                    const actionName = typeof sa.requiredStandardAction === 'number'
                      ? ACTION_ENUM_MAP[sa.requiredStandardAction] || 'Edit'
                      : sa.requiredStandardAction;
                    const hasParentAction = !!roleModPerm?.[`can${actionName}`];
                    const isPrereqSatisfied = hasParentView && hasParentAction;

                    if (isPrereqSatisfied) {
                      return (
                        <Tag color="success" style={{ margin: 0, fontSize: 11 }}>
                          {t('rolesPermissions.prerequisitesMet', 'Prerequisites Met')}
                        </Tag>
                      );
                    }

                    return (
                      <Tooltip title={`Role lacks ${parentMod?.displayName || sa.parentModule} View or ${actionName}. Action remains blocked until prerequisites are granted.`}>
                        <Tag color="warning" style={{ margin: 0, fontSize: 11 }}>
                          {t('rolesPermissions.prerequisitesMissing', 'Prerequisites Missing')}
                        </Tag>
                      </Tooltip>
                    );
                  },
                },
                {
                  title: t('rolesPermissions.granted', 'Granted'),
                  key: 'granted',
                  width: '12%',
                  align: 'center',
                  render: (_, sa) => {
                    const isChecked = !!specialActions[sa.code];
                    return (
                      <Checkbox
                        checked={isChecked}
                        disabled={!canEdit}
                        onChange={(e) => handleSpecialActionChange(sa.code, e.target.checked)}
                      />
                    );
                  },
                },
              ]}
            />
          </Card>

          {/* Floating Save Footer when changes exist */}
          {hasUnsavedChanges && (
            <div
              style={{
                position: 'sticky',
                bottom: 16,
                padding: '12px 20px',
                background: '#ffffff',
                borderRadius: 10,
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                border: '1px solid #e2e8f0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                zIndex: 10
              }}
            >
              <Space>
                <ExclamationCircleOutlined style={{ color: '#f59e0b', fontSize: 16 }} />
                <span style={{ fontWeight: 500, color: '#1e293b' }}>
                  You have unsaved changes in {modifiedRowsMap.size} module(s) for role <strong>{selectedRole?.roleName}</strong>.
                </span>
              </Space>
              <Space>
                <Button onClick={handleDiscardRoleChanges}>
                  {t('common.actions.discard', 'Discard')}
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingRolePerms}
                  onClick={handleSaveRolePermissions}
                  style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                >
                  {t('rolesPermissions.saveRolePerms', 'Save Role Permissions')}
                </Button>
              </Space>
            </div>
          )}
        </Space>
      )}

      {/* Role Create/Edit Modal */}
      <Modal
        title={editingRole ? t('rolesPermissions.editRoleTitle', 'Edit Role') : t('rolesPermissions.createRoleTitle', 'Create Custom Role')}
        open={isRoleModalVisible}
        onCancel={() => setIsRoleModalVisible(false)}
        onOk={handleSaveRole}
        confirmLoading={savingRole}
        okText={t('common.actions.save', 'Save')}
        cancelText={t('common.actions.cancel', 'Cancel')}
      >
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#334155' }}>Role Name</label>
          <Input
            placeholder="e.g. Quality Assurance, Data Reviewer"
            value={roleForm.roleName}
            disabled={editingRole?.isSystemRole}
            onChange={(e) => setRoleForm({ roleName: e.target.value })}
          />
        </div>
      </Modal>
    </div>
  );
};

export default RolesPermissions;
