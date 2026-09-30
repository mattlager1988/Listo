// Colour flags that can be set on a task from the board.
// The `key` is what the API stores; keep it in sync with ValidFlagColors in
// listo-api/Services/TaskItemService.cs and with the copy of this palette in
// listo-web (src/pages/tasks/BoardView.tsx, which is self-contained).
export interface TaskFlagColor {
  key: string;
  label: string;
  /** Accent colour for the flag icon / card border. */
  hex: string;
  /** Soft background tint applied to a flagged card. */
  tint: string;
}

export const TASK_FLAG_COLORS: TaskFlagColor[] = [
  { key: 'red', label: 'Red', hex: '#ff4d4f', tint: '#fff1f0' },
  { key: 'orange', label: 'Orange', hex: '#fa8c16', tint: '#fff7e6' },
  { key: 'yellow', label: 'Yellow', hex: '#fadb14', tint: '#feffe6' },
  { key: 'green', label: 'Green', hex: '#52c41a', tint: '#f6ffed' },
  { key: 'blue', label: 'Blue', hex: '#1890ff', tint: '#e6f4ff' },
  { key: 'purple', label: 'Purple', hex: '#722ed1', tint: '#f9f0ff' },
];

export const getTaskFlagColor = (key?: string | null): TaskFlagColor | undefined =>
  key ? TASK_FLAG_COLORS.find(c => c.key === key) : undefined;
