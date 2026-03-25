import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  List,
  Tag,
  Skeleton,
  ErrorBlock,
  Button,
  ActionSheet,
  Dialog,
  Toast,
  Picker,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import { UnorderedListOutline } from 'antd-mobile-icons';
import dayjs from 'dayjs';
import { parseDate } from '@shared/utils/format';
import relativeTime from 'dayjs/plugin/relativeTime';
import api from '@shared/services/api';
import type { TaskItem, BoardSummary } from '@shared/types';
import { useMenu } from '../../contexts/MenuContext';

dayjs.extend(relativeTime);

const priorityColors: Record<string, string> = {
  High: '#ff4d4f',
  Medium: '#faad14',
  Low: '#1890ff',
};

const Backlog: React.FC = () => {
  const { openMenu } = useMenu();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [actionSheetVisible, setActionSheetVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [assignPickerVisible, setAssignPickerVisible] = useState(false);
  const [boards, setBoards] = useState<BoardSummary[]>([]);

  const fetchTasks = useCallback(async () => {
    try {
      setError(false);
      const response = await api.get('/tasks/items/backlog');
      setTasks(response.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleTaskTap = (task: TaskItem) => {
    setSelectedTask(task);
    setActionSheetVisible(true);
  };

  const handleComplete = async () => {
    if (!selectedTask) return;
    setActionSheetVisible(false);
    try {
      await api.post(`/tasks/items/${selectedTask.sysId}/complete`);
      Toast.show({ icon: 'success', content: 'Task completed' });
      fetchTasks();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to complete task' });
    }
  };

  const handleDelete = async () => {
    if (!selectedTask) return;
    setActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: `Delete "${selectedTask.name}"? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/tasks/items/${selectedTask.sysId}`);
      Toast.show({ icon: 'success', content: 'Task deleted' });
      fetchTasks();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete task' });
    }
  };

  const handleAssignToBoard = async () => {
    if (!selectedTask) return;
    setActionSheetVisible(false);
    try {
      const res = await api.get('/tasks/boards');
      setBoards(res.data);
      setAssignPickerVisible(true);
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to load boards' });
    }
  };

  const handleAssignConfirm = async (val: (string | number | null)[]) => {
    setAssignPickerVisible(false);
    if (!selectedTask || !val[0]) return;
    try {
      await api.post(`/tasks/items/${selectedTask.sysId}/assign`, {
        taskBoardSysId: Number(val[0]),
      });
      Toast.show({ icon: 'success', content: 'Task assigned to board' });
      fetchTasks();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to assign task' });
    }
  };

  const getDueDateDisplay = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = parseDate(dueDate);
    const today = dayjs().startOf('day');
    const isOverdue = due.isBefore(today);
    const isToday = due.isSame(today, 'day');
    const color = isOverdue ? '#ff4d4f' : isToday ? '#faad14' : '#8c8c8c';
    return (
      <span style={{ fontSize: 12, color }}>
        {isOverdue ? 'Overdue ' : ''}{due.format('MMM D')}
      </span>
    );
  };

  const actionSheetActions: Action[] = [
    {
      text: 'Edit',
      key: 'edit',
      onClick: () => {
        setActionSheetVisible(false);
        if (selectedTask) navigate(`/tasks/${selectedTask.sysId}/edit`);
      },
    },
    {
      text: 'Assign to Board',
      key: 'assign',
      onClick: handleAssignToBoard,
    },
    {
      text: 'Complete',
      key: 'complete',
      onClick: handleComplete,
    },
    {
      text: 'Delete',
      key: 'delete',
      danger: true,
      onClick: handleDelete,
    },
  ];

  if (loading) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Backlog
        </NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <NavBar
          back={null}
          left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
          style={{ '--height': '48px' }}
        >
          Backlog
        </NavBar>
        <ErrorBlock status="default" title="Unable to load tasks" description="Pull down to retry" />
      </>
    );
  }

  return (
    <>
      <NavBar
        back={null}
        left={<UnorderedListOutline fontSize={20} onClick={openMenu} style={{ cursor: 'pointer' }} />}
        style={{ '--height': '48px' }}
      >
        Backlog
      </NavBar>
      <PullToRefresh onRefresh={fetchTasks}>
        {tasks.length === 0 ? (
          <ErrorBlock status="empty" title="No tasks in backlog" description="Tap the button below to create a task" />
        ) : (
          <List style={{ '--border-top': 'none' }}>
            {tasks.map(task => (
              <List.Item
                key={task.sysId}
                onClick={() => handleTaskTap(task)}
                description={
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                    <Tag
                      color={priorityColors[task.priority]}
                      fill="outline"
                      style={{ '--font-size': '10px', '--padding-inline': '4px' } as React.CSSProperties}
                    >
                      {task.priority}
                    </Tag>
                    {getDueDateDisplay(task.dueDate)}
                    <span style={{ fontSize: 11, color: '#bfbfbf' }}>
                      {dayjs(task.createTimestamp).fromNow()}
                    </span>
                  </div>
                }
              >
                <span style={{ fontSize: 14, fontWeight: 500 }}>{task.name}</span>
              </List.Item>
            ))}
          </List>
        )}
        <div style={{ height: 'calc(60px + env(safe-area-inset-bottom))' }} />
      </PullToRefresh>

      {/* Fixed Add Button */}
      <div style={{
        position: 'fixed',
        bottom: 'calc(50px + env(safe-area-inset-bottom))',
        left: 0,
        right: 0,
        padding: '8px 12px',
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        zIndex: 99,
      }}>
        <Button block color="primary" onClick={() => navigate('/tasks/new')}>
          Add Task
        </Button>
      </div>

      {/* Task ActionSheet */}
      <ActionSheet
        visible={actionSheetVisible}
        actions={actionSheetActions}
        onClose={() => setActionSheetVisible(false)}
        cancelText="Cancel"
      />

      {/* Assign to Board Picker */}
      <Picker
        visible={assignPickerVisible}
        onClose={() => setAssignPickerVisible(false)}
        columns={[boards.map(b => ({ label: b.name, value: String(b.sysId) }))]}
        onConfirm={handleAssignConfirm}
        title="Select Board"
      />
    </>
  );
};

export default Backlog;
