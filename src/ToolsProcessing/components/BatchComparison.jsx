import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Select, Button, Spin, Empty, Space, message, Modal } from 'antd';
import { RedoOutlined, DeleteOutlined } from '@ant-design/icons';
import API from '../../hooks/api';
import { useToast } from '../../hooks/useToast';
import BatchComparisonTable from './BatchComparisonTable';
import './BatchComparison.css';

const BatchComparison = ({ projectId }) => {
  const { showToast } = useToast();
  const [batches, setBatches] = useState([]);
  const [baseBatch, setBaseBatch] = useState(null);
  const [comparedBatch, setComparedBatch] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [comparisonData, setComparisonData] = useState(null);
  const [showProcessModal, setShowProcessModal] = useState(false);
  const [processes, setProcesses] = useState([]);
  const [selectedProcess, setSelectedProcess] = useState(null);
  const [loadingProcesses, setLoadingProcesses] = useState(false);

  // Load available batches
  const loadBatches = async () => {
    if (!projectId) {
      showToast('Project ID not available', 'error');
      return;
    }

    setLoadingBatches(true);
    try {
      const res = await API.get(`/NRDatas/GetBatches/${projectId}`);
      const batchList = res.data || [];
      setBatches(batchList);
      
      if (batchList.length > 0) {
        setBaseBatch(batchList[0]);
        if (batchList.length > 1) {
          setComparedBatch(batchList[1]);
        }
      }
    } catch (error) {
      console.error('Failed to load batches:', error);
      showToast('Failed to load batches', 'error');
      setBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  // Compare two batches
  const handleCompareBatches = async () => {
    if (!baseBatch || !comparedBatch) {
      showToast('Please select both base and compared batches', 'warning');
      return;
    }

    if (baseBatch === comparedBatch) {
      showToast('Base and compared batches cannot be the same', 'warning');
      return;
    }

    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/CompareBatches/${projectId}`, {
        params: {
          compareBatch: comparedBatch,
          pageNo: 1,
          pageSize: 20
        }
      });
      
      setComparisonData(res.data);
      showToast('Batches compared successfully', 'success');
    } catch (error) {
      console.error('Failed to compare batches:', error);
      const errorMsg = error?.response?.data?.message || 'Failed to compare batches';
      showToast(errorMsg, 'error');
      setComparisonData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setComparisonData(null);
    setBaseBatch(null);
    setComparedBatch(null);
  };

  const handlePushChanges = async (selectedItems = null) => {
    if (!projectId || !comparedBatch) {
      showToast("Please select a batch to push changes", "warning");
      return;
    }

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
        setLoading(true);
        try {
          const payload = {
            projectId: projectId,
            compareBatch: comparedBatch,
            lotNo: 0,
            processStep: 1,
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
          setLoading(false);
        }
      }
    });
  };

  const handlePaginationChange = async (pageNo, pageSize) => {
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/CompareBatches/${projectId}`, {
        params: {
          compareBatch: comparedBatch,
          pageNo: pageNo,
          pageSize: pageSize
        }
      });
      
      setComparisonData(res.data);
    } catch (error) {
      console.error('Failed to fetch page:', error);
      showToast('Failed to fetch page', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (searchText, sortField, sortOrder, status) => {
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/CompareBatches/${projectId}`, {
        params: {
          compareBatch: comparedBatch,
          pageNo: 1,
          pageSize: 20,
          search: searchText || null,
          sortField: sortField || null,
          sortOrder: sortOrder || null,
          status: status || null
        }
      });
      
      setComparisonData(res.data);
    } catch (error) {
      console.error('Failed to search:', error);
      showToast('Failed to search', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSort = async (sortField, sortOrder, searchText, status) => {
    setLoading(true);
    try {
      const res = await API.get(`/NRDatas/CompareBatches/${projectId}`, {
        params: {
          compareBatch: comparedBatch,
          pageNo: 1,
          pageSize: 20,
          search: searchText || null,
          sortField: sortField || null,
          sortOrder: sortOrder || null,
          status: status || null
        }
      });
      
      setComparisonData(res.data);
    } catch (error) {
      console.error('Failed to sort:', error);
      showToast('Failed to sort', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="batch-comparison-container">
      <Card className="batch-selection-card">
        <Spin spinning={loadingBatches}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <label className="batch-label">Base Batch</label>
              <Select
                placeholder="Select base batch"
                value={baseBatch}
                onChange={setBaseBatch}
                loading={loadingBatches}
                disabled={loadingBatches || batches.length === 0}
                style={{ width: '100%' }}
              >
                {batches.map((batch) => (
                  <Select.Option key={batch} value={batch}>
                    Batch {batch}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={12} md={6}>
              <label className="batch-label">Compare With Batch</label>
              <Select
                placeholder="Select batch to compare"
                value={comparedBatch}
                onChange={setComparedBatch}
                loading={loadingBatches}
                disabled={loadingBatches || batches.length === 0}
                style={{ width: '100%' }}
              >
                {batches.map((batch) => (
                  <Select.Option key={batch} value={batch}>
                    Batch {batch}
                  </Select.Option>
                ))}
              </Select>
            </Col>

            <Col xs={24} sm={24} md={12}>
              <Space style={{ width: '100%', justifyContent: 'flex-end', marginTop: '24px' }}>
                <Button 
                  type="primary" 
                  icon={<RedoOutlined />}
                  onClick={handleCompareBatches}
                  loading={loading}
                  disabled={!baseBatch || !comparedBatch}
                >
                  Compare Batches
                </Button>
                <Button 
                  icon={<DeleteOutlined />}
                  onClick={handleReset}
                >
                  Reset
                </Button>
                <Button 
                  onClick={loadBatches}
                  loading={loadingBatches}
                >
                  Reload Batches
                </Button>
              </Space>
            </Col>
          </Row>
        </Spin>
      </Card>

      {comparisonData && (
        <Card className="comparison-results-card" style={{ marginTop: '24px' }}>
          <Spin spinning={loading}>
            <BatchComparisonTable 
              comparisonData={comparisonData}
              onPaginationChange={handlePaginationChange}
              onSearch={handleSearch}
              onSort={handleSort}
              onPushChanges={handlePushChanges}
              loading={loading}
            />
          </Spin>
        </Card>
      )}

      {!comparisonData && !loading && batches.length === 0 && !loadingBatches && (
        <Card style={{ marginTop: '24px' }}>
          <Empty 
            description="No batches available"
            style={{ marginTop: '48px', marginBottom: '48px' }}
          />
        </Card>
      )}
    </div>
  );
};

export default BatchComparison;
