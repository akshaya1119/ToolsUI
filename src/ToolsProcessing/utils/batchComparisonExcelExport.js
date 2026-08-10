import * as XLSX from 'xlsx-js-style';

/**
 * Parses and formats individual change values for Excel presentation
 */
export const formatChangeValueForExcel = (change, field) => {
  if (!change) return "—";

  if (field === 'Difference') {
    try {
      const data = typeof change.newValue === 'string' ? JSON.parse(change.newValue) : change.newValue;
      if (data && typeof data === 'object') {
        const targetQty = data.baseQty ?? data.baseNR ?? 0;
        const revised = data.revised ?? 0;
        const fulfilment = data.fulfilment || '';
        const remainingStr = data.remaining !== null && data.remaining !== undefined ? ` (Remaining: ${data.remaining})` : '';
        return `Enhanced Qty: ${targetQty} | Revised: ${revised} | ${fulfilment}${remainingStr}`;
      }
    } catch (e) {
      return change.newValue || "—";
    }
  }

  const prev = change.previousValue;
  const next = change.newValue;

  const hasPrev = prev !== null && prev !== undefined && prev !== "";
  const hasNext = next !== null && next !== undefined && next !== "";

  if (hasPrev && hasNext) {
    return `- ${prev} / + ${next}`;
  }
  if (hasNext) {
    return `+ ${next}`;
  }
  if (hasPrev) {
    return `- ${prev}`;
  }
  return "—";
};

/**
 * Categorizes raw comparison data into all tab groups
 */
export const categorizeComparisonRecords = (rawItems = []) => {
  const allData = (rawItems || []).map((item, index) => {
    let statuses = [];
    if (Array.isArray(item.statuses) && item.statuses.length > 0) {
      statuses = item.statuses;
    } else if (typeof item.status === 'string') {
      statuses = item.status.split(',').map(s => s.trim()).filter(Boolean);
    }
    if (statuses.length === 0) {
      statuses = ['Updated'];
    }

    const changesMap = (item.changes || []).reduce((acc, change) => {
      acc[change.field] = change;
      return acc;
    }, {});

    return {
      id: `${item.catchNo}-${item.centerCode}-${index}`,
      key: `${item.catchNo}-${item.centerCode}-${index}`,
      catchNo: item.catchNo != null ? String(item.catchNo) : '',
      centerCode: item.centerCode != null ? String(item.centerCode) : '',
      status: item.status || statuses.join(', '),
      statuses: statuses,
      changes: changesMap,
      rawChanges: item.changes || [],
      originalItem: item
    };
  });

  const hasStatus = (item, statusName) => {
    if (item.statuses && item.statuses.some(s => s.toLowerCase() === statusName.toLowerCase())) {
      return true;
    }
    if (typeof item.status === 'string' && item.status.toLowerCase().includes(statusName.toLowerCase())) {
      return true;
    }
    return false;
  };

  const isCentreQtyChanged = item =>
    hasStatus(item, "Centre Catch Quantity Changed") ||
    hasStatus(item, "Quantity Changed") ||
    Boolean(item.changes?.NRQuantity || item.changes?.nrQuantity);

  const isCenterCodeChanged = item =>
    hasStatus(item, "Center Code Changed") ||
    hasStatus(item, "Center Changed") ||
    Boolean(item.changes?.CenterCode || item.changes?.centerCode);

  const isNodalChanged = item =>
    hasStatus(item, "Nodal Changed") ||
    Boolean(item.changes?.NodalCode || item.changes?.nodalCode);

  const isAdded = item => hasStatus(item, "Centre Catch Added") || hasStatus(item, "Added");
  const isRemoved = item => hasStatus(item, "Centre Catch Removed") || hasStatus(item, "Removed");

  // Filter for All Changes: non-unique changes or Added / Removed
  const allChangesData = allData.filter(item => {
    const hasNonUniqueChanges = (item.rawChanges || []).some(
      change => !change.isUniqueField || (change.isUniqueField && !change.isConsistentCatchLevelChange)
    );
    const isAddedOrRemoved = isAdded(item) || isRemoved(item);
    return hasNonUniqueChanges || isAddedOrRemoved;
  });

  // Filter for Catch-Level Changes: grouped by catchNo
  const catchLevelMap = new Map();
  allData.forEach(item => {
    const hasCatchLevelChange = (item.rawChanges || []).some(
      change => change.isConsistentCatchLevelChange
    );
    if (hasCatchLevelChange) {
      if (!catchLevelMap.has(item.catchNo)) {
        catchLevelMap.set(item.catchNo, {
          id: item.catchNo,
          key: item.catchNo,
          catchNo: item.catchNo,
          centerCode: '',
          status: item.originalItem?.catchLevelStatus || 'Catch-Level Change',
          catchLevelRecommendation: item.originalItem?.catchLevelRecommendation,
          centers: [],
          centerCount: 0,
          changes: { ...item.changes },
          rawChanges: [...item.rawChanges],
          originalItem: item.originalItem
        });
      } else {
        const catchData = catchLevelMap.get(item.catchNo);
        Object.entries(item.changes).forEach(([field, change]) => {
          if (change.isConsistentCatchLevelChange && !catchData.changes[field]) {
            catchData.changes[field] = change;
            catchData.rawChanges.push(change);
          }
        });
        if (!catchData.catchLevelRecommendation && item.originalItem?.catchLevelRecommendation) {
          catchData.catchLevelRecommendation = item.originalItem.catchLevelRecommendation;
        }
      }
      const catchData = catchLevelMap.get(item.catchNo);
      if (item.centerCode && !catchData.centers.includes(item.centerCode)) {
        catchData.centers.push(item.centerCode);
        catchData.centerCount = catchData.centers.length;
      }
    }
  });
  const catchLevelData = Array.from(catchLevelMap.values());

  const addedData = allData.filter(isAdded);
  const removedData = allData.filter(isRemoved);
  const centreQtyData = allData.filter(isCentreQtyChanged);
  const nodalData = allData.filter(isNodalChanged);
  const centerCodeData = allData.filter(isCenterCodeChanged);
  const otherData = allData.filter(item => hasStatus(item, "Updated") && !isCentreQtyChanged(item) && !isCenterCodeChanged(item) && !isNodalChanged(item));

  return {
    allChangesData,
    catchLevelData,
    addedData,
    removedData,
    centreQtyData,
    nodalData,
    centerCodeData,
    otherData
  };
};

/**
 * Styling definitions for Excel headers and cells
 */
const headerStyle = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
  fill: { fgColor: { rgb: "1677FF" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "D9D9D9" } },
    bottom: { style: "thin", color: { rgb: "D9D9D9" } },
    left: { style: "thin", color: { rgb: "D9D9D9" } },
    right: { style: "thin", color: { rgb: "D9D9D9" } }
  }
};

const baseCellStyle = {
  font: { sz: 10, name: "Calibri" },
  alignment: { horizontal: "left", vertical: "center", wrapText: true },
  border: {
    top: { style: "thin", color: { rgb: "E8E8E8" } },
    bottom: { style: "thin", color: { rgb: "E8E8E8" } },
    left: { style: "thin", color: { rgb: "E8E8E8" } },
    right: { style: "thin", color: { rgb: "E8E8E8" } }
  }
};

const centerCellStyle = {
  ...baseCellStyle,
  alignment: { horizontal: "center", vertical: "center", wrapText: true }
};

const emptyCellStyle = {
  font: { italic: true, color: { rgb: "8C8C8C" }, sz: 10, name: "Calibri" },
  alignment: { horizontal: "center", vertical: "center" },
  border: {
    top: { style: "thin", color: { rgb: "E8E8E8" } },
    bottom: { style: "thin", color: { rgb: "E8E8E8" } },
    left: { style: "thin", color: { rgb: "E8E8E8" } },
    right: { style: "thin", color: { rgb: "E8E8E8" } }
  }
};

/**
 * Creates a styled Excel Worksheet for Catch-Level Changes
 */
const buildCatchLevelSheet = (data = [], catchLevelFields = []) => {
  const headers = [
    "Catch No",
    "Centers Affected",
    "Centers List",
    "Status",
    ...catchLevelFields.filter(f => f !== 'Record'),
    "Recommendation"
  ];

  const sheetData = [headers];

  if (data.length === 0) {
    sheetData.push(["No catch-level changes found", ...Array(headers.length - 1).fill("")]);
  } else {
    data.forEach(item => {
      let recommendation = item.catchLevelRecommendation
        || item.originalItem?.catchLevelRecommendation
        || (item.changes && Object.values(item.changes).filter(c => c.isConsistentCatchLevelChange).length > 0
          ? "Update " + Object.values(item.changes).filter(c => c.isConsistentCatchLevelChange).map(c => (c.field || '').replace(/([a-z])([A-Z])/g, '$1 $2')).join(' and ')
          : item.originalItem?.recommendation || "—");

      const row = [
        item.catchNo || "—",
        item.centerCount ? `${item.centerCount} centers` : "—",
        (item.centers && item.centers.length > 0) ? item.centers.join(", ") : "—",
        item.status || "Catch-Level Change",
        ...catchLevelFields.filter(f => f !== 'Record').map(field => {
          const change = item.changes?.[field];
          return formatChangeValueForExcel(change, field);
        }),
        recommendation
      ];
      sheetData.push(row);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Apply Styles
  for (let c = 0; c < headers.length; c++) {
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[headerAddr]) {
      ws[headerAddr].s = headerStyle;
    }
  }

  if (data.length === 0) {
    const emptyAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[emptyAddr]) {
      ws[emptyAddr].s = emptyCellStyle;
    }
    // Merge across all columns for empty notification
    ws['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }];
  } else {
    for (let r = 1; r <= data.length; r++) {
      for (let c = 0; c < headers.length; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        if (ws[cellAddr]) {
          // Center align for Catch No, Count, Status
          if (c === 0 || c === 1 || c === 3) {
            ws[cellAddr].s = centerCellStyle;
          } else {
            ws[cellAddr].s = baseCellStyle;
          }
        }
      }
    }
  }

  // Calculate Auto Column Widths
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    sheetData.forEach((row, rowIdx) => {
      if (rowIdx === 1 && data.length === 0) return;
      const val = row[colIdx] != null ? String(row[colIdx]) : "";
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 60) };
  });
  ws['!cols'] = colWidths;

  return ws;
};

/**
 * Creates a styled Excel Worksheet for Standard Changes (All Changes, Added, Removed, Centre Qty, etc.)
 */
const buildStandardSheet = (tabName, data = [], displayFields = []) => {
  const fields = displayFields.filter(f => f !== 'Record');
  const headers = [
    "Catch No",
    "Centre Code",
    "Status",
    ...fields,
    "Recommendation"
  ];

  const sheetData = [headers];

  if (data.length === 0) {
    sheetData.push([`No records found for ${tabName}`, ...Array(headers.length - 1).fill("")]);
  } else {
    data.forEach(item => {
      // Handle CenterCode change
      let centreCodeValue = item.centerCode || "—";
      const centerChange = item.changes?.CenterCode || item.changes?.centerCode;
      if (centerChange && centerChange.previousValue && centerChange.newValue) {
        centreCodeValue = `- ${centerChange.previousValue} / + ${centerChange.newValue}`;
      }

      const row = [
        item.catchNo || "—",
        centreCodeValue,
        item.status || "—",
        ...fields.map(field => {
          const change = item.changes?.[field];
          return formatChangeValueForExcel(change, field);
        }),
        item.originalItem?.recommendation || "—"
      ];
      sheetData.push(row);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(sheetData);

  // Apply Styles
  for (let c = 0; c < headers.length; c++) {
    const headerAddr = XLSX.utils.encode_cell({ r: 0, c });
    if (ws[headerAddr]) {
      ws[headerAddr].s = headerStyle;
    }
  }

  if (data.length === 0) {
    const emptyAddr = XLSX.utils.encode_cell({ r: 1, c: 0 });
    if (ws[emptyAddr]) {
      ws[emptyAddr].s = emptyCellStyle;
    }
    // Merge across all columns for empty notification
    ws['!merges'] = [{ s: { r: 1, c: 0 }, e: { r: 1, c: headers.length - 1 } }];
  } else {
    for (let r = 1; r <= data.length; r++) {
      for (let c = 0; c < headers.length; c++) {
        const cellAddr = XLSX.utils.encode_cell({ r, c });
        if (ws[cellAddr]) {
          // Center align for Catch No, Status
          if (c === 0 || c === 2) {
            ws[cellAddr].s = centerCellStyle;
          } else {
            ws[cellAddr].s = baseCellStyle;
          }
        }
      }
    }
  }

  // Calculate Auto Column Widths
  const colWidths = headers.map((header, colIdx) => {
    let maxLen = header.length;
    sheetData.forEach((row, rowIdx) => {
      if (rowIdx === 1 && data.length === 0) return;
      const val = row[colIdx] != null ? String(row[colIdx]) : "";
      if (val.length > maxLen) {
        maxLen = val.length;
      }
    });
    return { wch: Math.min(Math.max(maxLen + 4, 14), 60) };
  });
  ws['!cols'] = colWidths;

  return ws;
};

/**
 * Main export function to generate and download the complete multi-sheet Excel file
 */
export const exportBatchComparisonExcel = ({
  rawItems = [],
  comparedBatch = null,
  lotNo = null,
  projectName = ""
}) => {
  const categorized = categorizeComparisonRecords(rawItems);

  // Extract non-unique and catch-level fields from dataset
  const uniqueFields = new Set();
  const nonUniqueFields = new Set();
  const catchLevelFields = new Set();

  rawItems.forEach(item => {
    (item.changes || []).forEach(change => {
      if (change.isConsistentCatchLevelChange) {
        catchLevelFields.add(change.field);
      } else if (change.isUniqueField) {
        uniqueFields.add(change.field);
      } else {
        nonUniqueFields.add(change.field);
      }
    });
  });

  const sortedNonUnique = Array.from(nonUniqueFields).sort((a, b) => a === 'Difference' ? 1 : b === 'Difference' ? -1 : 0);
  const sortedCatchLevel = Array.from(catchLevelFields).sort((a, b) => a === 'Difference' ? 1 : b === 'Difference' ? -1 : 0);

  // Ensure essential fields like NRQuantity, CenterCode, NodalCode, Difference appear if present in changes
  const displayFieldsToShow = sortedNonUnique.length > 0
    ? sortedNonUnique
    : ["NRQuantity", "CenterCode", "NodalCode", "Difference"];

  const catchLevelDisplayFields = sortedCatchLevel.length > 0
    ? sortedCatchLevel
    : ["SubjectName", "ExamDate"];

  const wb = XLSX.utils.book_new();

  // Tab definitions matching UI
  const tabSheets = [
    {
      name: "All Changes",
      data: categorized.allChangesData,
      type: "standard"
    },
    {
      name: "Catch-Level Changes",
      data: categorized.catchLevelData,
      type: "catchLevel"
    },
    {
      name: "Added",
      data: categorized.addedData,
      type: "standard"
    },
    {
      name: "Removed",
      data: categorized.removedData,
      type: "standard"
    },
    {
      name: "Centre Qty Changed",
      data: categorized.centreQtyData,
      type: "standard"
    },
    {
      name: "Nodal Change",
      data: categorized.nodalData,
      type: "standard"
    },
    {
      name: "Center Code Changed",
      data: categorized.centerCodeData,
      type: "standard"
    }
  ];

  // Only create sheets for tabs that have records (> 0)
  const sheetsToExport = tabSheets.filter(({ data }) => data && data.length > 0);

  if (sheetsToExport.length === 0) {
    const ws = buildStandardSheet("All Changes", [], displayFieldsToShow);
    XLSX.utils.book_append_sheet(wb, ws, "All Changes");
  } else {
    sheetsToExport.forEach(({ name, data, type }) => {
      let ws;
      if (type === "catchLevel") {
        ws = buildCatchLevelSheet(data, catchLevelDisplayFields);
      } else {
        ws = buildStandardSheet(name, data, displayFieldsToShow);
      }
      // Append sheet (ensure name length <= 31)
      XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 31));
    });
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const lotStr = lotNo && lotNo !== 0 ? `_Lot${lotNo}` : "";
  const batchStr = comparedBatch ? `_Batch${comparedBatch}` : "";
  const filename = `Changed_NR_Comparison${batchStr}${lotStr}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, filename, { bookType: "xlsx", cellStyles: true, compression: true });
};
