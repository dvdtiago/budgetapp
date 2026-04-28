import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MonthProvider } from './lib/MonthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Debts from './pages/Debts.jsx';
import Income from './pages/Income.jsx';
import Budget from './pages/Budget.jsx';
import Transactions from './pages/Transactions.jsx';
import Trends from './pages/Trends.jsx';
import Settings from './pages/Settings.jsx';
import Goals from './pages/Goals.jsx';
import Admin from './pages/Admin.jsx';

function PrivateRoute({ children }) {
  const token = localStorage.getItem('token');
  return token ? children : <Navigate to="/login" replace />;
}

function AdminRoute({ children }) {
  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  if (!token) return <Navigate to="/login" replace />;
  if (!user.isAdmin) return <Navigate to="/dashboard" replace />;
  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/"
          element={
            <PrivateRoute>
              <MonthProvider>
                <Layout />
              </MonthProvider>
            </PrivateRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="debts" element={<Debts />} />
          <Route path="income" element={<Income />} />
          <Route path="budget" element={<Budget />} />
          <Route path="transactions" element={<Transactions />} />
          <Route path="goals" element={<Goals />} />
          <Route path="trends" element={<Trends />} />
          <Route path="settings" element={<Settings />} />
          <Route path="admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
