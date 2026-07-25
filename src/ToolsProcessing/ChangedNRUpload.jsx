import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Card, Button, Select, Space, Spin, Empty, Tag } from "antd";
import { RedoOutlined, DeleteOutlined, ReloadOutlined } from "@ant-design/icons";
import API from "../hooks/api";
import { useToast } from "../hooks/useToast";
import useStore from "../stores/ProjectData";
import BatchComparisonTable from "./components/BatchComparisonTable";
import "./ChangedNRUpload.css";

const ChangedNRUpload = () => {
  const { showToast } = useToast();
  const projectId = useStore((state) => state.projectId);
  const [batches, setBatches] = useState([]);
  const [comparedBatch, setComparedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [lots, setLots] = useState([]);
  const [selectedLot, setSelectedLot] = useState(null);
  const [loadingLots, setLoadingLots] = useState(false);
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  useEffect(() => {
    if (projectId) {
      loadLots();
      loadProcesses();
      loadBatches();
    }
  }, [projectId]);

  const loadBatches = async () => {
    if (!projectId) {
      showToast("Project ID not available", "error");
      return;
    }

    setLoadingBatches(true);
    try {
      const res = await API.get(`/NRDatas/active-batches/${projectId}`);
      const batchList = res.data?.activeBatches || [];
      setBatches(batchList);

      const otherBatches = batchList.filter(b => b !== 1);
      if (otherBatches.length > 0) {
        setComparedBatch(otherBatches[0]);
      }
    } catch (error) {
      console.error("Failed to load batches:", error);
      showToast("Failed to load batches", "error");
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Load available lots
  const loadLots = async () => {
    setLoadingLots(true);
    try {
      const res = await API.get(`/NRDatas/unique-lots/${projectId}`);
      const lotList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setLots(lotList);
      
      // Set selected lot to first non-zero lot, or 0 if only 0 exists
      const nonZeroLot = lotList.find(lot => lot !== 0);
      if (nonZeroLot !== undefined) {
        setSelectedLot(nonZeroLot);
      } else {
        setSelectedLot(null);
      }
    } catch (error) {
      console.error("Failed to load lots:", error);
      setLots([]);
    } finally {
      setLoadingLots(false);
    }
  };

  // Load available processes
  const loadProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const res = await API.get("/ProcessSteps");
      const processList = res.data?.data || [];
      setProcesses(processList);
      
      if (processList.length > 0) {
        const saved = localStorage.getItem("selectedProcess");
        if (saved) {
          const parsedProcess = JSON.parse(saved);
          setSelectedProcess(parsedProcess.processId);
        } else {
          setSelectedProcess(processList[0].processId);
        }
      }
    } catch (error) {
      console.error("Failed to load processes:", error);
      setProcesses([]);
    } finally {
      setLoadingProcesses(false);
    }
  };

  // Handle process selection and save to localStorage
  const handleProcessChange = (processId) => {
    setSelectedProcess(processId);
    const process = processes.find(p => p.processId === processId);
    if (process) {
      localStorage.setItem("selectedProcess", JSON.stringify(process));
    }
  };

  // Load on mount
  useEffect(() => {
    if (projectId) {
      loadLots();
      loadProcesses();
      loadBatches();
    }
  }, [projectId]);

  const handleCompareBatches = async () => {
    if (!comparedBatch) {
      showToast("Please select a batch to compare", "warning");
      return;
    }

    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/compare-batches`, {
        params: {
          projectId: projectId,
          compareBatch: comparedBatch,
          lotNo: selectedLot || 0,
          pageNo: 1,
          pageSize: 20,
        },
      });

      setComparisonData(res.data);
      showToast("Batches compared successfully", "success");
    } catch (error) {
      console.error("Failed to compare batches:", error);
      const errorMsg = error?.response?.data?.message || "Failed to compare batches";
      showToast(errorMsg, "error");
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComparisonData(null);
    setComparedBatch(null);
  };

  const handlePaginationChange = async (pageNo, pageSize) => {
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/compare-batches`, {
        params: {
          projectId: projectId,
          compareBatch: comparedBatch,
          lotNo: selectedLot || 0,
          pageNo: pageNo,
          pageSize: pageSize,
        },
      });

      setComparisonData(res.data);
    } catch (error) {
      console.error("Failed to fetch page:", error);
      showToast("Failed to fetch page", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchText, sortField, sortOrder, status) => {
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/compare-batches`, {
        params: {
          projectId: projectId,
          compareBatch: comparedBatch,
          lotNo: selectedLot || 0,
          pageNo: 1,
          pageSize: 20,
          search: searchText || null,
          sortField: sortField || null,
          sortOrder: sortOrder || null,
          status: status || null,
        },
      });

      setComparisonData(res.data);
    } catch (error) {
      console.error("Failed to search:", error);
      showToast("Failed to search", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = async (sortField, sortOrder, searchText) => {
    setLoading(true);
    try {
      let field = sortField;
      let order = sortOrder;
      
      if (sortField?.includes('-')) {
        const parts = sortField.split('-');
        field = parts[0];
        order = parts[1];
      }

      const res = await API.get(`/NRDatas/compare-batches`, {
        params: {
          projectId: projectId,
          compareBatch: comparedBatch,
          lotNo: selectedLot || 0,
          pageNo: 1,
          pageSize: 20,
          search: searchText || null,
          sortField: field || null,
          sortOrder: order || null,
        },
      });

      setComparisonData(res.data);
    } catch (error) {
      console.error("Failed to sort:", error);
      showToast("Failed to sort", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="changed-nr-upload-container">
      <div style={{ marginBottom: 24 }}>
        <Typography.Title level={3} style={{ marginBottom: 8 }}>
          Batch Comparison & Analysis
        </Typography.Title>
        <Typography.Text type="secondary">
          Compare NR data between two batches to identify changes and differences
        </Typography.Text>
      </div>

      {/* Batch Selection Section */}
      <Card className="batch-selection-card" style={{ marginBottom: 24 }}>
        <Spin spinning={loadingBatches || loadingLots || loadingProcesses}>
          <Row gutter={[16, 16]} align="middle">
            <Col xs={24} sm={8} md={4}>
              <label className="batch-label">Select Lot</label>
              <Select
                placeholder="Select lot"
                value={selectedLot}
                onChange={setSelectedLot}
                loading={loadingLots}
                disabled={loadingLots || (lots.length === 1 && lots[0] === 0)}
                style={{ width: "100%" }}
              >
                {lots.filter(lot => lot !== 0).map((lot) => (
                  <Select.Option key={lot} value={lot}>
                    Lot {lot}
                  </Select.Option>
                ))}
                {lots.length === 1 && lots[0] === 0 && (
                  <Select.Option value={0} disabled>
                    No additional lots available
                  </Select.Option>
                )}
              </Select>
            </Col>

            <Col xs={24} sm={8} md={4}>
              <label className="batch-label">Select Process</label>
              <Select
                placeholder="Select process"
                value={selectedProcess}
                onChange={handleProcessChange}
                loading={loadingProcesses}
                disabled={loadingProcesses || processes.length === 0}
                style={{ width: "100%" }}
              >
                {processes.map((process) => (
                  <Select.Option key={process.processId} value={process.processId}>
                    {process.processName}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={8} md={4}>
              <label className="batch-label">Select Batch</label>
              <Select
                placeholder="Select batch"
                value={comparedBatch}
                onChange={setComparedBatch}
                loading={loadingBatches}
                style={{ width: "100%" }}
              >
                {batches.map((batch) => (
                  batch !== 1 && (
                    <Select.Option key={batch} value={batch}>
                      Batch - {batch}
                    </Select.Option>
                  )
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Space style={{ width: "100%", justifyContent: "flex-end", marginTop: "24px" }}>
                <Button
                  type="primary"
                  icon={<RedoOutlined />}
                  onClick={handleCompareBatches}
                  loading={loading}
                  disabled={!comparedBatch}
                >
                  Compare Batches
                </Button>
                <Button icon={<DeleteOutlined />} onClick={handleReset}>
                  Reset
                </Button>
                <Button icon={<ReloadOutlined />} onClick={loadBatches} loading={loadingBatches}>
                  Reload
                </Button>
              </Space>
            </Col>
          </Row>
        </Spin>
      </Card>

      {/* Comparison Table */}
      {comparisonData && (
        <Card className="comparison-results-card" style={{ marginBottom: 24 }}>
          <Spin spinning={loading}>
            <BatchComparisonTable 
              comparisonData={comparisonData}
              onPaginationChange={handlePaginationChange}
              onSearch={handleSearch}
              onSort={handleSort}
            />
          </Spin>
        </Card>
      )}

      {/* Empty State */}
      {!comparisonData && !loading && batches.length > 1 && (
        <Card style={{ textAlign: "center", padding: "48px 24px" }}>
          <Empty
            description="Select a batch to compare with Batch 1 and click 'Compare Batches'"
            style={{ marginTop: 0 }}
          />
        </Card>
      )}

      {batches.length <= 1 && !loadingBatches && (
        <Card style={{ textAlign: "center", padding: "48px 24px" }}>
          <Empty
            description="No additional batches available. Upload more batches to compare."
            style={{ marginTop: 0 }}
          />
        </Card>
      )}
    </div>
  );
};

export default ChangedNRUpload;
