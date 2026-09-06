import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import PageTransition from './components/PageTransition';
import { AuthContext, AuthProvider } from './contexts/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import AddExpense from './pages/AddExpense';
import SnacksTracker from './pages/SnacksTracker';

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

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
        <Route path="/register" element={<PageTransition><Register /></PageTransition>} />
        <Route path="/forgot-password" element={<PageTransition><ForgotPassword /></PageTransition>} />
        <Route path="/admin/login" element={<PageTransition><AdminLogin /></PageTransition>} />
        
        {/* Employee Routes */}
        <Route path="/" element={<PrivateRoute><PageTransition><Dashboard /></PageTransition></PrivateRoute>} />
        <Route path="/add-expense" element={<PrivateRoute><PageTransition><AddExpense /></PageTransition></PrivateRoute>} />
        <Route path="/snacks" element={<PrivateRoute><PageTransition><SnacksTracker /></PageTransition></PrivateRoute>} />

        {/* Admin Routes */}
        <Route path="/admin" element={<AdminRoute><PageTransition><AdminLayout /></PageTransition></AdminRoute>}>
          <Route index element={<Overview />} />
          <Route path="expenses" element={<AdminExpenses />} />
          <Route path="reimbursements" element={<AdminReimbursements />} />
          <Route path="employees" element={<AdminEmployees />} />
          <Route path="reports" element={<AdminReports />} />
          <Route path="payroll" element={<div className="p-8"><h1 className="text-2xl font-bold mb-4">Payroll</h1><p className="text-gray-500">Coming Soon</p></div>} />
        </Route>
      </Routes>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AnimatedRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
