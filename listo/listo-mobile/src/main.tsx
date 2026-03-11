import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setDefaultConfig } from 'antd-mobile';
import enUS from 'antd-mobile/es/locales/en-US';
import { AuthProvider } from '@shared/contexts/AuthContext';
import App from './App';
import './index.css';

setDefaultConfig({ locale: enUS });

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
