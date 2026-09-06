import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, LogOut, CheckCircle, Clock, FileEdit, Trash2, IndianRupee, Eye, Coffee, Download } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../services/api';

import LogoutConfirmModal from '../components/LogoutConfirmModal';
import ExportModal from '../components/ExportModal';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED, DRAFT
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState(null);
  const [loading, setLoading] = useState(true);
  const [visibleCount, setVisibleCount] = useState(5);
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
    setLoading(true);
    try {
      const response = await api.get('/expenses/');
      let allExpenses = response.data;

      const localDraftStr = localStorage.getItem('local_draft');
      if (localDraftStr) {
        const localDraft = JSON.parse(localDraftStr);
        allExpenses.unshift({
          uuid: 'local-draft',
          description: localDraft.description || 'Unsaved Draft',
          amount: localDraft.amount || 0,
          expense_date: localDraft.expense_date || Date.now(),
          review_status: 'DRAFT',
          payment_method: localDraft.payment_method || 'N/A',
          paid_using: localDraft.paid_using || 'N/A',
          bill_url: null
        });
      }

      setExpenses(allExpenses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const deleteExpense = async (uuid) => {
    try {
      if (uuid === 'local-draft') {
        localStorage.removeItem('local_draft');
      } else {
        await api.delete(`/expenses/${uuid}`);
      }
      fetchExpenses();
    } catch (err) {
      console.error(err);
    }
  };

  const getReviewBadge = (review_status) => {
    switch (review_status) {
      case 'PENDING': return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><Clock className="w-3 h-3" /> Pending</span>;
      case 'APPROVED': return <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle className="w-3 h-3" /> Approved</span>;
      case 'REJECTED': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-50 text-red-700 border border-red-200">Rejected</span>;
      case 'DRAFT': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">Draft</span>;
      default: return null;
    }
  };

  const getReimbursementBadge = (expense) => {
    if (expense.paid_using === 'COMPANY') {
      return <span className="text-xs font-medium text-slate-400">Not Required</span>;
    }
    if (expense.review_status === 'REJECTED') {
      return <span className="text-xs font-medium text-slate-400">Not Applicable</span>;
    }
    if (expense.review_status === 'PENDING' || expense.review_status === 'DRAFT') {
      return <span className="text-xs font-medium text-slate-400">Awaiting Approval</span>;
    }
    switch (expense.reimbursement_status) {
      case 'PENDING': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">Pending Pay</span>;
      case 'COMPLETED': return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">Paid</span>;
      default: return <span className="text-xs font-medium text-slate-400">Awaiting Approval</span>;
    }
  };

  const filteredExpenses = filter === 'ALL' ? expenses : expenses.filter(e => e.review_status === filter);

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/finance_logo.jpg" alt="Logo" className="w-8 h-8 rounded object-contain border border-slate-200" />
            <h1 className="text-lg font-medium text-slate-900 tracking-tight">Welcome, {user?.name ? user.name.split(' ')[0] : 'User'}</h1>
          </div>
          <button onClick={() => setShowLogoutModal(true)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-2 text-sm font-medium">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Expenses</h2>
          <div className="flex items-center gap-3">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/snacks"
                className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <Coffee className="w-4 h-4" />
                <span className="hidden sm:inline">Snacks Tracker</span>
                <span className="sm:hidden">Snacks</span>
              </Link>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <button
                onClick={() => setShowExportModal(true)}
                className="inline-flex items-center gap-1.5 sm:gap-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-3 py-1.5 sm:px-4 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export Data</span>
                <span className="sm:hidden">Export</span>
              </button>
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }}>
              <Link
                to="/add-expense"
                className="hidden sm:inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                New Expense
              </Link>
            </motion.div>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto hide-scrollbar" aria-label="Tabs">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].map((f) => (
              <button
                key={f}
                onClick={() => { setFilter(f); setVisibleCount(5); }}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${filter === f
                    ? 'border-slate-900 text-slate-900'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                  }`}
              >
                {f.charAt(0) + f.slice(1).toLowerCase()}
              </button>
            ))}
          </nav>
        </div>

        {/* Expenses List */}
        <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-lg overflow-hidden relative">
          <AnimatePresence mode="wait">
          {loading ? (
            <motion.ul 
              key="loading"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="divide-y divide-slate-100"
            >
              {Array.from({ length: 4 }).map((_, i) => (
                <li key={i} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                  <div className="min-w-0 flex-auto">
                    <div className="h-5 bg-slate-200 rounded w-1/3 mb-3"></div>
                    <div className="flex gap-3 mb-3">
                      <div className="h-4 bg-slate-200 rounded w-24"></div>
                      <div className="h-4 bg-slate-200 rounded w-32"></div>
                    </div>
                    <div className="h-3 bg-slate-200 rounded w-48"></div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 mt-1 sm:mt-0">
                    <div className="h-6 bg-slate-200 rounded w-16 sm:mr-4"></div>
                    <div className="flex gap-2 border-l border-slate-200 pl-4">
                      <div className="w-8 h-8 bg-slate-200 rounded-md"></div>
                      <div className="w-8 h-8 bg-slate-200 rounded-md"></div>
                    </div>
                  </div>
                </li>
              ))}
            </motion.ul>
          ) : filteredExpenses.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="p-12 text-center"
            >
              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4 ring-1 ring-slate-100">
                <IndianRupee className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-medium text-sm mb-1">No expenses found</h3>
              <p className="text-slate-500 text-sm mb-4">You haven't recorded any expenses in this category.</p>
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.95 }} className="inline-block">
                <Link
                  to="/add-expense"
                  className="inline-flex items-center gap-2 bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" />
                  Add your first expense
                </Link>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ul className="divide-y divide-slate-100 overflow-hidden">
                <AnimatePresence initial={false}>
                  {filteredExpenses.slice(0, visibleCount).map((expense) => (
                    <motion.li 
                      key={expense.uuid} 
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: 'easeInOut' }}
                      className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 overflow-hidden"
                    >
                      <div className="min-w-0 flex-auto">
                    <div className="flex items-center gap-3 mb-1">
                      <p className="text-sm font-semibold text-slate-900 truncate">{expense.description}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 mt-1.5 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Expense:</span>
                        {getReviewBadge(expense.review_status)}
                      </div>
                      <div className="w-px h-3 bg-slate-300"></div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 font-medium">Reimbursement:</span>
                        {getReimbursementBadge(expense)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <p className="whitespace-nowrap">
                        {new Date(expense.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                      <span className="w-1 h-1 rounded-full bg-slate-300"></span>
                      <p className="truncate uppercase tracking-wider text-[10px] font-medium">Via {expense.payment_method} · {expense.paid_using}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto border-t sm:border-t-0 border-slate-100 pt-3 sm:pt-0 mt-1 sm:mt-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base sm:text-sm font-semibold text-slate-900">₹{Number(expense.amount).toLocaleString('en-IN')}</p>
                    </div>

                    <div className="flex items-center gap-1 sm:border-l border-slate-200 sm:pl-4 sm:ml-4">
                      {expense.bill_url && (
                        <a
                          href={expense.bill_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors"
                          title="View Receipt"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                      )}
                      {(expense.review_status === 'DRAFT' || expense.review_status === 'PENDING') && (
                        <>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => navigate(`/add-expense?edit=${expense.uuid}`)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors" title="Edit">
                            <FileEdit className="w-4 h-4" />
                          </motion.button>
                          <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setExpenseToDelete(expense.uuid)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </motion.button>
                        </>
                      )}
                    </div>
                  </div>
                </motion.li>
              ))}
              </AnimatePresence>
              </ul>
              {(visibleCount < filteredExpenses.length || visibleCount > 5) && (
                <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-center gap-3">
                  {visibleCount > 5 && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVisibleCount(prev => Math.max(5, prev - 5))}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-6 py-2 rounded-lg shadow-sm hover:shadow transition-all"
                    >
                      View Less
                    </motion.button>
                  )}
                  {visibleCount < filteredExpenses.length && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setVisibleCount(prev => prev + 5)}
                      className="text-sm font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-6 py-2 rounded-lg shadow-sm hover:shadow transition-all"
                    >
                      View More
                    </motion.button>
                  )}
                </div>
              )}
            </motion.div>
          )}
          </AnimatePresence>
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <Link
        to="/add-expense"
        className="sm:hidden fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 z-50"
      >
        <PlusCircle className="w-6 h-6" />
      </Link>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
      {expenseToDelete && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm px-4"
        >
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 10 }}
            className="bg-white rounded-xl shadow-lg p-6 max-w-sm w-full flex flex-col items-center text-center"
          >
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-4">
              <Trash2 className="w-6 h-6 text-red-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Delete Expense?</h3>
            <p className="text-slate-500 mb-6 text-sm">Are you sure you want to delete this expense? This action cannot be undone.</p>
            <div className="flex gap-3 w-full">
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setExpenseToDelete(null)}
                className="flex-1 bg-white border border-slate-300 text-slate-700 font-medium py-2 px-4 rounded-md hover:bg-slate-50 transition-colors"
              >
                Cancel
              </motion.button>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  deleteExpense(expenseToDelete);
                  setExpenseToDelete(null);
                }}
                className="flex-1 bg-red-600 text-white font-medium py-2 px-4 rounded-md hover:bg-red-700 transition-colors shadow-sm"
              >
                Delete
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
      </AnimatePresence>

      <ExportModal 
        isOpen={showExportModal} 
        onClose={() => setShowExportModal(false)}
        token={localStorage.getItem('token')}
      />
    </div>
  );
};

export default Dashboard;
