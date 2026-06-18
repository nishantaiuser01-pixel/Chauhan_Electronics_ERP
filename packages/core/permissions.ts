export const ROLES = ['OWNER', 'CASHIER', 'STOCK', 'TECHNICIAN', 'SALESPERSON'] as const;
export type Role = typeof ROLES[number];

export const ACTIONS = [
  // Reads
  'READ_DASHBOARD', 'READ_CATALOGUE', 'READ_STOCK', 'READ_CUSTOMERS', 'READ_SUPPLIERS', 'READ_REPAIRS', 'READ_ACCOUNTING',
  
  // High sensitivity
  'EDIT_PRICE', 'OVERRIDE_CREDIT', 'VOID_SALE', 'REFUND_EDIT', 'BACKUP_RESTORE', 'USER_MGMT', 'EDIT_CATALOGUE', 'CREATE_SUPPLIER', 'RECORD_EXPENSE', 'VIEW_REPORTS', 'SHOW_COST',

  // Routine
  'CHECKOUT', 'RECEIVE_GRN', 'MANAGE_REPAIRS', 'RECORD_PAYMENT', 'ISSUE_CN'
] as const;

export type Action = typeof ACTIONS[number];

let globalOverrides: Record<string, boolean> = {};

export function setPermissionsOverrides(overrides: Record<string, boolean>) {
  globalOverrides = overrides;
}

export function authorize(role: Role | string | undefined | null, action: Action, overrides?: Record<string, boolean>): boolean {
  if (!role) return false;
  
  // OWNER can do everything
  if (role === 'OWNER') return true;

  // Check if there is an explicit override for this role_action combination
  const activeOverrides = overrides || globalOverrides;
  const overrideKey = `${role}_${action}`;
  if (activeOverrides && activeOverrides[overrideKey] !== undefined) {
    return activeOverrides[overrideKey];
  }

  switch (action) {
    case 'EDIT_PRICE':
    case 'OVERRIDE_CREDIT':
    case 'VOID_SALE':
    case 'REFUND_EDIT':
    case 'BACKUP_RESTORE':
    case 'USER_MGMT':
    case 'VIEW_REPORTS':
      return false; // Only OWNER
      
    case 'EDIT_CATALOGUE':
      return role === 'STOCK';
      
    case 'CREATE_SUPPLIER':
      return role === 'CASHIER' || role === 'STOCK';
      
    case 'SHOW_COST':
      return false; // OWNER-only (handled by the OWNER shortcut above)

    case 'RECORD_EXPENSE':
    case 'RECORD_PAYMENT':
    case 'ISSUE_CN':
      return role === 'CASHIER';

    case 'CHECKOUT':
      return role === 'CASHIER' || role === 'SALESPERSON';
      
    case 'RECEIVE_GRN':
      return role === 'STOCK';
      
    case 'MANAGE_REPAIRS':
      return role === 'TECHNICIAN' || role === 'CASHIER';

    // READ permissions
    case 'READ_DASHBOARD': return true;
    case 'READ_CATALOGUE': return true;
    case 'READ_STOCK': return true;
    case 'READ_CUSTOMERS': return role === 'CASHIER' || role === 'SALESPERSON';
    case 'READ_SUPPLIERS': return role === 'CASHIER' || role === 'STOCK';
    case 'READ_REPAIRS': return true;
    case 'READ_ACCOUNTING': return role === 'CASHIER';

    default:
      return false; // default deny
  }
}

export function assertCan(role: Role | string | undefined | null, action: Action, overrides?: Record<string, boolean>) {
  if (!authorize(role, action, overrides)) {
    throw new Error(`Unauthorized: Role ${role} cannot perform ${action}`);
  }
}
