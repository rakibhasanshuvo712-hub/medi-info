import { Building2, CheckCircle2, Globe, RefreshCw, Rss, X } from 'lucide-react';
import type { CatalogState, Company, MedicineBrand } from '../types/pharma';
import {
  formatBDT,
  formatDateTime,
  formatRelativeTime,
  getDosageBadgeColor,
  getStatusBadgeClass,
} from '../lib/formatters';

interface CompanyDetailModalProps {
  company: Company | null;
  catalog: CatalogState;
  syncing: boolean;
  onClose: () => void;
  onSyncCompany: (companyId: string) => void;
  onSelectBrand: (brand: MedicineBrand) => void;
}

export function CompanyDetailModal({
  company,
  catalog,
  syncing,
  onClose,
  onSyncCompany,
  onSelectBrand,
}: CompanyDetailModalProps) {
  if (!company) return null;

  const brands = catalog.brands
    .filter((b) => b.companyId === company.id)
    .sort((a, b) => a.brandName.localeCompare(b.brandName));

  const genericCount = new Set(brands.map((b) => b.genericId)).size;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                  {company.name}
                </h2>
                {company.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Partner
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm text-slate-600">{company.description}</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-6 p-6">
          {/* Feed & Sync Bar */}
          <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center">
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1 font-semibold text-slate-800">
                  <Rss className="h-3.5 w-3.5 text-teal-600" />
                  Sync Mode: {company.syncMode}
                </span>
                <span>•</span>
                <span className="font-mono text-[11px] text-slate-500">
                  Feed: {company.feedUrl}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <span>
                  Last Synced: <strong>{formatDateTime(company.lastSyncedAt)}</strong> (
                  {formatRelativeTime(company.lastSyncedAt)})
                </span>
                <span>•</span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                >
                  <Globe className="h-3 w-3" />
                  Official Site
                </a>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onSyncCompany(company.id)}
              disabled={syncing}
              className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-teal-800 disabled:opacity-60"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
              Sync {company.shortName} Feed
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 p-3.5 text-center">
              <div className="text-2xl font-extrabold text-slate-900">{brands.length}</div>
              <div className="text-xs font-medium text-slate-500">Indexed Brands</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5 text-center">
              <div className="text-2xl font-extrabold text-slate-900">{genericCount}</div>
              <div className="text-xs font-medium text-slate-500">Unique Generics</div>
            </div>
            <div className="rounded-xl border border-slate-200 p-3.5 text-center">
              <div className="text-2xl font-extrabold text-teal-700">{company.syncMode}</div>
              <div className="text-xs font-medium text-slate-500">Online Pipeline</div>
            </div>
          </div>

          {/* Product Table */}
          <div>
            <h3 className="mb-3 text-base font-bold text-slate-900">
              Complete Product Portfolio ({brands.length})
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Brand</th>
                    <th className="px-4 py-2.5 font-semibold">Generic</th>
                    <th className="px-4 py-2.5 font-semibold">Form &amp; Strength</th>
                    <th className="px-4 py-2.5 font-semibold">Unit Price</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {brands.map((b) => {
                    const g = catalog.generics.find((x) => x.id === b.genericId);
                    return (
                      <tr
                        key={b.id}
                        onClick={() => onSelectBrand(b)}
                        className="cursor-pointer transition hover:bg-teal-50/50"
                      >
                        <td className="px-4 py-2.5 font-semibold text-teal-700">{b.brandName}</td>
                        <td className="px-4 py-2.5 text-slate-600">{g?.name}</td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`mr-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium ${getDosageBadgeColor(
                              b.dosageForm,
                            )}`}
                          >
                            {b.dosageForm}
                          </span>
                          <span className="font-mono text-xs text-slate-600">{b.strength}</span>
                        </td>
                        <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                          {formatBDT(b.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClass(
                              b.status,
                            )}`}
                          >
                            {b.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
