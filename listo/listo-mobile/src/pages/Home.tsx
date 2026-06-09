import React from 'react';
import { Navigate } from 'react-router-dom';
import { ErrorBlock } from 'antd-mobile';
import { useAuth } from '@shared/contexts/AuthContext';
import { hasModule, MODULE_KEYS } from '@shared/utils/modules';
import Dashboard from './Dashboard';

// Landing route. Show the Dashboard if the user has that module; otherwise
// redirect to the first module they can access (so a Messaging-only account
// lands on Messaging instead of a dashboard it can't use).
const FALLBACK_ROUTES: { key: string; path: string }[] = [
  { key: MODULE_KEYS.finance, path: '/bills' },
  { key: MODULE_KEYS.aviation, path: '/aviation/training' },
  { key: MODULE_KEYS.messaging, path: '/messaging' },
  { key: MODULE_KEYS.passwords, path: '/passwords' },
  { key: MODULE_KEYS.tasks, path: '/tasks/backlog' },
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
    <ErrorBlock
      status="empty"
      title="No modules available"
      description="Please contact your administrator."
    />
  );
};

export default Home;
