import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Columns } from "lucide-react";

const COLUMN_LABELS = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D',
  remark: 'Remark',
  lotNo: 'Lot',
  date: 'Exam Date',
  time: 'Exam Time'
};

const SearchBarHV = ({
  globalSearch,
  onGlobalSearchChange,
  onResetFilters,
  totalRecords,
  filteredCount,
  lots = [],
  selectedLot,
  onLotChange,
  selectedStatus,
  onStatusChange,
  columnFilters,
  onColumnFilterChange,
  onDownload,
  visibleColumns = new Set(),
  toggleableColumns = [],
  onColumnToggle,
  tableSorter,
  isRole4 = false,
  userRoleId = null,
  showCorrection = null,
  isCorrectionFilter = false,
  onCorrectionFilterToggle,
  correctionCount = 0,
}) => {
  const [lotDropdownOpen, setLotDropdownOpen] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const lotRef = useRef(null);
  const colRef = useRef(null);

  const isRoleAuthorized = (userRoleId !== null && Number(userRoleId) <= 4 && Number(userRoleId) > 0) || isRole4;
  const canShowCorrection = showCorrection !== null 
    ? (showCorrection && (correctionCount > 0 || isCorrectionFilter))
    : (isRoleAuthorized && (correctionCount > 0 || isCorrectionFilter));

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (lotRef.current && !lotRef.current.contains(e.target)) setLotDropdownOpen(false);
      if (colRef.current && !colRef.current.contains(e.target)) setColMenuOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const uniqueLots = ["All Lots", ...new Set(lots)];

  return (
    <div className="flex items-center gap-3">
      {/* Search Input */}
      <div className="flex-1 max-w-xs relative flex items-center gap-2">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          className="w-full pl-10 pr-4 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder:text-gray-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all"
          placeholder="Quick search..."
          value={globalSearch}
          onChange={(e) => onGlobalSearchChange(e.target.value)}
        />
        {/* Reset button - enabled when any filter/search/lot/status/column filter/sorting/correction is active */}
        {(() => {
          const isResetEnabled = !!(
            globalSearch ||
            selectedLot ||
            (selectedStatus && selectedStatus !== 'ALL') ||
            Object.values(columnFilters || {}).some((v) => !!v) ||
            (tableSorter && tableSorter.field) ||
            isCorrectionFilter
          );
          return (
            <button
              onClick={() => onResetFilters?.()}
              disabled={!isResetEnabled}
              className={`ml-2 px-3 py-1.5 rounded-lg text-sm border ${
                isResetEnabled
                  ? 'bg-white hover:bg-gray-50 border-gray-300 text-gray-700'
                  : 'opacity-60 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
              }`}
              title="Reset filters"
            >
              Reset
            </button>
          );
        })()}
      </div>

      {/* Correction Filter Button - Red color theme with blinking attention dot & count badge */}
      {canShowCorrection && (
        <button
          onClick={() => onCorrectionFilterToggle?.()}
          className={`relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-xs select-none ${
            isCorrectionFilter
              ? 'bg-red-600 hover:bg-red-700 text-white border border-red-700 shadow-md ring-2 ring-red-300/80'
              : 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-300 hover:border-red-400'
          }`}
          title={isCorrectionFilter ? "Showing only catches with remarks (Click to show all)" : "Filter catches with remarks (clears all other filters)"}
        >
          {/* Blinking attention dot */}
          <span className="relative flex h-2 w-2">
            <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              isCorrectionFilter ? 'bg-white' : (correctionCount > 0 ? 'bg-red-500' : 'bg-red-400')
            }`} />
            <span className={`relative inline-flex rounded-full h-2 w-2 ${
              isCorrectionFilter ? 'bg-white' : (correctionCount > 0 ? 'bg-red-600' : 'bg-red-500')
            }`} />
          </span>

          <span>Correction</span>

          {/* Backend Unique Catches Count Badge */}
          <span className={`inline-flex items-center justify-center px-2 py-0.2 text-xs font-bold rounded-full min-w-[20px] transition-colors ${
            isCorrectionFilter
              ? 'bg-white text-red-700 shadow-xs'
              : (correctionCount > 0 ? 'bg-red-600 text-white shadow-xs' : 'bg-red-200 text-red-800')
          }`}>
            {correctionCount}
          </span>
        </button>
      )}

      {/* Column toggle */}
      <div className="relative" ref={colRef}>
        <button
          onClick={() => setColMenuOpen(!colMenuOpen)}
          className="flex items-center gap-1.5 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-600 hover:border-gray-400 transition-colors"
          title="Show/hide columns"
        >
          <Columns className="w-4 h-4" />
          Columns
        </button>
        {colMenuOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-2 min-w-[160px]">
            {toggleableColumns.map((col) => (
              <label
                key={col}
                className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer select-none"
              >
                <input
                  type="checkbox"
                  checked={visibleColumns.has(col)}
                  onChange={() => onColumnToggle?.(col)}
                  className="accent-amber-500"
                />
                {COLUMN_LABELS[col] || col}
              </label>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default SearchBarHV;
