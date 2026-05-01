// Client-safe. No server-only imports here.
// getUserRoles lives in src/lib/auth/get-user-roles.ts (server-only).
// requireSelectedRole lives in src/lib/auth/require-role.ts (server-only).

export type UserRole =
  | 'super_admin'
  | 'admin'
  | 'moderator'
  | 'institution_director'
  | 'operator'
  | 'viewer';

export interface RoleConfig {
  label: string;
  description: string;
  color: string;
}

export const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  super_admin: {
    label: 'Super Admin',
    description: "Tizimni to'liq boshqarish va foydalanuvchilar nazorati",
    color: 'bg-red-100 text-red-700 border-red-200',
  },
  admin: {
    label: 'Admin',
    description: "Obyektlarni boshqarish va ma'lumotlar importi",
    color: 'bg-blue-100 text-blue-700 border-blue-200',
  },
  moderator: {
    label: 'Moderator',
    description: "O'zgarishlarni tekshirish va tasdiqlash",
    color: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  },
  institution_director: {
    label: 'Muassasa direktori',
    description: "Faqat o'z muassasasi ma'lumotlarini tahrirlash",
    color: 'bg-purple-100 text-purple-700 border-purple-200',
  },
  operator: {
    label: 'Operator',
    description: "Ma'lumotlarni kiritish va qoralama yaratish",
    color: 'bg-amber-100 text-amber-700 border-amber-200',
  },
  viewer: {
    label: 'Kuzatuvchi',
    description: "Ma'lumotlarni faqat ko'rish imkoniyati",
    color: 'bg-slate-100 text-slate-700 border-slate-200',
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// ACTION-LEVEL PERMISSIONS
//
// Use these in Server Actions instead of checking roles directly. This decouples
// business logic from the specific role set and makes permission changes easy.
//
// Example:
//   const { selectedRole } = await requireSelectedRole('objects.create');
// ─────────────────────────────────────────────────────────────────────────────
export type Permission =
  | 'objects.read'          // View medical objects in admin
  | 'objects.create'        // Submit new object (draft)
  | 'objects.update'        // Edit existing object
  | 'objects.import'        // Bulk import (CSV/Excel/GeoJSON)
  | 'objects.approve'       // Approve/reject moderation requests
  | 'moderation.read'       // See the moderation queue
  | 'moderation.review'     // Approve or reject a change request
  | 'users.read'            // View user list
  | 'users.manage'          // Create/block/unblock users, edit profiles
  | 'roles.manage'          // Grant or revoke roles (super_admin only)
  | 'audit.read'            // View audit log
  | 'settings.manage'       // Change system settings
  | 'institution.read'      // Read own assigned institution(s)
  | 'institution.update';   // Update own assigned institution(s)

const ALL_PERMISSIONS: Permission[] = [
  'objects.read', 'objects.create', 'objects.update', 'objects.import', 'objects.approve',
  'moderation.read', 'moderation.review',
  'users.read', 'users.manage', 'roles.manage',
  'audit.read', 'settings.manage',
  'institution.read', 'institution.update',
];

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  super_admin: ALL_PERMISSIONS,

  admin: [
    'objects.read', 'objects.create', 'objects.update', 'objects.import', 'objects.approve',
    'moderation.read', 'moderation.review',
    'users.read', 'users.manage',
    'roles.manage',
    'audit.read',
  ],

  // Moderator can grant/revoke roles BELOW their level to existing users,
  // but cannot create new users or block accounts (no users.manage).
  moderator: [
    'objects.read', 'objects.create', 'objects.update',
    'moderation.read', 'moderation.review',
    'users.read',
    'roles.manage',
    'audit.read',
  ],

  operator: [
    'objects.read', 'objects.create', 'objects.update', 'objects.import',
    'moderation.read',
    'audit.read',
  ],

  // institution_director has NO general objects.* access.
  // They can only read/update through the institution scope (enforced by
  // getDirectorInstitutions + RLS policy on medical_objects).
  institution_director: [
    'institution.read',
    'institution.update',
    'audit.read',
  ],

  viewer: [
    'objects.read',
    'audit.read',
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROLE HIERARCHY
//
// Lower number = higher privilege. A role can only grant roles with a strictly
// higher level number (lower in hierarchy).
//
// This is enforced client-side (for UI filtering) AND server-side (in Server
// Actions) — the server check is authoritative.
// ─────────────────────────────────────────────────────────────────────────────
export const ROLE_LEVEL: Record<UserRole, number> = {
  super_admin:          1,
  admin:                2,
  moderator:            3,
  operator:             4,
  institution_director: 5,
  viewer:               6,
};

/**
 * Returns true if a user acting under `actorRole` is allowed to grant `targetRole`.
 * Rule: can only grant roles with a strictly higher level number (i.e. lower privilege).
 * super_admin is the only role that can grant admin.
 */
export function canGrantRole(actorRole: UserRole, targetRole: UserRole): boolean {
  return ROLE_LEVEL[actorRole] < ROLE_LEVEL[targetRole];
}

/**
 * Returns the list of roles that a user acting under `actorRole` is allowed to grant.
 * Sorted from highest privilege to lowest (ascending level number).
 */
export function grantableRoles(actorRole: UserRole): UserRole[] {
  return (Object.keys(ROLE_LEVEL) as UserRole[])
    .filter((role) => ROLE_LEVEL[actorRole] < ROLE_LEVEL[role])
    .sort((a, b) => ROLE_LEVEL[a] - ROLE_LEVEL[b]);
}

// ─────────────────────────────────────────────────────────────────────────────
// ROUTE-LEVEL ACCESS
// Maps pathnames to the roles allowed to reach them.
// canAccessRoute is used by middleware and admin layout.
// ─────────────────────────────────────────────────────────────────────────────
export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  '/admin/dashboard':          ['super_admin', 'admin', 'moderator', 'operator', 'viewer'],
  '/admin/users':              ['super_admin', 'admin'],
  '/admin/objects':            ['super_admin', 'admin', 'moderator', 'operator', 'viewer'],
  '/admin/objects/new':        ['super_admin', 'admin', 'moderator', 'operator'],
  '/admin/objects/import':     ['super_admin', 'admin', 'operator'],
  '/admin/objects/bulk-paste': ['super_admin', 'admin', 'operator'],
  '/admin/moderation':         ['super_admin', 'admin', 'moderator'],
  '/admin/audit-log':          ['super_admin', 'admin', 'moderator', 'operator', 'institution_director'],
  '/admin/settings':           ['super_admin'],
  '/institution':              ['institution_director'],
};

/**
 * Check if a selected role can reach a given pathname.
 * Multi-role users choose one active role per session; this function
 * enforces that selection at the routing layer.
 */
export function canAccessRoute(pathname: string, role: UserRole): boolean {
  // Exact match
  if (ROUTE_ACCESS[pathname]) {
    return ROUTE_ACCESS[pathname].includes(role);
  }

  // Prefix / dynamic segment match
  for (const route in ROUTE_ACCESS) {
    const pattern = route.replace(/\[.*?\]/g, '[^/]+');
    if (new RegExp(`^${pattern}(/.*)?$`).test(pathname)) {
      return ROUTE_ACCESS[route].includes(role);
    }
  }

  // Dynamic sub-routes under /admin/objects (e.g. /admin/objects/[id]/edit)
  if (pathname.startsWith('/admin/objects/')) {
    return ROUTE_ACCESS['/admin/objects/new'].includes(role);
  }

  // Unknown admin route: allow any authenticated+role-selected user.
  // This is a safe default because middleware already requires auth + role.
  // Tighten here if you want to lock down future unlisted routes by default.
  return true;
}

/** Default landing route per role after login or role switch. */
export const ROLE_DEFAULT_ROUTE: Record<UserRole, string> = {
  super_admin:          '/admin/dashboard',
  admin:                '/admin/dashboard',
  moderator:            '/admin/moderation',
  operator:             '/admin/objects',
  institution_director: '/institution',
  viewer:               '/admin/dashboard',
};
