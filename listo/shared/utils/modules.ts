// Canonical module keys. Keep in sync with the backend (Listo.Api.Models.ModuleKeys).
export const MODULE_KEYS = {
  dashboard: 'dashboard',
  finance: 'finance',
  aviation: 'aviation',
  passwords: 'passwords',
  tasks: 'tasks',
  messaging: 'messaging',
  lizzylog: 'lizzylog',
  admin: 'admin',
} as const;

export type ModuleKey = (typeof MODULE_KEYS)[keyof typeof MODULE_KEYS];

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
