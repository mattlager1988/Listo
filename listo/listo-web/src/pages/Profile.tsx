import React, { useState, useRef } from 'react';
import { Card, Form, Input, Button, message, Avatar, Space } from 'antd';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import PageHeader from '../components/PageHeader';
import { resizeImageToSquareDataUrl } from '../utils/image';

const Profile: React.FC = () => {
  const { user, refreshUser } = useAuth();
  const [profileLoading, setProfileLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [photoLoading, setPhotoLoading] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();

  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (photoInputRef.current) photoInputRef.current.value = '';
    if (!file) return;
    setPhotoLoading(true);
    try {
      const dataUrl = await resizeImageToSquareDataUrl(file);
      await api.put('/users/me', { profilePhoto: dataUrl });
      await refreshUser();
      message.success('Profile photo updated');
    } catch {
      message.error('Failed to update photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleRemovePhoto = async () => {
    setPhotoLoading(true);
    try {
      await api.put('/users/me', { profilePhoto: '' });
      await refreshUser();
      message.success('Profile photo removed');
    } catch {
      message.error('Failed to remove photo');
    } finally {
      setPhotoLoading(false);
    }
  };

  const handleProfileUpdate = async (values: { firstName: string; lastName: string; phoneNumber?: string }) => {
    setProfileLoading(true);
    try {
      await api.put('/users/me', values);
      await refreshUser();
      message.success('Profile updated successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordChange = async (values: { currentPassword: string; newPassword: string }) => {
    setPasswordLoading(true);
    try {
      await api.post('/users/me/change-password', {
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });
      passwordForm.resetFields();
      message.success('Password changed successfully');
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to change password');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div>
      <PageHeader title="Edit Profile" />

      <Card title="Profile Photo" style={{ marginBottom: 24 }}>
        <Space size="large" align="center">
          <Avatar size={72} src={user?.profilePhoto || undefined} style={{ backgroundColor: '#1890ff', fontSize: 24 }}>
            {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
          </Avatar>
          <Space direction="vertical" size="small">
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={handlePhotoSelected}
            />
            <Space>
              <Button size="small" loading={photoLoading} onClick={() => photoInputRef.current?.click()}>
                {user?.profilePhoto ? 'Change Photo' : 'Upload Photo'}
              </Button>
              {user?.profilePhoto && (
                <Button size="small" danger onClick={handleRemovePhoto} disabled={photoLoading}>
                  Remove
                </Button>
              )}
            </Space>
            <span style={{ fontSize: 12, color: '#8c8c8c' }}>Square images work best; it’s resized automatically.</span>
          </Space>
        </Space>
      </Card>

      <Card title="Personal Information" style={{ marginBottom: 24 }}>
        <Form
          form={profileForm}
          layout="vertical"
          initialValues={{
            firstName: user?.firstName,
            lastName: user?.lastName,
            phoneNumber: user?.phoneNumber,
          }}
          onFinish={handleProfileUpdate}
          size="small"
          style={{ maxWidth: 400 }}
          autoComplete="off"
        >
          <Form.Item
            name="firstName"
            label="First Name"
            rules={[{ required: true, message: 'First name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item
            name="lastName"
            label="Last Name"
            rules={[{ required: true, message: 'Last name is required' }]}
          >
            <Input />
          </Form.Item>

          <Form.Item name="phoneNumber" label="Phone Number">
            <Input />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={profileLoading}>
              Save Changes
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="Change Password">
        <Form
          form={passwordForm}
          layout="vertical"
          onFinish={handlePasswordChange}
          size="small"
          style={{ maxWidth: 400 }}
          autoComplete="off"
        >
          {/* Hidden fields to prevent browser password save prompts */}
          <input type="text" name="fake_username" style={{ display: 'none' }} autoComplete="username" />
          <input type="password" name="fake_password" style={{ display: 'none' }} autoComplete="current-password" />

          <Form.Item
            name="currentPassword"
            label="Current Password"
            rules={[{ required: true, message: 'Current password is required' }]}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="newPassword"
            label="New Password"
            rules={[
              { required: true, message: 'New password is required' },
              { min: 16, message: 'Password must be at least 16 characters' },
            ]}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>

          <Form.Item
            name="confirmPassword"
            label="Confirm New Password"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Please confirm your password' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Passwords do not match'));
                },
              }),
            ]}
          >
            <Input.Password autoComplete="off" />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={passwordLoading}>
              Change Password
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
};

export default Profile;
