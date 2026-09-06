import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coffee, PlusCircle, AlertCircle, ReceiptText, Loader2, Download } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';
import ExportModal from '../components/ExportModal';

const SnacksTracker = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({ total_spent: 0, allowance: 700, remaining: 700 });
  const [snackExpenses, setSnackExpenses] = useState([]);
  const [allSnacks, setAllSnacks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
  
  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);

  useEffect(() => {
    fetchSnacksData();
  }, []);

  const fetchSnacksData = async () => {
    setLoading(true);
    try {
      const [summaryRes, expensesRes] = await Promise.all([
        api.get('/expenses/snacks/summary'),
        api.get('/expenses/')
      ]);
      setSummary(summaryRes.data);
      const snacks = expensesRes.data.filter(e => e.is_snack === true);
      setAllSnacks(snacks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (allSnacks.length > 0 || !loading) {
      const startMs = startDate ? new Date(startDate).getTime() : 0;
      const endMs = endDate ? new Date(endDate).getTime() + 86399999 : Number.MAX_SAFE_INTEGER;
      
      const filtered = allSnacks.filter(e => {
        const d = new Date(e.expense_date).getTime();
        return d >= startMs && d <= endMs;
      });
      setSnackExpenses(filtered);
    }
  }, [allSnacks, startDate, endDate, loading]);

  const computedTotalSpent = snackExpenses.reduce((acc, curr) => acc + Number(curr.amount), 0);
  const percentageSpent = Math.min((computedTotalSpent / summary.allowance) * 100, 100);
  const isOverBudget = computedTotalSpent > summary.allowance;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => navigate(-1)} 
              className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <Coffee className="w-5 h-5 text-amber-600" />
              <h1 className="text-lg font-medium text-slate-900 tracking-tight">Snacks Tracker</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowExportModal(true)}
              className="inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shadow-sm"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Data</span>
              <span className="sm:hidden">Export</span>
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/add-expense')}
              className="hidden sm:flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
            >
              <PlusCircle className="w-4 h-4" />
              New Expense
            </motion.button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        <AnimatePresence mode="wait">
        {loading ? (
          <motion.div 
            key="loading"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="animate-pulse"
          >
            {/* Dashboard Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
              <div className="bg-slate-200 h-24 rounded-xl shadow-sm ring-1 ring-slate-200"></div>
              <div className="bg-slate-200 h-24 rounded-xl shadow-sm ring-1 ring-slate-200"></div>
              <div className="col-span-2 md:col-span-1 bg-slate-200 h-24 rounded-xl shadow-sm ring-1 ring-slate-200"></div>
            </div>

            {/* Progress Bar Skeleton */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm ring-1 ring-slate-200 mb-6">
              <div className="flex justify-between items-end mb-2">
                <div className="h-4 bg-slate-200 rounded w-32"></div>
                <div className="h-5 bg-slate-200 rounded w-12"></div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2"></div>
            </div>

            {/* List Skeleton */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-4 h-4 bg-slate-200 rounded"></div>
                <div className="h-4 bg-slate-200 rounded w-48"></div>
              </div>
              <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
                <ul className="divide-y divide-slate-100">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <li key={i} className="p-4 flex justify-between items-center gap-4">
                      <div className="flex-auto">
                        <div className="h-4 bg-slate-200 rounded w-1/3 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/4"></div>
                      </div>
                      <div className="h-5 bg-slate-200 rounded w-16"></div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="content"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            {/* Dashboard Cards - Compact & Neat */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-4">
              
              <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col justify-center">
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Monthly Budget</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">₹{summary.allowance}</p>
              </div>

              <div className="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-200 flex flex-col justify-center">
                <p className="text-[10px] sm:text-xs uppercase tracking-wider text-slate-500 font-bold mb-1">Total Spent</p>
                <p className="text-xl sm:text-2xl font-bold text-amber-700">₹{computedTotalSpent.toFixed(2)}</p>
              </div>

              <div className={`col-span-2 md:col-span-1 p-4 rounded-xl shadow-sm ring-1 flex flex-col justify-center ${isOverBudget ? 'bg-red-50 ring-red-200' : 'bg-emerald-50 ring-emerald-200'}`}>
                <p className={`text-[10px] sm:text-xs uppercase tracking-wider font-bold mb-1 ${isOverBudget ? 'text-red-700' : 'text-emerald-700'}`}>
                  {isOverBudget ? 'Over Budget By' : 'Remaining Balance'}
                </p>
                <p className={`text-xl sm:text-2xl font-bold ${isOverBudget ? 'text-red-700' : 'text-emerald-700'}`}>
                  ₹{isOverBudget ? (computedTotalSpent - summary.allowance).toFixed(2) : (summary.allowance - computedTotalSpent).toFixed(2)}
                </p>
              </div>
            </div>

            {/* Date Filter */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm ring-1 ring-slate-200 mb-6 flex flex-col sm:flex-row gap-4 items-center">
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 text-sm"
                />
              </div>
              <div className="w-full sm:w-1/2">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)} 
                  className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-slate-500 focus:border-slate-500 text-sm"
                />
              </div>
            </div>

            {/* Clean Progress Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-xl shadow-sm ring-1 ring-slate-200 mb-6">
              <div className="flex justify-between items-end mb-2">
                <h3 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">Budget Utilization</h3>
                <span className={`text-sm sm:text-base font-bold ${isOverBudget ? 'text-red-600' : 'text-slate-700'}`}>
                  {percentageSpent.toFixed(1)}%
                </span>
              </div>
              
              <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all duration-1000 ease-out ${isOverBudget ? 'bg-red-500' : (percentageSpent > 80 ? 'bg-amber-500' : 'bg-emerald-500')}`}
                  style={{ width: `${percentageSpent}%` }}
                ></div>
              </div>
              
              {isOverBudget && (
                <div className="flex items-center gap-2 mt-3 text-red-600 text-xs sm:text-sm font-medium bg-red-50 p-2.5 rounded-lg border border-red-100">
                  <AlertCircle className="w-4 h-4" />
                  Expenses exceed monthly allowance.
                </div>
              )}
            </div>

            {/* Minimalist List */}
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <ReceiptText className="w-4 h-4 text-slate-400" />
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Filtered Transactions</h3>
              </div>
              
              <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-xl overflow-hidden">
                {snackExpenses.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center">
                    <div className="w-10 h-10 rounded-full bg-slate-50 ring-1 ring-slate-100 flex items-center justify-center mb-2">
                      <Coffee className="w-4 h-4 text-slate-400" />
                    </div>
                    <p className="text-slate-500 text-xs sm:text-sm">No snacks expenses recorded this month.</p>
                  </div>
                ) : (
                  <ul className="divide-y divide-slate-100">
                    {snackExpenses.map((expense) => (
                      <li key={expense.uuid} className="p-3 sm:p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{expense.description}</p>
                          <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 font-medium uppercase tracking-wider">
                            {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">₹{Number(expense.amount).toLocaleString('en-IN')}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </motion.div>
        )}
        </AnimatePresence>
      </main>

      <motion.button 
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => navigate('/add-expense')}
        className="sm:hidden fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl z-50"
      >
        <PlusCircle className="w-6 h-6" />
      </motion.button>
      
      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)}
        token={localStorage.getItem('token')}
      />
    </div>
  );
};

export default SnacksTracker;
