import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  TextArea,
  Button,
  Toast,
  Skeleton,
  Picker,
} from 'antd-mobile';
import api from '@shared/services/api';

interface PasswordCategory {
  sysId: number;
  name: string;
}

const PasswordForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [categories, setCategories] = useState<PasswordCategory[]>([]);
  const [categoryPickerVisible, setCategoryPickerVisible] = useState(false);
  const [selectedCategorySysId, setSelectedCategorySysId] = useState<number | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get('/passwords/passwordcategories');
      setCategories(response.data);
    } catch {
      // Categories are optional, don't block the form
    }
  }, []);

  const fetchEntry = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/passwords/passwordentries/${id}`);
      const entry = response.data;
      form.setFieldsValue({
        title: entry.title,
        url: entry.url,
        username: entry.username,
        password: entry.password,
        notes: entry.notes,
      });
      setSelectedCategorySysId(entry.categorySysId);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load password' });
      navigate('/passwords');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  useEffect(() => {
    fetchCategories();
    if (isEditing) {
      fetchEntry();
    }
  }, [fetchCategories, fetchEntry, isEditing]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();

    if (!values.title?.trim()) {
      Toast.show({ content: 'Title is required' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        title: values.title.trim(),
        url: values.url?.trim() || null,
        username: values.username?.trim() || null,
        password: values.password || null,
        notes: values.notes?.trim() || null,
        categorySysId: selectedCategorySysId,
      };

      if (isEditing) {
        await api.put(`/passwords/passwordentries/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Password updated' });
      } else {
        await api.post('/passwords/passwordentries', payload);
        Toast.show({ icon: 'success', content: 'Password created' });
      }
      navigate('/passwords');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save' });
    } finally {
      setSubmitting(false);
    }
  };

  const categoryColumns = [
    [
      { label: 'None', value: 'none' },
      ...categories.map(c => ({ label: c.name, value: c.sysId.toString() })),
    ],
  ];

  const selectedCategoryName = selectedCategorySysId
    ? categories.find(c => c.sysId === selectedCategorySysId)?.name
    : null;

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/passwords')}>
          {isEditing ? 'Edit Password' : 'New Password'}
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={3} animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate('/passwords')}
        right={
          isEditing ? (
            <span
              onClick={handleSubmit}
              style={{
                fontSize: 14,
                color: submitting ? '#8c8c8c' : '#1890ff',
                fontWeight: 600,
                cursor: submitting ? 'default' : 'pointer',
              }}
            >
              {submitting ? 'Saving...' : 'Save'}
            </span>
          ) : undefined
        }
      >
        {isEditing ? 'Edit Password' : 'New Password'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' } as React.CSSProperties}>
        <Form.Header>Password Details</Form.Header>

        <Form.Item name="title" label="Title" rules={[{ required: true }]}>
          <Input placeholder="e.g., Gmail, Netflix" />
        </Form.Item>

        <Form.Item name="url" label="URL">
          <Input placeholder="https://example.com" />
        </Form.Item>

        <Form.Item name="username" label="Username">
          <Input placeholder="Username or email" />
        </Form.Item>

        <Form.Item name="password" label="Password">
          <Input type="password" placeholder="Password" />
        </Form.Item>

        <Form.Item
          label="Category"
          onClick={() => setCategoryPickerVisible(true)}
        >
          <Picker
            columns={categoryColumns}
            visible={categoryPickerVisible}
            onClose={() => setCategoryPickerVisible(false)}
            onConfirm={(val) => {
              const v = val[0];
              setSelectedCategorySysId(v === 'none' ? null : Number(v));
              setCategoryPickerVisible(false);
            }}
            value={selectedCategorySysId ? [selectedCategorySysId.toString()] : ['none']}
          >
            {() => (
              <span style={{ color: selectedCategoryName ? undefined : '#ccc' }}>
                {selectedCategoryName || 'Select category'}
              </span>
            )}
          </Picker>
        </Form.Item>

        <Form.Item name="notes" label="Notes">
          <TextArea
            placeholder="Security questions, recovery codes, etc."
            rows={3}
          />
        </Form.Item>
      </Form>

      {!isEditing && (
        <div style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <Button
            block
            color="primary"
            size="large"
            loading={submitting}
            onClick={handleSubmit}
            style={{ borderRadius: 8 }}
          >
            Create
          </Button>
          <Button
            block
            size="large"
            onClick={() => navigate('/passwords')}
            style={{ borderRadius: 8 }}
          >
            Cancel
          </Button>
        </div>
      )}
    </>
  );
};

export default PasswordForm;
