import React, { createContext, useCallback } from 'react';
import { X } from 'lucide-react';
import { useMessageStore } from '../../stores/useMessageStore';

export const ToastContext = createContext();

export const ToastProvider = ({ children, position = 'top-right' }) => {
  const { messages, removeMessage, addMessage } = useMessageStore();

  // Maintain the showToast API for existing components
  const showToast = useCallback((message, type = 'info', duration = 4000) => {
    addMessage({ message, type, duration });
  }, [addMessage]);

  const positionClasses = {
    'top-right': 'top-14 right-4',
    'top-left': 'top-14 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-left': 'bottom-4 left-4',
  };

  const toasts = messages.filter((m) => !m.isPersistent);
  const confirms = messages.filter((m) => m.isPersistent);
  const activeConfirm = confirms[0]; // Sequential: only one at a time

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}

      {/* Background Blur Backdrop for Confirmations */}
      {activeConfirm && (
        <div className="fixed inset-0 z-[9998] bg-slate-900/20 backdrop-blur-[2px] animate-fade-in transition-all" />
      )}

      {/* Standard Toasts (Corner) */}
      <div
        className={`fixed z-[9999] space-y-4 ${positionClasses[position] || 'top-4 right-4'} transition-all`}
      >
        {toasts.map((toast) => (
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
                    {toast.title || (typeof toast.message === 'string' ? toast.message : '')}
                  </div>
                  {(toast.title || typeof toast.message !== 'string') && (
                    <div className="text-xs font-medium text-slate-500 mt-1 leading-relaxed">
                      {toast.message}
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
        ))}
      </div>

      {/* Sequential Confirmation Modal (Centered) */}
      {activeConfirm && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4 pointer-events-auto overflow-hidden">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[4px] animate-fade-in" onClick={() => activeConfirm.resolve(false)} />
          <div
            className={`
              w-full max-w-lg p-8 rounded-[2rem] shadow-[0_25px_70px_-15px_rgba(0,0,0,0.4)] bg-white border border-slate-100 relative animate-scale-up border-t-[6px] overflow-hidden z-10
              ${activeConfirm.type === 'error' ? 'border-t-red-500' :
                activeConfirm.type === 'warning' ? 'border-t-yellow-400' :
                activeConfirm.type === 'info' ? 'border-t-blue-500' :
                'border-t-blue-600'}
            `}
          >
            <div className="flex flex-col gap-6">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1">
                  <div className="text-2xl font-black text-slate-900 tracking-tight leading-tight">
                    {activeConfirm.title || "Confirm Action"}
                  </div>
                  <div className="text-[14px] font-medium text-slate-600 mt-4 leading-relaxed max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                    {activeConfirm.message}
                  </div>
                </div>
                <button 
                  onClick={() => activeConfirm.resolve(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-all text-slate-400 hover:text-slate-600 hover:rotate-90"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex gap-4 mt-2">
                 <button
                  onClick={() => activeConfirm.resolve(false)}
                  className="flex-1 py-4 px-6 text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 bg-slate-50 hover:bg-slate-100 rounded-2xl border border-slate-200 transition-all active:scale-95"
                >
                  {activeConfirm.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={() => activeConfirm.resolve(true)}
                  className={`
                    flex-[2] py-4 px-6 text-[11px] font-black uppercase tracking-[0.2em] text-white rounded-2xl transition-all active:scale-95 shadow-xl
                    ${activeConfirm.type === 'error' ? 'bg-red-500 hover:bg-red-600 shadow-red-200/50' : 
                      activeConfirm.type === 'warning' ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-200/50' : 
                      'bg-blue-600 hover:bg-blue-700 shadow-blue-200/50'}
                  `}
                >
                  {activeConfirm.confirmText || 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Animations */}
      <style>
        {`
          @keyframes slide-in {
            from { opacity: 0; transform: translateX(20px); }
            to { opacity: 1; transform: translateX(0); }
          }
          .animate-slide-in {
            animation: slide-in 0.3s ease-out;
          }

          @keyframes fade-in {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .animate-fade-in {
            animation: fade-in 0.3s ease-out;
          }

          @keyframes scale-up {
            from { opacity: 0; transform: scale(0.95); }
            to { opacity: 1; transform: scale(1); }
          }
          .animate-scale-up {
            animation: scale-up 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }

          @keyframes progress {
            from { width: 100%; }
            to { width: 0%; }
          }
          .animate-progress {
            animation: progress linear forwards;
          }
        `}
      </style>
    </ToastContext.Provider>
  );
};
