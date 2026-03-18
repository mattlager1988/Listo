import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import enUS from 'antd/locale/en_US';
import { ProConfigProvider } from '@ant-design/pro-components';
import { AuthProvider } from './contexts/AuthContext';
import { listoTheme } from './theme/theme';
import ProtectedRoute from './components/ProtectedRoute';
import MainLayout from './layouts/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import UserManagement from './pages/UserManagement';
import FinanceLayout from './pages/finance';
import Accounts from './pages/finance/Accounts';
import CyclePlans from './pages/finance/CyclePlans';
import CyclePlanWork from './pages/finance/CyclePlanWork';
import AdminLayout from './pages/admin';
import ListManager from './pages/admin/ListManager';
import ListoSettings from './pages/admin/ListoSettings';
import AviationLayout from './pages/aviation';
import TrainingTracker from './pages/aviation/TrainingTracker';
import AviationDocuments from './pages/aviation/Documents';
import FinanceDocuments from './pages/finance/Documents';
import Notes from './pages/aviation/Notes';
import PasswordsLayout from './pages/passwords';
import Passwords from './pages/passwords/Passwords';
import TasksLayout from './pages/tasks';
import Boards from './pages/tasks/Boards';
import Backlog from './pages/tasks/Backlog';
import BoardView from './pages/tasks/BoardView';

function App() {
  return (
    <ConfigProvider theme={listoTheme} locale={enUS}>
      <ProConfigProvider>
        <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="profile" element={<Profile />} />
              <Route path="settings" element={<Settings />} />
              <Route path="finance" element={<FinanceLayout />}>
                <Route index element={<Accounts />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="cycleplans" element={<CyclePlans />} />
                <Route path="cycleplans/:id" element={<CyclePlanWork />} />
                <Route path="documents" element={<FinanceDocuments />} />
              </Route>
              <Route path="aviation" element={<AviationLayout />}>
                <Route index element={<TrainingTracker />} />
                <Route path="training" element={<TrainingTracker />} />
                <Route path="documents" element={<AviationDocuments />} />
                <Route path="notes" element={<Notes />} />
              </Route>
              <Route path="passwords" element={<PasswordsLayout />}>
                <Route index element={<Passwords />} />
              </Route>
              <Route path="tasks" element={<TasksLayout />}>
                <Route index element={<Boards />} />
                <Route path="boards" element={<Boards />} />
                <Route path="boards/:id" element={<BoardView />} />
                <Route path="backlog" element={<Backlog />} />
              </Route>
              <Route
                path="admin"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <AdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<Navigate to="/admin/users" replace />} />
                <Route path="users" element={<UserManagement />} />
                <Route path="lists" element={<ListManager />} />
                <Route path="settings" element={<ListoSettings />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
        </AuthProvider>
      </ProConfigProvider>
    </ConfigProvider>
  );
}

export default App;
