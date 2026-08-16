import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { Download, FileSpreadsheet, Loader2 } from 'lucide-react';
import CustomSelect from '../../components/CustomSelect';
import GlobalDateFilter from '../../components/GlobalDateFilter';

const AdminReports = () => {
  const [expenses, setExpenses] = useState([]);
  const [reimbursements, setReimbursements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  
  // Filters
  const [reportType, setReportType] = useState('EXPENSES'); // EXPENSES, REIMBURSEMENTS, GST

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const params = Object.fromEntries(searchParams.entries());
        if (!params.preset && !params.from) {
          params.preset = 'this_month';
        }
        const [expRes, reimbRes] = await Promise.all([
          api.get('/dashboard/expenses', { params }),
          api.get('/dashboard/reimbursements', { params })
        ]);
        setExpenses(expRes.data);
        setReimbursements(reimbRes.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [searchParams]);

  const getFilteredData = () => {
    let dataToFilter = [];
    if (reportType === 'EXPENSES' || reportType === 'GST') {
      dataToFilter = expenses;
    } else if (reportType === 'REIMBURSEMENTS') {
      dataToFilter = reimbursements;
    }

    return dataToFilter.filter(item => {
      // GST Filter
      if (reportType === 'GST' && !item.gst_bill) return false;
      return true;
    });
  };

  const convertToCSV = (data) => {
    if (data.length === 0) return '';
    
    // Define headers based on report type
    let headers = [];
    let keys = [];

    if (reportType === 'EXPENSES' || reportType === 'GST') {
      headers = ['Expense ID', 'Employee Name', 'Email', 'Date', 'Description', 'Category', 'Vendor', 'Amount', 'Paid Using', 'GST Bill', 'Status'];
      keys = ['uuid', 'employee_name', 'employee_email', 'expense_date', 'description', 'main_category', 'vendor', 'amount', 'paid_using', 'gst_bill', 'review_status'];
    } else if (reportType === 'REIMBURSEMENTS') {
      headers = ['Reimbursement ID', 'Expense ID', 'Employee Name', 'Expense Date', 'Vendor', 'Amount', 'Reimbursement Status', 'Reimbursement Date', 'Remarks'];
      keys = ['uuid', 'expense_uuid', 'employee_name', 'expense_date', 'vendor', 'amount', 'reimbursement_status', 'paid_at', 'remarks'];
    }

    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = keys.map(k => {
        let val = row[k];
        if ((k === 'expense_date' || k === 'paid_at') && val) val = new Date(val).toLocaleDateString('en-IN');
        if (val === undefined || val === null) val = '';
        
        // Escape quotes and commas
        val = String(val).replace(/"/g, '""');
        if (val.search(/("|,|\n)/g) >= 0) val = `"${val}"`;
        return val;
      });
      csvRows.push(values.join(','));
    }

    return csvRows.join('\n');
  };

  const downloadCSV = () => {
    const data = getFilteredData();
    if (data.length === 0) {
      alert("No data available to export for the selected filters.");
      return;
    }

    const csvData = convertToCSV(data);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    let filename = `${reportType.toLowerCase()}_report`;
    
    link.setAttribute('download', `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredCount = getFilteredData().length;
  const filteredTotal = getFilteredData().reduce((sum, item) => sum + parseFloat(item.amount || 0), 0);

  if (loading && (expenses.length === 0 && reimbursements.length === 0)) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-[95rem] mx-auto h-full flex flex-col pb-12 animate-fade-in">
      <div className="flex flex-col justify-between mb-8 mt-4 sm:mt-0">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Reports & Exports</h1>
        <p className="text-slate-500 text-sm mt-1">Generate and download financial reports for reconciliation.</p>
      </div>
      
      <GlobalDateFilter />

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 md:p-8 mb-8">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-6">
            <FileSpreadsheet className="w-5 h-5 text-slate-400" />
            Report Configuration
          </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Report Type</label>
            <CustomSelect 
              value={reportType}
              onChange={setReportType}
              options={[
                { value: 'EXPENSES', label: 'All Expenses Report' },
                { value: 'REIMBURSEMENTS', label: 'Reimbursements Report' },
                { value: 'GST', label: 'GST Input Tax Report' },
              ]}
              className="w-full"
            />
          </div>
        </div>

        <div className="bg-slate-50 border border-slate-200 p-6 rounded-xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex gap-8 w-full md:w-auto">
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">Records Found</p>
              <p className="text-3xl font-bold text-slate-900">{filteredCount}</p>
            </div>
            <div>
              <p className="text-[10px] font-bold tracking-widest uppercase text-slate-500 mb-1">Total Value</p>
              <p className="text-3xl font-bold text-slate-900">₹{filteredTotal.toLocaleString()}</p>
            </div>
          </div>
          
          <button 
            onClick={downloadCSV}
            className="w-full md:w-auto bg-slate-900 hover:bg-black text-white px-8 py-3.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={filteredCount === 0 || loading}
          >
            <Download className="w-5 h-5" />
            {loading ? 'Processing...' : 'Export to CSV'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AdminReports;
