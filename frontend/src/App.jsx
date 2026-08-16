import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';

import AdminLayout from './components/AdminLayout';
import AdminLogin from './pages/admin/AdminLogin';
import Overview from './pages/admin/Overview';
import AdminExpenses from './pages/admin/AdminExpenses';
import AdminReimbursements from './pages/admin/AdminReimbursements';
import AdminEmployees from './pages/admin/AdminEmployees';
import AdminReports from './pages/admin/AdminReports';

const PrivateRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/login" />;
  if (user.role === 'admin') return <Navigate to="/admin" />;
  return children;
};

const AdminRoute = ({ children }) => {
  const { user } = useContext(AuthContext);
  if (!user) return <Navigate to="/admin/login" />;
  return user.role === 'admin' ? children : <Navigate to="/" />;
};

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/admin/login" element={<AdminLogin />} />
      
      {/* Employee Routes */}
      <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
      <Route path="/add-expense" element={<PrivateRoute><AddExpense /></PrivateRoute>} />

      {/* Admin Routes */}
      <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
        <Route index element={<Overview />} />
        <Route path="expenses" element={<AdminExpenses />} />
        <Route path="reimbursements" element={<AdminReimbursements />} />
        <Route path="employees" element={<AdminEmployees />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="payroll" element={<div className="p-8"><h1 className="text-2xl font-bold mb-4">Payroll</h1><p className="text-gray-500">Coming Soon</p></div>} />
      </Route>
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
