import React, { useEffect, useState, useMemo } from "react";
import { 
  List, 
  Typography, 
  Select, 
  Spin, 
  message, 
  Row, 
  Col, 
  Card, 
  Button, 
  Tag, 
  Empty,
  Divider,
  Space
} from "antd";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Download, Play, ChevronLeft, Calendar, Database, CheckCircle, XCircle } from "lucide-react";
import axios from "axios";
import API from "../../hooks/api";
import useStore from "../../stores/ProjectData";

const { Text, Title } = Typography;

const url3 = import.meta.env.VITE_API_FILE_URL;
const url = import.meta.env.VITE_API_BASE_URL;

const possibleReports = [
  { key: "duplicate", fileName: "DuplicateTool.xlsx", title: "Duplicate Processing Report" },
  { key: "envelope", fileName: "EnvelopeBreaking.xlsx", title: "Envelope Breaking Report" },
  { key: "extra", fileName: "ExtrasCalculation.xlsx", title: "Extras Calculation Report" },
  { key: "box", fileName: "BoxBreaking.xlsx", title: "Box Breaking Report" },
  { key: "envelopeSummary", fileName: "EnvelopeSummary.xlsx", title: "Envelope Summary Report" },
  { key: "catchSummary", fileName: "CatchSummary.xlsx", title: "Catch Summary Report" },
  { key: "catchOmrSerialing", fileName: "CatchWiseBookletAndOmrSerialing.xlsx", title: "Catch OMR Serialing Report" },
];

const Report = () => {
  const storeProjectId = useStore((state) => state.projectId);
  const storeProjectName = useStore((state) => state.projectName);
  
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState(storeProjectId ? Number(storeProjectId) : null);
  const [selectedProjectName, setSelectedProjectName] = useState(storeProjectName || "");
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [uploadVersions, setUploadVersions] = useState([]);
  const [selectedVersion, setSelectedVersion] = useState(null);
  const [versionFiles, setVersionFiles] = useState({});
  const [checkingFiles, setCheckingFiles] = useState(false);
  const [enabledModuleNames, setEnabledModuleNames] = useState([]);

  useEffect(() => {
    getProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      console.log("Project changed to:", selectedProjectId);
      // Clear previous versions and files while loading new ones
      setUploadVersions([]);
      setSelectedVersion(null);
      setVersionFiles({});
      
      fetchUploadVersions(selectedProjectId);
      loadEnabledModules(selectedProjectId);
    } else {
      setUploadVersions([]);
      setSelectedVersion(null);
      setVersionFiles({});
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedVersion && selectedProjectId) {
      checkVersionFiles(selectedProjectId, selectedVersion);
    }
  }, [selectedVersion, selectedProjectId]);

  const getProjects = async () => {
    setProjectsLoading(true);
    const token = localStorage.getItem("token");
    try {
      // 1. Get all projects from Masters API
      const projRes = await axios.get(`${url}/Project`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allProjects = projRes.data || [];

      // 2. Get user's projects from Tools API
      const response = await API.get('/Projects/UserId');

      // 3. Combine
      const combinedProjects = response.data.map((project) => {
        const projData = allProjects.find(p => p.projectId === project.projectId) || {};
        return {
          id: project.projectId,
          name: projData.name || 'Unknown Project',
        };
      });

      setProjects(combinedProjects);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      message.error("Failed to load projects list.");
    } finally {
      setProjectsLoading(false);
    }
  };

  const fetchUploadVersions = async (projectId) => {
    setVersionsLoading(true);
    try {
      const res = await API.get(`/NRDatas/UploadVersions/${projectId}`);
      const versions = res.data || [];
      console.log("Versions fetched for project", projectId, ":", versions);
      setUploadVersions(versions);
      if (versions.length > 0) {
        setSelectedVersion(versions[0]);
      } else {
        setSelectedVersion(null);
      }
    } catch (err) {
      console.warn("Failed to fetch upload versions", err);
      setSelectedVersion(null);
    } finally {
      setVersionsLoading(false);
    }
  };

  const loadEnabledModules = async (projectId) => {
    try {
      const cfgRes = await API.get(`/ProjectConfigs/ByProject/${projectId}`);
      const cfg = Array.isArray(cfgRes.data) ? cfgRes.data[0] : cfgRes.data;
      let moduleEntries = cfg?.modules || [];

      if (moduleEntries.length && typeof moduleEntries[0] === "number") {
        const modsRes = await API.get(`/Modules`);
        const allMods = modsRes.data || [];
        const idToName = new Map(allMods.map((m) => [m.id, m.name]));
        moduleEntries = moduleEntries
          .sort((a, b) => a - b)
          .map((id) => idToName.get(id))
          .filter(Boolean);
      }
      setEnabledModuleNames(moduleEntries || []);
    } catch (err) {
      console.error("Failed to load enabled modules", err);
    }
  };

  const checkVersionFiles = async (projectId, version) => {
    setCheckingFiles(true);
    const statusMap = {};
    await Promise.all(
      possibleReports.map(async (report) => {
        try {
          const res = await API.get(
            `/EnvelopeBreakages/Reports/Exists?projectId=${projectId}&fileName=${report.fileName}&uploadId=${version}`
          );
          if (res.data.exists) {
            statusMap[report.key] = {
              exists: true,
              url: `${url3}/${projectId}/${res.data.fileName}`,
              fileName: res.data.fileName
            };
          } else {
            statusMap[report.key] = { exists: false };
          }
        } catch (err) {
          statusMap[report.key] = { exists: false };
        }
      })
    );
    setVersionFiles(statusMap);
    setCheckingFiles(false);
  };

  const handleGenerateReport = async (key, version) => {
    if (!selectedProjectId || !version) return;
    setCheckingFiles(true);
    try {
      let endpoint = "";
      if (key === "duplicate") endpoint = `/Duplicate/DuplicateReport?ProjectId=${selectedProjectId}&uploadId=${version}`;
      else if (key === "envelope") endpoint = `/EnvelopeBreakages?ProjectId=${selectedProjectId}&uploadId=${version}`;
      else if (key === "envelopeSummary") endpoint = `/EnvelopeBreakages/EnvelopeSummaryReport?ProjectId=${selectedProjectId}&uploadId=${version}`;
      else if (key === "catchSummary") endpoint = `/EnvelopeBreakages/CatchEnvelopeSummaryWithExtras?ProjectId=${selectedProjectId}&uploadId=${version}`;
      else if (key === "catchOmrSerialing") endpoint = `/EnvelopeBreakageProcessing/CatchWithOmrSerialing?ProjectId=${selectedProjectId}&uploadId=${version}`;
      else if (key === "box") endpoint = `/BoxBreakingProcessing/GetBoxBreakingReport?ProjectId=${selectedProjectId}&uploadId=${version}`;
      else if (key === "extra") endpoint = `/ExtraEnvelopes?ProjectId=${selectedProjectId}&uploadId=${version}`; // Assuming similar logic exists

      if (endpoint) {
        if (key === "envelope" || key === "extra") {
          await API.post(endpoint);
        } else {
          await API.get(endpoint);
        }
        message.success(`${key} report generated successfully`);
        await checkVersionFiles(selectedProjectId, version);
      } else {
        message.info("Automatic generation for this report is not yet implemented.");
      }
    } catch (err) {
      console.error(`Failed to generate report ${key}`, err);
      message.error(`Failed to generate report.`);
    } finally {
      setCheckingFiles(false);
    }
  };

  const handleProjectChange = (projectId) => {
    const numId = Number(projectId);
    const selectedProject = projects.find((p) => Number(p.id) === numId);
    if (selectedProject) {
      setSelectedProjectId(numId);
      setSelectedProjectName(selectedProject.name);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-5xl mx-auto"
      >
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center text-white shadow-xl">
            <FileText size={24} />
          </div>
          <div>
            <Title level={2} style={{ margin: 0 }}>Reports Workspace</Title>
            <Text type="secondary">Generate and download batch reports for your projects</Text>
          </div>
        </div>

        <Card className="shadow-sm border-slate-200 mb-8 rounded-2xl overflow-hidden backdrop-blur-sm bg-white/80">
          <Row gutter={24} align="bottom">
            <Col xs={24} md={10}>
              <Text strong className="block mb-2">Select Project</Text>
              <Select
                style={{ width: "100%" }}
                placeholder="Choose a project"
                onChange={handleProjectChange}
                value={selectedProjectId}
                loading={projectsLoading}
                size="large"
                className="custom-select"
                showSearch
                optionFilterProp="children"
              >
                {projects.map((p) => (
                  <Select.Option key={p.id} value={Number(p.id)}>{p.name}</Select.Option>
                ))}
              </Select>
            </Col>
            
            <Col xs={24} md={10}>
              <Text strong className="block mb-2">Select Upload Version</Text>
              <Select
                style={{ width: "100%" }}
                placeholder="Select batch version"
                value={selectedVersion}
                onChange={setSelectedVersion}
                disabled={!selectedProjectId || uploadVersions.length === 0}
                loading={versionsLoading}
                size="large"
              >
                {uploadVersions.map((v) => (
                  <Select.Option key={v} value={v}>Batch Version {v}</Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} md={4}>
              <Button 
                block 
                size="large" 
                icon={<Database size={18} />} 
                onClick={() => handleProjectChange(storeProjectId)}
                disabled={!storeProjectId || Number(selectedProjectId) === Number(storeProjectId)}
              >
                Current
              </Button>
            </Col>
          </Row>
          
          {!selectedProjectId && (
            <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 flex items-center gap-3">
              <CheckCircle size={18} className="text-blue-600" />
              <Text type="secondary">Please select a project to see available data batches.</Text>
            </div>
          )}
        </Card>

        <AnimatePresence mode="wait">
          {selectedProjectId && (
            <motion.div
              key={selectedProjectId}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
            >
              <Card 
                title={
                  <div className="flex items-center gap-3">
                    <Database size={18} className="text-blue-600" />
                    <span>Available Reports for Version {selectedVersion || "None"}</span>
                  </div>
                }
                className="shadow-sm border-slate-200 rounded-2xl"
              >
                {uploadVersions.length === 0 && !versionsLoading ? (
                  <Empty description={selectedProjectId ? "No data batches found for this project. Ensure data has been imported." : "Please select a project."} />
                ) : (
                  <List
                    loading={checkingFiles || versionsLoading}
                    dataSource={possibleReports}
                    renderItem={(report) => {
                      const fileInfo = versionFiles[report.key];
                      const isGenerated = fileInfo?.exists;

                      return (
                        <List.Item
                          actions={[
                            isGenerated ? (
                              <Button 
                                type="primary" 
                                ghost
                                icon={<Download size={16} />}
                                onClick={() => window.open(fileInfo.url, "_blank")}
                                className="flex items-center"
                              >
                                Download
                              </Button>
                            ) : (
                              <Button 
                                type="primary" 
                                icon={<Play size={16} />}
                                onClick={() => handleGenerateReport(report.key, selectedVersion)}
                                className="flex items-center bg-blue-600"
                              >
                                Generate
                              </Button>
                            )
                          ]}
                        >
                          <List.Item.Meta
                            avatar={
                              <div className={`p-2 rounded-lg ${isGenerated ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400'}`}>
                                <FileText size={20} />
                              </div>
                            }
                            title={<span className="font-semibold text-slate-800">{report.title}</span>}
                            description={
                              <Space split={<Divider type="vertical" />}>
                                <Text type="secondary">Filename: {report.fileName}</Text>
                                {isGenerated ? (
                                  <Tag color="success" icon={<CheckCircle size={12} />}>Ready</Tag>
                                ) : (
                                  <Tag color="default" icon={<XCircle size={12} />}>Not Generated</Tag>
                                )}
                              </Space>
                            }
                          />
                        </List.Item>
                      );
                    }}
                  />
                )}
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
      
      <style>{`
        .custom-select .ant-select-selector {
          border-radius: 12px !important;
        }
      `}</style>
    </div>
  );
};

export default Report;
