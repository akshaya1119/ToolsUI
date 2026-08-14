import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle, Circle } from 'lucide-react';
import { normalizeStatus } from './statusUtils';
import { getCurrentUserRoleId } from '../../../hooks/useUserMap';

const PrintPreviewHV = ({
  record: initialRecord,
  allRecords = [],
  onClose,
  onStatusChange,
  onFieldUpdate,
  currentUser,
  userMap = {},
}) => {
  const userRoleId = getCurrentUserRoleId();
  const canEditVerified = userRoleId !== null && Number(userRoleId) <= 4 && Number(userRoleId) > 0;

  const [record, setRecord] = useState(initialRecord);
  const [draftRecord, setDraftRecord] = useState(initialRecord);
  const [currentIndex, setCurrentIndex] = useState(
    initialRecord ? allRecords.findIndex(r => r.id === initialRecord.id) : 0
  );
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Helper function to get firstName from userId using userMap
  const getUserFirstName = (userId) => {
    return userMap[userId] || `User ${userId}`;
  };

  // Sync when parent selects a different record OR when allRecords changes
  useEffect(() => {
    if (!initialRecord) return;
    const idx = allRecords.findIndex(r => r.id === initialRecord.id);
    setCurrentIndex(idx >= 0 ? idx : 0);
    setIsEditing(false);
  }, [initialRecord?.id, allRecords]);

  const currentRecord = useMemo(() => {
    if (currentIndex >= 0 && currentIndex < allRecords.length) {
      return allRecords[currentIndex];
    }
    return record;
  }, [currentIndex, allRecords, record]);

  useEffect(() => {
    if (currentRecord) {
      setRecord(currentRecord);
      setDraftRecord(currentRecord);
    }
    setIsEditing(false);
  }, [currentRecord]);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0 && allRecords[currentIndex - 1]) {
      setCurrentIndex(currentIndex - 1);
      setRecord(allRecords[currentIndex - 1]);
    }
  }, [currentIndex, allRecords]);

  const handleNext = useCallback(() => {
    if (currentIndex < allRecords.length - 1 && allRecords[currentIndex + 1]) {
      setCurrentIndex(currentIndex + 1);
      setRecord(allRecords[currentIndex + 1]);
    }
  }, [currentIndex, allRecords]);

  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  const handleStatusChange = useCallback(async (newStatus) => {
    if (newStatus === 'edit') {
      // When entering edit mode, make sure draftRecord is initialized with current values
      if (currentRecord) {
        setDraftRecord({ ...currentRecord });
      }
      setIsEditing(!isEditing);
      return;
    }

    setLoading(true);
    try {
      if (!currentRecord) return;
      const updatedRecord = await onStatusChange(currentRecord.id, newStatus);
      if (updatedRecord) {
         setRecord(updatedRecord);
         setDraftRecord(updatedRecord);
      }
      if (newStatus === 'Verified' && currentIndex < allRecords.length - 1) {
        const nextIndex = currentIndex + 1;
        setCurrentIndex(nextIndex);
        const nextRecord = allRecords[nextIndex];
        setRecord(nextRecord);
        setDraftRecord(nextRecord);
      }
      setIsEditing(false);
    } catch (err) {
      console.error('Error updating status:', err);
      // Error message is already shown by parent's showToast in the onStatusChange handler
    } finally {
      setLoading(false);
    }
  }, [currentIndex, allRecords, currentRecord?.id, onStatusChange, isEditing, currentRecord]);

  // Enter key → Verified + auto-advance to next
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !isEditing && !loading) {
        e.preventDefault();
        // Calculate hasNoValidValues here inside the effect since it's outside render scope, or include it in dependencies
        const isInvalid = (val) => !val || String(val).trim() === '' || String(val).trim() === '-';
        const invalid = isInvalid(currentRecord?.a) && isInvalid(currentRecord?.b) && isInvalid(currentRecord?.c) && isInvalid(currentRecord?.d);
        if (!invalid) {
          handleStatusChange('Verified');
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditing, loading, handleStatusChange, currentRecord]);

  const handleCancelEdit = useCallback(() => {
    if (currentRecord) setDraftRecord(currentRecord);
    setIsEditing(false);
  }, [currentRecord]);

  const handleSaveEdit = useCallback(async () => {
    setLoading(true);
    try {
      const isVerified = normalizeStatus(currentRecord?.status) === 1 && !canEditVerified;
      const fields = isVerified ? ['remark'] : ['a', 'b', 'c', 'd', 'remark'];
      let hasChanges = false;
      
      // Check if any field actually changed
      for (const field of fields) {
        if (draftRecord?.[field] !== currentRecord?.[field]) {
          hasChanges = true;
          break;
        }
      }

      if (hasChanges) {
        // Pass draft field values as override so they all get updated in one call
        const overrideValues = {
          A: isVerified ? (currentRecord?.a || '') : (draftRecord?.a || ''),
          B: isVerified ? (currentRecord?.b || '') : (draftRecord?.b || ''),
          C: isVerified ? (currentRecord?.c || '') : (draftRecord?.c || ''),
          D: isVerified ? (currentRecord?.d || '') : (draftRecord?.d || ''),
          remark: draftRecord?.remark || '',
        };
        
        // Call onFieldUpdate with overrideValues parameter (3rd param) containing all fields
        // We use 'remark' or 'a' as the fieldName marker
        const updatedRecord = await onFieldUpdate(currentRecord?.id, isVerified ? 'remark' : 'a', draftRecord?.remark || '', overrideValues);
        if (updatedRecord) {
          setRecord(updatedRecord);
          setDraftRecord(updatedRecord);
        }
      }
      
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving record:', err);
      // Error message is already shown by parent's showToast in the onFieldUpdate handler
    } finally {
      setLoading(false);
    }
  }, [currentRecord, draftRecord, onFieldUpdate, canEditVerified]);

  const editableField = (label, fieldName, isLarge = false, placeholder = '') => {
    const isVerified = normalizeStatus(currentRecord?.status) === 1 && !canEditVerified;
    const canEdit = isEditing && (!isVerified || fieldName === 'remark');

    if (canEdit) {
      return (
        <input 
          key={`edit-${fieldName}-${currentRecord?.id}`}
          type="text"
          placeholder={placeholder}
          className="border-b border-gray-300 focus:outline-none focus:border-amber-500 text-center bg-gray-50 px-2 py-1"
          value={draftRecord?.[fieldName] ?? ''}
          onChange={(e) => {
            console.log(`[PrintPreviewHV] Editing ${fieldName}:`, e.target.value);
            setDraftRecord({ ...draftRecord, [fieldName]: e.target.value });
          }}
          disabled={loading}
          autoFocus={isVerified ? fieldName === 'remark' : fieldName === 'a'} // Auto focus remark if verified, otherwise first field
        />
      );
    }
    return <div className={`font-semibold ${isLarge ? 'text-lg' : ''}`}>{currentRecord?.[fieldName] || '-'}</div>;
  }

  const isInvalidValue = (val) => !val || String(val).trim() === '' || String(val).trim() === '-';
  const hasNoValidValues = isInvalidValue(currentRecord?.a) && isInvalidValue(currentRecord?.b) && isInvalidValue(currentRecord?.c) && isInvalidValue(currentRecord?.d);

  return (
    <div className="h-full min-h-0 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-gray-800">Print Preview</h2>
          <span className="text-xs text-gray-500">{currentIndex + 1} of {allRecords.length}</span>
        </div>
        <div className="flex items-center gap-2">
          {isEditing ? (
            // Edit mode - Show Save/Cancel buttons in header with same styling as action buttons
            <>
              <button
                onClick={handleSaveEdit}
                disabled={loading}
                className="flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 text-white bg-blue-500 hover:bg-blue-600 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Save changes
              </button>
              <button
                onClick={handleCancelEdit}
                disabled={loading}
                className="flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 text-gray-700 bg-gray-200 hover:bg-gray-300 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                Cancel
              </button>
            </>
          ) : (
            // Normal mode - Show Edit button with same styling as action buttons
            <button
              type="button"
              onClick={() => handleStatusChange('edit')}
              disabled={loading}
              className="flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200 whitespace-nowrap text-white bg-blue-500 hover:bg-blue-600 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Edit this record"
            >
              Edit
            </button>
          )}
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 min-h-0 overflow-y-auto p-5 bg-gray-50 flex flex-col">
        <div className="flex-1 min-h-full bg-white border border-gray-300 rounded-sm shadow-sm p-6 text-center flex flex-col">

          {/* Centered main content */}
          <div className="flex-1 flex flex-col items-center justify-center space-y-5 pt-8">
            <div className="text-sm font-bold text-gray-900">
              Catch No: <span className="text-lg font-bold text-gray-900">{currentRecord?.catchNo || '-'}</span>
            </div>
            {currentRecord?.envLotNo && currentRecord?.envLotNo !== '0' && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                Batch: {currentRecord?.envLotNo}
              </div>
            )}
            
            {/* Check if all ABCD fields are empty */}
            {hasNoValidValues && (
              <div className="w-full bg-red-50 border border-red-200 rounded-lg p-4 text-center">
                <p className="text-sm font-semibold text-red-700">
                  ⚠ At least one of A, B, C, or D is required if you want to verify this record
                </p>
              </div>
            )}
            
            <div className="text-lg font-bold">
               {editableField('Subject', 'a', true)}
            </div>
            <div className="text-md font-semibold text-gray-700">
               {editableField('Course', 'b')}
            </div>
            <div className="text-md font-semibold text-gray-700">
               {editableField('Code', 'c')}
            </div>
            <div className="text-md font-bold tracking-wider">
               {editableField('ID', 'd')}
            </div>
            <div className="text-sm text-gray-600 mt-2 flex items-center justify-center gap-1">
              <span className="font-semibold text-gray-500">Remark:</span>
              {editableField('Remark', 'remark', false, 'Enter remark...')}
            </div>
          </div>

          {/* Bottom section — always below content */}
          <div className="flex-shrink-0">
            <div className="flex justify-between items-center mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600 font-medium">
              <span>Exam Date: {currentRecord?.date}</span>
              <span>Exam Time: {currentRecord?.time}</span>
            </div>

            {/* Verification Info Section */}
            <div className="mt-4 flex items-center justify-center gap-2">
              {normalizeStatus(currentRecord?.status) === 1 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                </span>
              )}
              {normalizeStatus(currentRecord?.status) === 2 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-orange-100 text-orange-800">
                  <AlertCircle className="w-3.5 h-3.5" /> Needs Review
                </span>
              )}
              {normalizeStatus(currentRecord?.status) === 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                  <Circle className="w-3.5 h-3.5" /> Not Verified
                </span>
              )}
              {currentRecord?.verifiedBy && currentRecord?.verifiedBy !== 0 && currentRecord?.verifiedOn && (
                <span className="text-xs text-gray-500">by {getUserFirstName(currentRecord?.verifiedBy)} on {currentRecord?.verifiedOn}</span>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Action row — Needs Review | Verified (always show these buttons) */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white flex-shrink-0 gap-3">
        <button
          type="button"
          onClick={() => handleStatusChange('Unclear')}
          disabled={loading || (normalizeStatus(currentRecord?.status) === 1 && !canEditVerified) || hasNoValidValues}
          className={`flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
            ${loading || (normalizeStatus(currentRecord?.status) === 1 && !canEditVerified) || hasNoValidValues
              ? 'bg-orange-100 text-orange-400 cursor-not-allowed opacity-60'
              : normalizeStatus(currentRecord?.status) === 2
                ? 'bg-orange-100 text-orange-400 cursor-not-allowed opacity-60'
                : 'bg-orange-400 text-white hover:bg-orange-500 active:scale-95 cursor-pointer'
            }`}
          title={hasNoValidValues ? 'At least one of A, B, C, D is required' : (normalizeStatus(currentRecord?.status) === 1 && !canEditVerified) ? 'Cannot change verified records' : 'Mark as Needs Review'}
        >
          <AlertCircle className="w-3 h-3" />
          Needs Review
        </button>
        <button
          type="button"
          onClick={() => handleStatusChange('Verified')}
          disabled={loading || (normalizeStatus(currentRecord?.status) === 1 && !canEditVerified) || hasNoValidValues}
          className={`flex items-center justify-center gap-1 px-3 py-1 text-xs font-medium rounded-md transition-all duration-200
            ${loading || (normalizeStatus(currentRecord?.status) === 1 && !canEditVerified) || hasNoValidValues
              ? 'bg-green-100 text-green-400 cursor-not-allowed opacity-60'
              : 'bg-green-500 text-white hover:bg-green-600 active:scale-95 cursor-pointer'
            }`}
          title={hasNoValidValues ? 'At least one of A, B, C, D is required' : (normalizeStatus(currentRecord?.status) === 1 && !canEditVerified) ? 'Already verified' : 'Mark as Verified (or press Enter)'}
        >
          <CheckCircle2 className="w-3 h-3" />
          Verified
        </button>
      </div>

      {/* Footer nav — always fixed at bottom */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white flex-shrink-0">
        <button
          onClick={handlePrevious}
          disabled={currentIndex === 0 || loading}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>
        <span className="text-xs text-gray-400">{currentIndex + 1} of {allRecords.length}</span>
        <button
          onClick={handleNext}
          disabled={currentIndex === allRecords.length - 1 || loading}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default PrintPreviewHV;
