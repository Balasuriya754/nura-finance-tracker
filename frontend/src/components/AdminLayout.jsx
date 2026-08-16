import React, { useContext, useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { LayoutDashboard, Receipt, CreditCard, Users, DollarSign, LogOut, Menu, X, FileText } from 'lucide-react';
import { AuthContext } from '../contexts/AuthContext';

import LogoutConfirmModal from './LogoutConfirmModal';

const AdminLayout = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  const confirmLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin', icon: LayoutDashboard },
    { name: 'Expenses', path: '/admin/expenses', icon: Receipt },
    { name: 'Reimbursements', path: '/admin/reimbursements', icon: CreditCard },
    { name: 'Employees', path: '/admin/employees', icon: Users },
    { name: 'Reports', path: '/admin/reports', icon: FileText },
    { name: 'Payroll', path: '/admin/payroll', icon: DollarSign },
  ];

  return (
    <div className="flex h-screen bg-slate-50 font-sans">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/50 z-40 md:hidden transition-opacity" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-slate-200">
          <span className="text-xl font-bold text-slate-900 tracking-tight">Admin Portal</span>
          <button 
            className="md:hidden text-slate-500 hover:text-slate-700 focus:outline-none"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <X className="w-6 h-6" />
          </button>
        </div>
        
        <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === '/admin' && location.pathname === '/admin');
            return (
              <NavLink
                key={item.name}
                to={item.path}
                end={item.path === '/admin'}
                onClick={() => setIsMobileMenuOpen(false)}
                className={`flex items-center px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-slate-100 text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <item.icon className={`w-5 h-5 mr-3 flex-shrink-0 ${isActive ? 'text-slate-900' : 'text-slate-400'}`} />
                {item.name}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200">
          <div className="flex items-center gap-3 mb-4 px-2">
            <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-700 font-bold border border-slate-200 shadow-sm shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">{user?.name || 'Admin User'}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email || 'admin@company.com'}</p>
            </div>
          </div>
          <button
            onClick={() => setShowLogoutModal(true)}
            className="group flex w-full items-center px-4 py-2.5 text-sm font-medium text-slate-600 rounded-xl hover:bg-red-50 hover:text-red-700 transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3 text-slate-400 group-hover:text-red-500 transition-colors" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50">
        {/* Mobile Header */}
        <header className="md:hidden h-16 bg-white border-b border-slate-200 flex items-center px-4 shrink-0">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="text-slate-500 hover:text-slate-700 focus:outline-none p-2 rounded-md"
          >
            <Menu className="w-6 h-6" />
          </button>
          <span className="ml-4 text-lg font-bold text-slate-900">Finance Tracker</span>
        </header>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </div>
      </main>

      <LogoutConfirmModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={confirmLogout}
      />
    </div>
  );
};

export default AdminLayout;
