import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  Button,
  Select,
  Table,
  Tag,
  Alert,
  Space,
  Typography,
  Card,
  message,
  Input,
  Tooltip,
  Popconfirm,
} from 'antd';
import {
  CloudUploadOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CopyOutlined,
  FileTextOutlined,
  SearchOutlined,
  LockOutlined,
  UnlockOutlined,
  CheckOutlined,
} from '@ant-design/icons';
import API from '../../hooks/api';
import { getCurrentUserId } from '../../hooks/useUserMap';

const { Text } = Typography;

const ErpSyncModal = ({
  open,
  onClose,
  projectId,
  initialLotNo = null,
  availableLots = [],
}) => {
  const [selectedLot, setSelectedLot] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [lotData, setLotData] = useState(null);
  const [syncStatusList, setSyncStatusList] = useState([]);
  const [searchText, setSearchText] = useState('');
  const [jsonModalOpen, setJsonModalOpen] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  // Normalize available lots into numeric array
  const lotOptions = useMemo(() => {
    const list = (availableLots || []).map((l) =>
      typeof l === 'object' ? Number(l.lotNo || l.LotNo) : Number(l)
    ).filter((l) => l > 0);
    return Array.from(new Set(list)).sort((a, b) => a - b);
  }, [availableLots]);

  // Set initial selected lot when modal opens
  useEffect(() => {
    if (open) {
      const validInitial = Number(initialLotNo);
      if (validInitial > 0) {
        setSelectedLot(validInitial);
      } else if (lotOptions.length > 0) {
        setSelectedLot(lotOptions[0]);
      } else {
        setSelectedLot(null);
      }
      setLastResult(null);
      setSearchText('');
      loadSyncStatus();
    }
  }, [open, initialLotNo, lotOptions]);

  // Load catch details whenever selectedLot changes
  useEffect(() => {
    if (open && projectId && selectedLot > 0) {
      loadLotCatches(selectedLot);
    }
  }, [open, projectId, selectedLot]);

  const loadSyncStatus = async () => {
    if (!projectId) return;
    try {
      const res = await API.get(`/ErpSync/GetLotsSyncStatus/${projectId}`);
      setSyncStatusList(res.data || []);
    } catch (err) {
      console.warn('Failed to load lots sync status:', err);
    }
  };

  const loadLotCatches = async (lotNo) => {
    if (!projectId || !lotNo) return;
    setLoading(true);
    setLotData(null);
    try {
      const res = await API.get(`/ErpSync/GetLotCatches/${projectId}/${lotNo}`);
      setLotData(res.data || null);
    } catch (err) {
      console.error('Failed to load lot catches for ERP:', err);
      message.error(err.response?.data?.message || 'Failed to fetch catch details');
    } finally {
      setLoading(false);
    }
  };

  const handleFinalizeLot = async () => {
    if (!projectId || !selectedLot) return;
    setFinalizing(true);
    setLastResult(null);
    try {
      const userId = getCurrentUserId();
      const res = await API.post('/ErpSync/FinalizeLot', {
        projectId,
        lotNo: selectedLot,
        userId: userId ? Number(userId) : null,
      });

      const data = res.data;
      message.success(data.message || `Lot ${selectedLot} finalized successfully`);
      const finDate = data.finalizedAt || new Date().toISOString();
      setLotData((prev) => ({
        ...prev,
        isFinalized: true,
        finalizedAt: finDate,
      }));
      setSyncStatusList((prev) =>
        (prev || []).map((s) => (s.lotNo === selectedLot ? { ...s, isFinalized: true, finalizedAt: finDate } : s))
      );
      loadSyncStatus();
    } catch (err) {
      console.error('Error finalizing lot:', err);
      message.error(err.response?.data?.message || 'Failed to finalize lot');
    } finally {
      setFinalizing(false);
    }
  };

  const handleUnfinalizeLot = async () => {
    if (!projectId || !selectedLot) return;
    setFinalizing(true);
    try {
      const userId = getCurrentUserId();
      const res = await API.post('/ErpSync/UnfinalizeLot', {
        projectId,
        lotNo: selectedLot,
        userId: userId ? Number(userId) : null,
      });
      message.info(res.data?.message || `Lot ${selectedLot} reopened`);
      setLotData((prev) => ({
        ...prev,
        isFinalized: false,
        finalizedAt: null,
        lastSyncedAt: null,
      }));
      setSyncStatusList((prev) =>
        (prev || []).map((s) => (s.lotNo === selectedLot ? { ...s, isFinalized: false, finalizedAt: null, isSynced: false, lastSyncedAt: null } : s))
      );
      loadSyncStatus();
    } catch (err) {
      console.error('Error unfinalizing lot:', err);
      message.error('Failed to reopen lot');
    } finally {
      setFinalizing(false);
    }
  };

  const handleSendToErp = async () => {
    if (!projectId || !selectedLot) return;
    if (!lotData?.isFinalized) {
      message.warning('Please finalize this lot before pushing details to ERP.');
      return;
    }
    if (isLotSynced) {
      message.info('This lot has already been pushed to ERP.');
      return;
    }

    setSending(true);
    setLastResult(null);
    try {
      const userId = getCurrentUserId();
      const res = await API.post('/ErpSync/SendLotCatchesToErp', {
        projectId,
        lotNo: selectedLot,
        userId: userId ? Number(userId) : null,
      });

      const data = res.data;
      setLastResult(data);
      message.success(data.message || 'Lot details sent to ERP');
      const syncedTime = data.syncedAt || new Date().toISOString();
      setLotData((prev) => ({
        ...prev,
        lastSyncedAt: syncedTime,
      }));
      setSyncStatusList((prev) =>
        (prev || []).map((s) => (s.lotNo === selectedLot ? { ...s, isSynced: true, lastSyncedAt: syncedTime } : s))
      );
      loadSyncStatus();
    } catch (err) {
      console.error('Error sending lot to ERP:', err);
      const errMsg = err.response?.data?.message || 'Failed to send lot catches to ERP';
      message.error(errMsg);
      setLastResult({
        success: false,
        message: errMsg,
      });
    } finally {
      setSending(false);
    }
  };

  // Filtered catches for search
  const filteredCatches = useMemo(() => {
    const list = lotData?.catches || [];
    if (!searchText.trim()) return list;
    const q = searchText.toLowerCase().trim();
    return list.filter(
      (c) =>
        (c.catchNo || '').toLowerCase().includes(q) ||
        (c.courseName || '').toLowerCase().includes(q) ||
        (c.subjectName || '').toLowerCase().includes(q)
    );
  }, [lotData, searchText]);

  // Current lot sync status info
  const currentLotStatus = useMemo(() => {
    return (syncStatusList || []).find((s) => s.lotNo === selectedLot);
  }, [syncStatusList, selectedLot]);

  const isLotFinalized = useMemo(() => {
    if (lotData && typeof lotData.isFinalized === 'boolean') {
      return lotData.isFinalized;
    }
    return Boolean(currentLotStatus?.isFinalized);
  }, [lotData, currentLotStatus]);

  const isLotSynced = useMemo(() => {
    if (!isLotFinalized) return false;
    if (lotData?.lastSyncedAt) {
      if (lotData?.finalizedAt) {
        return new Date(lotData.lastSyncedAt) >= new Date(lotData.finalizedAt);
      }
      return true;
    }
    if (currentLotStatus?.isSynced && currentLotStatus?.lastSyncedAt) {
      if (currentLotStatus?.finalizedAt) {
        return new Date(currentLotStatus.lastSyncedAt) >= new Date(currentLotStatus.finalizedAt);
      }
      return true;
    }
    return Boolean(currentLotStatus?.isSynced);
  }, [isLotFinalized, lotData, currentLotStatus]);

  const columns = [
    {
      title: '#',
      key: 'idx',
      width: 50,
      render: (_, __, i) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{i + 1}</span>,
    },
    {
      title: 'Catch No',
      dataIndex: 'catchNo',
      key: 'catchNo',
      width: 120,
      render: (val) => (
        <span
          style={{
            fontWeight: 600,
            fontSize: 12,
            fontFamily: 'monospace',
            padding: '2px 6px',
            background: '#f1f5f9',
            borderRadius: 4,
            color: '#1e293b',
          }}
        >
          {val}
        </span>
      ),
    },
    {
      title: 'Quantity',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
      align: 'right',
      render: (val) => (
        <span style={{ fontWeight: 600, color: '#0369a1', fontSize: 12 }}>
          {Number(val || 0).toLocaleString()}
        </span>
      ),
    },
    {
      title: 'Pages',
      dataIndex: 'pages',
      key: 'pages',
      width: 70,
      align: 'center',
      render: (val) => (
        <Tag color="default" style={{ fontSize: 11, margin: 0 }}>
          {val ?? '-'}
        </Tag>
      ),
    },
    {
      title: 'Inner Envelope Breakdown',
      dataIndex: 'innerEnv',
      key: 'innerEnv',
      render: (val) => {
        let display = val;
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          const entries = Object.entries(parsed || {});
          if (entries.length === 0) return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>;
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {entries.map(([k, v]) => (
                <Tag key={k} color="purple" style={{ fontSize: 11, margin: 0 }}>
                  {k}: {v}
                </Tag>
              ))}
            </div>
          );
        } catch {
          return <span style={{ fontSize: 11 }}>{display || '—'}</span>;
        }
      },
    },
    {
      title: 'Outer Envelope Breakdown',
      dataIndex: 'outerEnv',
      key: 'outerEnv',
      render: (val) => {
        let display = val;
        try {
          const parsed = typeof val === 'string' ? JSON.parse(val) : val;
          const entries = Object.entries(parsed || {});
          if (entries.length === 0) return <span style={{ color: '#94a3b8', fontSize: 11 }}>—</span>;
          return (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {entries.map(([k, v]) => (
                <Tag key={k} color="cyan" style={{ fontSize: 11, margin: 0 }}>
                  {k}: {v}
                </Tag>
              ))}
            </div>
          );
        } catch {
          return <span style={{ fontSize: 11 }}>{display || '—'}</span>;
        }
      },
    },
  ];

  const handleCopyJson = () => {
    if (!lotData) return;
    const jsonStr = JSON.stringify(lotData, null, 2);
    navigator.clipboard.writeText(jsonStr).then(() => {
      message.success('Payload JSON copied to clipboard');
    }).catch(() => {
      message.error('Failed to copy JSON');
    });
  };

  return (
    <>
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CloudUploadOutlined style={{ color: '#2563eb', fontSize: 18 }} />
            <span>Lot Catch Details & ERP Push</span>
          </div>
        }
        open={open}
        onCancel={onClose}
        width={760}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 8, width: '100%' }}>
            <Button onClick={onClose}>
              Close
            </Button>
            <Button
              icon={<FileTextOutlined />}
              onClick={() => setJsonModalOpen(true)}
              disabled={!lotData || lotData.catches?.length === 0}
            >
              Preview JSON
            </Button>
            {!isLotFinalized ? (
              <Popconfirm
                title="Finalize this lot?"
                description={`Are you sure you want to finalize Lot ${selectedLot}? Once finalized, you can push details to ERP.`}
                onConfirm={handleFinalizeLot}
                okText="Yes, Finalize"
                cancelText="Cancel"
              >
                <Button
                  type="primary"
                  icon={<LockOutlined />}
                  loading={finalizing}
                  disabled={!lotData || lotData.catches?.length === 0 || loading}
                  style={{ background: '#059669', borderColor: '#059669' }}
                >
                  Finalize {selectedLot ? `Lot ${selectedLot}` : ''}
                </Button>
              </Popconfirm>
            ) : (
              <Popconfirm
                title="Reopen Lot?"
                description="Do you want to reopen / unfinalize this lot for adjustments?"
                onConfirm={handleUnfinalizeLot}
                okText="Reopen"
                cancelText="Cancel"
              >
                <Button
                  icon={<UnlockOutlined />}
                  loading={finalizing}
                  style={{ borderColor: '#d97706', color: '#b45309' }}
                >
                  Reopen Lot
                </Button>
              </Popconfirm>
            )}
            <Tooltip
              title={
                !isLotFinalized
                  ? 'Please finalize the lot before pushing details to ERP'
                  : isLotSynced
                  ? 'This lot has already been pushed to ERP. To push again, click Reopen Lot first.'
                  : 'Push verified catch details to ERP'
              }
            >
              <span>
                <Button
                  type="primary"
                  icon={isLotSynced ? <CheckCircleOutlined /> : <CloudUploadOutlined />}
                  loading={sending}
                  onClick={handleSendToErp}
                  disabled={!isLotFinalized || isLotSynced || !lotData || lotData.catches?.length === 0 || loading}
                  style={{
                    background: isLotFinalized && !isLotSynced ? '#2563eb' : undefined,
                    borderColor: isLotFinalized && !isLotSynced ? '#2563eb' : undefined,
                  }}
                >
                  {sending ? 'Pushing to ERP...' : isLotSynced ? 'Pushed to ERP' : 'Push to ERP'}
                </Button>
              </span>
            </Tooltip>
          </div>
        }
      >
        {/* Lot selection & compact status header */}
        <div style={{ marginBottom: 10 }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 8,
              padding: '8px 12px',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 8,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontWeight: 600, fontSize: 12, color: '#334155' }}>Select Lot:</span>
              <Select
                value={selectedLot}
                onChange={(val) => setSelectedLot(val)}
                style={{ width: 120 }}
                size="small"
                placeholder="Choose Lot"
                options={lotOptions.map((l) => ({
                  value: l,
                  label: `Lot ${l}`,
                }))}
              />
            </div>

            {/* Badges: Finalization & Sync Status */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              {/* Finalization status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>Finalization:</span>
                {isLotFinalized ? (
                  <Tooltip title={lotData?.finalizedAt ? new Date(lotData.finalizedAt).toLocaleString('en-IN') : undefined}>
                    <Tag color="success" icon={<CheckCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>
                      Finalized
                      {lotData?.finalizedAt && (
                        <span style={{ marginLeft: 4 }}>
                          ({new Date(lotData.finalizedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                        </span>
                      )}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color="orange" icon={<ExclamationCircleOutlined />} style={{ margin: 0, fontSize: 11 }}>
                    Not Finalized
                  </Tag>
                )}
              </div>

              {/* ERP Sync status */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ fontSize: 11, color: '#64748b' }}>ERP Push:</span>
                {currentLotStatus?.isSynced || lotData?.lastSyncedAt ? (
                  <Tooltip title={lotData?.lastSyncedAt ? new Date(lotData.lastSyncedAt).toLocaleString('en-IN') : undefined}>
                    <Tag color="blue" icon={<CloudUploadOutlined />} style={{ margin: 0, fontSize: 11 }}>
                      Pushed
                      {lotData?.lastSyncedAt && (
                        <span style={{ marginLeft: 4 }}>
                          ({new Date(lotData.lastSyncedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })})
                        </span>
                      )}
                    </Tag>
                  </Tooltip>
                ) : (
                  <Tag color="default" style={{ margin: 0, fontSize: 11 }}>Pending Push</Tag>
                )}
              </div>
            </div>
          </div>

          {/* Guidance Banner when lot is not finalized */}
          {!isLotFinalized && (
            <Alert
              message="Finalization Required"
              description="Inspect the catch details below. Once verified, click 'Finalize Lot' to approve the details before pushing to ERP."
              type="info"
              showIcon
              icon={<LockOutlined />}
              style={{ marginBottom: 8, padding: '6px 12px', fontSize: 12 }}
            />
          )}

          {/* Result Alert if any */}
          {lastResult && (
            <Alert
              message={lastResult.success ? 'Success' : 'Notice'}
              description={lastResult.message}
              type={lastResult.success ? 'success' : 'warning'}
              showIcon
              closable
              style={{ marginBottom: 8, padding: '6px 12px', fontSize: 12 }}
            />
          )}

          {/* Compact summary metrics bar */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: '#f1f5f9',
              border: '1px solid #e2e8f0',
              borderRadius: 6,
              marginBottom: 8,
              fontSize: 12,
            }}
          >
            <div>
              <span style={{ color: '#64748b' }}>Catches: </span>
              <strong style={{ color: '#0f172a' }}>{lotData?.totalCatches ?? (loading ? '...' : 0)}</strong>
              <span style={{ margin: '0 10px', color: '#cbd5e1' }}>•</span>
              <span style={{ color: '#64748b' }}>Total Quantity: </span>
              <strong style={{ color: '#2563eb' }}>{(lotData?.totalQuantity ?? 0).toLocaleString()}</strong>
              <span style={{ margin: '0 10px', color: '#cbd5e1' }}>•</span>
              <span style={{ color: '#64748b' }}>Project ID: </span>
              <strong style={{ color: '#64748b' }}>{projectId}</strong>
            </div>
            <div>
              <span style={{ color: '#64748b', marginRight: 6 }}>Status:</span>
              <Tag
                color={isLotFinalized ? 'success' : 'warning'}
                style={{ margin: 0, fontSize: 11, fontWeight: 600 }}
              >
                {isLotFinalized ? 'Ready for ERP' : 'Pending Finalize'}
              </Tag>
            </div>
          </div>
        </div>

        {/* Search bar (only if more than 4 catches) */}
        {(lotData?.totalCatches > 4 || searchText) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <Input
              prefix={<SearchOutlined style={{ color: '#94a3b8' }} />}
              placeholder="Search by catch number..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 240 }}
              allowClear
              size="small"
            />
            <span style={{ fontSize: 11, color: '#64748b' }}>
              Showing {filteredCatches.length} of {lotData?.totalCatches || 0}
            </span>
          </div>
        )}

        {/* Catches Preview Table - compact with NO permanent scrollbar */}
        <Table
          size="small"
          columns={columns}
          dataSource={filteredCatches}
          rowKey={(r) => r.catchNo}
          loading={loading}
          pagination={filteredCatches.length > 8 ? { pageSize: 8, size: 'small', showSizeChanger: false } : false}
          scroll={filteredCatches.length > 6 ? { y: 240 } : undefined}
          bordered
          locale={{
            emptyText: loading ? 'Loading catches...' : 'No catches found for this lot',
          }}
        />
      </Modal>

      {/* JSON Payload Preview Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingRight: 24 }}>
            <span>Payload JSON Preview (ERP Contract)</span>
            <Button size="small" icon={<CopyOutlined />} onClick={handleCopyJson}>
              Copy JSON
            </Button>
          </div>
        }
        open={jsonModalOpen}
        onCancel={() => setJsonModalOpen(false)}
        width={720}
        footer={[
          <Button key="close" onClick={() => setJsonModalOpen(false)}>
            Close
          </Button>,
        ]}
      >
        <pre
          style={{
            maxHeight: 450,
            overflowY: 'auto',
            background: '#0f172a',
            color: '#38bdf8',
            padding: 14,
            borderRadius: 6,
            fontSize: 12,
            fontFamily: 'monospace',
          }}
        >
          {lotData ? JSON.stringify(lotData, null, 2) : 'No data'}
        </pre>
      </Modal>
    </>
  );
};

export default ErpSyncModal;
