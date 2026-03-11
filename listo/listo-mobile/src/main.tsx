import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { setDefaultConfig, unstableSetRender } from 'antd-mobile';
import enUS from 'antd-mobile/es/locales/en-US';
import { AuthProvider } from '@shared/contexts/AuthContext';
import App from './App';
import './index.css';

// Configure antd-mobile to use React 19's createRoot API for imperative rendering
// (Dialog.confirm, Toast.show, etc.) since React 19 removed ReactDOM.render
unstableSetRender((node, container) => {
  const root = (container as any)._reactRoot || ReactDOM.createRoot(container);
  (container as any)._reactRoot = root;
  root.render(node);
  return () => {
    setTimeout(() => {
      root.unmount();
      delete (container as any)._reactRoot;
    });
  };
});

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
