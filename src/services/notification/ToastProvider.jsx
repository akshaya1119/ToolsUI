import React, { createContext, useCallback } from 'react';
import { X } from 'lucide-react';
import { useMessageStore } from '../../stores/useMessageStore';
import i18n from '../../i18n';

export const ToastContext = createContext();

export const translateToastMessage = (rawMsg) => {
  if (typeof rawMsg !== 'string') return rawMsg;
  const trimmed = rawMsg.trim();

  // Direct lookup in active i18n resources
  if (i18n.exists(trimmed)) {
    return i18n.t(trimmed);
  }

  const lookup = {
    'Upload failed': 'common.feedback.uploadFailed',
    'Upload failed.': 'common.feedback.uploadFailed',
    'Upload successful': 'common.feedback.uploadSuccess',
    'Confirm Deletion': 'common.feedback.confirmDeletion',
    'Confirmation Required': 'common.feedback.confirmDeletion',
    'Are you sure you want to delete NR data for this project?': 'common.feedback.deleteNRDataConfirm',
    'Yes, Delete': 'common.feedback.yesDelete',
    'Yes': 'popconfirm.yes',
    'No': 'popconfirm.no',
    'Cancel': 'common.feedback.cancel',
    'Confirm': 'common.feedback.success',
    'Failed to fetch templates.': 'common.feedback.failedToFetchTemplates',
    'Failed to load mapping.': 'common.feedback.failedToLoadMapping',
    'Failed to save mapping.': 'common.feedback.failedToSaveMapping',
    'Failed to import templates. Please try again.': 'common.feedback.failedToImport',
    'Failed to update template.': 'common.feedback.failedToUpdateTemplate',
    'Failed to remove template.': 'common.feedback.failedToRemoveTemplate',
    'Failed to download template.': 'common.feedback.failedToDownloadTemplate',
    'Catch No is required': 'validation.catchNoRequired',
    'Capacity is required': 'validation.capacityRequired',
    'Name is required': 'validation.nameRequired',
    'Role Name is required': 'validation.roleNameRequired',
    'Template name is required': 'validation.templateNameRequired',
    'Template name is required.': 'validation.templateNameRequired',
    'Group is required': 'validation.groupRequired',
    'Type is required': 'validation.typeRequired',
    'Project, and at least one User is required': 'validation.projectRequired',
    'Please complete project configuration first': 'validation.projectRequired',
    'Saved successfully': 'common.feedback.saveSuccess',
    'Saved successfully!': 'common.feedback.saveSuccess',
    'Updated successfully': 'common.feedback.updateSuccess',
    'Updated successfully!': 'common.feedback.updateSuccess',
    'Added successfully': 'common.feedback.addSuccess',
    'Added successfully!': 'common.feedback.addSuccess',
    'Deleted successfully': 'common.feedback.deleteSuccess',
    'Deleted successfully!': 'common.feedback.deleteSuccess',
    'Operation completed successfully.': 'common.feedback.success',
    'Operation failed': 'common.feedback.operationFailed',
    'Save failed': 'common.feedback.saveFailed',
    'Update failed': 'common.feedback.updateFailed',
    'Delete failed': 'common.feedback.deleteFailed',
    'Failed to fetch': 'common.feedback.fetchFailed',
    'Failed to fetch box capacities': 'common.feedback.fetchFailed',
    'Failed to fetch envelope types': 'common.feedback.fetchFailed',
    'Failed to fetch fields': 'common.feedback.fetchFailed',
    'Failed to fetch modules': 'common.feedback.fetchFailed',
    'Failed to fetch extras.': 'common.feedback.fetchFailed',
    'Please fill all fields': 'common.feedback.fillRequired',
    'Please fill all required fields': 'common.feedback.fillRequired',
    'Project archived': 'common.feedback.projectArchived',
    'Project unarchived': 'common.feedback.projectUnarchived'
  };

  const matchedKey = lookup[trimmed];
  if (matchedKey && i18n.exists(matchedKey)) {
    return i18n.t(matchedKey);
  }

  // Dynamic pattern matching for: "X is required"
  if (trimmed.endsWith(" is required")) {
    const field = trimmed.replace(" is required", "");
    return i18n.language?.startsWith('hi') ? `${field} आवश्यक है` : trimmed;
  }

  // Dynamic pattern matching for: "Please fill mandatory fields: ..."
  if (trimmed.startsWith("Please fill mandatory fields: ")) {
    const fields = trimmed.replace("Please fill mandatory fields: ", "");
    return i18n.language?.startsWith('hi') ? `कृपया अनिवार्य फ़ील्ड भरें: ${fields}` : trimmed;
  }

  // Dynamic pattern matching for lot dispatched
  if (trimmed.includes("has already been dispatched and cannot be modified")) {
    return i18n.language?.startsWith('hi') ? "यह लॉट पहले ही भेजा जा चुका है और इसे संशोधित नहीं किया जा सकता है" : trimmed;
  }

  // Fallback check: if it starts with "Failed to"
  if (trimmed.toLowerCase().startsWith('failed to fetch')) {
    return i18n.t('common.feedback.fetchFailed');
  }

  return rawMsg;
};

export const ToastProvider = ({ children, position = 'top-right' }) => {
  const { messages, removeMessage, addMessage } = useMessageStore();

  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    const translatedMsg = translateToastMessage(message);
    addMessage({ message: translatedMsg, type, duration });
  }, [addMessage]);

  const positionClasses = {
    'top-right': 'top-14 right-4',
    'top-left': 'top-14 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const toasts = messages.filter((m) => !m.isPersistent);
  const confirms = messages.filter((m) => m.isPersistent);
  const activeConfirm = confirms[0];

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Background Blur Backdrop for Confirmations */}
      {activeConfirm && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/40 backdrop-blur-[2px] flex items-center justify-center p-4 animate-fade-in transition-all">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">
              {translateToastMessage(activeConfirm.title || "Confirmation")}
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              {translateToastMessage(activeConfirm.message)}
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => activeConfirm.resolve && activeConfirm.resolve(false)}
                className="px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
              >
                {translateToastMessage(activeConfirm.cancelText || "Cancel")}
              </button>
              <button
                type="button"
                onClick={() => activeConfirm.resolve && activeConfirm.resolve(true)}
                className={`px-4 py-2 text-sm font-medium rounded-lg text-white transition-colors ${
                  activeConfirm.type === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {translateToastMessage(activeConfirm.confirmText || "Confirm")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Standard Toasts (Corner) */}
      <div
        className={`fixed z-[9999] space-y-4 ${positionClasses[position] || 'top-4 right-4'} transition-all`}
      >
        {toasts.map((toast) => {
          const displayMsg = translateToastMessage(toast.message);
          return (
            <div
              key={toast.id}
              className={`
                w-80 max-w-sm p-5 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)] bg-white border border-slate-100 relative animate-slide-in border-l-4 overflow-hidden
                ${toast.type === 'success' ? 'border-l-green-500' :
                  toast.type === 'error' ? 'border-l-red-500' :
                  toast.type === 'warning' ? 'border-l-yellow-400' :
                  'border-l-blue-500'}
              `}
            >
              <div className="flex flex-col gap-3">
                <div className="flex justify-between items-start gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-bold text-slate-900 tracking-tight leading-snug">
                      {toast.title || (typeof displayMsg === 'string' ? displayMsg : '')}
                    </div>
                    {(toast.title || typeof displayMsg !== 'string') && (
                      <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
                        {displayMsg}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div
                className={`absolute bottom-0 left-0 h-1 opacity-40 animate-progress
                  ${toast.type === 'success' ? 'bg-green-500' :
                    toast.type === 'error' ? 'bg-red-500' :
                    toast.type === 'warning' ? 'bg-yellow-400' :
                    'bg-blue-500'}
                `}
                style={{ animationDuration: `${toast.duration}ms` }}
              ></div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
