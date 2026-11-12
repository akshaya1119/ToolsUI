import React, { useEffect, useState, useMemo } from 'react';
import {
  Alert, Tabs, Table, Checkbox, Button, Select, Card, Tag, Space, message,
  Modal, Input, Typography, Tooltip, Popconfirm, Divider, Row, Col, Badge,
  Breadcrumb, Dropdown
} from 'antd';
import {
  SafetyCertificateOutlined, UserOutlined, TeamOutlined, ReloadOutlined,
  SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined,
  SearchOutlined, CheckCircleFilled, CloseCircleFilled, FilterOutlined,
  AppstoreOutlined, EyeOutlined, CheckSquareOutlined, DownOutlined,
  ExclamationCircleOutlined, UndoOutlined, StopOutlined, CheckCircleOutlined,
  MinusCircleOutlined, ThunderboltOutlined, UserSwitchOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import API from '../hooks/api';
import { useUserMap } from '../hooks/useUserMap';
import usePermissionsStore from '../stores/UserPermissions';
import useModulePermission from '../hooks/useModulePermission';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

const ACTION_COLUMNS = [
  { key: 'canView', label: 'View', tooltip: 'Grants read-only access to view pages, tables, and records' },
  { key: 'canCreate', label: 'Create', tooltip: 'Allows adding new records or uploading files' },
  { key: 'canEdit', label: 'Edit', tooltip: 'Permits modifying existing data, configurations, or records' },
  { key: 'canDelete', label: 'Delete', tooltip: 'Allows removing, archiving, or purging records' },
  { key: 'canExecute', label: 'Execute', tooltip: 'Permits running pipelines, batch jobs, and processing actions' },
  { key: 'canExport', label: 'Export', tooltip: 'Allows downloading Excel reports, PDFs, or CSV files' },
];

const RolesPermissions = () => {
  const { canView, canCreate, canEdit, canDelete } = useModulePermission('ROLES_PERMISSIONS');
  const [activeTab, setActiveTab] = useState('1');

  // Shared Data
  const [roles, setRoles] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingRoles, setLoadingRoles] = useState(false);
  const { userMap, userRoleMap, loading: loadingUsers } = useUserMap();
  const refreshCurrentPermissions = usePermissionsStore((state) => state.fetchPermissions);

  // --- TAB 1: Role Permissions Matrix State ---
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const selectedRole = useMemo(() => roles.find((r) => r.id === selectedRoleId), [roles, selectedRoleId]);
  const isDeveloperRole = useMemo(() => {
    return selectedRole?.id === 1 || selectedRole?.roleName?.toLowerCase() === 'developer';
  }, [selectedRole]);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [initialRolePermissions, setInitialRolePermissions] = useState([]);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  // Tab 1: Table Search and Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // --- TAB 2: User Overrides State ---
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userConfig, setUserConfig] = useState(null);
  const [userOverrides, setUserOverrides] = useState([]);
  const [initialUserOverrides, setInitialUserOverrides] = useState([]);
  const [assignedRoleId, setAssignedRoleId] = useState(null);
  const [initialAssignedRoleId, setInitialAssignedRoleId] = useState(null);
  const [loadingUserConfig, setLoadingUserConfig] = useState(false);
  const [savingUserOverrides, setSavingUserOverrides] = useState(false);

  // Tab 2: Search and Filters
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState('all'); // 'all', 'overrides', 'inherited', 'allowed', 'denied'

  // --- TAB 3: Role Management State ---
  const [isRoleModalVisible, setIsRoleModalVisible] = useState(false);
  const [editingRole, setEditingRole] = useState(null);
  const [roleForm, setRoleForm] = useState({ roleName: '', description: '' });
  const [savingRole, setSavingRole] = useState(false);

  // 1. Initial Load
  useEffect(() => {
    fetchRoles();
    fetchModules();
  }, []);

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
      setModules(res.data || []);
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
      let perms = res.data?.permissions || [];
      const currentRole = roles.find((r) => r.id === roleId);
      const isDev = roleId === 1 || currentRole?.roleName?.toLowerCase() === 'developer';
      if (isDev) {
        perms = perms.map((item) =>
          item.moduleCode === 'ROLES_PERMISSIONS'
            ? { ...item, canView: true, canCreate: true, canEdit: true, canDelete: true, canExecute: true, canExport: true }
            : item
        );
      }
      setRolePermissions(perms);
      setInitialRolePermissions(JSON.parse(JSON.stringify(perms)));
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
    if (isDeveloperRole && moduleCode === 'ROLES_PERMISSIONS') {
      message.warning('Roles & Permissions Admin access cannot be removed from Developer role.');
      return;
    }
    setRolePermissions((prev) =>
      prev.map((item) =>
        item.moduleCode === moduleCode ? { ...item, [actionKey]: checked } : item
      )
    );
  };

  const handleApplyPreset = (moduleCode, preset) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    if (isDeveloperRole && moduleCode === 'ROLES_PERMISSIONS' && preset !== 'full') {
      message.warning('Roles & Permissions Admin access cannot be modified for Developer role.');
      return;
    }

    setRolePermissions((prev) =>
      prev.map((item) => {
        if (item.moduleCode !== moduleCode) return item;
        switch (preset) {
          case 'full':
            return {
              ...item,
              canView: true,
              canCreate: true,
              canEdit: true,
              canDelete: true,
              canExecute: true,
              canExport: true,
            };
          case 'readonly':
            return {
              ...item,
              canView: true,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canExecute: false,
              canExport: false,
            };
          case 'none':
            return {
              ...item,
              canView: false,
              canCreate: false,
              canEdit: false,
              canDelete: false,
              canExecute: false,
              canExport: false,
            };
          default:
            return item;
        }
      })
    );
  };

  const handleDiscardChanges = () => {
    setRolePermissions(JSON.parse(JSON.stringify(initialRolePermissions)));
    message.info('Reverted unsaved modifications to original permissions.');
  };

  const handleSaveRolePermissions = async () => {
    if (!canEdit) {
      message.warning('You have view-only access. Saving role permissions is disabled.');
      return;
    }
    if (!selectedRoleId) return;
    setSavingRolePerms(true);
    try {
      const permsToSave = rolePermissions.map((item) =>
        isDeveloperRole && item.moduleCode === 'ROLES_PERMISSIONS'
          ? { ...item, canView: true, canCreate: true, canEdit: true, canDelete: true, canExecute: true, canExport: true }
          : item
      );
      await API.put(`/Permissions/role/${selectedRoleId}`, {
        permissions: permsToSave
      });
      message.success('Role permissions successfully updated and cached!');
      setInitialRolePermissions(JSON.parse(JSON.stringify(permsToSave)));
      refreshCurrentPermissions();
    } catch (err) {
      message.error('Failed to save permissions: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingRolePerms(false);
    }
  };

  // 3. User Overrides handling
  useEffect(() => {
    if (selectedUserId) {
      fetchUserConfig(selectedUserId);
    } else {
      setUserConfig(null);
      setUserOverrides([]);
      setInitialUserOverrides([]);
      setAssignedRoleId(null);
      setInitialAssignedRoleId(null);
    }
  }, [selectedUserId, userRoleMap]);

  const fetchUserConfig = async (userId) => {
    setLoadingUserConfig(true);
    try {
      const erpRole = userRoleMap?.[userId] || userRoleMap?.[String(userId)];
      const url = erpRole ? `/Permissions/user/${userId}?erpRoleId=${erpRole}` : `/Permissions/user/${userId}`;
      const res = await API.get(url);
      setUserConfig(res.data);
      const overrides = res.data.overrides || [];
      const roleId = res.data.assignedRole?.roleId || null;
      setUserOverrides(overrides);
      setInitialUserOverrides(JSON.parse(JSON.stringify(overrides)));
      setAssignedRoleId(roleId);
      setInitialAssignedRoleId(roleId);
    } catch (err) {
      message.error('Failed to fetch user permissions: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingUserConfig(false);
    }
  };

  const handleUserOverrideChange = (moduleCode, actionKey, value) => {
    if (!canEdit) {
      message.warning('You have view-only access. Setting user overrides is disabled.');
      return;
    }
    const isTargetUserDev = userConfig?.assignedRole?.roleId === 1 || 
      userConfig?.assignedRole?.roleName?.toLowerCase() === 'developer' ||
      assignedRoleId === 1;
    if (isTargetUserDev && moduleCode === 'ROLES_PERMISSIONS' && value === false) {
      message.warning('Cannot deny Roles & Permissions Admin access for Developer role.');
      return;
    }
    // value: null (inherit), true (allow), false (deny)
    setUserOverrides((prev) => {
      const existingIndex = prev.findIndex((item) => item.moduleCode === moduleCode);
      if (existingIndex >= 0) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, [actionKey]: value } : item
        );
      } else {
        return [...prev, { userId: selectedUserId, moduleCode, [actionKey]: value }];
      }
    });
  };

  const handleBulkUserOverride = (actionType) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying overrides is disabled.');
      return;
    }
    if (!selectedUserId) return;

    if (actionType === 'inherit') {
      setUserOverrides([]);
      message.info('All permissions reset to Inherit from Role.');
    } else if (actionType === 'allow_all') {
      const newOverrides = modules.map((m) => ({
        userId: selectedUserId,
        moduleCode: m.code,
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
        canExecute: true,
        canExport: true,
      }));
      setUserOverrides(newOverrides);
      message.success('Explicitly allowed all permissions for all modules.');
    } else if (actionType === 'deny_all') {
      const newOverrides = modules.map((m) => ({
        userId: selectedUserId,
        moduleCode: m.code,
        canView: false,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExecute: false,
        canExport: false,
      }));
      setUserOverrides(newOverrides);
      message.warning('Explicitly denied all permissions for all modules.');
    } else if (actionType === 'readonly_all') {
      const newOverrides = modules.map((m) => ({
        userId: selectedUserId,
        moduleCode: m.code,
        canView: true,
        canCreate: false,
        canEdit: false,
        canDelete: false,
        canExecute: false,
        canExport: false,
      }));
      setUserOverrides(newOverrides);
      message.success('Set Read-Only (View Allowed, others Denied) on all modules.');
    }
  };

  const handleDiscardUserChanges = () => {
    setUserOverrides(JSON.parse(JSON.stringify(initialUserOverrides)));
    setAssignedRoleId(initialAssignedRoleId);
    message.info('Reverted unsaved user overrides.');
  };

  const handleSaveUserConfiguration = async () => {
    if (!canEdit) {
      message.warning('You have view-only access. Saving user configuration is disabled.');
      return;
    }
    if (!selectedUserId) return;
    setSavingUserOverrides(true);
    try {
      await API.put(`/Permissions/user/${selectedUserId}`, {
        roleId: assignedRoleId,
        overrides: userOverrides
      });
      message.success(`Permissions configuration for User ${selectedUserId} saved!`);
      setInitialUserOverrides(JSON.parse(JSON.stringify(userOverrides)));
      setInitialAssignedRoleId(assignedRoleId);
      fetchUserConfig(selectedUserId);
      refreshCurrentPermissions();
    } catch (err) {
      message.error('Failed to save user settings: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingUserOverrides(false);
    }
  };

  // 4. Role Management
  const handleOpenRoleModal = (role = null) => {
    if (!canEdit) {
      message.warning('You have view-only access. Managing roles is disabled.');
      return;
    }
    setEditingRole(role);
    setRoleForm({
      roleName: role ? role.roleName : '',
      description: role ? role.description || '' : ''
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
        await API.put(`/Permissions/roles/${editingRole.id}`, roleForm);
        message.success('Role updated successfully');
      } else {
        await API.post('/Permissions/roles', roleForm);
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

  // --- TAB 1: Unsaved Changes Detection ---
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
        curr.canDelete !== orig.canDelete ||
        curr.canExecute !== orig.canExecute ||
        curr.canExport !== orig.canExport;
      if (isChanged) {
        map.set(curr.moduleCode, true);
      }
    });

    return map;
  }, [rolePermissions, initialRolePermissions]);

  const hasUnsavedChanges = modifiedRowsMap.size > 0;


  // --- TAB 2: Unsaved Changes Detection ---
  const hasUserOverrideChanges = useMemo(() => {
    if (!selectedUserId) return false;
    if (assignedRoleId !== initialAssignedRoleId) return true;
    return JSON.stringify(userOverrides) !== JSON.stringify(initialUserOverrides);
  }, [selectedUserId, assignedRoleId, initialAssignedRoleId, userOverrides, initialUserOverrides]);

  // --- TAB 1: Filtered Matrix Data ---
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
        item.canView, item.canCreate, item.canEdit,
        item.canDelete, item.canExecute, item.canExport
      ].filter(Boolean).length;

      if (statusFilter === 'configured') return activeCount > 0;
      if (statusFilter === 'full') return activeCount === 6;
      if (statusFilter === 'none') return activeCount === 0;

      return true;
    });
  }, [rolePermissions, modules, searchQuery, statusFilter]);

  // --- TAB 2: Filtered User Modules Data ---
  const filteredUserModules = useMemo(() => {
    return modules.filter((m) => {
      const query = userSearchQuery.trim().toLowerCase();
      if (query) {
        const matchName = m.displayName?.toLowerCase().includes(query);
        const matchCode = m.code?.toLowerCase().includes(query);
        if (!matchName && !matchCode) return false;
      }

      const override = userOverrides.find((o) => o.moduleCode === m.code);
      const hasOverride = override && ACTION_COLUMNS.some((col) => override[col.key] !== null && override[col.key] !== undefined);
      const hasAllowed = override && ACTION_COLUMNS.some((col) => override[col.key] === true);
      const hasDenied = override && ACTION_COLUMNS.some((col) => override[col.key] === false);

      if (userStatusFilter === 'overrides') return hasOverride;
      if (userStatusFilter === 'inherited') return !hasOverride;
      if (userStatusFilter === 'allowed') return hasAllowed;
      if (userStatusFilter === 'denied') return hasDenied;

      return true;
    });
  }, [modules, userOverrides, userSearchQuery, userStatusFilter]);

  // Selected Role Object (memoized above)

  // Quick Action Menu Builder for a Row (Tab 1)
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

  // Table Columns for Tab 1: Role Permissions Matrix
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
      key: action.key,
      align: 'center',
      width: 95,
      render: (_, record) => {
        const isLockedForDeveloper = isDeveloperRole && record.moduleCode === 'ROLES_PERMISSIONS';
        return (
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={isLockedForDeveloper ? 'Roles & Permissions Admin access cannot be removed from Developer role' : ''}>
              <span>
                <Checkbox
                  checked={isLockedForDeveloper ? true : !!record[action.key]}
                  disabled={!canEdit || isLockedForDeveloper}
                  onChange={(e) => {
                    if (isLockedForDeveloper) return;
                    handleRolePermissionChange(record.moduleCode, action.key, e.target.checked);
                  }}
                />
              </span>
            </Tooltip>
          </div>
        );
      }
    })),
    {
      title: 'Quick Actions',
      key: 'actions',
      align: 'center',
      fixed: 'right',
      width: 130,
      render: (_, record) => {
        const isLockedForDeveloper = isDeveloperRole && record.moduleCode === 'ROLES_PERMISSIONS';
        const activeCount = isLockedForDeveloper
          ? 6
          : [
              record.canView, record.canCreate, record.canEdit,
              record.canDelete, record.canExecute, record.canExport
            ].filter(Boolean).length;

        let statusText = 'Custom';
        let statusColor = 'default';
        if (activeCount === 6) {
          statusText = 'Full';
          statusColor = 'success';
        } else if (activeCount === 1 && record.canView) {
          statusText = 'Read';
          statusColor = 'processing';
        } else if (activeCount === 0) {
          statusText = 'None';
          statusColor = 'error';
        }

        return (
          <Space orientation="horizontal" size={6}>
            <Tag color={statusColor} style={{ margin: 0, fontSize: 11, fontWeight: 500 }}>
              {statusText}
            </Tag>
            <Tooltip title={isLockedForDeveloper ? 'Roles & Permissions Admin access cannot be modified for Developer role' : ''}>
              <span>
                <Dropdown menu={getQuickActionMenu(record)} trigger={['click']} disabled={!canEdit || isLockedForDeveloper}>
                  <Button size="small" type="text" icon={<DownOutlined style={{ fontSize: 10 }} />} disabled={!canEdit || isLockedForDeveloper} />
                </Dropdown>
              </span>
            </Tooltip>
          </Space>
        );
      }
    }
  ];

  // Helper render for User Overrides (Tab 2) Three-State Selector
  const renderOverrideSelector = (moduleCode, actionKey) => {
    const override = userOverrides.find((o) => o.moduleCode === moduleCode);
    const value = override ? override[actionKey] : null;

    // Check effective role value calculated from userConfig
    const effectivePermissionFlag = userConfig?.effectivePermissions?.[moduleCode]?.[actionKey];
    const roleValue = effectivePermissionFlag !== undefined ? effectivePermissionFlag : false;

    // Visual styles depending on state
    let bgStyle = { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' };
    if (value === true) {
      bgStyle = { backgroundColor: '#f0fdf4', borderColor: '#86efac' };
    } else if (value === false) {
      bgStyle = { backgroundColor: '#fef2f2', borderColor: '#fca5a5' };
    }

    const isTargetUserDev = userConfig?.assignedRole?.roleId === 1 || 
      userConfig?.assignedRole?.roleName?.toLowerCase() === 'developer' ||
      assignedRoleId === 1;
    const isLockedForDeveloper = isTargetUserDev && moduleCode === 'ROLES_PERMISSIONS';

    return (
      <Tooltip title={isLockedForDeveloper ? 'Roles & Permissions Admin access cannot be overridden for Developer role' : ''}>
        <span>
          <Select
            size="small"
            style={{ width: 115, ...bgStyle, borderRadius: 6 }}
            disabled={!canEdit || isLockedForDeveloper}
            value={isLockedForDeveloper ? 'allow' : (value === null || value === undefined ? 'inherit' : value ? 'allow' : 'deny')}
            onChange={(val) => {
              if (isLockedForDeveloper) return;
              const resolvedVal = val === 'inherit' ? null : val === 'allow';
              handleUserOverrideChange(moduleCode, actionKey, resolvedVal);
            }}
        options={[
          {
            value: 'inherit',
            label: (
              <Tooltip title={`Inherit permission from role (currently ${roleValue ? 'Allowed' : 'Denied'})`}>
                <span style={{ fontSize: 11, color: '#64748b', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <MinusCircleOutlined style={{ fontSize: 10, color: '#94a3b8' }} />
                  Inherit ({roleValue ? 'Yes' : 'No'})
                </span>
              </Tooltip>
            ),
          },
          {
            value: 'allow',
            label: (
              <Tooltip title="Explicitly allow this action for this user">
                <span style={{ fontSize: 11, color: '#15803d', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CheckCircleFilled style={{ fontSize: 11, color: '#16a34a' }} />
                  Allow
                </span>
              </Tooltip>
            ),
          },
          {
            value: 'deny',
            label: (
              <Tooltip title="Explicitly deny this action for this user">
                <span style={{ fontSize: 11, color: '#b91c1c', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <CloseCircleFilled style={{ fontSize: 11, color: '#dc2626' }} />
                  Deny
                </span>
              </Tooltip>
            ),
          },
        ]}
      />
        </span>
      </Tooltip>
    );
  };

  const userOverrideColumns = [
    {
      title: 'Module / Feature',
      dataIndex: 'code',
      key: 'code',
      fixed: 'left',
      width: 280,
      render: (code, record) => {
        const override = userOverrides.find((o) => o.moduleCode === code);
        const hasCustomOverride = override && ACTION_COLUMNS.some((col) => override[col.key] !== null && override[col.key] !== undefined);
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {hasCustomOverride ? (
              <span
                style={{
                  width: 4,
                  height: 32,
                  borderRadius: 2,
                  backgroundColor: '#3b82f6',
                  flexShrink: 0
                }}
                title="Has individual overrides"
              />
            ) : (
              <span style={{ width: 4, height: 32, flexShrink: 0 }} />
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1e293b', lineHeight: 1.3 }}>
                {record.displayName || code}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span style={{ fontSize: 11, fontFamily: 'monospace', color: '#64748b' }}>
                  {code}
                </span>
                {hasCustomOverride && (
                  <Tag color="blue" style={{ fontSize: 10, padding: '0 4px', margin: 0, lineHeight: '16px' }}>
                    Overridden
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
      key: action.key,
      align: 'center',
      width: 125,
      render: (_, r) => renderOverrideSelector(r.code, action.key)
    }))
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

      {/* NAVIGATION SUB-TABS */}
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
                <SafetyCertificateOutlined style={{ marginRight: 6 }} />
                Role Permissions
              </span>
            ),
          },
          {
            key: '2',
            label: (
              <span>
                <UserOutlined style={{ marginRight: 6 }} />
                User Overrides
              </span>
            ),
          },
          {
            key: '3',
            label: (
              <span>
                <TeamOutlined style={{ marginRight: 6 }} />
                Roles Management
              </span>
            ),
          },
        ]}
      />

      {/* TAB 1: ROLE PERMISSIONS MATRIX */}
      {activeTab === '1' && (
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
                      {selectedRole.description && (
                        <span
                          style={{
                            fontSize: 12,
                            color: '#64748b',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={selectedRole.description}
                        >
                          {selectedRole.description}
                        </span>
                      )}
                    </div>
                  </Space>
                </Col>
              )}

              {/* Action Buttons */}
              <Col xs={24} sm={24} md={selectedRole ? 8 : 15} lg={selectedRole ? 8 : 15} style={{ textAlign: 'right' }}>
                <Space size={8} wrap style={{ marginTop: selectedRole ? 16 : 0 }}>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => selectedRoleId && fetchRolePermissions(selectedRoleId)}
                    loading={loadingRolePerms}
                  >
                    Reload
                  </Button>
                  {hasUnsavedChanges && (
                    <Button
                      icon={<UndoOutlined />}
                      onClick={handleDiscardChanges}
                    >
                      Discard
                    </Button>
                  )}
                  <Tooltip title={!canEdit ? 'View-only: Saving role permissions is disabled' : ''}>
                    <span>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={savingRolePerms}
                        disabled={!canEdit || !hasUnsavedChanges}
                        onClick={handleSaveRolePermissions}
                        style={{
                          backgroundColor: (!canEdit || !hasUnsavedChanges) ? undefined : '#2563eb',
                          borderColor: (!canEdit || !hasUnsavedChanges) ? undefined : '#2563eb'
                        }}
                      >
                        Save Role Permissions
                      </Button>
                    </span>
                  </Tooltip>
                </Space>
              </Col>
            </Row>

            {selectedRole?.id === 1 && (
              <div
                style={{
                  marginTop: 14,
                  padding: '8px 12px',
                  backgroundColor: '#eff6ff',
                  border: '1px solid #bfdbfe',
                  borderRadius: 6,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <InfoCircleOutlined style={{ color: '#2563eb' }} />
                <Text style={{ fontSize: 12.5, color: '#1e40af' }}>
                  <strong>Developer Role Notice:</strong> Role 1 (Developer) permissions are configurable per module. Access to Roles & Permissions Admin remains permanently active as an administrative fail-safe.
                </Text>
              </div>
            )}
          </Card>

          {/* F. SEARCH, FILTERING & TABLE TOOLBAR */}
          <Card
            bordered
            style={{
              borderRadius: 10,
              boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
              borderColor: '#e2e8f0',
            }}
            bodyStyle={{ padding: 0 }}
          >
            <div
              style={{
                padding: '12px 16px',
                borderBottom: '1px solid #f1f5f9',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12,
                background: '#fafafa',
                borderTopLeftRadius: 10,
                borderTopRightRadius: 10
              }}
            >
              <Space wrap size={10}>
                <Input
                  prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                  placeholder="Search module name or code..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  allowClear
                  style={{ width: 260 }}
                />

                <Select
                  value={statusFilter}
                  onChange={setStatusFilter}
                  style={{ width: 170 }}
                  suffixIcon={<FilterOutlined style={{ color: '#94a3b8' }} />}
                >
                  <Option value="all">All Modules ({rolePermissions.length})</Option>
                  <Option value="configured">Configured (≥1 grant)</Option>
                  <Option value="full">Full Access (All 6)</Option>
                  <Option value="none">No Access (0 grants)</Option>
                </Select>
              </Space>

              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                {hasUnsavedChanges && (
                  <Badge
                    count={`${modifiedRowsMap.size} unsaved module${modifiedRowsMap.size > 1 ? 's' : ''}`}
                    style={{ backgroundColor: '#f59e0b' }}
                  />
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
                  <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                    <SearchOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                    No modules match the current search or filter.
                  </div>
                )
              }}
            />
          </Card>

          {/* G. STICKY SAVE CHANGES EXPERIENCE WHEN MODIFIED */}
          {hasUnsavedChanges && (
            <div
              style={{
                position: 'sticky',
                bottom: 16,
                zIndex: 90,
                backgroundColor: '#ffffff',
                border: '1px solid #fed7aa',
                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                borderRadius: 8,
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ExclamationCircleOutlined style={{ color: '#ea580c', fontSize: 18 }} />
                <div>
                  <Text strong style={{ color: '#9a3412', fontSize: 13 }}>
                    You have unsaved permission modifications!
                  </Text>
                  <div style={{ fontSize: 12, color: '#c2410c' }}>
                    {modifiedRowsMap.size} module{modifiedRowsMap.size > 1 ? 's' : ''} changed for role: <strong>{selectedRole?.roleName}</strong>.
                  </div>
                </div>
              </div>

              <Space>
                <Button onClick={handleDiscardChanges}>
                  Discard Changes
                </Button>
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={savingRolePerms}
                  onClick={handleSaveRolePermissions}
                  style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                >
                  Save Role Permissions
                </Button>
              </Space>
            </div>
          )}
        </Space>
      )}

      {/* TAB 2: USER OVERRIDES */}
      {activeTab === '2' && (
        <Space direction="vertical" size={16} style={{ width: '100%' }}>
          {/* B. USER INFORMATION & DUAL ROLE SECTION (COMFORTABLE BALANCED LAYOUT) */}
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
              {/* User Selection */}
              <Col xs={24} sm={12} md={9} lg={9}>
                <Space direction="vertical" size={5} style={{ width: '100%' }}>
                  <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Select User to Configure
                  </Text>
                  <Select
                    showSearch
                    placeholder="Search user by name or ID..."
                    style={{ width: '100%' }}
                    value={selectedUserId}
                    onChange={setSelectedUserId}
                    loading={loadingUsers}
                    filterOption={(input, option) =>
                      (option?.children ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                  >
                    {Object.keys(userMap)
                      .filter((k) => !isNaN(Number(k)))
                      .map((id) => (
                        <Option key={id} value={Number(id)}>
                          {userMap[id]} (User ID: {id})
                        </Option>
                      ))}
                  </Select>
                </Space>
              </Col>

              {userConfig && (
                <>
                  {/* Effective Role */}
                  <Col xs={24} sm={12} md={7} lg={7}>
                    <Space direction="vertical" size={5} style={{ width: '100%' }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Effective Role
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
                        <SafetyCertificateOutlined style={{ color: '#2563eb', fontSize: 14 }} />
                        <span style={{ fontWeight: 600, fontSize: 13.5, color: '#0f172a' }}>
                          {userConfig.effectiveRole?.roleName}
                        </span>
                        {userConfig.effectiveRole?.isSuperuser && (
                          <Tag color="gold" style={{ margin: 0, fontSize: 11 }}>Superuser</Tag>
                        )}
                      </div>
                    </Space>
                  </Col>

                  {/* Assign Local Tools Role */}
                  <Col xs={24} sm={12} md={8} lg={8}>
                    <Space direction="vertical" size={5} style={{ width: '100%' }}>
                      <Text style={{ fontSize: 12, fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        Assign Local Tools Role
                      </Text>
                      <Select
                        style={{ width: '100%' }}
                        placeholder="Inherit ERP Role"
                        allowClear
                        disabled={!canEdit}
                        value={assignedRoleId}
                        onChange={setAssignedRoleId}
                      >
                        {roles.map((r) => (
                          <Option key={r.id} value={r.id}>
                            {r.roleName} {r.isSystemRole && '(Built-in)'}
                          </Option>
                        ))}
                      </Select>
                    </Space>
                  </Col>
                </>
              )}
            </Row>
          </Card>

          {selectedUserId ? (
            <>

              {/* F & G. TOOLBAR & PERMISSION MATRIX */}
              <Card
                bordered
                style={{
                  borderRadius: 10,
                  boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                  borderColor: '#e2e8f0',
                }}
                bodyStyle={{ padding: 0 }}
              >
                <div
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid #f1f5f9',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 12,
                    background: '#fafafa',
                    borderTopLeftRadius: 10,
                    borderTopRightRadius: 10
                  }}
                >
                  <Space wrap size={10}>
                    <Input
                      prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
                      placeholder="Search module name or code..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      allowClear
                      style={{ width: 250 }}
                    />

                    <Select
                      value={userStatusFilter}
                      onChange={setUserStatusFilter}
                      style={{ width: 180 }}
                      suffixIcon={<FilterOutlined style={{ color: '#94a3b8' }} />}
                    >
                      <Option value="all">All Modules ({modules.length})</Option>
                      <Option value="overrides">With Overrides</Option>
                      <Option value="inherited">Inherited Only</Option>
                      <Option value="allowed">Has Explicit Allows</Option>
                      <Option value="denied">Has Explicit Denials</Option>
                    </Select>
                  </Space>

                  <Space wrap size={10}>
                    {/* BULK ACTIONS DROPDOWN */}
                    <Dropdown
                      menu={{
                        items: [
                          {
                            key: 'inherit',
                            label: 'Reset All to Inherit (Clear Overrides)',
                            icon: <UndoOutlined />,
                            onClick: () => handleBulkUserOverride('inherit'),
                          },
                          {
                            type: 'divider',
                          },
                          {
                            key: 'allow_all',
                            label: 'Explicitly Allow All Actions',
                            icon: <CheckCircleFilled style={{ color: '#16a34a' }} />,
                            onClick: () => handleBulkUserOverride('allow_all'),
                          },
                          {
                            key: 'readonly_all',
                            label: 'Set All to Read Only (View Only)',
                            icon: <EyeOutlined style={{ color: '#2563eb' }} />,
                            onClick: () => handleBulkUserOverride('readonly_all'),
                          },
                          {
                            key: 'deny_all',
                            label: 'Explicitly Deny All Actions',
                            icon: <StopOutlined style={{ color: '#dc2626' }} />,
                            danger: true,
                            onClick: () => handleBulkUserOverride('deny_all'),
                          },
                        ],
                      }}
                      trigger={['click']}
                      disabled={!canEdit}
                    >
                      <Button icon={<ThunderboltOutlined />}>
                        Bulk Actions <DownOutlined style={{ fontSize: 10 }} />
                      </Button>
                    </Dropdown>

                    <Button
                      icon={<ReloadOutlined />}
                      onClick={() => fetchUserConfig(selectedUserId)}
                      loading={loadingUserConfig}
                    >
                      Reload
                    </Button>

                    <Tooltip title={!canEdit ? 'View-only: Saving user configuration is disabled' : ''}>
                      <span>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={savingUserOverrides}
                          disabled={!canEdit || !hasUserOverrideChanges}
                          onClick={handleSaveUserConfiguration}
                          style={{
                            backgroundColor: (!canEdit || !hasUserOverrideChanges) ? undefined : '#2563eb',
                            borderColor: (!canEdit || !hasUserOverrideChanges) ? undefined : '#2563eb'
                          }}
                        >
                          Save User Configuration
                        </Button>
                      </span>
                    </Tooltip>
                  </Space>
                </div>

                {/* D. PERMISSION MATRIX */}
                <Table
                  dataSource={filteredUserModules}
                  columns={userOverrideColumns}
                  rowKey="code"
                  loading={loadingUserConfig}
                  pagination={false}
                  size="middle"
                  scroll={{ x: 1020, y: 520 }}
                  locale={{
                    emptyText: (
                      <div style={{ padding: '32px 0', textAlign: 'center', color: '#94a3b8' }}>
                        <SearchOutlined style={{ fontSize: 24, marginBottom: 8, display: 'block' }} />
                        No modules match the current search or filter.
                      </div>
                    )
                  }}
                />
              </Card>

              {/* H. STICKY SAVE ACTIONS BAR */}
              {hasUserOverrideChanges && (
                <div
                  style={{
                    position: 'sticky',
                    bottom: 16,
                    zIndex: 90,
                    backgroundColor: '#ffffff',
                    border: '1px solid #fed7aa',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    borderRadius: 8,
                    padding: '12px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <ExclamationCircleOutlined style={{ color: '#ea580c', fontSize: 18 }} />
                    <div>
                      <Text strong style={{ color: '#9a3412', fontSize: 13 }}>
                        Unsaved user configuration modifications!
                      </Text>
                      <div style={{ fontSize: 12, color: '#c2410c' }}>
                        Overrides or local role changed for user: <strong>{userMap[selectedUserId]} (ID: {selectedUserId})</strong>.
                      </div>
                    </div>
                  </div>

                  <Space>
                    <Button onClick={handleDiscardUserChanges}>
                      Discard Changes
                    </Button>
                    <Button
                      type="primary"
                      icon={<SaveOutlined />}
                      loading={savingUserOverrides}
                      onClick={handleSaveUserConfiguration}
                      style={{ backgroundColor: '#2563eb', borderColor: '#2563eb' }}
                    >
                      Save User Configuration
                    </Button>
                  </Space>
                </div>
              )}
            </>
          ) : (
            <Card
              bordered
              style={{
                borderRadius: 10,
                borderColor: '#e2e8f0',
                boxShadow: '0 1px 3px rgba(15, 23, 42, 0.05)',
                textAlign: 'center',
                padding: '48px 0'
              }}
            >
              <UserOutlined style={{ fontSize: 42, marginBottom: 12, display: 'block', color: '#cbd5e1' }} />
              <Title level={5} style={{ margin: 0, color: '#475569' }}>No User Selected</Title>
              <Text type="secondary" style={{ fontSize: 13 }}>
                Select a user from the dropdown above to inspect effective permissions and apply individual overrides.
              </Text>
            </Card>
          )}
        </Space>
      )}

      {/* TAB 3: ROLES MANAGEMENT */}
      {activeTab === '3' && (
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
              { title: 'Description', dataIndex: 'description', key: 'description' },
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
                render: (_, r) => (
                  <Space size="small">
                    <Tooltip title={!canEdit ? 'View-only: Editing roles is disabled' : ''}>
                      <span>
                        <Button
                          size="small"
                          icon={<EditOutlined />}
                          disabled={!canEdit}
                          onClick={() => handleOpenRoleModal(r)}
                        >
                          Edit
                        </Button>
                      </span>
                    </Tooltip>
                    {!r.isSystemRole && (
                      <Popconfirm
                        title="Delete Role"
                        description="Are you sure you want to delete this custom role?"
                        onConfirm={() => handleDeleteRole(r.id)}
                        okText="Yes"
                        cancelText="No"
                        disabled={!canDelete}
                      >
                        <Tooltip title={!canDelete ? 'View-only: Deleting roles is disabled' : ''}>
                          <span>
                            <Button size="small" danger icon={<DeleteOutlined />} disabled={!canDelete}>
                              Delete
                            </Button>
                          </span>
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </Space>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* Role Create/Edit Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Custom Role'}
        open={isRoleModalVisible}
        onCancel={() => setIsRoleModalVisible(false)}
        onOk={handleSaveRole}
        confirmLoading={savingRole}
      >
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#334155' }}>Role Name</label>
          <Input
            placeholder="e.g. Quality Assurance, Data Reviewer"
            value={roleForm.roleName}
            disabled={editingRole?.isSystemRole}
            onChange={(e) => setRoleForm((prev) => ({ ...prev, roleName: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 6, fontWeight: 500, color: '#334155' }}>Description</label>
          <TextArea
            rows={3}
            placeholder="Role purpose and responsibility..."
            value={roleForm.description}
            onChange={(e) => setRoleForm((prev) => ({ ...prev, description: e.target.value }))}
          />
        </div>
      </Modal>
    </div>
  );
};

export default RolesPermissions;
