import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { User, Search, X, Loader2, DollarSign, CheckCircle, XCircle, FileText, CreditCard, Building2 } from 'lucide-react';

const AdminEmployees = () => {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Employee Profile Modal State
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState(null);

  const fetchEmployees = async () => {
    try {
      const res = await api.get('/dashboard/employees');
      setEmployees(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, []);

  const openEmployeeProfile = async (employee) => {
    setSelectedEmployee(employee);
    setProfileLoading(true);
    try {
      const res = await api.get(`/dashboard/employees/${employee.uuid}`);
      setProfileData(res.data);
    } catch (err) {
      console.error(err);
      alert("Failed to load employee profile");
    } finally {
      setProfileLoading(false);
    }
  };

  const filteredEmployees = employees.filter(e => {
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        (e.name && e.name.toLowerCase().includes(q)) ||
        (e.email && e.email.toLowerCase().includes(q)) ||
        (e.uuid && e.uuid.toLowerCase().includes(q)) ||
        (e.phone && e.phone.toString().includes(q))
      );
    }
    return true;
  });

  const StatCard = ({ title, value, icon: Icon }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm group hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-slate-500 text-xs font-semibold tracking-wider uppercase">{title}</h3>
        <Icon className="w-4 h-4 text-slate-400 group-hover:text-slate-900 transition-colors" />
      </div>
      <p className="text-xl font-bold text-slate-900 tracking-tight">{value}</p>
    </div>
  );

  return (
    <div className="max-w-[95rem] mx-auto h-full flex flex-col pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 mt-4 sm:mt-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Employees</h1>
      </div>
      
      <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6 flex flex-wrap gap-4 items-center">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search employee by name, email, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                <th className="py-4 px-6 whitespace-nowrap">Employee</th>
                <th className="py-4 px-6 whitespace-nowrap">Phone</th>
                <th className="py-4 px-6 whitespace-nowrap text-right">Total Expenses</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Pending Reviews</th>
                <th className="py-4 px-6 whitespace-nowrap text-right">Pending Reimb</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Dashboard</th>
                <th className="py-4 px-6 whitespace-nowrap text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="flex items-center gap-4"><div className="w-10 h-10 bg-slate-200 rounded-full"></div><div className="h-4 bg-slate-200 rounded w-24"></div></div></td>
                    <td className="py-4 px-6"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-4 bg-slate-200 rounded w-8 mx-auto"></div></td>
                    <td className="py-4 px-6 text-right"><div className="h-4 bg-slate-200 rounded w-16 ml-auto"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto"></div></td>
                    <td className="py-4 px-6 text-center"><div className="h-4 bg-slate-200 rounded w-12 mx-auto"></div></td>
                  </tr>
                ))
              ) : filteredEmployees.length === 0 ? (
                <tr><td colSpan="7" className="py-12 text-center text-slate-500 font-medium">No employees found.</td></tr>
              ) : (
                filteredEmployees.map(employee => (
                  <tr 
                    key={employee.uuid} 
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer group"
                    onClick={() => openEmployeeProfile(employee)}
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-900 font-bold shadow-sm transition-colors">
                          {employee.name ? employee.name.charAt(0).toUpperCase() : <User className="w-4 h-4" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-semibold text-slate-900">{employee.name}</span>
                          <span className="text-xs text-slate-500">{employee.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-sm text-slate-600 font-medium">{employee.phone}</td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900 text-right">₹{(employee.total_expenses_amount || 0).toLocaleString()}</td>
                    <td className="py-4 px-6 text-sm text-center">
                      {employee.pending_reviews_count > 0 ? (
                         <span className="inline-flex items-center justify-center px-2 py-0.5 rounded text-slate-500 font-bold text-xs ring-1 ring-slate-300">{employee.pending_reviews_count}</span>
                      ) : (
                         <span className="text-slate-400 font-medium">-</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-sm font-bold text-slate-900 text-right">
                      {employee.pending_reimbursements_amount > 0 ? `₹${employee.pending_reimbursements_amount.toLocaleString()}` : <span className="text-slate-400 font-medium">-</span>}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {employee.can_access_dashboard ? 
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold text-slate-700 bg-slate-100 uppercase tracking-widest border border-slate-200">Admin</span> : 
                        <span className="inline-flex items-center rounded px-2 py-0.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">User</span>
                      }
                    </td>
                    <td className="py-4 px-6 text-center">
                      {employee.is_active ? 
                        <span className="inline-flex items-center text-xs font-semibold text-emerald-600"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-2"></span>Active</span> : 
                        <span className="inline-flex items-center text-xs font-semibold text-rose-600"><span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-2"></span>Inactive</span>
                      }
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Employee Profile Modal */}
      {selectedEmployee && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex justify-end transition-opacity">
          <div className="bg-slate-50 w-full max-w-4xl h-full shadow-2xl flex flex-col animate-slide-in-right border-l border-slate-200">
            <div className="bg-white flex justify-between items-center px-6 py-4 border-b border-slate-200 shadow-sm z-10">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xl shadow-sm">
                  {selectedEmployee.name ? selectedEmployee.name.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900 tracking-tight">{selectedEmployee.name}</h2>
                  <p className="text-sm text-slate-500 font-medium">{selectedEmployee.email} • {selectedEmployee.phone}</p>
                </div>
              </div>
              <button onClick={() => setSelectedEmployee(null)} className="text-slate-400 hover:text-slate-600 transition-colors p-2 rounded-full hover:bg-slate-100"><X className="w-6 h-6" /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-8">
              {profileLoading ? (
                <div className="flex h-64 items-center justify-center flex-col gap-4">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
                  <p className="text-sm font-medium text-slate-500">Loading employee data...</p>
                </div>
              ) : profileData ? (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <StatCard 
                      title="Total Expenses" 
                      value={`₹${profileData.stats.total_expenses.toLocaleString()}`} 
                      icon={DollarSign} 
                    />
                    <StatCard 
                      title="Approved" 
                      value={profileData.stats.approved_count} 
                      icon={CheckCircle} 
                    />
                    <StatCard 
                      title="Rejected" 
                      value={profileData.stats.rejected_count} 
                      icon={XCircle} 
                    />
                    <StatCard 
                      title="Pending" 
                      value={profileData.stats.pending_count} 
                      icon={FileText} 
                    />
                    <StatCard 
                      title="Personal Paid" 
                      value={`₹${profileData.stats.personal_payments.toLocaleString()}`} 
                      icon={CreditCard} 
                    />
                    <StatCard 
                      title="Company Paid" 
                      value={`₹${profileData.stats.company_payments.toLocaleString()}`} 
                      icon={Building2} 
                    />
                    <StatCard 
                      title="Pending Reimb." 
                      value={`₹${profileData.stats.pending_reimbursements.toLocaleString()}`} 
                      icon={DollarSign} 
                    />
                    <StatCard 
                      title="Completed Reimb." 
                      value={`₹${profileData.stats.completed_reimbursements.toLocaleString()}`} 
                      icon={CheckCircle} 
                    />
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 tracking-tight mb-4">Recent Expense History</h3>
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                      <table className="min-w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-xs uppercase text-slate-500 font-semibold tracking-wider">
                            <th className="py-3 px-4">Date</th>
                            <th className="py-3 px-4">Description</th>
                            <th className="py-3 px-4">Category</th>
                            <th className="py-3 px-4">Amount</th>
                            <th className="py-3 px-4">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {profileData.expenses.length === 0 ? (
                            <tr><td colSpan="5" className="py-8 text-center text-slate-500">No expenses submitted yet.</td></tr>
                          ) : (
                            profileData.expenses.map(exp => (
                              <tr key={exp.uuid} className="hover:bg-slate-50">
                                <td className="py-3 px-4 text-sm text-slate-500">
                                  {new Date(exp.expense_date || exp.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                                </td>
                                <td className="py-3 px-4 text-sm font-medium text-slate-900">{exp.description}</td>
                                <td className="py-3 px-4 text-xs text-slate-500">{exp.main_category}</td>
                                <td className="py-3 px-4 text-sm font-bold text-slate-900">₹{exp.amount}</td>
                                <td className="py-3 px-4 text-xs font-semibold">
                                  {exp.review_status === 'APPROVED' && <span className="text-emerald-600">Approved</span>}
                                  {exp.review_status === 'REJECTED' && <span className="text-rose-600 line-through decoration-rose-300">Rejected</span>}
                                  {exp.review_status === 'PENDING' && <span className="text-amber-600">Pending</span>}
                                  {exp.review_status === 'DRAFT' && <span className="text-slate-500">Draft</span>}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="p-8 text-center text-red-500">Failed to load profile data.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminEmployees;
