import React, { useState, useRef, useEffect } from 'react';
import { useToast } from '../../../hooks/useToast';

const InlineEditableCellHV = ({ record, fieldName, value, onUpdate }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || '');
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);
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
    try {
      await onUpdate(record.id, fieldName, editValue);
      setFeedback({ type: 'success', message: '✓' });
      setIsEditing(false);
      setTimeout(() => setFeedback(null), 2000);
    } catch (err) {
      setFeedback({ type: 'error', message: '✗' });
      setEditValue(value || '');
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditValue(value || '');
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') handleCancel();
  };

  if (isEditing) {
    return (
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          className="w-full px-1.5 py-0.5 text-sm border border-amber-400 rounded focus:outline-none focus:ring-1 focus:ring-amber-500 bg-amber-50"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleSave}
          disabled={isSaving}
        />
      </div>
    );
  }

  return (
    <div
      className="group flex items-center gap-1 cursor-pointer px-1 py-0.5 rounded hover:bg-gray-50 transition-colors relative"
      onClick={() => setIsEditing(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsEditing(true);
        }
      }}
      role="button"
      tabIndex={0}
      title="Click to edit"
    >
      <span className="text-sm text-gray-800">{value || '-'}</span>
      {feedback && (
        <span
          className={`text-xs font-medium ${
            feedback.type === 'success' ? 'text-green-500' : 'text-red-500'
          }`}
        >
          {feedback.message}
        </span>
      )}
    </div>
  );
};

export default InlineEditableCellHV;
