import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Table, Empty, Pagination, Row, Col, Input, Tabs, Tag, Space, Spin, Button, Tooltip, Dropdown } from 'antd';
import { SearchOutlined, CloudUploadOutlined, CheckCircleOutlined, ClearOutlined, DownloadOutlined, FileExcelOutlined, FilePdfOutlined } from '@ant-design/icons';
import { ChevronUp, ChevronDown } from 'lucide-react';
import API from '../../hooks/api';
import { useToast } from '../../hooks/useToast';
import { exportBatchComparisonExcel, categorizeComparisonRecords } from '../utils/batchComparisonExcelExport';
import { exportBatchComparisonPDF } from '../utils/batchComparisonPdfExport';
import './BatchComparisonTable.css';

const BatchComparisonTable = ({
  comparisonData,
  onPaginationChange,
  onSearch,
  onSort,
  onPushChanges,
  pushLoading = false,
  loading = false,
  projectId,
  comparedBatch,
  selectedLot,
  selectedProcess,
  processes = [],
  additionalFields = []
}) => {
  const { showToast } = useToast();
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('allChanges');
  const [selectedRowKeys, setSelectedRowKeys] = useState([]);
  const [selectedRowsData, setSelectedRowsData] = useState([]);
  const [exportLoading, setExportLoading] = useState(false);
  const debounceTimer = useRef(null);

  // Reset selection when tab or data changes
  useEffect(() => {
    setSelectedRowKeys([]);
    setSelectedRowsData([]);
  }, [activeTab, comparisonData?.data]);

  const onSelectChange = (newSelectedRowKeys, newSelectedRows) => {
    setSelectedRowKeys(newSelectedRowKeys);
    setSelectedRowsData(newSelectedRows);
  };

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    preserveSelectedRowKeys: true,
  };

  const handlePushSelected = () => {
    if (selectedRowsData.length === 0) return;
    const items = selectedRowsData.map(r => ({
      catchNo: r.catchNo ? String(r.catchNo) : "",
      centerCode: r.centerCode ? String(r.centerCode) : ""
    }));
    if (onPushChanges) {
      onPushChanges(items);
    }
  };

  const handlePushAll = () => {
    if (onPushChanges) {
      onPushChanges(null);
    }
  };

  const handleDownload = async (format = 'excel') => {
    if (!comparisonData) {
      showToast('No comparison data available to export', 'warning');
      return;
    }

    setExportLoading(true);
    try {
      let rawRecords = [];

      if (selectedRowsData && selectedRowsData.length > 0) {
        // User selected specific rows via checkboxes
        const selectedItems = [];
        const selectedCatchNos = new Set();

        selectedRowsData.forEach(row => {
          if (row.originalItem) {
            selectedItems.push(row.originalItem);
          } else if (row.catchNo) {
            selectedCatchNos.add(String(row.catchNo));
          }
        });

        // For catch-level rows, find all matching records in comparisonData
        if (selectedCatchNos.size > 0 && comparisonData?.data) {
          comparisonData.data.forEach(item => {
            if (selectedCatchNos.has(String(item.catchNo)) && !selectedItems.includes(item)) {
              selectedItems.push(item);
            }
          });
        }

        rawRecords = selectedItems.length > 0 ? selectedItems : selectedRowsData.map(r => r.originalItem || r);
      } else {
        // If comparisonData already contains all records (or unpaginated)
        if (
          comparisonData.data &&
          comparisonData.totalCount &&
          comparisonData.data.length >= comparisonData.totalCount
        ) {
          rawRecords = comparisonData.data;
        } else if (projectId && (comparedBatch || comparisonData.comparedBatch)) {
          // Fetch all comparison records unpaginated (pageSize: 0)
          const batchToCompare = comparedBatch || comparisonData.comparedBatch;
          const process = (processes || []).find(p => p.processId === selectedProcess);
          const step = process ? process.steps : 0;

          const params = {
            projectId: projectId,
            compareBatch: batchToCompare,
            lotNo: selectedLot ?? comparisonData.lotNo ?? 0,
            pageNo: 1,
            pageSize: 0,
            processStep: step,
          };

          if (additionalFields && additionalFields.length > 0) {
            params.additionalFields = additionalFields.join(',');
          }

          const res = await API.get('/NRDatas/compare-batches', { params });
          rawRecords = res.data?.data || comparisonData.data || [];
        } else {
          rawRecords = comparisonData.data || [];
        }
      }

      if (!rawRecords || rawRecords.length === 0) {
        showToast('No comparison records found to export', 'info');
        return;
      }

      const selectedCountText = selectedRowsData && selectedRowsData.length > 0
        ? ` (${selectedRowsData.length} selected)`
        : '';

      if (format === 'pdf') {
        exportBatchComparisonPDF({
          rawItems: rawRecords,
          comparedBatch: comparedBatch || comparisonData.comparedBatch,
          lotNo: selectedLot ?? comparisonData.lotNo,
        });
        showToast(`PDF report downloaded successfully!${selectedCountText}`, 'success');
      } else {
        exportBatchComparisonExcel({
          rawItems: rawRecords,
          comparedBatch: comparedBatch || comparisonData.comparedBatch,
          lotNo: selectedLot ?? comparisonData.lotNo,
        });
        showToast(`Excel report downloaded successfully!${selectedCountText}`, 'success');
      }
    } catch (error) {
      console.error(`Failed to export comparison ${format}:`, error);
      showToast(`Failed to download ${format.toUpperCase()} report`, 'error');
    } finally {
      setExportLoading(false);
    }
  };

  const selectedCount = selectedRowKeys.length;

  const downloadMenuItems = [
    {
      key: 'excel',
      label: selectedCount > 0 ? `Download in Excel (${selectedCount} selected)` : 'Download in Excel',
      icon: <FileExcelOutlined style={{ color: '#52c41a' }} />,
      onClick: () => handleDownload('excel')
    },
    {
      key: 'pdf',
      label: selectedCount > 0 ? `Download in PDF (${selectedCount} selected)` : 'Download in PDF',
      icon: <FilePdfOutlined style={{ color: '#ff4d4f' }} />,
      onClick: () => handleDownload('pdf')
    }
  ];

  const handlePush = () => {
    if (!onPushChanges) return;
    if (selectedCount > 0) {
      const itemsToPush = selectedRowsData.map(r => ({
        catchNo: r.catchNo,
        centerCode: r.centerCode
      }));
      onPushChanges(itemsToPush);
    } else {
      onPushChanges(null);
    }
  };

  const [headerFilters, setHeaderFilters] = useState({
    catchNo: null,
    centerCode: null,
    status: null,
  });

  const getColumnSearchProps = (dataIndex, title) => ({
    filterDropdown: ({ setSelectedKeys, selectedKeys, confirm, clearFilters }) => (
      <div style={{ padding: 8 }} onKeyDown={(e) => e.stopPropagation()}>
        <Input
          placeholder={`Search ${title}`}
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
          <Button
            onClick={() => {
              if (clearFilters) {
                clearFilters();
                confirm();
              }
            }}
            size="small"
            style={{ width: 90 }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),
    filterIcon: (filtered) => (
      <SearchOutlined style={{ color: filtered ? '#1677ff' : undefined }} />
    ),
  });

  // Categorize fields into unique and non-unique
  const { fieldsToShowUnique, fieldsToShowNonUnique, catchLevelFields } = useMemo(() => {
    if (!comparisonData || !comparisonData.data) return { fieldsToShowUnique: [], fieldsToShowNonUnique: [], catchLevelFields: [] };

    const unique = new Set();
    const nonUnique = new Set();
    const catchLevel = new Set();

    comparisonData.data.forEach(item => {
      item.changes.forEach(change => {
        if (change.isConsistentCatchLevelChange) {
          catchLevel.add(change.field);
        } else if (change.isUniqueField) {
          unique.add(change.field);
        } else {
          nonUnique.add(change.field);
        }
      });
    });

    return {
      fieldsToShowUnique: Array.from(unique),
      fieldsToShowNonUnique: Array.from(nonUnique).sort((a, b) => a === 'Difference' ? 1 : b === 'Difference' ? -1 : 0),
      catchLevelFields: Array.from(catchLevel).sort((a, b) => a === 'Difference' ? 1 : b === 'Difference' ? -1 : 0)
    };
  }, [comparisonData?.data]);

  // Debounce search - only search when 2+ characters or when cleared
  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    // Only trigger search if text is 2+ chars or empty
    if (searchText.length >= 2 || searchText.length === 0) {
      debounceTimer.current = setTimeout(() => {
        if (onSearch) {
          // Always send null status - let backend return all data, frontend filters by tab locally
          onSearch(searchText, sortField, sortOrder, headerFilters);
        }
      }, 2000);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText]);

  // Extract unique fields that have changes - must be before early return
  const uniqueFields = useMemo(() => {
    if (!comparisonData || !comparisonData.data) return [];
    const fields = new Set();
    comparisonData.data.forEach(item => {
      item.changes.forEach(change => {
        fields.add(change.field);
      });
    });
    return Array.from(fields);
  }, [comparisonData?.data]);

  // Get summary from response - must be before early return
  const summary = comparisonData?.summary || {
    totalBaseBatchRecords: 0,
    totalComparedBatchRecords: 0,
    totalDifferences: 0,
    added: 0,
    removed: 0,
    nodalChanged: 0,
    quantityChanged: 0,
    otherUpdated: 0
  };

  const { allChangesData, catchLevelData, addedData, removedData, centreQtyData, nodalData, centerCodeData, otherData } = useMemo(() => {
    if (!comparisonData || !comparisonData.data) {
      return {
        allChangesData: [],
        catchLevelData: [],
        addedData: [],
        removedData: [],
        centreQtyData: [],
        nodalData: [],
        centerCodeData: [],
        otherData: []
      };
    }
    return categorizeComparisonRecords(comparisonData.data);
  }, [comparisonData?.data]);

  // Select appropriate data based on active tab
  const getTabData = (tab) => {
    switch (tab) {
      case 'allChanges':
        return allChangesData;
      case 'catchLevel':
        return catchLevelData;
      case 'added':
        return addedData;
      case 'removed':
        return removedData;
      case 'centre':
        return centreQtyData;
      case 'nodal':
        return nodalData;
      case 'centerCode':
        return centerCodeData;
      case 'modified':
        return otherData;
      default:
        return allChangesData;
    }
  };

  const currentTableData = getTabData(activeTab);

  // Get fields to display based on tab
  let displayFields = fieldsToShowNonUnique;
  if (activeTab === 'catchLevel') {
    displayFields = catchLevelFields;
  }

  // Build columns dynamically
  const baseColumns = [
    {
      title: 'Catch No',
      dataIndex: 'catchNo',
      key: 'catchNo',
      width: 120,
      fixed: 'left',
      render: (text) => <span className="font-semibold">{text}</span>,
      sorter: true,
      ...getColumnSearchProps('catchNo', 'Catch No'),
    },
  ];

  // Add Centers column only for catch-level changes
  if (activeTab === 'catchLevel') {
    baseColumns.push({
      title: 'Centers Affected',
      dataIndex: 'centers',
      key: 'centers',
      width: 200,
      render: (centers, record) => (
        <div>
          <Tag color="blue">{record.centerCount} centers</Tag>
          <div style={{ fontSize: '12px', marginTop: '6px', color: '#666', maxWidth: '180px' }}>
            {centers && centers.length > 0 ? centers.join(', ') : '—'}
          </div>
        </div>
      ),
    });
  } else {
    baseColumns.push({
      title: 'Centre Code',
      dataIndex: 'centerCode',
      key: 'centerCode',
      width: 120,
      fixed: 'left',
      render: (text, record) => {
        const centerChange = record.changes?.CenterCode || record.changes?.centerCode;
        if (centerChange && centerChange.previousValue && centerChange.newValue) {
          return (
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{
                background: "#fff2f0",
                color: "#cf1322",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
                width: "fit-content"
              }}>
                - {centerChange.previousValue}
              </span>
              <span style={{
                background: "#f6ffed",
                color: "#274e0a",
                padding: "2px 6px",
                borderRadius: "4px",
                fontSize: "12px",
                fontWeight: 500,
                width: "fit-content"
              }}>
                + {centerChange.newValue}
              </span>
            </div>
          );
        }
        return <span className="font-semibold">{text}</span>;
      },
      sorter: true,
      ...getColumnSearchProps('centerCode', 'Centre Code'),
    });
  }

  const columns = [
    ...baseColumns,
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
      sorter: true,
      filters: [
        { text: 'Centre Catch Added', value: 'Centre Catch Added' },
        { text: 'Centre Catch Removed', value: 'Centre Catch Removed' },
        { text: 'Centre Catch Quantity Changed', value: 'Centre Catch Quantity Changed' },
        { text: 'Nodal Changed', value: 'Nodal Changed' },
        { text: 'Center Code Changed', value: 'Center Code Changed' },
        { text: 'Updated', value: 'Updated' },
      ],
      filterMultiple: false,
      render: (status, record) => {
        let statusList = [];
        if (Array.isArray(record.statuses) && record.statuses.length > 0) {
          statusList = record.statuses;
        } else if (typeof status === 'string') {
          statusList = status.split(',').map(s => s.trim()).filter(Boolean);
        }

        if (statusList.length === 0) {
          statusList = ['—'];
        }

        const getStatusColor = (st) => {
          if (!st) return '#faad14';
          const statusLower = st.toLowerCase();
          if (statusLower.includes('added')) return '#52c41a';
          if (statusLower.includes('removed')) return '#ff4d4f';
          if (statusLower.includes('nodal')) return '#722ed1';
          if (statusLower.includes('center code changed') || statusLower.includes('center changed')) return '#eb2f96';
          if (statusLower.includes('catch-level')) return '#13c2c2';
          if (statusLower.includes('quantity')) return '#faad14';
          return '#1890ff';
        };

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'flex-start' }}>
            {statusList.map((st, idx) => (
              <span key={idx} style={{ color: getStatusColor(st), fontWeight: 500, lineHeight: 1.3 }}>
                {st}
              </span>
            ))}
          </div>
        );
      }
    },
    ...displayFields.filter(field => field !== 'Record').map(field => ({
      title: field,
      key: field,
      width: 200,
      render: (_, record) => {
        const change = record.changes[field];
        if (!change) return <span style={{ color: "#d9d9d9" }}>—</span>;

        // If both previous and new values are null/empty, show plain dash
        if (!change.previousValue && !change.newValue) {
          return <span style={{ color: "#d9d9d9" }}>—</span>;
        }

        if (field === 'Difference') {
          try {
            const data = JSON.parse(change.newValue);

            // Compare revised to baseQty
            const targetQty = data.baseQty ?? data.baseNR;
            const revisedIsLower = data.revised < targetQty;
            const revisedIsUpper = data.revised > targetQty;

            const RevisedIcon = revisedIsLower ? <ChevronDown size={14} /> : (revisedIsUpper ? <ChevronUp size={14} /> : null);

            const baseIsLower = targetQty < data.revised;
            const baseIsUpper = targetQty > data.revised;
            const BaseIcon = baseIsLower ? <ChevronDown size={14} /> : (baseIsUpper ? <ChevronUp size={14} /> : null);

            const lowerStyle = {
              background: "#fff2f0",
              color: "#cf1322",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "4px"
            };

            const upperStyle = {
              background: "#f6ffed",
              color: "#274e0a",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "4px"
            };

            const equalStyle = {
              background: "#e6f4ff",
              color: "#0958d9",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 500,
              display: "flex",
              alignItems: "center",
              gap: "4px"
            };

            const revisedStyle = revisedIsLower ? lowerStyle : (revisedIsUpper ? upperStyle : equalStyle);
            const baseStyle = baseIsLower ? lowerStyle : (baseIsUpper ? upperStyle : equalStyle);
            const fulfilmentColor = data.fulfilment === 'Not Fulfilled' ? '#cf1322' : '#389e0d';

            let tooltipText = '';
            if (targetQty === data.revised) {
              tooltipText = 'Equal';
            } else if (data.fulfilment === 'Not Fulfilled') {
              tooltipText = `Enhanced Quantity (${targetQty}) less than Revised NrQuantity (${data.revised}) Hence Not Satisfied. Remaining: ${data.remaining}`;
            } else {
              tooltipText = `Enhanced Quantity (${targetQty}) greater than Revised NrQuantity (${data.revised}) Hence Satisfied`;
            }

            return (
              <Tooltip title={tooltipText} placement="top">
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px', cursor: 'pointer', width: 'fit-content' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={baseStyle}>
                      {BaseIcon} {targetQty}
                    </span>

                    <span style={revisedStyle}>
                      {RevisedIcon} {data.revised}
                    </span>

                    <span style={{ color: fulfilmentColor, fontWeight: 500 }}>
                      {data.fulfilment}
                    </span>
                  </div>

                  {data.remaining !== null && (
                    <div style={{ color: '#333', fontWeight: 500 }}>
                      Remaining: {data.remaining}
                    </div>
                  )}
                </div>
              </Tooltip>
            );
          } catch (e) {
            return (
              <span style={{ fontSize: "13px", fontWeight: 500, color: "#333" }}>
                {change.newValue}
              </span>
            );
          }
        }

        return (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <span style={{
              background: "#fff2f0",
              color: "#cf1322",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 500
            }}>
              - {change.previousValue}
            </span>
            <span style={{
              background: "#f6ffed",
              color: "#274e0a",
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "13px",
              fontWeight: 500
            }}>
              + {change.newValue}
            </span>
          </div>
        );
      }
    })),
    {
      title: 'Recommendation',
      key: 'recommendation',
      width: 320,
      render: (_, record) => {
        let recommendation = record.originalItem?.recommendation;
        if (activeTab === 'catchLevel') {
          recommendation = record.catchLevelRecommendation
            || record.originalItem?.catchLevelRecommendation
            || (record.changes && Object.values(record.changes).filter(c => c.isConsistentCatchLevelChange).length > 0
              ? "Update " + Object.values(record.changes).filter(c => c.isConsistentCatchLevelChange).map(c => (c.field || '').replace(/([a-z])([A-Z])/g, '$1 $2')).join(' and ')
              : record.originalItem?.recommendation);
        }
        return (
          <span style={{ fontWeight: 500, color: '#333' }}>
            {recommendation || '—'}
          </span>
        );
      }
    }
  ];

  const handleTableChange = (pagination, filters, sorter) => {
    // Handle column sorter
    let field = sortField;
    let order = sortOrder;

    if (sorter && sorter.column) {
      field = sorter.field?.toLowerCase();
      order = sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : null;
      setSortField(field);
      setSortOrder(order);
    } else if (sorter && !sorter.column) {
      field = null;
      order = null;
      setSortField(null);
      setSortOrder(null);
    }

    const newHeaderFilters = {
      catchNo: filters.catchNo ? filters.catchNo[0] : null,
      centerCode: filters.centerCode ? filters.centerCode[0] : null,
      status: filters.status ? filters.status[0] : null,
    };
    setHeaderFilters(newHeaderFilters);

    if (sorter && sorter.column) {
      if (onSort) {
        onSort(field, order, searchText, newHeaderFilters);
      }
    } else {
      if (onSearch) {
        onSearch(searchText, field, order, newHeaderFilters);
      }
    }
  };

  const handlePaginationChange = (pageNo, pageSize) => {
    if (onPaginationChange) {
      onPaginationChange(pageNo, pageSize, searchText, sortField, sortOrder, headerFilters);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    // Don't send status filter - let backend return all data and frontend filters by tab
    if (onSearch) {
      onSearch(searchText, sortField, sortOrder, headerFilters);
    }
  };

  const allChangesCount = allChangesData.length;
  const catchLevelCount = catchLevelData.length;
  const addedCount = addedData.length;
  const removedCount = removedData.length;
  const centreQtyCount = centreQtyData.length;
  const nodalCount = nodalData.length;
  const centerCodeCount = centerCodeData?.length || 0;
  const otherCount = otherData.length;

  const tabs = [
    {
      key: 'allChanges',
      label: `All Changes (${allChangesCount})`,
      count: allChangesCount,
      bold: true
    },
    {
      key: 'catchLevel',
      label: `Catch-Level Changes (${catchLevelCount})`,
      count: catchLevelCount,
      bold: true,
      color: '#1890ff'
    },
    {
      key: 'added',
      label: `Added (${addedCount})`,
      count: addedCount,
      color: '#52c41a'
    },
    {
      key: 'removed',
      label: `Removed (${removedCount})`,
      count: removedCount,
      color: '#ff4d4f'
    },
    {
      key: 'centre',
      label: `Centre Qty Changed (${centreQtyCount})`,
      count: centreQtyCount,
      color: '#faad14'
    },
    {
      key: 'nodal',
      label: `Nodal Change (${nodalCount})`,
      count: nodalCount,
      color: '#722ed1'
    },
    {
      key: 'centerCode',
      label: `Center Code Changed (${centerCodeCount})`,
      count: centerCodeCount,
      color: '#eb2f96'
    }
    // {
    //   key: 'modified',
    //   label: `Other Changes (${otherCount})`,
    //   count: otherCount,
    //   color: '#faad14'
    // }
  ];

  return (
    <>
      {comparisonData ? (
        <>
          {/* Lot Date Range Information */}
          {comparisonData?.lotDateRange && (
            <div style={{ marginBottom: 16, padding: 12, background: '#e6f7ff', borderRadius: 4, borderLeft: '3px solid #1890ff' }}>
              <div style={{ fontSize: 13, color: '#0050b3' }}>
                <strong>Lot {comparisonData.lotDateRange.lotNo} Date Range:</strong> {comparisonData.lotDateRange.startDate} to {comparisonData.lotDateRange.endDate}
              </div>
            </div>
          )}

          {/* Search Bar & Action Toolbar */}
          <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
            <Space align="center" wrap>
              <Spin spinning={loading} size="small">
                <Input.Search
                  placeholder="Search by Catch No or Centre Code (min 2 characters, searches after 2 secs)"
                  prefix={<SearchOutlined />}
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  allowClear
                  style={{ width: 320 }}
                  disabled={loading}
                />
              </Spin>

              <Dropdown menu={{ items: downloadMenuItems }} trigger={['click']} placement="bottomLeft">
                <Button
                  icon={<DownloadOutlined />}
                  loading={exportLoading}
                  style={{
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  {selectedCount > 0 ? `Download (${selectedCount})` : 'Download'} <ChevronDown size={14} />
                </Button>
              </Dropdown>
            </Space>

            <Space wrap align="center">
              {selectedCount > 0 && (
                <Space>
                  <Tag color="blue" style={{ fontSize: 13, padding: '3px 8px' }}>
                    {selectedCount} row{selectedCount > 1 ? 's' : ''} selected
                  </Tag>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedRowKeys([]);
                      setSelectedRowsData([]);
                    }}
                    style={{ fontSize: 12 }}
                  >
                    Clear Selection
                  </Button>
                </Space>
              )}

              {onPushChanges && (
                <Button
                  type="primary"
                  icon={<CloudUploadOutlined />}
                  loading={pushLoading}
                  onClick={handlePush}
                  style={{
                    fontWeight: 500,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    backgroundColor: '#1890ff'
                  }}
                >
                  {selectedCount > 0 ? `Push Changes (${selectedCount})` : 'Push All Changes'}
                </Button>
              )}
            </Space>
          </div>

          {/* Tabs */}
          <Spin spinning={loading} size="small">
            <Tabs
              activeKey={activeTab}
              onChange={handleTabChange}
              style={{ marginBottom: 16 }}
              items={tabs.map(tab => ({
                key: tab.key,
                label: (
                  <span style={{
                    color: tab.color || '#1890ff',
                    fontWeight: tab.bold ? 'bold' : 'normal'
                  }}>
                    {tab.label}
                  </span>
                ),
                children: null
              }))}
            />
          </Spin>

          {/* Table */}
          <Spin spinning={loading} size="large" tip="Loading data...">
            <Table
              columns={columns}
              dataSource={loading ? [] : currentTableData}
              rowKey="key"
              rowSelection={rowSelection}
              pagination={false}
              scroll={{ x: 1200 }}
              size="middle"
              onChange={handleTableChange}
              locale={{ emptyText: loading ? "Loading..." : <Empty description="No records found for this status" /> }}
            />
          </Spin>

          {/* Custom Pagination Controls */}
          <Row justify="space-between" align="middle" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Col>
              <span style={{ color: '#666' }}>
                Total {currentTableData.length} records {activeTab === 'allChanges' ? 'with changes' : `with ${activeTab === 'catchLevel' ? 'catch-level changes' : activeTab === 'added' ? 'added status' : activeTab === 'removed' ? 'removed status' : activeTab === 'centre' ? 'quantity changed' : activeTab === 'nodal' ? 'nodal changes' : activeTab === 'centerCode' ? 'center code changes' : 'changes'}`}
              </span>
            </Col>
            <Col>
              <Pagination
                current={comparisonData.pageNo || 1}
                pageSize={comparisonData.pageSize || 20}
                total={comparisonData.totalCount}
                pageSizeOptions={['10', '20', '50', '100']}
                showSizeChanger
                showQuickJumper
                onChange={(pageNo, pageSize) => handlePaginationChange(pageNo, pageSize)}
                onShowSizeChange={(pageNo, pageSize) => handlePaginationChange(1, pageSize)}
              />
            </Col>
          </Row>
        </>
      ) : (
        <Empty description="No comparison data available" />
      )}
    </>
  );
};

export default BatchComparisonTable;