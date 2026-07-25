import React, { useMemo, useState, useEffect } from 'react';
import { Table, Input, Select, Tag, message, Button, Tooltip } from 'antd';
import axios from 'axios';
import {
  Search,
  Download,
  FileText,
} from 'lucide-react';

const ReportTemplateManagement = ({
  reports = [],
  onDownload,
  rptApiUrl,
  apiBaseUrl,
  projectId,
  envLotReports = [],
}) => {
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState('ALL');
  const [selectedLot, setSelectedLot] = useState('ALL');
  const [viewType, setViewType] = useState('Report');
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [envLotCatches, setEnvLotCatches] = useState({});
  const [envLotReportsLocal, setEnvLotReportsLocal] = useState([]);

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Extract lot number from report filename
   * Example: "BoxBreaking_1.xlsx" => 1
   */
  const extractLotFromFilename = (fileName) => {
    if (!fileName || typeof fileName !== 'string') return null;
    const match = fileName.match(/_(\d+)\./);
    return match ? parseInt(match[1]) : null;
  };

  /**
   * Parse EnvLotNumbers from comma-separated string
   * Example: "1,2" => [1, 2]
   */
  const parseEnvLotNumbers = (envLotStr) => {
    if (!envLotStr) return [];
    if (typeof envLotStr !== 'string') return [];
    return envLotStr
      .split(',')
      .map((num) => parseInt(num.trim()))
      .filter((num) => !isNaN(num));
  };

  /**
   * Get catches for a specific envelope lot number from EnvLotDetails
   */
  const getCatchesForEnvLot = (envLotNo, templateId) => {
  if (templateId && envLotReportsLookup[templateId]) {
    const envLotDetails =
      envLotReportsLookup[templateId].envLotDetails || [];

    const detail = envLotDetails.find(
      (d) =>
        Number(d.envLotNo || d.EnvLotNo) ===
        Number(envLotNo)
    );

    if (detail) {
      const lots = detail.lots || detail.Lots || [];
      const catches = [];

      lots.forEach((lot) => {
        catches.push(
          ...(lot.catchNos || lot.CatchNos || [])
        );
      });

      return catches;
    }
  }

  return envLotCatches[envLotNo] || [];
};

  /**
   * Create lookup for EnvLotReports by TemplateId
   * Maps templateId => { envLotNumbers, lotNumber, envLotDetails with catches }
   */
const envLotReportsLookup = useMemo(() => {
  const lookup = {};

  const dataToUse =envLotReportsLocal;

  (dataToUse || []).forEach((report) => {
    const templateId =
      report.templateId || report.TemplateId;

    if (!templateId) return;

    const envLotDetails =
      report.envLotDetails ||
      report.EnvLotDetails ||
      [];

    const envLotNumbers = envLotDetails
      .map((detail) =>
        detail.envLotNo || detail.EnvLotNo
      )
      .filter(Boolean);

    lookup[templateId] = {
      ...report,
      templateId,
      envLotNumbers,
      envLotDetails,
    };
  });

  return lookup;
}, [envLotReports, envLotReportsLocal]);

  // ============================================================================
  // FETCH ENV LOT REPORTS & CATCHES
  // ============================================================================

  /**
   * Fetch EnvLotReports if not passed as prop
   */
useEffect(() => {
  fetchEnvLotReports();
}, [projectId]);

  const fetchEnvLotReports = async () => {
  if (!projectId) return;

  try {
    const response = await axios.get(
      `https://localhost:7276/api/EnvelopeLotReports/ByProject/${projectId}`
    );

    console.log(
      'ENV LOT API RESPONSE:',
      JSON.stringify(response.data, null, 2)
    );

    setEnvLotReportsLocal(response.data || []);
  } catch (error) {
    console.error('Failed to fetch EnvLotReports:', error);
  }
};

  /**
   * Fetch assigned EnvLot catches
   */
  useEffect(() => {
    if (projectId && apiBaseUrl) {
      fetchEnvLotCatches();
    }
  }, [projectId, apiBaseUrl]);

  const fetchEnvLotCatches = async () => {
    try {
      const response = await axios.get(
        `${apiBaseUrl}/NRDataLots/GetAssignedEnvLotCatches/${projectId}`
      );

      const catchesLookup = {};

      // Group catches by envLotNo
      (response.data || []).forEach((item) => {
        const envLotNo = item.envLotNo || item.EnvLotNo;
        const catchNo = item.catchNo || item.CatchNo;

        if (envLotNo && catchNo) {
          if (!catchesLookup[envLotNo]) {
            catchesLookup[envLotNo] = [];
          }
          if (!catchesLookup[envLotNo].includes(catchNo)) {
            catchesLookup[envLotNo].push(catchNo);
          }
        }
      });

      setEnvLotCatches(catchesLookup);
    } catch (error) {
      console.error('Failed to fetch env lot catches:', error);
    }
  };

  // ============================================================================
  // VIEW TYPE TOGGLE
  // ============================================================================

  const handleTypeChange = (type) => {
    setViewType(type);
    setSelectedModule('ALL');
    setSelectedLot('ALL');

    if (type === 'Report') {
      setSelectedTemplate('ALL');
    }
  };

  // ============================================================================
  // FILTER OPTIONS
  // ============================================================================

  /**
   * Extract lot numbers from reports based on type
   */
  const getLotNumbers = useMemo(() => {
    const lots = new Set();

    reports.forEach((report) => {
      if (report.type !== viewType) return;

      let lotNum = null;

      if (viewType === 'Template') {
        // For templates: get from envLotReportsLookup
        const templateId = report.templateId || report.TemplateId;
        const envLotReportData = templateId ? envLotReportsLookup[templateId] : null;
        
        if (envLotReportData?.lotNumber) {
          lotNum = envLotReportData.lotNumber;
          lots.add(lotNum);
        } else if (envLotReportData?.envLotNumbers) {
          const envLotNums = parseEnvLotNumbers(envLotReportData.envLotNumbers);
          envLotNums.forEach((num) => lots.add(num));
        } else {
          // Fallback
          const envLotStr = report.envLotNumbers || report.EnvLotNumbers;
          const envLotNums = parseEnvLotNumbers(envLotStr);
          envLotNums.forEach((num) => lots.add(num));
        }
      } else if (viewType === 'Report') {
        // For reports: extract from fileName
        const fileName = report.reportName || report.fileName;
        lotNum = extractLotFromFilename(fileName);
        if (lotNum) lots.add(lotNum);
      }
    });

    return Array.from(lots).sort((a, b) => a - b);
  }, [reports, viewType, envLotReportsLookup]);

  const moduleOptions = useMemo(() => {
    return [
      ...new Set(
        reports
          .filter((report) => report.type === viewType)
          .map((report) => report.module)
          .filter(Boolean)
      ),
    ];
  }, [reports, viewType]);

  const templateOptions = useMemo(() => {
    return [
      ...new Set(
        reports
          .filter((report) => report.type === viewType)
          .map((report) => report.templateName)
          .filter(Boolean)
      ),
    ];
  }, [reports, viewType]);

  // ============================================================================
  // FILTER DATA
  // ============================================================================

  const filteredReports = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    return reports
      .filter((report) => {
        if (report.type !== viewType) return false;

        const matchesSearch =
          !search ||
          report.module?.toLowerCase().includes(search) ||
          report.templateName?.toLowerCase().includes(search) ||
          report.reportName?.toLowerCase().includes(search);

        const matchesModule =
          selectedModule === 'ALL' || report.module === selectedModule;

        const matchesTemplate =
          selectedTemplate === 'ALL' ||
          report.templateName === selectedTemplate;

        // Extract lot number based on type and data sources
        let lotNum = null;
        
        if (viewType === 'Template') {
          // For templates: try to get from envLotReportsLookup first
          const templateId = report.templateId || report.TemplateId;
          const envLotReportData = templateId ? envLotReportsLookup[templateId] : null;
          
          if (envLotReportData?.lotNumber) {
            lotNum = envLotReportData.lotNumber;
          } else if (envLotReportData?.envLotNumbers) {
            // Fallback: use first envLot number if no explicit lotNumber
            const envLotNums = parseEnvLotNumbers(envLotReportData.envLotNumbers);
            if (envLotNums.length > 0) {
              lotNum = envLotNums[0];
            }
          } else {
            // Try from report.EnvLotNumbers directly
            const envLotStr = report.envLotNumbers || report.EnvLotNumbers;
            const envLotNums = parseEnvLotNumbers(envLotStr);
            if (envLotNums.length > 0) {
              lotNum = envLotNums[0];
            }
          }
        } else if (viewType === 'Report') {
          const fileName = report.reportName || report.fileName;
          lotNum = extractLotFromFilename(fileName);
        }

        const matchesLot =
          selectedLot === 'ALL' ||
          (lotNum && lotNum === parseInt(selectedLot));

        return (
          matchesSearch && matchesModule && matchesTemplate && matchesLot
        );
      })
      .map((report) => {
        // Enrich report with extracted lot and envLot information
        let lotNum = null;
        let envLotNums = [];

        if (viewType === 'Template') {
          // Get from envLotReportsLookup
          const templateId = report.templateId || report.TemplateId;
          const envLotReportData = templateId ? envLotReportsLookup[templateId] : null;
          
          if (envLotReportData) {
  if (envLotReportData.lotNumber) {
    lotNum = Number(envLotReportData.lotNumber);
  }

  envLotNums =
    envLotReportData.envLotNumbers || [];

  if (!lotNum && envLotNums.length > 0) {
    lotNum = envLotNums[0];
  }
          } else {
            // Fallback to report properties
            const envLotStr = report.envLotNumbers || report.EnvLotNumbers;
            envLotNums = parseEnvLotNumbers(envLotStr);
            if (envLotNums.length > 0) {
              lotNum = envLotNums[0];
            }
          }
        } else if (viewType === 'Report') {
          const fileName = report.reportName || report.fileName;
          lotNum = extractLotFromFilename(fileName);
        }

        return {
          ...report,
          extractedLotNumber: lotNum,
          extractedEnvLotNumbers: envLotNums,
        };
      });
  }, [
    reports,
    searchText,
    selectedModule,
    selectedTemplate,
    selectedLot,
    viewType,
    envLotReportsLookup,
  ]);

  // ============================================================================
  // DOWNLOAD HANDLERS
  // ============================================================================

  const handleDownload = async (report) => {
    const version = report?.versions?.[0];

    // Handle Reports
    if (viewType === 'Report' || report?.type === 'Report') {
      if (!version?.fileUrl) {
        message.error('Download URL not available for this report.');
        return;
      }

      const link = document.createElement('a');
      link.href = version.fileUrl;
      link.download = report?.reportName || 'report';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success('Report download started.');
      return;
    }

    // Handle Templates
    const templateId =
      report?.templateId ||
      report?.TemplateId ||
      version?.templateId ||
      version?.TemplateId ||
      report?.id ||
      version?.id;

    // Get lot number from enriched data or lookup
    let lotNumber =
      report?.extractedLotNumber ||
      report?.lotNumber ||
      report?.lotNo ||
      version?.lotNumber ||
      version?.lotNo;

    // If still not found, try lookup
    if (!lotNumber && templateId && envLotReportsLookup[templateId]) {
      lotNumber = envLotReportsLookup[templateId].lotNumber;
    }

    // Default to 1 if still not found
    lotNumber = lotNumber || 1;

    if (!templateId || !projectId) {
      message.error('Missing template download details.');
      return;
    }

    try {
      const base = (
        rptApiUrl ||
        import.meta.env.VITE_RPT_API_URL ||
        ''
      ).replace(/\/api\/?$/i, '');

      if (!base) {
        message.error('RPT API URL not configured.');
        return;
      }

      // Check if PDF was generated
      const existsUrl =
        `${base}/api/report/generated-exists?templateId=${templateId}&projectId=${projectId}&lotNumber=${lotNumber}`;

      const existsResponse = await axios.get(existsUrl);

      if (!existsResponse.data?.exists && existsResponse.data !== true) {
        message.error('No generated PDF found for this template.');
        return;
      }

      // Download using the templateId and lotNumber
      const downloadUrl =
        `${base}/api/report/generated-download` +
        `?templateId=${templateId}` +
        `&projectId=${projectId}` +
        `&lotNumber=${lotNumber}`;

      window.open(downloadUrl, '_blank');
      message.success('Download started.');
    } catch (error) {
      console.error('Template download failed:', error);
      message.error('Failed to download generated PDF.');
    }
  };

  const handleDownloadAll = async () => {
    const latestItems = filteredReports.filter(
      (report) => report.versions?.[0]?.status === 'Latest'
    );

    if (!latestItems.length) {
      message.warning(
        `No latest ${
          viewType === 'Report' ? 'reports' : 'templates'
        } available for download.`
      );
      return;
    }

    setBulkDownloading(true);

    try {
      // =====================================================
      // REPORTS
      // =====================================================
      if (viewType === 'Report') {
        try {
          const response = await axios.get(
            `${apiBaseUrl}/EnvelopeBreakages/Reports/DownloadAll`,
            {
              params: {
                projectId: Number(projectId),
              },
              responseType: 'blob',
            }
          );

          const blob = new Blob([response.data], {
            type:
              response.headers['content-type'] ||
              'application/zip',
          });

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `reports_${projectId}.zip`;
          document.body.appendChild(link);
          link.click();
          link.remove();
          window.URL.revokeObjectURL(url);

          message.success(
            'Reports downloaded successfully.'
          );

          return;
        } catch (error) {
          console.error(
            'Report bulk download failed:',
            error
          );
          message.error('Failed to download reports.');
          return;
        }
      }

      // =====================================================
      // TEMPLATES
      // =====================================================

      const base = (
        rptApiUrl ||
        import.meta.env.VITE_RPT_API_URL ||
        ''
      ).replace(/\/api\/?$/i, '');

      if (!base) {
        message.error('RPT API URL not configured.');
        return;
      }

      const existingTemplates = [];

      for (const report of latestItems) {
        const version = report.versions?.[0];

        const templateId =
          report?.templateId ||
          report?.TemplateId ||
          version?.templateId ||
          version?.TemplateId;

        let lotNumber =
          report?.extractedLotNumber ||
          report?.lotNumber ||
          report?.lotNo ||
          version?.lotNumber ||
          version?.lotNo;

        // Try lookup if not found
        if (!lotNumber && templateId && envLotReportsLookup[templateId]) {
          lotNumber = envLotReportsLookup[templateId].lotNumber;
        }

        lotNumber = lotNumber || 1;

        if (!templateId) {
          console.warn('Missing template ID:', report);
          continue;
        }

        const existsResponse = await axios.get(
          `${base}/api/report/generated-exists`,
          {
            params: {
              templateId: Number(templateId),
              projectId: Number(projectId),
              lotNumber: Number(lotNumber),
            },
          }
        );

        if (
          existsResponse.data?.exists === true ||
          existsResponse.data === true
        ) {
          existingTemplates.push({
            templateId: Number(templateId),
            lotNumber: Number(lotNumber),
          });
        }
      }

      if (!existingTemplates.length) {
        message.warning(
          'No generated PDFs found for the selected templates.'
        );
        return;
      }

      const templateIds = existingTemplates
        .map((item) => item.templateId)
        .join(',');

      const lotNumbers = existingTemplates
        .map((item) => item.lotNumber)
        .join(',');

      const response = await axios.get(
        `${base}/api/report/generated-download-zip`,
        {
          params: {
            projectId: Number(projectId),
            templateIds,
            lotNumbers,
          },
          responseType: 'blob',
        }
      );

      const blob = new Blob([response.data], {
        type: 'application/zip',
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `generated_templates_${projectId}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      message.success('Generated PDFs downloaded successfully.');
    } catch (error) {
      console.error('Bulk download failed:', error);
      message.error('Failed to download files.');
    } finally {
      setBulkDownloading(false);
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatus = (status) => {
    if (status === 'Latest') {
      return <Tag color="success">Latest</Tag>;
    }

    if (status === 'Previous') {
      return <Tag>Previous</Tag>;
    }

    return <Tag>{status || '-'}</Tag>;
  };

  /**
   * Render EnvLot tags with catch tooltip
   */
const renderEnvLotTags = (envLotNumbers, templateId) => {
  if (!envLotNumbers || envLotNumbers.length === 0) {
    return <span className="text-sm text-slate-500">-</span>;
  }

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
      {envLotNumbers.map((envLotNo) => {
        const catches = getCatchesForEnvLot(envLotNo, templateId);

        const tooltipContent = (
          <div
            style={{
              padding: 8,
              color: '#333',
              minWidth: 180,
            }}
          >
            <div
              style={{
                marginBottom: 8,
                fontWeight: 600,
                color: '#333',
              }}
            >
              Batch {envLotNo} - Catches
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                maxHeight: 250,
                overflowY: 'auto',
              }}
            >
              {catches.length > 0 ? (
                catches.map((catchNo, idx) => (
                  <span
                    key={idx}
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      backgroundColor: '#f0f0f0',
                      color: '#333',
                      borderRadius: 4,
                    }}
                  >
                    {catchNo}
                  </span>
                ))
              ) : (
                <span style={{ color: '#999' }}>
                  No catches assigned
                </span>
              )}
            </div>
          </div>
        );

        return (
          <Tooltip
            key={envLotNo}
            title={tooltipContent}
            color="#ffffff"
            placement="top"
            overlayInnerStyle={{
              color: '#333',
            }}
          >
            <Tag color="default" style={{ cursor: 'pointer' }}>
              Batch {envLotNo}

              {catches.length > 0 && (
                <span style={{ marginLeft: 4, fontSize: 11 }}>
                  ({catches.length})
                </span>
              )}
            </Tag>
          </Tooltip>
        );
      })}
    </div>
  );
};

  // ============================================================================
  // TABLE COLUMNS
  // ============================================================================

  const columns = [
    {
      title: 'Module',
      dataIndex: 'module',
      key: 'module',

      sorter: (a, b) =>
        (a.module || '').localeCompare(b.module || ''),

      render: (module) => (
        <span className="text-sm font-medium text-slate-700">
          {module || '-'}
        </span>
      ),
    },

    {
      title: 'Template Name',
      dataIndex: 'templateName',
      key: 'templateName',

      sorter: (a, b) =>
        (a.templateName || '').localeCompare(
          b.templateName || ''
        ),

      render: (templateName) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText size={16} />
          </div>

          <span className="text-sm font-medium text-slate-800">
            {templateName || '-'}
          </span>
        </div>
      ),
    },

    {
      title: 'Lot',
      key: 'lot',
      width: 80,

      sorter: (a, b) =>
        (a.extractedLotNumber || 0) -
        (b.extractedLotNumber || 0),

      render: (_, record) => (
        <span className="text-sm font-medium text-slate-700">
          {record.extractedLotNumber || '-'}
        </span>
      ),
    },

    {
      title: 'Batch / EnvLot',
      key: 'envLot',
      width: 200,
      hidden: viewType !== 'Template',

      sorter: (a, b) => {
        const aEnv =
          a.extractedEnvLotNumbers?.[0] || 0;
        const bEnv =
          b.extractedEnvLotNumbers?.[0] || 0;
        return aEnv - bEnv;
      },

      render: (_, record) =>
        renderEnvLotTags(record.extractedEnvLotNumbers, record.templateId || record.TemplateId),
    },

    {
      title: 'Report',
      dataIndex: 'reportName',
      key: 'reportName',

      sorter: (a, b) =>
        (a.reportName || '').localeCompare(
          b.reportName || ''
        ),

      render: (reportName) => (
        <span className="text-sm text-slate-600">
          {reportName || '-'}
        </span>
      ),
    },

    {
      title: 'Version',
      key: 'version',

      sorter: (a, b) =>
        (a.versions?.[0]?.version || '').localeCompare(
          b.versions?.[0]?.version || ''
        ),

      render: (_, record) => {
        const latest = record.versions?.[0];

        return (
          <span className="text-sm font-semibold text-slate-700">
            {latest?.version || '-'}
          </span>
        );
      },
    },

    {
      title: 'Generated On',
      key: 'generatedOn',

      sorter: (a, b) =>
        new Date(a.versions?.[0]?.generatedOn || 0) -
        new Date(b.versions?.[0]?.generatedOn || 0),

      render: (_, record) => (
        <span className="text-sm text-slate-600">
          {record.versions?.[0]?.generatedOn || '-'}
        </span>
      ),
    },

    {
      title: 'Generated By',
      key: 'generatedBy',

      sorter: (a, b) =>
        (a.versions?.[0]?.generatedBy || '').localeCompare(
          b.versions?.[0]?.generatedBy || ''
        ),

      render: (_, record) => (
        <span className="text-sm text-slate-600">
          {record.versions?.[0]?.generatedBy || '-'}
        </span>
      ),
    },

    {
      title: 'Status',
      key: 'status',

      filters: [
        { text: 'Latest', value: 'Latest' },
        { text: 'Previous', value: 'Previous' },
      ],

      onFilter: (value, record) =>
        record.versions?.[0]?.status === value,

      render: (_, record) =>
        renderStatus(record.versions?.[0]?.status),
    },

    {
      title: 'Action',
      key: 'action',
      align: 'right',

      render: (_, record) => {
        const latest = record.versions?.[0];

        if (!latest) {
          return null;
        }

        return (
          <Button
            type="primary"
            size="small"
            icon={<Download size={14} />}
            onClick={() => handleDownload(record)}
          >
            Download
          </Button>
        );
      },
    },
  ];

  const activeColumns = columns.filter((col) => {
    if (
      viewType === 'Report' &&
      (col.key === 'templateName' || col.key === 'envLot')
    )
      return false;
    if (viewType === 'Template' && col.key === 'reportName')
      return false;
    return true;
  });

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <section className="mt-6 w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      {/* HEADER */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Report & Template Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View and download the latest versions of all
            generated reports.
          </p>
        </div>

        <div className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
          {filteredReports.length}{' '}
          {viewType === 'Report' ? 'Reports' : 'Templates'}
        </div>
      </div>

      {/* FILTERS */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4">
        {/* SEARCH */}
        <Input
          allowClear
          prefix={<Search size={16} />}
          placeholder={
            viewType === 'Template'
              ? 'Search by module or template...'
              : 'Search by module or report...'
          }
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className="min-w-[280px] flex-1"
        />

        {/* MODULE FILTER */}
        <Select
          value={selectedModule}
          onChange={setSelectedModule}
          className="w-[170px]"
        >
          <Select.Option value="ALL">
            All Modules
          </Select.Option>

          {moduleOptions.map((module) => (
            <Select.Option key={module} value={module}>
              {module}
            </Select.Option>
          ))}
        </Select>

        {/* TEMPLATE FILTER - ONLY IN TEMPLATE VIEW */}
        {viewType === 'Template' && (
          <Select
            value={selectedTemplate}
            onChange={setSelectedTemplate}
            className="w-[170px]"
          >
            <Select.Option value="ALL">
              All Templates
            </Select.Option>

            {templateOptions.map((template) => (
              <Select.Option key={template} value={template}>
                {template}
              </Select.Option>
            ))}
          </Select>
        )}

        {/* LOT FILTER - BOTH VIEWS */}
        <Select
          value={selectedLot}
          onChange={setSelectedLot}
          className="w-[140px]"
        >
          <Select.Option value="ALL">
            All Lots
          </Select.Option>

          {getLotNumbers.map((lot) => (
            <Select.Option key={lot} value={lot}>
              Lot {lot}
            </Select.Option>
          ))}
        </Select>

        {/* DOWNLOAD ALL */}
        <Button
          type="primary"
          onClick={handleDownloadAll}
          loading={bulkDownloading}
          disabled={
            bulkDownloading || filteredReports.length === 0
          }
          icon={<Download size={15} />}
        >
          {bulkDownloading ? 'Downloading...' : 'Download All'}
        </Button>

        {/* TOGGLE */}
        <div className="flex rounded-lg border border-slate-200 bg-white p-1">
          <Button
            type={
              viewType === 'Report' ? 'primary' : 'default'
            }
            onClick={() => handleTypeChange('Report')}
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Reports
          </Button>

          <Button
            type={
              viewType === 'Template' ? 'primary' : 'default'
            }
            onClick={() => handleTypeChange('Template')}
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Templates
          </Button>
        </div>
      </div>

      {/* TABLE */}
      <div className="p-4">
        <Table
          rowKey="key"
          columns={activeColumns}
          dataSource={filteredReports}
          scroll={{
            x: 1200,
          }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            pageSizeOptions: ['10', '20', '50', '100'],
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} of ${total} entries`,
          }}
          locale={{
            emptyText: (
              <div className="py-10">
                <FileText
                  size={22}
                  className="mx-auto mb-3 text-slate-400"
                />

                <p className="text-sm font-medium text-slate-600">
                  No {viewType === 'Report' ? 'reports' : 'templates'} found
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Try changing your search or filters.
                </p>
              </div>
            ),
          }}
        />
      </div>
    </section>
  );
};

export default ReportTemplateManagement;
