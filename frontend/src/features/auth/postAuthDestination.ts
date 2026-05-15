import type { AuthUser } from './types';

export function resolvePostAuthDestination(
  user: AuthUser,
  from: string | null,
): string {
  const isAdmin = user.roles.includes('Admin');

  if (isAdmin) {
    if (from !== null && from.startsWith('/admin')) return from;
    return '/admin';
  }

  if (from !== null && !from.startsWith('/admin')) return from;
  return '/';
}
