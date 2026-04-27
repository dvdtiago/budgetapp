import { format, formatDistanceToNow } from 'date-fns';

export function formatPHP(amount) {
  return '₱' + Number(amount).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatDate(date) {
  if (!date) return '—';
  return format(new Date(date), 'MMM d, yyyy');
}

export function formatMonthLabel(key) {
  const [year, month] = key.split('-').map(Number);
  return format(new Date(year, month - 1, 1), 'MMM yyyy');
}

export function formatRelative(date) {
  if (!date) return '—';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function formatPercent(value) {
  return `${Math.round(Number(value))}%`;
}

export function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function getMonthKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function formatPHPShort(amount) {
  const n = Number(amount);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000) return `${sign}₱${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}₱${Math.round(abs / 1_000)}K`;
  return `${sign}₱${Math.round(abs)}`;
}

export function debtTypeLabel(type) {
  return { CREDIT_CARD: 'Credit Card', LOAN: 'Loan', MORTGAGE: 'Mortgage' }[type] ?? type;
}

export function debtStatusColor(status) {
  return { ACTIVE: 'bg-blue-100 text-blue-700', PLANNED: 'bg-amber-100 text-amber-700', PAID_OFF: 'bg-green-100 text-green-700' }[status] ?? '';
}
