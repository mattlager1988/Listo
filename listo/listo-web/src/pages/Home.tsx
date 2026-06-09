import React from 'react';
import { Navigate } from 'react-router-dom';
import { Empty } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import { hasModule, MODULE_KEYS } from '../utils/modules';
import Dashboard from './Dashboard';

// Landing route. If the user has the Dashboard module, show it; otherwise
// redirect to the first module they can access (in sidebar order). This keeps
// users without Dashboard (e.g. a Messaging-only account) from landing on a
// dashboard they can't use.
const FALLBACK_ROUTES: { key: string; path: string }[] = [
  { key: MODULE_KEYS.finance, path: '/finance/accounts' },
  { key: MODULE_KEYS.aviation, path: '/aviation/training' },
  { key: MODULE_KEYS.messaging, path: '/messaging' },
  { key: MODULE_KEYS.passwords, path: '/passwords' },
  { key: MODULE_KEYS.tasks, path: '/tasks/boards' },
];

const Home: React.FC = () => {
  const { user } = useAuth();

  if (hasModule(user, MODULE_KEYS.dashboard)) {
    return <Dashboard />;
  }

  const target = FALLBACK_ROUTES.find((r) => hasModule(user, r.key));
  if (target) {
    return <Navigate to={target.path} replace />;
  }

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Empty description="You don't have access to any modules yet. Please contact your administrator." />
    </div>
  );
};

export default Home;
