import React, { useEffect, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Alert, Tabs, Table, Checkbox, Button, Select, Card, Tag, Space, message,
  Modal, Input, Typography, Tooltip, Popconfirm, Divider, Row, Col, Badge,
  Dropdown, Avatar
} from 'antd';
import {
  SafetyCertificateOutlined, TeamOutlined, ReloadOutlined,
  SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined,
  SearchOutlined, CheckCircleFilled, CloseCircleFilled, FilterOutlined,
  AppstoreOutlined, EyeOutlined, CheckSquareOutlined, DownOutlined,
  ExclamationCircleOutlined, UndoOutlined, StopOutlined, CheckCircleOutlined,
  MinusCircleOutlined, ThunderboltOutlined, UserOutlined
} from '@ant-design/icons';
import { FaPhoneAlt } from "react-icons/fa";
import { MdLocationOn } from "react-icons/md";
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

  // Tab 1: Roles Management (Default), Tab 2: Role Permissions, Tab 3: User Role Assignment
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
  const isReadOnlyRole = useMemo(() => {
    return selectedRole?.roleName?.toLowerCase() === 'read only';
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

  // --- TAB 3: User Role Assignment State ---
  const [userAssignments, setUserAssignments] = useState([]);
  const [loadingUserRoles, setLoadingUserRoles] = useState(false);
  const [userSearchText, setUserSearchText] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');
  const [userPagination, setUserPagination] = useState({ current: 1, pageSize: 15 });
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isAssignModalVisible, setIsAssignModalVisible] = useState(false);
  const [assignForm, setAssignForm] = useState({ userIds: [], roleId: null });
  const [savingAssignment, setSavingAssignment] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingAvailableUsers, setLoadingAvailableUsers] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    fetchRoles();
    fetchModules();
    fetchSpecialActionDefs();
  }, []);

  useEffect(() => {
    if (activeTab === '3') {
      fetchUserRoles();
      fetchAvailableUsers();
    }
  }, [activeTab]);

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
      const data = (res.data || []).filter((m) => m.code !== 'DASHBOARD');
      setModules(data);
    } catch (err) {
      message.error('Failed to load system modules');
    }
  };

  // Fetch Permissions for Selected Role
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

  // Fetch User Role Assignments
  const fetchUserRoles = async () => {
    setLoadingUserRoles(true);
    try {
      const res = await API.get('/Permissions/user-roles');
      setUserAssignments(res.data || []);
    } catch (err) {
      message.error('Failed to load user role assignments: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingUserRoles(false);
    }
  };

  // Fetch Available Users from external ERP API via backend proxy
  const fetchAvailableUsers = async () => {
    setLoadingAvailableUsers(true);
    try {
      const res = await API.get('/Permissions/available-users');
      setAvailableUsers(res.data || []);
    } catch (err) {
      console.warn('Failed to load available users:', err);
    } finally {
      setLoadingAvailableUsers(false);
    }
  };

  // Permission Mutations for Role Permissions
  const handleRolePermissionChange = (moduleCode, actionKey, checked) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    if (isReadOnlyRole && (actionKey === 'canCreate' || actionKey === 'canEdit' || actionKey === 'canDelete')) {
      message.warning('Mutating permissions cannot be granted to the Read Only role.');
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
    if (isReadOnlyRole && checked) {
      message.warning('Special Actions cannot be granted to the Read Only role.');
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
    if (isReadOnlyRole && preset === 'full') {
      message.warning('Full access preset cannot be applied to the Read Only role.');
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

  const handleBatchPreset = (preset) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    if (isReadOnlyRole && preset === 'full') {
      message.warning('Full access preset cannot be applied to the Read Only role.');
      return;
    }

    setRolePermissions((prev) =>
      prev.map((item) => {
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

  const handleDiscardRoleChanges = () => {
    setRolePermissions(JSON.parse(JSON.stringify(initialRolePermissions)));
    setSpecialActions(JSON.parse(JSON.stringify(initialSpecialActions)));
    message.info('Unsaved changes discarded');
  };

  const handleSaveRolePermissions = async () => {
    if (!canEdit) {
      message.warning('You have view-only access. Saving permissions is disabled.');
      return;
    }
    if (!selectedRoleId) return;

    setSavingRolePerms(true);
    try {
      const payload = {
        permissions: rolePermissions.map((p) => ({
          moduleCode: p.moduleCode,
          canView: p.canView,
          canCreate: p.canCreate,
          canEdit: p.canEdit,
          canDelete: p.canDelete,
        })),
        specialActions: specialActions,
      };

      await API.put(`/Permissions/role/${selectedRoleId}`, payload);
      message.success('Role permissions saved successfully');
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

  // User Role Assignment Operations
  const handleOpenAssignModal = (user = null) => {
    if (!canEdit) {
      message.warning('You have view-only access. Managing role assignments is disabled.');
      return;
    }
    let initialUserIds = [];
    let initialRoleId = roles.length > 0 ? roles[0].id : null;

    if (user && user.userId) {
      initialUserIds = [user.userId];
      initialRoleId = user.roleId || initialRoleId;
    } else if (selectedUserIds.length > 0) {
      initialUserIds = [...selectedUserIds];
    }

    setAssignForm({
      userIds: initialUserIds,
      roleId: initialRoleId
    });
    setIsAssignModalVisible(true);
  };

  const handleSaveUserAssignment = async () => {
    if (!canEdit) {
      message.warning('You have view-only access. Managing role assignments is disabled.');
      return;
    }
    if (!assignForm.userIds || assignForm.userIds.length === 0 || !assignForm.roleId) {
      message.warning('Please select at least one User and a Tools Role.');
      return;
    }

    setSavingAssignment(true);
    try {
      if (assignForm.userIds.length === 1) {
        await API.post('/Permissions/user-roles', {
          userId: assignForm.userIds[0],
          roleId: assignForm.roleId
        });
        message.success('Tools role assigned successfully');
      } else {
        const res = await API.post('/Permissions/user-roles/bulk', {
          userIds: assignForm.userIds,
          roleId: assignForm.roleId
        });
        message.success(res.data?.message || `Tools role assigned to ${assignForm.userIds.length} users successfully`);
      }

      setIsAssignModalVisible(false);
      setSelectedUserIds([]);
      fetchUserRoles();
      fetchRoles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to assign role');
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleRemoveUserAssignment = async (userId) => {
    if (!canEdit) {
      message.warning('You have view-only access. Managing role assignments is disabled.');
      return;
    }
    try {
      await API.delete(`/Permissions/user-roles/${userId}`);
      message.success('Explicit assignment removed. User has reverted to Read Only.');
      fetchUserRoles();
      fetchRoles();
    } catch (err) {
      message.error(err.response?.data?.message || 'Failed to remove assignment');
    }
  };

  // --- TAB 2: Unsaved Changes Detection ---
  const modifiedRowsMap = useMemo(() => {
    const map = new Map();
    if (!initialRolePermissions.length) return map;

    rolePermissions.forEach((curr) => {
      const orig = initialRolePermissions.find((p) => p.moduleCode === curr.moduleCode);
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

  // --- TAB 2: Filtered Matrix Rows ---
  const filteredRolePermissions = useMemo(() => {
    return rolePermissions.filter((item) => {
      const mod = modules.find((m) => m.code === item.moduleCode);
      const displayName = mod?.displayName || item.moduleCode;
      const matchesSearch =
        displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.moduleCode.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'active') {
        return item.canView || item.canCreate || item.canEdit || item.canDelete;
      }
      if (statusFilter === 'inactive') {
        return !item.canView && !item.canCreate && !item.canEdit && !item.canDelete;
      }
      if (statusFilter === 'modified') {
        return modifiedRowsMap.has(item.moduleCode);
      }
      return true;
    });
  }, [rolePermissions, modules, searchQuery, statusFilter, modifiedRowsMap]);

  // --- TAB 3: Filtered User Assignments ---
  const filteredUserAssignments = useMemo(() => {
    return userAssignments.filter((u) => {
      const name = `${u.firstName || ''} ${u.lastName || ''} ${u.userName || ''}`.toLowerCase();
      const matchesSearch =
        !userSearchText ||
        name.includes(userSearchText.toLowerCase()) ||
        String(u.userId).includes(userSearchText);

      if (!matchesSearch) return false;

      if (userRoleFilter === 'all') return true;
      if (userRoleFilter === 'explicit') return u.isExplicit;
      if (userRoleFilter === 'default') return !u.isExplicit;
      return String(u.roleId) === String(userRoleFilter);
    });
  }, [userAssignments, userSearchText, userRoleFilter]);

  // Preset Actions for Row Menu
  const getPresetMenuItems = (moduleCode) => ({
    items: [
      {
        key: 'full',
        label: t('rolesPermissions.grantAll', 'Grant Full Access'),
        icon: <CheckCircleFilled style={{ color: '#10b981' }} />,
        disabled: isReadOnlyRole,
        onClick: () => handleApplyPreset(moduleCode, 'full'),
      },
      {
        key: 'readonly',
        label: t('rolesPermissions.grantViewOnly', 'View Only Access'),
        icon: <EyeOutlined style={{ color: '#2563eb' }} />,
        onClick: () => handleApplyPreset(moduleCode, 'readonly'),
      },
      {
        type: 'divider',
      },
      {
        key: 'none',
        label: t('rolesPermissions.revokeAll', 'Revoke All Access'),
        icon: <CloseCircleFilled style={{ color: '#ef4444' }} />,
        onClick: () => handleApplyPreset(moduleCode, 'none'),
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
                  height: 24,
                  backgroundColor: '#f59e0b',
                  borderRadius: 2,
                  display: 'inline-block',
                }}
              />
            ) : (
              <span style={{ width: 4 }} />
            )}
            <div>
              <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 13.5 }}>
                {mod?.displayName || code}
              </div>
              <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>
                {code}
              </div>
            </div>
          </div>
        );
      },
    },
    ...ACTION_COLUMNS.map((act) => ({
      title: (
        <Tooltip title={act.tooltip}>
          <span style={{ cursor: 'help' }}>{act.label}</span>
        </Tooltip>
      ),
      dataIndex: act.key,
      key: act.key,
      width: 110,
      align: 'center',
      render: (checked, row) => {
        const mod = modules.find((m) => m.code === row.moduleCode);
        const supported = mod?.supportedActions ? mod.supportedActions.includes(act.label) : true;
        if (!supported) {
          return <span style={{ color: '#cbd5e1', fontSize: 18 }}>–</span>;
        }

        const isReadOnlyLocked = isReadOnlyRole && (act.key === 'canCreate' || act.key === 'canEdit' || act.key === 'canDelete');
        const tooltipTitle = row.moduleCode === 'MASTER_PROJECT' && act.key === 'canDelete'
          ? 'Controls Project Archive / Unarchive permission'
          : undefined;

        const checkboxElement = (
          <Checkbox
            checked={!!checked}
            disabled={!canEdit || isReadOnlyLocked}
            onChange={(e) => handleRolePermissionChange(row.moduleCode, act.key, e.target.checked)}
          />
        );

        return tooltipTitle ? (
          <Tooltip title={tooltipTitle}>
            <span>{checkboxElement}</span>
          </Tooltip>
        ) : (
          checkboxElement
        );
      },
    })),
    {
      title: 'Actions',
      key: 'actions',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Dropdown menu={getPresetMenuItems(row.moduleCode)} trigger={['click']} disabled={!canEdit}>
          <Button size="small" type="text" style={{ fontSize: 12 }}>
            Preset <DownOutlined style={{ fontSize: 10 }} />
          </Button>
        </Dropdown>
      ),
    },
  ];

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

      {/* NAVIGATION TABS (Tab 1: Roles, Tab 2: Role Permissions, Tab 3: User Role Assignment) */}
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
          {
            key: '3',
            label: (
              <span>
                <UserOutlined style={{ marginRight: 6 }} />
                User Role Assignment
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
              <Title level={5} style={{ margin: 0, color: '#0f172a' }}>Tools Roles</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Configure application roles managed independently inside ERPTools.
              </Text>
            </div>
            <Tooltip title={!canCreate || !canEdit ? 'View-only: Creating roles is disabled' : ''}>
              <span>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!canCreate || !canEdit}
                  onClick={() => handleOpenRoleModal(null)}
                  style={
                    !canCreate || !canEdit
                      ? {}
                      : { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                  }
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
                key: 'roleName'
              },
              {
                title: 'Assigned Members',
                dataIndex: 'assignedUsersCount',
                key: 'assignedUsersCount',
                width: 160,
                render: (cnt) => (
                  <Badge
                    count={cnt || 0}
                    showZero
                    overflowCount={999}
                    style={{ backgroundColor: cnt > 0 ? '#10b981' : '#94a3b8' }}
                  />
                )
              },
              {
                title: 'Actions',
                key: 'actions',
                width: 160,
                render: (_, r) => {
                  const isProtected = r.isProtected || r.id === 1 || r.id === 2 || r.roleName === 'Read Only';
                  const hasAssigned = (r.assignedUsersCount || 0) > 0;
                  const isEditDisabled = !canEdit || isProtected;
                  const editTooltip = isProtected
                    ? 'Protected system roles cannot be renamed'
                    : (!canEdit ? 'View-only: Editing roles is disabled' : '');

                  const isDeleteDisabled = !canDelete || isProtected || hasAssigned;
                  const deleteTooltip = isProtected
                    ? 'Protected system roles cannot be deleted'
                    : (hasAssigned
                      ? `Cannot delete role: assigned to ${r.assignedUsersCount} user(s). Reassign them first.`
                      : (!canDelete ? 'View-only: Deleting roles is disabled' : ''));

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
                          </Button>
                        </span>
                      </Tooltip>
                      <Tooltip title={deleteTooltip}>
                        <span>
                          <Popconfirm
                            title={t('rolesPermissions.deleteRoleTitle', 'Delete Role')}
                            description={t('rolesPermissions.deleteRoleConfirm', 'Are you sure you want to delete this custom role?')}
                            onConfirm={() => handleDeleteRole(r.id)}
                            disabled={isDeleteDisabled}
                            okText={t('common.actions.yes', 'Yes')}
                            cancelText={t('common.actions.no', 'No')}
                          >
                            <Button
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              disabled={isDeleteDisabled}
                            >
                            </Button>
                          </Popconfirm>
                        </span>
                      </Tooltip>
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
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
                  Select Role to Configure
                </Text>
                <Select
                  value={selectedRoleId}
                  onChange={(val) => setSelectedRoleId(val)}
                  style={{ width: 240, fontWeight: 600 }}
                  size="middle"
                >
                  {roles.map((r) => (
                    <Option key={r.id} value={r.id}>
                      {r.roleName} {r.isProtected ? '(Protected)' : ''}
                    </Option>
                  ))}
                </Select>
              </div>

              {/* Search & Status Filters */}
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Input
                  placeholder={t('rolesPermissions.searchModule', 'Search module...')}
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  style={{ width: 220 }}
                  allowClear
                />
                {/* <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 140 }}
                >
                </Select> */}

                {/* Top Save & Discard Buttons */}
                <Button
                  onClick={handleDiscardRoleChanges}
                  disabled={!hasUnsavedChanges || !canEdit}
                >
                  {t('common.actions.discard', 'Discard')}
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingRolePerms}
                  disabled={!hasUnsavedChanges || !canEdit || isReadOnlyRole}
                  onClick={handleSaveRolePermissions}
                  style={
                    !hasUnsavedChanges || !canEdit || isReadOnlyRole
                      ? {}
                      : { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                  }
                >
                  {t('rolesPermissions.saveRolePerms', 'Save Role Permissions')}
                </Button>
              </div>
            </div>
          </Card>

          {/* Module Permissions Matrix */}
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '0px' }}
          >
            <Table
              dataSource={filteredRolePermissions}
              rowKey="moduleCode"
              columns={roleMatrixColumns}
              loading={loadingRolePerms}
              pagination={false}
              size="middle"
              scroll={{ x: 750, y: 550 }}
            />
          </Card>

          {/* Dedicated Special Actions */}
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '20px' }}
          >
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <ThunderboltOutlined style={{ color: '#f59e0b', fontSize: 18 }} />
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
                      0: 'View', 1: 'Create', 2: 'Edit', 3: 'Delete', 4: 'Execute', 5: 'Export'
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
                      0: 'View', 1: 'Create', 2: 'Edit', 3: 'Delete', 4: 'Execute', 5: 'Export'
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
                        disabled={!canEdit || isReadOnlyRole}
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
                zIndex: 10,
              }}
            >
              <Space>
                <Badge dot status="warning" />
                <span style={{ fontSize: 13.5, fontWeight: 500, color: '#0f172a' }}>
                  {t('rolesPermissions.unsavedChangesDetected', 'Unsaved permission changes detected for this role')}
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

      {/* TAB 3: USER ROLE ASSIGNMENT */}
      {activeTab === '3' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Title level={5} style={{ margin: 0, color: '#0f172a' }}>User Tools Role Assignments</Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Assign Tools roles to authenticated ERP users independently of their external ERP roles.
                </Text>
              </div>

              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <Input
                  placeholder="Search user name "
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  value={userSearchText}
                  onChange={(e) => setUserSearchText(e.target.value)}
                  style={{ width: 220 }}
                  allowClear
                />
                <Select
                  value={userRoleFilter}
                  onChange={setUserRoleFilter}
                  style={{ width: 170 }}
                >
                  <Option value="all">All Assignments</Option>
                  <Option value="explicit">Explicitly Assigned</Option>
                  {roles.map((r) => (
                    <Option key={r.id} value={String(r.id)}>{r.roleName}</Option>
                  ))}
                </Select>

                {/* <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  disabled={!canEdit}
                  onClick={() => handleOpenAssignModal(null)}
                  style={
                    !canEdit
                      ? {}
                      : { backgroundColor: '#2563eb', borderColor: '#2563eb' }
                  }
                >
                  {selectedUserIds.length > 0 ? `Assign Role (${selectedUserIds.length} Selected)` : 'Assign Role'}
                </Button> */}
              </div>
            </div>
          </Card>

          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: '0px' }}
          >
            {selectedUserIds.length > 0 && (
              <div style={{ padding: '10px 16px', background: '#eff6ff', borderBottom: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 13, color: '#1e40af', fontWeight: 500 }}>
                  {selectedUserIds.length} user{selectedUserIds.length > 1 ? 's' : ''} selected across table
                </span>
                <Space>
                  <Button size="small" type="primary" onClick={() => handleOpenAssignModal(null)}>
                    Assign Tools Role to Selected ({selectedUserIds.length})
                  </Button>
                  <Button size="small" onClick={() => setSelectedUserIds([])}>
                    Clear Selection
                  </Button>
                </Space>
              </div>
            )}
            <Table
              dataSource={filteredUserAssignments}
              rowKey="userId"
              loading={loadingUserRoles}
              rowSelection={{
                selectedRowKeys: selectedUserIds,
                onChange: (keys) => setSelectedUserIds(keys),
                preserveSelectedRowKeys: true,
              }}
              pagination={{
                current: userPagination.current,
                pageSize: userPagination.pageSize,
                pageSizeOptions: ['10', '15', '20', '50', '100'],
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} users`,
                onChange: (page, pageSize) => {
                  setUserPagination({ current: page, pageSize });
                },
                onShowSizeChange: (current, size) => {
                  setUserPagination({ current: 1, pageSize: size });
                },
              }}
              size="middle"
              scroll={{ x: 750 }}
              columns={[
                {
                  title: 'User ID',
                  dataIndex: 'userId',
                  key: 'userId',
                  width: 90,
                },
                {
                  title: 'User Name',
                  dataIndex: 'userName',
                  key: 'userName',
                  render: (text, u) => {
                    const fullName = u.firstName || u.lastName ? `${u.firstName || ''} ${u.lastName || ''}`.trim() : text;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <Avatar
                          src={u.profilePicturePath || undefined}
                          icon={!u.profilePicturePath ? <UserOutlined /> : undefined}
                          style={{ backgroundColor: '#e2e8f0', color: '#475569', flexShrink: 0 }}
                          size={32}
                        />
                        <div style={{ fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                          {fullName}
                        </div>
                      </div>
                    );
                  }
                },
                {
                  title: 'Contact Details',
                  key: 'contact',
                  width: 220,
                  render: (_, u) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 14 }}>
                      {u.mobileNo ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#334155' }}>
                          <FaPhoneAlt style={{ color: '#10b981', fontSize: 14 }} />
                          <span>{u.mobileNo}</span>
                        </div>
                      ) : null}
                      {u.address ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#64748b' }}>
                          <MdLocationOn style={{ color: '#ef4444', fontSize: 14 }} />
                          <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 180 }} title={u.address}>
                            {u.address}
                          </span>
                        </div>
                      ) : null}
                      {!u.mobileNo && !u.address && (
                        <span style={{ color: '#cbd5e1' }}>–</span>
                      )}
                    </div>
                  )
                },
                {
                  title: 'Assigned Tools Role',
                  dataIndex: 'roleName',
                  key: 'roleName',
                  render: (text, u) => {
                    const color = u.roleName === 'Developer' ? 'gold'
                      : u.roleName === 'Admin' ? 'red'
                        : u.roleName === 'Head' ? 'geekblue'
                          : u.roleName === 'Manager' ? 'blue'
                            : u.roleName === 'Operator' ? 'green'
                              : u.roleName === 'Data Reviewer' ? 'cyan'
                                : 'default';
                    return (
                      <Tag color={color} style={{ fontSize: 12, padding: '2px 8px' }}>
                        {text}
                      </Tag>
                    );
                  }
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 170,
                  align: 'center',
                  render: (_, u) => (
                    <Space size="small">
                      <Button
                        size="small"
                        icon={<EditOutlined />}
                        disabled={!canEdit}
                        onClick={() => handleOpenAssignModal(u)}
                      >
                      </Button>
                    </Space>
                  )
                }
              ]}
            />
          </Card>
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
            placeholder="e.g. Quality Assurance, Field Auditor"
            value={roleForm.roleName}
            disabled={editingRole?.isProtected}
            onChange={(e) => setRoleForm({ roleName: e.target.value })}
          />
        </div>
      </Modal>

      {/* User Role Assignment Modal */}
      <Modal
        title={assignForm.userIds && assignForm.userIds.length > 1 ? `Assign Tools Role to ${assignForm.userIds.length} Users` : "Assign Tools Role to User"}
        open={isAssignModalVisible}
        onCancel={() => setIsAssignModalVisible(false)}
        onOk={handleSaveUserAssignment}
        confirmLoading={savingAssignment}
        okText={assignForm.userIds && assignForm.userIds.length > 1 ? `Assign to ${assignForm.userIds.length} Users` : "Assign Role"}
        cancelText="Cancel"
      >
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <label style={{ fontWeight: 500, color: '#334155' }}>
                Select User(s) {assignForm.userIds?.length > 0 && <span style={{ color: '#2563eb' }}>({assignForm.userIds.length} selected)</span>}
              </label>
              {availableUsers.length > 0 && (
                <Space size="small">
                  <a
                    style={{ fontSize: 12, color: '#2563eb' }}
                    onClick={() => setAssignForm((prev) => ({ ...prev, userIds: availableUsers.map((u) => u.userId) }))}
                  >
                    Select All ({availableUsers.length})
                  </a>
                  <span style={{ color: '#cbd5e1' }}>|</span>
                  <a
                    style={{ fontSize: 12, color: '#64748b' }}
                    onClick={() => setAssignForm((prev) => ({ ...prev, userIds: [] }))}
                  >
                    Clear
                  </a>
                </Space>
              )}
            </div>
            <Select
              mode="multiple"
              showSearch
              placeholder="Search and select one or more users"
              value={assignForm.userIds}
              onChange={(val) => setAssignForm((prev) => ({ ...prev, userIds: val }))}
              style={{ width: '100%' }}
              loading={loadingAvailableUsers}
              maxTagCount="responsive"
              filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
              }
              options={availableUsers.map((u) => ({
                value: u.userId,
                label: `${u.fullName || u.userName} ${u.mobileNo ? `(${u.mobileNo})` : ''} ${u.address ? `- ${u.address}` : ''}`.trim()
              }))}
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#334155' }}>Select Tools Role</label>
            <Select
              placeholder="Select Tools Role"
              value={assignForm.roleId}
              onChange={(val) => setAssignForm((prev) => ({ ...prev, roleId: val }))}
              style={{ width: '100%' }}
              options={roles.map((r) => ({
                value: r.id,
                label: `${r.roleName} ${r.isProtected ? '(Protected)' : ''}`
              }))}
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default RolesPermissions;
