import React, { useMemo, useState, useEffect } from 'react';
import {
  Table,
  Input,
  Select,
  Tag,
  message,
  Button,
  Tooltip,
  Modal,
  Checkbox,
} from 'antd';
import axios from 'axios';
import {
  Search,
  Download,
  FileText,
} from 'lucide-react';
import { useUserMap, getFirstNameFromUserId } from '../../hooks/useUserMap';

// Helper to format ISO date-time to Indian Standard Time (IST)
const formatDateTimeToIST = (dateVal) => {
  if (!dateVal) return '-';
  try {
    let dateStr = String(dateVal);
    // If it doesn't end with Z and doesn't contain a timezone offset, and is in ISO-like format, append 'Z'
    if (
      !dateStr.endsWith('Z') &&
      !dateStr.includes('+') &&
      !dateStr.match(/-\d{2}:\d{2}$/)
    ) {
      if (dateStr.includes(' ') && !dateStr.includes('T')) {
        dateStr = dateStr.replace(' ', 'T');
      }
      dateStr = `${dateStr}Z`;
    }
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '-';
    
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return '-';
  }
};

const ReportTemplateManagement = ({
  reports = [],
  onDownload,
  rptApiUrl,
  apiBaseUrl,
  projectId,
  envLotReports = [],
}) => {
  const { userMap } = useUserMap();
  const [searchText, setSearchText] = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState('ALL');
  const [selectedLot, setSelectedLot] = useState('ALL');
  const [viewType, setViewType] = useState('Report');
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [reportPage, setReportPage] = useState(1);
  const [reportPageSize, setReportPageSize] = useState(10);

  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(10);
  const [envLotCatches, setEnvLotCatches] = useState({});
  const [envLotReportsLocal, setEnvLotReportsLocal] = useState([]);
  const [columnVisibilityModalOpen, setColumnVisibilityModalOpen] = useState(false);
  const [showLatestOnly, setShowLatestOnly] = useState(true);
  const [reportVisibleColumns, setReportVisibleColumns] = useState({
    module: true,
    lot: true,
    reportName: true,
    version: true,
    generatedOn: true,
    generatedBy: true,
    status: true,
    action: true,
  });
  const [templateVisibleColumns, setTemplateVisibleColumns] = useState({
    module: true,
    templateName: true,
    lot: true,
    envLot: true,
    version: true,
    generatedOn: true,
    generatedBy: true,
    downloadedBy: true,
    downloadedAt: true,
    status: true,
    action: true,
  });

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  const extractLotFromFilename = (fileName) => {
    if (!fileName || typeof fileName !== 'string') return null;

    const match = fileName.match(/_(\d+)\./);

    return match ? parseInt(match[1], 10) : null;
  };

  const parseEnvLotNumbers = (envLotStr) => {
    if (Array.isArray(envLotStr)) {
      return envLotStr;
    }
    if (
      envLotStr === null ||
      envLotStr === undefined ||
      envLotStr === '' ||
      envLotStr === '0' ||
      envLotStr === 0
    ) {
      return [];
    }

    if (typeof envLotStr === 'number') {
      return envLotStr > 0 ? [envLotStr] : [];
    }

    if (typeof envLotStr !== 'string') {
      return [];
    }

    return envLotStr
      .split(',')
      .map((num) => parseInt(num.trim(), 10))
      .filter((num) => !isNaN(num) && num > 0);
  };

  const getReportVersion = (report) => {
    if (viewType === 'Template') {
      return (
        report?.version ??
        report?.Version ??
        '-'
      );
    }

    return (
      report?.versions?.[0]?.version ??
      '-'
    );
  };

  /**
   * Get catches for a specific envelope lot number.
   * Catches are fetched separately from NRDataLots API.
   */
  const getCatchesForEnvLot = (envLotNo) => {
    return envLotCatches[envLotNo] || [];
  };

  const handleSelectAll = () => {
    if (viewType === "Report") {
      const updated = {};
      Object.keys(reportVisibleColumns).forEach((k) => {
        updated[k] = true;
      });
      setReportVisibleColumns(updated);
    } else {
      const updated = {};
      Object.keys(templateVisibleColumns).forEach((k) => {
        updated[k] = true;
      });
      setTemplateVisibleColumns(updated);
    }
  };

  const handleDeselectAll = () => {
    if (viewType === "Report") {
      const updated = { ...reportVisibleColumns };
      Object.keys(updated).forEach((k) => {
        if (k !== "action") updated[k] = false;
      });
      setReportVisibleColumns(updated);
    } else {
      const updated = { ...templateVisibleColumns };
      Object.keys(updated).forEach((k) => {
        if (k !== "action") updated[k] = false;
      });
      setTemplateVisibleColumns(updated);
    }
  };

  // ============================================================================
  // ENV LOT REPORT LOOKUP
  // ============================================================================

  /**
   * Important:
   *
   * One TemplateId can have multiple EnvelopeLotReports rows.
   *
   * Example:
   *
   * TemplateId 655 -> EnvLot 1
   * TemplateId 655 -> EnvLot 2
   *
   * Therefore, do not overwrite lookup[templateId].
   */
  const envLotReportsLookup = useMemo(() => {
    const lookup = {};

    const dataToUse =
      envLotReportsLocal.length > 0
        ? envLotReportsLocal
        : envLotReports;

    (dataToUse || []).forEach((report) => {
      const templateId = Number(
        report.templateId ??
        report.TemplateId
      );

      if (!templateId) return;

      const envLotNumbers = parseEnvLotNumbers(
        report.envLotNumbers ??
        report.EnvLotNumbers
      );

      const lotNo = Number(
        report.lotNumber ??
        report.lotNo ??
        report.LotNo ??
        0
      );

      if (!lookup[templateId]) {
        lookup[templateId] = {
          templateId,
          envLotNumbers: [],
          lotNumbers: [],
          reports: [],
          version: report.version || report.Version || 1,
        };
      }

      lookup[templateId].envLotNumbers.push(
        ...envLotNumbers
      );

      if (lotNo > 0) {
        lookup[templateId].lotNumbers.push(lotNo);
      }

      lookup[templateId].reports.push(report);
    });

    Object.values(lookup).forEach((item) => {
      item.envLotNumbers = [
        ...new Set(item.envLotNumbers),
      ];

      item.lotNumbers = [
        ...new Set(item.lotNumbers),
      ];
    });

    return lookup;
  }, [
    envLotReports,
    envLotReportsLocal,
  ]);

  const envLotReportsByTemplate = useMemo(() => {
    const lookup = {};

    const dataToUse =
      envLotReportsLocal.length > 0
        ? envLotReportsLocal
        : envLotReports;

    (dataToUse || []).forEach((report) => {
      const templateId = Number(
        report.templateId ??
        report.TemplateId
      );

      if (!templateId) return;

      if (!lookup[templateId]) {
        lookup[templateId] = [];
      }

      lookup[templateId].push(report);
    });

    return lookup;
  }, [
    envLotReports,
    envLotReportsLocal,
  ]);
  // ============================================================================
  // FETCH ENV LOT REPORTS
  // ============================================================================

  useEffect(() => {
    fetchEnvLotReports();
  }, [projectId, envLotReports]);

  const fetchEnvLotReports = async () => {
    if (!projectId || !apiBaseUrl) return;

    try {
      const response = await axios.get(
        `${apiBaseUrl}/EnvelopeLotReports/ByProject/${projectId}`
      );

      console.log(
        'ENV LOT API RESPONSE:',
        JSON.stringify(response.data, null, 2)
      );

      setEnvLotReportsLocal(
        response.data || []
      );
    } catch (error) {
      console.error(
        'Failed to fetch EnvLotReports:',
        error
      );
    }
  };

  // ============================================================================
  // FETCH ASSIGNED ENV LOT CATCHES
  // ============================================================================

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

      (response.data || []).forEach((item) => {
        const envLotNo =
          item.envLotNo ??
          item.EnvLotNo;

        const catchNo =
          item.catchNo ??
          item.CatchNo;

        if (
          envLotNo &&
          catchNo
        ) {
          if (!catchesLookup[envLotNo]) {
            catchesLookup[envLotNo] = [];
          }

          if (
            !catchesLookup[envLotNo].includes(
              catchNo
            )
          ) {
            catchesLookup[envLotNo].push(
              catchNo
            );
          }
        }
      });

      setEnvLotCatches(
        catchesLookup
      );
    } catch (error) {
      console.error(
        'Failed to fetch env lot catches:',
        error
      );
    }
  };

  // ============================================================================
  // VIEW TYPE TOGGLE
  // ============================================================================

  const handleTypeChange = (type) => {
    setViewType(type);
    setSelectedModule('ALL');
    setSelectedLot('ALL');
    setSearchText('');

    if (type === 'Report') {
      setSelectedTemplate('ALL');
      // Switch to Report pagination state
      setReportPage(1);
    } else if (type === 'Template') {
      // Switch to Template pagination state
      setTemplatePage(1);
    }

    // Refresh data from API on tab toggle
    fetchEnvLotReports();
  };

  // Reset pagination when filters change (only for current view)
  useEffect(() => {
    if (viewType === 'Report') {
      setReportPage(1);
    } else if (viewType === 'Template') {
      setTemplatePage(1);
    }
  }, [searchText, selectedModule, selectedTemplate, selectedLot, viewType]);

  // Scroll table to top when page changes
  useEffect(() => {
    const tableContainer = document.querySelector('.ant-table-wrapper');
    if (tableContainer) {
      tableContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [reportPage, templatePage, viewType]);

  // ============================================================================
  // FILTER OPTIONS
  // ============================================================================

  const getLotNumbers = useMemo(() => {
    const lots = new Set();

    reports.forEach((report) => {
      if (report.type !== viewType) {
        return;
      }

      let lotNum = null;

      if (viewType === 'Template') {
        const templateId =
          report.templateId ??
          report.TemplateId;

        const envLotReportData =
          templateId
            ? envLotReportsLookup[
            Number(templateId)
            ]
            : null;

        if (
          envLotReportData?.lotNumbers?.length
        ) {
          envLotReportData.lotNumbers.forEach(
            (lot) => lots.add(lot)
          );
        }
      }

      if (viewType === 'Report') {
        const fileName =
          report.reportName ||
          report.fileName;

        lotNum =
          extractLotFromFilename(
            fileName
          );

        if (lotNum) {
          lots.add(lotNum);
        }
      }
    });

    return Array.from(lots).sort(
      (a, b) => a - b
    );
  }, [
    reports,
    viewType,
    envLotReportsLookup,
  ]);

  const moduleOptions = useMemo(() => {
    return [
      ...new Set(
        reports
          .filter(
            (report) =>
              report.type === viewType
          )
          .map(
            (report) =>
              report.module
          )
          .filter(Boolean)
      ),
    ];
  }, [
    reports,
    viewType,
  ]);

  const templateOptions = useMemo(() => {
    return [
      ...new Set(
        reports
          .filter(
            (report) =>
              report.type === viewType
          )
          .map(
            (report) =>
              report.templateName
          )
          .filter(Boolean)
      ),
    ];
  }, [
    reports,
    viewType,
  ]);

  // ============================================================================
  // FILTER DATA
  // ============================================================================

  const filteredReports = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    // =========================
    // REPORT VIEW
    // =========================
    if (viewType === 'Report') {
      return reports
        .filter((report) => report.type === 'Report')
        .filter((report) => {
          const fileName =
            report.reportName ||
            report.fileName ||
            '';

          const lotNumber =
            extractLotFromFilename(fileName);

          const matchesSearch =
            !search ||
            report.module?.toLowerCase().includes(search) ||
            report.reportName?.toLowerCase().includes(search);

          const matchesModule =
            selectedModule === 'ALL' ||
            report.module === selectedModule;

          const matchesLot =
            selectedLot === 'ALL' ||
            Number(lotNumber) === Number(selectedLot);

          // Filter by Latest status if showLatestOnly is enabled
          const matchesLatest =
            !showLatestOnly ||
            report.versions?.[0]?.status === 'Latest';

          return (
            matchesSearch &&
            matchesModule &&
            matchesLot &&
            matchesLatest
          );
        })
        .map((report) => {
          const fileName =
            report.reportName ||
            report.fileName ||
            '';

          return {
            ...report,

            key:
              report.id ||
              report.reportId ||
              fileName,

            extractedLotNumber:
              extractLotFromFilename(fileName),
          };
        });
    }

    // =========================
    // TEMPLATE VIEW
    // =========================
    return reports
      .filter((report) => report.type === 'Template')
      .flatMap((report, index) => {
        const templateId = Number(
          report.templateId ??
          report.TemplateId
        );

        const envLotRows = envLotReportsByTemplate[templateId] || [];

        if (envLotRows.length === 0) {
          return [{
            ...report,
            key: `template-${templateId}-none-${index}`,
            templateId,
            version: report.versions?.[0]?.version ?? 1,
            extractedLotNumbers: [],
            extractedLotNumber: 0,
            extractedEnvLotNumbers: [],
            generatedAt: null,
            generatedBy: null,
            generatedByUserId: null,
            lastDownloadedBy: null,
            lastDownloadedByUserId: null,
            lastDownloadedAt: null,
            envLotReport: null,
            envLotReports: [],
          }];
        }

        const rowsByBatch = {};
        envLotRows.forEach((row) => {
          const batchNums = parseEnvLotNumbers(row.envLotNumbers ?? row.EnvLotNumbers);
          const batchKey = batchNums.length > 0 ? batchNums[0] : 0;
          if (!rowsByBatch[batchKey]) rowsByBatch[batchKey] = [];
          rowsByBatch[batchKey].push(row);
        });

        return Object.entries(rowsByBatch).map(([batchKey, rowsForBatch]) => {
          const batchNum = Number(batchKey);
          const latestEnvLotReport = [...rowsForBatch].sort((a, b) =>
            new Date(b.generatedAt ?? b.GeneratedAt ?? 0) - new Date(a.generatedAt ?? a.GeneratedAt ?? 0)
          )[0] || null;

          const lotNumbers = [...new Set(rowsForBatch.map(r => Number(r.lotNumber ?? r.lotNo ?? r.LotNo ?? 0)).filter(l => l > 0))];
          const envLotNumbers = batchNum > 0 ? [batchNum] : [];

          return {
            ...report,
            key: `template-${templateId}-b${batchNum}-${index}`,
            templateId,
            version: latestEnvLotReport?.version ?? latestEnvLotReport?.Version ?? report.versions?.[0]?.version ?? 1,
            extractedLotNumbers: lotNumbers,
            extractedLotNumber: lotNumbers[0] || 0,
            extractedEnvLotNumbers: envLotNumbers,
            generatedAt: latestEnvLotReport?.generatedAt ?? latestEnvLotReport?.GeneratedAt,
            generatedBy: latestEnvLotReport?.generatedBy ?? latestEnvLotReport?.GeneratedBy,
            generatedByUserId: latestEnvLotReport?.generatedByUserId ?? latestEnvLotReport?.GeneratedByUserId,
            lastDownloadedBy: latestEnvLotReport?.downloadedBy ?? latestEnvLotReport?.DownloadedBy,
            lastDownloadedByUserId: latestEnvLotReport?.downloadedByUserId ?? latestEnvLotReport?.DownloadedByUserId,
            lastDownloadedAt: latestEnvLotReport?.downloadedAt ?? latestEnvLotReport?.DownloadedAt,
            envLotReport: latestEnvLotReport,
            envLotReports: rowsForBatch,
          };
        });
      })
      .filter((report) => {
        const matchesSearch =
          !search ||
          report.module?.toLowerCase().includes(search) ||
          report.templateName?.toLowerCase().includes(search);

        const matchesModule =
          selectedModule === 'ALL' ||
          report.module === selectedModule;

        const matchesTemplate =
          selectedTemplate === 'ALL' ||
          report.templateName === selectedTemplate;

        const matchesLot =
          selectedLot === 'ALL' ||
          report.extractedLotNumbers?.includes(
            Number(selectedLot)
          );

        // Filter by Latest status if showLatestOnly is enabled
        const matchesLatest =
          !showLatestOnly ||
          report.versions?.[0]?.status === 'Latest';

        return (
          matchesSearch &&
          matchesModule &&
          matchesTemplate &&
          matchesLot &&
          matchesLatest
        );
      });
  }, [
    reports,
    searchText,
    selectedModule,
    selectedTemplate,
    selectedLot,
    viewType,
    envLotReportsByTemplate,
    showLatestOnly,
  ]);

  // Total count (without showLatestOnly filter) - for display badge only
  const totalReportsCount = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    if (viewType === 'Report') {
      return reports
        .filter((report) => report.type === 'Report')
        .filter((report) => {
          const fileName =
            report.reportName ||
            report.fileName ||
            '';

          const lotNumber =
            extractLotFromFilename(fileName);

          const matchesSearch =
            !search ||
            report.module?.toLowerCase().includes(search) ||
            report.reportName?.toLowerCase().includes(search);

          const matchesModule =
            selectedModule === 'ALL' ||
            report.module === selectedModule;

          const matchesLot =
            selectedLot === 'ALL' ||
            Number(lotNumber) === Number(selectedLot);

          return (
            matchesSearch &&
            matchesModule &&
            matchesLot
          );
        }).length;
    }

    // TEMPLATE VIEW
    return reports
      .filter((report) => report.type === 'Template')
      .map((report) => {
        const templateId = Number(
          report.templateId ??
          report.TemplateId
        );

        const envLotRows =
          envLotReportsByTemplate[templateId] || [];

        const lotNumbers = [
          ...new Set(
            envLotRows
              .map((row) =>
                Number(
                  row.lotNumber ??
                  row.lotNo ??
                  row.LotNo ??
                  0
                )
              )
              .filter((lot) => lot > 0)
          ),
        ];

        const envLotNumbers = [
          ...new Set(
            envLotRows.flatMap((row) =>
              parseEnvLotNumbers(
                row.envLotNumbers ??
                row.EnvLotNumbers
              )
            )
          ),
        ];

        const latestEnvLotReport =
          [...envLotRows].sort(
            (a, b) =>
              new Date(
                b.generatedAt ??
                b.GeneratedAt ??
                0
              ) -
              new Date(
                a.generatedAt ??
                a.GeneratedAt ??
                0
              )
          )[0] || null;

        return {
          ...report,

          key: `template-${templateId}`,

          templateId,

          version:
            latestEnvLotReport?.version ??
            latestEnvLotReport?.Version ??
            report.versions?.[0]?.version ??
            1,

          extractedLotNumbers: lotNumbers,

          extractedLotNumber:
            lotNumbers[0] || 0,

          extractedEnvLotNumbers:
            envLotNumbers,

          generatedAt:
            latestEnvLotReport?.generatedAt ??
            latestEnvLotReport?.GeneratedAt,

          generatedBy:
            latestEnvLotReport?.generatedBy ??
            latestEnvLotReport?.GeneratedBy,

          generatedByUserId:
            latestEnvLotReport?.generatedByUserId ??
            latestEnvLotReport?.GeneratedByUserId,

          lastDownloadedBy:
            latestEnvLotReport?.downloadedBy ??
            latestEnvLotReport?.DownloadedBy,

          lastDownloadedByUserId:
            latestEnvLotReport?.downloadedByUserId ??
            latestEnvLotReport?.DownloadedByUserId,

          lastDownloadedAt:
            latestEnvLotReport?.downloadedAt ??
            latestEnvLotReport?.DownloadedAt,

          envLotReport:
            latestEnvLotReport,

          envLotReports:
            envLotRows,
        };
      })
      .filter((report) => {
        const matchesSearch =
          !search ||
          report.module?.toLowerCase().includes(search) ||
          report.templateName?.toLowerCase().includes(search);

        const matchesModule =
          selectedModule === 'ALL' ||
          report.module === selectedModule;

        const matchesTemplate =
          selectedTemplate === 'ALL' ||
          report.templateName === selectedTemplate;

        const matchesLot =
          selectedLot === 'ALL' ||
          report.extractedLotNumbers?.includes(
            Number(selectedLot)
          );

        return (
          matchesSearch &&
          matchesModule &&
          matchesTemplate &&
          matchesLot
        );
      }).length;
  }, [
    reports,
    searchText,
    selectedModule,
    selectedTemplate,
    selectedLot,
    viewType,
    envLotReportsByTemplate,
  ]);

  const paginatedReports = useMemo(() => {
    const page =
      viewType === 'Report'
        ? reportPage
        : templatePage;

    const pageSize =
      viewType === 'Report'
        ? reportPageSize
        : templatePageSize;

    const startIndex =
      (page - 1) * pageSize;

    const endIndex =
      startIndex + pageSize;

    return filteredReports.slice(
      startIndex,
      endIndex
    );
  }, [
    filteredReports,
    viewType,
    reportPage,
    reportPageSize,
    templatePage,
    templatePageSize,
  ]);

  // ============================================================================
  // DOWNLOAD HANDLERS
  // ============================================================================

  const handleDownload = async (report) => {
    const version =
      report?.versions?.[0];

    if (
      viewType === 'Report' ||
      report?.type === 'Report'
    ) {
      if (
        !version?.fileUrl
      ) {
        message.error(
          'Download URL not available for this report.'
        );

        return;
      }

      const link =
        document.createElement(
          'a'
        );

      link.href =
        version.fileUrl;

      link.download =
        report?.reportName ||
        'report';

      link.target =
        '_blank';

      document.body.appendChild(
        link
      );

      link.click();

      document.body.removeChild(
        link
      );

      message.success(
        'Report download started.'
      );

      return;
    }

    const templateId =
      report?.templateId ||
      report?.TemplateId ||
      version?.templateId ||
      version?.TemplateId ||
      report?.id ||
      version?.id;

    let lotNumber =
      report?.extractedLotNumber ||
      report?.lotNumber ||
      report?.lotNo ||
      version?.lotNumber ||
      version?.lotNo;

    if (
      !lotNumber &&
      templateId &&
      envLotReportsLookup[
      Number(templateId)
      ]
    ) {
      const lotNumbers =
        envLotReportsLookup[
          Number(templateId)
        ].lotNumbers || [];

      lotNumber =
        lotNumbers[0];
    }

    lotNumber =
      lotNumber || 1;

    if (
      !templateId ||
      !projectId
    ) {
      message.error(
        'Missing template download details.'
      );

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

      const existsUrl =
        `${base}/api/report/generated-exists` +
        `?templateId=${templateId}` +
        `&projectId=${projectId}`

      const existsResponse = await axios.get(existsUrl);

      if (
        !existsResponse.data?.exists &&
        existsResponse.data !== true
      ) {
        message.error('No generated PDF found for this template.');
        return;
      }

      const downloadUrl =
        `${base}/api/report/generated-download` +
        `?templateId=${templateId}` +
        `&projectId=${projectId}` +
        `&lotNumber=${lotNumber}`;

      window.open(downloadUrl, '_blank');

      // Track download for EnvelopeLotReports
      if (report?.envLotReport?.id) {
        try {
          let currentUserId = localStorage.getItem('userId');
          if (!currentUserId || currentUserId === 'undefined') {
            const userData = localStorage.getItem('userData');
            if (userData) {
              try {
                const parsed = JSON.parse(userData);
                currentUserId = parsed.userId ?? parsed.UserId ?? parsed.id ?? parsed.Id ?? null;
              } catch (e) {
                // ignore
              }
            }
          }
          if (currentUserId && currentUserId !== 'undefined') {
            currentUserId = Number(currentUserId);
            if (isNaN(currentUserId)) {
              currentUserId = null;
            }
          } else {
            currentUserId = null;
          }

          await axios.put(
            `${apiBaseUrl}/EnvelopeLotReports/${report.envLotReport.id}/track-download`,
            {
              downloadedByUserId: currentUserId ? Number(currentUserId) : null,
              DownloadedByUserId: currentUserId ? Number(currentUserId) : null,
            }
          );
          // Fetch API after track-download so the UI data is updated immediately
          await fetchEnvLotReports();
        } catch (trackingError) {
          console.warn('Failed to track download:', trackingError);
        }
      }

      message.success('Download started.');
    } catch (error) {
      console.error('Template download failed:', error);
      message.error('Failed to download generated PDF.');
    }
  };

  const handleDownloadAll = async () => {
    const latestItems =
      filteredReports.filter(
        (report) =>
          report.versions?.[0]
            ?.status === 'Latest'
      );

    if (
      !latestItems.length
    ) {
      message.warning(
        `No latest ${viewType === 'Report'
          ? 'reports'
          : 'templates'
        } available for download.`
      );

      return;
    }

    setBulkDownloading(
      true
    );

    try {
      if (
        viewType === 'Report'
      ) {
        try {
          const response =
            await axios.get(
              `${apiBaseUrl}/EnvelopeBreakages/Reports/DownloadAll`,
              {
                params: {
                  projectId:
                    Number(
                      projectId
                    ),
                },
                responseType:
                  'blob',
              }
            );

          const blob =
            new Blob(
              [response.data],
              {
                type:
                  response.headers[
                  'content-type'
                  ] ||
                  'application/zip',
              }
            );

          const url =
            window.URL.createObjectURL(
              blob
            );

          const link =
            document.createElement(
              'a'
            );

          link.href =
            url;

          link.download =
            `reports_${projectId}.zip`;

          document.body.appendChild(
            link
          );

          link.click();

          link.remove();

          window.URL.revokeObjectURL(
            url
          );

          message.success(
            'Reports downloaded successfully.'
          );

          return;
        } catch (error) {
          console.error(
            'Report bulk download failed:',
            error
          );

          message.error(
            'Failed to download reports.'
          );

          return;
        }
      }

      const base = (
        rptApiUrl ||
        import.meta.env
          .VITE_RPT_API_URL ||
        ''
      ).replace(
        /\/api\/?$/i,
        ''
      );

      if (!base) {
        message.error(
          'RPT API URL not configured.'
        );

        return;
      }

      const existingTemplates =
        [];

      for (
        const report of latestItems
      ) {
        const version =
          report.version;

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

        if (
          !lotNumber &&
          templateId &&
          envLotReportsLookup[
          Number(templateId)
          ]
        ) {
          const lotNumbers =
            envLotReportsLookup[
              Number(templateId)
            ].lotNumbers || [];

          lotNumber =
            lotNumbers[0];
        }

        lotNumber =
          lotNumber || 1;

        if (
          !templateId
        ) {
          console.warn(
            'Missing template ID:',
            report
          );

          continue;
        }

        const templateExists =
          envLotReportsLocal.some(
            (item) => {
              const itemTemplateId =
                item.templateId ||
                item.TemplateId;

              const itemLotNumber =
                item.lotNumber ||
                item.lotNo;

              return (
                Number(
                  itemTemplateId
                ) ===
                Number(
                  templateId
                ) &&
                Number(
                  itemLotNumber
                ) ===
                Number(
                  lotNumber
                )
              );
            }
          );

        if (
          templateExists
        ) {
          existingTemplates.push(
            {
              templateId:
                Number(
                  templateId
                ),
              lotNumber:
                Number(
                  lotNumber
                ),
            }
          );
        }
      }

      if (
        !existingTemplates.length
      ) {
        message.warning(
          'No generated PDFs found for the selected templates.'
        );

        return;
      }

      const templateIds =
        existingTemplates
          .map(
            (item) =>
              item.templateId
          )
          .join(',');

      const lotNumbers =
        existingTemplates
          .map(
            (item) =>
              item.lotNumber
          )
          .join(',');

      const response =
        await axios.get(
          `${base}/api/report/generated-download-zip`,
          {
            params: {
              projectId:
                Number(
                  projectId
                ),
              templateIds,
              lotNumbers,
            },
            responseType:
              'blob',
          }
        );

      const blob =
        new Blob(
          [response.data],
          {
            type:
              'application/zip',
          }
        );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement(
          'a'
        );

      link.href =
        url;

      link.download =
        `generated_templates_${projectId}.zip`;

      document.body.appendChild(
        link
      );

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );

      message.success(
        'Generated PDFs downloaded successfully.'
      );
    } catch (error) {
      console.error(
        'Bulk download failed:',
        error
      );

      message.error(
        'Failed to download files.'
      );
    } finally {
      setBulkDownloading(
        false
      );
    }
  };

  // ============================================================================
  // RENDER HELPERS
  // ============================================================================

  const renderStatus = (status) => {
    if (
      status === 'Latest'
    ) {
      return (
        <Tag color="success">
          Latest
        </Tag>
      );
    }

    if (
      status === 'Previous'
    ) {
      return (
        <Tag>
          Previous
        </Tag>
      );
    }

    return (
      <Tag>
        {status || '-'}
      </Tag>
    );
  };

  const renderEnvLotTags = (
    envLotNumbers,
    templateId
  ) => {
    if (
      !envLotNumbers ||
      envLotNumbers.length === 0
    ) {
      return (
        <span className="text-sm text-slate-500">
          -
        </span>
      );
    }

    return (
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 6,
        }}
      >
        {envLotNumbers.map(
          (envLotNo) => {
            const catches =
              getCatchesForEnvLot(
                envLotNo
              );

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
                  Batch {envLotNo} -
                  Catches
                </div>

                <div
                  style={{
                    display: 'flex',
                    flexDirection:
                      'column',
                    gap: 4,
                    maxHeight: 250,
                    overflowY:
                      'auto',
                  }}
                >
                  {catches.length >
                    0 ? (
                    catches.map(
                      (
                        catchNo,
                        idx
                      ) => (
                        <span
                          key={
                            idx
                          }
                          style={{
                            fontSize: 12,
                            padding:
                              '4px 8px',
                            backgroundColor:
                              '#f0f0f0',
                            color:
                              '#333',
                            borderRadius:
                              4,
                          }}
                        >
                          {
                            catchNo
                          }
                        </span>
                      )
                    )
                  ) : (
                    <span
                      style={{
                        color:
                          '#999',
                      }}
                    >
                      No catches
                      assigned
                    </span>
                  )}
                </div>
              </div>
            );

            return (
              <Tooltip
                key={
                  envLotNo
                }
                title={
                  tooltipContent
                }
                color="#ffffff"
                placement="top"
                overlayInnerStyle={{
                  color: '#333',
                }}
              >
                <Tag
                  color="default"
                  style={{
                    cursor:
                      'pointer',
                  }}
                >
                  Batch{' '}
                  {envLotNo}

                  {catches.length >
                    0 && (
                      <span
                        style={{
                          marginLeft: 4,
                          fontSize: 11,
                        }}
                      >
                        (
                        {
                          catches.length
                        }
                        )
                      </span>
                    )}
                </Tag>
              </Tooltip>
            );
          }
        )}
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
        (
          a.module || ''
        ).localeCompare(
          b.module || ''
        ),

      render: (
        module
      ) => (
        <span className="text-sm font-medium text-slate-700">
          {module || '-'}
        </span>
      ),
    },

    {
      title: 'Template Name',
      dataIndex:
        'templateName',
      key: 'templateName',

      sorter: (a, b) =>
        (
          a.templateName ||
          ''
        ).localeCompare(
          b.templateName ||
          ''
        ),

      render: (
        templateName
      ) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <FileText
              size={16}
            />
          </div>

          <span className="text-sm font-medium text-slate-800">
            {
              templateName ||
              '-'
            }
          </span>
        </div>
      ),
    },

    {
      title: 'Lot',
      key: 'lot',
      width: 80,

      sorter: (a, b) =>
        (
          a.extractedLotNumber ||
          0
        ) -
        (
          b.extractedLotNumber ||
          0
        ),

      render: (
        _,
        record
      ) => (
        <span className="text-sm font-medium text-slate-700">
          {
            record.extractedLotNumber ||
            '-'
          }
        </span>
      ),
    },

    {
      title: 'Batch',
      key: 'envLot',
      width: 200,
      hidden:
        viewType !==
        'Template',

      sorter: (a, b) => {
        const aEnv =
          a.extractedEnvLotNumbers
          ?.[0] || 0;

        const bEnv =
          b.extractedEnvLotNumbers
          ?.[0] || 0;

        return (
          aEnv - bEnv
        );
      },

      render: (
        _,
        record
      ) =>
        renderEnvLotTags(
          record.extractedEnvLotNumbers,
          record.templateId ||
          record.TemplateId
        ),
    },

    {
      title: 'Report',
      dataIndex:
        'reportName',
      key: 'reportName',

      sorter: (a, b) =>
        (
          a.reportName ||
          ''
        ).localeCompare(
          b.reportName ||
          ''
        ),

      render: (
        reportName
      ) => (
        <span className="text-sm text-slate-600">
          {
            reportName ||
            '-'
          }
        </span>
      ),
    },

    {
      title: 'Version',
      key: 'version',

      sorter: (a, b) =>
        Number(a.version || 0) -
        Number(b.version || 0),

      render: (_, record) => (
        <span className="text-sm font-semibold text-slate-700">
          {record.version ?? '-'}
        </span>
      ),
    },

    {
      title: 'Generated On',
      key: 'generatedOn',

      sorter: (a, b) =>
        new Date(
          a.versions?.[0]?.generatedOn || 0
        ) -
        new Date(
          b.versions?.[0]?.generatedOn || 0
        ),

      render: (_, record) => {
        const generatedOn =
          record.versions?.[0]?.generatedOn;

        return (
          <span className="text-sm text-slate-600">
            {formatDateTimeToIST(generatedOn)}
          </span>
        );
      },
    },

    {
      title: 'Generated By',
      key: 'generatedBy',

      sorter: (a, b) =>
        (
          a.versions?.[0]
            ?.generatedBy ||
          ''
        ).localeCompare(
          b.versions?.[0]
            ?.generatedBy ||
          ''
        ),

      render: (
        _,
        record
      ) => {
        let generatedById = null;
        let fallbackName = '-';

        if (record.envLotReport) {
          generatedById = record.generatedByUserId || record.GeneratedByUserId;
          fallbackName = record.generatedBy || record.GeneratedBy || '-';
        } else {
          generatedById = record.versions?.[0]?.generatedByUserId || record.versions?.[0]?.GeneratedByUserId || record.generatedByUserId || record.GeneratedByUserId;
          fallbackName = record.versions?.[0]?.generatedBy || record.versions?.[0]?.GeneratedBy || record.generatedBy || record.GeneratedBy || '-';
        }

        return (
          <span className="text-sm text-slate-600">
            {displayName}
          </span>
        );
      },
    },

    {
      title: 'Last Downloaded By',
      key: 'downloadedBy',
      width: 150,
      hidden: viewType === 'Report',

      render: (
        _,
        record
      ) => {
        let downloadedById = null;
        let fallbackName = '-';

        if (record.envLotReport) {
          downloadedById = record.lastDownloadedByUserId || record.envLotReport?.downloadedByUserId || record.envLotReport?.DownloadedByUserId;
          fallbackName = record.lastDownloadedBy || record.envLotReport?.lastDownloadedBy || '-';
        } else {
          downloadedById = record.lastDownloadedByUserId || record.versions?.[0]?.downloadedByUserId || record.versions?.[0]?.DownloadedByUserId;
          fallbackName = record.lastDownloadedBy || record.versions?.[0]?.lastDownloadedBy || '-';
        }

        return (
          <span className="text-sm text-slate-600">
            {displayName}
          </span>
        );
      },
    },

    {
      title: 'Last Downloaded At',
      key: 'downloadedAt',
      width: 180,
      hidden: viewType === 'Report',

      render: (
        _,
        record
      ) => {
        const lastDownloadedAt =
          record.envLotReport?.lastDownloadedAt ||
          record.lastDownloadedAt;

        return (
          <span className="text-sm text-slate-600">
            {formatDateTimeToIST(lastDownloadedAt)}
          </span>
        );
      },
    },

    {
      title: 'Status',
      key: 'status',

      filters: [
        {
          text: 'Latest',
          value: 'Latest',
        },
        {
          text: 'Previous',
          value: 'Previous',
        },
      ],

      onFilter: (
        value,
        record
      ) =>
        record.versions?.[0]
          ?.status === value,

      render: (
        _,
        record
      ) =>
        renderStatus(
          record.versions?.[0]
            ?.status
        ),
    },

    {
      title: 'Action',
      key: 'action',
      align: 'right',

      render: (
        _,
        record
      ) => {
        const latest =
          record.versions?.[0];

        if (!latest) {
          return null;
        }

        return (
          <Button
            type="primary"
            size="small"
            icon={
              <Download
                size={14}
              />
            }
            onClick={() =>
              handleDownload(
                record
              )
            }
          >
            Download
          </Button>
        );
      },
    },
  ];

  const activeColumns =
    columns.filter(
      (col) => {
        // Always show action column
        if (col.key === 'action') {
          return true;
        }

        // Filter based on view type
        if (
          viewType ===
          'Report' &&
          (
            col.key ===
            'templateName' ||
            col.key ===
            'envLot' ||
            col.key ===
            'downloadedBy' ||
            col.key ===
            'downloadedAt'
          )
        ) {
          return false;
        }

        if (
          viewType ===
          'Template' &&
          col.key ===
          'reportName'
        ) {
          return false;
        }

        // Apply column visibility settings
        const visibilityMap =
          viewType === 'Report'
            ? reportVisibleColumns
            : templateVisibleColumns;

        if (
          col.key &&
          col.key in visibilityMap
        ) {
          return visibilityMap[col.key];
        }

        return true;
      }
    );

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <section className="mt-6 w-full rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">
            Report & Template Management
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            View and download the latest versions of all generated reports.
          </p>
        </div>


        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            {totalReportsCount}{' '}
            {viewType === 'Report' ? 'Reports' : 'Templates'}
          </div>

          <div className="flex items-center gap-3">
            <Checkbox
              checked={showLatestOnly}
              onChange={(e) => setShowLatestOnly(e.target.checked)}
            >
              <span className="text-sm font-medium text-slate-700">
                Show Latest Only
              </span>
            </Checkbox>

            <Button
              size="small"
              onClick={() => setColumnVisibilityModalOpen(true)}
            >
              Column Settings
            </Button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4">
        <Input
          allowClear
          prefix={
            <Search
              size={16}
            />
          }
          placeholder={
            viewType ===
              'Template'
              ? 'Search by module or template...'
              : 'Search by module or report...'
          }
          value={
            searchText
          }
          onChange={(e) =>
            setSearchText(
              e.target.value
            )
          }
          className="min-w-[280px] flex-1"
        />

        <Select
          value={
            selectedModule
          }
          onChange={
            setSelectedModule
          }
          className="w-[170px]"
        >
          <Select.Option value="ALL">
            All Modules
          </Select.Option>

          {moduleOptions.map(
            (module) => (
              <Select.Option
                key={
                  module
                }
                value={
                  module
                }
              >
                {
                  module
                }
              </Select.Option>
            )
          )}
        </Select>

        {viewType ===
          'Template' && (
            <Select
              value={
                selectedTemplate
              }
              onChange={
                setSelectedTemplate
              }
              className="w-[170px]"
            >
              <Select.Option value="ALL">
                All Templates
              </Select.Option>

              {templateOptions.map(
                (
                  template
                ) => (
                  <Select.Option
                    key={
                      template
                    }
                    value={
                      template
                    }
                  >
                    {
                      template
                    }
                  </Select.Option>
                )
              )}
            </Select>
          )}

        <Select
          value={
            selectedLot
          }
          onChange={
            setSelectedLot
          }
          className="w-[140px]"
        >
          <Select.Option value="ALL">
            All Lots
          </Select.Option>

          {getLotNumbers.map(
            (lot) => (
              <Select.Option
                key={
                  lot
                }
                value={
                  lot
                }
              >
                Lot {lot}
              </Select.Option>
            )
          )}
        </Select>

        <Button
          type="primary"
          onClick={
            handleDownloadAll
          }
          loading={
            bulkDownloading
          }
          disabled={
            bulkDownloading ||
            filteredReports.length ===
            0
          }
          icon={
            <Download
              size={15}
            />
          }
        >
          {
            bulkDownloading
              ? 'Downloading...'
              : 'Download All'
          }
        </Button>


        <div className="flex rounded-lg border border-slate-200 bg-white p-1 ml-2">
          <Button
            type={
              viewType ===
                'Report'
                ? 'primary'
                : 'default'
            }
            onClick={() =>
              handleTypeChange(
                'Report'
              )
            }
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Reports
          </Button>

          <Button
            type={
              viewType ===
                'Template'
                ? 'primary'
                : 'default'
            }
            onClick={() =>
              handleTypeChange(
                'Template'
              )
            }
            className="rounded-md px-4 py-2 text-sm font-medium"
          >
            Templates
          </Button>
        </div>
      </div>

      {/* Column Visibility Modal */}
      <Modal
        title={`Column Settings - ${viewType} View`}
        open={columnVisibilityModalOpen}
        onCancel={() => setColumnVisibilityModalOpen(false)}
        width={400}
        footer={
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            {/* Left side */}
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={handleSelectAll}>
                Select All
              </Button>

              <Button onClick={handleDeselectAll}>
                Deselect All
              </Button>
            </div>

            {/* Right side */}
            <div style={{ display: "flex", gap: 8 }}>
              <Button onClick={() => setColumnVisibilityModalOpen(false)}>
                Cancel
              </Button>

              <Button
                type="primary"
                onClick={() => setColumnVisibilityModalOpen(false)}
              >
                OK
              </Button>
            </div>
          </div>
        }
      >

        <div className="space-y-3">
          {viewType === 'Report' ? (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Select columns to display:</p>
              {Object.entries(reportVisibleColumns).map(([key, isVisible]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer mb-2">
                  <Checkbox
                    checked={isVisible}
                    onChange={(e) =>
                      setReportVisibleColumns((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    disabled={key === 'action'}
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {key === 'lot' ? 'Lot Number' : key === 'generatedOn' ? 'Generated On' : key === 'generatedBy' ? 'Generated By' : key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-slate-700 mb-3">Select columns to display:</p>
              {Object.entries(templateVisibleColumns).map(([key, isVisible]) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer mb-2">
                  <Checkbox
                    checked={isVisible}
                    onChange={(e) =>
                      setTemplateVisibleColumns((prev) => ({
                        ...prev,
                        [key]: e.target.checked,
                      }))
                    }
                    disabled={key === 'action'}
                  />
                  <span className="text-sm text-slate-700 capitalize">
                    {key === 'lot' ? 'Lot Number' : key === 'templateName' ? 'Template Name' : key === 'envLot' ? 'Batch' : key === 'generatedOn' ? 'Generated On' : key === 'generatedBy' ? 'Generated By' : key === 'downloadedBy' ? 'Last Downloaded By' : key === 'downloadedAt' ? 'Last Downloaded At' : key.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                </label>
              ))}
            </div>
          )}
        </div>
      </Modal>

      <div className="p-4">
        <Table
          key={`report-template-table-${viewType}-page-${viewType === 'Report' ? reportPage : templatePage}`}
          rowKey={(record) => `${viewType}-${record.key}`}
          columns={
            activeColumns
          }
          dataSource={
            paginatedReports
          }
          scroll={{
            x: 1200,
          }}
          pagination={{
            current:
              viewType === 'Report'
                ? reportPage
                : templatePage,

            pageSize:
              viewType === 'Report'
                ? reportPageSize
                : templatePageSize,

            total:
              filteredReports.length,

            showSizeChanger: true,

            pageSizeOptions: [
              '10',
              '20',
              '50',
              '100',
            ],

            onChange: (
              page,
              size
            ) => {
              if (
                viewType === 'Report'
              ) {
                setReportPage(page);
                setReportPageSize(size);
              } else {
                setTemplatePage(page);
                setTemplatePageSize(size);
              }
            },

            showTotal: (
              total,
              range
            ) =>
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
                  No{' '}
                  {
                    viewType ===
                      'Report'
                      ? 'reports'
                      : 'templates'
                  }{' '}
                  found
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