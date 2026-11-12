import { useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  FlaskConical,
  Layers,
  Printer,
} from 'lucide-react';
import type { CatalogState, Company, Generic, MedicineBrand } from '../types/pharma';
import {
  formatBDT,
  formatDateTime,
  getStatusBadgeClass,
} from '../lib/formatters';
import { DosageIcon } from './DosageIcon';

interface BrandPageProps {
  brand: MedicineBrand;
  catalog: CatalogState;
  onBack: () => void;
  onSelectBrand: (brand: MedicineBrand) => void;
  onSelectGeneric: (generic: Generic) => void;
  onSelectCompany: (company: Company) => void;
}

export function BrandPage({
  brand,
  catalog,
  onBack,
  onSelectBrand,
  onSelectGeneric,
  onSelectCompany,
}: BrandPageProps) {
  const [qty, setQty] = useState(10);
  const [copied, setCopied] = useState(false);

  const generic = catalog.generics.find((g) => g.id === brand.genericId);
  const company = catalog.companies.find((c) => c.id === brand.companyId);

  // Sibling strengths / dosage forms of the same brand family & company
  const baseWord = brand.brandName.split(' ')[0].toLowerCase();
  const siblingVariants = catalog.brands.filter(
    (b) =>
      b.companyId === brand.companyId &&
      b.genericId === brand.genericId &&
      b.brandName.toLowerCase().startsWith(baseWord),
  );

  const alternateBrands = catalog.brands
    .filter((b) => b.genericId === brand.genericId && b.id !== brand.id)
    .sort((a, b) => a.unitPrice - b.unitPrice);

  const monographSections = generic
    ? [
        { id: 'indications', title: 'Indications', body: generic.indications },
        { id: 'pharmacology', title: 'Pharmacology', body: generic.pharmacology },
        { id: 'dosage', title: 'Dosage & Administration', body: generic.dosage },
        { id: 'interaction', title: 'Interaction', body: generic.interactions },
        { id: 'contraindications', title: 'Contraindications', body: generic.contraindications },
        { id: 'side-effects', title: 'Side Effects', body: generic.sideEffects },
        {
          id: 'pregnancy',
          title: 'Pregnancy & Lactation',
          body: generic.pregnancyCategory,
        },
        {
          id: 'therapeutic',
          title: 'Therapeutic Class',
          body: generic.therapeuticClass,
        },
        { id: 'storage', title: 'Storage Conditions', body: generic.storage },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={onBack} className="font-medium text-teal-700 hover:underline">
            Brands
          </button>
          <ChevronRight className="h-3.5 w-3.5" />
          {generic && (
            <>
              <button
                type="button"
                onClick={() => onSelectGeneric(generic)}
                className="font-medium text-teal-700 hover:underline"
              >
                {generic.name}
              </button>
              <ChevronRight className="h-3.5 w-3.5" />
            </>
          )}
          <span className="font-semibold text-slate-800">
            {brand.brandName} {brand.strength}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(window.location.href);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            }}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Copied' : 'Share'}
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            <Printer className="h-3.5 w-3.5" />
            Print
          </button>
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-medium text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      </div>

      {/* MedEx-Style Main Brand Header Card */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-start">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-slate-50">
                <DosageIcon form={brand.dosageForm} className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-baseline gap-2">
                  <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">
                    {brand.brandName}
                  </h1>
                  <span className="text-sm font-medium text-slate-500">{brand.dosageForm}</span>
                  <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                    {brand.strength}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {generic && (
                    <button
                      type="button"
                      onClick={() => onSelectGeneric(generic)}
                      className="inline-flex items-center gap-1 font-semibold text-teal-700 hover:underline"
                    >
                      <FlaskConical className="h-3.5 w-3.5" />
                      {generic.name}
                    </button>
                  )}
                  {company && (
                    <button
                      type="button"
                      onClick={() => onSelectCompany(company)}
                      className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-teal-700 hover:underline"
                    >
                      <Building2 className="h-3.5 w-3.5" />
                      {company.name}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Sibling Formulations Switcher */}
            {siblingVariants.length > 1 && (
              <div className="pt-2">
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                  Available Formulations &amp; Strengths
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {siblingVariants.map((variant) => {
                    const active = variant.id === brand.id;
                    return (
                      <button
                        key={variant.id}
                        type="button"
                        onClick={() => onSelectBrand(variant)}
                        className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition ${
                          active
                            ? 'border-teal-600 bg-teal-50 text-teal-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:border-teal-400'
                        }`}
                      >
                        <DosageIcon form={variant.dosageForm} className="h-3.5 w-3.5" />
                        <span>
                          {variant.brandName} {variant.strength}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Right Pricing & Alternate Brands Box */}
          <div className="flex flex-col gap-3 rounded-xl border border-teal-200/80 bg-teal-50/40 p-4 sm:min-w-[300px]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-slate-500">Unit Price</div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-extrabold text-slate-900">
                    {formatBDT(brand.unitPrice)}
                  </span>
                  {brand.previousUnitPrice !== undefined &&
                    brand.previousUnitPrice !== brand.unitPrice && (
                      <span className="font-mono text-xs text-slate-400 line-through">
                        {formatBDT(brand.previousUnitPrice)}
                      </span>
                    )}
                </div>
              </div>
              <span
                className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(
                  brand.status,
                )}`}
              >
                {brand.status}
              </span>
            </div>

            <div className="border-t border-teal-200/60 pt-2 text-xs text-slate-600">
              <div className="flex items-center justify-between gap-2">
                <span>Course / Qty Cost:</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={999}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value) || 1))}
                    className="w-14 rounded border border-teal-300 bg-white px-1.5 py-0.5 text-center font-mono text-xs font-semibold text-slate-900"
                  />
                  <strong className="font-mono text-teal-800">
                    {formatBDT(brand.unitPrice * qty)}
                  </strong>
                </div>
              </div>
              <div className="mt-1.5 flex justify-between">
                <span>Pack ({brand.packSize}):</span>
                <strong className="font-mono text-slate-900">{formatBDT(brand.packPrice)}</strong>
              </div>
              <div className="mt-1 flex justify-between text-[11px] text-slate-500">
                <span>{brand.darNumber}</span>
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3 w-3" />
                  {brand.updateSource}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1 text-[11px] text-slate-400">
                <Clock className="h-3 w-3" />
                Updated {formatDateTime(brand.updatedAt)}
              </div>
            </div>

            <a
              href="#alternate-brands"
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-teal-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-teal-800"
            >
              <Layers className="h-3.5 w-3.5" />
              Alternate Brands ({alternateBrands.length})
            </a>
          </div>
        </div>
      </section>

      {/* 2-Column MedEx Monograph Body */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Left Sticky TOC */}
        <aside className="hidden lg:col-span-3 lg:block">
          <div className="sticky top-36 rounded-xl border border-slate-200 bg-white p-4">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
              Monograph Sections
            </div>
            <nav className="space-y-1 text-sm">
              {monographSections.map((sec) => (
                <a
                  key={sec.id}
                  href={`#${sec.id}`}
                  className="block rounded-lg px-2.5 py-1.5 text-slate-600 transition hover:bg-teal-50 hover:text-teal-800"
                >
                  {sec.title}
                </a>
              ))}
              <a
                href="#alternate-brands"
                className="block rounded-lg px-2.5 py-1.5 font-semibold text-teal-700 transition hover:bg-teal-50"
              >
                Alternate Brands ({alternateBrands.length})
              </a>
            </nav>
          </div>
        </aside>

        {/* Right Clinical Sections */}
        <div className="space-y-4 lg:col-span-9">
          {monographSections.map((sec) => (
            <section
              key={sec.id}
              id={sec.id}
              className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-5"
            >
              <h2 className="border-b border-slate-100 pb-2 text-base font-bold text-teal-800">
                {sec.title}
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-slate-700">{sec.body}</p>
            </section>
          ))}

          {/* Alternate Brands Comparison Table */}
          <section
            id="alternate-brands"
            className="scroll-mt-36 rounded-xl border border-slate-200 bg-white p-5"
          >
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2">
              <h2 className="text-base font-bold text-slate-900">
                Alternate Brands for {generic?.name} ({alternateBrands.length})
              </h2>
              <span className="text-xs text-slate-500">Sorted by unit price</span>
            </div>

            {alternateBrands.length === 0 ? (
              <p className="py-4 text-center text-sm text-slate-500">
                No alternate brands currently indexed for {generic?.name}.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-2.5 font-semibold">Brand Name</th>
                      <th className="px-3 py-2.5 font-semibold">Company</th>
                      <th className="px-3 py-2.5 font-semibold">Form &amp; Strength</th>
                      <th className="px-3 py-2.5 font-semibold">Unit Price</th>
                      <th className="px-3 py-2.5 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {alternateBrands.map((alt) => {
                      const altComp = catalog.companies.find((c) => c.id === alt.companyId);
                      return (
                        <tr
                          key={alt.id}
                          onClick={() => onSelectBrand(alt)}
                          className="cursor-pointer transition hover:bg-teal-50/50"
                        >
                          <td className="px-3 py-2.5 font-semibold text-teal-700">
                            <span className="inline-flex items-center gap-1.5">
                              <DosageIcon form={alt.dosageForm} className="h-3.5 w-3.5" />
                              {alt.brandName}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600">{altComp?.shortName}</td>
                          <td className="px-3 py-2.5 text-slate-700">
                            {alt.dosageForm} •{' '}
                            <span className="font-mono text-xs">{alt.strength}</span>
                          </td>
                          <td className="px-3 py-2.5 font-mono font-bold text-slate-900">
                            {formatBDT(alt.unitPrice)}
                          </td>
                          <td className="px-3 py-2.5">
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
          </section>
        </div>
      </div>
    </div>
  );
}
