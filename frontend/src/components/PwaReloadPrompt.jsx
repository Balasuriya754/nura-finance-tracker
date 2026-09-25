import React from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';
import { RefreshCw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const PwaReloadPrompt = () => {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered');
      // Periodically check for updates every 15 minutes while the app is open
      if (r) {
        setInterval(() => {
          r.update();
        }, 15 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.log('SW registration error', error);
    },
  });

  return (
    <AnimatePresence>
      {needRefresh && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.95 }}
          className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-[100] bg-slate-900 text-white p-4 rounded-lg shadow-2xl max-w-sm w-[calc(100%-2rem)] sm:w-auto flex flex-col sm:flex-row items-center gap-4 border border-slate-700"
        >
          <div className="flex-1 text-sm font-medium text-center sm:text-left">
            A new update is available!
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={() => updateServiceWorker(true)}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Update Now
            </button>
            <button
              onClick={() => setNeedRefresh(false)}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-md transition-colors flex items-center justify-center"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaReloadPrompt;
