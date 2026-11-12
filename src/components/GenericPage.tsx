import { useState } from 'react';
import { ArrowLeft, ChevronRight, FlaskConical } from 'lucide-react';
import type { CatalogState, Company, DosageForm, Generic, MedicineBrand } from '../types/pharma';
import { formatBDT, getStatusBadgeClass } from '../lib/formatters';
import { DosageIcon } from './DosageIcon';

interface GenericPageProps {
  generic: Generic;
  catalog: CatalogState;
  onBack: () => void;
  onSelectBrand: (brand: MedicineBrand) => void;
  onSelectCompany: (company: Company) => void;
}

export function GenericPage({
  generic,
  catalog,
  onBack,
  onSelectBrand,
  onSelectCompany,
}: GenericPageProps) {
  const [formFilter, setFormFilter] = useState<DosageForm | 'ALL'>('ALL');

  const allBrands = catalog.brands
    .filter((b) => b.genericId === generic.id)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  const availableForms = Array.from(new Set(allBrands.map((b) => b.dosageForm)));
  const brands =
    formFilter === 'ALL'
      ? allBrands
      : allBrands.filter((b) => b.dosageForm === formFilter);

  const sections = [
    { id: 'gen-indications', title: 'Indications', body: generic.indications },
    { id: 'gen-pharmacology', title: 'Pharmacology', body: generic.pharmacology },
    { id: 'gen-dosage', title: 'Dosage & Administration', body: generic.dosage },
    { id: 'gen-interaction', title: 'Interaction', body: generic.interactions },
    { id: 'gen-contraindications', title: 'Contraindications', body: generic.contraindications },
    { id: 'gen-side-effects', title: 'Side Effects', body: generic.sideEffects },
    { id: 'gen-pregnancy', title: 'Pregnancy & Lactation', body: generic.pregnancyCategory },
    { id: 'gen-storage', title: 'Storage Conditions', body: generic.storage },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <button type="button" onClick={onBack} className="font-medium text-teal-700 hover:underline">
            Generics
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          <span className="font-semibold text-slate-800">{generic.name}</span>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Generics
        </button>
      </div>

      {/* Header */}
      <section className="rounded-xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
              <FlaskConical className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                {generic.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 font-semibold text-indigo-700">
                  {generic.therapeuticClass}
                </span>
                <span className="text-slate-500">•</span>
                <span className="font-semibold text-teal-700">
                  {allBrands.length} Available Brands
                </span>
              </div>
            </div>
          </div>

          <a
            href="#available-brands"
            className="inline-flex items-center justify-center rounded-lg bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
          >
            Jump to Brand Prices ({allBrands.length}) ↓
          </a>
        </div>
      </section>

      {/* Body */}
      <div className="grid gap-6 lg:grid-cols-12">
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-36 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Clinical Monograph
            </div>
            <nav className="space-y-1 text-sm">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className="block rounded-lg px-2.5 py-1.5 text-slate-600 hover:bg-teal-50 hover:text-teal-800"
                >
                  {s.title}
                </a>
              ))}
              <a
                href="#available-brands"
                className="block rounded-lg px-2.5 py-1.5 font-semibold text-teal-700 hover:bg-teal-50"
              >
                Available Brands ({allBrands.length})
              </a>
            </nav>
          </div>
        </aside>

        <div className="space-y-4 lg:col-span-9">
          {sections.map((s) => (
            <section
              key={s.id}
              id={s.id}
              className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 className="border-b border-slate-100 pb-2 text-base font-bold text-teal-800">
                {s.title}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{s.body}</p>
            </section>
          ))}

          <section
            id="available-brands"
            className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">
                Available Brands ({brands.length})
              </h2>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormFilter('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    formFilter === 'ALL'
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {availableForms.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormFilter(f)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                      formFilter === f
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                  <tr>
                    <th className="px-3 py-2.5 font-semibold">Brand Name</th>
                    <th className="px-3 py-2.5 font-semibold">Pharmaceutical</th>
                    <th className="px-3 py-2.5 font-semibold">Form &amp; Strength</th>
                    <th className="px-3 py-2.5 font-semibold">Unit Price</th>
                    <th className="px-3 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {brands.map((b) => {
                    const comp = catalog.companies.find((c) => c.id === b.companyId);
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
                          {comp && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onSelectCompany(comp);
                              }}
                              className="text-slate-700 hover:text-teal-700 hover:underline"
                            >
                              {comp.name}
                            </button>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-slate-700">
                          {b.dosageForm} • <span className="font-mono text-xs">{b.strength}</span>
                        </td>
                        <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                          {formatBDT(b.unitPrice)}
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
      </div>
    </div>
  );
}
