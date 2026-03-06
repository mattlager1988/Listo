import React, { useState } from 'react';
import { Typography, Card, Button, Modal, Form, Input, message, Alert, Space, Tag } from 'antd';
import { SafetyOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PageHeader from '../components/PageHeader';

const { Text, Paragraph } = Typography;

const Settings: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [setupModalVisible, setSetupModalVisible] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [manualKey, setManualKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSetupMfa = async () => {
    setLoading(true);
    try {
      const response = await api.get('/auth/mfa/setup');
      setQrCode(response.data.qrCodeBase64);
      setManualKey(response.data.manualEntryKey);
      setSetupModalVisible(true);
    } catch {
      message.error('Failed to setup MFA');
    } finally {
      setLoading(false);
    }
  };

  const handleEnableMfa = async (values: { code: string }) => {
    setLoading(true);
    try {
      await api.post('/auth/mfa/enable', { code: values.code });
      await refreshUser();
      setSetupModalVisible(false);
      setQrCode(null);
      setManualKey(null);
      message.success('MFA enabled successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Invalid verification code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Settings" />

      <Card title="Security" style={{ marginBottom: 24 }}>
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Space>
              <SafetyOutlined style={{ fontSize: 24, color: '#1890ff' }} />
              <div>
                <Text strong>Two-Factor Authentication (MFA)</Text>
                <br />
                <Text type="secondary">
                  Add an extra layer of security to your account
                </Text>
              </div>
              <Tag
                color={user?.mfaEnabled ? 'success' : 'warning'}
                icon={user?.mfaEnabled ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
              >
                {user?.mfaEnabled ? 'Enabled' : 'Disabled'}
              </Tag>
            </Space>
          </div>

          {!user?.mfaEnabled && (
            <Button type="primary" onClick={handleSetupMfa} loading={loading}>
              Enable MFA
            </Button>
          )}

          {user?.mfaEnabled && (
            <Alert
              message="MFA is enabled"
              description="Contact an administrator if you need to reset your MFA."
              type="success"
              showIcon
            />
          )}
        </Space>
      </Card>

      <Modal
        title="Setup Two-Factor Authentication"
        open={setupModalVisible}
        onCancel={() => {
          setSetupModalVisible(false);
          setQrCode(null);
          setManualKey(null);
        }}
        footer={null}
        width={400}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <Paragraph>
            Scan this QR code with your authenticator app (Google Authenticator, Authy, etc.)
          </Paragraph>

          {qrCode && (
            <div style={{ textAlign: 'center' }}>
              <img
                src={`data:image/png;base64,${qrCode}`}
                alt="MFA QR Code"
                style={{ width: 200, height: 200 }}
              />
            </div>
          )}

          <Alert
            message="Manual Entry Key"
            description={<Text code copyable>{manualKey}</Text>}
            type="info"
          />

          <Form onFinish={handleEnableMfa} layout="vertical" size="small" requiredMark={false}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Form.Item
                name="code"
                label="Enter the 6-digit code from your app"
                rules={[
                  { required: true, message: 'Please enter the code' },
                  { len: 6, message: 'Code must be 6 digits' },
                ]}
                style={{ marginBottom: 0 }}
              >
                <Input maxLength={6} placeholder="000000" size="large" />
              </Form.Item>

              <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
                <Button type="primary" htmlType="submit" loading={loading} block>
                  Verify & Enable MFA
                </Button>
              </Form.Item>
            </div>
          </Form>
        </Space>
      </Modal>
    </div>
  );
};

export default Settings;
