import { Table, Button, Select, Modal, Input, Space, message } from "antd";
import React, { useEffect, useState } from "react";
import {
    EditOutlined,
    DeleteOutlined,
    SearchOutlined,
} from "@ant-design/icons";
import axios from "axios";
import API from "../hooks/api";

const Project = () => {
    const [projects, setProjects] = useState([]); // List of project records from /Projects API
    const [projectNames, setProjectNames] = useState([]); // List of project names fetched from /Project API
    const [users, setUsers] = useState([]); // List of users with roleId 3
    const [loading, setLoading] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [modalVisible, setModalVisible] = useState(false);
    const [name, setName] = useState("");
    const [selectedProjectId, setSelectedProjectId] = useState(null);
    const [selectedUserIds, setSelectedUserIds] = useState([]); // For multiple user selection
    const token = localStorage.getItem("token");
    const url = import.meta.env.VITE_API_BASE_URL;

    useEffect(() => {
        fetchProjects(); // Call the function on component mount
        fetchProjectNames(); // Fetch project names (from /Project API)
        getUsers(); // Fetch users with roleId 3
    }, []);

    // Fetch project records from /Projects API
    const fetchProjects = async () => {
        try {
            const res = await API.get("/Projects");
            setProjects(res.data); // Set the projects data
        } catch (err) {
            console.error("Failed to fetch projects", err);
        }
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

    const handleDelete = async (id) => {
        try {
            await API.delete(`/Projects/${id}`);
            message.success("Deleted successfully");
            fetchProjects(); // Refresh project data after deletion
        } catch {
            message.error("Delete failed");
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
                userAssigned: selectedUserIds, // Send the list of user IDs
            };

            if (editingItem) {
                await API.put(`/Projects/${editingItem.fieldId}`, payload);
                message.success('Updated successfully');
            } else {
                await API.post('/Projects', payload);
                message.success('Added successfully');
            }

            setModalVisible(false);
            fetchProjects(); // Refresh project data
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
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <Space>
                    <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)} />
                    <Button type="link" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record.fieldId)} />
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
                >
                    {projectNames
                        // filter out projects already added unless editing that same project
                        .filter(
                            (p) =>
                                !projects.some((pr) => pr.projectId === p.projectId) ||
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
