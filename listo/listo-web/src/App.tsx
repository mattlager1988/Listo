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
import LksemLayout from './pages/lksem';
import Accounts from './pages/lksem/Accounts';
import ListManager from './pages/lksem/ListManager';

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
              <Route path="lksem" element={<LksemLayout />}>
                <Route index element={<Accounts />} />
                <Route path="accounts" element={<Accounts />} />
                <Route path="lists" element={<ListManager />} />
              </Route>
              <Route
                path="users"
                element={
                  <ProtectedRoute requiredRole="admin">
                    <UserManagement />
                  </ProtectedRoute>
                }
              />
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
