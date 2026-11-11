import { FlaskConical, Pill, X } from 'lucide-react';
import type { CatalogState, Company, Generic, MedicineBrand } from '../types/pharma';
import { formatBDT, getDosageBadgeColor, getStatusBadgeClass } from '../lib/formatters';

interface GenericDetailModalProps {
  generic: Generic | null;
  catalog: CatalogState;
  onClose: () => void;
  onSelectBrand: (brand: MedicineBrand) => void;
  onSelectCompany: (company: Company) => void;
}

export function GenericDetailModal({
  generic,
  catalog,
  onClose,
  onSelectBrand,
  onSelectCompany,
}: GenericDetailModalProps) {
  if (!generic) return null;

  const brands = catalog.brands
    .filter((b) => b.genericId === generic.id)
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
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white/95 px-6 py-4 backdrop-blur">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
                <FlaskConical className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">{generic.name}</h2>
                <div className="text-xs font-semibold text-indigo-700">
                  {generic.therapeuticClass} • {brands.length} Available Brands
                </div>
              </div>
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
          <div className="grid gap-4 md:grid-cols-2">
            {[
              { title: 'Indications', body: generic.indications },
              { title: 'Pharmacology', body: generic.pharmacology },
              { title: 'Dosage & Administration', body: generic.dosage },
              { title: 'Side Effects', body: generic.sideEffects },
              { title: 'Drug Interactions', body: generic.interactions },
              { title: 'Contraindications', body: generic.contraindications },
              { title: 'Pregnancy & Lactation', body: generic.pregnancyCategory },
              { title: 'Storage Conditions', body: generic.storage },
            ].map((section) => (
              <div key={section.title} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4">
                <h3 className="text-xs font-bold uppercase tracking-wider text-teal-700">
                  {section.title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{section.body}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="mb-3 flex items-center gap-2">
              <Pill className="h-4 w-4 text-teal-700" />
              <h3 className="text-base font-bold text-slate-900">
                Available Brands &amp; Price Comparison
              </h3>
            </div>

            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Brand Name</th>
                    <th className="px-4 py-2.5 font-semibold">Company</th>
                    <th className="px-4 py-2.5 font-semibold">Form</th>
                    <th className="px-4 py-2.5 font-semibold">Strength</th>
                    <th className="px-4 py-2.5 font-semibold">Unit Price</th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {brands.map((b) => {
                    const comp = catalog.companies.find((c) => c.id === b.companyId);
                    return (
                      <tr
                        key={b.id}
                        onClick={() => onSelectBrand(b)}
                        className="cursor-pointer transition hover:bg-teal-50/50"
                      >
                        <td className="px-4 py-2.5 font-semibold text-teal-700">{b.brandName}</td>
                        <td className="px-4 py-2.5">
                          {comp && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCompany(comp);
                              }}
                              className="text-slate-700 hover:text-teal-700 hover:underline"
                            >
                              {comp.shortName}
                            </button>
                          )}
                        </td>
                        <td className="px-4 py-2.5">
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${getDosageBadgeColor(
                              b.dosageForm,
                            )}`}
                          >
                            {b.dosageForm}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-slate-700">{b.strength}</td>
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
