import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  NavBar,
  PullToRefresh,
  Card,
  Tag,
  Skeleton,
  ErrorBlock,
  ActionSheet,
  Dialog,
  Toast,
  Collapse,
} from 'antd-mobile';
import type { Action } from 'antd-mobile/es/components/action-sheet';
import dayjs from 'dayjs';
import api from '@shared/services/api';
import type { TaskItem, BoardDetail as BoardDetailType, BoardColumn } from '@shared/types';

const priorityColors: Record<string, string> = {
  High: '#ff4d4f',
  Medium: '#faad14',
  Low: '#1890ff',
};

const BoardDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardDetailType | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  // Board actions
  const [boardActionSheetVisible, setBoardActionSheetVisible] = useState(false);

  // Task actions
  const [taskActionSheetVisible, setTaskActionSheetVisible] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      setError(false);
      const [boardRes, tasksRes] = await Promise.all([
        api.get(`/tasks/boards/${id}`),
        api.get(`/tasks/items/board/${id}`),
      ]);
      setBoard(boardRes.data);
      setTasks(tasksRes.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Group tasks by column
  const tasksByColumn = useMemo(() => {
    const map: Record<number, TaskItem[]> = {};
    if (board) {
      board.columns.forEach(col => { map[col.sysId] = []; });
    }
    tasks.forEach(task => {
      if (task.taskBoardColumnSysId && map[task.taskBoardColumnSysId]) {
        map[task.taskBoardColumnSysId].push(task);
      }
    });
    Object.values(map).forEach(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [tasks, board]);

  const handleTaskTap = (task: TaskItem) => {
    setSelectedTask(task);
    setTaskActionSheetVisible(true);
  };

  const handleMoveToColumn = async (task: TaskItem, column: BoardColumn) => {
    setTaskActionSheetVisible(false);
    try {
      await api.put('/tasks/items/reorder', {
        tasks: [{ sysId: task.sysId, taskBoardColumnSysId: column.sysId, sortOrder: 0 }],
      });
      Toast.show({ icon: 'success', content: `Moved to ${column.name}` });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to move task' });
    }
  };

  const handleMoveToBacklog = async (task: TaskItem) => {
    setTaskActionSheetVisible(false);
    try {
      await api.post(`/tasks/items/${task.sysId}/backlog`);
      Toast.show({ icon: 'success', content: 'Moved to backlog' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to move task' });
    }
  };

  const handleCompleteTask = async (task: TaskItem) => {
    setTaskActionSheetVisible(false);
    try {
      await api.post(`/tasks/items/${task.sysId}/complete`);
      Toast.show({ icon: 'success', content: 'Task completed' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to complete task' });
    }
  };

  const handleDeleteTask = async (task: TaskItem) => {
    setTaskActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: `Delete "${task.name}"? This cannot be undone.`,
    });
    if (!confirmed) return;
    try {
      await api.delete(`/tasks/items/${task.sysId}`);
      Toast.show({ icon: 'success', content: 'Task deleted' });
      fetchData();
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete task' });
    }
  };

  const handleDeleteBoard = async () => {
    setBoardActionSheetVisible(false);
    const confirmed = await Dialog.confirm({
      content: 'Delete this board? Tasks will be returned to the backlog.',
    });
    if (!confirmed) return;
    try {
      await api.delete(`/tasks/boards/${id}`);
      Toast.show({ icon: 'success', content: 'Board deleted' });
      navigate('/tasks/boards');
    } catch {
      Toast.show({ icon: 'fail', content: 'Failed to delete board' });
    }
  };

  const getTaskActions = (): Action[] => {
    if (!selectedTask || !board) return [];

    const actions: Action[] = [
      {
        text: 'Edit',
        key: 'edit',
        onClick: () => {
          setTaskActionSheetVisible(false);
          navigate(`/tasks/${selectedTask.sysId}/edit`);
        },
      },
    ];

    // Add "Move to [Column]" for each other column
    board.columns
      .filter(col => col.sysId !== selectedTask.taskBoardColumnSysId)
      .forEach(col => {
        actions.push({
          text: `Move to ${col.name}`,
          key: `move-${col.sysId}`,
          onClick: () => handleMoveToColumn(selectedTask, col),
        });
      });

    actions.push(
      {
        text: 'Move to Backlog',
        key: 'backlog',
        onClick: () => handleMoveToBacklog(selectedTask),
      },
      {
        text: 'Complete',
        key: 'complete',
        onClick: () => handleCompleteTask(selectedTask),
      },
      {
        text: 'Delete',
        key: 'delete',
        danger: true,
        onClick: () => handleDeleteTask(selectedTask),
      },
    );

    return actions;
  };

  const boardActions: Action[] = [
    {
      text: 'Add Task',
      key: 'add-task',
      onClick: () => {
        setBoardActionSheetVisible(false);
        navigate(`/tasks/new?boardId=${id}`);
      },
    },
    {
      text: 'Manage Columns',
      key: 'columns',
      onClick: () => {
        setBoardActionSheetVisible(false);
        navigate(`/tasks/boards/${id}/columns`);
      },
    },
    {
      text: 'Edit Board',
      key: 'edit',
      onClick: () => {
        setBoardActionSheetVisible(false);
        navigate(`/tasks/boards/${id}/edit`);
      },
    },
    {
      text: 'Delete Board',
      key: 'delete',
      danger: true,
      onClick: handleDeleteBoard,
    },
  ];

  const getDueDateDisplay = (dueDate?: string) => {
    if (!dueDate) return null;
    const due = dayjs(dueDate);
    const today = dayjs().startOf('day');
    const isOverdue = due.isBefore(today);
    const isToday = due.isSame(today, 'day');
    const color = isOverdue ? '#ff4d4f' : isToday ? '#faad14' : '#8c8c8c';
    return (
      <span style={{ fontSize: 11, color }}>
        {isOverdue ? 'Overdue ' : ''}{due.format('MMM D')}
      </span>
    );
  };

  if (loading) {
    return (
      <>
        <NavBar onBack={() => navigate('/tasks/boards')}>Board</NavBar>
        <div style={{ padding: 16 }}>
          <Skeleton.Title animated />
          <Skeleton.Paragraph lineCount={5} animated />
        </div>
      </>
    );
  }

  if (error || !board) {
    return (
      <>
        <NavBar onBack={() => navigate('/tasks/boards')}>Board</NavBar>
        <ErrorBlock status="default" title="Unable to load board" />
      </>
    );
  }

  return (
    <>
      <NavBar
        onBack={() => navigate('/tasks/boards')}
        right={
          <span
            onClick={() => setBoardActionSheetVisible(true)}
            style={{ fontSize: 14, color: '#1890ff', cursor: 'pointer' }}
          >
            More
          </span>
        }
      >
        {board.name}
      </NavBar>
      <PullToRefresh onRefresh={fetchData}>
        <div style={{ padding: 12, paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          {board.columns.length === 0 ? (
            <ErrorBlock
              status="empty"
              title="No columns"
              description="Tap More > Manage Columns to add columns"
            />
          ) : (
            <Collapse
              className="board-columns"
              defaultActiveKey={board.columns.map(c => String(c.sysId))}
              style={{ '--content-background-color': 'transparent' } as React.CSSProperties}
            >
              {board.columns.map(column => {
                const columnTasks = tasksByColumn[column.sysId] || [];
                return (
                  <Collapse.Panel
                    key={String(column.sysId)}
                    title={
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 600, fontSize: 14 }}>{column.name}</span>
                        <Tag style={{ '--font-size': '11px' } as React.CSSProperties}>
                          {columnTasks.length}
                        </Tag>
                      </div>
                    }
                  >
                    {columnTasks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: 16, color: '#bfbfbf', fontSize: 13 }}>
                        No tasks in this column
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {columnTasks.map(task => (
                          <Card
                            key={task.sysId}
                            onClick={() => handleTaskTap(task)}
                            style={{ borderRadius: 8, cursor: 'pointer' }}
                          >
                            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4 }}>
                              {task.name}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <Tag
                                color={priorityColors[task.priority]}
                                fill="outline"
                                style={{ '--font-size': '10px', '--padding-inline': '4px' } as React.CSSProperties}
                              >
                                {task.priority}
                              </Tag>
                              {getDueDateDisplay(task.dueDate)}
                            </div>
                          </Card>
                        ))}
                      </div>
                    )}
                  </Collapse.Panel>
                );
              })}
            </Collapse>
          )}
        </div>
      </PullToRefresh>

      {/* Board ActionSheet */}
      <ActionSheet
        visible={boardActionSheetVisible}
        actions={boardActions}
        onClose={() => setBoardActionSheetVisible(false)}
        cancelText="Cancel"
      />

      {/* Task ActionSheet */}
      <ActionSheet
        visible={taskActionSheetVisible}
        actions={getTaskActions()}
        onClose={() => setTaskActionSheetVisible(false)}
        cancelText="Cancel"
      />
    </>
  );
};

export default BoardDetail;
