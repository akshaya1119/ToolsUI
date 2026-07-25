import React, { useMemo, useState, useEffect, useRef } from 'react';
import { Table, Empty, Pagination, Row, Col, Input, Tabs, Tag, Space } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import './BatchComparisonTable.css';

const BatchComparisonTable = ({ comparisonData, onPaginationChange, onSearch, onSort }) => {
  const [searchText, setSearchText] = useState('');
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState(null);
  const [activeTab, setActiveTab] = useState('all');
  const debounceTimer = useRef(null);

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
          onSearch(searchText, sortField, sortOrder, activeTab === 'all' ? null : getStatusForTab(activeTab));
        }
      }, 2000);
    }

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [searchText, activeTab]);

  // Map tab key to status filter
  const getStatusForTab = (tabKey) => {
    const statusMap = {
      'all': null,
      'added': 'Centre Catch Added',
      'removed': 'Centre Catch Removed',
      'modified': 'Updated',
      'other': 'Other Updates',
      'centre': 'Centre Catch Quantity Changed',
      'nodal': 'Nodal Changed'
    };
    return statusMap[tabKey] || null;
  };

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
  const tableData = useMemo(() => {
    if (!comparisonData || !comparisonData.data) return [];
    return comparisonData.data.map((item, index) => ({
      id: `${item.catchNo}-${item.centerCode}-${index}`,
      key: `${item.catchNo}-${item.centerCode}-${index}`,
      catchNo: item.catchNo,
      centerCode: item.centerCode,
      status: item.status,
      changes: item.changes.reduce((acc, change) => {
        acc[change.field] = change;
        return acc;
      }, {})
    }));
  }, [comparisonData?.data]);

  // Build columns dynamically
  const columns = [
    {
      title: 'Catch No',
      dataIndex: 'catchNo',
      key: 'catchNo',
      width: 120,
      fixed: 'left',
      render: (text) => <span className="font-semibold">{text}</span>,
      sorter: true,
    },
    {
      title: 'Centre Code',
      dataIndex: 'centerCode',
      key: 'centerCode',
      width: 120,
      fixed: 'left',
      render: (text) => <span className="font-semibold">{text}</span>,
      sorter: true,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 180,
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
    ...uniqueFields.filter(field => field !== 'Record').map(field => ({
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
      const field = sorter.field;
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
    // The useEffect will handle the search call when activeTab changes
  };

  const tabs = [
    {
      key: 'all',
      label: `All (${summary.totalDifferences || comparisonData.totalCount})`,
      count: summary.totalDifferences || comparisonData.totalCount
    },
    {
      key: 'added',
      label: `Added (${summary.added || 0})`,
      count: summary.added || 0,
      color: '#52c41a'
    },
    {
      key: 'removed',
      label: `Removed (${summary.removed || 0})`,
      count: summary.removed || 0,
      color: '#ff4d4f'
    },
    {
      key: 'centre',
      label: `Centre Qty Changed (${summary.quantityChanged || 0})`,
      count: summary.quantityChanged || 0,
      color: '#1890ff'
    },
    {
      key: 'nodal',
      label: `Nodal Change (${summary.nodalChanged || 0})`,
      count: summary.nodalChanged || 0,
      color: '#722ed1'
    },
    {
      key: 'modified',
      label: `Other Changes (${summary.otherUpdated || 0})`,
      count: summary.otherUpdated || 0,
      color: '#faad14'
    }
  ];

  return (
    <>
      {comparisonData ? (
        <>
          {/* Search Bar */}
          <div style={{ marginBottom: 16 }}>
            <Input.Search
              placeholder="Search by Catch No or Centre Code (min 2 characters, searches after 2 secs)"
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{ width: 300 }}
            />
          </div>

          {/* Tabs */}
          <Tabs 
            activeKey={activeTab}
            onChange={handleTabChange}
            style={{ marginBottom: 16 }}
            items={tabs.map(tab => ({
              key: tab.key,
              label: (
                <span>
                  {tab.label}
                </span>
              ),
              children: null
            }))}
          />

          {/* Table */}
          <Table
            columns={columns}
            dataSource={tableData}
            rowKey="key"
            pagination={false}
            scroll={{ x: 1200 }}
            size="middle"
            onChange={handleTableChange}
            locale={{ emptyText: <Empty description="No records found for this status" /> }}
          />
          
          {/* Custom Pagination Controls */}
          <Row justify="space-between" align="middle" style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
            <Col>
              <span style={{ color: '#666' }}>
                Total {comparisonData.totalCount} records with changes
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
