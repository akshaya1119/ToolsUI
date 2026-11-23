import React, { useState, useEffect } from "react";
import { Table, Input, Select, Typography, message, Button, Space, Modal, Checkbox } from "antd";
import { SearchOutlined } from '@ant-design/icons';
import API from "../hooks/api";
import useStore from "../stores/ProjectData";

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

const BatchWiseData = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalCount, setTotalCount] = useState(0);

  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState(1);
  const [batchesLoading, setBatchesLoading] = useState(false);

  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
  });

  const [searchText, setSearchText] = useState("");
  const [sorter, setSorter] = useState({ field: null, order: null });

  const [columns, setColumns] = useState([]);
  const [uploadedDisplayFields, setUploadedDisplayFields] = useState([]);
  const [showUploadedDisplayFieldsModal, setShowUploadedDisplayFieldsModal] = useState(false);

  const projectId = useStore((state) => state.projectId);

  // Fetch available batches
  useEffect(() => {
    if (!projectId) return;

    const fetchBatches = async () => {
      setBatchesLoading(true);
      try {
        const response = await API.get(`/NRDatas/active-batches/${projectId}`);
        let resData = response.data;
        if (typeof resData === 'string') {
          try { resData = JSON.parse(resData); } catch (e) { }
        }

        let fetchedBatches = [];
        if (Array.isArray(resData)) {
          fetchedBatches = resData;
        } else if (resData?.activeBatches) {
          fetchedBatches = resData.activeBatches;
        } else if (resData?.ActiveBatches) {
          fetchedBatches = resData.ActiveBatches;
        } else if (resData?.batches) {
          fetchedBatches = resData.batches;
        }

        setBatches(fetchedBatches);
        if (fetchedBatches.length > 0 && !fetchedBatches.includes(selectedBatch)) {
          setSelectedBatch(fetchedBatches[0]);
        } else if (fetchedBatches.length === 0) {
          setSelectedBatch(null); // No batches available
        }
      } catch (error) {
        console.error("Error fetching batches:", error);
        message.error("Failed to load active batches.");
      } finally {
        setBatchesLoading(false);
      }
    };

    fetchBatches();
  }, [projectId]);

  // Fetch table data
  useEffect(() => {
    if (!projectId) return;
    fetchData();
  }, [projectId, pagination.current, pagination.pageSize, searchText, sorter, selectedBatch]);

  const fetchData = async () => {
    setLoading(true);
    try {
      let url = `/NRDatas/GetByProjectId/${projectId}?pageNo=${pagination.current}&pageSize=${pagination.pageSize}`;

      if (selectedBatch) {
        url += `&batchNo=${selectedBatch}`;
      }
      if (searchText) {
        url += `&search=${encodeURIComponent(searchText)}`;
      }
      if (sorter.field) {
        url += `&sortField=${sorter.field}`;
        if (sorter.order === "descend") {
          url += `&sortOrder=desc`;
        } else {
          url += `&sortOrder=asc`;
        }
      }

      const response = await API.get(url);
      let resData = response.data;
      if (typeof resData === 'string') {
        try { resData = JSON.parse(resData); } catch (e) { }
      }

      if (resData) {
        let itemsArray = [];
        if (Array.isArray(resData)) {
          itemsArray = resData;
        } else if (resData.items && Array.isArray(resData.items)) {
          itemsArray = resData.items;
        } else if (resData.Items && Array.isArray(resData.Items)) {
          itemsArray = resData.Items;
        } else if (resData.data && Array.isArray(resData.data)) {
          itemsArray = resData.data;
        } else if (resData.Data && Array.isArray(resData.Data)) {
          itemsArray = resData.Data;
        }

        const dynamicKeys = new Set();
        const processedItems = itemsArray.map(item => {
          let parsedNRDatas = {};
          if (item.NRDatas || item.nrDatas || item.nRDatas) {
            try {
              const nrDatasStr = item.NRDatas || item.nrDatas || item.nRDatas;
              parsedNRDatas = JSON.parse(nrDatasStr);
              if (parsedNRDatas && typeof parsedNRDatas === 'object') {
                Object.keys(parsedNRDatas).forEach(key => {
                  if (key !== "ImportRowNo" && key !== "VerificationStatus" && key !== "LotNo" && key !== "EnvLotNo" && key !== "Batch" && key !== "CenterSort" && key !== "NodalSort" && key !== "RouteSort") {
                    dynamicKeys.add(key);
                  }
                });
              }
            } catch (e) {
              console.error("Error parsing NRDatas JSON", e);
            }
          }

          const newItem = { ...item, ...parsedNRDatas };
          // Ensure camelCase keys are also present for backward compatibility or UI consistency,
          // but we'll use original PascalCase for columns to match DataImport
          for (const key in item) {
            if (!newItem[key]) {
              const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
              newItem[camelKey] = item[key];
            }
          }
          return { ...newItem, id: item.id ?? item.Id };
        });

        setData(processedItems);
        setTotalCount(resData.totalCount || resData.TotalCount || itemsArray.length || 0);

        const baseColumns = (resData.columns || []).filter((column) =>
          column !== "NRDatas" &&
          column !== "Id" &&
          column !== "ImportRowNo" &&
          column !== "VerificationStatus" &&
          column !== "EnvLotNo" &&
          column !== "CenterSort" &&
          column !== "NodalSort" &&
          column !== "RouteSort"
        );

        const allPossibleColumns = [...baseColumns];
        dynamicKeys.forEach(key => {
          if (!allPossibleColumns.includes(key)) {
            allPossibleColumns.push(key);
          }
        });

        const activeColumns = allPossibleColumns.filter(col => {
          if (baseColumns.includes(col)) return true;
          return processedItems.some(item => {
            const val = item[col];
            return val !== null && val !== undefined && val !== "" && val !== 0 && val !== "0";
          });
        });

        setColumns(activeColumns);

        const savedFields = localStorage.getItem(`batchWiseData_displayFields_${projectId || "default"}`);
        const defaultFieldsToDisplay = activeColumns.filter(col => ["CatchNo", "NRQuantity", "Quantity", "NodalCode", "CenterCode", "Batch", "LotNo"].includes(col));
        
        if (savedFields) {
          try {
            setUploadedDisplayFields(JSON.parse(savedFields));
          } catch (e) {
            setUploadedDisplayFields(defaultFieldsToDisplay);
          }
        } else {
          setUploadedDisplayFields(defaultFieldsToDisplay);
        }

      } else {
        setData([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      message.error("Failed to fetch batch-wise data.");
    } finally {
      setLoading(false);
    }
  };

  const handleTableChange = (newPagination, filters, newSorter) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize,
    });
    setSorter({
      field: newSorter.field,
      order: newSorter.order,
    });
  };

  const handleSearch = (value) => {
    setSearchText(value);
    setPagination((prev) => ({ ...prev, current: 1 }));
  };

  const enhancedColumns = columns.map(col => ({
    title: col,
    dataIndex: col,
    key: col,
    sorter: true,
    sortOrder: sorter.field === col ? sorter.order : null,
    ellipsis: true,
    width: col === 'CatchNo' ? 120 : 150,
    fixed: col === 'CatchNo' ? 'left' : undefined,
  }));

  const lockedUploadedFields = columns.filter(field => field === "CatchNo");

  const visibleEnhancedColumns = enhancedColumns.filter((column) => {
    return uploadedDisplayFields.includes(column.dataIndex);
  });

  return (
    <div className="p-4 md:p-6 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <Title level={3} style={{ margin: 0 }}>
          Batch Wise Data
        </Title>
        <div className="flex flex-wrap items-center gap-4">
          <Select
            value={selectedBatch}
            onChange={(val) => {
              setSelectedBatch(val);
              setPagination((prev) => ({ ...prev, current: 1 }));
            }}
            style={{ width: 150 }}
            loading={batchesLoading}
            placeholder="Select Batch"
            allowClear
            options={batches.map((b) => ({ label: `Batch ${b}`, value: b }))}
          />
          <Search
            placeholder="Search by CatchNo, Center, Subject..."
            allowClear
            onSearch={handleSearch}
            style={{ width: 300 }}
          />
          <Button
            onClick={() => setShowUploadedDisplayFieldsModal(true)}
            disabled={!columns.length}
          >
            Display Fields
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <Table
          columns={visibleEnhancedColumns}
          dataSource={data}
          rowKey={(record) => record.id || record.Id}
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: totalCount,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`,
          }}
          loading={loading}
          onChange={handleTableChange}
          scroll={{ x: 'max-content' }}
          size="middle"
          bordered
        />
      </div>

      <Modal
        title="Batch Data - Display Fields"
        open={showUploadedDisplayFieldsModal}
        onCancel={() => setShowUploadedDisplayFieldsModal(false)}
        footer={[
          <Button
            key="selectAll"
            onClick={() => {
              setUploadedDisplayFields([...columns]);
              localStorage.setItem(
                `batchWiseData_displayFields_${projectId || "default"}`,
                JSON.stringify(columns)
              );
            }}
            disabled={columns.length === 0}
          >
            Select All
          </Button>,
          <Button
            key="clearAll"
            onClick={() => {
              setUploadedDisplayFields([...lockedUploadedFields]);
              localStorage.setItem(
                `batchWiseData_displayFields_${projectId || "default"}`,
                JSON.stringify(lockedUploadedFields)
              );
            }}
            disabled={uploadedDisplayFields.length === lockedUploadedFields.length}
          >
            Clear All
          </Button>,
          <Button
            key="ok"
            type="primary"
            onClick={() => setShowUploadedDisplayFieldsModal(false)}
          >
            OK
          </Button>,
        ]}
      >
        <div style={{ marginBottom: 16 }}>
          <Typography.Text type="secondary">
            Select fields from the table to show or hide columns.
          </Typography.Text>
        </div>
        <Checkbox.Group
          style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8 }}
          value={uploadedDisplayFields}
          onChange={(checkedValues) => {
            const nextValues = Array.from(new Set([...lockedUploadedFields, ...checkedValues]));
            setUploadedDisplayFields(nextValues);
            localStorage.setItem(
              `batchWiseData_displayFields_${projectId || "default"}`,
              JSON.stringify(nextValues)
            );
          }}
        >
          {columns.map((field) => (
            <Checkbox
              key={field}
              value={field}
              disabled={lockedUploadedFields.includes(field)}
            >
              {field} {lockedUploadedFields.includes(field) && "(Required)"}
            </Checkbox>
          ))}
        </Checkbox.Group>
      </Modal>
    </div>
  );
};

export default BatchWiseData;
