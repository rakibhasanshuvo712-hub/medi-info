import {
  AlertTriangle,
  Building2,
  CheckCircle2,
  Clock,
  FlaskConical,
  Layers,
  ShieldAlert,
  X,
} from 'lucide-react';
import type { CatalogState, Company, Generic, MedicineBrand } from '../types/pharma';
import {
  formatBDT,
  formatDateTime,
  getDosageBadgeColor,
  getStatusBadgeClass,
} from '../lib/formatters';

interface BrandDetailModalProps {
  brand: MedicineBrand | null;
  catalog: CatalogState;
  onClose: () => void;
  onSelectBrand: (brand: MedicineBrand) => void;
  onSelectGeneric: (generic: Generic) => void;
  onSelectCompany: (company: Company) => void;
}

export function BrandDetailModal({
  brand,
  catalog,
  onClose,
  onSelectBrand,
  onSelectGeneric,
  onSelectCompany,
}: BrandDetailModalProps) {
  if (!brand) return null;

  const generic = catalog.generics.find((g) => g.id === brand.genericId);
  const company = catalog.companies.find((c) => c.id === brand.companyId);
  const alternateBrands = catalog.brands
    .filter((b) => b.genericId === brand.genericId && b.id !== brand.id)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/55 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-2xl font-extrabold text-slate-900">{brand.brandName}</h2>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getDosageBadgeColor(
                  brand.dosageForm,
                )}`}
              >
                {brand.dosageForm}
              </span>
              <span className="rounded-lg bg-slate-100 px-2.5 py-0.5 font-mono text-xs font-semibold text-slate-700">
                {brand.strength}
              </span>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${getStatusBadgeClass(
                  brand.status,
                )}`}
              >
                {brand.status}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
              {generic && (
                <button
                  type="button"
                  onClick={() => onSelectGeneric(generic)}
                  className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  {generic.name}
                </button>
              )}
              {company && (
                <button
                  type="button"
                  onClick={() => onSelectCompany(company)}
                  className="inline-flex items-center gap-1 font-medium text-slate-700 hover:text-teal-700 hover:underline"
                >
                  <Building2 className="h-3.5 w-3.5" />
                  {company.name}
                </button>
              )}
              <span className="font-mono text-xs text-slate-400">{brand.darNumber}</span>
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
          {/* Pricing & Live Sync Metadata */}
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-xl border border-teal-200 bg-teal-50/50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-teal-700">
                Unit Price
              </div>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="font-mono text-2xl font-bold text-slate-900">
                  {formatBDT(brand.unitPrice)}
                </span>
                {brand.previousUnitPrice !== undefined &&
                  brand.previousUnitPrice !== brand.unitPrice && (
                    <span className="font-mono text-sm text-slate-400 line-through">
                      {formatBDT(brand.previousUnitPrice)}
                    </span>
                  )}
              </div>
              <div className="mt-1 text-xs text-slate-500">Per single {brand.dosageForm.toLowerCase()}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Pack / Box Price
              </div>
              <div className="mt-1 font-mono text-2xl font-bold text-slate-900">
                {formatBDT(brand.packPrice)}
              </div>
              <div className="mt-1 text-xs text-slate-500">Pack Size: {brand.packSize}</div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Last Manufacturer Sync
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-slate-900">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                {brand.updateSource}
              </div>
              <div className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Clock className="h-3 w-3" />
                {formatDateTime(brand.updatedAt)}
              </div>
            </div>
          </div>

          {/* Clinical Monograph */}
          {generic && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h3 className="text-base font-bold text-slate-900">
                  Clinical Monograph — {generic.name}
                </h3>
                <span className="rounded-full bg-indigo-50 px-3 py-0.5 text-xs font-semibold text-indigo-700">
                  {generic.therapeuticClass}
                </span>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Indications
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {generic.indications}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Pharmacology
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {generic.pharmacology}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                    Dosage &amp; Administration
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    {generic.dosage}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 p-4">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-700">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Side Effects &amp; Interactions
                  </h4>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    <strong>Side Effects:</strong> {generic.sideEffects}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-700">
                    <strong>Interactions:</strong> {generic.interactions}
                  </p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-3.5">
                  <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-rose-700">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Contraindications
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {generic.contraindications}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Pregnancy &amp; Lactation
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">
                    {generic.pregnancyCategory}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    Storage Conditions
                  </h4>
                  <p className="mt-1 text-xs leading-relaxed text-slate-700">{generic.storage}</p>
                </div>
              </div>
            </div>
          )}

          {/* Alternate Brands Comparison */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Layers className="h-4 w-4 text-teal-700" />
              <h3 className="text-base font-bold text-slate-900">
                Alternate Brands ({alternateBrands.length})
              </h3>
            </div>

            {alternateBrands.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 p-4 text-center text-sm text-slate-500">
                No other brands currently indexed for {generic?.name}.
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2.5 font-semibold">Brand</th>
                      <th className="px-4 py-2.5 font-semibold">Company</th>
                      <th className="px-4 py-2.5 font-semibold">Form &amp; Strength</th>
                      <th className="px-4 py-2.5 font-semibold">Unit Price</th>
                      <th className="px-4 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {alternateBrands.map((alt) => {
                      const altComp = catalog.companies.find((c) => c.id === alt.companyId);
                      return (
                        <tr
                          key={alt.id}
                          onClick={() => onSelectBrand(alt)}
                          className="cursor-pointer transition hover:bg-teal-50/50"
                        >
                          <td className="px-4 py-2.5 font-semibold text-teal-700">
                            {alt.brandName}
                          </td>
                          <td className="px-4 py-2.5 text-slate-600">{altComp?.shortName}</td>
                          <td className="px-4 py-2.5 text-slate-700">
                            {alt.dosageForm} • <span className="font-mono text-xs">{alt.strength}</span>
                          </td>
                          <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                            {formatBDT(alt.unitPrice)}
                          </td>
                          <td className="px-4 py-2.5">
                            <span
                              className={`inline-block rounded-full border px-2 py-0.5 text-[11px] font-medium ${getStatusBadgeClass(
                                alt.status,
                              )}`}
                            >
                              {alt.status}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
