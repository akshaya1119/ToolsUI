import React from 'react';
import { FileEdit } from 'lucide-react';

const ActionsMenuHV = ({ record, onOpenPreview }) => {
  return (
    <div className="flex items-center justify-center">
      <button
        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
        onClick={() => onOpenPreview(record)}
        title="Open preview"
      >
        <FileEdit className="w-4 h-4" />
      </button>
    </div>
  );
};

export default ActionsMenuHV;
