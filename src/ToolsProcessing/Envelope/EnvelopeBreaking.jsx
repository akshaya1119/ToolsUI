import React, { useEffect, useState } from "react";
import {
  Row,
  Col,
  Card,
  Select,
  Button,
  Typography,
  Space,
  message,
  Table,
} from "antd";
import { useLocation } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";

const { Title, Text } = Typography;
const { Option } = Select;

const url = import.meta.env.VITE_API_BASE_URL;

const EnvelopeBreaking = () => {
  const location = useLocation();
  const initialProjectId = location?.state?.projectId ?? null;

  const [project, setProject] = useState(initialProjectId);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [nrData, setNrData] = useState([]);
  const [columns, setColumns] = useState([]);

  const token = localStorage.getItem("token");

  // Fetch list of projects on mount
  useEffect(() => {
    axios
      .get(`${url}/Project`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setProjects(res.data || []))
      .catch((err) => console.error("Failed to fetch projects", err));
  }, []);

  // Run envelope breaking logic (POST request)
  const runEnvelopeBreaking = async () => {
    if (!project) {
      message.warning("Please select a project");
      return;
    }

    try {
      setLoading(true);

      const res = await API.post(
        `/EnvelopeBreakageProcessing/ProcessEnvelopeBreaking?ProjectId=${project}`);

      const msg = res?.data?.message || "Envelope breaking completed";
      message.success(msg);

      // Refresh data grid after breaking
      fetchNRData(project);
    } catch (err) {
      console.error("Envelope breaking failed", err);
      message.error(err?.response?.data?.message || err?.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  // Fetch NR data and flatten `nrDatas`
  const fetchNRData = async (projectId) => {
    try {
      setTableLoading(true);

      const response = await API.get(
        `/EnvelopeBreakages?ProjectId=${projectId}`
      );

      const rawData = response.data || [];

      const flattenedData = rawData.map((item) => {
        let parsedNR = {};
        try {
          parsedNR = item.nrDatas ? JSON.parse(item.nrDatas) : {};
        } catch (e) {
          console.warn("Failed to parse nrDatas", item.nrDatas);
        }
        return { ...item, ...parsedNR };
      });

      setNrData(flattenedData);

      const allKeys = new Set();
      flattenedData.forEach((item) => {
        Object.keys(item).forEach((key) => allKeys.add(key));
      });

      const generatedColumns = Array.from(allKeys).map((key) => ({
        title: key,
        dataIndex: key,
        key,
      }));

      setColumns(generatedColumns);
    } catch (error) {
      console.error("Error fetching NR data", error);
      message.error("Failed to load NR data");
    } finally {
      setTableLoading(false);
    }
  };

  const handleProjectChange = (value) => {
    setProject(value);
    if (value) {
      fetchNRData(value);
    }
  };

  return (
    <div style={{ padding: 24 }}>
      <Row gutter={[16, 16]}>
        <Col span={24}>
          <Title level={3}>Envelope Breaking</Title>
          <Text type="secondary">
            Project is auto-selected from Duplicate Tool when navigated here.
          </Text>
        </Col>

        <Col xs={24} md={12}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{
              scale: 1.01,
              boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
            }}
            transition={{ duration: 0.3 }}
          >
            <Card title="Select Project" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Select
                  placeholder="Choose a project..."
                  value={project}
                  onChange={handleProjectChange}
                  style={{ width: "100%" }}
                >
                  <Option value="">Choose a Project...</Option>
                  {projects.map((p) => (
                    <Option key={p.projectId} value={p.projectId}>
                      {p.name}
                    </Option>
                  ))}
                </Select>

                <Button
                  type="primary"
                  onClick={runEnvelopeBreaking}
                  loading={loading}
                  disabled={!project}
                >
                  Run Envelope Breaking
                </Button>
              </Space>
            </Card>
          </motion.div>
        </Col>

        <Col xs={24}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{
              scale: 1.01,
              boxShadow: "0 10px 20px rgba(0, 0, 0, 0.1)",
            }}
            transition={{ duration: 0.3 }}
          >
            <Card title="NR Data Grid" style={{ boxShadow: '0 4px 8px rgba(0,0,0,0.1)' }}>
              {nrData.length > 0 ? (
                <Table
                  dataSource={nrData}
                  columns={columns}
                  rowKey="id"
                  scroll={{ x: "max-content" }}
                  loading={tableLoading}
                />
              ) : (
                <Text>No data to display. Select a project and run breaking.</Text>
              )}
            </Card>
          </motion.div>
        </Col>
      </Row>
    </div>
  );
};

export default EnvelopeBreaking;
