import React, { useContext, useEffect, useState } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { PlusCircle, LogOut, CheckCircle, Clock, FileEdit, Trash2, IndianRupee, Eye } from 'lucide-react';
import api from '../services/api';

const Dashboard = () => {
  const { user, logout } = useContext(AuthContext);
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState('ALL'); // ALL, PENDING, APPROVED, REJECTED, DRAFT
  const navigate = useNavigate();

  useEffect(() => {
    fetchExpenses();
  }, []);

  const fetchExpenses = async () => {
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
    }
  };

  const handleLogout = () => {
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
            <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center text-white font-medium text-sm">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-lg font-medium text-slate-900 tracking-tight">Welcome, {user?.name.split(' ')[0]}</h1>
          </div>
          <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-md transition-colors flex items-center gap-2 text-sm font-medium">
            <LogOut className="w-4 h-4" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-slate-900">Expenses</h2>
          <Link 
            to="/add-expense" 
            className="hidden sm:inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
          >
            <PlusCircle className="w-4 h-4" />
            New Expense
          </Link>
        </div>

        {/* Tabs */}
        <div className="border-b border-slate-200">
          <nav className="-mb-px flex space-x-6 overflow-x-auto hide-scrollbar" aria-label="Tabs">
            {['ALL', 'PENDING', 'APPROVED', 'REJECTED', 'DRAFT'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors ${
                  filter === f
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
        <div className="bg-white shadow-sm ring-1 ring-slate-200 rounded-lg overflow-hidden">
          {filteredExpenses.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 bg-slate-50 rounded-lg flex items-center justify-center mx-auto mb-4 ring-1 ring-slate-100">
                <IndianRupee className="w-6 h-6 text-slate-400" />
              </div>
              <h3 className="text-slate-900 font-medium text-sm mb-1">No expenses found</h3>
              <p className="text-slate-500 text-sm mb-4">You haven't recorded any expenses in this category.</p>
              <Link 
                to="/add-expense" 
                className="inline-flex items-center gap-2 bg-white ring-1 ring-slate-200 hover:bg-slate-50 text-slate-900 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm"
              >
                <PlusCircle className="w-4 h-4" />
                Add your first expense
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filteredExpenses.map((expense) => (
                <li key={expense.uuid} className="p-4 sm:p-5 hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                          <button onClick={() => navigate(`/add-expense?edit=${expense.uuid}`)} className="p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors" title="Edit">
                            <FileEdit className="w-4 h-4" />
                          </button>
                          <button onClick={() => deleteExpense(expense.uuid)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </main>

      {/* Floating Action Button for Mobile */}
      <Link 
        to="/add-expense" 
        className="sm:hidden fixed bottom-6 right-6 bg-slate-900 hover:bg-slate-800 text-white w-12 h-12 rounded-full flex items-center justify-center shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all duration-200 z-50"
      >
        <PlusCircle className="w-6 h-6" />
      </Link>
    </div>
  );
};

export default Dashboard;
