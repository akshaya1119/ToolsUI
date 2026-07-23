import React, { useState, useRef, useEffect } from "react";
import { Search, ChevronDown, Columns } from "lucide-react";

const COLUMN_LABELS = {
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
}) => {
  const [lotDropdownOpen, setLotDropdownOpen] = useState(false);
  const [colMenuOpen, setColMenuOpen] = useState(false);
  const lotRef = useRef(null);
  const colRef = useRef(null);

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
      {/* Lot Selector */}
      <div className="relative" ref={lotRef}>
        <button
          onClick={() => setLotDropdownOpen(!lotDropdownOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:border-gray-400 transition-colors min-w-[120px]"
        >
          <span className="text-gray-400">📋</span>
          <span>{selectedLot || "All Lots"}</span>
          <ChevronDown className="w-4 h-4 text-gray-400 ml-auto" />
        </button>
        {lotDropdownOpen && (
          <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-20 min-w-[160px] py-1 max-h-60 overflow-y-auto">
            {uniqueLots.map((lot) => (
              <button
                key={lot}
                onClick={() => {
                  onLotChange?.(lot === "All Lots" ? "" : lot);
                  setLotDropdownOpen(false);
                }}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  (lot === "All Lots" && !selectedLot) || lot === selectedLot
                    ? "bg-amber-50 text-amber-800 font-medium"
                    : "text-gray-700"
                }`}
              >
                {lot}
              </button>
            ))}
          </div>
        )}
      </div>

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
        {/* Reset button - enabled when any filter/search/lot/status/column filter/sorting is active */}
        {(() => {
          const isResetEnabled = !!(
            globalSearch ||
            selectedLot ||
            (selectedStatus && selectedStatus !== 'ALL') ||
            Object.values(columnFilters || {}).some((v) => !!v) ||
            (tableSorter && tableSorter.field)
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
