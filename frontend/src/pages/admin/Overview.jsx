import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../../services/api';
import { DollarSign, FileText, CheckCircle, XCircle, Users, Activity, Building2, CreditCard, Receipt } from 'lucide-react';
import GlobalDateFilter from '../../components/GlobalDateFilter';

const Overview = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const params = Object.fromEntries(searchParams.entries());
        // Default to this_month if no filter is set in URL
        if (!params.preset && !params.from) {
          params.preset = 'this_month';
        }
        const res = await api.get('/dashboard/overview', { params });
        setStats(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [searchParams]);

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 bg-slate-200 rounded w-24"></div>
        <div className="w-8 h-8 bg-slate-100 rounded"></div>
      </div>
      <div className="h-8 bg-slate-200 rounded w-32 mt-2"></div>
    </div>
  );

  const StatCard = ({ title, value, icon: Icon, subtitle }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all duration-300 group">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-slate-500 text-sm font-semibold tracking-tight">{title}</h3>
        <Icon className="w-5 h-5 text-slate-400 group-hover:text-slate-900 transition-colors" />
      </div>
      <p className="text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
      {subtitle && <p className="text-xs text-slate-500 mt-2 font-medium">{subtitle}</p>}
    </div>
  );

  if (loading) return (
    <div className="max-w-7xl mx-auto pb-12">
      <div className="h-8 bg-slate-200 rounded w-64 mb-8 animate-pulse"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
      <div className="h-6 bg-slate-200 rounded w-48 mb-4 animate-pulse"></div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
        <SkeletonCard /><SkeletonCard /><SkeletonCard />
      </div>
    </div>
  );

  if (!stats) return <div className="p-4 md:p-8 text-slate-500">Failed to load stats.</div>;

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Dashboard Overview</h1>
      </div>

      <GlobalDateFilter />

      {/* Primary Financial KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
        <StatCard
          title="Expenses"
          value={`₹${stats.total_expenses?.toLocaleString() || 0}`}
          icon={DollarSign}
        />
        <StatCard
          title="Pending Reviews"
          value={stats.pending_reviews}
          icon={FileText}
        />
        <StatCard
          title="Pending Reimbursements"
          value={`₹${stats.pending_reimbursements?.toLocaleString() || 0}`}
          icon={Activity}
        />
        <StatCard
          title="Completed Reimbursements"
          value={`₹${stats.total_reimbursed_amount?.toLocaleString() || 0}`}
          icon={CheckCircle}
        />
      </div>

      {/* Analytics & Metrics */}
      <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Analytics</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-10">
        <StatCard
          title="GST Bills"
          value={`${stats.gst_bills_count || 0}`}
          icon={Receipt}
        />
        <StatCard
          title="Non-GST Bills"
          value={`${stats.non_gst_bills_count || 0}`}
          icon={Receipt}
        />
        <StatCard
          title="Active Users"
          value={stats.employees_submitted}
          subtitle={`Out of ${stats.total_employees} Total Employees`}
          icon={Users}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-10">
        {/* Payment Splits */}
        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">Payment Sources</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Company Paid</span>
              </div>
              <span className="font-bold text-slate-900 text-lg">₹{stats.company_paid_expenses?.toLocaleString() || 0}</span>
            </div>

            <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
              <div className="flex items-center gap-3">
                <CreditCard className="w-5 h-5 text-slate-400" />
                <span className="text-sm font-semibold text-slate-700">Personal Paid</span>
              </div>
              <span className="font-bold text-slate-900 text-lg">₹{stats.personal_paid_expenses?.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center items-start group hover:border-slate-300 transition-colors">
            <CheckCircle className="w-6 h-6 text-emerald-400 group-hover:text-emerald-500 mb-4 transition-colors" />
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stats.approved_expenses || 0}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Approved</p>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm flex flex-col justify-center items-start group hover:border-slate-300 transition-colors">
            <XCircle className="w-6 h-6 text-red-400 group-hover:text-red-500 mb-4 transition-colors" />
            <p className="text-2xl font-bold text-slate-900 tracking-tight">{stats.rejected_expenses || 0}</p>
            <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mt-1">Rejected</p>
          </div>
        </div>
      </div>
    </div>

  );
};

export default Overview;
