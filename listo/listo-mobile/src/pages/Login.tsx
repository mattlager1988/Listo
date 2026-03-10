import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Toast, PasscodeInput, SafeArea } from 'antd-mobile';
import { useAuth } from '@shared/contexts/AuthContext';

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
    } catch {
      Toast.show({ icon: 'fail', content: 'Invalid credentials' });
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
    } catch {
      Toast.show({ icon: 'fail', content: 'Invalid MFA code' });
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
          <Input type="email" placeholder="you@example.com" autoComplete="email" />
        </Form.Item>
        <Form.Item name="password" label="Password" rules={[{ required: true, message: 'Password is required' }]}>
          <Input type="password" placeholder="Password" autoComplete="current-password" />
        </Form.Item>
      </Form>
    </div>
  );
};

export default Login;
