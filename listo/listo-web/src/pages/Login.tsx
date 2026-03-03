import React, { useState } from 'react';
import { Form, Input, Button, Card, Typography, Alert, Space } from 'antd';
import { UserOutlined, LockOutlined, SafetyOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Title, Text } = Typography;

const Login: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaToken, setMfaToken] = useState<string | null>(null);
  const { login, verifyMfa } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (values: { email: string; password: string }) => {
    setLoading(true);
    setError(null);
    try {
      const result = await login(values.email, values.password);
      if (result.requiresMfa) {
        setMfaRequired(true);
        setMfaToken(result.mfaToken!);
      } else {
        navigate('/');
      }
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleMfaVerify = async (values: { code: string }) => {
    if (!mfaToken) return;
    setLoading(true);
    setError(null);
    try {
      await verifyMfa(mfaToken, values.code);
      navigate('/');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || 'Invalid MFA code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #1890ff 0%, #001529 100%)',
    }}>
      <Card style={{ width: 400, boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div style={{ textAlign: 'center' }}>
            <img src="/logo-128.png" alt="Listo" style={{ width: 80, height: 80, marginBottom: 8 }} />
            <Title level={2} style={{ margin: 0, color: '#1890ff' }}>LISTO</Title>
            <Text type="secondary">
              {mfaRequired ? 'Enter your verification code' : 'Sign in to your account'}
            </Text>
          </div>

          {error && <Alert message={error} type="error" showIcon />}

          {!mfaRequired ? (
            <Form onFinish={handleLogin} layout="vertical">
              <Form.Item
                name="email"
                rules={[
                  { required: true, message: 'Please enter your email' },
                  { type: 'email', message: 'Please enter a valid email' },
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="Email"
                  size="large"
                />
              </Form.Item>

              <Form.Item
                name="password"
                rules={[{ required: true, message: 'Please enter your password' }]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="Password"
                  size="large"
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Sign In
                </Button>
              </Form.Item>
            </Form>
          ) : (
            <Form onFinish={handleMfaVerify} layout="vertical">
              <Form.Item
                name="code"
                rules={[
                  { required: true, message: 'Please enter the verification code' },
                  { len: 6, message: 'Code must be 6 digits' },
                ]}
              >
                <Input
                  prefix={<SafetyOutlined />}
                  placeholder="6-digit code"
                  size="large"
                  maxLength={6}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Verify
                </Button>
              </Form.Item>

              <Button
                type="link"
                block
                onClick={() => {
                  setMfaRequired(false);
                  setMfaToken(null);
                  setError(null);
                }}
              >
                Back to login
              </Button>
            </Form>
          )}
        </Space>
      </Card>
    </div>
  );
};

export default Login;
