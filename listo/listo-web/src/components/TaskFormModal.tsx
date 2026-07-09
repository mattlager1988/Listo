import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, DatePicker, Button, Space, Divider } from 'antd';
import dayjs from 'dayjs';
import RichTextEditor from './RichTextEditor';
import DocumentList from './DocumentList';

interface TaskFormValues {
  name: string;
  description?: string;
  priority?: string;
  dueDate?: dayjs.Dayjs;
  destination?: number | 'backlog';
}

interface TaskFormModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (values: { name: string; description?: string; priority?: string; dueDate?: string; taskBoardSysId?: number }) => void;
  initialValues?: {
    name?: string;
    description?: string;
    priority?: string;
    dueDate?: string;
  };
  title: string;
  submitLabel: string;
  loading?: boolean;
  // When set, renders a destination picker (Backlog or a specific board).
  showDestination?: boolean;
  boards?: { sysId: number; name: string }[];
  // Task sysId when editing an existing task; enables the attachments section.
  entitySysId?: number;
}

const TaskFormModal: React.FC<TaskFormModalProps> = ({
  open,
  onCancel,
  onSubmit,
  initialValues,
  title,
  submitLabel,
  loading,
  showDestination = false,
  boards = [],
  entitySysId,
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
          destination: 'backlog',
        });
      } else {
        form.resetFields();
        form.setFieldsValue({ priority: 'Medium', destination: 'backlog' });
      }
    }
  }, [open, initialValues, form]);

  const handleFinish = (values: TaskFormValues) => {
    onSubmit({
      name: values.name,
      description: values.description || undefined,
      priority: values.priority,
      dueDate: values.dueDate ? values.dueDate.toISOString() : undefined,
      taskBoardSysId:
        showDestination && typeof values.destination === 'number'
          ? values.destination
          : undefined,
    });
  };

  return (
    <Modal title={title} open={open} onCancel={onCancel} footer={null} width={entitySysId ? 760 : 600}>
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
            {showDestination && (
              <Form.Item name="destination" label="Destination" style={{ marginBottom: 0 }}>
                <Select style={{ width: 180 }}>
                  <Select.Option value="backlog">Backlog</Select.Option>
                  {boards.map((b) => (
                    <Select.Option key={b.sysId} value={b.sysId}>
                      {b.name}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            )}
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

      {entitySysId && (
        <>
          <Divider style={{ margin: '16px 0 8px' }} orientation="left" orientationMargin={0}>
            Attachments
          </Divider>
          <DocumentList
            key={entitySysId}
            module="tasks"
            entityType="task"
            entitySysId={entitySysId}
            showUpload
          />
        </>
      )}
    </Modal>
  );
};

export default TaskFormModal;
