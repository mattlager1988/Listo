import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Card, Tag, Space, message, Popconfirm, Tooltip, Spin, Empty, Segmented } from 'antd';
import {
  ArrowLeftOutlined,
  SettingOutlined,
  CheckOutlined,
  RollbackOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  EditOutlined,
  ReloadOutlined,
  TableOutlined,
  AppstoreOutlined,
} from '@ant-design/icons';
import { ProTable } from '@ant-design/pro-components';
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import type { DragEndEvent, DragOverEvent, DragStartEvent } from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { DragOverlay } from '@dnd-kit/core';
import dayjs from 'dayjs';
import api from '../../services/api';
import PageHeader from '../../components/PageHeader';
import TaskFormModal from '../../components/TaskFormModal';
import ColumnSettingsModal from './ColumnSettingsModal';

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

interface BoardColumn {
  sysId: number;
  name: string;
  sortOrder: number;
  taskCount: number;
}

interface BoardDetail {
  sysId: number;
  name: string;
  color: string | null;
  taskCount: number;
  columns: BoardColumn[];
}

const priorityColors: Record<string, string> = {
  High: 'red',
  Medium: 'orange',
  Low: 'blue',
};

// Droppable column container for empty columns
const DroppableColumn: React.FC<{ id: string; children: React.ReactNode }> = ({ id, children }) => {
  const { setNodeRef } = useDroppable({ id });
  return <div ref={setNodeRef} style={{ minHeight: 60, flex: 1 }}>{children}</div>;
};

// Sortable task card
const SortableTaskCard: React.FC<{
  task: TaskItem;
  onEdit: (task: TaskItem) => void;
  onComplete: (id: number) => void;
  onBacklog: (id: number) => void;
  onDelete: (id: number) => void;
  isDragOverlay?: boolean;
}> = ({ task, onEdit, onComplete, onBacklog, onDelete, isDragOverlay }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: `task-${task.sysId}` });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const getDueDateDisplay = () => {
    if (!task.dueDate) return null;
    const due = dayjs(task.dueDate);
    const today = dayjs().startOf('day');
    const isOverdue = due.isBefore(today);
    const isToday = due.isSame(today, 'day');
    return (
      <span style={{ fontSize: 11, color: isOverdue ? 'red' : isToday ? 'orange' : '#8c8c8c' }}>
        {isOverdue && <ExclamationCircleOutlined style={{ marginRight: 2 }} />}
        {due.format('MMM D')}
      </span>
    );
  };

  const cardContent = (
    <Card
      size="small"
      style={{
        marginBottom: 8,
        cursor: isDragOverlay ? 'grabbing' : 'grab',
        boxShadow: isDragOverlay ? '0 4px 12px rgba(0,0,0,0.15)' : undefined,
      }}
      bodyStyle={{ padding: '8px 12px' }}
      onClick={(e) => {
        e.stopPropagation();
        onEdit(task);
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 4, wordBreak: 'break-word' }}>
        {task.name}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Tag color={priorityColors[task.priority]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
          {task.priority}
        </Tag>
        {getDueDateDisplay()}
        <div style={{ flex: 1 }} />
        <Space size={0} style={{ opacity: 0.6 }} className="card-actions">
          <Tooltip title="Complete">
            <Button type="text" size="small" icon={<CheckOutlined style={{ fontSize: 11 }} />} onClick={(e) => { e.stopPropagation(); onComplete(task.sysId); }} style={{ padding: '0 2px', height: 20 }} />
          </Tooltip>
          <Tooltip title="Move to Backlog">
            <Button type="text" size="small" icon={<RollbackOutlined style={{ fontSize: 11 }} />} onClick={(e) => { e.stopPropagation(); onBacklog(task.sysId); }} style={{ padding: '0 2px', height: 20 }} />
          </Tooltip>
          <Popconfirm title="Delete task?" onConfirm={() => onDelete(task.sysId)} okButtonProps={{ danger: true }}>
            <Button type="text" size="small" danger icon={<DeleteOutlined style={{ fontSize: 11 }} />} onClick={(e) => e.stopPropagation()} style={{ padding: '0 2px', height: 20 }} />
          </Popconfirm>
        </Space>
      </div>
    </Card>
  );

  if (isDragOverlay) return cardContent;

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      {cardContent}
    </div>
  );
};

const BoardView: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [board, setBoard] = useState<BoardDetail | null>(null);
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTask, setActiveTask] = useState<TaskItem | null>(null);
  const [dragSourceColumnId, setDragSourceColumnId] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [viewMode, setViewMode] = useState<'kanban' | 'grid'>('kanban');
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fetchBoard = useCallback(async () => {
    if (!id) return;
    try {
      const [boardRes, tasksRes] = await Promise.all([
        api.get(`/tasks/boards/${id}`),
        api.get(`/tasks/items/board/${id}`),
      ]);
      setBoard(boardRes.data);
      setTasks(tasksRes.data);
    } catch {
      message.error('Failed to load board');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBoard();
  }, [fetchBoard]);

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
    // Sort each column's tasks by sortOrder
    Object.values(map).forEach(arr => arr.sort((a, b) => a.sortOrder - b.sortOrder));
    return map;
  }, [tasks, board]);

  const findTaskById = (taskId: string): TaskItem | undefined => {
    const numId = parseInt(taskId.replace('task-', ''));
    return tasks.find(t => t.sysId === numId);
  };

  const findColumnForTask = (taskId: string): number | null => {
    const numId = parseInt(taskId.replace('task-', ''));
    const task = tasks.find(t => t.sysId === numId);
    return task?.taskBoardColumnSysId ?? null;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = findTaskById(event.active.id as string);
    setActiveTask(task || null);
    setDragSourceColumnId(task?.taskBoardColumnSysId ?? null);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeColumnId = findColumnForTask(activeId);

    // Determine target column
    let overColumnId: number | null = null;
    if (overId.startsWith('task-')) {
      overColumnId = findColumnForTask(overId);
    } else if (overId.startsWith('column-')) {
      overColumnId = parseInt(overId.replace('column-', ''));
    }

    if (!activeColumnId || !overColumnId || activeColumnId === overColumnId) return;

    // Move task to new column in local state
    const taskNumId = parseInt(activeId.replace('task-', ''));
    setTasks(prev => prev.map(t =>
      t.sysId === taskNumId
        ? { ...t, taskBoardColumnSysId: overColumnId! }
        : t
    ));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    setActiveTask(null);
    const sourceColumnId = dragSourceColumnId;
    setDragSourceColumnId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;
    const taskNumId = parseInt(activeId.replace('task-', ''));

    // Determine target column
    let targetColumnId: number;
    if (overId.startsWith('column-')) {
      targetColumnId = parseInt(overId.replace('column-', ''));
    } else if (overId.startsWith('task-')) {
      const overTask = findTaskById(overId);
      if (!overTask?.taskBoardColumnSysId) return;
      targetColumnId = overTask.taskBoardColumnSysId;
    } else {
      return;
    }

    const isSameColumn = sourceColumnId === targetColumnId;

    const reorderItems: { sysId: number; taskBoardColumnSysId: number; sortOrder: number }[] = [];

    if (isSameColumn) {
      // Within-column reorder using arrayMove
      const columnTasks = [...(tasksByColumn[targetColumnId] || [])];
      const oldIndex = columnTasks.findIndex(t => t.sysId === taskNumId);
      let newIndex = columnTasks.length - 1;
      if (overId.startsWith('task-')) {
        const overNumId = parseInt(overId.replace('task-', ''));
        newIndex = columnTasks.findIndex(t => t.sysId === overNumId);
      }
      if (oldIndex === -1 || oldIndex === newIndex) return;

      const reordered = arrayMove(columnTasks, oldIndex, newIndex);
      reordered.forEach((t, idx) => {
        reorderItems.push({ sysId: t.sysId, taskBoardColumnSysId: targetColumnId, sortOrder: idx });
      });
    } else {
      // Cross-column move: handleDragOver already moved the task in local state,
      // so tasksByColumn already reflects the move. Just reindex both columns.
      const sourceCol = tasksByColumn[sourceColumnId!] || [];
      sourceCol.forEach((t, idx) => {
        reorderItems.push({ sysId: t.sysId, taskBoardColumnSysId: sourceColumnId!, sortOrder: idx });
      });

      const targetCol = tasksByColumn[targetColumnId] || [];
      targetCol.forEach((t, idx) => {
        reorderItems.push({ sysId: t.sysId, taskBoardColumnSysId: targetColumnId, sortOrder: idx });
      });
    }

    // Update local state
    setTasks(prev => {
      const updated = prev.map(t => {
        const item = reorderItems.find(r => r.sysId === t.sysId);
        if (item) return { ...t, taskBoardColumnSysId: item.taskBoardColumnSysId, sortOrder: item.sortOrder };
        return t;
      });
      return updated;
    });

    // Persist to API
    try {
      await api.put('/tasks/items/reorder', { tasks: reorderItems });
    } catch {
      message.error('Failed to save task order');
      fetchBoard();
    }
  };

  const handleComplete = async (taskId: number) => {
    try {
      await api.post(`/tasks/items/${taskId}/complete`);
      setTasks(prev => prev.filter(t => t.sysId !== taskId));
      message.success('Task completed');
    } catch {
      message.error('Failed to complete task');
    }
  };

  const handleMoveToBacklog = async (taskId: number) => {
    try {
      await api.post(`/tasks/items/${taskId}/backlog`);
      setTasks(prev => prev.filter(t => t.sysId !== taskId));
      message.success('Task moved to backlog');
    } catch {
      message.error('Failed to move task');
    }
  };

  const handleDelete = async (taskId: number) => {
    try {
      await api.delete(`/tasks/items/${taskId}`);
      setTasks(prev => prev.filter(t => t.sysId !== taskId));
      message.success('Task deleted');
    } catch {
      message.error('Failed to delete task');
    }
  };

  const handleEditTask = (task: TaskItem) => {
    setEditingTask(task);
    setFormModalOpen(true);
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setFormModalOpen(true);
  };

  const handleFormSubmit = async (values: { name: string; description?: string; priority?: string; dueDate?: string }) => {
    setSaving(true);
    try {
      if (editingTask) {
        await api.put(`/tasks/items/${editingTask.sysId}`, values);
        message.success('Task updated');
      } else {
        await api.post('/tasks/items', { ...values, taskBoardSysId: Number(id) });
        message.success('Task created');
      }
      setFormModalOpen(false);
      fetchBoard();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error.response?.data?.message || (editingTask ? 'Failed to update task' : 'Failed to create task'));
    } finally {
      setSaving(false);
    }
  };

  const handleBulkComplete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(key => api.post(`/tasks/items/${key}/complete`)));
      setTasks(prev => prev.filter(t => !selectedRowKeys.includes(t.sysId)));
      setSelectedRowKeys([]);
      message.success('Tasks completed');
    } catch {
      message.error('Failed to complete tasks');
    }
  };

  const handleBulkBacklog = async () => {
    try {
      await Promise.all(selectedRowKeys.map(key => api.post(`/tasks/items/${key}/backlog`)));
      setTasks(prev => prev.filter(t => !selectedRowKeys.includes(t.sysId)));
      setSelectedRowKeys([]);
      message.success('Tasks moved to backlog');
    } catch {
      message.error('Failed to move tasks');
    }
  };

  const handleBulkDelete = async () => {
    try {
      await Promise.all(selectedRowKeys.map(key => api.delete(`/tasks/items/${key}`)));
      setTasks(prev => prev.filter(t => !selectedRowKeys.includes(t.sysId)));
      setSelectedRowKeys([]);
      message.success('Tasks deleted');
    } catch {
      message.error('Failed to delete tasks');
    }
  };

  const gridColumns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a: TaskItem, b: TaskItem) => a.name.localeCompare(b.name),
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 90,
      sorter: (a: TaskItem, b: TaskItem) => {
        const order: Record<string, number> = { High: 0, Medium: 1, Low: 2 };
        return (order[a.priority] ?? 1) - (order[b.priority] ?? 1);
      },
      render: (_: unknown, record: TaskItem) => (
        <Tag color={priorityColors[record.priority]} style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
          {record.priority}
        </Tag>
      ),
    },
    {
      title: 'Column',
      dataIndex: 'taskBoardColumnName',
      key: 'taskBoardColumnName',
      width: 140,
      sorter: (a: TaskItem, b: TaskItem) =>
        (a.taskBoardColumnName ?? '').localeCompare(b.taskBoardColumnName ?? ''),
      render: (_: unknown, record: TaskItem) =>
        record.taskBoardColumnName || <span style={{ color: '#bfbfbf' }}>—</span>,
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate',
      width: 110,
      sorter: (a: TaskItem, b: TaskItem) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf();
      },
      render: (_: unknown, record: TaskItem) => {
        if (!record.dueDate) return <span style={{ color: '#bfbfbf' }}>—</span>;
        const due = dayjs(record.dueDate);
        const today = dayjs().startOf('day');
        const isOverdue = due.isBefore(today);
        const isToday = due.isSame(today, 'day');
        return (
          <span style={{ color: isOverdue ? 'red' : isToday ? 'orange' : undefined }}>
            {isOverdue && <ExclamationCircleOutlined style={{ marginRight: 4 }} />}
            {due.format('MM/DD/YYYY')}
          </span>
        );
      },
    },
    {
      title: 'Created',
      dataIndex: 'createTimestamp',
      key: 'createTimestamp',
      width: 120,
      sorter: (a: TaskItem, b: TaskItem) =>
        dayjs(a.createTimestamp).valueOf() - dayjs(b.createTimestamp).valueOf(),
      render: (_: unknown, record: TaskItem) => dayjs(record.createTimestamp).format('MM/DD/YYYY'),
    },
  ];

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 112px)' }}>
        <Spin />
      </div>
    );
  }

  if (!board) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
        <PageHeader title="Board Not Found" />
        <Empty description="Board not found">
          <Button onClick={() => navigate('/tasks/boards')}>Back to Boards</Button>
        </Empty>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 112px)' }}>
      <PageHeader
        title={board.name}
        actions={
          <Space>
            <Segmented
              size="small"
              value={viewMode}
              onChange={(val) => { setViewMode(val as 'kanban' | 'grid'); setSelectedRowKeys([]); }}
              options={[
                { value: 'kanban', icon: <AppstoreOutlined /> },
                { value: 'grid', icon: <TableOutlined /> },
              ]}
            />
            <Button size="small" icon={<SettingOutlined />} onClick={() => setSettingsOpen(true)}>
              Columns
            </Button>
            <Button size="small" icon={<ArrowLeftOutlined />} onClick={() => navigate('/tasks/boards')}>
              Back
            </Button>
          </Space>
        }
      />

      {viewMode === 'grid' ? (
        <>
          {/* Grid action toolbar */}
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
              <Button type="text" size="small" icon={<PlusOutlined />} onClick={handleCreateTask} />
            </Tooltip>
            <Tooltip title="Edit">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                disabled={selectedRowKeys.length !== 1}
                onClick={() => {
                  const task = tasks.find(t => t.sysId === selectedRowKeys[0]);
                  if (task) handleEditTask(task);
                }}
              />
            </Tooltip>
            <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
            <Tooltip title="Complete">
              <Button
                type="text"
                size="small"
                icon={<CheckOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBulkComplete}
              />
            </Tooltip>
            <Tooltip title="Move to Backlog">
              <Button
                type="text"
                size="small"
                icon={<RollbackOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBulkBacklog}
              />
            </Tooltip>
            <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
            <Popconfirm
              title={`Delete ${selectedRowKeys.length} task${selectedRowKeys.length !== 1 ? 's' : ''}?`}
              onConfirm={handleBulkDelete}
              okButtonProps={{ danger: true }}
              disabled={selectedRowKeys.length === 0}
            >
              <Tooltip title="Delete">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  disabled={selectedRowKeys.length === 0}
                />
              </Tooltip>
            </Popconfirm>
            <div style={{ borderLeft: '1px solid #d9d9d9', height: 16, margin: '0 8px' }} />
            <Tooltip title="Refresh">
              <Button type="text" size="small" icon={<ReloadOutlined />} onClick={fetchBoard} />
            </Tooltip>
            <div style={{ flex: 1 }} />
            {selectedRowKeys.length > 0 && (
              <span style={{ color: '#8c8c8c', fontSize: 12 }}>{selectedRowKeys.length} selected</span>
            )}
          </div>

          {/* Grid table */}
          <div className="condensed-table" style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            <ProTable
              columns={gridColumns}
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
                onDoubleClick: () => handleEditTask(record),
                style: { cursor: 'pointer' },
              })}
            />
          </div>
        </>
      ) : board.columns.length === 0 ? (
        <Empty description="No columns configured" style={{ marginTop: 48 }}>
          <Button type="primary" onClick={() => setSettingsOpen(true)}>
            Add Columns
          </Button>
        </Empty>
      ) : (
        <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '16px 0' }}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
          >
            <div style={{ display: 'flex', gap: 16, padding: '0 16px', minHeight: '100%' }}>
              {board.columns.map(column => {
                const columnTasks = tasksByColumn[column.sysId] || [];
                const taskIds = columnTasks.map(t => `task-${t.sysId}`);

                return (
                  <div
                    key={column.sysId}
                    style={{
                      minWidth: 280,
                      maxWidth: 320,
                      flex: '0 0 280px',
                      background: '#f5f5f5',
                      borderRadius: 8,
                      display: 'flex',
                      flexDirection: 'column',
                      borderTop: `3px solid ${board.color || '#1890ff'}`,
                    }}
                  >
                    {/* Column header */}
                    <div style={{ padding: '10px 12px 6px', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 600, fontSize: 13 }}>{column.name}</span>
                      <Tag style={{ fontSize: 10, lineHeight: '16px', padding: '0 4px', margin: 0 }}>
                        {columnTasks.length}
                      </Tag>
                    </div>

                    {/* Cards area */}
                    <div style={{ flex: 1, padding: '4px 8px 8px', overflowY: 'auto' }}>
                      <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
                        <DroppableColumn id={`column-${column.sysId}`}>
                          {columnTasks.map(task => (
                            <SortableTaskCard
                              key={task.sysId}
                              task={task}
                              onEdit={handleEditTask}
                              onComplete={handleComplete}
                              onBacklog={handleMoveToBacklog}
                              onDelete={handleDelete}
                            />
                          ))}
                          {columnTasks.length === 0 && (
                            <div style={{ textAlign: 'center', padding: 16, color: '#bfbfbf', fontSize: 12 }}>
                              Drag tasks here
                            </div>
                          )}
                        </DroppableColumn>
                      </SortableContext>
                    </div>
                  </div>
                );
              })}
            </div>
            <DragOverlay>
              {activeTask ? (
                <SortableTaskCard
                  task={activeTask}
                  onEdit={() => {}}
                  onComplete={() => {}}
                  onBacklog={() => {}}
                  onDelete={() => {}}
                  isDragOverlay
                />
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>
      )}

      {/* Task Edit Modal */}
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

      {/* Column Settings Modal */}
      <ColumnSettingsModal
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); fetchBoard(); }}
        boardId={board.sysId}
        initialColumns={board.columns}
      />
    </div>
  );
};

export default BoardView;
