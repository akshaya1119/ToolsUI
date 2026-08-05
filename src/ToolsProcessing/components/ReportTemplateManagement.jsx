import React, { useMemo, useState, useEffect } from 'react';
import {
  Input,
  Select,
  Tag,
  message,
  Button,
  Tooltip,
  Modal,
  Checkbox,
  Pagination,
} from 'antd';
import axios from 'axios';
import { Search, Download, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import { useUserMap, getFirstNameFromUserId, getCurrentUserId } from '../../hooks/useUserMap';

// ─── helpers ────────────────────────────────────────────────────────────────

const formatDateTimeToIST = (dateVal) => {
  if (!dateVal) return '-';
  try {
    let s = String(dateVal);
    if (!s.endsWith('Z') && !s.includes('+') && !s.match(/-\d{2}:\d{2}$/)) {
      if (s.includes(' ') && !s.includes('T')) s = s.replace(' ', 'T');
      s += 'Z';
    }
    const d = new Date(s);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata', day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true,
    });
  } catch { return '-'; }
};

const parseEnvLotNumbers = (v) => {
  if (Array.isArray(v)) return v;
  if (!v || v === '0' || v === 0) return [];
  if (typeof v === 'number') return v > 0 ? [v] : [];
  if (typeof v !== 'string') return [];
  return v.split(',').map((n) => parseInt(n.trim(), 10)).filter((n) => !isNaN(n) && n > 0);
};

const extractLotFromFilename = (name) => {
  if (!name || typeof name !== 'string') return null;
  const m = name.match(/_(\d+)\./);
  return m ? parseInt(m[1], 10) : null;
};

// Modules that produce reports (fixed set)
const MODULE_ORDER = [
  'Duplicate Tool',
  'Envelope Setup and Enhancement',
  'Extra Configuration',
  'Envelope Breaking',
  'Box Breaking',
];
const BOX_BREAKING_MODULE = 'box breaking';
const ENVELOPE_BREAKING_MODULE = 'envelope breaking';

// ─── component ───────────────────────────────────────────────────────────────

const ReportTemplateManagement = ({
  reports = [],
  onDownload,
  rptApiUrl,
  apiBaseUrl,
  projectId,
  envLotReports = [],
}) => {
  const { userMap } = useUserMap();

  // filters
  const [searchText, setSearchText]       = useState('');
  const [selectedModule, setSelectedModule] = useState('ALL');
  const [selectedTemplate, setSelectedTemplate] = useState('ALL');
  const [selectedLot, setSelectedLot]     = useState('ALL');
  const [viewType, setViewType]           = useState('Report');

  // pagination
  const [reportPage, setReportPage]               = useState(1);
  const [reportPageSize, setReportPageSize]       = useState(10);
  const [templatePage, setTemplatePage]           = useState(1);
  const [templatePageSize, setTemplatePageSize]   = useState(10);

  // expanded accordion keys (set of groupKey strings)
  const [expandedKeys, setExpandedKeys] = useState(new Set());

  // sorting: { field: string | null, dir: 'asc' | 'desc' | null }
  const [sortState, setSortState] = useState({ field: null, dir: null });

  // column visibility modal
  const [columnVisibilityModalOpen, setColumnVisibilityModalOpen] = useState(false);
  const [reportVisibleColumns, setReportVisibleColumns] = useState({
    module: true, lot: true, reportName: true, version: true,
    generated: true, status: false, action: true,
  });
  const [templateVisibleColumns, setTemplateVisibleColumns] = useState({
    module: true, templateName: true, subName: true, lot: true, envLot: true, version: true,
    generated: true, downloaded: true,
    status: false, action: true,
  });

  // shorthand visibility helpers — call as rvc('module'), tvc('lot'), etc.
  const rvc = (col) => reportVisibleColumns[col] !== false;
  const tvc = (col) => templateVisibleColumns[col] !== false;

  // misc
  const [bulkDownloading, setBulkDownloading] = useState(false);
  const [envLotCatches, setEnvLotCatches]     = useState({});
  const [envLotReportsLocal, setEnvLotReportsLocal] = useState([]);

  // ── helpers ──────────────────────────────────────────────────────────────

  const getCatchesForEnvLot = (no) => envLotCatches[no] || [];

  const handleSelectAllColumns = () => {
    if (viewType === 'Report') {
      setReportVisibleColumns(Object.fromEntries(Object.keys(reportVisibleColumns).map(k => [k, true])));
    } else {
      setTemplateVisibleColumns(Object.fromEntries(Object.keys(templateVisibleColumns).map(k => [k, true])));
    }
  };
  const handleDeselectAllColumns = () => {
    if (viewType === 'Report') {
      setReportVisibleColumns(Object.fromEntries(Object.keys(reportVisibleColumns).map(k => [k, k === 'action'])));
    } else {
      setTemplateVisibleColumns(Object.fromEntries(Object.keys(templateVisibleColumns).map(k => [k, k === 'action'])));
    }
  };

  // ── env lot lookups ───────────────────────────────────────────────────────

<<<<<<< HEAD
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
=======
  const envLotReportsLookup = useMemo(() => {
    const lookup = {};
    const data = envLotReportsLocal.length > 0 ? envLotReportsLocal : envLotReports;
    (data || []).forEach((r) => {
      const id = Number(r.templateId ?? r.TemplateId);
      if (!id) return;
      if (!lookup[id]) lookup[id] = { templateId: id, envLotNumbers: [], lotNumbers: [], reports: [] };
      lookup[id].envLotNumbers.push(...parseEnvLotNumbers(r.envLotNumbers ?? r.EnvLotNumbers));
      const lot = Number(r.lotNumber ?? r.lotNo ?? r.LotNo ?? 0);
      if (lot > 0) lookup[id].lotNumbers.push(lot);
      lookup[id].reports.push(r);
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
    });
    Object.values(lookup).forEach((item) => {
      item.envLotNumbers = [...new Set(item.envLotNumbers)];
      item.lotNumbers    = [...new Set(item.lotNumbers)];
    });
    return lookup;
  }, [envLotReports, envLotReportsLocal]);

  const envLotReportsByTemplate = useMemo(() => {
    const lookup = {};
<<<<<<< HEAD

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
=======
    const data = envLotReportsLocal.length > 0 ? envLotReportsLocal : envLotReports;
    (data || []).forEach((r) => {
      const id = Number(r.templateId ?? r.TemplateId);
      if (!id) return;
      if (!lookup[id]) lookup[id] = [];
      lookup[id].push(r);
    });
    return lookup;
  }, [envLotReports, envLotReportsLocal]);

  // ── API fetches ───────────────────────────────────────────────────────────

  useEffect(() => { fetchEnvLotReports(); }, [projectId, envLotReports]);
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c

  const fetchEnvLotReports = async () => {
    if (!projectId || !apiBaseUrl) return;
    try {
      const res = await axios.get(`${apiBaseUrl}/EnvelopeLotReports/ByProject/${projectId}`);
      setEnvLotReportsLocal(res.data || []);
    } catch (e) { console.error('Failed to fetch EnvLotReports:', e); }
  };

  useEffect(() => {
    if (projectId && apiBaseUrl) fetchEnvLotCatches();
  }, [projectId, apiBaseUrl]);

  const fetchEnvLotCatches = async () => {
    try {
      const res = await axios.get(`${apiBaseUrl}/NRDataLots/GetAssignedEnvLotCatches/${projectId}`);
      const lk = {};
      (res.data || []).forEach((item) => {
        const en = item.envLotNo ?? item.EnvLotNo;
        const cn = item.catchNo  ?? item.CatchNo;
        if (en && cn) {
          if (!lk[en]) lk[en] = [];
          if (!lk[en].includes(cn)) lk[en].push(cn);
        }
      });
      setEnvLotCatches(lk);
    } catch (e) { console.error('Failed to fetch env lot catches:', e); }
  };

  // ── view / filter helpers ─────────────────────────────────────────────────

  const handleTypeChange = (type) => {
    setViewType(type);
    setSelectedModule('ALL');
    setSelectedLot('ALL');
    setSearchText('');
    setExpandedKeys(new Set());
    if (type === 'Report') { setSelectedTemplate('ALL'); setReportPage(1); }
    else setTemplatePage(1);
    fetchEnvLotReports();
  };

  useEffect(() => {
    setExpandedKeys(new Set());
    setSortState({ field: null, dir: null });
    if (viewType === 'Report') setReportPage(1);
    else setTemplatePage(1);
  }, [searchText, selectedModule, selectedTemplate, selectedLot, viewType]);

  const moduleOptions = useMemo(() =>
    [...new Set(reports.filter(r => r.type === viewType).map(r => r.module).filter(Boolean))],
  [reports, viewType]);

  const templateOptions = useMemo(() =>
    [...new Set(reports.filter(r => r.type === viewType).map(r => r.templateName).filter(Boolean))],
  [reports, viewType]);

  const getLotNumbers = useMemo(() => {
    const lots = new Set();
    reports.forEach((r) => {
      if (r.type !== viewType) return;
      if (viewType === 'Template') {
<<<<<<< HEAD
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
=======
        const data = r.templateId ? envLotReportsLookup[Number(r.templateId)] : null;
        data?.lotNumbers?.forEach(l => lots.add(l));
      } else {
        const l = extractLotFromFilename(r.reportName || r.fileName);
        if (l) lots.add(l);
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
      }
    });
    return [...lots].sort((a, b) => a - b);
  }, [reports, viewType, envLotReportsLookup]);

<<<<<<< HEAD
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
=======
  // ══════════════════════════════════════════════════════════════════════════
  // ACCORDION GROUPS
  //
  // REPORT VIEW
  //   One group per module. All versions of that module's report are the rows.
  //   Exception: Box Breaking → one group per LOT (lot is encoded in filename).
  //
  // TEMPLATE VIEW
  //   One group per (templateId + lot) for box-breaking-dependent templates,
  //   one group per (templateId + batch/envLot) for envelope-breaking-dependent,
  //   one group per templateId for others.
  //   Within each group all DB rows (versions) are listed.
  // ══════════════════════════════════════════════════════════════════════════

  const accordionGroups = useMemo(() => {
    const search = searchText.trim().toLowerCase();

    // ── REPORT VIEW ─────────────────────────────────────────────────────────
    if (viewType === 'Report') {
      const filtered = reports
        .filter(r => r.type === 'Report')
        .filter(r => {
          const fileName = r.reportName || r.fileName || '';
          const lotNum   = extractLotFromFilename(fileName);
          if (search && !r.module?.toLowerCase().includes(search) && !r.reportName?.toLowerCase().includes(search)) return false;
          if (selectedModule !== 'ALL' && r.module !== selectedModule) return false;
          if (selectedLot !== 'ALL' && Number(lotNum) !== Number(selectedLot)) return false;
          return true;
        });
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c

      // Group: for box breaking use "module||lot", for others use "module"
      const groupMap = new Map();
      filtered.forEach(r => {
        const isBox   = r.module?.toLowerCase().includes(BOX_BREAKING_MODULE);
        const lotNum  = isBox ? extractLotFromFilename(r.reportName || r.fileName || '') : null;
        const groupKey = isBox && lotNum
          ? `${r.module}||lot-${lotNum}`
          : `${r.module}`;

<<<<<<< HEAD
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
=======
        if (!groupMap.has(groupKey)) groupMap.set(groupKey, { key: groupKey, module: r.module, lot: lotNum, rows: [] });
        groupMap.get(groupKey).rows.push(r);
      });

      // Sort rows within each group: highest version first
      const groups = [];
      groupMap.forEach((g) => {
        g.rows.sort((a, b) => {
          const av = Number(a.versions?.[0]?.version ?? 0);
          const bv = Number(b.versions?.[0]?.version ?? 0);
          return bv - av;
        });
        groups.push(g);
      });

      // Sort groups by MODULE_ORDER then by lot
      groups.sort((a, b) => {
        const ai = MODULE_ORDER.findIndex(m => a.module?.toLowerCase().includes(m.toLowerCase()));
        const bi = MODULE_ORDER.findIndex(m => b.module?.toLowerCase().includes(m.toLowerCase()));
        if (ai !== bi) return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
        return (a.lot || 0) - (b.lot || 0);
      });

      return groups;
    }

    // ── TEMPLATE VIEW ────────────────────────────────────────────────────────
    const filtered = reports.filter(r => r.type === 'Template').filter(r => {
      if (search && !r.module?.toLowerCase().includes(search) && !r.templateName?.toLowerCase().includes(search)) return false;
      if (selectedModule !== 'ALL' && r.module !== selectedModule) return false;
      if (selectedTemplate !== 'ALL' && r.templateName !== selectedTemplate) return false;
      return true;
    });

    const groupMap = new Map();

    filtered.forEach((r) => {
      const templateId   = Number(r.templateId ?? r.TemplateId ?? 0);
      const templateName = r.templateName || '-';
      const moduleLower  = (r.module || '').toLowerCase();
      const isBoxDep      = moduleLower.includes(BOX_BREAKING_MODULE);
      const isEnvDep      = moduleLower.includes(ENVELOPE_BREAKING_MODULE);

      // Get all DB records for this template
      const dbRows = envLotReportsByTemplate[templateId] || [];
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c

      if (dbRows.length === 0) {
        // No generated records — show a single placeholder group
        const gk = `tpl-${templateId}-none`;
        if (!groupMap.has(gk)) {
          groupMap.set(gk, {
            key: gk, module: r.module, templateId, templateName,
            subName: r.subName || r.SubName || null,
            lot: null, envLotNo: null,
            rows: [{ ...r, _dbRow: null }],
          });
        }
        return;
      }

<<<<<<< HEAD
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
=======
      if (isBoxDep) {
        // Group by lot number
        const lotGroups = {};
        dbRows.forEach((db) => {
          const lot = Number(db.lotNumber ?? db.lotNo ?? db.LotNo ?? 0) || 0;
          if (selectedLot !== 'ALL' && Number(selectedLot) !== lot) return;
          if (!lotGroups[lot]) lotGroups[lot] = [];
          lotGroups[lot].push(db);
        });
        Object.entries(lotGroups).forEach(([lot, dbs]) => {
          const gk = `tpl-${templateId}-lot-${lot}`;
          if (!groupMap.has(gk)) {
            groupMap.set(gk, { key: gk, module: r.module, templateId, templateName, subName: r.subName || r.SubName || null, lot: Number(lot), envLotNo: null, rows: [] });
          }
          // Each DB row = one version row; map to the report shape
          dbs.forEach((db, idx) => {
            groupMap.get(gk).rows.push({ ...r, _dbRow: db, _versionIdx: idx });
          });
        });
      } else if (isEnvDep) {
        // Group by envLotNo (batch)
        const batchGroups = {};
        dbRows.forEach((db) => {
          const envNums = parseEnvLotNumbers(db.envLotNumbers ?? db.EnvLotNumbers);
          const envNo   = envNums[0] ?? 0;
          if (!batchGroups[envNo]) batchGroups[envNo] = [];
          batchGroups[envNo].push(db);
        });
        Object.entries(batchGroups).forEach(([envNo, dbs]) => {
          const gk = `tpl-${templateId}-env-${envNo}`;
          if (!groupMap.has(gk)) {
            groupMap.set(gk, { key: gk, module: r.module, templateId, templateName, subName: r.subName || r.SubName || null, lot: null, envLotNo: Number(envNo), rows: [] });
          }
          dbs.forEach((db, idx) => {
            groupMap.get(gk).rows.push({ ...r, _dbRow: db, _versionIdx: idx });
          });
        });
      } else {
        // Plain template — one group per templateId
        const gk = `tpl-${templateId}`;
        if (!groupMap.has(gk)) {
          groupMap.set(gk, { key: gk, module: r.module, templateId, templateName, subName: r.subName || r.SubName || null, lot: null, envLotNo: null, rows: [] });
        }
        dbRows.forEach((db, idx) => {
          groupMap.get(gk).rows.push({ ...r, _dbRow: db, _versionIdx: idx });
        });
      }
    });

    // Sort rows within each group: newest first (by generatedAt)
    const groups = [];
    groupMap.forEach((g) => {
      g.rows.sort((a, b) =>
        new Date(b._dbRow?.generatedAt ?? b._dbRow?.GeneratedAt ?? 0) -
        new Date(a._dbRow?.generatedAt ?? a._dbRow?.GeneratedAt ?? 0)
      );
      groups.push(g);
    });

    // Default display order: Module name → Template name → Lot → Batch (envLotNo)
    groups.sort((a, b) => {
      const modCmp = (a.module || '').localeCompare(b.module || '', undefined, { sensitivity: 'base' });
      if (modCmp !== 0) return modCmp;
      const tplCmp = (a.templateName || '').localeCompare(b.templateName || '', undefined, { sensitivity: 'base' });
      if (tplCmp !== 0) return tplCmp;
      const lotCmp = (a.lot ?? 0) - (b.lot ?? 0);
      if (lotCmp !== 0) return lotCmp;
      return (a.envLotNo ?? 0) - (b.envLotNo ?? 0);
    });

    return groups;
  }, [reports, searchText, selectedModule, selectedTemplate, selectedLot, viewType, envLotReportsByTemplate, envLotReportsLookup]);

  // badge count = number of groups
  const totalReportsCount = accordionGroups.length;

  // sort helper — only module, lot, generatedOn are sortable
  const sortedGroups = useMemo(() => {
    const { field, dir } = sortState;
    if (!field || !dir) return accordionGroups;

    const sign = dir === 'asc' ? 1 : -1;
    return [...accordionGroups].sort((a, b) => {
      switch (field) {
        case 'module':
          return sign * (a.module || '').localeCompare(b.module || '', undefined, { sensitivity: 'base' });
        case 'lot':
          return sign * ((a.lot ?? 0) - (b.lot ?? 0));
        case 'generatedOn': {
          const ad = viewType === 'Report'
            ? new Date(a.rows[0]?.versions?.[0]?.generatedOn ?? 0)
            : new Date(a.rows[0]?._dbRow?.generatedAt ?? a.rows[0]?._dbRow?.GeneratedAt ?? 0);
          const bd = viewType === 'Report'
            ? new Date(b.rows[0]?.versions?.[0]?.generatedOn ?? 0)
            : new Date(b.rows[0]?._dbRow?.generatedAt ?? b.rows[0]?._dbRow?.GeneratedAt ?? 0);
          return sign * (ad - bd);
        }
        default: return 0;
      }
    });
  }, [accordionGroups, sortState, viewType]);

  // pagination over sorted groups
  const currentPage     = viewType === 'Report' ? reportPage : templatePage;
  const currentPageSize = viewType === 'Report' ? reportPageSize : templatePageSize;
  const paginatedGroups = useMemo(() => {
    const start = (currentPage - 1) * currentPageSize;
    return sortedGroups.slice(start, start + currentPageSize);
  }, [sortedGroups, currentPage, currentPageSize]);

  // ── accordion toggle ──────────────────────────────────────────────────────

  // Sort cycle: none → asc → desc → none
  const handleSort = (field) => {
    setSortState(prev => {
      if (prev.field !== field) return { field, dir: 'asc' };          // new field → asc
      if (prev.dir === 'asc')  return { field, dir: 'desc' };          // asc → desc
      return { field: null, dir: null };                                // desc → reset
    });
  };

  const SortIcon = ({ field }) => {
    const { field: activeField, dir } = sortState;
    if (activeField !== field) return <span className="rtm-sort-icon rtm-sort-icon--idle">⇅</span>;
    return <span className="rtm-sort-icon rtm-sort-icon--active">{dir === 'asc' ? '↑' : '↓'}</span>;
  };

  const toggleExpand = (key, hasMultiple) => {
    if (!hasMultiple) return;
    setExpandedKeys(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  // ── download handlers ─────────────────────────────────────────────────────

  // Download the latest (first) version of a report group
  const handleDownloadReport = async (group) => {
    const latestRow = group.rows[0];
    const version   = latestRow?.versions?.[0];
    if (!version?.fileUrl) { message.error('Download URL not available.'); return; }
    const link = document.createElement('a');
    link.href = version.fileUrl; link.download = latestRow.reportName || 'report'; link.target = '_blank';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    message.success('Download started.');
  };

  // Download a specific report version row
  const handleDownloadReportVersion = (versionObj, reportName) => {
    if (!versionObj?.fileUrl) { message.error('Download URL not available for this version.'); return; }
    const link = document.createElement('a');
    link.href = versionObj.fileUrl; link.download = reportName || 'report'; link.target = '_blank';
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
    message.success('Download started.');
  };

  // Download a template (uses rptApiUrl)
  const handleDownloadTemplate = async (group, dbRow) => {
    const templateId = group.templateId;
    const lotNumber  = dbRow
      ? Number(dbRow.lotNumber ?? dbRow.lotNo ?? dbRow.LotNo ?? 0) || 1
      : group.lot || 1;
    if (!templateId || !projectId) { message.error('Missing template download details.'); return; }
    try {
      const base = (rptApiUrl || import.meta.env.VITE_RPT_API_URL || '').replace(/\/api\/?$/i, '');
      if (!base) { message.error('RPT API URL not configured.'); return; }
      const ok = await axios.get(`${base}/api/report/generated-exists?templateId=${templateId}&projectId=${projectId}`);
      if (!ok.data?.exists && ok.data !== true) { message.error('No generated PDF found.'); return; }
      window.open(`${base}/api/report/generated-download?templateId=${templateId}&projectId=${projectId}&lotNumber=${lotNumber}`, '_blank');
      // track download
      const dbId = dbRow?.id ?? dbRow?.Id;
      if (dbId) {
        try {
          const uid = getCurrentUserId();
          await axios.put(`${apiBaseUrl}/EnvelopeLotReports/${dbId}/track-download`, { downloadedByUserId: uid, DownloadedByUserId: uid });
          await fetchEnvLotReports();
        } catch (e) { console.warn('Failed to track download:', e); }
      }
      message.success('Download started.');
    } catch (e) { console.error('Template download failed:', e); message.error('Failed to download.'); }
  };

  const handleDownloadAll = async () => {
    setBulkDownloading(true);
    try {
      if (viewType === 'Report') {
        const res = await axios.get(`${apiBaseUrl}/EnvelopeBreakages/Reports/DownloadAll`, { params: { projectId: Number(projectId) }, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([res.data], { type: res.headers['content-type'] || 'application/zip' }));
        const a = document.createElement('a'); a.href = url; a.download = `reports_${projectId}.zip`;
        document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
        message.success('Reports downloaded.');
        return;
      }
      const base = (rptApiUrl || import.meta.env.VITE_RPT_API_URL || '').replace(/\/api\/?$/i, '');
      if (!base) { message.error('RPT API URL not configured.'); return; }
      const items = [];
      for (const g of accordionGroups) {
        const dbRow = g.rows[0]?._dbRow;
        const lot   = Number(dbRow?.lotNumber ?? dbRow?.lotNo ?? dbRow?.LotNo ?? g.lot ?? 1) || 1;
        const exists = envLotReportsLocal.some(x => Number(x.templateId ?? x.TemplateId) === g.templateId && Number(x.lotNumber ?? x.lotNo) === lot);
        if (exists) items.push({ templateId: g.templateId, lotNumber: lot });
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
      }
      if (!items.length) { message.warning('No generated PDFs found.'); return; }
      const res = await axios.get(`${base}/api/report/generated-download-zip`, {
        params: { projectId: Number(projectId), templateIds: items.map(i => i.templateId).join(','), lotNumbers: items.map(i => i.lotNumber).join(',') },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/zip' }));
      const a = document.createElement('a'); a.href = url; a.download = `templates_${projectId}.zip`;
      document.body.appendChild(a); a.click(); a.remove(); window.URL.revokeObjectURL(url);
      message.success('Templates downloaded.');
    } catch (e) { console.error('Bulk download failed:', e); message.error('Failed to download files.'); }
    finally { setBulkDownloading(false); }
  };

  // ── render helpers ────────────────────────────────────────────────────────

  const renderStatus = (status) => {
    if (status === 'Latest')   return <Tag color="success">Latest</Tag>;
    if (status === 'Previous') return <Tag color="default">Previous</Tag>;
    return <Tag>{status || '-'}</Tag>;
  };

  const renderEnvLotTag = (envLotNo) => {
    if (!envLotNo) return <span style={{ color: '#94a3b8' }}>-</span>;
    const catches = getCatchesForEnvLot(envLotNo);
    const tip = (
      <div style={{ padding: 8, minWidth: 180 }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Batch {envLotNo} — Catches</div>
        {catches.length > 0
          ? catches.map((c, i) => <div key={i} style={{ fontSize: 12, padding: '2px 6px', background: '#f0f0f0', borderRadius: 3, marginBottom: 2 }}>{c}</div>)
          : <span style={{ color: '#999' }}>No catches assigned</span>}
      </div>
    );
    return (
      <Tooltip title={tip} color="#fff" overlayInnerStyle={{ color: '#333' }}>
        <Tag color="blue" style={{ cursor: 'pointer' }}>
          Batch {envLotNo}{catches.length > 0 && <span style={{ marginLeft: 4, fontSize: 11 }}>({catches.length})</span>}
        </Tag>
      </Tooltip>
    );
  };

  const resolveUserName = (userId, fallback) =>
    (userId ? getFirstNameFromUserId(userId, userMap) : null) || fallback || '-';

  // ── dynamic grid column string based on visibility ────────────────────────
  // Each visible column contributes its fr width; hidden ones are omitted so the
  // grid naturally collapses without leaving empty gaps.
  const reportGridCols = useMemo(() => {
    const cols = ['22px']; // icon always visible
    if (rvc('module'))      cols.push('1.3fr');
    if (rvc('lot'))         cols.push('0.6fr');
    if (rvc('reportName'))  cols.push('1.8fr');
    if (rvc('version'))     cols.push('0.65fr');
    if (rvc('generated'))   cols.push('1.6fr');
    if (rvc('status'))      cols.push('0.8fr');
    cols.push('0.9fr'); // action always visible
    return cols.join(' ');
  }, [reportVisibleColumns]);

  const templateGridCols = useMemo(() => {
    const cols = ['22px']; // icon always visible
    if (tvc('module'))       cols.push('1.1fr');
    if (tvc('lot'))          cols.push('0.55fr');
    if (tvc('envLot'))       cols.push('0.9fr');
    if (tvc('templateName')) cols.push('1.6fr');
    if (tvc('subName'))      cols.push('0.8fr');
    if (tvc('version'))      cols.push('0.6fr');
    if (tvc('generated'))    cols.push('1.5fr');
    if (tvc('downloaded'))   cols.push('1.5fr');
    if (tvc('status'))       cols.push('0.75fr');
    cols.push('0.85fr'); // action always visible
    return cols.join(' ');
  }, [templateVisibleColumns]);

  // ══════════════════════════════════════════════════════════════════════════
  // ACCORDION ROW (header + optional expanded body)
  // ══════════════════════════════════════════════════════════════════════════

  const renderGroup = (group) => {
    const isReport    = viewType === 'Report';
    const hasMultiple = group.rows.length > 1;
    const isExpanded  = expandedKeys.has(group.key);
    const vc          = isReport ? rvc : tvc;
    const gridCols    = isReport ? reportGridCols : templateGridCols;

    // ── derive header data from the "latest" (first) row ──
    let headerData = {};

    if (isReport) {
      const latestRow = group.rows[0];
      const v = latestRow?.versions?.[0];
      headerData = {
        module:      group.module || '-',
        lot:         group.lot != null ? `Lot ${group.lot}` : '-',
        name:        latestRow?.reportName || '-',
        version:     v?.version ?? '-',
        generatedOn: v?.generatedOn,
        generatedBy: resolveUserName(v?.generatedByUserId || latestRow?.generatedByUserId, v?.generatedBy || latestRow?.generatedBy),
        status:      v?.status,
        onDownload:  () => handleDownloadReport(group),
        canDownload: !!v?.fileUrl,
      };
    } else {
      const latestDb = group.rows[0]?._dbRow;
      const envNums  = parseEnvLotNumbers(latestDb?.envLotNumbers ?? latestDb?.EnvLotNumbers);
      headerData = {
        module:       group.module || '-',
        lot:          group.lot != null ? `Lot ${group.lot}` : '-',
        envLotNo:     group.envLotNo ?? (envNums[0] || null),
        name:         group.templateName || '-',
        subName:      group.subName || null,
        version:      latestDb?.version ?? latestDb?.Version ?? '-',
        generatedOn:  latestDb?.generatedAt ?? latestDb?.GeneratedAt,
        generatedBy:  resolveUserName(latestDb?.generatedByUserId ?? latestDb?.GeneratedByUserId, latestDb?.generatedBy ?? latestDb?.GeneratedBy),
        downloadedBy: resolveUserName(latestDb?.downloadedByUserId ?? latestDb?.DownloadedByUserId, latestDb?.downloadedBy ?? latestDb?.DownloadedBy),
        downloadedAt: latestDb?.downloadedAt ?? latestDb?.DownloadedAt,
        status:       'Latest',
        onDownload:   () => handleDownloadTemplate(group, latestDb),
        canDownload:  true,
      };
    }

    return (
      <div
        key={group.key}
        className={`rtm-group ${isExpanded ? 'rtm-group--open' : ''} ${!hasMultiple ? 'rtm-group--single' : ''}`}
        data-view={isReport ? 'report' : 'template'}
        onClick={() => toggleExpand(group.key, hasMultiple)}
      >
        {/* ── header row ── */}
        <div className="rtm-row rtm-row--header" style={{ gridTemplateColumns: gridCols }}>
          {/* expand icon — always shown */}
          <div className="rtm-cell rtm-cell--icon">
            {hasMultiple
              ? isExpanded ? <ChevronDown size={15} className="rtm-chevron" /> : <ChevronRight size={15} className="rtm-chevron" />
              : <span style={{ width: 15, display: 'inline-block' }} />}
          </div>

          {vc('module') && (
            <div className="rtm-cell rtm-cell--module">
              <span className="rtm-label">Module</span>
              <span className="rtm-val rtm-val--bold">{headerData.module}</span>
            </div>
          )}

<<<<<<< HEAD
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
=======
          {isReport ? (
            vc('lot') && (
              <div className="rtm-cell rtm-cell--lot">
                <span className="rtm-label">Lot</span>
                <span className="rtm-val">{headerData.lot}</span>
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
              </div>
            )
          ) : (
            <>
              {tvc('lot') && (
                <div className="rtm-cell rtm-cell--lot">
                  <span className="rtm-label">Lot</span>
                  <span className="rtm-val">{headerData.lot}</span>
                </div>
              )}
              {tvc('envLot') && (
                <div className="rtm-cell rtm-cell--batch">
                  <span className="rtm-label">Batch</span>
                  <span className="rtm-val">{renderEnvLotTag(headerData.envLotNo)}</span>
                </div>
              )}
            </>
          )}

          {/* report / template name */}
          {vc(isReport ? 'reportName' : 'templateName') && (
            <div className="rtm-cell rtm-cell--name">
              <span className="rtm-label">{isReport ? 'Report' : 'Template'}</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0 }}>
                <FileText size={13} style={{ color: '#3b82f6', flexShrink: 0 }} />
                <span className="rtm-val rtm-val--name" title={headerData.name}>{headerData.name}</span>
              </div>
            </div>
          )}

<<<<<<< HEAD
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
=======
          {/* sub name — template only */}
          {!isReport && tvc('subName') && (
            <div className="rtm-cell rtm-cell--subname">
              <span className="rtm-label">Sub Name</span>
              <span className="rtm-val rtm-val--muted">{headerData.subName || '-'}</span>
            </div>
          )}

          {vc('version') && (
            <div className="rtm-cell rtm-cell--ver">
              <span className="rtm-label">Version</span>
              <span className="rtm-version-pill">{headerData.version}</span>
            </div>
          )}

          {vc('generated') && (
            <div className="rtm-cell rtm-cell--gen">
              <span className="rtm-label">Generated</span>
              <span className="rtm-val rtm-val--muted" style={{ fontSize: 12 }}>
                {formatDateTimeToIST(headerData.generatedOn)}
              </span>
              <span className="rtm-val" style={{ fontSize: 12, color: '#475569' }}>
                {headerData.generatedBy}
              </span>
            </div>
          )}

          {!isReport && tvc('downloaded') && (
            <div className="rtm-cell rtm-cell--dl">
              <span className="rtm-label">Downloaded</span>
              {headerData.downloadedBy && headerData.downloadedBy !== '-' ? (
                <>
                  <span className="rtm-val rtm-val--muted" style={{ fontSize: 12 }}>
                    {formatDateTimeToIST(headerData.downloadedAt)}
                  </span>
                  <span className="rtm-val" style={{ fontSize: 12, color: '#475569' }}>
                    {headerData.downloadedBy}
                  </span>
                </>
              ) : (
                <span style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>-</span>
              )}
            </div>
          )}

          {vc('status') && (
            <div className="rtm-cell rtm-cell--status">
              <span className="rtm-label">Status</span>
              {renderStatus(headerData.status)}
            </div>
          )}

          {/* action — always shown */}
          <div className="rtm-cell rtm-cell--action" onClick={e => e.stopPropagation()}>
            <Button
              type="primary" size="small"
              icon={<Download size={13} />}
              disabled={!headerData.canDownload}
              onClick={(e) => { e.stopPropagation(); headerData.onDownload(); }}
            >
              Download
            </Button>
          </div>
        </div>

        {/* ── expanded version history ── */}
        {hasMultiple && isExpanded && (
          <div className="rtm-versions" onClick={e => e.stopPropagation()}>
            <div className="rtm-versions-label">All Versions ({group.rows.length})</div>
            <div className="rtm-versions-scroll">
              <table className="rtm-vtable">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Version</th>
                    {isReport && rvc('reportName') && <th>Report File</th>}
                    {!isReport && tvc('templateName') && <th>Template</th>}
                    {!isReport && tvc('subName') && <th>Sub Name</th>}
                    {!isReport && tvc('lot') && <th>Lot</th>}
                    {!isReport && tvc('envLot') && <th>Batch</th>}
                    {vc('generated') && <th>Generated</th>}
                    {!isReport && tvc('downloaded') && <th>Downloaded</th>}
                    {vc('status') && <th>Status</th>}
                    <th style={{ textAlign: 'right' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {group.rows.map((row, idx) => {
                    if (isReport) {
                      const v   = row.versions?.[0];
                      const ver = v?.version ?? '-';
                      return (
                        <tr key={idx} className={idx === 0 ? 'rtm-vrow--latest' : ''}>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                          <td><span className="rtm-version-pill">{ver}</span></td>
                          {rvc('reportName') && (
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <FileText size={12} style={{ color: '#64748b' }} />
                                <span className="rtm-fname">{row.reportName || '-'}</span>
                              </div>
                            </td>
                          )}
                          {rvc('generated') && (
                            <td>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{formatDateTimeToIST(v?.generatedOn)}</div>
                              <div style={{ fontSize: 12, color: '#334155' }}>{resolveUserName(v?.generatedByUserId, v?.generatedBy)}</div>
                            </td>
                          )}
                          {rvc('status') && <td>{renderStatus(v?.status)}</td>}
                          <td style={{ textAlign: 'right' }}>
                            <Button size="small" icon={<Download size={12} />}
                              disabled={!v?.fileUrl}
                              onClick={() => handleDownloadReportVersion(v, row.reportName)}>
                              Download
                            </Button>
                          </td>
                        </tr>
                      );
                    } else {
                      const db      = row._dbRow;
                      const ver     = db?.version ?? db?.Version ?? '-';
                      const lot     = Number(db?.lotNumber ?? db?.lotNo ?? db?.LotNo ?? group.lot ?? 0) || null;
                      const envNums = parseEnvLotNumbers(db?.envLotNumbers ?? db?.EnvLotNumbers);
                      const envNo   = envNums[0] ?? group.envLotNo ?? null;
                      const dlBy    = resolveUserName(db?.downloadedByUserId ?? db?.DownloadedByUserId, db?.downloadedBy ?? db?.DownloadedBy);
                      const dlAt    = db?.downloadedAt ?? db?.DownloadedAt;
                      return (
                        <tr key={idx} className={idx === 0 ? 'rtm-vrow--latest' : ''}>
                          <td style={{ color: '#94a3b8', fontSize: 12 }}>{idx + 1}</td>
                          <td><span className="rtm-version-pill">{ver}</span></td>
                          {tvc('templateName') && (
                            <td>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <FileText size={12} style={{ color: '#64748b' }} />
                                <span className="rtm-fname">{group.templateName || '-'}</span>
                              </div>
                            </td>
                          )}
                          {tvc('subName') && <td style={{ color: '#64748b', fontSize: 12 }}>{group.subName || '-'}</td>}
                          {tvc('lot') && <td>{lot ? `Lot ${lot}` : '-'}</td>}
                          {tvc('envLot') && <td>{renderEnvLotTag(envNo)}</td>}
                          {tvc('generated') && (
                            <td>
                              <div style={{ fontSize: 12, color: '#64748b' }}>{formatDateTimeToIST(db?.generatedAt ?? db?.GeneratedAt)}</div>
                              <div style={{ fontSize: 12, color: '#334155' }}>{resolveUserName(db?.generatedByUserId ?? db?.GeneratedByUserId, db?.generatedBy ?? db?.GeneratedBy)}</div>
                            </td>
                          )}
                          {tvc('downloaded') && (
                            <td>
                              {dlBy && dlBy !== '-' ? (
                                <>
                                  <div style={{ fontSize: 12, color: '#64748b' }}>{formatDateTimeToIST(dlAt)}</div>
                                  <div style={{ fontSize: 12, color: '#334155' }}>{dlBy}</div>
                                </>
                              ) : (
                                <span style={{ color: '#94a3b8', fontSize: 11, fontStyle: 'italic' }}>Not downloaded</span>
                              )}
                            </td>
                          )}
                          {tvc('status') && <td>{idx === 0 ? <Tag color="success">Latest</Tag> : <Tag>Previous</Tag>}</td>}
                          <td style={{ textAlign: 'right' }}>
                            <Button size="small" icon={<Download size={12} />}
                              onClick={() => handleDownloadTemplate(group, db)}>
                              Download
                            </Button>
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            </div>
          </div>
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
        )}
      </div>
    );
  };

  // ── RENDER ────────────────────────────────────────────────────────────────

<<<<<<< HEAD
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
=======
  const isReport = viewType === 'Report';
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c

  return (
    <section className="mt-6 w-full rounded-xl border border-slate-200 bg-white shadow-sm">

      {/* card header */}
      <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-slate-800">Report &amp; Template Management</h2>
          <p className="mt-1 text-sm text-slate-500">Click any row to expand and view all versions.</p>
        </div>
<<<<<<< HEAD


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
=======
        <div className="flex flex-col items-end gap-2">
          <div className="rounded-full bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700">
            {totalReportsCount} {isReport ? 'Reports' : 'Templates'}
          </div>
          <Button size="small" onClick={() => setColumnVisibilityModalOpen(true)}>Column Settings</Button>
        </div>
      </div>

      {/* filter bar */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-slate-50/50 px-6 py-4 flex-wrap">
        <Input allowClear prefix={<Search size={16} />}
          placeholder={isReport ? 'Search by module or report...' : 'Search by module or template...'}
          value={searchText} onChange={e => setSearchText(e.target.value)}
          className="min-w-[280px] flex-1" />
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c

        <Select value={selectedModule} onChange={setSelectedModule} className="w-[170px]">
          <Select.Option value="ALL">All Modules</Select.Option>
          {moduleOptions.map(m => <Select.Option key={m} value={m}>{m}</Select.Option>)}
        </Select>

<<<<<<< HEAD
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
=======
        {!isReport && (
          <Select value={selectedTemplate} onChange={setSelectedTemplate} className="w-[170px]">
            <Select.Option value="ALL">All Templates</Select.Option>
            {templateOptions.map(t => <Select.Option key={t} value={t}>{t}</Select.Option>)}
          </Select>
        )}
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c

        <Select value={selectedLot} onChange={setSelectedLot} className="w-[140px]">
          <Select.Option value="ALL">All Lots</Select.Option>
          {getLotNumbers.map(l => <Select.Option key={l} value={l}>Lot {l}</Select.Option>)}
        </Select>

<<<<<<< HEAD
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
=======
        <Button type="primary" loading={bulkDownloading} disabled={bulkDownloading || accordionGroups.length === 0}
          icon={<Download size={15} />} onClick={handleDownloadAll}>
          {bulkDownloading ? 'Downloading...' : 'Download All'}
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
        </Button>

        <div className="flex rounded-lg border border-slate-200 bg-white p-1 ml-2">
<<<<<<< HEAD
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
=======
          <Button type={isReport ? 'primary' : 'default'} onClick={() => handleTypeChange('Report')} className="rounded-md px-4 py-2 text-sm font-medium">Reports</Button>
          <Button type={!isReport ? 'primary' : 'default'} onClick={() => handleTypeChange('Template')} className="rounded-md px-4 py-2 text-sm font-medium">Templates</Button>
        </div>
      </div>

      {/* column visibility modal */}
      <Modal title={`Column Settings — ${viewType} View`} open={columnVisibilityModalOpen}
        onCancel={() => setColumnVisibilityModalOpen(false)} width={400}
        footer={
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={handleSelectAllColumns}>Select All</Button>
              <Button onClick={handleDeselectAllColumns}>Deselect All</Button>
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Button onClick={() => setColumnVisibilityModalOpen(false)}>Cancel</Button>
              <Button type="primary" onClick={() => setColumnVisibilityModalOpen(false)}>OK</Button>
            </div>
          </div>
        }
      >
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700 mb-3">Select columns to display:</p>
          {Object.entries(isReport ? reportVisibleColumns : templateVisibleColumns).map(([key, val]) => {
            const labels = {
              module: 'Module', lot: 'Lot', reportName: 'Report', templateName: 'Template Name',
              subName: 'Sub Name', envLot: 'Batch', version: 'Version',
              generated: 'Generated (By + On)', downloaded: 'Downloaded (By + At)',
              status: 'Status', action: 'Action',
            };
            return (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <Checkbox checked={val} disabled={key === 'action'}
                  onChange={e => isReport
                    ? setReportVisibleColumns(p => ({ ...p, [key]: e.target.checked }))
                    : setTemplateVisibleColumns(p => ({ ...p, [key]: e.target.checked }))} />
                <span className="text-sm text-slate-700">{labels[key] || key}</span>
              </label>
            );
          })}
        </div>
      </Modal>

      {/* list */}
      <div className="p-4">
<<<<<<< HEAD
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
=======
        {accordionGroups.length === 0 ? (
          <div className="py-10 text-center">
            <FileText size={22} className="mx-auto mb-3 text-slate-400" />
            <p className="text-sm font-medium text-slate-600">No {isReport ? 'reports' : 'templates'} found</p>
            <p className="mt-1 text-xs text-slate-400">Try changing your filters.</p>
          </div>
        ) : (
          <>
            {/* column labels — module, lot, generatedOn are sortable */}
            <div className="rtm-col-header" style={{ gridTemplateColumns: isReport ? reportGridCols : templateGridCols }}>
              <span />
              {(isReport ? rvc('module') : tvc('module')) && (
                <span className="rtm-col-sortable" onClick={() => handleSort('module')}>Module <SortIcon field="module" /></span>
              )}
              {isReport
                ? rvc('lot') && <span className="rtm-col-sortable" onClick={() => handleSort('lot')}>Lot <SortIcon field="lot" /></span>
                : <>
                    {tvc('lot') && <span className="rtm-col-sortable" onClick={() => handleSort('lot')}>Lot <SortIcon field="lot" /></span>}
                    {tvc('envLot') && <span>Batch</span>}
                  </>
              }
              {(isReport ? rvc('reportName') : tvc('templateName')) && <span>{isReport ? 'Report' : 'Template'}</span>}
              {!isReport && tvc('subName') && <span>Sub Name</span>}
              {(isReport ? rvc('version') : tvc('version')) && <span>Version</span>}
              {(isReport ? rvc('generated') : tvc('generated')) && (
                <span className="rtm-col-sortable" onClick={() => handleSort('generatedOn')}>Generated <SortIcon field="generatedOn" /></span>
              )}
              {!isReport && tvc('downloaded') && <span>Downloaded</span>}
              {(isReport ? rvc('status') : tvc('status')) && <span>Status</span>}
              <span>Action</span>
            </div>

            <div className="rtm-list">
              {paginatedGroups.map(g => renderGroup(g))}
            </div>

            {/* pagination */}
            <div className="rtm-pagination-bar">
              <span className="rtm-pagination-info">
                {Math.min((currentPage - 1) * currentPageSize + 1, accordionGroups.length)}–{Math.min(currentPage * currentPageSize, accordionGroups.length)} of {accordionGroups.length}
              </span>
              <Pagination
                current={currentPage} pageSize={currentPageSize} total={accordionGroups.length}
                showSizeChanger pageSizeOptions={['10', '20', '50', '100']} size="small"
                onChange={(page, size) => {
                  if (isReport) { setReportPage(page); setReportPageSize(size); }
                  else { setTemplatePage(page); setTemplatePageSize(size); }
                }}
              />
            </div>
          </>
        )}
>>>>>>> ddd5f3da442ff6d6a77954cb6eb570ce0cd2a63c
      </div>

      {/* scoped styles */}
      <style>{`
        /* ── sortable column headers ─────────────────────────────────────── */
        .rtm-col-sortable {
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          white-space: nowrap;
          transition: color 0.15s;
        }
        .rtm-col-sortable:hover { color: #475569; }
        .rtm-sort-icon { font-size: 10px; opacity: 0.5; }
        .rtm-sort-icon--active { opacity: 1; color: #3b82f6; font-weight: 700; }

        /* ── column label header ─────────────────────────────────────────── */
        .rtm-col-header {
          display: grid;
          gap: 0 10px;
          padding: 6px 16px 6px 10px;
          margin-bottom: 4px;
          font-size: 11px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* ── list container ──────────────────────────────────────────────── */
        .rtm-list {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        /* ── group (accordion item) ──────────────────────────────────────── */
        .rtm-group {
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          overflow: hidden;
          background: #fff;
          box-shadow: 0 1px 3px rgba(0,0,0,0.04);
          transition: box-shadow 0.15s, border-color 0.15s;
          cursor: pointer;
          user-select: none;
        }
        .rtm-group:hover {
          box-shadow: 0 3px 8px rgba(0,0,0,0.09);
        }
        .rtm-group--open {
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59,130,246,0.12);
        }
        .rtm-group--single {
          cursor: default;
        }

        /* ── header row ──────────────────────────────────────────────────── */
        .rtm-row--header {
          display: grid;
          gap: 0 10px;
          padding: 13px 16px 13px 10px;
          align-items: center;
          /* grid-template-columns is set via inline style per row */
        }

        .rtm-cell {
          display: flex;
          flex-direction: column;
          gap: 1px;
          min-width: 0;
        }
        .rtm-cell--action { align-items: flex-end; }
        .rtm-cell--icon   { justify-content: center; align-items: center; }

        .rtm-label {
          font-size: 10px;
          font-weight: 600;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          display: none;
        }
        .rtm-val {
          font-size: 13px;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .rtm-val--bold  { font-weight: 600; color: #1e293b; }
        .rtm-val--muted { color: #64748b; font-size: 12px; }
        .rtm-val--name  { font-weight: 500; }

        .rtm-version-pill {
          display: inline-block;
          font-size: 11px;
          font-weight: 700;
          color: #3b82f6;
          background: #eff6ff;
          border: 1px solid #bfdbfe;
          border-radius: 5px;
          padding: 1px 7px;
          white-space: nowrap;
        }

        .rtm-chevron { color: #64748b; flex-shrink: 0; }

        /* ── version history table ───────────────────────────────────────── */
        .rtm-versions {
          border-top: 1px solid #f1f5f9;
          background: #f8fafc;
          padding: 14px 18px 18px;
          cursor: default;
        }
        .rtm-versions-label {
          font-size: 11px;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 10px;
        }
        .rtm-versions-scroll {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #e2e8f0;
        }
        .rtm-vtable {
          width: 100%;
          border-collapse: collapse;
          font-size: 13px;
        }
        .rtm-vtable th {
          background: #f8fafc;
          color: #64748b;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          padding: 8px 12px;
          border-bottom: 1px solid #e2e8f0;
          white-space: nowrap;
          text-align: left;
        }
        .rtm-vtable td {
          padding: 9px 12px;
          color: #334155;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
          white-space: nowrap;
        }
        .rtm-vtable tr:last-child td { border-bottom: none; }
        .rtm-vrow--latest td { background: #f0fdf4; }
        .rtm-fname {
          max-width: 200px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          display: inline-block;
          vertical-align: middle;
        }

        /* ── pagination ──────────────────────────────────────────────────── */
        .rtm-pagination-bar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-top: 14px;
          padding: 0 2px;
        }
        .rtm-pagination-info { font-size: 13px; color: #64748b; }

        /* ── responsive ──────────────────────────────────────────────────── */
        @media (max-width: 900px) {
          .rtm-col-header { display: none; }
          .rtm-group .rtm-row--header,
          .rtm-group[data-view="template"] .rtm-row--header {
            grid-template-columns: 22px 1fr 1fr;
            row-gap: 8px;
          }
          .rtm-label { display: block; }
        }
        @media (max-width: 560px) {
          .rtm-group .rtm-row--header,
          .rtm-group[data-view="template"] .rtm-row--header {
            grid-template-columns: 22px 1fr;
          }
        }
      `}</style>
    </section>
  );
};

export default ReportTemplateManagement;
