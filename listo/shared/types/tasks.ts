export interface TaskItem {
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

export interface BoardSummary {
  sysId: number;
  name: string;
  color: string | null;
  taskCount: number;
  columnCount: number;
}

export interface BoardColumn {
  sysId: number;
  name: string;
  sortOrder: number;
  taskCount: number;
}

export interface BoardDetail {
  sysId: number;
  name: string;
  color: string | null;
  taskCount: number;
  columns: BoardColumn[];
}

// An append-only, timestamped note logged against a task.
export interface TaskNote {
  sysId: number;
  taskItemSysId: number;
  content: string;
  createTimestamp: string;
  createUser?: number;
  authorName?: string | null;
}
