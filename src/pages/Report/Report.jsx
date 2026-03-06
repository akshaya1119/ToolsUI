import React, { useEffect, useState } from "react";
import { List, Typography, Select, Spin, message, Row, Col, Card, Statistic, Button, Tag } from "antd";
import axios from "axios";
import API from "../../hooks/api";

const { Text, Title } = Typography;

const url3 = import.meta.env.VITE_API_FILE_URL;
const url = import.meta.env.VITE_API_BASE_URL;
const token = localStorage.getItem("token");

const possibleReports = [
  { fileName: "DuplicateTool.xlsx", title: "Duplicate Processing Report" },
  { fileName: "EnvelopeBreaking.xlsx", title: "Envelope Breaking Report" },
  { fileName: "ExtrasCalculation.xlsx", title: "Extras Calculation Report" },
  { fileName: "BoxBreaking.xlsx", title: "Box Breaking Report" },
  { fileName: "CatchSummary.xlsx", title: "Catch Summary Report" },
  { fileName: "EnvelopeSummary.xlsx", title: "Envelope Summary Report" },
];

const Report = () => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedProjectName, setSelectedProjectName] = useState("");
  const [loading, setLoading] = useState(false);
  const [projectStats, setProjectStats] = useState(null); // For project health dashboard
  const [availableReports, setAvailableReports] = useState({});

  useEffect(() => {
    const storedId = localStorage.getItem("selectedProjectId");
    const storedName = localStorage.getItem("selectedProjectName");

    if (storedId && storedName) {
      setSelectedProjectId(storedId);
      setSelectedProjectName(storedName);
    }

    getProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      checkAvailableReports(selectedProjectId);
      fetchProjectStats(selectedProjectId); // Fetch stats for the selected project
    }
  }, [selectedProjectId]);

  const getProjects = async () => {
    setLoading(true);
    try {
      const response = await API.get(`/Projects`);
      const projectIds = response.data.map((config) => config.projectId);

      const projectNameRequests = projectIds.map((projectId) =>
        axios.get(`${url}/Project/${projectId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
      );

      const projectNameResponses = await Promise.all(projectNameRequests);

      const combinedProjects = projectIds.map((id, index) => ({
        id,
        name: projectNameResponses[index].data.name,
      }));

      setProjects(combinedProjects);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      message.error("Failed to fetch projects. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectStats = async (projectId) => {
    // Example: This endpoint would return key stats for the project
    try {
      const res = await API.get(`/Reports/ProjectSummary?projectId=${projectId}`);
      setProjectStats(res.data);
    } catch (err) {
      console.error("Failed to fetch project stats", err);
      setProjectStats(null); // Reset on error
    }
  };

  const checkAvailableReports = async (projectId) => {
    const availability = {};
    setLoading(true);
    await Promise.all(
      possibleReports.map(async (report) => {
        try {
          const res = await API.get(
            `EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${report.fileName}`
          );
          availability[report.fileName] = res.data.exists;
        } catch (err) {
          console.error(`Failed to check existence for ${report.fileName}`, err);
          availability[report.fileName] = false;
        }
      })
    );
    setAvailableReports(availability);
    setLoading(false);
  };

  const handleProjectChange = (projectId) => {
    const selectedProject = projects.find((project) => project.id === projectId);
    if (selectedProject) {
      setSelectedProjectId(projectId);
      setSelectedProjectName(selectedProject.name);
    } else {
      setSelectedProjectId(null);
      setSelectedProjectName("");
    }
  };

  const renderProjectDashboard = () => {
    if (!selectedProjectId || !projectStats) return null;
    return (
      <Card title="Project Health Summary" style={{ marginBottom: 24 }}>
        <Row gutter={16}>
          <Col span={6}><Statistic title="Imported Records" value={projectStats.totalRecords} /></Col>
          <Col span={6}><Statistic title="Unresolved Conflicts" value={projectStats.unresolvedConflicts} valueStyle={{ color: projectStats.unresolvedConflicts > 0 ? '#cf1322' : '#3f8600' }} /></Col>
          <Col span={6}><Statistic title="Envelopes Created" value={projectStats.envelopesCreated} /></Col>
          <Col span={6}><Statistic title="Boxes Created" value={projectStats.boxesCreated} /></Col>
        </Row>
      </Card>
    );
  };

  const renderReportsList = () => {
  if (!selectedProjectId) {
    return <Text type="secondary">Please select a project to see available reports.</Text>;
  }

  if (loading) {
    return <Spin tip="Checking available reports..." />;
  }

  return (
    <List
      header={<Title level={4}>Available Reports for: {selectedProjectName}</Title>}
      bordered
      dataSource={possibleReports}
      renderItem={(report) => {
        const isAvailable = availableReports[report.fileName];
        const fileUrl = `${url3}/${selectedProjectId}/${report.fileName}`;

        return isAvailable ? (
          <List.Item
            actions={[
              <a key="download" href={fileUrl} download target="_blank" rel="noopener noreferrer">
                <Button type="primary">Download</Button>
              </a>
            ]}
          >
            <List.Item.Meta
              title={report.title}
              description="Ready for download."
            />
            <Tag color="green">Available</Tag>
          </List.Item>
        ) : null; // ❌ Do not render item if report is not available
      }}
    />
  );
};


  return (
    <div style={{ padding: 20 }}>
      <Typography.Title level={3} style={{ marginBottom: 24}}>
        Reports
      </Typography.Title>
      <>
      <Row align="middle" justify="space-between" style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
        <Title level={3}>Select a Project</Title>
        </Col>
        <Col xs={24} sm={16}>
        <Select
          style={{ width: 300, marginBottom: 20 }}
          placeholder="Select a project"
          onChange={handleProjectChange}
          value={selectedProjectName}
          allowClear
          loading={loading && projects.length === 0}
        >
          {projects.map((project) => (
            <Select.Option key={project.id} value={project.id}>
              {project.name}
            </Select.Option>
          ))}
        </Select>
        </Col>
      </Row>
        
        {renderProjectDashboard()}
      </>
      {renderReportsList()}
    </div>
  );
};

export default Report;
