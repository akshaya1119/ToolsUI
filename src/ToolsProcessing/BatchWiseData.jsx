import React, { useState, useEffect } from "react";
import { Table, Input, Select, Typography, message } from "antd";
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
          try { resData = JSON.parse(resData); } catch (e) {}
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
        try { resData = JSON.parse(resData); } catch (e) {}
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

        const normalizedItems = itemsArray.map(item => {
          const newItem = {};
          for (const key in item) {
            const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
            newItem[camelKey] = item[key];
          }
          return newItem;
        });

        setData(normalizedItems);
        setTotalCount(resData.totalCount || resData.TotalCount || itemsArray.length || 0);
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

  const columns = [
    {
      title: "Batch",
      dataIndex: "batch",
      key: "batch",
      sorter: true,
      width: 80,
    },
    {
      title: "Lot No",
      dataIndex: "lotNo",
      key: "lotNo",
      sorter: true,
      width: 80,
    },
    {
      title: "Catch No",
      dataIndex: "catchNo",
      key: "catchNo",
      sorter: true,
      width: 120,
    },
    {
      title: "Center Code",
      dataIndex: "centerCode",
      key: "centerCode",
      sorter: true,
      width: 120,
    },
    {
      title: "Nodal Code",
      dataIndex: "nodalCode",
      key: "nodalCode",
      sorter: true,
      width: 120,
    },
    {
      title: "Quantity",
      dataIndex: "quantity",
      key: "quantity",
      sorter: true,
      width: 100,
    },
    {
      title: "Subject Name",
      dataIndex: "subjectName",
      key: "subjectName",
      sorter: true,
    },
    {
      title: "Course Name",
      dataIndex: "courseName",
      key: "courseName",
      sorter: true,
    },
    {
      title: "Exam Date",
      dataIndex: "examDate",
      key: "examDate",
      sorter: true,
      width: 120,
    },
  ];

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
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm p-4">
        <Table
          columns={columns}
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
          scroll={{ x: 1000 }}
          size="middle"
          bordered
        />
      </div>
    </div>
  );
};

export default BatchWiseData;
