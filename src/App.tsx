import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock,
  FlaskConical,
  Pill,
  RefreshCw,
  Rss,
  Sparkles,
  TrendingUp,
  UploadCloud,
} from 'lucide-react';
import { BrandDetailModal } from './components/BrandDetailModal';
import { CompanyDetailModal } from './components/CompanyDetailModal';
import { CompanyPortal } from './components/CompanyPortal';
import { GenericDetailModal } from './components/GenericDetailModal';
import { Navbar, type NavTab } from './components/Navbar';
import { createInitialCatalog } from './data/seedCatalog';
import {
  fetchCatalog,
  registerCompany,
  submitBatchFeed,
  submitBrandUpdate,
  triggerSyncAllFeeds,
  triggerTestWebhook,
} from './lib/apiClient';
import {
  DOSAGE_FORMS,
  formatBDT,
  formatDateTime,
  formatRelativeTime,
  getDosageBadgeColor,
  getStatusBadgeClass,
} from './lib/formatters';
import type {
  CatalogState,
  Company,
  DosageForm,
  FeedProductItem,
  Generic,
  MedicineBrand,
  ProductStatus,
} from './types/pharma';
import type { RegisterCompanyInput, UpsertBrandInput } from './lib/catalogEngine';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function App() {
  const [catalog, setCatalog] = useState<CatalogState>(() => createInitialCatalog());
  const [apiMode, setApiMode] = useState<'live-api' | 'local-fallback'>('local-fallback');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Filters
  const [brandLetter, setBrandLetter] = useState<string>('ALL');
  const [brandFormFilter, setBrandFormFilter] = useState<DosageForm | 'ALL'>('ALL');
  const [brandCompanyFilter, setBrandCompanyFilter] = useState<string>('ALL');
  const [brandStatusFilter, setBrandStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [brandSearch, setBrandSearch] = useState('');
  const [genericSearch, setGenericSearch] = useState('');
  const [therapeuticFilter, setTherapeuticFilter] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');

  // Modals
  const [selectedBrand, setSelectedBrand] = useState<MedicineBrand | null>(null);
  const [selectedGeneric, setSelectedGeneric] = useState<Generic | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    setTimeout(() => {
      setToast((curr) => (curr === msg ? null : curr));
    }, 4500);
  }, []);

  const refreshCatalog = useCallback(async (sinceVersion?: number) => {
    const res = await fetchCatalog(sinceVersion);
    setApiMode(res.mode);
    if (res.catalog) {
      setCatalog(res.catalog);
    }
  }, []);

  // Initial load + live 15s polling for company product updates
  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshCatalog(catalog.version);
    }, 15000);
    return () => window.clearInterval(id);
  }, [catalog.version, refreshCatalog]);

  const handleSyncFeeds = async (companyId?: string) => {
    setSyncing(true);
    try {
      const res = await triggerSyncAllFeeds(companyId);
      setCatalog(res.catalog);
      setApiMode(res.mode);
      showToast(
        companyId
          ? `Synced online feed for ${
              res.catalog.companies.find((c) => c.id === companyId)?.shortName ?? companyId
            }.`
          : `Checked ${res.syncedCompanies} company product feeds (${res.updatedProducts} updates applied).`,
      );
    } finally {
      setSyncing(false);
    }
  };

  const handleUpsertBrand = async (input: UpsertBrandInput) => {
    const res = await submitBrandUpdate(input);
    setCatalog(res.catalog);
    setApiMode(res.mode);
    showToast(`Catalog updated: ${input.brandName} ${input.strength}`);
  };

  const handleBatchFeed = async (companyId: string, items: FeedProductItem[]) => {
    const res = await submitBatchFeed(companyId, items);
    setCatalog(res.catalog);
    setApiMode(res.mode);
    showToast(`Synced ${res.appliedCount} items from online feed.`);
  };

  const handleRegisterCompany = async (input: RegisterCompanyInput) => {
    const res = await registerCompany(input);
    setCatalog(res.catalog);
    setApiMode(res.mode);
    showToast(`Connected ${input.name} to MedPulse.`);
  };

  const handleTestWebhook = async (
    companyId: string,
    product: Omit<UpsertBrandInput, 'companyId' | 'source'>,
  ) => {
    const res = await triggerTestWebhook(companyId, product);
    setCatalog(res.catalog);
    setApiMode(res.mode);
    showToast(`Webhook update received: ${product.brandName}`);
  };

  const genericMap = useMemo(
    () => new Map(catalog.generics.map((g) => [g.id, g])),
    [catalog.generics],
  );
  const companyMap = useMemo(
    () => new Map(catalog.companies.map((c) => [c.id, c])),
    [catalog.companies],
  );

  const filteredBrands = useMemo(() => {
    const q = brandSearch.trim().toLowerCase();
    return catalog.brands
      .filter((b) => {
        if (brandLetter !== 'ALL' && !b.brandName.toUpperCase().startsWith(brandLetter)) {
          return false;
        }
        if (brandFormFilter !== 'ALL' && b.dosageForm !== brandFormFilter) return false;
        if (brandCompanyFilter !== 'ALL' && b.companyId !== brandCompanyFilter) return false;
        if (brandStatusFilter !== 'ALL' && b.status !== brandStatusFilter) return false;
        if (q) {
          const g = genericMap.get(b.genericId);
          const c = companyMap.get(b.companyId);
          const matches =
            b.brandName.toLowerCase().includes(q) ||
            b.strength.toLowerCase().includes(q) ||
            (g?.name.toLowerCase().includes(q) ?? false) ||
            (c?.shortName.toLowerCase().includes(q) ?? false);
          if (!matches) return false;
        }
        return true;
      })
      .sort((a, b) => a.brandName.localeCompare(b.brandName));
  }, [
    catalog.brands,
    brandLetter,
    brandFormFilter,
    brandCompanyFilter,
    brandStatusFilter,
    brandSearch,
    genericMap,
    companyMap,
  ]);

  const therapeuticClasses = useMemo(
    () => Array.from(new Set(catalog.generics.map((g) => g.therapeuticClass))).sort(),
    [catalog.generics],
  );

  const filteredGenerics = useMemo(() => {
    const q = genericSearch.trim().toLowerCase();
    return catalog.generics
      .filter((g) => {
        if (therapeuticFilter !== 'ALL' && g.therapeuticClass !== therapeuticFilter) {
          return false;
        }
        if (q) {
          return (
            g.name.toLowerCase().includes(q) ||
            g.therapeuticClass.toLowerCase().includes(q) ||
            g.indications.toLowerCase().includes(q)
          );
        }
        return true;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [catalog.generics, genericSearch, therapeuticFilter]);

  const filteredCompanies = useMemo(() => {
    const q = companySearch.trim().toLowerCase();
    return catalog.companies.filter((c) => {
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.shortName.toLowerCase().includes(q) ||
        c.syncMode.toLowerCase().includes(q)
      );
    });
  }, [catalog.companies, companySearch]);

  const dosageFormCounts = useMemo(() => {
    const counts = new Map<DosageForm, number>();
    for (const form of DOSAGE_FORMS) counts.set(form, 0);
    for (const b of catalog.brands) {
      counts.set(b.dosageForm, (counts.get(b.dosageForm) ?? 0) + 1);
    }
    return counts;
  }, [catalog.brands]);

  const openBrandById = (brandId: string) => {
    const found = catalog.brands.find((b) => b.id === brandId);
    if (found) setSelectedBrand(found);
  };

  const quickSearchPills = ['Napa', 'Sergel', 'Seclo', 'Azithromycin', 'Montelukast', 'Metformin'];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        catalog={catalog}
        syncing={syncing}
        apiMode={apiMode}
        onSyncNow={() => void handleSyncFeeds()}
        onOpenBrand={(b) => setSelectedBrand(b)}
        onOpenGeneric={(g) => setSelectedGeneric(g)}
        onOpenCompany={(c) => setSelectedCompany(c)}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeTab === 'home' && (
          <div className="space-y-8">
            {/* Hero & Live Metrics */}
            <section className="overflow-hidden rounded-3xl border border-teal-200/70 bg-gradient-to-br from-white via-teal-50/40 to-emerald-50/50 p-6 shadow-xs sm:p-8">
              <div className="grid gap-8 lg:grid-cols-12 lg:items-center">
                <div className="lg:col-span-7">
                  <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800 shadow-2xs">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live-dot" />
                    Real-Time Pharmaceutical Index • Auto-Synced Online
                  </div>
                  <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                    Accurate Medicine Directory,{' '}
                    <span className="text-teal-700">Updated Live by Manufacturers.</span>
                  </h1>
                  <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-base">
                    Search verified brand names, full generic monographs, dosage forms, and unit
                    prices. Whenever pharmaceutical companies update prices, stock, or launch new
                    products online, MedPulse syncs automatically.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-slate-500">Quick Lookup:</span>
                    {quickSearchPills.map((term) => (
                      <button
                        key={term}
                        type="button"
                        onClick={() => {
                          setBrandSearch(term);
                          setBrandLetter('ALL');
                          setBrandFormFilter('ALL');
                          setActiveTab('brands');
                        }}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-500 hover:text-teal-700"
                      >
                        {term}
                      </button>
                    ))}
                  </div>

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => setActiveTab('brands')}
                      className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800"
                    >
                      Browse All Medicines
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('portal')}
                      className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50"
                    >
                      <UploadCloud className="h-4 w-4 text-teal-700" />
                      Company Update Portal
                    </button>
                  </div>
                </div>

                {/* Live KPI Cards */}
                <div className="grid grid-cols-2 gap-3.5 lg:col-span-5">
                  <button
                    type="button"
                    onClick={() => setActiveTab('brands')}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-teal-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Brand Products</span>
                      <Pill className="h-4 w-4 text-teal-600" />
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">
                      {catalog.brands.length}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700">
                      Across {DOSAGE_FORMS.filter((f) => (dosageFormCounts.get(f) ?? 0) > 0).length} dosage forms
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('generics')}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-indigo-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Generics</span>
                      <FlaskConical className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">
                      {catalog.generics.length}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      Full clinical monographs
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('companies')}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-emerald-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Pharma Feeds</span>
                      <Building2 className="h-4 w-4 text-emerald-600" />
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">
                      {catalog.companies.length}
                    </div>
                    <div className="mt-1 text-[11px] text-emerald-700">
                      Live ERP &amp; JSON sync
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('updates')}
                    className="rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-2xs transition hover:border-amber-400"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-500">Live Updates</span>
                      <TrendingUp className="h-4 w-4 text-amber-600" />
                    </div>
                    <div className="mt-2 text-3xl font-extrabold text-slate-900">
                      {catalog.updates.length}
                    </div>
                    <div className="mt-1 text-[11px] text-slate-500">
                      v{catalog.version} • {formatRelativeTime(catalog.lastUpdatedAt)}
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* Live Company Updates Feed */}
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
              <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                    <Rss className="h-5 w-5" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Latest Company Product Updates
                    </h2>
                    <p className="text-xs text-slate-500">
                      Automatic price revisions, new brand launches, and stock updates synced from
                      connected companies.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleSyncFeeds()}
                    disabled={syncing}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Check Feeds
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('updates')}
                    className="text-xs font-semibold text-teal-700 hover:underline"
                  >
                    View All →
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100">
                {catalog.updates.slice(0, 5).map((upd) => (
                  <div
                    key={upd.id}
                    className="flex flex-col justify-between gap-2 py-3 sm:flex-row sm:items-center"
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                          upd.changeType === 'New Product'
                            ? 'border-teal-200 bg-teal-50 text-teal-700'
                            : upd.changeType === 'Price Updated'
                              ? 'border-amber-200 bg-amber-50 text-amber-700'
                              : 'border-slate-200 bg-slate-100 text-slate-700'
                        }`}
                      >
                        {upd.changeType}
                      </span>
                      <div>
                        <div className="text-sm text-slate-800">
                          <button
                            type="button"
                            onClick={() => openBrandById(upd.brandId)}
                            className="font-bold text-teal-700 hover:underline"
                          >
                            {upd.brandName}
                          </button>{' '}
                          <span className="text-slate-400">({upd.genericName})</span> —{' '}
                          <span className="font-medium text-slate-700">{upd.companyName}</span>
                        </div>
                        <p className="text-xs text-slate-500">{upd.summary}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                      <span className="rounded bg-slate-100 px-2 py-0.5 font-medium text-slate-600">
                        {upd.source}
                      </span>
                      <span>{formatRelativeTime(upd.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Browse by Dosage Form */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">Browse by Dosage Form</h2>
                <button
                  type="button"
                  onClick={() => {
                    setBrandFormFilter('ALL');
                    setActiveTab('brands');
                  }}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  All Brands →
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
                {DOSAGE_FORMS.map((form) => {
                  const count = dosageFormCounts.get(form) ?? 0;
                  return (
                    <button
                      key={form}
                      type="button"
                      onClick={() => {
                        setBrandFormFilter(form);
                        setBrandLetter('ALL');
                        setActiveTab('brands');
                      }}
                      className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 text-left transition hover:border-teal-500 hover:shadow-xs"
                    >
                      <div>
                        <div className="text-sm font-bold text-slate-900">{form}</div>
                        <div className="text-xs text-slate-500">{count} brands</div>
                      </div>
                      <span
                        className={`rounded-lg border px-2 py-0.5 text-[10px] font-semibold ${getDosageBadgeColor(
                          form,
                        )}`}
                      >
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* Featured Companies */}
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    Connected Pharmaceutical Companies
                  </h2>
                  <p className="text-xs text-slate-500">
                    Click any manufacturer to view its product catalog and live feed endpoint.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('companies')}
                  className="text-xs font-semibold text-teal-700 hover:underline"
                >
                  All Companies →
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {catalog.companies.slice(0, 6).map((c) => {
                  const brandCount = catalog.brands.filter((b) => b.companyId === c.id).length;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setSelectedCompany(c)}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-500 hover:shadow-sm"
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-900">{c.name}</h3>
                          <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            {c.syncMode}
                          </span>
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-xs text-slate-500">
                          {c.description}
                        </p>
                      </div>
                      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                        <span className="font-semibold text-teal-700">{brandCount} Brands</span>
                        <span className="text-slate-400">
                          Synced {formatRelativeTime(c.lastSyncedAt)}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {activeTab === 'brands' && (
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Medicine Brand Directory
                </h1>
                <p className="text-sm text-slate-500">
                  Showing {filteredBrands.length} of {catalog.brands.length} indexed brand
                  formulations with live manufacturer pricing.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('portal')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Add / Update Brand
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <input
                  type="text"
                  value={brandSearch}
                  onChange={(e) => setBrandSearch(e.target.value)}
                  placeholder="Filter by brand, generic, or strength..."
                  className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />
                <select
                  value={brandFormFilter}
                  onChange={(e) => setBrandFormFilter(e.target.value as DosageForm | 'ALL')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="ALL">All Dosage Forms</option>
                  {DOSAGE_FORMS.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
                <select
                  value={brandCompanyFilter}
                  onChange={(e) => setBrandCompanyFilter(e.target.value)}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="ALL">All Companies</option>
                  {catalog.companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select
                  value={brandStatusFilter}
                  onChange={(e) => setBrandStatusFilter(e.target.value as ProductStatus | 'ALL')}
                  className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value="Available">Available</option>
                  <option value="New Launch">New Launch</option>
                  <option value="Price Revised">Price Revised</option>
                  <option value="Limited Stock">Limited Stock</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>

              {/* A-Z Strip */}
              <div className="flex flex-wrap items-center gap-1 pt-1">
                <button
                  type="button"
                  onClick={() => setBrandLetter('ALL')}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${
                    brandLetter === 'ALL'
                      ? 'bg-teal-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All
                </button>
                {ALPHABET.map((letter) => (
                  <button
                    key={letter}
                    type="button"
                    onClick={() => setBrandLetter(letter)}
                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                      brandLetter === letter
                        ? 'bg-teal-700 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {letter}
                  </button>
                ))}
              </div>
            </div>

            {/* Brands Grid */}
            {filteredBrands.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                No medicine brands match your current filters.
              </div>
            ) : (
              <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredBrands.map((b) => {
                  const g = genericMap.get(b.genericId);
                  const c = companyMap.get(b.companyId);
                  return (
                    <div
                      key={b.id}
                      onClick={() => setSelectedBrand(b)}
                      className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-teal-500 hover:shadow-md"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <h3 className="text-base font-extrabold text-slate-900">
                              {b.brandName}
                            </h3>
                            <span className="font-mono text-xs font-medium text-slate-500">
                              {b.strength}
                            </span>
                          </div>
                          <div className="mt-0.5 text-xs font-medium text-teal-700">
                            {g?.name ?? b.genericId}
                          </div>
                        </div>
                        <span
                          className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getDosageBadgeColor(
                            b.dosageForm,
                          )}`}
                        >
                          {b.dosageForm}
                        </span>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                        <span className="truncate font-medium text-slate-700">
                          {c?.shortName ?? b.companyId}
                        </span>
                        <span
                          className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(
                            b.status,
                          )}`}
                        >
                          {b.status}
                        </span>
                      </div>

                      <div className="mt-3 flex items-baseline justify-between border-t border-slate-100 pt-3">
                        <div>
                          <span className="font-mono text-lg font-bold text-slate-900">
                            {formatBDT(b.unitPrice)}
                          </span>
                          {b.previousUnitPrice !== undefined &&
                            b.previousUnitPrice !== b.unitPrice && (
                              <span className="ml-1.5 font-mono text-xs text-slate-400 line-through">
                                {formatBDT(b.previousUnitPrice)}
                              </span>
                            )}
                          <span className="ml-1 text-[11px] text-slate-400">/ unit</span>
                        </div>
                        <span className="text-[11px] text-slate-400">
                          Updated {formatRelativeTime(b.updatedAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'generics' && (
          <div className="space-y-5">
            <div>
              <h1 className="text-2xl font-extrabold text-slate-900">
                Generic Monographs &amp; Therapeutic Index
              </h1>
              <p className="text-sm text-slate-500">
                Clinical pharmacology, indications, dosage guidelines, and cross-brand price
                comparisons.
              </p>
            </div>

            <div className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
              <input
                type="text"
                value={genericSearch}
                onChange={(e) => setGenericSearch(e.target.value)}
                placeholder="Search generic name, indication, or class..."
                className="rounded-xl border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              />
              <select
                value={therapeuticFilter}
                onChange={(e) => setTherapeuticFilter(e.target.value)}
                className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="ALL">All Therapeutic Classes</option>
                {therapeuticClasses.map((tc) => (
                  <option key={tc} value={tc}>
                    {tc}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {filteredGenerics.map((g) => {
                const matchingBrands = catalog.brands.filter((b) => b.genericId === g.id);
                const prices = matchingBrands.map((b) => b.unitPrice);
                const minPrice = prices.length ? Math.min(...prices) : 0;
                const maxPrice = prices.length ? Math.max(...prices) : 0;
                return (
                  <div
                    key={g.id}
                    onClick={() => setSelectedGeneric(g)}
                    className="cursor-pointer rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-indigo-400 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-lg font-extrabold text-slate-900">{g.name}</h3>
                        <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700">
                          {g.therapeuticClass}
                        </span>
                      </div>
                      <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700">
                        {matchingBrands.length} Brands
                      </span>
                    </div>

                    <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-slate-600">
                      {g.indications}
                    </p>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="font-mono font-semibold text-teal-700">
                        {matchingBrands.length > 0
                          ? minPrice === maxPrice
                            ? formatBDT(minPrice)
                            : `${formatBDT(minPrice)} – ${formatBDT(maxPrice)}`
                          : 'No brands yet'}
                      </span>
                      <span className="font-semibold text-indigo-600">
                        Read Monograph →
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'companies' && (
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Pharmaceutical Companies &amp; Feed Status
                </h1>
                <p className="text-sm text-slate-500">
                  Every connected manufacturer with its online feed endpoint and sync schedule.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSyncFeeds()}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Sync All Online Feeds
              </button>
            </div>

            <input
              type="text"
              value={companySearch}
              onChange={(e) => setCompanySearch(e.target.value)}
              placeholder="Search pharmaceutical companies..."
              className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
            />

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCompanies.map((c) => {
                const count = catalog.brands.filter((b) => b.companyId === c.id).length;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCompany(c)}
                    className="flex cursor-pointer flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-teal-500 hover:shadow-md"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-base font-extrabold text-slate-900">{c.name}</h3>
                        <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                          {c.syncMode}
                        </span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-600">
                        {c.description}
                      </p>
                      <div className="mt-3 rounded-lg bg-slate-50 px-2.5 py-1.5 font-mono text-[11px] text-slate-500">
                        Feed: {c.feedUrl}
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3 text-xs">
                      <span className="font-bold text-teal-700">{count} Products</span>
                      <span className="flex items-center gap-1 text-slate-400">
                        <Clock className="h-3 w-3" />
                        {formatRelativeTime(c.lastSyncedAt)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="space-y-5">
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
              <div>
                <h1 className="text-2xl font-extrabold text-slate-900">
                  Live Manufacturer Product Updates Log
                </h1>
                <p className="text-sm text-slate-500">
                  Real-time audit stream of price changes, new brand launches, and stock updates
                  pushed by companies online.
                </p>
              </div>
              <button
                type="button"
                onClick={() => void handleSyncFeeds()}
                disabled={syncing}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                Run Live Sync Now
              </button>
            </div>

            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="divide-y divide-slate-200">
                {catalog.updates.map((upd) => (
                  <div
                    key={upd.id}
                    className="flex flex-col justify-between gap-3 p-4 transition hover:bg-slate-50 sm:flex-row sm:items-center"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                            upd.changeType === 'New Product'
                              ? 'border-teal-200 bg-teal-50 text-teal-700'
                              : upd.changeType === 'Price Updated'
                                ? 'border-amber-200 bg-amber-50 text-amber-700'
                                : 'border-slate-200 bg-slate-100 text-slate-700'
                          }`}
                        >
                          {upd.changeType}
                        </span>
                        <button
                          type="button"
                          onClick={() => openBrandById(upd.brandId)}
                          className="text-sm font-bold text-teal-700 hover:underline"
                        >
                          {upd.brandName}
                        </button>
                        <span className="text-xs text-slate-400">({upd.genericName})</span>
                        <span className="text-xs font-medium text-slate-600">
                          • {upd.companyName}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">{upd.summary}</p>
                    </div>

                    <div className="flex shrink-0 flex-col items-start gap-1 text-xs sm:items-end">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700">
                        {upd.source}
                      </span>
                      <span className="text-slate-400">{formatDateTime(upd.timestamp)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'portal' && (
          <CompanyPortal
            catalog={catalog}
            onUpsertBrand={handleUpsertBrand}
            onBatchFeed={handleBatchFeed}
            onRegisterCompany={handleRegisterCompany}
            onTestWebhook={handleTestWebhook}
          />
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-700" />
            <span className="font-bold text-slate-800">MedPulse</span>
            <span>— Live Pharmaceutical Index &amp; Manufacturer Product Sync</span>
          </div>
          <div>
            Clinical reference for informational purposes. Always verify prescriptions with a
            licensed healthcare professional.
          </div>
        </div>
      </footer>

      <BrandDetailModal
        brand={selectedBrand}
        catalog={catalog}
        onClose={() => setSelectedBrand(null)}
        onSelectBrand={(b) => setSelectedBrand(b)}
        onSelectGeneric={(g) => {
          setSelectedBrand(null);
          setSelectedGeneric(g);
        }}
        onSelectCompany={(c) => {
          setSelectedBrand(null);
          setSelectedCompany(c);
        }}
      />

      <GenericDetailModal
        generic={selectedGeneric}
        catalog={catalog}
        onClose={() => setSelectedGeneric(null)}
        onSelectBrand={(b) => {
          setSelectedGeneric(null);
          setSelectedBrand(b);
        }}
        onSelectCompany={(c) => {
          setSelectedGeneric(null);
          setSelectedCompany(c);
        }}
      />

      <CompanyDetailModal
        company={selectedCompany}
        catalog={catalog}
        syncing={syncing}
        onClose={() => setSelectedCompany(null)}
        onSyncCompany={(id) => void handleSyncFeeds(id)}
        onSelectBrand={(b) => {
          setSelectedCompany(null);
          setSelectedBrand(b);
        }}
      />
    </div>
  );
}

export default App;
