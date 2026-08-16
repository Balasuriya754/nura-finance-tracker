import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Eye, X, Search, FileImage, CheckCircle, XCircle } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import GlobalDateFilter from '../../components/GlobalDateFilter';

const AdminExpenses = () => {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [searchParams] = useSearchParams();
  
  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPaidUsing, setFilterPaidUsing] = useState('ALL');
  const [filterGst, setFilterGst] = useState('ALL');

  const fetchExpenses = async () => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      if (!params.preset && !params.from) {
        params.preset = 'this_month';
      }
      const res = await api.get('/dashboard/expenses', { params });
      setExpenses(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [searchParams]);

  const handleApprove = async (uuid) => {
    try {
      await api.put(`/dashboard/expenses/${uuid}/approve`);
      setSelectedExpense(null);
      fetchExpenses();
    } catch (err) {
      alert("Failed to approve");
    }
  };

  const handleReject = async (uuid) => {
    try {
      await api.put(`/dashboard/expenses/${uuid}/reject`);
      setSelectedExpense(null);
      fetchExpenses();
    } catch (err) {
      alert("Failed to reject");
    }
  };

  const filteredExpenses = expenses.filter(e => {
    if (filterStatus !== 'ALL' && e.review_status !== filterStatus) return false;
    if (filterCategory !== 'ALL' && e.main_category !== filterCategory) return false;
    if (filterPaidUsing !== 'ALL' && e.paid_using !== filterPaidUsing) return false;
    if (filterGst !== 'ALL' && String(e.gst_bill) !== filterGst) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        (e.employee_name && e.employee_name.toLowerCase().includes(q)) ||
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.uuid && e.uuid.toLowerCase().includes(q)) ||
        (e.vendor && e.vendor.toLowerCase().includes(q)) ||
        (e.amount && e.amount.toString().includes(q));
      if (!match) return false;
    }
    
    return true;
  });

  const getReviewBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center text-xs font-semibold text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>Pending</span>;
      case 'APPROVED': return <span className="inline-flex items-center text-xs font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>Approved</span>;
      case 'REJECTED': return <span className="inline-flex items-center text-xs font-semibold text-rose-600 line-through decoration-rose-300"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span>Rejected</span>;
      case 'DRAFT': return <span className="inline-flex items-center text-xs font-semibold text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-slate-400 mr-2"></span>Draft</span>;
      default: return null;
    }
  };

  const getReimbursementBadge = (expense) => {
    if (expense.paid_using === 'COMPANY') return <span className="inline-flex items-center text-xs font-semibold text-slate-400">Not Req.</span>;
    if (expense.review_status === 'REJECTED') return <span className="inline-flex items-center text-xs font-semibold text-slate-400">Not App.</span>;
    if (expense.review_status === 'PENDING' || expense.review_status === 'DRAFT') return null;
    
    switch (expense.reimbursement_status) {
      case 'PENDING': return <span className="inline-flex items-center text-xs font-semibold text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>Pending Pay</span>;
      case 'COMPLETED': return <span className="inline-flex items-center text-xs font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>Paid</span>;
      default: return null;
    }
  };

  // Categories extraction for filter
  const categories = [...new Set(expenses.map(e => e.main_category).filter(Boolean))];

  return (
    <div className="max-w-[95rem] mx-auto h-full flex flex-col pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 mt-4 sm:mt-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
      </div>

      <GlobalDateFilter />

      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search employee, vendor, ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white transition-colors"
          />
        </div>
        <CustomSelect 
          value={filterStatus}
          onChange={setFilterStatus}
          options={[
            { value: 'ALL', label: 'All Statuses' },
            { value: 'PENDING', label: 'Pending Review' },
            { value: 'APPROVED', label: 'Approved' },
            { value: 'REJECTED', label: 'Rejected' },
          ]}
          className="w-full sm:w-40"
        />
        <CustomSelect 
          value={filterCategory}
          onChange={setFilterCategory}
          options={[
            { value: 'ALL', label: 'All Categories' },
            ...categories.map(c => ({ value: c, label: c }))
          ]}
          className="w-full sm:w-40"
        />
        <CustomSelect 
          value={filterPaidUsing}
          onChange={setFilterPaidUsing}
          options={[
            { value: 'ALL', label: 'All Payments' },
            { value: 'PERSONAL', label: 'Personal' },
            { value: 'COMPANY', label: 'Company' },
          ]}
          className="w-full sm:w-40"
        />
        <CustomSelect 
          value={filterGst}
          onChange={setFilterGst}
          options={[
            { value: 'ALL', label: 'GST & Non-GST' },
            { value: 'true', label: 'GST Only' },
            { value: 'false', label: 'Non-GST Only' },
          ]}
          className="w-full sm:w-40"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <th className="py-4 px-6 whitespace-nowrap">Employee</th>
                <th className="py-4 px-6 whitespace-nowrap">Expense ID</th>
                <th className="py-4 px-6 whitespace-nowrap">Date</th>
                <th className="py-4 px-6 whitespace-nowrap">Vendor</th>
                <th className="py-4 px-6 whitespace-nowrap">Category</th>
                <th className="py-4 px-6 whitespace-nowrap">Amount</th>
                <th className="py-4 px-6 whitespace-nowrap">Paid Using</th>
                <th className="py-4 px-6 whitespace-nowrap">Status</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-8 bg-slate-200 rounded w-8 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredExpenses.length === 0 ? (
                <tr><td colSpan="9" className="py-12 text-center text-slate-500 font-medium">No expenses match your filters.</td></tr>
              ) : (
                filteredExpenses.map(expense => (
                  <tr key={expense.uuid} className="hover:bg-slate-50 transition-colors group cursor-pointer" onClick={() => setSelectedExpense(expense)}>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{expense.employee_name || 'Unknown'}</span>
                        <span className="text-xs text-slate-500">{expense.employee_email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 font-mono">{expense.uuid}</td>
                    <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap">
                      {new Date(expense.expense_date || expense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-900 font-medium max-w-[150px] truncate">{expense.vendor}</td>
                    <td className="py-4 px-6 text-sm text-slate-500">{expense.main_category}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">₹{expense.amount}</td>
                    <td className="py-4 px-6 text-sm">
                      <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${expense.paid_using === 'COMPANY' ? 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' : 'bg-slate-100 text-slate-700 ring-slate-500/10'}`}>
                        {expense.paid_using}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-sm">
                      <div className="flex flex-col gap-1.5">
                        {getReviewBadge(expense.review_status)}
                        {expense.paid_using === 'PERSONAL' && getReimbursementBadge(expense)}
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedExpense(expense); }}
                        className="text-slate-400 hover:text-slate-900 bg-white border border-slate-200 hover:border-slate-300 shadow-sm p-2 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-slate-900"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expense Details Modal */}
      {selectedExpense && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-center items-center transition-opacity p-4 sm:p-6">
          <div className="bg-white w-full max-w-5xl h-full max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-fade-in">
            <div className="flex justify-between items-center px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Expense Details</h2>
                <div className="flex items-center gap-3 border-l border-slate-200 pl-4">
                  {getReviewBadge(selectedExpense.review_status)}
                  {selectedExpense.paid_using === 'PERSONAL' && (
                    <>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      {getReimbursementBadge(selectedExpense)}
                    </>
                  )}
                </div>
              </div>
              <button onClick={() => setSelectedExpense(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-200"><X className="w-5 h-5" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto flex flex-col lg:flex-row">
              {/* Receipt Viewer Left Side */}
              <div className="w-full lg:w-1/2 bg-slate-100 border-r border-slate-200 p-6 flex flex-col justify-center items-center relative group min-h-[300px]">
                {selectedExpense.bill_url ? (
                  selectedExpense.bill_url.includes('.pdf') ? (
                    <div className="w-full h-full min-h-[400px]">
                      <iframe src={selectedExpense.bill_url} className="w-full h-full rounded-xl border border-slate-200 shadow-sm" title="Receipt PDF" />
                    </div>
                  ) : (
                    <a href={selectedExpense.bill_url} target="_blank" rel="noreferrer" className="relative w-full flex items-center justify-center py-4">
                      <img src={selectedExpense.bill_url} alt="Receipt" className="max-w-full max-h-[350px] lg:max-h-[70vh] object-contain rounded-xl shadow-sm border border-slate-200" />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/10 transition-colors rounded-xl flex items-center justify-center">
                        <div className="opacity-0 group-hover:opacity-100 bg-white/90 backdrop-blur px-4 py-2 rounded-lg font-medium text-slate-800 shadow-sm flex items-center gap-2 transform translate-y-2 group-hover:translate-y-0 transition-all">
                          <Eye className="w-4 h-4" /> View Full Image
                        </div>
                      </div>
                    </a>
                  )
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400 gap-3 bg-white p-12 rounded-2xl border border-slate-200 shadow-sm">
                    <FileImage className="w-12 h-12 text-slate-300" />
                    <span className="font-medium">No Receipt Attached</span>
                  </div>
                )}
              </div>

              {/* Details Right Side */}
              <div className="w-full lg:w-1/2 p-6 lg:p-8 space-y-8 bg-white">
                
                {/* Employee Info */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Submitted By</h3>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-lg shadow-sm">
                      {selectedExpense.employee_name ? selectedExpense.employee_name.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <p className="text-base font-bold text-slate-900">{selectedExpense.employee_name || 'Unknown User'}</p>
                      <p className="text-sm text-slate-500">{selectedExpense.employee_email}</p>
                      <p className="text-sm text-slate-500">{selectedExpense.employee_phone}</p>
                    </div>
                  </div>
                </div>

                <hr className="border-slate-100" />

                {/* Expense Info */}
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">Expense Information</h3>
                  <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Amount</p>
                      <p className="text-3xl font-bold text-slate-900">₹{selectedExpense.amount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Date</p>
                      <p className="text-base font-medium text-slate-900">
                        {new Date(selectedExpense.expense_date || selectedExpense.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500 mb-1">Description</p>
                      <p className="text-base font-medium text-slate-900 bg-slate-50 p-3 rounded-lg border border-slate-100">{selectedExpense.description}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Vendor</p>
                      <p className="text-base font-medium text-slate-900">{selectedExpense.vendor}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Category</p>
                      <p className="text-base font-medium text-slate-900">{selectedExpense.main_category}</p>
                      <p className="text-xs text-slate-500">{selectedExpense.sub_category}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">Payment Details</p>
                      <p className="text-base font-medium text-slate-900">{selectedExpense.paid_using}</p>
                      <p className="text-xs text-slate-500">{selectedExpense.payment_method}</p>
                    </div>
                    <div>
                      <p className="text-sm text-slate-500 mb-1">GST Included</p>
                      <p className="text-base font-medium text-slate-900">
                        {selectedExpense.gst_bill ? 
                          <span className="text-slate-900 font-semibold flex items-center gap-1"><CheckCircle className="w-4 h-4"/> Yes</span> : 
                          <span className="text-slate-400 font-semibold flex items-center gap-1"><XCircle className="w-4 h-4"/> No</span>
                        }
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-sm text-slate-500 mb-1">Expense ID</p>
                      <p className="text-sm font-mono text-slate-500 bg-slate-50 p-2 rounded border border-slate-100">{selectedExpense.uuid}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {selectedExpense.review_status === 'PENDING' && (
              <div className="p-4 sm:p-6 border-t border-slate-200 bg-slate-50 flex gap-4">
                <button 
                  onClick={() => handleReject(selectedExpense.uuid)}
                  className="flex-1 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 hover:text-slate-900 py-3 rounded-xl font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-slate-900"
                >
                  Reject
                </button>
                <button 
                  onClick={() => handleApprove(selectedExpense.uuid)}
                  className="flex-[2] bg-slate-900 text-white hover:bg-black py-3 rounded-xl font-semibold shadow-md transition-all focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2"
                >
                  Approve
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminExpenses;
