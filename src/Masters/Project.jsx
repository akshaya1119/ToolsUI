import React, { useEffect, useState } from "react";
import { Table, Button, Select, Modal, Input, Space, message, Tag, Popconfirm } from "antd";
import {
    EditOutlined,
    SearchOutlined,
    FolderAddOutlined,
    FolderOpenOutlined,
} from "@ant-design/icons";
import axios from "axios";
import API from "../hooks/api";
import { useLocation } from "react-router-dom";

const Project = () => {
    const location = useLocation();
    const [projects, setProjects] = useState([]); // List of project records from /Projects API
    const [projectNames, setProjectNames] = useState([]); // List of project names fetched from /Project API
    const [createdProjectIds, setCreatedProjectIds] = useState([]); // All project IDs already created
    const [users, setUsers] = useState([]); // List of users with roleId 3
    const [loading, setLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const selectedProject = projectNames.find(p => p.projectId === selectedProjectId);
    const [selectedUserIds, setSelectedUserIds] = useState([]); // For multiple user selection
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
            setProjectNames(res.data || []); // Ensure the data is an empty array if undefined
        } catch (err) {
            console.error("Failed to fetch project names", err);
        }
    };

    // Fetch users with roleId 3
    const getUsers = async () => {
        try {
            const res = await axios.get(`${url}/User`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            const response = res.data.filter((r) => r.roleId <= 3); // Filter by roleId 3
            setUsers(response || []); // Ensure the data is an empty array if undefined
        } catch (err) {
            console.error("Failed to fetch users", err);
        }
    };

    const handleAdd = () => {
        setEditingItem(null);
        setName("");
        setSelectedProjectId(null);
        setSelectedUserIds([]); // Reset selected users
        setModalVisible(true);
    };

    const handleEdit = (record) => {
        setEditingItem(record);
        setName(record.name);
        setSelectedProjectId(record.projectId); // Set project from existing record
        setSelectedUserIds(record.userAssigned || []); // Set selected users from existing record (assuming `userAssigned` is an array)
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
                projectId: selectedProjectId,
                userAssigned: selectedUserIds,
                groupId: selectedProject?.groupId,
                typeId: selectedProject?.typeId, // Send the list of user IDs
                status:selectedProject?.status,
            };

            if (editingItem) {
                await API.put(`/Projects/${editingItem.projectId}`, payload);
                message.success('Updated successfully');
            } else {
                await API.post('/Projects', payload);
                message.success('Added successfully');
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
        const projectName = projectNames.find(p => p.projectId === proj.projectId);
        const userNames = Array.isArray(proj.userAssigned) // Ensure userAssigned is an array
            ? proj.userAssigned
                .map(userId => {
                    const user = users.find(u => u.userId === userId);
                    return user ? user.firstName : 'Unknown User';
                })
                .join(', ') // Combine user names into a single string
            : 'No Users Assigned'; // Fallback if userAssigned is not an array or empty

        return {
            ...proj,
            projectName: projectName ? projectName.name : 'Unknown Project', // If no project found, use 'Unknown Project'
            userNames, // Join user names as a string
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
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
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
            >
                <Select
                    style={{ width: "100%", marginTop: 4 }}
                    placeholder="Choose a project..."
                    onChange={setSelectedProjectId}
                    value={selectedProjectId}
                    showSearch
                    optionFilterProp="children"
                    filterOption={(input, option) =>
                        option?.children?.toLowerCase().includes(input.toLowerCase())
                    }
                >
                    {projectNames
                        // filter out projects already added unless editing that same project
                        .filter(
                            (p) =>
                                !createdProjectIds.includes(p.projectId) ||
                                (editingItem && editingItem.projectId === p.projectId)
                        )
                        .map((p) => (
                            <Select.Option key={p.projectId} value={p.projectId}>
                                {p.name}
                            </Select.Option>
                        ))}
                </Select>
                <Select
                    style={{ width: '100%', marginTop: 4 }}
                    placeholder="Select Users..."
                    onChange={setSelectedUserIds}
                    value={selectedUserIds}
                    mode="multiple" // Allow multiple selections
                >
                    <Option value="">Select Users...</Option>
                    {users.map(u => (
                        <Option key={u.userId} value={u.userId}>{u.firstName}</Option>
                    ))}
                </Select>
            </Modal>
        </div>
    );
};


export default Project;
