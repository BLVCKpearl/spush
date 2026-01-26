// Role-based permission definitions
// ADMIN: Full access to all features
// STAFF: Order confirmation dashboard + modify own password only

export type UserRole = 'admin' | 'staff' | null;

export interface Permission {
  canManageMenu: boolean;
  canManageTables: boolean;
  canAccessAnalytics: boolean;
  canManageBankDetails: boolean;
  canManageUsers: boolean;
  canResetPasswords: boolean;
  canAssignRoles: boolean;
  canAccessOrders: boolean;
  canModifyOwnPassword: boolean;
}

export function getPermissions(role: UserRole): Permission {
  if (role === 'admin') {
    return {
      canManageMenu: true,
      canManageTables: true,
      canAccessAnalytics: true,
      canManageBankDetails: true,
      canManageUsers: true,
      canResetPasswords: true,
      canAssignRoles: true,
      canAccessOrders: true,
      canModifyOwnPassword: true,
    };
  }

  if (role === 'staff') {
    return {
      canManageMenu: false,
      canManageTables: false,
      canAccessAnalytics: false,
      canManageBankDetails: false,
      canManageUsers: false,
      canResetPasswords: false,
      canAssignRoles: false,
      canAccessOrders: true,
      canModifyOwnPassword: true,
    };
  }

  // No role - no permissions
  return {
    canManageMenu: false,
    canManageTables: false,
    canAccessAnalytics: false,
    canManageBankDetails: false,
    canManageUsers: false,
    canResetPasswords: false,
    canAssignRoles: false,
    canAccessOrders: false,
    canModifyOwnPassword: false,
  };
}
