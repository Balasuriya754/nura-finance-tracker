import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Download, FileSpreadsheet, Archive } from 'lucide-react';
import api from '../services/api';

const ExportModal = ({ isOpen, onClose, token }) => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [expenseType, setExpenseType] = useState('general'); // 'general' or 'snack'

  if (!isOpen) return null;

  const handleExport = async (format) => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }
    
    setIsExporting(true);
    try {
      const startMs = new Date(startDate).getTime();
      // Set end date to the end of the selected day
      const endMs = new Date(endDate).getTime() + 86399999;
      
      const response = await api.get(`/expenses/export/data`, {
        params: {
          start_date: startMs,
          end_date: endMs,
          export_format: format,
          expense_type: expenseType
        },
        responseType: 'blob'
      });
      
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = format === 'zip' ? `Name_Month_26_Snacks_Reimbursement.zip` : `Name_Month_26_Snacks_Reimbursement.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      
      onClose();
    } catch (error) {
      console.error(error);
      alert("Failed to export expenses.");
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden"
        >
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-slate-900">Export Expenses</h3>
              <button onClick={onClose} className="text-slate-400 hover:text-slate-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 sm:text-sm"
                />
              </div>

              <div className="mb-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">Expense Type</label>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${expenseType === 'general' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setExpenseType('general')}
                  >
                    General
                  </button>
                  <button
                    className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-colors ${expenseType === 'snack' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    onClick={() => setExpenseType('snack')}
                  >
                    Snack
                  </button>
                </div>
              </div>

              <div className="pt-4 grid grid-cols-2 gap-4">
                <button
                  onClick={() => handleExport('excel')}
                  disabled={isExporting}
                  className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  <FileSpreadsheet className="w-8 h-8 text-emerald-600 mb-2" />
                  <span className="text-sm font-medium text-slate-900">Excel Sheet</span>
                </button>
                <button
                  onClick={() => handleExport('zip')}
                  disabled={isExporting}
                  className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors disabled:opacity-50"
                >
                  <Archive className="w-8 h-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-slate-900">ZIP w/ Images</span>
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default ExportModal;
