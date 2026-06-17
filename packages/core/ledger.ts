import { Customer } from './types';

export interface AgingBuckets {
  '0-30': number;
  '31-60': number;
  '61-90': number;
  '90+': number;
  total_overdue: number;
}

export function calculateAging(customer: Customer, currentDate: Date = new Date()): AgingBuckets {
  const buckets: AgingBuckets = { '0-30': 0, '31-60': 0, '61-90': 0, '90+': 0, total_overdue: 0 };
  
  if (customer.current_balance <= 0 || !customer.credit_due_date) {
    return buckets;
  }

  const dueDate = new Date(customer.credit_due_date);
  const diffTime = currentDate.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays <= 0) {
    return buckets; // Not overdue yet
  }

  buckets.total_overdue = customer.current_balance;

  if (diffDays <= 30) {
    buckets['0-30'] = customer.current_balance;
  } else if (diffDays <= 60) {
    buckets['31-60'] = customer.current_balance;
  } else if (diffDays <= 90) {
    buckets['61-90'] = customer.current_balance;
  } else {
    buckets['90+'] = customer.current_balance;
  }

  return buckets;
}

export function isCustomerOverdue(customer: Customer, currentDate: Date = new Date()): boolean {
  if (customer.current_balance <= 0 || !customer.credit_due_date) return false;
  const dueDate = new Date(customer.credit_due_date);
  return currentDate.getTime() > dueDate.getTime();
}
