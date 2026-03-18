import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Modal,
  Select,
  Table,
  Tag,
  message,
  Popconfirm,
  Tooltip,
  Empty,
} from 'antd';
import { ProTable } from '@ant-design/pro-components';
import type { ProColumns } from '@ant-design/pro-components';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CheckOutlined,
  AppstoreOutlined,
  InboxOutlined,
  ReloadOutlined,
  UndoOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import TaskFormModal from '../../components/TaskFormModal';

dayjs.extend(relativeTime);

interface TaskItem {
  sysId: number;
  name: string;
  description?: string;
  priority: string;
  dueDate?: string;
  sortOrder: number;
  isCompleted: boolean;
  completedDate?: string;
  taskBoardSysId?: number;
  taskBoardName?: string;
  taskBoardColumnSysId?: number;
  taskBoardColumnName?: string;
  createTimestamp: string;
  modifyTimestamp: string;
}

interface BoardSummary {
  sysId: number;
  name: string;
  color: string | null;
  taskCount: number;
}

const priorityColors: Record<string, string> = {
  High: 'red',
  Medium: 'orange',
  Low: 'blue',
};

const Backlog: React.FC = () => {
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [saving, setSaving] = useState(false);

  // Assign to board
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<number | null>(null);

  // Completed tasks
  const [completedModalOpen, setCompletedModalOpen] = useState(false);
  const [completedTasks, setCompletedTasks] = useState<TaskItem[]>([]);
  const [completedLoading, setCompletedLoading] = useState(false);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/tasks/items/backlog');
      setTasks(res.data);
    } catch {
      message.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreate = () => {
    setEditingTask(null);
    setFormModalOpen(true);
  };

  const handleEdit = (task: TaskItem) => {
    setEditingTask(task);
    setFormModalOpen(true);
    setSelectedRowKeys([]);
  };

  const handleFormSubmit = async (values: { name: string; description?: string; priority?: string; dueDate?: string }) => {
    setSaving(true);
    try {
      if (editingTask) {
        await api.put(`/tasks/items/${editingTask.sysId}`, values);
        message.success('Task updated');
      } else {
        await api.post('/tasks/items', values);
        message.success('Task created');
      }
      setFormModalOpen(false);
      setSelectedRowKeys([]);
      fetchTasks();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Operation failed');
    } finally {
      setSaving(false);
    }
  };

  const handleComplete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.post(`/tasks/items/${id}/complete`)));
      message.success(`${selectedRowKeys.length} task${selectedRowKeys.length > 1 ? 's' : ''} completed`);
      setSelectedRowKeys([]);
      fetchTasks();
    } catch {
      message.error('Failed to complete tasks');
    }
  };

  const handleDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(id => api.delete(`/tasks/items/${id}`)));
      message.success(`${selectedRowKeys.length} task${selectedRowKeys.length > 1 ? 's' : ''} deleted`);
      setSelectedRowKeys([]);
      fetchTasks();
    } catch {
      message.error('Failed to delete tasks');
    }
  };

  // Assign to board
  const openAssignModal = async () => {
    try {
      const res = await api.get('/tasks/boards');
      setBoards(res.data);
      setSelectedBoardId(null);
      setAssignModalOpen(true);
    } catch {
      message.error('Failed to load boards');
    }
  };

  const handleAssign = async () => {
    if (!selectedBoardId) return;
    try {
      await Promise.all(
        selectedRowKeys.map(id =>
          api.post(`/tasks/items/${id}/assign`, { taskBoardSysId: selectedBoardId })
        )
      );
      message.success(`${selectedRowKeys.length} task${selectedRowKeys.length > 1 ? 's' : ''} assigned to board`);
      setAssignModalOpen(false);
      setSelectedRowKeys([]);
      fetchTasks();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || 'Failed to assign tasks');
    }
  };

  // Completed tasks
  const openCompletedModal = async () => {
    setCompletedLoading(true);
    setCompletedModalOpen(true);
    try {
      const res = await api.get('/tasks/items/completed');
      setCompletedTasks(res.data);
    } catch {
      message.error('Failed to load completed tasks');
    } finally {
      setCompletedLoading(false);
    }
  };

  const handleUncomplete = async (taskId: number) => {
    try {
      await api.post(`/tasks/items/${taskId}/uncomplete`);
      message.success('Task returned to backlog');
      setCompletedTasks(prev => prev.filter(t => t.sysId !== taskId));
      fetchTasks();
    } catch {
      message.error('Failed to uncomplete task');
    }
  };

  const getDueDateStyle = (dueDate?: string) => {
    if (!dueDate) return {};
    const due = dayjs(dueDate);
    const today = dayjs().startOf('day');
    if (due.isBefore(today)) return { color: 'red' };
    if (due.isSame(today, 'day')) return { color: 'orange' };
    return {};
  };

  const columns: ProColumns<TaskItem>[] = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      ellipsis: true,
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      render: (_, record) => (
        <Tag color={priorityColors[record.priority]}>{record.priority}</Tag>
      ),
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 130,
      render: (_, record) => {
        if (!record.dueDate) return '-';
        const due = dayjs(record.dueDate);
        const style = getDueDateStyle(record.dueDate);
        const isOverdue = due.isBefore(dayjs().startOf('day'));
        return (
          <span style={style}>
            {isOverdue && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
            {due.format('MMM D, YYYY')}
          </span>
        );
      },
      sorter: (a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix();
      },
    },
    {
      title: 'Created',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 120,
      render: (_, record) => dayjs(record.createTimestamp).fromNow(),
      sorter: (a, b) => dayjs(a.createTimestamp).unix() - dayjs(b.createTimestamp).unix(),
    },
  ];

  const selectedTask = selectedRowKeys.length === 1
    ? tasks.find(t => t.sysId.toString() === selectedRowKeys[0].toString())
    : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <PageHeader title="Backlog" />

      {/* Action Toolbar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '8px 12px',
          marginBottom: 16,
          background: '#fafafa',
          border: '1px solid #e8e8e8',
          borderRadius: 6,
          gap: 4,
          flexShrink: 0,
        }}
      >
        <Tooltip title="Add Task">
          <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleCreate} />
        </Tooltip>
        <Tooltip title="Edit">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            disabled={selectedRowKeys.length !== 1}
            onClick={() => { if (selectedTask) handleEdit(selectedTask); }}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Assign to Board">
          <Button
            type="text"
            size="small"
            icon={<AppstoreOutlined />}
            disabled={selectedRowKeys.length === 0}
            onClick={openAssignModal}
          />
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="Complete">
          <Popconfirm
            title={`Complete ${selectedRowKeys.length} task${selectedRowKeys.length > 1 ? 's' : ''}?`}
            onConfirm={handleComplete}
            disabled={selectedRowKeys.length === 0}
          >
            <Button
              type="text"
              size="small"
              icon={<CheckOutlined />}
              disabled={selectedRowKeys.length === 0}
            />
          </Popconfirm>
        </Tooltip>
        <Tooltip title="Delete">
          <Popconfirm
            title={`Delete ${selectedRowKeys.length} task${selectedRowKeys.length > 1 ? 's' : ''}?`}
            description="This action cannot be undone."
            onConfirm={handleDelete}
            disabled={selectedRowKeys.length === 0}
            okButtonProps={{ danger: true }}
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              disabled={selectedRowKeys.length === 0}
            />
          </Popconfirm>
        </Tooltip>
        <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
        <Tooltip title="View Completed">
          <Button type="text" size="small" icon={<InboxOutlined />} onClick={openCompletedModal} />
        </Tooltip>
        <Tooltip title="Refresh">
          <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchTasks} />
        </Tooltip>
        <div style={{ flex: 1 }} />
        {selectedRowKeys.length > 0 && (
          <span style={{ color: '#8c8c8c', fontSize: 12 }}>{selectedRowKeys.length} selected</span>
        )}
      </div>

      {/* Table */}
      <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
        {tasks.length === 0 && !loading ? (
          <Empty description="No tasks in backlog" style={{ marginTop: 48 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
              Create Task
            </Button>
          </Empty>
        ) : (
          <ProTable<TaskItem>
            columns={columns}
            dataSource={tasks}
            rowKey={(record) => record.sysId.toString()}
            loading={loading}
            search={false}
            options={false}
            tableAlertRender={false}
            pagination={false}
            toolBarRender={false}
            rowSelection={{
              selectedRowKeys,
              onChange: (keys) => setSelectedRowKeys(keys),
            }}
            onRow={(record) => ({
              onClick: () => {
                const key = record.sysId.toString();
                setSelectedRowKeys(prev =>
                  prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
                );
              },
              onDoubleClick: () => handleEdit(record),
              style: { cursor: 'pointer' },
            })}
          />
        )}
      </div>

      {/* Create/Edit Task Modal */}
      <TaskFormModal
        open={formModalOpen}
        onCancel={() => setFormModalOpen(false)}
        onSubmit={handleFormSubmit}
        initialValues={editingTask ? {
          name: editingTask.name,
          description: editingTask.description,
          priority: editingTask.priority,
          dueDate: editingTask.dueDate,
        } : undefined}
        title={editingTask ? 'Edit Task' : 'Add Task'}
        submitLabel={editingTask ? 'Update' : 'Create'}
        loading={saving}
      />

      {/* Assign to Board Modal */}
      <Modal
        title="Assign to Board"
        open={assignModalOpen}
        onCancel={() => setAssignModalOpen(false)}
        onOk={handleAssign}
        okText="Assign"
        okButtonProps={{ disabled: !selectedBoardId }}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="Select a board"
          value={selectedBoardId}
          onChange={setSelectedBoardId}
          options={boards.map(b => ({
            label: b.name,
            value: b.sysId,
          }))}
        />
      </Modal>

      {/* View Completed Modal */}
      <Modal
        title="Completed Tasks"
        open={completedModalOpen}
        onCancel={() => setCompletedModalOpen(false)}
        footer={null}
        width={700}
      >
        <Table
          dataSource={completedTasks}
          rowKey="sysId"
          loading={completedLoading}
          size="small"
          pagination={false}
          columns={[
            {
              title: 'Name',
              dataIndex: 'name',
              key: 'name',
              ellipsis: true,
            },
            {
              title: 'Completed',
              dataIndex: 'completedDate',
              key: 'completedDate',
              width: 140,
              render: (date: string) => date ? dayjs(date).format('MMM D, YYYY') : '-',
            },
            {
              title: 'Board',
              dataIndex: 'taskBoardName',
              key: 'taskBoardName',
              width: 120,
              render: (name: string) => name || '-',
            },
            {
              title: '',
              key: 'actions',
              width: 40,
              render: (_, record: TaskItem) => (
                <Tooltip title="Uncomplete">
                  <Button
                    type="text"
                    size="small"
                    icon={<UndoOutlined />}
                    onClick={() => handleUncomplete(record.sysId)}
                  />
                </Tooltip>
              ),
            },
          ]}
        />
      </Modal>
    </div>
  );
};

export default Backlog;
