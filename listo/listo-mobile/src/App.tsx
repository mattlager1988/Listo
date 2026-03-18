import React from 'react';
import { Routes, Route, Navigate, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { TabBar, SafeArea } from 'antd-mobile';
import {
  BillOutline,
  BankcardOutline,
  ClockCircleOutline,
  HistogramOutline,
  TravelOutline,
  FolderOutline,
  FileOutline,
  TeamOutline,
  UnorderedListOutline,
  SetOutline,
  LockOutline,
} from 'antd-mobile-icons';
import { useAuth } from '@shared/contexts/AuthContext';
import { MenuProvider } from './contexts/MenuContext';
import ErrorBoundary from './components/ErrorBoundary';
import HamburgerDrawer from './components/HamburgerDrawer';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Accounts from './pages/finance/Accounts';
import AccountDetail from './pages/finance/AccountDetail';
import AccountForm from './pages/finance/AccountForm';
import PendingPayments from './pages/finance/PendingPayments';
import PostPayment from './pages/finance/PostPayment';
import EditPayment from './pages/finance/EditPayment';
import CyclePlans from './pages/finance/CyclePlans';
import CyclePlanDetail from './pages/finance/CyclePlanDetail';
import CyclePlanForm from './pages/finance/CyclePlanForm';
import TransactionForm from './pages/finance/TransactionForm';
import Cards from './pages/finance/Cards';
import Docs from './pages/finance/Docs';
import Profile from './pages/Profile';
import Training from './pages/aviation/Training';
import TrainingDetail from './pages/aviation/TrainingDetail';
import TrainingForm from './pages/aviation/TrainingForm';
import AviationDocuments from './pages/aviation/Documents';
import AviationNotes from './pages/aviation/Notes';
import NoteDetail from './pages/aviation/NoteDetail';
import NoteForm from './pages/aviation/NoteForm';
import Passwords from './pages/passwords/Passwords';
import PasswordForm from './pages/passwords/PasswordForm';
import AdminUsers from './pages/admin/Users';
import AdminLists from './pages/admin/Lists';
import AdminSettings from './pages/admin/Settings';

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

interface TabConfig {
  key: string;
  title: string;
  icon: React.ReactNode;
}

const FINANCE_TABS: TabConfig[] = [
  { key: '/bills', title: 'Accounts', icon: <BillOutline /> },
  { key: '/cards', title: 'Cards', icon: <BankcardOutline /> },
  { key: '/pending', title: 'Pending', icon: <ClockCircleOutline /> },
  { key: '/cycle', title: 'Cycle Plans', icon: <HistogramOutline /> },
  { key: '/docs', title: 'Docs', icon: <FileOutline /> },
];

const AVIATION_TABS: TabConfig[] = [
  { key: '/aviation/training', title: 'Training', icon: <TravelOutline /> },
  { key: '/aviation/documents', title: 'Documents', icon: <FolderOutline /> },
  { key: '/aviation/notes', title: 'Notes', icon: <FileOutline /> },
];

const PASSWORDS_TABS: TabConfig[] = [
  { key: '/passwords', title: 'Passwords', icon: <LockOutline /> },
];

const ADMIN_TABS: TabConfig[] = [
  { key: '/admin/users', title: 'Users', icon: <TeamOutline /> },
  { key: '/admin/lists', title: 'Lists', icon: <UnorderedListOutline /> },
  { key: '/admin/settings', title: 'Settings', icon: <SetOutline /> },
];

// Paths that show the bottom tab bar (main list pages only)
const MAIN_PATHS = new Set([
  '/bills',
  '/cards',
  '/pending',
  '/cycle',
  '/docs',
  '/aviation/training',
  '/aviation/documents',
  '/aviation/notes',
  '/passwords',
  '/admin/users',
  '/admin/lists',
  '/admin/settings',
]);

type ActiveModule = 'finance' | 'aviation' | 'passwords' | 'admin' | null;

function getActiveModule(pathname: string): ActiveModule {
  if (pathname.startsWith('/bills') || pathname.startsWith('/cards') || pathname.startsWith('/pending') || pathname.startsWith('/cycle') || pathname.startsWith('/docs')) return 'finance';
  if (pathname.startsWith('/aviation')) return 'aviation';
  if (pathname.startsWith('/passwords')) return 'passwords';
  if (pathname.startsWith('/admin')) return 'admin';
  return null;
}

function getModuleTabs(module: ActiveModule): TabConfig[] {
  switch (module) {
    case 'finance': return FINANCE_TABS;
    case 'aviation': return AVIATION_TABS;
    case 'passwords': return PASSWORDS_TABS;
    case 'admin': return ADMIN_TABS;
    default: return [];
  }
}

const AppLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const activeModule = getActiveModule(location.pathname);
  const tabs = getModuleTabs(activeModule);
  const showTabs = MAIN_PATHS.has(location.pathname);

  const activeKey = tabs.find(t => location.pathname.startsWith(t.key))?.key || '';

  return (
    <MenuProvider>
      <SafeArea position="top" />
      <div className={showTabs ? 'app-content' : 'app-content app-content-no-tabs'}>
        <ErrorBoundary>
          <Outlet />
        </ErrorBoundary>
      </div>
      {showTabs && tabs.length > 0 && (
        <div className="app-bottom-bar">
          <TabBar activeKey={activeKey} onChange={key => navigate(key)}>
            {tabs.map(tab => (
              <TabBar.Item key={tab.key} icon={tab.icon} title={tab.title} />
            ))}
          </TabBar>
        </div>
      )}
      <HamburgerDrawer />
    </MenuProvider>
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
          <Route path="cards" element={<Cards />} />
          <Route path="docs" element={<Docs />} />
          <Route path="pending" element={<PendingPayments />} />
          <Route path="pending/:paymentId/edit" element={<EditPayment />} />
          <Route path="cycle" element={<CyclePlans />} />
          <Route path="cycle/new" element={<CyclePlanForm />} />
          <Route path="cycle/:id" element={<CyclePlanDetail />} />
          <Route path="cycle/:id/edit" element={<CyclePlanForm />} />
          <Route path="cycle/:id/transaction/new" element={<TransactionForm />} />
          <Route path="cycle/:id/transaction/:txnId/edit" element={<TransactionForm />} />
          <Route path="aviation/training" element={<Training />} />
          <Route path="aviation/training/new" element={<TrainingForm />} />
          <Route path="aviation/training/:id" element={<TrainingDetail />} />
          <Route path="aviation/training/:id/edit" element={<TrainingForm />} />
          <Route path="aviation/documents" element={<AviationDocuments />} />
          <Route path="aviation/notes" element={<AviationNotes />} />
          <Route path="aviation/notes/new" element={<NoteForm />} />
          <Route path="aviation/notes/:id" element={<NoteDetail />} />
          <Route path="aviation/notes/:id/edit" element={<NoteForm />} />
          <Route path="passwords" element={<Passwords />} />
          <Route path="passwords/new" element={<PasswordForm />} />
          <Route path="passwords/:id/edit" element={<PasswordForm />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/lists" element={<AdminLists />} />
          <Route path="admin/settings" element={<AdminSettings />} />
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
