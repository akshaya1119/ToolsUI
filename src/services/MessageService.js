import { useMessageStore } from '../stores/useMessageStore';

/**
 * MessageService provides a global API for both Toasts (auto-dismiss) 
 * and Confirmations (persistent).
 */
export const MessageService = {
  /**
   * Simple non-blocking toast (matches existing showToast behavior)
   */
  toast: (message, type = 'info', duration = 4000) => {
    return useMessageStore.getState().addMessage({ message, type, duration });
  },

  /**
   * Persistent confirmation with buttons. Returns a Promise.
   */
  confirm: (message, options = {}) => {
    return useMessageStore.getState().showConfirm({
      title: 'Confirmation Required',
      message,
      type: 'confirm',
      confirmText: 'Confirm',
      cancelText: 'Cancel',
      ...options,
    });
  },

  success: (message) => MessageService.toast(message, 'success'),
  error: (message) => MessageService.toast(message, 'error'),
  warning: (message) => MessageService.toast(message, 'warning')
};
