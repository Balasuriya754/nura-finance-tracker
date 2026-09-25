import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Coffee, Loader2, Calendar } from 'lucide-react';
import api from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';

const SnacksTracker = () => {
  const navigate = useNavigate();
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [totalSpent, setTotalSpent] = useState(null);
  const [expenses, setExpenses] = useState([]);

  const handleCalculate = async () => {
    if (!startDate || !endDate) {
      alert("Please select both start and end dates.");
      return;
    }

    const startTs = new Date(startDate).setHours(0, 0, 0, 0);
    const endTs = new Date(endDate).setHours(23, 59, 59, 999);

    if (startTs > endTs) {
      alert("Start date cannot be after end date.");
      return;
    }

    setLoading(true);
    setTotalSpent(null);
    setExpenses([]);
    try {
      // Artificial delay for better UX (loader visibility)
      await new Promise(resolve => setTimeout(resolve, 600));

      const res = await api.get('/expenses/snacks/summary', {
        params: {
          start_ts: startTs,
          end_ts: endTs
        }
      });
      setTotalSpent(res.data.total_spent || 0);
      setExpenses(res.data.expenses || []);
    } catch (err) {
      console.error(err);
      alert('Failed to calculate snacks total');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans pb-20">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-16 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="bg-amber-100 p-1.5 rounded text-amber-600">
              <Coffee className="w-5 h-5" />
            </div>
            <h1 className="text-lg font-bold text-slate-900 tracking-tight">Snacks Tracker</h1>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-200">
          <h2 className="text-base font-semibold text-slate-900 mb-6 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" /> Date Range
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">From Date</label>
              <input 
                type="date" 
                value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setTotalSpent(null); setExpenses([]); }}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow text-slate-900"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">To Date</label>
              <input 
                type="date" 
                value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setTotalSpent(null); setExpenses([]); }}
                className="w-full px-4 py-2 bg-white border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-shadow text-slate-900"
              />
            </div>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleCalculate}
            disabled={loading}
            className="w-full bg-slate-900 text-white font-medium py-3 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            {loading ? 'Calculating...' : 'Calculate Snacks'}
          </motion.button>
        </div>

        <AnimatePresence>
          {totalSpent !== null && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6 space-y-6"
            >
              {/* Subtle Total */}
              <div className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-5 py-4 shadow-sm">
                <span className="text-slate-600 font-medium text-sm">Total Spent</span>
                <span className="text-slate-900 font-bold text-xl">₹{totalSpent.toLocaleString('en-IN')}</span>
              </div>

              {/* History List */}
              <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50">
                  <h3 className="font-semibold text-slate-900 text-sm">Expense History</h3>
                </div>
                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {expenses.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">No expenses found for this date range.</div>
                  ) : (
                    expenses.map(expense => (
                      <div key={expense.uuid} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{expense.description}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                            {expense.vendor && ` • ${expense.vendor}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">₹{expense.amount.toLocaleString('en-IN')}</p>
                          <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mt-1">{expense.payment_method}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
};

export default SnacksTracker;
