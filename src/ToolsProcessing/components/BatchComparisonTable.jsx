import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Table, Empty, Pagination, Row, Col, Input, Tabs, Tag, Space, Spin } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './BatchComparisonTable.css';

const BatchComparisonTable = ({ comparisonData, onPaginationChange, onSearch, onSort, loading = false }) => {
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('allChanges');
  const debounceTimer = useRef(null);

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
      fieldsToShowNonUnique: Array.from(nonUnique),
      catchLevelFields: Array.from(catchLevel)
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
          onSearch(searchText, sortField, sortOrder, null);
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

  // Transform data - each record from backend becomes a row (must be before early return)
  const { allChangesData, catchLevelData, addedData, removedData, centreQtyData, nodalData, otherData } = useMemo(() => {
    if (!comparisonData || !comparisonData.data) {
      return {
        allChangesData: [],
        catchLevelData: [],
        addedData: [],
        removedData: [],
        centreQtyData: [],
        nodalData: [],
        otherData: []
      };
    }
    
    const allData = comparisonData.data.map((item, index) => ({
      id: `${item.catchNo}-${item.centerCode}-${index}`,
      key: `${item.catchNo}-${item.centerCode}-${index}`,
      catchNo: item.catchNo,
      centerCode: item.centerCode,
      status: item.status,
      changes: item.changes.reduce((acc, change) => {
        acc[change.field] = change;
        return acc;
      }, {}),
      originalItem: item
    }));
    
    // Filter for All Changes: include records that have non-unique field changes or are Added/Removed
    const allChanges = allData.filter(item => {
      const hasNonUniqueChanges = Object.values(item.originalItem.changes || []).some(
        change => !change.isUniqueField || (change.isUniqueField && !change.isConsistentCatchLevelChange)
      );
      const isAddedOrRemoved = item.status === "Centre Catch Added" || item.status === "Centre Catch Removed";
      return hasNonUniqueChanges || isAddedOrRemoved;
    });
    
    // Filter for Catch-Level Changes: ONE row per catch with all centers aggregated
    const catchLevelMap = new Map();
    allData.forEach(item => {
      const hasCatchLevelChange = Object.values(item.originalItem.changes || []).some(
        change => change.isConsistentCatchLevelChange
      );
      if (hasCatchLevelChange) {
        if (!catchLevelMap.has(item.catchNo)) {
          catchLevelMap.set(item.catchNo, {
            id: item.catchNo,
            key: item.catchNo,
            catchNo: item.catchNo,
            centerCode: '', // Empty for aggregated view
            status: item.originalItem.catchLevelStatus || 'Catch-Level Change', // Use catchLevelStatus from backend
            centers: [],
            centerCount: 0,
            // Merge changes from all centers - use the first occurrence
            changes: item.changes,
            originalItem: item.originalItem
          });
        }
        const catchData = catchLevelMap.get(item.catchNo);
        catchData.centers.push(item.centerCode);
        catchData.centerCount = catchData.centers.length;
      }
    });
    const catchLevel = Array.from(catchLevelMap.values());
    
    // Filter by status for other tabs
    const added = allData.filter(item => item.status === "Centre Catch Added");
    const removed = allData.filter(item => item.status === "Centre Catch Removed");
    const centreQty = allData.filter(item => item.status === "Centre Catch Quantity Changed");
    const nodal = allData.filter(item => item.status === "Nodal Changed");
    const other = allData.filter(item => item.status === "Updated");
    
    return {
      allChangesData: allChanges,
      catchLevelData: catchLevel,
      addedData: added,
      removedData: removed,
      centreQtyData: centreQty,
      nodalData: nodal,
      otherData: other
    };
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
      render: (text) => <span className="font-semibold">{text}</span>,
      sorter: true,
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
      render: (status) => {
        // Map status to color
        let color = '#faad14'; // default orange
        
        if (status) {
          const statusLower = status.toLowerCase();
          if (statusLower.includes('added')) {
            color = '#52c41a'; // green for added
          } else if (statusLower.includes('removed')) {
            color = '#ff4d4f'; // red for removed
          } else if (statusLower.includes('nodal')) {
            color = '#722ed1'; // purple for nodal
          } else if (statusLower.includes('catch-level')) {
            color = '#13c2c2'; // cyan for catch-level changes
          } else if (statusLower.includes('centre') && statusLower.includes('changed') && !statusLower.includes('quantity')) {
            color = '#1890ff'; // blue for centre changed
          }
        }
        
        return (
          <span style={{ color: color, fontWeight: 500 }}>
            {status || '—'}
          </span>
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
    }))
  ];

  const handleTableChange = (pagination, filters, sorter) => {
    // Handle column sorter
    if (sorter && sorter.column) {
      const field = sorter.field?.toLowerCase();
      const order = sorter.order ? (sorter.order === 'ascend' ? 'asc' : 'desc') : null;
      
      setSortField(field);
      setSortOrder(order);
      
      if (onSort) {
        onSort(field, order, searchText);
      }
    }
  };

  const handlePaginationChange = (pageNo, pageSize) => {
    if (onPaginationChange) {
      onPaginationChange(pageNo, pageSize);
    }
  };

  const handleTabChange = (key) => {
    setActiveTab(key);
    // Don't send status filter - let backend return all data and frontend filters by tab
    if (onSearch) {
      onSearch(searchText, sortField, sortOrder, null);
    }
  };

  const allChangesCount = allChangesData.length;
  const catchLevelCount = catchLevelData.length;
  const addedCount = addedData.length;
  const removedCount = removedData.length;
  const centreQtyCount = centreQtyData.length;
  const nodalCount = nodalData.length;
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

          {/* Search Bar */}
          <div style={{ marginBottom: 16 }}>
            <Spin spinning={loading} size="small">
              <Input.Search
                placeholder="Search by Catch No or Centre Code (min 2 characters, searches after 2 secs)"
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
                style={{ width: 300 }}
                disabled={loading}
              />
            </Spin>
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
                Total {currentTableData.length} records {activeTab === 'allChanges' ? 'with changes' : `with ${activeTab === 'catchLevel' ? 'catch-level changes' : activeTab === 'added' ? 'added status' : activeTab === 'removed' ? 'removed status' : activeTab === 'centre' ? 'quantity changed' : activeTab === 'nodal' ? 'nodal changes' : 'changes'}`}
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
