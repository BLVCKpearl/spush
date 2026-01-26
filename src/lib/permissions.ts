// Role-based permission definitions
// SUPER_ADMIN: Global access across all tenants
// TENANT_ADMIN: Full access within their tenant
// STAFF: Order management + modify own password only

export type UserRole = 'super_admin' | 'tenant_admin' | 'staff' | null;

export interface Permission {
  // Global (super admin only)
  canManageTenants: boolean;
  canManageAllUsers: boolean;
  canViewGlobalAnalytics: boolean;
  canManageCategories: boolean;
  
  // Tenant-scoped
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
  if (role === 'super_admin') {
    return {
      // Global permissions
      canManageTenants: true,
      canManageAllUsers: true,
      canViewGlobalAnalytics: true,
      canManageCategories: true,
      
      // Tenant permissions (super admin has all)
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

  if (role === 'tenant_admin') {
    return {
      // Global permissions (none)
      canManageTenants: false,
      canManageAllUsers: false,
      canViewGlobalAnalytics: false,
      canManageCategories: false,
      
      // Tenant permissions (all within their tenant)
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
      // Global permissions (none)
      canManageTenants: false,
      canManageAllUsers: false,
      canViewGlobalAnalytics: false,
      canManageCategories: false,
      
      // Tenant permissions (limited)
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
    canManageTenants: false,
    canManageAllUsers: false,
    canViewGlobalAnalytics: false,
    canManageCategories: false,
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

// Check if role is super admin
export function isSuperAdmin(role: UserRole): boolean {
  return role === 'super_admin';
}

// Check if role is tenant admin or higher
export function isTenantAdmin(role: UserRole): boolean {
  return role === 'super_admin' || role === 'tenant_admin';
}

// Check if role is staff or higher
export function isStaffOrHigher(role: UserRole): boolean {
  return role === 'super_admin' || role === 'tenant_admin' || role === 'staff';
}
