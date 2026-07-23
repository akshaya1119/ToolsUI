import React from 'react';

const StatusAuditTooltipHV = ({
  status,
  statusUpdatedBy,
  statusUpdatedAt,
  statusComment,
}) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="absolute left-0 top-full mt-1 z-30 w-64 bg-white border border-gray-200 rounded-lg shadow-xl p-3 text-sm">
      <div className="absolute -top-1.5 left-4 w-3 h-3 bg-white border-l border-t border-gray-200 rotate-45" />
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Status</span>
          <span className="font-medium text-gray-800 text-xs">{status}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Updated by</span>
          <span className="font-medium text-gray-800 text-xs">{statusUpdatedBy || 'N/A'}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-gray-500 text-xs">Updated on</span>
          <span className="font-medium text-gray-800 text-xs">{formatDate(statusUpdatedAt)}</span>
        </div>
        {statusComment && (
          <div className="pt-2 border-t border-gray-100">
            <span className="text-gray-500 text-xs">Comment</span>
            <p className="text-gray-700 text-xs mt-0.5">{statusComment}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusAuditTooltipHV;
