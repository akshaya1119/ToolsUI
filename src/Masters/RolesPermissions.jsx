import React, { useEffect, useState } from 'react';
import {
  Alert, Tabs, Table, Checkbox, Button, Select, Card, Tag, Space, message,
  Modal, Input, Typography, Tooltip, Popconfirm, Divider, Row, Col, Badge, Spin
} from 'antd';
import {
  SafetyCertificateOutlined, UserOutlined, TeamOutlined, HistoryOutlined,
  PlusOutlined, SaveOutlined, ReloadOutlined, DeleteOutlined, EditOutlined,
  CheckCircleOutlined, CloseCircleOutlined, InfoCircleOutlined
} from '@ant-design/icons';
import API from '../hooks/api';
import { useUserMap, getFirstNameFromUserId } from '../hooks/useUserMap';
import usePermissionsStore from '../stores/UserPermissions';
import useModulePermission from '../hooks/useModulePermission';

const { Title, Text, Paragraph } = Typography;
const { Option } = Select;
const { TextArea } = Input;

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
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loadingRolePerms, setLoadingRolePerms] = useState(false);
  const [savingRolePerms, setSavingRolePerms] = useState(false);

  // --- TAB 2: User Overrides State ---
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [userConfig, setUserConfig] = useState(null);
  const [userOverrides, setUserOverrides] = useState([]);
  const [assignedRoleId, setAssignedRoleId] = useState(null);
  const [loadingUserConfig, setLoadingUserConfig] = useState(false);
  const [savingUserOverrides, setSavingUserOverrides] = useState(false);

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
      setRolePermissions(res.data?.permissions || []);
    } catch (err) {
      message.error('Failed to load permissions for role: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoadingRolePerms(false);
    }
  };

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

  const handleSelectAllForModule = (moduleCode, checked) => {
    if (!canEdit) {
      message.warning('You have view-only access. Modifying permissions is disabled.');
      return;
    }
    setRolePermissions((prev) =>
      prev.map((item) =>
        item.moduleCode === moduleCode
          ? {
              ...item,
              canView: checked,
              canCreate: checked,
              canEdit: checked,
              canDelete: checked,
              canExecute: checked,
              canExport: checked
            }
          : item
      )
    );
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
        permissions: rolePermissions
      });
      message.success('Role permissions successfully updated!');
      refreshCurrentPermissions();
    } catch (err) {
      message.error('Failed to save permissions: ' + (err.response?.data?.message || err.message));
    } finally {
      setSavingRolePerms(false);
    }
  };

  // 3. Fetch user config when selected user changes
  useEffect(() => {
    if (selectedUserId) {
      fetchUserConfig(selectedUserId);
    } else {
      setUserConfig(null);
      setUserOverrides([]);
      setAssignedRoleId(null);
    }
  }, [selectedUserId, userRoleMap]);

  const fetchUserConfig = async (userId) => {
    setLoadingUserConfig(true);
    try {
      const erpRole = userRoleMap?.[userId] || userRoleMap?.[String(userId)];
      const url = erpRole ? `/Permissions/user/${userId}?erpRoleId=${erpRole}` : `/Permissions/user/${userId}`;
      const res = await API.get(url);
      setUserConfig(res.data);
      setUserOverrides(res.data.overrides || []);
      setAssignedRoleId(res.data.assignedRole?.roleId || null);
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
    // value: null (inherit), true (allow), false (deny)
    setUserOverrides((prev) => {
      const existing = prev.find((item) => item.moduleCode === moduleCode);
      if (existing) {
        return prev.map((item) =>
          item.moduleCode === moduleCode ? { ...item, [actionKey]: value } : item
        );
      } else {
        return [...prev, { userId: selectedUserId, moduleCode, [actionKey]: value }];
      }
    });
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

  // Table Columns for Tab 1: Role Permissions
  const roleMatrixColumns = [
    {
      title: 'Module / Feature',
      dataIndex: 'moduleCode',
      key: 'moduleCode',
      width: 250,
      render: (code) => {
        const mod = modules.find((m) => m.code === code);
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{mod ? mod.displayName : code}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{code}</Text>
          </div>
        );
      }
    },
    {
      title: 'View',
      key: 'canView',
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!record.canView}
          disabled={!canEdit}
          onChange={(e) => handleRolePermissionChange(record.moduleCode, 'canView', e.target.checked)}
        />
      )
    },
    {
      title: 'Create',
      key: 'canCreate',
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!record.canCreate}
          disabled={!canEdit}
          onChange={(e) => handleRolePermissionChange(record.moduleCode, 'canCreate', e.target.checked)}
        />
      )
    },
    {
      title: 'Edit',
      key: 'canEdit',
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!record.canEdit}
          disabled={!canEdit}
          onChange={(e) => handleRolePermissionChange(record.moduleCode, 'canEdit', e.target.checked)}
        />
      )
    },
    {
      title: 'Delete',
      key: 'canDelete',
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!record.canDelete}
          disabled={!canEdit}
          onChange={(e) => handleRolePermissionChange(record.moduleCode, 'canDelete', e.target.checked)}
        />
      )
    },
    {
      title: 'Execute',
      key: 'canExecute',
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!record.canExecute}
          disabled={!canEdit}
          onChange={(e) => handleRolePermissionChange(record.moduleCode, 'canExecute', e.target.checked)}
        />
      )
    },
    {
      title: 'Export',
      key: 'canExport',
      align: 'center',
      render: (_, record) => (
        <Checkbox
          checked={!!record.canExport}
          disabled={!canEdit}
          onChange={(e) => handleRolePermissionChange(record.moduleCode, 'canExport', e.target.checked)}
        />
      )
    },
    {
      title: 'Quick Actions',
      key: 'actions',
      align: 'center',
      width: 140,
      render: (_, record) => {
        const allChecked = record.canView && record.canCreate && record.canEdit && record.canDelete && record.canExecute && record.canExport;
        return (
          <Space orientation="horizontal" size="small">
            <Button
              size="small"
              type="link"
              disabled={!canEdit}
              onClick={() => handleSelectAllForModule(record.moduleCode, !allChecked)}
            >
              {allChecked ? 'Clear' : 'All'}
            </Button>
          </Space>
        );
      }
    }
  ];

  // Helper render for User Overrides (Tab 2)
  const renderOverrideSelector = (moduleCode, actionKey) => {
    const override = userOverrides.find((o) => o.moduleCode === moduleCode);
    const value = override ? override[actionKey] : null;

    // effective role value
    const rolePerm = rolePermissions.find((r) => r.moduleCode === moduleCode);
    const roleValue = rolePerm ? !!rolePerm[actionKey] : false;

    return (
      <Select
        size="small"
        style={{ width: 100 }}
        disabled={!canEdit}
        value={value === null || value === undefined ? 'inherit' : value ? 'allow' : 'deny'}
        onChange={(val) => {
          const resolvedVal = val === 'inherit' ? null : val === 'allow';
          handleUserOverrideChange(moduleCode, actionKey, resolvedVal);
        }}
      >
        <Option value="inherit">
          <Text type="secondary" style={{ fontSize: 11 }}>Inherit ({roleValue ? 'Yes' : 'No'})</Text>
        </Option>
        <Option value="allow">
          <Tag color="success" style={{ margin: 0, fontSize: 11 }}>Allow</Tag>
        </Option>
        <Option value="deny">
          <Tag color="error" style={{ margin: 0, fontSize: 11 }}>Deny</Tag>
        </Option>
      </Select>
    );
  };

  // Table Columns for Tab 2: User Overrides
  const userOverrideColumns = [
    {
      title: 'Module / Feature',
      dataIndex: 'moduleCode',
      key: 'moduleCode',
      width: 220,
      render: (code) => {
        const mod = modules.find((m) => m.code === code);
        return (
          <div>
            <div style={{ fontWeight: 600 }}>{mod ? mod.displayName : code}</div>
            <Text type="secondary" style={{ fontSize: 11 }}>{code}</Text>
          </div>
        );
      }
    },
    {
      title: 'View',
      key: 'canView',
      align: 'center',
      render: (_, r) => renderOverrideSelector(r.moduleCode, 'canView')
    },
    {
      title: 'Create',
      key: 'canCreate',
      align: 'center',
      render: (_, r) => renderOverrideSelector(r.moduleCode, 'canCreate')
    },
    {
      title: 'Edit',
      key: 'canEdit',
      align: 'center',
      render: (_, r) => renderOverrideSelector(r.moduleCode, 'canEdit')
    },
    {
      title: 'Delete',
      key: 'canDelete',
      align: 'center',
      render: (_, r) => renderOverrideSelector(r.moduleCode, 'canDelete')
    },
    {
      title: 'Execute',
      key: 'canExecute',
      align: 'center',
      render: (_, r) => renderOverrideSelector(r.moduleCode, 'canExecute')
    },
    {
      title: 'Export',
      key: 'canExport',
      align: 'center',
      render: (_, r) => renderOverrideSelector(r.moduleCode, 'canExport')
    }
  ];

  // Selected role object
  const selectedRole = roles.find((r) => r.id === selectedRoleId);

  if (!canView) {
    return (
      <div style={{ padding: '24px 16px' }}>
        <Alert
          message="Access Denied"
          description="You do not have permission to view Roles & Permissions management."
          type="error"
          showIcon
        />
      </div>
    );
  }

  return (
    <div style={{ padding: '4px 8px' }}>
      <div style={{ marginBottom: 16 }}>
        <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
          <SafetyCertificateOutlined style={{ color: '#1677ff' }} />
          Roles & Permissions Management
        </Title>
        <Paragraph type="secondary" style={{ margin: '4px 0 0 0', fontSize: 13 }}>
          Manage role default permissions, assign Tools-specific local roles, and configure individual user permission overrides.
        </Paragraph>
      </div>

      {!canEdit && (
        <Alert
          message="Read Only Mode"
          description="You have view-only access to Roles & Permissions. Modifying roles, updating permissions, and assigning user overrides are disabled."
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      <Tabs activeKey={activeTab} onChange={setActiveTab} type="card">
        {/* TAB 1: ROLE PERMISSIONS MATRIX */}
        <Tabs.TabPane
          tab={
            <span>
              <TeamOutlined /> Role Permissions
            </span>
          }
          key="1"
        >
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Space size="middle">
                  <Text strong>Select Role:</Text>
                  <Select
                    style={{ width: 220 }}
                    value={selectedRoleId}
                    onChange={setSelectedRoleId}
                    loading={loadingRoles}
                  >
                    {roles.map((r) => (
                      <Option key={r.id} value={r.id}>
                        {r.roleName} {r.isSystemRole && '(Built-in)'}
                      </Option>
                    ))}
                  </Select>

                  {selectedRole && (
                    <Space size="small">
                      <Tag color={selectedRole.isSystemRole ? 'blue' : 'purple'}>
                        {selectedRole.isSystemRole ? 'System Role' : 'Custom Role'}
                      </Tag>
                      {selectedRole.description && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {selectedRole.description}
                        </Text>
                      )}
                    </Space>
                  )}
                </Space>
              </Col>

              <Col>
                <Space>
                  <Button
                    icon={<ReloadOutlined />}
                    onClick={() => selectedRoleId && fetchRolePermissions(selectedRoleId)}
                  >
                    Reload
                  </Button>
                  <Tooltip title={!canEdit ? "View-only: Saving role permissions is disabled" : ""}>
                    <span>
                      <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        loading={savingRolePerms}
                        disabled={!canEdit}
                        onClick={handleSaveRolePermissions}
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
                  padding: '8px 12px',
                  backgroundColor: '#e6f4ff',
                  border: '1px solid #91caff',
                  borderRadius: 6,
                  marginBottom: 12,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8
                }}
              >
                <InfoCircleOutlined style={{ color: '#1677ff' }} />
                <Text style={{ fontSize: 12 }}>
                  <strong>Developer Role Notice:</strong> Role 1 (Developer) permissions are fully configurable per module. Access to Roles & Permissions Admin remains permanently active as a safety fail-safe.
                </Text>
              </div>
            )}

            <Table
              dataSource={rolePermissions}
              columns={roleMatrixColumns}
              rowKey="moduleCode"
              loading={loadingRolePerms}
              pagination={false}
              size="small"
              bordered
            />
          </Card>
        </Tabs.TabPane>

        {/* TAB 2: USER OVERRIDES & LOCAL ROLE ASSIGNMENT */}
        <Tabs.TabPane
          tab={
            <span>
              <UserOutlined /> User Overrides
            </span>
          }
          key="2"
        >
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
              <Col xs={24} md={12}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Text strong>Select User:</Text>
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
                      .filter((k) => !isNaN(Number(k))) // only numeric keys
                      .map((id) => (
                        <Option key={id} value={Number(id)}>
                          {userMap[id]} (User ID: {id})
                        </Option>
                      ))}
                  </Select>
                </Space>
              </Col>

              {userConfig && (
                <Col xs={24} md={12}>
                  <Card size="small" style={{ background: '#fafafa' }}>
                    <Row gutter={8} align="middle">
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Effective Tools Role:</Text>
                        <div style={{ fontWeight: 600 }}>
                          {userConfig.effectiveRole?.roleName}
                          {userConfig.effectiveRole?.isSuperuser && (
                            <Tag color="gold" style={{ marginLeft: 6 }}>Superuser</Tag>
                          )}
                        </div>
                      </Col>
                      <Col span={12}>
                        <Text type="secondary" style={{ fontSize: 12 }}>Assign Local Tools Role:</Text>
                        <Select
                          style={{ width: '100%', marginTop: 2 }}
                          placeholder="Inherit ERP Role"
                          allowClear
                          disabled={!canEdit}
                          value={assignedRoleId}
                          onChange={setAssignedRoleId}
                        >
                          {roles.map((r) => (
                            <Option key={r.id} value={r.id}>
                              {r.roleName}
                            </Option>
                          ))}
                        </Select>
                      </Col>
                    </Row>
                  </Card>
                </Col>
              )}
            </Row>

            {selectedUserId ? (
              <>
                <Row justify="space-between" align="middle" style={{ marginBottom: 12 }}>
                  <Col>
                    <Text strong>Granular Module Overrides for User {selectedUserId}:</Text>
                    <Paragraph type="secondary" style={{ margin: 0, fontSize: 12 }}>
                      Select <strong>Allow</strong> to grant or <strong>Deny</strong> to explicitly revoke an action. <strong>Inherit</strong> uses the role default.
                    </Paragraph>
                  </Col>
                  <Col>
                    <Tooltip title={!canEdit ? "View-only: Saving user configuration is disabled" : ""}>
                      <span>
                        <Button
                          type="primary"
                          icon={<SaveOutlined />}
                          loading={savingUserOverrides}
                          disabled={!canEdit}
                          onClick={handleSaveUserConfiguration}
                        >
                          Save User Configuration
                        </Button>
                      </span>
                    </Tooltip>
                  </Col>
                </Row>

                <Table
                  dataSource={modules.map((m) => ({ moduleCode: m.code }))}
                  columns={userOverrideColumns}
                  rowKey="moduleCode"
                  loading={loadingUserConfig}
                  pagination={false}
                  size="small"
                  bordered
                />
              </>
            ) : (
              <div style={{ padding: '40px 0', textAlign: 'center', color: '#8c8c8c' }}>
                <UserOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block', color: '#bfbfbf' }} />
                Select a user above to inspect effective permissions and apply individual overrides.
              </div>
            )}
          </Card>
        </Tabs.TabPane>

        {/* TAB 3: CUSTOM ROLE MANAGEMENT */}
        <Tabs.TabPane
          tab={
            <span>
              <TeamOutlined /> Roles Management
            </span>
          }
          key="3"
        >
          <Card bordered={false} style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
              <Col>
                <Title level={5} style={{ margin: 0 }}>System & Custom Roles</Title>
              </Col>
              <Col>
                <Tooltip title={!canCreate || !canEdit ? "View-only: Creating roles is disabled" : ""}>
                  <span>
                    <Button
                      type="primary"
                      icon={<PlusOutlined />}
                      disabled={!canCreate || !canEdit}
                      onClick={() => handleOpenRoleModal(null)}
                    >
                      Create Custom Role
                    </Button>
                  </span>
                </Tooltip>
              </Col>
            </Row>

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
                      <span style={{ fontWeight: 600 }}>{text}</span>
                      {r.isSystemRole && <Tag color="blue">Built-in</Tag>}
                    </Space>
                  )
                },
                { title: 'Description', dataIndex: 'description', key: 'description' },
                {
                  title: 'Assigned Members',
                  dataIndex: 'userCount',
                  key: 'userCount',
                  width: 150,
                  render: (cnt) => <Badge count={cnt || 0} showZero overflowCount={999} style={{ backgroundColor: '#52c41a' }} />
                },
                {
                  title: 'Actions',
                  key: 'actions',
                  width: 160,
                  render: (_, r) => (
                    <Space size="small">
                      <Tooltip title={!canEdit ? "View-only: Editing roles is disabled" : ""}>
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
                          <Tooltip title={!canDelete ? "View-only: Deleting roles is disabled" : ""}>
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
        </Tabs.TabPane>
      </Tabs>

      {/* Role Create/Edit Modal */}
      <Modal
        title={editingRole ? 'Edit Role' : 'Create Custom Role'}
        open={isRoleModalVisible}
        onCancel={() => setIsRoleModalVisible(false)}
        onOk={handleSaveRole}
        confirmLoading={savingRole}
      >
        <div style={{ marginTop: 12 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Role Name</label>
          <Input
            placeholder="e.g. Quality Assurance, Data Reviewer"
            value={roleForm.roleName}
            disabled={editingRole?.isSystemRole}
            onChange={(e) => setRoleForm((prev) => ({ ...prev, roleName: e.target.value }))}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <label style={{ display: 'block', marginBottom: 4, fontWeight: 500 }}>Description</label>
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
