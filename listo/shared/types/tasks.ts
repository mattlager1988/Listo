export interface TaskItem {
  sysId: number;
  name: string;
  description?: string;
  priority: string;
  dueDate?: string;
  sortOrder: number;
  isCompleted: boolean;
  completedDate?: string;
  /** Colour flag key (red, orange, yellow, green, blue, purple) or null when unflagged. */
  flagColor?: string | null;
  /** Timestamp of the most recent note logged against the task, null if none. */
  lastNoteDate?: string | null;
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
