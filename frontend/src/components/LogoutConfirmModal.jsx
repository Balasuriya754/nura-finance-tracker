import React, { useState } from 'react';
import { LogOut } from 'lucide-react';

const LogoutConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsLoggingOut(true);
    // Simulate a brief delay to show the loader, then call onConfirm
    await new Promise((resolve) => setTimeout(resolve, 800));
    onConfirm();
    setIsLoggingOut(false); // Clean up though unmount usually happens
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-opacity animate-fade-in font-sans">
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl overflow-hidden transform transition-all">
        <div className="p-6 text-center">
          <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <LogOut className="w-8 h-8 text-red-600" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">Ready to Leave?</h3>
          <p className="text-slate-500 text-sm">
            Are you sure you want to log out of your account?
          </p>
        </div>
        
        <div className="bg-slate-50 px-6 py-4 flex gap-3">
          <button
            onClick={onClose}
            disabled={isLoggingOut}
            className="flex-1 py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-sm font-semibold text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoggingOut}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 bg-red-600 border border-transparent rounded-xl text-sm font-bold text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-600 focus:ring-offset-2 transition-colors disabled:opacity-70"
          >
            {isLoggingOut ? (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              'Log out'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LogoutConfirmModal;
