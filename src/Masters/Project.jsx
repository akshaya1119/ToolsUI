import React, { useEffect, useState } from "react";
import { Table, Button, Select, Modal, Input, Space, message, Tag, Popconfirm, Tooltip } from "antd";
import {
    EditOutlined,
    SearchOutlined,
    FolderAddOutlined,
    FolderOpenOutlined,
} from "@ant-design/icons";
import axios from "axios";
import API from "../hooks/api";
import { useLocation } from "react-router-dom";
import { getCurrentUserRoleId } from "../hooks/useUserMap";
import useModulePermission from "../hooks/useModulePermission";

const { Option } = Select;

const Project = () => {
    const { canView, canCreate, canEdit, canDelete } = useModulePermission('MASTER_PROJECT');
    const location = useLocation();
    const [projects, setProjects] = useState([]); // List of project records from /Projects API
    const [projectNames, setProjectNames] = useState([]); // List of project names fetched from /Project API
    const [createdProjectIds, setCreatedProjectIds] = useState([]); // All project IDs already created
    const [users, setUsers] = useState([]); // List of users with roleId <= 3
    const [allUsers, setAllUsers] = useState([]); // All system users for name lookup
    const [loading, setLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const selectedProject = projectNames.find(p => Number(p.projectId ?? p.id) === Number(selectedProjectId));
    const [selectedUserIds, setSelectedUserIds] = useState([]); // For multiple user selection
    const [selectedStatus, setSelectedStatus] = useState(null); // Preserve status when editing
    const token = localStorage.getItem("token");
    const url = import.meta.env.VITE_API_BASE_URL;
    const [pagination, setPagination] = useState({
        current: 1,
        pageSize: 10,
        total: 0
    });
    
    useEffect(() => {
        fetchProjects(pagination.current, pagination.pageSize);
        fetchCreatedProjectIds();
        fetchProjectNames();
        getUsers();
        
        // Auto-open modal if navigated from dashboard
        if (location.state?.openProjectModal) {
            handleAdd();
            // Clear the state to prevent reopening on refresh
            window.history.replaceState({}, document.title);
        }
    }, []);
    // Fetch project records from /Projects API
    const fetchProjects = async (page = 1, pageSize = 10) => {
        setLoading(true);

        try {
            const res = await API.get(`/Projects?page=${page}&pageSize=${pageSize}`);

            setProjects(res.data.data || []); // API returns Data
            setPagination({
                current: res.data.page,
                pageSize: res.data.pageSize,
                total: res.data.totalRecords
            });

        } catch (err) {
            console.error("Failed to fetch projects", err);
        }

        setLoading(false);
    };

    const fetchCreatedProjectIds = async () => {
        try {
            const pageSize = 200;
            let page = 1;
            let collected = [];

            while (true) {
                const res = await API.get(`/Projects?page=${page}&pageSize=${pageSize}`);
                const data = res.data?.data || [];
                collected = collected.concat(data);
                const total = res.data?.totalRecords ?? data.length;
                if (data.length === 0 || page * pageSize >= total) {
                    break;
                }
                page += 1;
            }

            const ids = collected
                .map((item) => item?.projectId)
                .filter((id) => id !== null && id !== undefined);
            setCreatedProjectIds(ids);
        } catch (err) {
            console.error("Failed to fetch created project ids", err);
            setCreatedProjectIds([]);
        }
    };

    const handleTableChange = (pagination) => {
        fetchProjects(pagination.current, pagination.pageSize);
    };

    // Fetch project names from /Project API
    const fetchProjectNames = async () => {
        try {
            const res = await axios.get(`${url}/Project`);
            const data = Array.isArray(res.data) ? res.data : (res.data?.data || res.data?.$values || []);
            setProjectNames(data || []);
            if (data && data.length > 0) {
                localStorage.setItem("cached_all_projects", JSON.stringify(data));
            }
        } catch (err) {
            console.error("Failed to fetch project names", err);
            try {
                const cached = localStorage.getItem("cached_all_projects");
                if (cached) setProjectNames(JSON.parse(cached));
            } catch {}
        }
    };

    // Fetch users with roleId <= 3
    const getUsers = async () => {
        try {
            let userList = [];
            try {
                const res = await axios.get(`${url}/User`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                userList = Array.isArray(res.data) ? res.data : (res.data?.$values || []);
            } catch (erpErr) {
                console.warn("Failed to fetch users from ERP /User API:", erpErr?.message || erpErr);
                try {
                    const cached = localStorage.getItem("cached_users");
                    if (cached) userList = JSON.parse(cached);
                } catch {}
            }

            if (userList && userList.length > 0) {
                localStorage.setItem("cached_users", JSON.stringify(userList));
            }

            setAllUsers(userList || []);
            const response = userList.filter((r) => Number(r.roleId ?? r.RoleId) <= 3);
            setUsers(response || []);
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleAdd = () => {
        setEditingItem(null);
        setName("");
        setSelectedProjectId(null);
        setSelectedUserIds([]); // Reset selected users
        setSelectedStatus(false); // New projects default to active
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        setName(record.name);
        setSelectedProjectId(Number(record.projectId));
        let assigned = record.userAssigned || [];
        if (typeof assigned === "string") {
            try { assigned = JSON.parse(assigned); } catch { assigned = assigned.split(","); }
        }
        setSelectedUserIds((Array.isArray(assigned) ? assigned : []).map(id => !isNaN(Number(id)) ? Number(id) : id));
        setSelectedStatus(record.status);
        setModalVisible(true);
    };

    const handleArchive = async (record) => {
        try {
            const nextStatus = !record.status;
            const payload = {
                ...record,
                status: nextStatus,
                // Ensure we only send necessary IDs for the backend if needed
                userAssigned: record.userAssigned || [],
            };
            
            // We use record.projectId as the key for the PUT request
            await API.put(`/Projects/${record.projectId}`, payload);
            message.success(nextStatus ? 'Project archived' : 'Project unarchived');
            fetchProjects(pagination.current, pagination.pageSize);
        } catch (err) {
            console.error("Failed to update project status", err);
            message.error('Operation failed');
        }
    };

    const handleSave = async () => {
        if (!selectedProjectId || selectedUserIds.length === 0) {
            message.warning('Project, and at least one User is required');
            return;
        }

        try {
            const payload = {
                projectId: String(selectedProjectId),
                userAssigned: selectedUserIds.map(String),
                groupId: selectedProject?.groupId,
                typeId: selectedProject?.typeId,
                status: editingItem ? selectedStatus : false, // Preserve status on edit, default active on add
            };

            if (editingItem) {
                await API.put(`/Projects/${editingItem.projectId}`, payload);
                message.success('Updated successfully');
            } else {
                await API.post('/Projects', payload);
                message.success('Added successfully');
                // Clear project-related caches when new project is created
                try {
                    localStorage.removeItem('projectsCache');
                    localStorage.removeItem('projectNamesCache');
                    sessionStorage.removeItem('projectsCache');
                    sessionStorage.removeItem('projectNamesCache');
                    localStorage.removeItem('cached_all_projects');
                    localStorage.removeItem('cached_groups');
                    localStorage.removeItem('recent_projects');
                } catch (cacheError) {
                    console.warn('Failed to clear cache:', cacheError);
                }
            }

            setModalVisible(false);
            fetchProjects(); // Refresh project data
            fetchCreatedProjectIds();
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

    // Merge projects, project names, and user names
    const mergedProjects = projects.map((proj) => {
        const projId = Number(proj.projectId ?? proj.id);
        const projectName = projectNames.find(p => Number(p.projectId ?? p.id) === projId);
        
        let assignedList = proj.userAssigned;
        if (typeof assignedList === "string") {
            try {
                assignedList = JSON.parse(assignedList);
            } catch {
                assignedList = assignedList.split(",").map(s => s.trim());
            }
        }

        const userNames = Array.isArray(assignedList) && assignedList.length > 0
            ? assignedList
                .map(userId => {
                    const user = (allUsers.length > 0 ? allUsers : users).find(u => Number(u.userId ?? u.id) === Number(userId));
                    return user?.firstName || user?.name || user?.userName || (userId ? `User ${userId}` : '-');
                })
                .join(', ') // Combine user names into a single string
            : 'No Users Assigned'; // Fallback if userAssigned is not an array or empty

        return {
            ...proj,
            projectName: projectName?.name || projectName?.projectName || 'Unknown Project',
            userNames,
        };
    });

    // Define columns for the table
    const columns = [
        {
            title: 'Project Name',
            dataIndex: 'projectName', // This column will now display the project name
            key: 'projectName',
            sorter: (a, b) => a.projectName.localeCompare(b.projectName),
            ...getColumnSearchProps('projectName'),
        },
        {
            title: 'User Assigned',
            dataIndex: 'userNames', // This column will now display the user names
            key: 'userNames',
            render: (value) => value || 'No Users Assigned', // If no users, display "No Users Assigned"
            sorter: (a, b) => a.userNames.localeCompare(b.userNames),
            ...getColumnSearchProps('userNames'),
        },
        {
            title: 'Status',
            key: 'status',
            render: (_, record) => (
                <Tag color={record.status ? 'red' : 'green'}>
                    {record.status ? 'Archived' : 'Active'}
                </Tag>
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
                    {canDelete ? (
                        <Popconfirm
                            title={`Are you sure you want to ${record.status ? 'unarchive' : 'archive'} this project?`}
                            onConfirm={() => handleArchive(record)}
                            okText="Yes"
                            cancelText="No"
                        >
                            <Button 
                                type="link" 
                                danger={!record.status}
                                icon={record.status ? <FolderOpenOutlined /> : <FolderAddOutlined />} 
                            />
                        </Popconfirm>
                    ) : (
                        <Tooltip title="View-only access: Archiving/Deleting is disabled">
                            <span>
                                <Button 
                                    type="link" 
                                    disabled
                                    icon={record.status ? <FolderOpenOutlined /> : <FolderAddOutlined />} 
                                />
                            </span>
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
                    Access Denied: You do not have permission to view Project Master.
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
                    <Tooltip title="View-only access: Creating new projects is disabled">
                        <span>
                            <Button type="primary" disabled>
                                Add
                            </Button>
                        </span>
                    </Tooltip>
                )}
            </div>
            <Table
                dataSource={mergedProjects} // Use the merged project data
                columns={columns}
                rowKey="projectId"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    pageSize: pagination.pageSize,
                    total: pagination.total,
                    showSizeChanger: true,
                }}
                onChange={handleTableChange}
            />

            <Modal
                title={editingItem ? 'Edit Project' : 'Add Project'}
                open={modalVisible}
                onOk={handleSave}
                onCancel={() => setModalVisible(false)}
                okText="Save"
                okButtonProps={{ disabled: editingItem ? !canEdit : !canCreate }}
            >
                <Select
                    style={{ width: "100%", marginTop: 4 }}
                    placeholder="Choose a project..."
                    onChange={setSelectedProjectId}
                    value={selectedProjectId != null ? Number(selectedProjectId) : undefined}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                        option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {projectNames
                        // filter out projects already added unless editing that same project
                        .filter((p) => {
                            const pId = Number(p.projectId ?? p.id);
                            const isAlreadyCreated = createdProjectIds.some(cid => Number(cid) === pId);
                            const isCurrentEditing = editingItem && Number(editingItem.projectId) === pId;
                            return !isAlreadyCreated || isCurrentEditing;
                        })
                        .map((p) => {
                            const pId = Number(p.projectId ?? p.id);
                            return (
                                <Select.Option key={pId} value={pId}>
                                    {p.name || p.projectName}
                                </Select.Option>
                            );
                        })}
                </Select>
                <Select
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder="Select Users..."
                    onChange={(vals) => setSelectedUserIds(vals)}
                    value={selectedUserIds.map(v => !isNaN(Number(v)) ? Number(v) : v)}
                    mode="multiple" // Allow multiple selections
                >
                    {users.map(u => {
                        const uId = Number(u.userId ?? u.id);
                        return (
                            <Option key={uId} value={uId}>{u.firstName || u.name || `User ${uId}`}</Option>
                        );
                    })}
                </Select>
            </Modal>
        </div>
    );
};


export default Project;
