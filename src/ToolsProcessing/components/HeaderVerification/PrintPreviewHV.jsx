import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { normalizeStatus } from './statusUtils';

const PrintPreviewHV = ({
  record: initialRecord,
  allRecords = [],
  onClose,
  onStatusChange,
  onFieldUpdate,
  currentUser,
}) => {
  const [record, setRecord] = useState(initialRecord);
  const [draftRecord, setDraftRecord] = useState(initialRecord);
  const [currentIndex, setCurrentIndex] = useState(
    initialRecord ? allRecords.findIndex(r => r.id === initialRecord.id) : 0
  );
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

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
    } finally {
      setLoading(false);
    }
  }, [currentIndex, allRecords, currentRecord?.id, onStatusChange, isEditing]);

  // Enter key → Verified + auto-advance to next
  useEffect(() => {
    const onKeyDown = (e) => {
      if (e.key === 'Enter' && !isEditing && !loading) {
        e.preventDefault();
        handleStatusChange('Verified');
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isEditing, loading, handleStatusChange]);

  const handleCancelEdit = useCallback(() => {
    if (currentRecord) setDraftRecord(currentRecord);
    setIsEditing(false);
  }, [currentRecord]);

  const handleSaveEdit = useCallback(async () => {
    setLoading(true);
    try {
      const fields = ['a', 'b', 'c', 'd'];
      for (const field of fields) {
        if (draftRecord?.[field] !== currentRecord?.[field]) {
          await onFieldUpdate(currentRecord?.id, field, draftRecord?.[field]);
        }
      }
      if (draftRecord) setRecord(draftRecord);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving record:', err);
    } finally {
      setLoading(false);
    }
  }, [currentRecord, draftRecord, onFieldUpdate]);

  const editableField = (label, fieldName, isLarge = false) => {
    if (isEditing) {
      return (
        <input 
          type="text"
          className="border-b border-gray-300 focus:outline-none focus:border-amber-500 text-center bg-gray-50"
          value={draftRecord?.[fieldName] ?? ''}
          onChange={(e) => setDraftRecord({ ...draftRecord, [fieldName]: e.target.value })}
          disabled={loading}
        />
      );
    }
    return <div className={`font-semibold ${isLarge ? 'text-lg' : ''}`}>{currentRecord?.[fieldName] || '-'}</div>;
  }

  return (
    <div className="h-full min-h-0 flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-col">
          <h2 className="text-lg font-bold text-gray-800">Print Preview</h2>
          <span className="text-xs text-gray-500">{currentIndex + 1} of {allRecords.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleStatusChange('edit')}
            disabled={loading}
            className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md border transition-all duration-200
              ${loading
                ? 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed opacity-60'
                : 'border-amber-400 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-500 hover:shadow-sm cursor-pointer'
              }`}
            title="Edit this record"
          >
            ✏️ Edit
          </button>
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
          </div>

          {/* Bottom section — always below content */}
          <div className="flex-shrink-0">
            <div className="flex justify-between items-center mt-6 border-t border-gray-200 pt-4 text-sm text-gray-600 font-medium">
              <span>Exam Date: {currentRecord?.date}</span>
              <span>Exam Time: {currentRecord?.time}</span>
            </div>
            <div className="mt-4 flex justify-start items-center">
              {isEditing && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveEdit}
                    disabled={loading}
                    className="px-3 py-2 text-sm font-semibold text-white bg-amber-500 rounded-md hover:bg-amber-600 transition-colors disabled:opacity-50"
                  >
                    Save changes
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    disabled={loading}
                    className="px-3 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Action row — Unclear | Verified */}
      <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 bg-white flex-shrink-0 gap-3">
        <button
          type="button"
          onClick={() => handleStatusChange('Unclear')}
          disabled={loading || normalizeStatus(currentRecord?.status) === 2}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${loading || normalizeStatus(currentRecord?.status) === 2
              ? 'bg-orange-100 text-orange-400 cursor-not-allowed opacity-60'
              : normalizeStatus(currentRecord?.status) === 1
                ? 'bg-orange-400 text-white hover:bg-orange-500 active:scale-95 cursor-pointer'
                : 'bg-orange-400 text-white hover:bg-orange-500 active:scale-95 cursor-pointer'
            }`}
          title="Mark as Needs Review"
        >
          <AlertCircle className="w-4 h-4" />
          Needs Review
        </button>
        <button
          type="button"
          onClick={() => handleStatusChange('Verified')}
          disabled={loading || normalizeStatus(currentRecord?.status) === 1}
          className={`flex items-center justify-center gap-1.5 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200
            ${loading || normalizeStatus(currentRecord?.status) === 1
              ? 'bg-green-100 text-green-400 cursor-not-allowed opacity-60'
              : normalizeStatus(currentRecord?.status) === 2
                ? 'bg-green-500 text-white hover:bg-green-600 active:scale-95 cursor-pointer'
                : 'bg-green-500 text-white hover:bg-green-600 active:scale-95 cursor-pointer'
            }`}
          title="Mark as Verified (or press Enter)"
        >
          <CheckCircle2 className="w-4 h-4" />
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
