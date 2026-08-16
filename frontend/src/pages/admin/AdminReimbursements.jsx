import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Eye, CheckCircle, Search, X, FileImage, Download } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import GlobalDateFilter from '../../components/GlobalDateFilter';

const AdminReimbursements = () => {
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedReimb, setSelectedReimb] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [searchParams] = useSearchParams();
  
  const [filterPaymentStatus, setFilterPaymentStatus] = useState('PENDING');
  const [filterReviewStatus, setFilterReviewStatus] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchReimbursements = async () => {
    try {
      const params = Object.fromEntries(searchParams.entries());
      if (!params.preset && !params.from) {
        params.preset = 'this_month';
      }
      const res = await api.get('/dashboard/reimbursements', { params });
      setReimbursements(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReimbursements();
  }, [searchParams]);

  const handleMarkPaid = async (uuid) => {
    try {
      await api.put(`/dashboard/reimbursements/${uuid}/complete`, { remarks });
      setSelectedReimb(null);
      setRemarks('');
      fetchReimbursements();
    } catch (err) {
      alert("Failed to mark as paid");
    }
  };

  const filteredReimbursements = reimbursements.filter(r => {
    if (filterPaymentStatus !== 'ALL' && r.reimbursement_status !== filterPaymentStatus) return false;
    if (filterReviewStatus !== 'ALL' && r.review_status !== filterReviewStatus) return false;
    
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const match = 
        (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
        (r.vendor && r.vendor.toLowerCase().includes(q)) ||
        (r.uuid && r.uuid.toLowerCase().includes(q)) ||
        (r.expense_uuid && r.expense_uuid.toLowerCase().includes(q)) ||
        (r.remarks && r.remarks.toLowerCase().includes(q)) ||
        (r.amount && r.amount.toString().includes(q));
      if (!match) return false;
    }
    
    return true;
  });

  const getReimbursementStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="inline-flex items-center text-xs font-semibold text-amber-600"><span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-2"></span>Pending Pay</span>;
      case 'COMPLETED': return <span className="inline-flex items-center text-xs font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>Paid</span>;
      default: return null;
    }
  };

  const getReviewStatusBadge = (status) => {
    switch (status) {
      case 'PENDING': return <span className="text-amber-600 font-semibold text-xs">Pending Review</span>;
      case 'APPROVED': return <span className="text-emerald-600 font-semibold text-xs">Approved</span>;
      default: return <span className="text-slate-500 font-semibold text-xs">{status}</span>;
    }
  };

  return (
    <div className="max-w-[95rem] mx-auto h-full flex flex-col pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 mt-4 sm:mt-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reimbursements</h1>
      </div>

      <GlobalDateFilter />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex items-center justify-between group hover:border-slate-300 transition-colors">
          <div>
            <h3 className="text-slate-500 text-xs uppercase font-semibold mb-1 tracking-wider">Total Pending Payment</h3>
            <p className="text-3xl font-bold text-slate-900">
              ₹{reimbursements.filter(r => r.reimbursement_status === 'PENDING').reduce((sum, r) => sum + parseFloat(r.amount), 0).toLocaleString()}
            </p>
          </div>
          <CheckCircle className="w-6 h-6 text-slate-300 group-hover:text-slate-900 transition-colors" />
        </div>
      </div>

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
          value={filterPaymentStatus}
          onChange={setFilterPaymentStatus}
          options={[
            { value: 'ALL', label: 'All Payments' },
            { value: 'PENDING', label: 'Pending Payment' },
            { value: 'COMPLETED', label: 'Paid Completed' },
          ]}
          className="w-full sm:w-48"
        />
        <CustomSelect 
          value={filterReviewStatus}
          onChange={setFilterReviewStatus}
          options={[
            { value: 'ALL', label: 'All Reviews' },
            { value: 'PENDING', label: 'Pending Review' },
            { value: 'APPROVED', label: 'Approved' },
          ]}
          className="w-full sm:w-48"
        />
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <th className="py-4 px-6 whitespace-nowrap">Employee</th>
                <th className="py-4 px-6 whitespace-nowrap">Expense ID</th>
                <th className="py-4 px-6 whitespace-nowrap">Vendor</th>
                <th className="py-4 px-6 whitespace-nowrap">Amount</th>
                <th className="py-4 px-6 whitespace-nowrap">Exp Date</th>
                <th className="py-4 px-6 whitespace-nowrap">Review Status</th>
                <th className="py-4 px-6 whitespace-nowrap">Payment Status</th>
                <th className="py-4 px-6 text-center whitespace-nowrap">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-24"></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-8 bg-slate-200 rounded w-20 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredReimbursements.length === 0 ? (
                <tr><td colSpan="8" className="py-12 text-center text-slate-500 font-medium">No reimbursements found.</td></tr>
              ) : (
                filteredReimbursements.map(reimb => (
                  <tr key={reimb.uuid} className="hover:bg-slate-50 transition-colors cursor-pointer group" onClick={() => setSelectedReimb(reimb)}>
                    <td className="py-4 px-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-900">{reimb.employee_name || 'Unknown'}</span>
                        <span className="text-xs text-slate-500">{reimb.employee_email}</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-xs text-slate-500 font-mono">{reimb.expense_uuid}</td>
                    <td className="py-4 px-6 text-sm text-slate-900 font-medium max-w-[150px] truncate">{reimb.vendor}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900">₹{reimb.amount}</td>
                    <td className="py-4 px-6 text-sm text-slate-500 whitespace-nowrap">
                      {reimb.expense_date ? new Date(reimb.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '-'}
                    </td>
                    <td className="py-4 px-6">{getReviewStatusBadge(reimb.review_status)}</td>
                    <td className="py-4 px-6">
                      {getReimbursementStatusBadge(reimb.reimbursement_status)}
                      {reimb.reimbursement_status === 'COMPLETED' && (
                        <div className="text-[10px] font-medium text-slate-400 mt-1">
                          Paid: {new Date(reimb.paid_at || reimb.updated_at).toLocaleDateString('en-IN')}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button 
                        onClick={(e) => { e.stopPropagation(); setSelectedReimb(reimb); }}
                        className="text-slate-600 bg-white border border-slate-200 hover:border-slate-300 hover:text-slate-900 px-3 py-1.5 rounded-lg transition-colors font-semibold text-xs focus:outline-none focus:ring-2 focus:ring-slate-900 shadow-sm"
                      >
                        {reimb.reimbursement_status === 'COMPLETED' ? 'View Details' : 'Process'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Action Dialog */}
      {selectedReimb && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity animate-fade-in">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden transform transition-all">
            
            {/* Left side: Receipt & Basic Info */}
            <div className="w-full md:w-5/12 bg-slate-50 border-r border-slate-200 p-6 flex flex-col">
              <h2 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Receipt Attached</h2>
              <div className="flex-1 bg-white rounded-xl border border-slate-200 shadow-sm flex items-center justify-center overflow-hidden min-h-[250px] relative group">
                {selectedReimb.bill_url ? (
                  selectedReimb.bill_url.includes('.pdf') ? (
                    <div className="text-center p-6">
                      <FileImage className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                      <a href={selectedReimb.bill_url} target="_blank" rel="noreferrer" className="text-indigo-600 font-semibold hover:underline underline-offset-2">View PDF Receipt</a>
                    </div>
                  ) : (
                    <a href={selectedReimb.bill_url} target="_blank" rel="noreferrer" className="relative w-full flex items-center justify-center py-4">
                      <img src={selectedReimb.bill_url} alt="Receipt" className="max-w-full max-h-[350px] lg:max-h-[70vh] object-contain" />
                      <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition-colors flex items-center justify-center">
                        <span className="opacity-0 group-hover:opacity-100 bg-white px-3 py-1.5 rounded-md font-medium text-sm text-slate-900 shadow-sm">View Full Image</span>
                      </div>
                    </a>
                  )
                ) : (
                  <div className="text-center p-6 text-slate-400">
                    <FileImage className="w-10 h-10 mx-auto mb-2 opacity-50" />
                    <span className="font-medium text-sm">No Receipt</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right side: Payment Actions */}
            <div className="w-full md:w-7/12 p-6 lg:p-8 relative">
              <button onClick={() => setSelectedReimb(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100">
                <X className="w-5 h-5" />
              </button>
              
              <h2 className="text-2xl font-bold text-slate-900 mb-6">Process Reimbursement</h2>
              
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Employee</p>
                  <p className="font-semibold text-slate-900">{selectedReimb.employee_name}</p>
                  <p className="text-xs text-slate-500">{selectedReimb.employee_phone}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Expense Date</p>
                  <p className="font-medium text-slate-900">{selectedReimb.expense_date ? new Date(selectedReimb.expense_date).toLocaleDateString('en-IN') : '-'}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Description</p>
                  <p className="font-medium text-slate-900">{selectedReimb.description}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Vendor</p>
                  <p className="font-medium text-slate-900">{selectedReimb.vendor}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Expense Status</p>
                  <p className="font-medium text-slate-900">{selectedReimb.review_status}</p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 mb-6 flex justify-between items-center">
                <div>
                  <span className="text-slate-500 uppercase tracking-wider text-xs font-bold block mb-1">Amount to Reimburse</span>
                  <span className="text-xs text-slate-400 font-mono">EXP ID: {selectedReimb.expense_uuid}</span>
                </div>
                <span className="text-4xl font-bold text-slate-900">₹{selectedReimb.amount}</span>
              </div>

              {selectedReimb.reimbursement_status === 'PENDING' ? (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-semibold text-slate-700 mb-2">Transaction Ref / Remarks <span className="text-slate-400 font-normal">(Optional)</span></label>
                    <input 
                      type="text" 
                      value={remarks}
                      onChange={e => setRemarks(e.target.value)}
                      placeholder="e.g. UTR123456789"
                      className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 shadow-sm transition-shadow"
                    />
                  </div>
                  <div className="flex gap-3 mt-auto">
                    <button onClick={() => setSelectedReimb(null)} className="flex-1 py-3 text-slate-600 font-semibold hover:bg-slate-50 border border-slate-300 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">Cancel</button>
                    <button onClick={() => handleMarkPaid(selectedReimb.uuid)} className="flex-[2] bg-slate-900 text-white font-bold py-3 rounded-xl shadow-md hover:bg-black hover:shadow-lg transition-all flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2">
                      <CheckCircle className="w-5 h-5" /> Mark as Paid
                    </button>
                  </div>
                </>
              ) : (
                <div className="mt-auto">
                  <div className="mb-6 bg-slate-50 p-4 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-xs uppercase tracking-wider font-semibold text-slate-500">Payment Remarks</p>
                      <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-700 px-2 py-1 rounded">Paid on {new Date(selectedReimb.paid_at || selectedReimb.updated_at).toLocaleDateString('en-IN')}</span>
                    </div>
                    <p className="text-slate-900 font-medium">{selectedReimb.remarks || "No remarks provided."}</p>
                  </div>
                  <button onClick={() => setSelectedReimb(null)} className="w-full py-3 bg-slate-800 text-white font-bold hover:bg-slate-900 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 shadow-md">Close</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminReimbursements;
