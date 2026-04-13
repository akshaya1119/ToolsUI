import { create } from 'zustand';

export const useMessageStore = create((set, get) => ({
  messages: [],

  addMessage: (messageObj) => {
    const id = messageObj.id || Math.random().toString(36).substring(2, 9);
    const newMessage = {
      id,
      type: 'info',
      duration: 4000,
      isPersistent: false,
      ...messageObj,
    };

    set((state) => ({
      messages: [...state.messages, newMessage],
    }));

    // Auto-dismiss if not persistent
    if (!newMessage.isPersistent) {
      setTimeout(() => {
        get().removeMessage(id);
      }, newMessage.duration);
    }

    return id;
  },

  removeMessage: (id) => {
    set((state) => ({
      messages: state.messages.filter((m) => m.id !== id),
    }));
  },

  // For Promise-based confirmations
  showConfirm: (options) => {
    const id = options.id || Date.now();
    return new Promise((resolve) => {
      get().addMessage({
        ...options,
        id,
        isPersistent: true,
        resolve: (result) => {
          resolve(result);
          get().removeMessage(id); // Use the same ID
        }
      });
    });
  }
}));
