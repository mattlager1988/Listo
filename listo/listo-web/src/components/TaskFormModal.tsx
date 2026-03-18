import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, Space } from 'antd';
import dayjs from 'dayjs';
import RichTextEditor from './RichTextEditor';

interface TaskFormValues {
  name: string;
  description?: string;
  priority?: string;
  dueDate?: dayjs.Dayjs;
}

interface TaskFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; description?: string; priority?: string; dueDate?: string }) => void;
  initialValues?: {
    name?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
  };
  title: string;
  submitLabel: string;
  loading?: boolean;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  title,
  submitLabel,
  loading,
}) => {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initialValues) {
        form.setFieldsValue({
          name: initialValues.name,
          description: initialValues.description || '',
          priority: initialValues.priority || 'Medium',
          dueDate: initialValues.dueDate ? dayjs(initialValues.dueDate) : undefined,
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ priority: 'Medium' });
      }
    }
  }, [open, initialValues, form]);

  const handleFinish = (values: TaskFormValues) => {
    onSubmit({
      name: values.name,
      description: values.description || undefined,
      priority: values.priority,
      dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
    });
  };

  return (
    <Modal title={title} open={open} onCancel={onCancel} footer={null} width={600}>
      <Form
        form={form}
        layout="vertical"
        onFinish={handleFinish}
        size="small"
        requiredMark={false}
        autoComplete="off"
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <Form.Item name="name" label="Name" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
            <Input />
          </Form.Item>
          <Form.Item name="description" label="Description" style={{ marginBottom: 0 }}>
            <RichTextEditor />
          </Form.Item>
          <Space size="middle">
            <Form.Item name="priority" label="Priority" style={{ marginBottom: 0 }}>
              <Select style={{ width: 120 }}>
                <Select.Option value="High">High</Select.Option>
                <Select.Option value="Medium">Medium</Select.Option>
                <Select.Option value="Low">Low</Select.Option>
              </Select>
            </Form.Item>
            <Form.Item name="dueDate" label="Due Date" style={{ marginBottom: 0 }}>
              <DatePicker />
            </Form.Item>
          </Space>
          <Form.Item style={{ marginBottom: 0, marginTop: 12 }}>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {submitLabel}
              </Button>
              <Button onClick={onCancel}>Cancel</Button>
            </Space>
          </Form.Item>
        </div>
      </Form>
    </Modal>
  );
};

export default TaskFormModal;
