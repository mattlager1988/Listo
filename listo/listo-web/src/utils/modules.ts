// Canonical module keys. Keep in sync with the backend (Listo.Api.Models.ModuleKeys).
export const MODULE_KEYS = {
  dashboard: 'dashboard',
  finance: 'finance',
  aviation: 'aviation',
  passwords: 'passwords',
  tasks: 'tasks',
  messaging: 'messaging',
  admin: 'admin',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

// Modules an admin can assign to a non-admin user (admin is role-driven).
export const ASSIGNABLE_MODULES: { key: ModuleKey; label: string }[] = [
  { key: MODULE_KEYS.dashboard, label: 'Dashboard' },
  { key: MODULE_KEYS.finance, label: 'Finance & Bills' },
  { key: MODULE_KEYS.aviation, label: 'Aviation' },
  { key: MODULE_KEYS.passwords, label: 'Passwords' },
  { key: MODULE_KEYS.tasks, label: 'Tasks' },
  { key: MODULE_KEYS.messaging, label: 'Messaging' },
];

interface ModuleUser {
  role: string;
  modules?: string[];
}

/**
 * Returns true if the user can access the given module.
 * Admins (role === 'admin') implicitly have access to everything.
 */
export function hasModule(user: ModuleUser | null | undefined, key: string): boolean {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return (user.modules ?? []).includes(key);
}
