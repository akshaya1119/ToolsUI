import React, { useState, useEffect } from "react";
import { Typography, Row, Col, Card, Button, Select, Space, Spin, Empty, Tag, Modal } from "antd";
import { RedoOutlined, DeleteOutlined, ReloadOutlined, CloudUploadOutlined } from "@ant-design/icons";
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
  const [pushLoading, setPushLoading] = useState(false);
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

  const [autoCompareAttempted, setAutoCompareAttempted] = useState(false);

  useEffect(() => {
    if (projectId) {
      setAutoCompareAttempted(false);
      setComparisonData(null);
      loadLots();
      loadProcesses();
      loadBatches();
      loadComparisonFields();
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
      const savedBatch = localStorage.getItem(`changedNR_${projectId}_batch`);
      if (savedBatch && otherBatches.includes(Number(savedBatch))) {
        setComparedBatch(Number(savedBatch));
      } else if (otherBatches.length > 0) {
        setComparedBatch(otherBatches[0]);
      } else {
        setComparedBatch(null);
      }
    } catch (error) {
      showToast("Failed to load batches", "error");
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const loadLots = async () => {
    setLoadingLots(true);
    try {
      const res = await API.get(`/NRDatas/unique-lots/${projectId}`);
      const lotList = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      setLots(lotList);
      
      const savedLot = localStorage.getItem(`changedNR_${projectId}_lot`);
      if (savedLot && (lotList.includes(Number(savedLot)) || Number(savedLot) === 0)) {
        setSelectedLot(Number(savedLot));
      } else {
        setSelectedLot(null);
      }
    } catch (error) {
      setLots([]);
    } finally {
      setLoadingLots(false);
    }
  };

  const loadComparisonFields = async () => {
    if (!projectId) return;
    setLoadingFields(true);
    try {
      const res = await API.get(`/NRDatas/get-comparison-fields/${projectId}`);
      const fields = res.data?.fields || [];
      setAvailableFields(fields);

      const savedFields = localStorage.getItem(`changedNR_${projectId}_fields`);
      if (savedFields) {
        try {
          const parsed = JSON.parse(savedFields);
          const validFields = parsed.filter(f => fields.includes(f));
          setAdditionalFields(validFields);
        } catch (e) {
          setAdditionalFields([]);
        }
      } else {
        setAdditionalFields([]);
      }
    } catch (error) {
      setAvailableFields([]);
    } finally {
      setLoadingFields(false);
    }
  };

  const loadProcesses = async () => {
    setLoadingProcesses(true);
    try {
      const res = await API.get("/ProcessSteps");
      const processList = res.data?.data || [];
      setProcesses(processList);

      const savedProcess = localStorage.getItem(`changedNR_${projectId}_process`);
      if (savedProcess && processList.some(p => p.processId === Number(savedProcess))) {
        setSelectedProcess(Number(savedProcess));
      } else {
        setSelectedProcess(null);
      }
    } catch (error) {
      setProcesses([]);
    } finally {
      setLoadingProcesses(false);
    }
  };

  const handleLotChange = (val) => {
    setSelectedLot(val);
    if (val !== undefined && val !== null) localStorage.setItem(`changedNR_${projectId}_lot`, val);
    else localStorage.removeItem(`changedNR_${projectId}_lot`);
  };

  const handleProcessChange = (processId) => {
    setSelectedProcess(processId);
    if (processId !== undefined && processId !== null) localStorage.setItem(`changedNR_${projectId}_process`, processId);
    else localStorage.removeItem(`changedNR_${projectId}_process`);
  };

  const handleBatchChange = (batch) => {
    setComparedBatch(batch);
    if (batch !== undefined && batch !== null) localStorage.setItem(`changedNR_${projectId}_batch`, batch);
    else localStorage.removeItem(`changedNR_${projectId}_batch`);
  };

  const handleFieldsChange = (fields) => {
    setAdditionalFields(fields || []);
    localStorage.setItem(`changedNR_${projectId}_fields`, JSON.stringify(fields || []));
  };

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

  useEffect(() => {
    if (
      projectId &&
      selectedProcess &&
      comparedBatch &&
      !loadingBatches &&
      !loadingProcesses &&
      !loadingLots &&
      !loadingFields &&
      !autoCompareAttempted
    ) {
      setAutoCompareAttempted(true);
      handleCompareBatches();
    }
  }, [
    projectId,
    selectedProcess,
    comparedBatch,
    loadingBatches,
    loadingProcesses,
    loadingLots,
    loadingFields,
    autoCompareAttempted
  ]);

  const handleReset = () => {
    setComparisonData(null);
    setComparedBatch(null);
    setAdditionalFields([]);
  };

  const handlePushChanges = async (selectedItems = null) => {
    if (!projectId || !comparedBatch) {
      showToast("Please select a batch to push changes", "warning");
      return;
    }

    const process = processes.find(p => p.processId === selectedProcess);
    const step = process ? process.steps : 0;

    const isAll = !selectedItems || selectedItems.length === 0;
    const confirmTitle = isAll
      ? `Are you sure you want to push ALL changes from Batch ${comparedBatch} to Base Batch (Batch 1)?`
      : `Are you sure you want to push ${selectedItems.length} selected change(s) to Base Batch (Batch 1)?`;

    Modal.confirm({
      title: "Confirm Push to Base Batch",
      content: confirmTitle,
      okText: "Yes, Push Changes",
      okType: "primary",
      cancelText: "Cancel",
      onOk: async () => {
        setPushLoading(true);
        try {
          const payload = {
            projectId: projectId,
            compareBatch: comparedBatch,
            lotNo: selectedLot || 0,
            processStep: step,
            processId: selectedProcess,
            additionalFields: additionalFields.length > 0 ? additionalFields.join(",") : null,
            selectedItems: selectedItems && selectedItems.length > 0 ? selectedItems : null
          };

          const res = await API.post("/NRDatas/apply-comparison-changes", payload);
          showToast(res.data?.message || "Changes pushed successfully to Base Batch!", "success");

          // Refresh comparison data to reflect updated status
          handleCompareBatches();
        } catch (error) {
          console.error("Failed to push changes:", error);
          const errorMsg = error?.response?.data?.message || "Failed to push changes";
          showToast(errorMsg, "error");
        } finally {
          setPushLoading(false);
        }
      }
    });
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
                onChange={handleLotChange}
                loading={loadingLots}
                disabled={loadingLots}
                style={{ width: "100%" }}
                allowClear
              >
                <Select.Option value={0} title="">
                  All Records (No Lot)
                </Select.Option>
                {lots.filter(lot => lot !== 0).map((lot) => (
                  <Select.Option key={lot} value={lot} title="">
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
                  <Select.Option key={process.processId} value={process.processId} title="">
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
                onChange={handleBatchChange}
                loading={loadingBatches}
                style={{ width: "100%" }}
              >
                {batches.map((batch) => (
                  batch !== 1 && (
                    <Select.Option key={batch} value={batch} title="">
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
                onChange={handleFieldsChange}
                style={{ width: "100%" }}
                maxTagCount={1}
                notFoundContent={availableFields.length === 0 ? "Loading fields..." : "No fields available"}
                loading={loadingFields}
                disabled={loadingFields || availableFields.length === 0}
                allowClear
              >
                {availableFields.map((field) => (
                  <Select.Option key={field} value={field} title="">
                    {field}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={24} md={7}>
              <Space style={{ width: "100%", justifyContent: "flex-end" }} wrap>
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
            onPushChanges={handlePushChanges}
            pushLoading={pushLoading}
            loading={loading}
            projectId={projectId}
            comparedBatch={comparedBatch}
            selectedLot={selectedLot}
            selectedProcess={selectedProcess}
            processes={processes}
            additionalFields={additionalFields}
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