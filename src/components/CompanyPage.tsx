import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe,
  RefreshCw,
  Rss,
} from 'lucide-react';
import type { CatalogState, Company, Generic, MedicineBrand } from '../types/pharma';
import {
  formatBDT,
  formatDateTime,
  formatRelativeTime,
  getStatusBadgeClass,
} from '../lib/formatters';
import { DosageIcon } from './DosageIcon';

interface CompanyPageProps {
  company: Company;
  catalog: CatalogState;
  syncing: boolean;
  onBack: () => void;
  onSyncCompany: (companyId: string) => void;
  onSelectBrand: (brand: MedicineBrand) => void;
  onSelectGeneric: (generic: Generic) => void;
}

export function CompanyPage({
  company,
  catalog,
  syncing,
  onBack,
  onSyncCompany,
  onSelectBrand,
  onSelectGeneric,
}: CompanyPageProps) {
  const [query, setQuery] = useState('');

  const allBrands = useMemo(
    () =>
      catalog.brands
        .filter((b) => b.companyId === company.id)
        .sort((a, b) => a.brandName.localeCompare(b.brandName)),
    [catalog.brands, company.id],
  );

  const genericMap = useMemo(
    () => new Map(catalog.generics.map((g) => [g.id, g])),
    [catalog.generics],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allBrands;
    return allBrands.filter((b) => {
      const g = genericMap.get(b.genericId);
      return (
        b.brandName.toLowerCase().includes(q) ||
        b.strength.toLowerCase().includes(q) ||
        (g?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [allBrands, query, genericMap]);

  const genericCount = new Set(allBrands.map((b) => b.genericId)).size;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onBack} className="font-medium text-teal-700 hover:underline">
            Pharmaceuticals
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-800">{company.name}</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Companies
        </button>
      </div>

      {/* Company Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold text-slate-900">{company.name}</h1>
                {company.verified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Verified Sync
                  </span>
                )}
              </div>
              <p className="mt-1 max-w-2xl text-sm text-slate-600">{company.description}</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                <span>
                  <strong className="text-slate-800">{allBrands.length}</strong> Brands •{' '}
                  <strong className="text-slate-800">{genericCount}</strong> Generics
                </span>
                <span className="inline-flex items-center gap-1">
                  <Rss className="h-3.5 w-3.5 text-teal-600" />
                  {company.syncMode}
                </span>
                <span>
                  Last Synced: {formatDateTime(company.lastSyncedAt)} (
                  {formatRelativeTime(company.lastSyncedAt)})
                </span>
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-teal-700 hover:underline"
                >
                  <Globe className="h-3.5 w-3.5" />
                  Website
                </a>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => onSyncCompany(company.id)}
            disabled={syncing}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
            Sync Online Feed
          </button>
        </div>
      </section>

      {/* Product Table */}
      <section className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <h2 className="text-base font-bold text-slate-900">
            Products by {company.shortName} ({filtered.length})
          </h2>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter company products..."
            className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm focus:border-teal-600 focus:outline-none sm:w-64"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-3 py-2.5 font-semibold">Brand Name</th>
                <th className="px-3 py-2.5 font-semibold">Generic</th>
                <th className="px-3 py-2.5 font-semibold">Form &amp; Strength</th>
                <th className="px-3 py-2.5 font-semibold">Unit Price</th>
                <th className="px-3 py-2.5 font-semibold">Pack Price</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.map((b) => {
                const g = genericMap.get(b.genericId);
                return (
                  <tr
                    key={b.id}
                    onClick={() => onSelectBrand(b)}
                    className="cursor-pointer transition hover:bg-teal-50/50"
                  >
                    <td className="px-3 py-2.5 font-semibold text-teal-700">
                      <span className="inline-flex items-center gap-1.5">
                        <DosageIcon form={b.dosageForm} className="h-3.5 w-3.5" />
                        {b.brandName}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {g && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectGeneric(g);
                          }}
                          className="text-slate-700 hover:text-teal-700 hover:underline"
                        >
                          {g.name}
                        </button>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-slate-700">
                      {b.dosageForm} • <span className="font-mono text-xs">{b.strength}</span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                      {formatBDT(b.unitPrice)}
                    </td>
                    <td className="px-3 py-2.5 font-mono text-xs text-slate-600">
                      {formatBDT(b.packPrice)}
                    </td>
                    <td className="px-3 py-2.5">
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
      </section>
    </div>
  );
}
