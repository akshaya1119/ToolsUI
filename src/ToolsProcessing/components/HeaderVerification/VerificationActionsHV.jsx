import React, { useState } from 'react';
import { CheckCircle2, AlertCircle } from 'lucide-react';
import { normalizeStatus } from './statusUtils';

const VerificationActionsHV = ({
  record,
  onStatusChange,
  loading
}) => {
  const [activeAction, setActiveAction] = useState(null);
  const currentStatus = normalizeStatus(record?.status);
  const verifiedActive = currentStatus === 1;
  const unclearActive = currentStatus === 2;

  const isDisabled = loading || activeAction !== null;

  const handleStatusAction = async (newStatus) => {
    setActiveAction(newStatus);

    try {
      await onStatusChange(newStatus);
    } finally {
      setActiveAction(null);
    }
  };

  return (
    <div className="flex items-center gap-2 pt-2">

      {/* EDIT */}
      <button
        type="button"
        onClick={() => handleStatusAction('edit')}
        disabled={isDisabled}
        className={`
          flex items-center gap-1.5
          px-4 py-2
          text-sm font-medium
          rounded-md border
          transition-all duration-200

          ${
            isDisabled
              ? `
                border-gray-200
                bg-gray-100
                text-gray-400
                cursor-not-allowed
                opacity-60
              `
              : `
                border-amber-400
                bg-amber-50
                text-amber-700
                hover:bg-amber-100
                hover:border-amber-500
                hover:shadow-sm
                cursor-pointer
              `
          }
        `}
        title="Edit this record"
      >
        ✏️ Edit
      </button>


      {/* VERIFIED */}
      <button
        type="button"
        onClick={() => handleStatusAction('Verified')}
        disabled={isDisabled}
        className={`
          flex items-center gap-1.5
          px-4 py-2
          text-sm font-medium
          rounded-md
          transition-all duration-200

          ${
            isDisabled
              ? `
                bg-green-100
                text-green-400
                cursor-not-allowed
                opacity-60
              `
              : verifiedActive
              ? `
                bg-green-700
                text-white
                shadow-lg
                ring-2 ring-green-600
                hover:bg-green-800
              `
              : `
                bg-green-500
                text-white
                hover:bg-green-600
                hover:shadow-md
                active:scale-95
                cursor-pointer
              `
          }
        `}
        title="Mark as Verified"
      >
        <CheckCircle2 className="w-4 h-4" />

        {activeAction === 'Verified' && loading
          ? 'Verifying...'
          : 'Verified'}
      </button>


      {/* UNCLEAR */}
      <button
        type="button"
        onClick={() => handleStatusAction('Unclear')}
        disabled={isDisabled}
        className={`
          flex items-center gap-1.5
          px-4 py-2
          text-sm font-medium
          rounded-md
          transition-all duration-200

          ${
            isDisabled
              ? `
                bg-orange-100
                text-orange-400
                cursor-not-allowed
                opacity-60
              `
              : unclearActive
              ? `
                bg-orange-700
                text-white
                shadow-lg
                ring-2 ring-orange-500
                hover:bg-orange-800
              `
              : `
                bg-orange-400
                text-white
                hover:bg-orange-500
                hover:shadow-md
                active:scale-95
                cursor-pointer
              `
          }
        `}
        title="Mark as Unclear"
      >
        <AlertCircle className="w-4 h-4" />

        {activeAction === 'Unclear' && loading
          ? 'Marking...'
          : 'Needs Review'}
      </button>

    </div>
  );
};

export default VerificationActionsHV;