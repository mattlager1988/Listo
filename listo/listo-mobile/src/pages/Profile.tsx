import React, { useState } from 'react';
import {
  NavBar,
  List,
  Card,
  Button,
  Form,
  Input,
  Tag,
  Toast,
  Dialog,
  Popup,
  PasscodeInput,
} from 'antd-mobile';
import { useAuth } from '@shared/contexts/AuthContext';
import api from '@shared/services/api';

const Profile: React.FC = () => {
  const { user, logout, refreshUser } = useAuth();

  const [editProfileVisible, setEditProfileVisible] = useState(false);
  const [changePasswordVisible, setChangePasswordVisible] = useState(false);
  const [mfaSetupVisible, setMfaSetupVisible] = useState(false);
  const [mfaData, setMfaData] = useState<{ qrCode: string; manualKey: string } | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handleEditProfile = () => {
    profileForm.setFieldsValue({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
    });
    setEditProfileVisible(true);
  };

  const handleSaveProfile = async () => {
    const values = profileForm.getFieldsValue();
    if (!values.firstName || !values.lastName) {
      Toast.show({ content: 'First and last name are required' });
      return;
    }
    setSubmitting(true);
    try {
      await api.put('/users/me', {
        firstName: values.firstName,
        lastName: values.lastName,
        phoneNumber: values.phoneNumber || null,
      });
      Toast.show({ icon: 'success', content: 'Profile updated' });
      await refreshUser();
      setEditProfileVisible(false);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to update profile' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    const values = passwordForm.getFieldsValue();
    if (!values.currentPassword || !values.newPassword || !values.confirmPassword) {
      Toast.show({ content: 'All fields are required' });
      return;
    }
    if (values.newPassword.length < 16) {
      Toast.show({ content: 'Password must be at least 16 characters' });
      return;
    }
    if (values.newPassword !== values.confirmPassword) {
      Toast.show({ content: 'Passwords do not match' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      Toast.show({ icon: 'success', content: 'Password changed' });
      passwordForm.resetFields();
      setChangePasswordVisible(false);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to change password' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSetupMfa = async () => {
    try {
      const response = await api.get('/auth/mfa/setup');
      setMfaData(response.data);
      setMfaCode('');
      setMfaSetupVisible(true);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to start MFA setup' });
    }
  };

  const handleEnableMfa = async (code: string) => {
    setSubmitting(true);
    try {
      await api.post('/auth/mfa/enable', { code });
      Toast.show({ icon: 'success', content: 'MFA enabled' });
      await refreshUser();
      setMfaSetupVisible(false);
      setMfaData(null);
    } catch {
      Toast.show({ icon: 'fail', content: 'Invalid code, try again' });
      setMfaCode('');
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = await Dialog.confirm({
      content: 'Are you sure you want to log out?',
    });
    if (!confirmed) return;
    await logout();
  };

  return (
    <>
      <NavBar back={null} style={{ '--height': '48px' }}>Profile</NavBar>

      <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* User Info Card */}
        <Card style={{ borderRadius: 8 }}>
          <div style={{ textAlign: 'center', padding: '8px 0' }}>
            <div style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: '#1890ff',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
              fontWeight: 600,
              margin: '0 auto 8px',
            }}>
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {user?.firstName} {user?.lastName}
            </div>
            <div style={{ fontSize: 13, color: '#8c8c8c', marginTop: 2 }}>
              {user?.email}
            </div>
            <div style={{ marginTop: 8 }}>
              <Tag color="primary">{user?.role}</Tag>
              {user?.mfaEnabled && <Tag color="success" style={{ marginLeft: 4 }}>MFA</Tag>}
            </div>
          </div>
        </Card>

        {/* Account Actions */}
        <Card title="Account" style={{ borderRadius: 8 }}>
          <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
            <List.Item onClick={handleEditProfile} arrow>
              Edit Profile
            </List.Item>
            <List.Item onClick={() => { passwordForm.resetFields(); setChangePasswordVisible(true); }} arrow>
              Change Password
            </List.Item>
          </List>
        </Card>

        {/* Security */}
        <Card title="Security" style={{ borderRadius: 8 }}>
          <List style={{ '--border-top': 'none', '--border-bottom': 'none' }}>
            <List.Item
              extra={
                user?.mfaEnabled
                  ? <Tag color="success">Enabled</Tag>
                  : <Tag color="default">Disabled</Tag>
              }
              onClick={user?.mfaEnabled ? undefined : handleSetupMfa}
              arrow={!user?.mfaEnabled}
              description={user?.mfaEnabled ? 'Contact admin to reset' : 'Set up authenticator app'}
            >
              Two-Factor Authentication
            </List.Item>
          </List>
        </Card>

        {/* Logout */}
        <div style={{ padding: '4px 0' }}>
          <Button
            block
            color="danger"
            size="large"
            onClick={handleLogout}
            style={{ borderRadius: 8 }}
          >
            Log Out
          </Button>
        </div>
      </div>

      {/* Edit Profile Popup */}
      <Popup
        visible={editProfileVisible}
        onMaskClick={() => setEditProfileVisible(false)}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, minHeight: '40vh' }}
      >
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span onClick={() => setEditProfileVisible(false)} style={{ color: '#8c8c8c', cursor: 'pointer' }}>
              Cancel
            </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Edit Profile</span>
            <span
              onClick={handleSaveProfile}
              style={{
                color: submitting ? '#8c8c8c' : '#1890ff',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save'}
            </span>
          </div>
          <Form form={profileForm} layout="vertical">
            <Form.Item name="firstName" label="First Name" rules={[{ required: true }]}>
              <Input placeholder="First name" />
            </Form.Item>
            <Form.Item name="lastName" label="Last Name" rules={[{ required: true }]}>
              <Input placeholder="Last name" />
            </Form.Item>
            <Form.Item name="phoneNumber" label="Phone">
              <Input type="tel" placeholder="Phone number (optional)" />
            </Form.Item>
          </Form>
        </div>
      </Popup>

      {/* Change Password Popup */}
      <Popup
        visible={changePasswordVisible}
        onMaskClick={() => setChangePasswordVisible(false)}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, minHeight: '50vh' }}
      >
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span onClick={() => setChangePasswordVisible(false)} style={{ color: '#8c8c8c', cursor: 'pointer' }}>
              Cancel
            </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Change Password</span>
            <span
              onClick={handleChangePassword}
              style={{
                color: submitting ? '#8c8c8c' : '#1890ff',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save'}
            </span>
          </div>
          <Form form={passwordForm} layout="vertical">
            <Form.Item name="currentPassword" label="Current Password" rules={[{ required: true }]}>
              <Input type="password" placeholder="Current password" />
            </Form.Item>
            <Form.Item name="newPassword" label="New Password" rules={[{ required: true }]}>
              <Input type="password" placeholder="Min 16 characters" />
            </Form.Item>
            <Form.Item name="confirmPassword" label="Confirm Password" rules={[{ required: true }]}>
              <Input type="password" placeholder="Confirm new password" />
            </Form.Item>
          </Form>
        </div>
      </Popup>

      {/* MFA Setup Popup */}
      <Popup
        visible={mfaSetupVisible}
        onMaskClick={() => setMfaSetupVisible(false)}
        position="bottom"
        bodyStyle={{ borderTopLeftRadius: 12, borderTopRightRadius: 12, minHeight: '60vh' }}
      >
        <div style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <span onClick={() => setMfaSetupVisible(false)} style={{ color: '#8c8c8c', cursor: 'pointer' }}>
              Cancel
            </span>
            <span style={{ fontWeight: 600, fontSize: 16 }}>Enable MFA</span>
            <span style={{ width: 48 }} />
          </div>

          {mfaData && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 13, color: '#595959', textAlign: 'center' }}>
                Scan this QR code with your authenticator app
              </div>
              <img
                src={`data:image/png;base64,${mfaData.qrCode}`}
                alt="MFA QR Code"
                style={{ width: 200, height: 200 }}
              />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: '#8c8c8c', marginBottom: 4 }}>
                  Or enter this key manually:
                </div>
                <div style={{
                  fontFamily: 'monospace',
                  fontSize: 14,
                  fontWeight: 600,
                  background: '#f5f5f5',
                  padding: '8px 16px',
                  borderRadius: 8,
                  letterSpacing: 2,
                }}>
                  {mfaData.manualKey}
                </div>
              </div>
              <div style={{ fontSize: 13, color: '#595959', textAlign: 'center', marginTop: 8 }}>
                Enter the 6-digit code from your app:
              </div>
              <PasscodeInput
                length={6}
                value={mfaCode}
                onChange={setMfaCode}
                onFill={handleEnableMfa}
                plain
                style={{ '--cell-gap': '8px' }}
              />
            </div>
          )}
        </div>
      </Popup>
    </>
  );
};

export default Profile;
