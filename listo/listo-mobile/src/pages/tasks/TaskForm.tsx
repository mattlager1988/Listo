import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  NavBar,
  Form,
  Input,
  Button,
  Toast,
  Skeleton,
  DatePicker,
} from 'antd-mobile';
import dayjs from 'dayjs';
import { parseDate } from '@shared/utils/format';
import api from '@shared/services/api';
import RichTextEditor from '../../components/RichTextEditor';

const PRIORITIES = ['High', 'Medium', 'Low'] as const;

const TaskForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const boardId = searchParams.get('boardId');
  const navigate = useNavigate();
  const isEditing = !!id;

  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<string>('Medium');
  const [dueDate, setDueDate] = useState<Date | null>(null);
  const [dueDatePickerVisible, setDueDatePickerVisible] = useState(false);

  const goBack = useCallback(() => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/tasks/backlog');
    }
  }, [navigate]);

  const fetchTask = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const response = await api.get(`/tasks/items/${id}`);
      const task = response.data;
      form.setFieldsValue({ name: task.name });
      setDescription(task.description || '');
      setPriority(task.priority || 'Medium');
      setDueDate(task.dueDate ? parseDate(task.dueDate).toDate() : null);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load task' });
      goBack();
    } finally {
      setLoading(false);
    }
  }, [id, form, goBack]);

  useEffect(() => {
    if (isEditing) {
      fetchTask();
    }
  }, [fetchTask, isEditing]);

  const handleSubmit = async () => {
    const values = form.getFieldsValue();
    if (!values.name?.trim()) {
      Toast.show({ content: 'Please enter a task name' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        name: values.name.trim(),
        description: description || undefined,
        priority,
        dueDate: dueDate ? dayjs(dueDate).toISOString() : undefined,
      };

      if (isEditing) {
        await api.put(`/tasks/items/${id}`, payload);
        Toast.show({ icon: 'success', content: 'Task updated' });
      } else {
        if (boardId) {
          payload.taskBoardSysId = Number(boardId);
        }
        await api.post('/tasks/items', payload);
        Toast.show({ icon: 'success', content: 'Task created' });
      }
      goBack();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to save task' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={goBack}>{isEditing ? 'Edit Task' : 'New Task'}</NavBar>
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
        {isEditing ? 'Edit Task' : 'New Task'}
      </NavBar>

      <Form form={form} layout="vertical" style={{ '--border-top': 'none' }}>
        <Form.Header>Task Details</Form.Header>
        <Form.Item name="name" label="Name" rules={[{ required: true }]}>
          <Input placeholder="Task name" />
        </Form.Item>
      </Form>

      {/* Priority selector */}
      <div style={{ padding: '0 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Priority</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {PRIORITIES.map(p => (
            <Button
              key={p}
              size="small"
              color={priority === p ? 'primary' : 'default'}
              fill={priority === p ? 'solid' : 'outline'}
              onClick={() => setPriority(p)}
              style={{ flex: 1 }}
            >
              {p}
            </Button>
          ))}
        </div>
      </div>

      {/* Due date */}
      <div style={{ padding: '0 12px', marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 8 }}>Due Date</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <Button
            size="small"
            fill="outline"
            onClick={() => setDueDatePickerVisible(true)}
            style={{ flex: 1 }}
          >
            {dueDate ? dayjs(dueDate).format('MMM D, YYYY') : 'No due date'}
          </Button>
          {dueDate && (
            <Button size="small" fill="none" onClick={() => setDueDate(null)}>
              Clear
            </Button>
          )}
        </div>
      </div>

      <DatePicker
        visible={dueDatePickerVisible}
        onClose={() => setDueDatePickerVisible(false)}
        onConfirm={val => setDueDate(val)}
        value={dueDate || undefined}
        title="Due Date"
      />

      {/* Description */}
      <div style={{ padding: '0 12px' }}>
        <div style={{ fontSize: 14, color: '#666', marginBottom: 4 }}>Description</div>
        <RichTextEditor
          value={description}
          onChange={setDescription}
          placeholder="Add a description..."
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

export default TaskForm;
