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
          className="fixed bottom-6 right-6 z-[100] max-w-sm w-full sm:w-96 overflow-hidden rounded-2xl bg-slate-900/90 backdrop-blur-md shadow-2xl border border-slate-700/50 flex flex-col p-5"
        >
          {/* Glowing Accents */}
          <div className="absolute top-0 left-1/4 w-1/2 h-1 bg-emerald-500 rounded-b-full shadow-[0_0_15px_rgba(16,185,129,0.5)]"></div>
          
          <div className="flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-full flex-shrink-0">
              <RefreshCw className="w-6 h-6 text-emerald-400" />
            </div>
            <div className="flex-1 pt-1">
              <h4 className="text-white font-semibold text-sm mb-1">Update Available</h4>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                A new version of Finance Tracker is ready. Refresh to get the latest features and bug fixes.
              </p>
              
              <div className="flex items-center gap-3 w-full">
                <button
                  onClick={() => updateServiceWorker(true)}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white py-2 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(16,185,129,0.2)] hover:shadow-[0_0_20px_rgba(16,185,129,0.4)]"
                >
                  Update Now
                </button>
                <button
                  onClick={() => setNeedRefresh(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors text-xs font-semibold uppercase tracking-wider"
                >
                  Later
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PwaReloadPrompt;
