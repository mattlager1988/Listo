import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TabBar, SafeArea } from 'antd-mobile';
import {
  AppOutline,
  BillOutline,
  HistogramOutline,
  UserOutline,
} from 'antd-mobile-icons';
import { useAuth } from '@shared/contexts/AuthContext';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/finance/Accounts';
import AccountDetail from './pages/finance/AccountDetail';
import AccountForm from './pages/finance/AccountForm';
import PostPayment from './pages/finance/PostPayment';
import CyclePlans from './pages/finance/CyclePlans';
import CyclePlanDetail from './pages/finance/CyclePlanDetail';
import CyclePlanForm from './pages/finance/CyclePlanForm';
import TransactionForm from './pages/finance/TransactionForm';
import Profile from './pages/Profile';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', color: '#8c8c8c' }}>
        Loading...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

const tabs = [
  { key: '/', title: 'Home', icon: <AppOutline /> },
  { key: '/bills', title: 'Bills', icon: <BillOutline /> },
  { key: '/cycle', title: 'Cycle', icon: <HistogramOutline /> },
  { key: '/profile', title: 'Profile', icon: <UserOutline /> },
];

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeKey = tabs.find(t =>
    t.key === '/' ? location.pathname === '/' : location.pathname.startsWith(t.key)
  )?.key || '/';

  return (
    <>
      <SafeArea position="top" />
      <div className="app-content">
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      <div className="app-bottom-bar">
        <TabBar activeKey={activeKey} onChange={key => navigate(key)}>
          {tabs.map(tab => (
            <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
          ))}
        </TabBar>
      </div>
    </>
  );
};

const App: React.FC = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="bills" element={<Accounts />} />
          <Route path="bills/new" element={<AccountForm />} />
          <Route path="bills/:id" element={<AccountDetail />} />
          <Route path="bills/:id/edit" element={<AccountForm />} />
          <Route path="bills/:id/pay" element={<PostPayment />} />
          <Route path="cycle" element={<CyclePlans />} />
          <Route path="cycle/new" element={<CyclePlanForm />} />
          <Route path="cycle/:id" element={<CyclePlanDetail />} />
          <Route path="cycle/:id/edit" element={<CyclePlanForm />} />
          <Route path="cycle/:id/transaction/new" element={<TransactionForm />} />
          <Route path="cycle/:id/transaction/:txnId/edit" element={<TransactionForm />} />
          <Route path="profile" element={<Profile />} />
          <Route path="*" element={
            <div style={{ padding: 48, textAlign: 'center' }}>
              <h2>Page Not Found</h2>
              <p style={{ color: '#8c8c8c' }}>Route: {window.location.pathname}</p>
            </div>
          } />
        </Route>
      </Route>
    </Routes>
  );
};

export default App;
