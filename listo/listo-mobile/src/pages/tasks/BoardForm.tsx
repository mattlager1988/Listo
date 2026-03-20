import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Toast,
  Skeleton,
} from 'antd-mobile';
import api from '@shared/services/api';

const BoardForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/tasks/boards');
    }
  }, [navigate]);

  const fetchBoard = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/tasks/boards/${id}`);
      form.setFieldsValue({ name: response.data.name });
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load board' });
      goBack();
    } finally {
      setLoading(false);
    }
  }, [id, form, goBack]);

  useEffect(() => {
    if (isEditing) {
      fetchBoard();
    }
  }, [fetchBoard, isEditing]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    if (!values.name?.trim()) {
      Toast.show({ content: 'Please enter a board name' });
      return;
    }

    setSubmitting(true);
    try {
      if (isEditing) {
        await api.put(`/tasks/boards/${id}`, { name: values.name.trim() });
        Toast.show({ icon: 'success', content: 'Board updated' });
      } else {
        await api.post('/tasks/boards', { name: values.name.trim() });
        Toast.show({ icon: 'success', content: 'Board created' });
      }
      goBack();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save board' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={goBack}>{isEditing ? 'Edit Board' : 'New Board'}</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
        </div>
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={goBack}
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
        {isEditing ? 'Edit Board' : 'New Board'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Board Details</Form.Header>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="Board name" />
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
            onClick={goBack}
            style={{ borderRadius: 8 }}
          >
            Cancel
          </Button>
        </div>
      )}
    </>
  );
};

export default BoardForm;
