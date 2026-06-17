import { Customer } from './types';

export function formatPaymentReminder(customer: Customer, shopName: string): string {
  const amountRs = (customer.current_balance / 100).toFixed(2);
  return `Dear ${customer.name}, your Udhaar balance of Rs.${amountRs} at ${shopName} is overdue. Please settle it at the earliest.`;
}
