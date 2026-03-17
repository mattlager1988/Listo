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
import RichTextEditor from '../../components/RichTextEditor';

const NoteForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');

  const fetchNote = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/aviation/notes/${id}`);
      const note = response.data;
      form.setFieldsValue({
        subject: note.subject,
      });
      setDescription(note.description || '');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load note' });
      navigate('/aviation/notes');
    } finally {
      setLoading(false);
    }
  }, [id, form, navigate]);

  useEffect(() => {
    if (isEditing) {
      fetchNote();
    }
  }, [fetchNote, isEditing]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();

    if (!values.subject?.trim()) {
      Toast.show({ content: 'Please enter a subject' });
      return;
    }

    // Check if description has actual content (not just empty HTML tags)
    const strippedDescription = description.replace(/<[^>]*>/g, '').trim();
    if (!strippedDescription) {
      Toast.show({ content: 'Please enter a description' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subject: values.subject.trim(),
        description: description,
      };

      if (isEditing) {
        await api.put(`/aviation/notes/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Note updated' });
      } else {
        await api.post('/aviation/notes', payload);
        Toast.show({ icon: 'success', content: 'Note created' });
      }
      navigate('/aviation/notes');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save note' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/aviation/notes')}>
          {isEditing ? 'Edit Note' : 'New Note'}
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
        onBack={() => navigate('/aviation/notes')}
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
        {isEditing ? 'Edit Note' : 'New Note'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Note Details</Form.Header>

        <Form.Item name="subject" label="Subject" rules={[{ required: true }]}>
          <Input placeholder="Note subject" />
        </Form.Item>
      </Form>

      <div style={{ padding: '0 12px' }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Description</div>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Write your note here..."
        />
      </div>

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
            onClick={() => navigate('/aviation/notes')}
            style={{ borderRadius: 8 }}
          >
            Cancel
          </Button>
        </div>
      )}
    </>
  );
};

export default NoteForm;
