import type { DosageForm, ProductStatus } from '../types/pharma';

export function formatBDT(amount: number): string {
  return `৳${amount.toFixed(2)}`;
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return 'Recently';
  const diffSec = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatDateTime(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return isoString;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const DOSAGE_FORMS: DosageForm[] = [
  'Tablet',
  'Capsule',
  'Syrup',
  'Suspension',
  'Injection',
  'Inhaler',
  'Drops',
  'Cream',
  'Suppository',
  'Powder',
];

export function getStatusBadgeClass(status: ProductStatus): string {
  switch (status) {
    case 'Available':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'New Launch':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Price Revised':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Limited Stock':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'Discontinued':
      return 'bg-rose-50 text-rose-700 border-rose-200';
  }
}

export function getDosageBadgeColor(form: DosageForm): string {
  switch (form) {
    case 'Tablet':
      return 'bg-sky-50 text-sky-700 border-sky-200';
    case 'Capsule':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'Syrup':
    case 'Suspension':
      return 'bg-amber-50 text-amber-700 border-amber-200';
    case 'Injection':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'Inhaler':
      return 'bg-teal-50 text-teal-700 border-teal-200';
    case 'Drops':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
