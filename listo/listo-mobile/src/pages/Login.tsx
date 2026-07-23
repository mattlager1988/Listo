import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Toast, PasscodeInput, SafeArea } from 'antd-mobile';
import { useAuth } from '@shared/contexts/AuthContext';

interface RequestError {
  response?: { status?: number; data?: { message?: string } };
  request?: unknown;
  code?: string;
}

// Turns a login/MFA failure into a message that tells the user whether the
// problem is their credentials or their connection to the app.
const getAuthErrorMessage = (err: unknown, invalidCredentialsMessage: string): string => {
  const error = err as RequestError;

  // No response received: the request never reached the API (server down, no
  // network, DNS failure, or a timeout). This is a connectivity problem, not
  // a credentials problem.
  if (!error.response) {
    return "Can't reach Listo. Check your connection and try again.";
  }

  const status = error.response.status;

  // The server is up but failing — don't blame the user's credentials.
  if (status !== undefined && status >= 500) {
    return 'Listo is having a problem right now. Please try again shortly.';
  }

  return error.response.data?.message || invalidCredentialsMessage;
};

const Login: React.FC = () => {
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mfaMode, setMfaMode] = useState(false);
  const [mfaToken, setMfaToken] = useState('');

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values.email, values.password);
      if (result.requiresMfa) {
        setMfaMode(true);
        setMfaToken(result.mfaToken || '');
      } else {
        navigate('/', { replace: true });
      }
    } catch (err: unknown) {
      Toast.show({ icon: 'fail', content: getAuthErrorMessage(err, 'Invalid email or password') });
    } finally {
      setLoading(false);
    }
  };

  const handleMfa = async (code: string) => {
    if (code.length !== 6) return;
    setLoading(true);
    try {
      await verifyMfa(mfaToken, code);
      navigate('/', { replace: true });
    } catch (err: unknown) {
      Toast.show({ icon: 'fail', content: getAuthErrorMessage(err, 'Invalid MFA code') });
    } finally {
      setLoading(false);
    }
  };

  if (mfaMode) {
    return (
      <div style={{ padding: 24, paddingTop: 80, textAlign: 'center' }}>
        <SafeArea position="top" />
        <img src="/logo-64.png" alt="Listo" style={{ width: 48, height: 48, marginBottom: 16 }} />
        <h2 style={{ marginBottom: 8 }}>Two-Factor Authentication</h2>
        <p style={{ color: '#8c8c8c', marginBottom: 24 }}>
          Enter the 6-digit code from your authenticator app
        </p>
        <PasscodeInput length={6} onFill={handleMfa} />
        {loading && <p style={{ color: '#8c8c8c', marginTop: 16 }}>Verifying...</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: 24, paddingTop: 80 }}>
      <SafeArea position="top" />
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <img src="/logo-64.png" alt="Listo" style={{ width: 48, height: 48, marginBottom: 8 }} />
        <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>LISTO</h1>
      </div>
      <Form
        onFinish={handleLogin}
        layout="vertical"
        footer={
          <Button
            block
            type="submit"
            color="primary"
            size="large"
            loading={loading}
          >
            Sign In
          </Button>
        }
      >
        <Form.Item name="email" label="Email" rules={[{ required: true, message: 'Email is required' }]}>
          <Input name="email" type="email" placeholder="you@example.com" autoComplete="username" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }]}>
          <Input name="password" type="password" placeholder="Password" autoComplete="current-password" />
        </Form.Item>
      </Form>
    </div>
  );
};

export default Login;
