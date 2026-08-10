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
  const [additionalFields, setAdditionalFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);

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
      // Don't auto-fill selected lot
      setSelectedLot(null);
    } catch (error) {
      console.error("Failed to load lots:", error);
      setLots([]);
    } finally {
      setLoadingLots(false);
    }
  };

  // Load available comparison fields from NRDatas JSON
  const loadComparisonFields = async () => {
    if (!projectId) {
      console.log("No projectId, skipping loadComparisonFields");
      return;
    }

    setLoadingFields(true);
    try {
      console.log(`[loadComparisonFields] Fetching fields for projectId: ${projectId}`);
      const res = await API.get(`/NRDatas/get-comparison-fields/${projectId}`);
      console.log("[loadComparisonFields] Response:", res.data);
      
      const fields = res.data?.fields || [];
      console.log("[loadComparisonFields] Fields extracted:", fields);
      
      setAvailableFields(fields);
      
      if (fields.length === 0) {
        console.warn("[loadComparisonFields] No fields found for comparison");
      }
    } catch (error) {
      console.error("Failed to load comparison fields:", error);
      console.error("Error response:", error?.response?.data);
      showToast("Failed to load additional comparison fields", "warning");
      setAvailableFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  // Load available processes
  const loadProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const res = await API.get("/ProcessSteps");
      const processList = res.data?.data || [];
      setProcesses(processList);
      // Don't auto-fill selected process
      setSelectedProcess(null);
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
      loadComparisonFields();
    }
  }, [projectId]);

  const handleCompareBatches = async () => {
    if (!comparedBatch) {
      showToast("Please select a batch to compare", "warning");
      return;
    }

    if (!selectedProcess) {
      showToast("Please select a Process before comparing.", "warning");
      return;
    }
    const process = processes.find(p => p.processId === selectedProcess);
    const step = process ? process.steps : 0;

    setLoading(true);
    try {
      const params = {
        projectId: projectId,
        compareBatch: comparedBatch,
        lotNo: selectedLot || 0,
        pageNo: 1,
        pageSize: 20,
        processStep: step,
      };

      // Add additional fields if selected
      if (additionalFields.length > 0) {
        params.additionalFields = additionalFields.join(",");
      }

      const res = await API.get(`/NRDatas/compare-batches`, {
        params: params,
      });

      setComparisonData(res.data);
      showToast("Batches compared successfully", "success");
    } catch (error) {
      console.error("Failed to compare batches:", error);
      const errorData = error?.response?.data;
      
      // Handle exam date validation errors
      if (errorData?.details && Array.isArray(errorData.details)) {
        // Show detailed error messages for exam date mismatches
        const detailsMessage = errorData.details
          .slice(0, 5) // Show first 5 errors
          .map((detail, idx) => `${idx + 1}. ${detail}`)
          .join("\n");
        
        const fullMessage = `${errorData.message}\n\n${detailsMessage}${errorData.details.length > 5 ? `\n... and ${errorData.details.length - 5} more errors` : ""}`;
        showToast(fullMessage, "error");
      } else {
        const errorMsg = errorData?.message || "Failed to compare batches";
        showToast(errorMsg, "error");
      }
      
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComparisonData(null);
    setComparedBatch(null);
    setAdditionalFields([]);
  };

  const handlePaginationChange = async (pageNo, pageSize, searchText, sortField, sortOrder, headerFilters) => {
    const process = processes.find(p => p.processId === selectedProcess);
    const step = process ? process.steps : 0;
    
    setLoading(true);
    try {
      const params = {
        projectId: projectId,
        compareBatch: comparedBatch,
        lotNo: selectedLot || 0,
        pageNo: pageNo,
        pageSize: pageSize,
        search: searchText || null,
        sortField: sortField || null,
        sortOrder: sortOrder || null,
        status: headerFilters?.status || null,
        catchNo: headerFilters?.catchNo || null,
        centerCode: headerFilters?.centerCode || null,
        processStep: step,
      };

      if (additionalFields.length > 0) {
        params.additionalFields = additionalFields.join(",");
      }

      const res = await API.get(`/NRDatas/compare-batches`, {
        params: params,
      });

      setComparisonData(res.data);
    } catch (error) {
      console.error("Failed to fetch page:", error);
      showToast("Failed to fetch page", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchText, sortField, sortOrder, headerFilters) => {
    const process = processes.find(p => p.processId === selectedProcess);
    const step = process ? process.steps : 0;
    
    setLoading(true);
    try {
      const params = {
        projectId: projectId,
        compareBatch: comparedBatch,
        lotNo: selectedLot || 0,
        pageNo: 1,
        pageSize: 20,
        search: searchText || null,
        sortField: sortField || null,
        sortOrder: sortOrder || null,
        status: headerFilters?.status || null,
        catchNo: headerFilters?.catchNo || null,
        centerCode: headerFilters?.centerCode || null,
        processStep: step,
      };

      if (additionalFields.length > 0) {
        params.additionalFields = additionalFields.join(",");
      }

      const res = await API.get(`/NRDatas/compare-batches`, {
        params: params,
      });

      setComparisonData(res.data);
    } catch (error) {
      console.error("Failed to search:", error);
      showToast("Failed to search", "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = async (sortField, sortOrder, searchText, headerFilters) => {
    const process = processes.find(p => p.processId === selectedProcess);
    const step = process ? process.steps : 0;

    setLoading(true);
    try {
      const params = {
        projectId: projectId,
        compareBatch: comparedBatch,
        lotNo: selectedLot || 0,
        pageNo: 1,
        pageSize: 20,
        search: searchText || null,
        sortField: sortField || null,
        sortOrder: sortOrder || null,
        status: headerFilters?.status || null,
        catchNo: headerFilters?.catchNo || null,
        centerCode: headerFilters?.centerCode || null,
        processStep: step,
      };

      if (additionalFields.length > 0) {
        params.additionalFields = additionalFields.join(",");
      }

      const res = await API.get(`/NRDatas/compare-batches`, {
        params: params,
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
        <Spin spinning={loadingBatches || loadingLots || loadingProcesses || loadingFields}>
          <Row gutter={[12, 12]} align="bottom">
            <Col xs={24} sm={12} md={4}>
              <label className="batch-label">Select Lot</label>
              <Select
                placeholder="Select lot (optional)"
                value={selectedLot}
                onChange={setSelectedLot}
                loading={loadingLots}
                disabled={loadingLots}
                style={{ width: "100%" }}
                allowClear
              >
                <Select.Option value={0}>
                  All Records (No Lot)
                </Select.Option>
                {lots.filter(lot => lot !== 0).map((lot) => (
                  <Select.Option key={lot} value={lot}>
                    Lot {lot}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={4}>
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

            <Col xs={24} sm={12} md={3}>
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
                      Batch {batch}
                    </Select.Option>
                  )
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <label className="batch-label">Additional Fields</label>
              <Select
                mode="multiple"
                placeholder="Select fields"
                value={additionalFields}
                onChange={setAdditionalFields}
                style={{ width: "100%" }}
                maxTagCount={1}
                notFoundContent={availableFields.length === 0 ? "Loading fields..." : "No fields available"}
              >
                {availableFields.map((field) => (
                  <Select.Option key={field} value={field}>
                    {field}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={24} md={7}>
              <Space style={{ width: "100%", justifyContent: "flex-end" }}>
                <Button
                  type="primary"
                  icon={<RedoOutlined />}
                  onClick={handleCompareBatches}
                  loading={loading}
                  disabled={!comparedBatch}
                  size="middle"
                >
                  Compare
                </Button>
                <Button 
                  icon={<DeleteOutlined />} 
                  onClick={handleReset}
                  size="middle"
                >
                  Reset
                </Button>
                <Button 
                  icon={<ReloadOutlined />} 
                  onClick={loadBatches} 
                  loading={loadingBatches}
                  size="middle"
                >
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
          <BatchComparisonTable 
            comparisonData={comparisonData}
            onPaginationChange={handlePaginationChange}
            onSearch={handleSearch}
            onSort={handleSort}
            loading={loading}
          />
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
