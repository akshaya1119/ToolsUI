import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { Filter, FileEdit, Check, X } from 'lucide-react';
import { Table, Input, Space, Button, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import API from '../hooks/api';
import { useToast } from '../hooks/useToast';
import useStore from '../stores/ProjectData';
import SummaryCardsHV from './components/HeaderVerification/SummaryCardsHV';
import SearchBarHV from './components/HeaderVerification/SearchBarHV';
import StatusBadgeHV from './components/HeaderVerification/StatusBadgeHV';
import PrintPreviewHV from './components/HeaderVerification/PrintPreviewHV';
import { normalizeStatus, statusLabels, statusDropdownOptions } from './components/HeaderVerification/statusUtils';
import { getCurrentUserId, getCurrentUserRoleId } from '../hooks/useUserMap';

const customTableStyles = `
  .header-verification-table tbody tr:hover td {
    background-color: inherit !important;
  }
`;

const HeaderVerification = () => {
  const projectId = useStore((state) => state.projectId);
  const setHeaderCorrectionCount = useStore((state) => state.setHeaderCorrectionCount);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [allLots, setAllLots] = useState([]);
  const [summaryStats, setSummaryStats] = useState({ total: 0, verified: 0, unclear: 0, notVerified: 0, correctionCount: 0 });
  const [totalRecordsCount, setTotalRecordsCount] = useState(0);
  const [serverTotalPages, setServerTotalPages] = useState(1);
  const [serverPaging, setServerPaging] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [searchParams] = useSearchParams();
  // Must be declared before useState calls that reference them
  const initCatch = searchParams.get('catch') || '';
  const initVerificationStatus = searchParams.get('status');

  const [correctionFilter, setCorrectionFilter] = useState(false);
  const currentUserRoleId = getCurrentUserRoleId();
  const isRoleAuthorized = currentUserRoleId !== null && Number(currentUserRoleId) <= 4 && Number(currentUserRoleId) > 0;
  const canShowCorrection = isRoleAuthorized && ((summaryStats.correctionCount ?? 0) > 0 || correctionFilter);

  // Pre-fill search input from ?catch= param, but don't restrict the API — let user see all records
  const [globalSearch, setGlobalSearch] = useState('');
  const [searchInput, setSearchInput] = useState(initCatch);
  const globalSelectedLot = useStore((state) => state.selectedLot);
  const globalSetSelectedLot = useStore((state) => state.setSelectedLot);
  const selectedLot = globalSelectedLot ? String(globalSelectedLot) : '';
  const setSelectedLot = (lotVal) => {
    if (lotVal === '' || lotVal === null || lotVal === undefined) {
      globalSetSelectedLot(null);
    } else {
      globalSetSelectedLot(parseInt(lotVal, 10));
    }
  };
  // If navigated with a catch param, jump directly to the correct status tab
  const [selectedStatus, setSelectedStatus] = useState(() => {
    if (!initCatch) return 'NOT_VERIFIED';

    switch (String(initVerificationStatus)) {
      case '0':
        return 'NOT_VERIFIED';
      case '2':
        return 'UNCLEAR';
      case '1':
        return 'VERIFIED';
      default:
        return 'ALL';
    }
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [editingRowId, setEditingRowId] = useState(null);
  const [editFormData, setEditFormData] = useState({});
  const [columnFilters, setColumnFilters] = useState({
    catchNo: '', lotNo: '', a: '', b: '', c: '', d: '', remark: '', date: '', time: '', status: ''
  });
  const [tableSorter, setTableSorter] = useState({ field: null, order: null });
  const { showToast } = useToast();
  const [currentUser, setCurrentUser] = useState(null);
  const [userMap, setUserMap] = useState({});
  // catchNo → envLotNo map for the Batch column
  const [catchEnvLotMap, setCatchEnvLotMap] = useState({});

  // Fetch all users for mapping userId to firstName
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        // Use VITE_API_BASE_URL for user data
        const baseUrl = import.meta.env.VITE_API_BASE_URL;
        const token = localStorage.getItem('token');
        const res = await axios.get(`${baseUrl}/User`, {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { Authorization: `Bearer ${token}` })
          }
        });
        console.log('[HeaderVerification] Fetched users from VITE_API_BASE_URL:', res.data);
        const map = {};
        (res.data || []).forEach(user => {
          // Use only firstName
          const displayName = user.firstName || user.userName || `User ${user.userId}`;
          map[user.userId] = displayName;
          console.log(`[HeaderVerification] Mapped userId ${user.userId} to "${displayName}"`);
        });
        console.log('[HeaderVerification] Final user map:', map);
        setUserMap(map);
      } catch (err) {
        console.error('Failed to fetch users from VITE_API_BASE_URL:', err);
      }
    };
    fetchUsers();
  }, []);

  // All toggleable columns; catchNo and status are always visible
  const ALWAYS_VISIBLE = ['catchNo', 'status', 'actions'];
  const ALL_TOGGLEABLE = ['a', 'b', 'c', 'd', 'remark', 'lotNo', 'date', 'time', 'batch'];
  const [visibleColumns, setVisibleColumns] = useState(new Set([...ALWAYS_VISIBLE, ...ALL_TOGGLEABLE]));

  // Fetch envLot assignments to build catchNo → envLotNo map for the Batch column
  const fetchCatchEnvLotMap = useCallback(async () => {
    if (!projectId) return;
    try {
      const res = await API.get(`/NRDataLots/GetAssignedEnvLotCatches/${projectId}`);
      const map = {};
      (res.data || []).forEach((item) => {
        const catchNo = (item.catchNo ?? item.CatchNo ?? '').toString().trim();
        const envLotNo = item.envLotNo ?? item.EnvLotNo;
        if (catchNo && envLotNo) map[catchNo] = Number(envLotNo);
      });
      setCatchEnvLotMap(map);
    } catch (err) {
      console.error('Failed to fetch env lot assignments:', err);
    }
  }, [projectId]);

  useEffect(() => { fetchCatchEnvLotMap(); }, [fetchCatchEnvLotMap]);

  // useEffect(() => {
  //   const fetchCurrentUser = async () => {
  //     try {
  //       const res = await API.get('/User');
  //       const userId = localStorage.getItem('userId');
  //       const user = res.data.find(u => u.userId === parseInt(userId || '0'));
  //       if (user) {
  //         setCurrentUser(user);
  //       }
  //     } catch (err) {
  //       console.error('Failed to fetch current user:', err);
  //     }
  //   };
  //   fetchCurrentUser();
  // }, []);

  // Fetch all records once (no lot filter) to populate lot dropdown + summary cards
  const fetchAllMeta = useCallback(async () => {
    try {
      if (!projectId) return;
      // Hardcode an arbitrarily large page size to ensure all lots are loaded for the filter dropdown
      const params = new URLSearchParams({ pageSize: '100000', page: '1' });
      if (selectedLot) params.set('lotNo', selectedLot);
      const res = await API.get(`/Correction/HeaderVerification/${projectId}?${params}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];
      const total = res.data?.summary?.totalRecords ?? res.data?.pagination?.totalRecords ?? data.length;
      const verified = res.data?.summary?.verified ?? data.filter(d => normalizeStatus(d.status) === 1).length;
      const unclear = res.data?.summary?.unclear ?? data.filter(d => normalizeStatus(d.status) === 2).length;
      const notVerified = res.data?.summary?.notVerified ?? data.filter(d => normalizeStatus(d.status) === 0).length;
      const correctionCount = res.data?.summary?.correctionCount ?? res.data?.summary?.hasRemarkCount ?? data.filter(d => !!d.remark && d.remark.trim() !== '').length;
      const lots = [...new Set(data.map(d => d.lotNo).filter(Boolean))].sort();
      setAllLots(lots);
      setSummaryStats({
        total,
        verified,
        unclear,
        notVerified,
        correctionCount,
      });
      if (setHeaderCorrectionCount) {
        setHeaderCorrectionCount(correctionCount);
      }
    } catch (err) {
      console.error('Failed to fetch meta:', err);
    }
  }, [projectId, selectedLot, setHeaderCorrectionCount]);

  // Fetch filtered table records whenever lot changes
  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      if (!projectId) {
        showToast('Please select a project first', 'error');
        return;
      }
      // Send current page, pageSize, search and status to backend so server pagination and filtering is used.
      const params = new URLSearchParams({ pageSize: String(pageSize), page: String(currentPage) });

      // When Correction filter is active, ignore all other filters (status, lot, column filters, search)
      if (correctionFilter) {
        params.set('hasRemark', 'true');
      } else {
        if (selectedLot) params.set('lotNo', selectedLot);
        if (globalSearch) params.set('search', globalSearch);

        // Map card key → API status param string
        const statusApiMap = {
          VERIFIED: 'Verified',
          UNCLEAR: 'Unclear',
          NOT_VERIFIED: 'NotVerified',
        };
        const apiStatus = statusApiMap[selectedStatus];
        if (apiStatus) params.set('status', apiStatus);

        // Append column filters (skip 'status' — handled by selectedStatus param)
        Object.keys(columnFilters).forEach((key) => {
          if (key !== 'status' && columnFilters[key]) {
            params.set(key, columnFilters[key].trim());
          }
        });
      }

      if (tableSorter.field) {
        params.set('sortBy', tableSorter.field);
        params.set('sortOrder', tableSorter.order === 'descend' ? 'desc' : 'asc');
      }

      const res = await API.get(`/Correction/HeaderVerification/${projectId}?${params}`);
      const data = Array.isArray(res.data) ? res.data : res.data?.data || [];

      // If backend returned pagination info, prefer server-side counts/pages
      if (res.data?.pagination) {
        setServerPaging(true);
        setTotalRecordsCount(res.data.pagination.totalRecords);
        setServerTotalPages(res.data.pagination.totalPages);
      } else {
        setServerPaging(false);
        setTotalRecordsCount(data.length);
        setServerTotalPages(Math.ceil(data.length / pageSize) || 1);
      }

      if (res.data?.summary?.correctionCount !== undefined) {
        setSummaryStats(prev => ({
          ...prev,
          correctionCount: res.data.summary.correctionCount
        }));
        if (setHeaderCorrectionCount) {
          setHeaderCorrectionCount(res.data.summary.correctionCount);
        }
      }

      setRecords(data.map(d => ({ ...d, date: d.date, time: d.time })));
    } catch (err) {
      console.error('Failed to fetch records:', err);
      showToast('Failed to load records', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, projectId, selectedLot, pageSize, currentPage, globalSearch, selectedStatus, tableSorter, columnFilters, correctionFilter, setHeaderCorrectionCount]);

  const hasAutoSelectedRef = useRef(false);

  useEffect(() => {
    hasAutoSelectedRef.current = false;
  }, [projectId]);

  useEffect(() => { fetchAllMeta(); }, [fetchAllMeta]);
  
  // Auto-select category or Correction filter ONCE on initial project load
  // If user has roleId <= 4 and there are corrections (correctionCount > 0), show filtered correction data first!
  useEffect(() => {
    if (initCatch || hasAutoSelectedRef.current || (!summaryStats.total && !summaryStats.notVerified && !summaryStats.unclear && !summaryStats.verified && !summaryStats.correctionCount)) return;
    hasAutoSelectedRef.current = true;

    if (isRoleAuthorized && (summaryStats.correctionCount ?? 0) > 0) {
      setCorrectionFilter(true);
    } else if (summaryStats.notVerified > 0) {
      setSelectedStatus('NOT_VERIFIED');
    } else if (summaryStats.unclear > 0) {
      setSelectedStatus('UNCLEAR');
    } else if (summaryStats.verified > 0) {
      setSelectedStatus('VERIFIED');
    } else {
      setSelectedStatus('ALL');
    }
  }, [summaryStats, initCatch, isRoleAuthorized]);
  
  useEffect(() => { fetchRecords(); }, [fetchRecords]);

  const getNumericStatus = normalizeStatus;

  // lots come from allLots (unfiltered), not from current records
  const lots = allLots;

  // The API already applies status, columnFilter, and lot filters server-side.
  // Client-side: handle only globalSearch on returned records.
  const filteredRecords = useMemo(() => {
    if (!globalSearch) return records;
    const query = globalSearch.toLowerCase();
    return records.filter((r) => {
      const numStatus = getNumericStatus(r.status);
      const statusText = numStatus === 1 ? 'verified' : numStatus === 2 ? 'unclear' : 'not verified';
      return (
        statusText.includes(query) ||
        Object.entries(r).some(([k, val]) =>
          k !== 'status' && String(val ?? '').toLowerCase().includes(query)
        )
      );
    });
  }, [records, globalSearch]);

  // Only calculate totals once data has loaded — avoids "Page 1 of 0" during fetch
  const filteredTotalRecords = loading ? 0 : filteredRecords.length;
  const filteredTotalPages = loading ? 1 : (Math.ceil(filteredTotalRecords / pageSize) || 1);

  // Choose displayed rows: client-slice when not server-paging
  const displayedRows = useMemo(() => {
    if (loading) return [];
    if (serverPaging) return records;
    return filteredRecords.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  }, [loading, serverPaging, records, filteredRecords, currentPage, pageSize]);

  const displayedTotalRecords = loading ? 0 : (serverPaging ? totalRecordsCount : filteredTotalRecords);
  const displayedTotalPages = loading ? 1 : (serverPaging ? serverTotalPages : filteredTotalPages);

  const handleColumnSearch = (selectedKeys, confirm, dataIndex) => {
    confirm?.();
    setColumnFilters((prev) => {
      const nextFilters = { ...prev };
      if (selectedKeys?.[0]) {
        nextFilters[dataIndex] = selectedKeys[0];
      } else {
        delete nextFilters[dataIndex];
      }
      return nextFilters;
    });
    setCurrentPage(1);
  };

  const handleColumnReset = (clearFilters, dataIndex) => {
    clearFilters?.();

    setColumnFilters((prev) => ({
      ...prev,
      [dataIndex]: '',
    }));

    setCurrentPage(1);
  };

  const handleTableChange = (pagination, filters, sorter) => {
    setCurrentPage(pagination.current || 1);
    setPageSize(pagination.pageSize || 20);

    const normalizedSorter = Array.isArray(sorter) ? sorter[0] : sorter;
    setTableSorter({
      field: normalizedSorter?.field ?? null,
      order: normalizedSorter?.order ?? null,
    });
  };

  // Reset pagination when page goes out of range — but only after data has settled
  useEffect(() => {
    if (!loading && displayedTotalPages > 0 && currentPage > displayedTotalPages) {
      setCurrentPage(1);
    }
  }, [loading, displayedTotalPages, currentPage]);

  // Close preview when switching cards (status)
  useEffect(() => {
    setPreviewOpen(false);
  }, [selectedStatus]);

  // Helper function to get firstName from userId using fetched user data
  const getUserFirstName = (userId) => {
    return userMap[userId] || `User ${userId}`;
  };

  const getColumnSearchProps = (dataIndex) => ({
    filterDropdown: ({
      setSelectedKeys,
      selectedKeys,
      confirm,
      clearFilters,
    }) => (
      <div style={{ padding: 8, width: 220 }}>
        <Input
          autoFocus
          placeholder={`Search ${dataIndex}`}
          value={selectedKeys[0] || ''}
          onChange={(e) => {
            const value = e.target.value;
            setSelectedKeys(value ? [value] : []);
          }}
          onPressEnter={() => {
            handleColumnSearch(selectedKeys, confirm, dataIndex);
          }}
          style={{
            width: '100%',
            marginBottom: 8,
            display: 'block',
          }}
        />

        <Space size="small">
          <Button
            type="primary"
            size="small"
            onClick={() => {
              handleColumnSearch(selectedKeys, confirm, dataIndex);
            }}
          >
            Search
          </Button>

          <Button
            size="small"
            onClick={() => {
              handleColumnReset(clearFilters, dataIndex);
            }}
          >
            Reset
          </Button>
        </Space>
      </div>
    ),

    filterIcon: () => (
      <SearchOutlined
        style={{
          color: columnFilters[dataIndex]
            ? '#1890ff'
            : undefined,
        }}
      />
    ),

    filteredValue: columnFilters[dataIndex]
      ? [columnFilters[dataIndex]]
      : null,

    render: (text) =>
      columnFilters[dataIndex] ? (
        <span style={{ color: '#1890ff' }}>
          {text}
        </span>
      ) : (
        text
      ),
  });

  const tableColumns = useMemo(() => [
    {
      title: 'Catch No.',
      dataIndex: 'catchNo',
      key: 'catchNo',
      fixed: 'left',
      width: 110,
      ...getColumnSearchProps('catchNo'),
      sorter: (a, b) => String(a.catchNo || '').localeCompare(String(b.catchNo || '')),
      sortOrder: tableSorter.field === 'catchNo' ? tableSorter.order : null,
      render: (value) => <span className="text-sm text-gray-900">{value}</span>,
    },
    {
      title: 'Lot',
      dataIndex: 'lotNo',
      key: 'lotNo',
      width: 100,
      ...getColumnSearchProps('lotNo'),
      sorter: (a, b) => String(a.lotNo || '').localeCompare(String(b.lotNo || '')),
      sortOrder: tableSorter.field === 'lotNo' ? tableSorter.order : null,
      render: (value) => <span className="text-sm text-gray-600">{value}</span>,
    },
    {
      title: 'Batch',
      key: 'batch',
      width: 110,
      sorter: (a, b) => {
        const ea = catchEnvLotMap[(a.catchNo ?? '').toString().trim()] ?? 0;
        const eb = catchEnvLotMap[(b.catchNo ?? '').toString().trim()] ?? 0;
        return ea - eb;
      },
      sortOrder: tableSorter.field === 'batch' ? tableSorter.order : null,
      render: (_, record) => {
        const envLotNo = catchEnvLotMap[(record.catchNo ?? '').toString().trim()];
        return envLotNo
          ? <Tag color="blue" style={{ fontWeight: 500 }}>Batch {envLotNo}</Tag>
          : <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Not allotted</span>;
      },
    },
    {
      title: 'A',
      dataIndex: 'a',
      key: 'a',
      width: 90,
      ...getColumnSearchProps('a'),
      sorter: (a, b) => String(a.a || '').localeCompare(String(b.a || '')),
      sortOrder: tableSorter.field === 'a' ? tableSorter.order : null,
      render: (value, record) => {
        const isFieldLocked = normalizeStatus(record.status) === 1 && !isRoleAuthorized;
        if (editingRowId === record.id && !isFieldLocked) {
          return (
            <textarea
              className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none resize-none overflow-hidden"
              value={editFormData.a || ''}
              rows={Math.max(2, Math.ceil((editFormData.a || '').length / 30))}
              onChange={(e) => setEditFormData({ ...editFormData, a: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return <span className="text-sm text-gray-800">{value || '-'}</span>;
      },
    },
    {
      title: 'B',
      dataIndex: 'b',
      key: 'b',
      width: 90,
      ...getColumnSearchProps('b'),
      sorter: (a, b) => String(a.b || '').localeCompare(String(b.b || '')),
      sortOrder: tableSorter.field === 'b' ? tableSorter.order : null,
      render: (value, record) => {
        const isFieldLocked = normalizeStatus(record.status) === 1 && !isRoleAuthorized;
        if (editingRowId === record.id && !isFieldLocked) {
          return (
            <textarea
              className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none resize-none overflow-hidden"
              value={editFormData.b || ''}
              rows={Math.max(2, Math.ceil((editFormData.b || '').length / 30))}
              onChange={(e) => setEditFormData({ ...editFormData, b: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return <span className="text-sm text-gray-800">{value || '-'}</span>;
      },
    },
    {
      title: 'C',
      dataIndex: 'c',
      key: 'c',
      width: 90,
      ...getColumnSearchProps('c'),
      sorter: (a, b) => String(a.c || '').localeCompare(String(b.c || '')),
      sortOrder: tableSorter.field === 'c' ? tableSorter.order : null,
      render: (value, record) => {
        const isFieldLocked = normalizeStatus(record.status) === 1 && !isRoleAuthorized;
        if (editingRowId === record.id && !isFieldLocked) {
          return (
            <textarea
              className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none resize-none overflow-hidden"
              value={editFormData.c || ''}
              rows={Math.max(2, Math.ceil((editFormData.c || '').length / 30))}
              onChange={(e) => setEditFormData({ ...editFormData, c: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return <span className="text-sm text-gray-800">{value || '-'}</span>;
      },
    },
    {
      title: 'D',
      dataIndex: 'd',
      key: 'd',
      width: 90,
      ...getColumnSearchProps('d'),
      sorter: (a, b) => String(a.d || '').localeCompare(String(b.d || '')),
      sortOrder: tableSorter.field === 'd' ? tableSorter.order : null,
      render: (value, record) => {
        const isFieldLocked = normalizeStatus(record.status) === 1 && !isRoleAuthorized;
        if (editingRowId === record.id && !isFieldLocked) {
          return (
            <textarea
              className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none resize-none overflow-hidden"
              value={editFormData.d || ''}
              rows={Math.max(2, Math.ceil((editFormData.d || '').length / 30))}
              onChange={(e) => setEditFormData({ ...editFormData, d: e.target.value })}
              onClick={(e) => e.stopPropagation()}
            />
          );
        }
        return <span className="text-sm text-gray-800">{value || '-'}</span>;
      },
    },
    {
      title: 'Remark',
      dataIndex: 'remark',
      key: 'remark',
      width: 140,
      ...getColumnSearchProps('remark'),
      sorter: (a, b) => String(a.remark || '').localeCompare(String(b.remark || '')),
      sortOrder: tableSorter.field === 'remark' ? tableSorter.order : null,
      render: (value, record) => (
        editingRowId === record.id ? (
          <textarea
            className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none resize-none overflow-hidden"
            value={editFormData.remark || ''}
            placeholder="Enter remark..."
            rows={Math.max(2, Math.ceil((editFormData.remark || '').length / 30))}
            onChange={(e) => setEditFormData({ ...editFormData, remark: e.target.value })}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <span className="text-sm text-gray-800">{value || '-'}</span>
        )
      ),
    },
    {
      title: 'Exam Date',
      dataIndex: 'date',
      key: 'date',
      width: 140,
      ...getColumnSearchProps('date'),
      sorter: (a, b) => String(a.date || '').localeCompare(String(b.date || '')),
      sortOrder: tableSorter.field === 'date' ? tableSorter.order : null,
      render: (value, record) => (
          <span className="text-sm text-gray-600 whitespace-nowrap">{value}</span>
      ),
    },
    {
      title: 'Exam Time',
      dataIndex: 'time',
      key: 'time',
      width: 130,
      ...getColumnSearchProps('time'),
      sorter: (a, b) => String(a.time || '').localeCompare(String(b.time || '')),
      sortOrder: tableSorter.field === 'time' ? tableSorter.order : null,
      render: (value, record) => (
          <span className="text-sm text-gray-600 whitespace-nowrap">{value}</span>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 140,
      filterDropdown: ({ confirm }) => {
        // Maps display label → selectedStatus API key
        const options = [
          { label: 'All',          value: 'ALL' },
          { label: 'Not Verified', value: 'NOT_VERIFIED' },
          { label: 'Verified',     value: 'VERIFIED' },
          { label: 'Needs Review',      value: 'UNCLEAR' },
        ];
        return (
          <div style={{ padding: 8, minWidth: 160 }}>
            {options.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  setSelectedStatus(opt.value);
                  setCurrentPage(1);
                  confirm({ closeDropdown: true });
                }}
                style={{
                  padding: '6px 10px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  fontWeight: selectedStatus === opt.value ? 600 : 400,
                  background: selectedStatus === opt.value ? '#e6f4ff' : 'transparent',
                  color: selectedStatus === opt.value ? '#1677ff' : undefined,
                  marginBottom: 2,
                }}
              >
                {opt.label}
              </div>
            ))}
          </div>
        );
      },
      filterIcon: () => (
        <SearchOutlined style={{ color: selectedStatus !== 'ALL' ? '#1890ff' : undefined }} />
      ),
      filteredValue: selectedStatus !== 'ALL' ? [selectedStatus] : null,
      sorter: (a, b) => String(a.status || '').localeCompare(String(b.status || '')),
      sortOrder: tableSorter.field === 'status' ? tableSorter.order : null,
      render: (value, record) => {
        const isStatusLocked = normalizeStatus(record.status) === 1 && !isRoleAuthorized;
        if (editingRowId === record.id && !isStatusLocked) {
          return (
            <select
              className="w-full px-2 py-1 text-sm border border-amber-400 rounded focus:outline-none bg-white"
              value={editFormData.status ?? 0}
              onChange={(e) => setEditFormData({ ...editFormData, status: Number(e.target.value) })}
              onClick={(e) => e.stopPropagation()}
            >
              {statusDropdownOptions.map((option) => (
                <option key={option.value} value={option.value}>{option.label}</option>
              ))}
            </select>
          );
        }
        return (
          <div className="flex flex-col gap-1">
            <StatusBadgeHV status={value} />
            {record.verifiedBy && record.verifiedBy !== 0 && record.verifiedOn && (
              <div className="text-xs text-gray-600 whitespace-nowrap">
                <div>Updated by: {getUserFirstName(record.verifiedBy)}</div>
                <div>Updated at: {record.verifiedOn}</div>
              </div>
            )}
          </div>
        );
      },
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 100,
      fixed: 'right',
      render: (_, record) => (
        <div className="flex justify-center">
          {editingRowId === record.id ? (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={(e) => handleSaveRow(e, record.id)}
                className="p-1 px-1.5 bg-green-500 text-white rounded shadow-sm hover:bg-green-600"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleCancelEdit}
                className="p-1 px-1.5 bg-gray-200 text-gray-700 rounded shadow-sm hover:bg-gray-300"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={(e) => handleEditRowClick(e, record)}
              className="p-1.5 rounded-md transition-colors text-blue-600 hover:bg-blue-50"
              title="Edit row inline"
            >
              <FileEdit className="w-4 h-4" />
            </button>
          )}
        </div>
      ),
    },
  ], [columnFilters, editFormData, editingRowId, tableSorter, selectedStatus, catchEnvLotMap, isRoleAuthorized]);

  const handleColumnToggle = useCallback((colKey) => {
    if (ALWAYS_VISIBLE.includes(colKey)) return;
    setVisibleColumns(prev => {
      const next = new Set(prev);
      next.has(colKey) ? next.delete(colKey) : next.add(colKey);
      return next;
    });
  }, []);

  const visibleTableColumns = useMemo(
    () => tableColumns.filter(col => visibleColumns.has(col.key)),
    [tableColumns, visibleColumns]
  );

  const handleOpenPreview = useCallback((record) => {    setSelectedRecord(record);
    setPreviewOpen(true);
  }, []);

  const handleClosePreview = useCallback(() => {
    setPreviewOpen(false);
    setSelectedRecord(null);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchInput('');
    setGlobalSearch('');
    setSelectedLot('');
    setSelectedStatus('ALL');
    setCorrectionFilter(false);
    setCurrentPage(1);
    setColumnFilters({ catchNo: '', lotNo: '', a: '', b: '', c: '', d: '', remark: '', date: '', time: '', status: '' });
    setTableSorter({ field: null, order: null });
  }, []);

  const handleToggleCorrectionFilter = useCallback(() => {
    setCorrectionFilter((prev) => {
      const nextVal = !prev;
      if (nextVal) {
        // Clear all other filters when activating Correction filter
        setSearchInput('');
        setGlobalSearch('');
        setSelectedLot('');
        setSelectedStatus('ALL');
        setColumnFilters({ catchNo: '', lotNo: '', a: '', b: '', c: '', d: '', remark: '', date: '', time: '', status: '' });
        setTableSorter({ field: null, order: null });
      }
      setCurrentPage(1);
      return nextVal;
    });
  }, [setSelectedLot]);

  const handleSelectStatusCard = useCallback((statusKey) => {
    setCorrectionFilter(false);
    setSelectedStatus(statusKey);
    setCurrentPage(1);
  }, []);

  const handleFieldUpdate = useCallback(async (recordId, fieldName, newValue, overrideValues = null) => {
    try {
      if (!projectId) throw new Error('No project selected');
      const updatedRecord = records.find(r => r.id === recordId);
      if (!updatedRecord) throw new Error('Record not found');
      const userId = getCurrentUserId();
      
      // If overrideValues is provided (for batch updates), use those instead of record values
      const payload = {
        A: overrideValues?.A !== undefined ? overrideValues.A : (fieldName === 'a' ? newValue : updatedRecord.a),
        B: overrideValues?.B !== undefined ? overrideValues.B : (fieldName === 'b' ? newValue : updatedRecord.b),
        C: overrideValues?.C !== undefined ? overrideValues.C : (fieldName === 'c' ? newValue : updatedRecord.c),
        D: overrideValues?.D !== undefined ? overrideValues.D : (fieldName === 'd' ? newValue : updatedRecord.d),
        remark: overrideValues?.remark !== undefined ? overrideValues.remark : (fieldName === 'remark' ? newValue : (updatedRecord.remark || '')),
        status: overrideValues?.status !== undefined ? overrideValues.status : (fieldName === 'status' ? normalizeStatus(newValue) : normalizeStatus(updatedRecord.status)),
        verifiedBy: userId ?? null,
      };
      console.log('[HeaderVerification] handleFieldUpdate payload:', payload, 'userId from token:', userId);
      const lotParam = selectedLot ? `&lotNo=${selectedLot}` : '';
      const res = await API.put(`/Correction/HeaderVerification/${recordId}?projectId=${projectId}${lotParam}`, payload);
      const updatedRecordData = { ...res.data, date: updatedRecord.date, time: updatedRecord.time, remark: res.data.remark ?? '' };
      setRecords(prev => prev.map(r => r.id === recordId ? updatedRecordData : r));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(updatedRecordData);
      }
      fetchAllMeta();
      return updatedRecordData;
    } catch (err) {
      console.error('Failed to update field:', err);
      // Extract error message from API response
      const errorMessage = err.response?.data || err.message || 'Failed to update field';
      showToast(errorMessage, 'error');
      throw err;
    }
  }, [projectId, records, selectedRecord, showToast, fetchAllMeta, selectedLot]);

  const handleStatusChange = useCallback(async (recordId, newStatusValue) => {
    try {
      if (!projectId) throw new Error('No project selected');
      const updatedRecord = records.find(r => r.id === recordId);
      if (!updatedRecord) throw new Error('Record not found');

      const normalizedStatus = normalizeStatus(newStatusValue);
      const userId = getCurrentUserId();
      const payload = {
        A: updatedRecord.a,
        B: updatedRecord.b,
        C: updatedRecord.c,
        D: updatedRecord.d,
        remark: null, // Only status is updating -> make remark null
        status: normalizedStatus,
        verifiedBy: userId ?? null,
      };
      console.log('[HeaderVerification] handleStatusChange payload:', payload, 'userId from token:', userId);
      const lotParam = selectedLot ? `&lotNo=${selectedLot}` : '';
      const res = await API.put(`/Correction/HeaderVerification/${recordId}?projectId=${projectId}${lotParam}`, payload);
      const updatedRecordData = { ...res.data, date: updatedRecord.date, time: updatedRecord.time, remark: res.data.remark ?? '' };
      setRecords(prev => prev.map(r => r.id === recordId ? updatedRecordData : r));
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(updatedRecordData);
      }
      showToast(`Status updated to ${statusLabels[normalizedStatus]}`, 'success');
      fetchAllMeta(); // refresh card counts
      return updatedRecordData;
    } catch (err) {
      console.error('Failed to update status:', err);
      // Extract error message from API response
      const errorMessage = err.response?.data || err.message || 'Failed to update status';
      showToast(errorMessage, 'error');
      throw err;
    }
  }, [projectId, records, selectedRecord, showToast, fetchAllMeta, selectedLot]);

  const handleEditRowClick = (e, record) => {
    e.stopPropagation();
    setEditingRowId(record.id);
    setEditFormData({
      a: record.a,
      b: record.b,
      c: record.c,
      d: record.d,
      remark: record.remark || '',
      // date: record.date,
      // time: record.time,
      status: normalizeStatus(record.status),
    });
  };

  const handleCancelEdit = (e) => {
    e.stopPropagation();
    setEditingRowId(null);
  };

  const handleSaveRow = async (e, recordId) => {
    e.stopPropagation();
    try {
      if (!projectId) throw new Error('No project selected');
      const updatedRecord = records.find(r => r.id === recordId);
      if (!updatedRecord) throw new Error('Record not found');

      const isFieldLocked = normalizeStatus(updatedRecord.status) === 1 && !isRoleAuthorized;
      const userId = getCurrentUserId();

      const newStatus = isFieldLocked ? 1 : Number(editFormData.status);
      const statusChanged = normalizeStatus(updatedRecord.status) !== newStatus;
      const originalRemark = (updatedRecord.remark || '').trim();
      const editedRemark = (editFormData.remark || '').trim();
      const remarkChanged = editedRemark !== originalRemark;

      // If status changed and remark was NOT modified, clear remark.
      // If both changed together (or remark was modified), save the new remark.
      let finalRemark = editedRemark;
      if (statusChanged && !remarkChanged) {
        finalRemark = null;
      }

      const payload = {
        A: isFieldLocked ? (updatedRecord.a || '') : (editFormData.a || ''),
        B: isFieldLocked ? (updatedRecord.b || '') : (editFormData.b || ''),
        C: isFieldLocked ? (updatedRecord.c || '') : (editFormData.c || ''),
        D: isFieldLocked ? (updatedRecord.d || '') : (editFormData.d || ''),
        remark: finalRemark,
        status: newStatus,
        verifiedBy: userId ?? null,
      };

      console.log('[HeaderVerification] handleSaveRow payload:', payload, 'userId from token:', userId);
      const lotParam = selectedLot ? `&lotNo=${selectedLot}` : '';
      const res = await API.put(`/Correction/HeaderVerification/${recordId}?projectId=${projectId}${lotParam}`, payload);
      const updatedRecordData = { ...res.data, date: updatedRecord.date, time: updatedRecord.time, remark: res.data.remark ?? '' };
      setRecords(prev => prev.map(r => r.id === recordId ? updatedRecordData : r));
      setEditingRowId(null);
      setEditFormData({});
      showToast('Record updated successfully', 'success');
      if (selectedRecord?.id === recordId) {
        setSelectedRecord(updatedRecordData);
      }
      fetchAllMeta(); // refresh card counts
      fetchRecords(); // refresh table data to show updated records
    } catch (err) {
      console.error('Failed to update record:', err);
      // Extract error message from API response
      const errorMessage = err.response?.data || err.message || 'Failed to update record';
      showToast(errorMessage, 'error');
    }
  };

  return (
    <div className="w-full h-full min-h-0 flex flex-col overflow-hidden">
      <style>{customTableStyles}</style>
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 flex-shrink-0 px-6 pt-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paper Header Verification</h1>
          <p className="text-sm text-gray-500 mt-1">Search, filter, edit, and verify academic papers</p>
        </div>
        <div className="flex items-center gap-3" />
      </div>

      <div className="px-6 py-4 flex-shrink-0">
        <SummaryCardsHV
          records={records}
          summaryStats={summaryStats}
          selectedCardKey={correctionFilter ? null : selectedStatus}
          onSelectCard={handleSelectStatusCard}
        />
      </div>

      <div className="flex-1 min-h-0 mx-6 mb-6 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden flex">
        <div
  className={`flex-1 min-h-0 min-w-0 overflow-hidden flex ${
    previewOpen ? 'lg:flex-row flex-col' : 'flex-col'
  }`}
>
          <div
  className={`min-w-0 min-h-0 ${
    previewOpen ? 'lg:w-2/3 w-full' : 'w-full'
  } flex flex-col overflow-hidden`}
>
            <div className="p-4 border-b border-gray-200 bg-white flex-shrink-0">
              <SearchBarHV
                globalSearch={searchInput}
                onGlobalSearchChange={setSearchInput}
                onResetFilters={handleResetFilters}
                tableSorter={tableSorter}
                totalRecords={records.length}
                filteredCount={filteredRecords.length}
                lots={lots}
                selectedLot={selectedLot}
                onLotChange={setSelectedLot}
                selectedStatus={selectedStatus}
                onStatusChange={setSelectedStatus}
                columnFilters={columnFilters}
                onColumnFilterChange={(field, value) => {
                  setColumnFilters(prev => ({
                    ...prev,
                    [field]: value,
                  }));
                  setCurrentPage(1);
                }}
                onDownload={() => showToast('Downloading to CSV...', 'success')}
                visibleColumns={visibleColumns}
                toggleableColumns={ALL_TOGGLEABLE}
                onColumnToggle={handleColumnToggle}
                showCorrection={canShowCorrection}
                userRoleId={currentUserRoleId}
                isCorrectionFilter={correctionFilter}
                onCorrectionFilterToggle={handleToggleCorrectionFilter}
                correctionCount={summaryStats.correctionCount ?? 0}
              />
            </div>

            <div className="flex-1 min-h-0 min-w-0 overflow-hidden bg-gray-50">
              {loading ? (
                <div className="flex items-center justify-center h-full p-8">
                  <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : displayedTotalRecords === 0 ? (
                <div className="flex flex-col items-center justify-center p-12 text-center text-gray-500 h-full">
                  <Filter className="w-12 h-12 mb-4 text-gray-300" />
                  <p className="text-lg font-medium text-gray-900">No records found</p>
                  <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                </div>
              ) : (
                <div id="table-scroll-container" className="h-full overflow-auto">
                  <Table
                    className="header-verification-table"
                    dataSource={displayedRows}
                    columns={visibleTableColumns}
                    rowKey="id"
                    loading={loading}
                    onChange={handleTableChange}
                    pagination={false}
                    scroll={{ x: 'max-content' }}
                    sticky={{ offsetHeader: 0 }}
                    locale={{
                      emptyText: (
                        <div className="p-12 text-center text-gray-500">
                          <Filter className="mx-auto mb-4 w-12 h-12 text-gray-300" />
                          <p className="text-lg font-medium text-gray-900">No records found</p>
                          <p className="text-sm mt-1">Try adjusting your search or filters.</p>
                        </div>
                      ),
                    }}
                    onRow={(record) => {
                      const isSelected = previewOpen && selectedRecord?.id === record.id;
                      const status = normalizeStatus(record.status);
                      let rowStyle = { cursor: 'pointer', backgroundColor: '#ffffff' };
                      
                      // Highlight selected row with blue background ONLY when preview is open
                      if (isSelected) {
                        rowStyle.backgroundColor = '#dbeafe';
                      }
                      // Add status-based row coloring for non-selected rows
                      else if (status === 1) {
                        rowStyle.backgroundColor = '#f0fdf4'; // light green for verified
                      } else if (status === 2) {
                        rowStyle.backgroundColor = '#fef3c7'; // medium orange for needs review
                      }
                      
                      return {
                        onClick: () => {
                          if (editingRowId !== record.id) {
                            handleOpenPreview(record);
                          }
                        },
                        style: rowStyle,
                      };
                    }}
                  />
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 bg-white px-4 py-3 flex items-center justify-between flex-wrap gap-2 flex-shrink-0">
              <span className="text-sm text-gray-600">
                {loading
                  ? 'Loading...'
                  : displayedTotalRecords > 0
                    ? `${(currentPage - 1) * pageSize + 1}–${Math.min(currentPage * pageSize, displayedTotalRecords)} of ${displayedTotalRecords} records`
                    : '0 records'
                }
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  disabled={loading || currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm">
                  {loading ? 'Loading…' : (
                    <>Page <Input
                      type="number"
                      min={1}
                      max={displayedTotalPages}
                      value={currentPage}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 1;
                        setCurrentPage(Math.min(Math.max(val, 1), displayedTotalPages));
                      }}
                      style={{ width: 50 }}
                      size="small"
                    /> of {displayedTotalPages}</>
                  )}
                </span>
                <Button
                  size="small"
                  disabled={currentPage >= displayedTotalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                >
                  Next
                </Button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  style={{ padding: '4px 8px', borderRadius: '2px', border: '1px solid #d9d9d9' }}
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                  <option value={100}>100 / page</option>
                </select>
              </div>
            </div>

          </div>

          {previewOpen && selectedRecord && (
            <div className="lg:w-1/3 w-full min-h-0 h-full flex-shrink-0 border-l border-gray-200 overflow-hidden">
              <PrintPreviewHV
                record={selectedRecord}
                allRecords={filteredRecords}
                onClose={handleClosePreview}
                onStatusChange={handleStatusChange}
                onFieldUpdate={handleFieldUpdate}
                currentUser={currentUser}
                userMap={userMap}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeaderVerification;
