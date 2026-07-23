import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../../hooks/useToast';

const InlineEditablePreviewCellHV = ({ record, fieldName, value, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => {
    setEditValue(value || '');
  }, [value]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const handleSave = async () => {
    if (editValue === value) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    setError(null);
    try {
      await onUpdate(fieldName, editValue);
      setIsEditing(false);
    } catch (err) {
      setError(err.message);
      setEditValue(value || '');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value || '');
    setError(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type="text"
            className="flex-1 px-3 py-1.5 text-sm border border-amber-400 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500/30 bg-amber-50"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSaving}
          />
          <button
            className="px-2 py-1 text-xs bg-amber-700 text-white rounded-md hover:bg-amber-800 disabled:opacity-50 transition-colors"
            onClick={handleSave}
            disabled={isSaving || editValue === value}
          >
            {isSaving ? '...' : 'Save'}
          </button>
          <button
            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-md hover:bg-gray-200 disabled:opacity-50 transition-colors"
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </button>
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-2 cursor-pointer px-2 py-1 rounded-md hover:bg-gray-50 transition-colors"
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
    >
      <span className="text-sm text-gray-800 font-medium">{value || '-'}</span>
      <span className="text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs">✏️</span>
    </div>
  );
};

export default InlineEditablePreviewCellHV;
