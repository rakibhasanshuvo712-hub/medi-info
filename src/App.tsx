import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity,
  Building2,
  CheckCircle2,
  Clock,
  FlaskConical,
  Layers,
  Pill,
  RefreshCw,
  Rss,
  Search,
  Sparkles,
  UploadCloud,
} from 'lucide-react';
import { BrandPage } from './components/BrandPage';
import { CompanyPage } from './components/CompanyPage';
import { CompanyPortal } from './components/CompanyPortal';
import { DosageIcon } from './components/DosageIcon';
import { GenericPage } from './components/GenericPage';
import { InteractionChecker } from './components/InteractionChecker';
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

type DetailView =
  | { kind: 'brand'; id: string }
  | { kind: 'generic'; id: string }
  | { kind: 'company'; id: string }
  | null;

export function App() {
  const [catalog, setCatalog] = useState<CatalogState>(() => createInitialCatalog());
  const [apiMode, setApiMode] = useState<'live-api' | 'local-fallback'>('local-fallback');
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Hero instant search
  const [heroQuery, setHeroQuery] = useState('');

  // Filters
  const [brandLetter, setBrandLetter] = useState<string>('ALL');
  const [brandFormFilter, setBrandFormFilter] = useState<DosageForm | 'ALL'>('ALL');
  const [brandCompanyFilter, setBrandCompanyFilter] = useState<string>('ALL');
  const [brandStatusFilter, setBrandStatusFilter] = useState<ProductStatus | 'ALL'>('ALL');
  const [brandSearch, setBrandSearch] = useState('');
  const [brandLimit, setBrandLimit] = useState(60);
  const [genericSearch, setGenericSearch] = useState('');
  const [therapeuticFilter, setTherapeuticFilter] = useState('ALL');
  const [companySearch, setCompanySearch] = useState('');

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

  useEffect(() => {
    void refreshCatalog();
  }, [refreshCatalog]);

  useEffect(() => {
    const id = window.setInterval(() => {
      void refreshCatalog(catalog.version);
    }, 15000);
    return () => window.clearInterval(id);
  }, [catalog.version, refreshCatalog]);

  // Sync URL hash for back/forward navigation
  useEffect(() => {
    const applyHash = () => {
      const hash = window.location.hash.replace(/^#/, '');
      if (!hash || hash === 'home') {
        setDetailView(null);
        setActiveTab('home');
      } else if (hash.startsWith('brand/')) {
        setDetailView({ kind: 'brand', id: hash.slice(6) });
        setActiveTab('brands');
      } else if (hash.startsWith('generic/')) {
        setDetailView({ kind: 'generic', id: hash.slice(8) });
        setActiveTab('generics');
      } else if (hash.startsWith('company/')) {
        setDetailView({ kind: 'company', id: hash.slice(8) });
        setActiveTab('companies');
      } else if (
        ['brands', 'generics', 'companies', 'therapeutic', 'interactions', 'updates', 'portal'].includes(hash)
      ) {
        setDetailView(null);
        setActiveTab(hash as NavTab);
      }
    };
    applyHash();
    window.addEventListener('hashchange', applyHash);
    return () => window.removeEventListener('hashchange', applyHash);
  }, []);

  const navigateTab = (tab: NavTab) => {
    setDetailView(null);
    setActiveTab(tab);
    window.location.hash = tab === 'home' ? '' : tab;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openBrand = (brand: MedicineBrand) => {
    setDetailView({ kind: 'brand', id: brand.id });
    setActiveTab('brands');
    window.location.hash = `brand/${brand.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openGeneric = (generic: Generic) => {
    setDetailView({ kind: 'generic', id: generic.id });
    setActiveTab('generics');
    window.location.hash = `generic/${generic.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const openCompany = (company: Company) => {
    setDetailView({ kind: 'company', id: company.id });
    setActiveTab('companies');
    window.location.hash = `company/${company.id}`;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

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

  const heroResults = useMemo(() => {
    const q = heroQuery.trim().toLowerCase();
    if (!q) return { brands: [], generics: [], companies: [] };
    return {
      brands: catalog.brands
        .filter((b) => {
          const g = genericMap.get(b.genericId);
          const c = companyMap.get(b.companyId);
          return (
            b.brandName.toLowerCase().includes(q) ||
            b.strength.toLowerCase().includes(q) ||
            (g?.name.toLowerCase().includes(q) ?? false) ||
            (c?.shortName.toLowerCase().includes(q) ?? false)
          );
        })
        .slice(0, 6),
      generics: catalog.generics
        .filter(
          (g) =>
            g.name.toLowerCase().includes(q) ||
            g.indications.toLowerCase().includes(q) ||
            g.therapeuticClass.toLowerCase().includes(q),
        )
        .slice(0, 4),
      companies: catalog.companies
        .filter(
          (c) =>
            c.name.toLowerCase().includes(q) || c.shortName.toLowerCase().includes(q),
        )
        .slice(0, 3),
    };
  }, [heroQuery, catalog, genericMap, companyMap]);

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

  const activeBrand =
    detailView?.kind === 'brand'
      ? catalog.brands.find((b) => b.id === detailView.id) ?? null
      : null;
  const activeGeneric =
    detailView?.kind === 'generic'
      ? catalog.generics.find((g) => g.id === detailView.id) ?? null
      : null;
  const activeCompany =
    detailView?.kind === 'company'
      ? catalog.companies.find((c) => c.id === detailView.id) ?? null
      : null;

  const openBrandById = (brandId: string) => {
    const found = catalog.brands.find((b) => b.id === brandId);
    if (found) openBrand(found);
  };

  const quickSearchPills = [
    'Napa',
    'Sergel',
    'Seclo',
    'Finix',
    'Alatrol',
    'Azithromycin',
    'Montelukast',
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar
        activeTab={activeTab}
        onSelectTab={navigateTab}
        catalog={catalog}
        syncing={syncing}
        apiMode={apiMode}
        onSyncNow={() => void handleSyncFeeds()}
        onOpenBrand={openBrand}
        onOpenGeneric={openGeneric}
        onOpenCompany={openCompany}
      />

      {toast && (
        <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          <CheckCircle2 className="h-4 w-4 text-emerald-300" />
          <span>{toast}</span>
        </div>
      )}

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        {activeBrand ? (
          <BrandPage
            brand={activeBrand}
            catalog={catalog}
            onBack={() => navigateTab('brands')}
            onSelectBrand={openBrand}
            onSelectGeneric={openGeneric}
            onSelectCompany={openCompany}
          />
        ) : activeGeneric ? (
          <GenericPage
            generic={activeGeneric}
            catalog={catalog}
            onBack={() => navigateTab('generics')}
            onSelectBrand={openBrand}
            onSelectCompany={openCompany}
          />
        ) : activeCompany ? (
          <CompanyPage
            company={activeCompany}
            catalog={catalog}
            syncing={syncing}
            onBack={() => navigateTab('companies')}
            onSyncCompany={(id) => void handleSyncFeeds(id)}
            onSelectBrand={openBrand}
            onSelectGeneric={openGeneric}
          />
        ) : (
          <>
            {activeTab === 'home' && (
              <div className="space-y-8">
                {/* MedEx-Style Centered Clinical Search Hero */}
                <section className="rounded-2xl border border-teal-200/80 bg-gradient-to-b from-teal-50/70 via-white to-white px-4 py-8 text-center shadow-2xs sm:px-8 sm:py-10">
                  <div className="mx-auto max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-white px-3 py-1 text-xs font-semibold text-teal-800">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-live-dot" />
                      {catalog.brands.length} Brands • {catalog.generics.length} Generics •{' '}
                      {catalog.companies.length} Pharma Feeds Synced Live
                    </div>
                    <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
                      Search Medicines, Generics &amp; Clinical Monographs
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                      Trusted online pharmaceutical directory with real-time manufacturer price &amp;
                      product updates.
                    </p>

                    {/* Centered Hero Search Bar */}
                    <div className="relative mx-auto mt-5 max-w-2xl text-left">
                      <div className="relative flex items-center">
                        <Search className="pointer-events-none absolute left-4 h-5 w-5 text-teal-700" />
                        <input
                          type="text"
                          value={heroQuery}
                          onChange={(e) => setHeroQuery(e.target.value)}
                          placeholder="Search by Brand Name, Generic Name, Indication, or Pharmaceutical..."
                          className="w-full rounded-xl border-2 border-teal-600/30 bg-white py-3.5 pl-12 pr-4 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-teal-600 focus:outline-none sm:text-base"
                        />
                      </div>

                      {heroQuery.trim().length > 0 && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-96 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                          {heroResults.brands.length === 0 &&
                          heroResults.generics.length === 0 &&
                          heroResults.companies.length === 0 ? (
                            <div className="p-4 text-center text-sm text-slate-500">
                              No results found for &ldquo;{heroQuery}&rdquo;.
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {heroResults.brands.map((b) => {
                                const g = genericMap.get(b.genericId);
                                const c = companyMap.get(b.companyId);
                                return (
                                  <button
                                    key={b.id}
                                    type="button"
                                    onClick={() => openBrand(b)}
                                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-teal-50"
                                  >
                                    <div className="flex items-center gap-2.5">
                                      <DosageIcon form={b.dosageForm} className="h-4 w-4" />
                                      <div>
                                        <div className="text-sm font-bold text-slate-900">
                                          {b.brandName}{' '}
                                          <span className="font-normal text-slate-500">
                                            {b.strength} ({b.dosageForm})
                                          </span>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          {g?.name} • {c?.shortName}
                                        </div>
                                      </div>
                                    </div>
                                    <span className="font-mono text-sm font-bold text-teal-700">
                                      {formatBDT(b.unitPrice)}
                                    </span>
                                  </button>
                                );
                              })}
                              {heroResults.generics.map((g) => (
                                <button
                                  key={g.id}
                                  type="button"
                                  onClick={() => openGeneric(g)}
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-indigo-50/70"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <FlaskConical className="h-4 w-4 text-indigo-600" />
                                    <div>
                                      <div className="text-sm font-bold text-slate-900">
                                        {g.name}
                                      </div>
                                      <div className="text-xs text-slate-500">
                                        {g.therapeuticClass}
                                      </div>
                                    </div>
                                  </div>
                                  <span className="text-xs font-semibold text-indigo-700">
                                    Generic →
                                  </span>
                                </button>
                              ))}
                              {heroResults.companies.map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => openCompany(c)}
                                  className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-emerald-50/70"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <Building2 className="h-4 w-4 text-emerald-600" />
                                    <span className="text-sm font-bold text-slate-900">
                                      {c.name}
                                    </span>
                                  </div>
                                  <span className="text-xs font-semibold text-emerald-700">
                                    Company →
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <span className="text-xs font-medium text-slate-400">Popular:</span>
                      {quickSearchPills.map((term) => (
                        <button
                          key={term}
                          type="button"
                          onClick={() => {
                            setBrandSearch(term);
                            setBrandLetter('ALL');
                            setBrandFormFilter('ALL');
                            navigateTab('brands');
                          }}
                          className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                        >
                          {term}
                        </button>
                      ))}
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center justify-center gap-1.5">
                      <span className="text-[11px] font-medium text-slate-400">
                        By Indication:
                      </span>
                      {[
                        { label: 'Fever & Pain', q: 'fever' },
                        { label: 'Acidity / GERD', q: 'GERD' },
                        { label: 'Allergy', q: 'allergic' },
                        { label: 'Antibiotic', q: 'pneumonia' },
                        { label: 'Diabetes', q: 'diabetes' },
                        { label: 'Hypertension', q: 'hypertension' },
                        { label: 'Asthma', q: 'asthma' },
                      ].map((ind) => (
                        <button
                          key={ind.label}
                          type="button"
                          onClick={() => {
                            setGenericSearch(ind.q);
                            setTherapeuticFilter('ALL');
                            navigateTab('generics');
                          }}
                          className="rounded-md bg-teal-50 px-2.5 py-0.5 text-[11px] font-semibold text-teal-800 transition hover:bg-teal-100"
                        >
                          {ind.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </section>

                {/* MedEx-Style 6 Directory Category Tiles */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {[
                    {
                      tab: 'brands' as NavTab,
                      title: 'Brands',
                      sub: `${catalog.brands.length} Formulations`,
                      icon: <Pill className="h-5 w-5 text-teal-700" />,
                    },
                    {
                      tab: 'generics' as NavTab,
                      title: 'Generics',
                      sub: `${catalog.generics.length} Monographs`,
                      icon: <FlaskConical className="h-5 w-5 text-indigo-700" />,
                    },
                    {
                      tab: 'companies' as NavTab,
                      title: 'Pharmaceuticals',
                      sub: `${catalog.companies.length} Companies`,
                      icon: <Building2 className="h-5 w-5 text-emerald-700" />,
                    },
                    {
                      tab: 'therapeutic' as NavTab,
                      title: 'Drug Classes',
                      sub: `${therapeuticClasses.length} Classes`,
                      icon: <Layers className="h-5 w-5 text-sky-700" />,
                    },
                    {
                      tab: 'updates' as NavTab,
                      title: 'Live Updates',
                      sub: `${catalog.updates.length} Recent Changes`,
                      icon: <Rss className="h-5 w-5 text-amber-600" />,
                    },
                    {
                      tab: 'portal' as NavTab,
                      title: 'Company Portal',
                      sub: 'Publish / Sync Feed',
                      icon: <UploadCloud className="h-5 w-5 text-teal-700" />,
                    },
                  ].map((tile) => (
                    <button
                      key={tile.tab}
                      type="button"
                      onClick={() => navigateTab(tile.tab)}
                      className="flex flex-col items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-teal-500 hover:shadow-xs"
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-50">
                        {tile.icon}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-slate-900">{tile.title}</div>
                        <div className="text-xs text-slate-500">{tile.sub}</div>
                      </div>
                    </button>
                  ))}
                </section>

                {/* High-Density MedEx Brand Directory Preview */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">
                        Essential &amp; Frequently Prescribed Medicines
                      </h2>
                      <p className="text-xs text-slate-500">
                        Click any medicine to open its full clinical monograph and alternate brands.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => navigateTab('brands')}
                      className="text-xs font-semibold text-teal-700 hover:underline"
                    >
                      View All {catalog.brands.length} Brands →
                    </button>
                  </div>

                  <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
                    {catalog.brands.slice(0, 12).map((b) => {
                      const g = genericMap.get(b.genericId);
                      const c = companyMap.get(b.companyId);
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => openBrand(b)}
                          className="flex items-center justify-between gap-3 rounded-lg border border-slate-200/90 bg-slate-50/40 px-3.5 py-2.5 text-left transition hover:border-teal-500 hover:bg-teal-50/40"
                        >
                          <div className="flex min-w-0 items-start gap-2.5">
                            <DosageIcon form={b.dosageForm} className="mt-0.5 h-4 w-4 shrink-0" />
                            <div className="min-w-0">
                              <div className="truncate text-sm font-bold text-slate-900">
                                {b.brandName}{' '}
                                <span className="font-mono text-xs font-normal text-slate-500">
                                  {b.strength}
                                </span>
                              </div>
                              <div className="truncate text-xs font-medium text-teal-700">
                                {g?.name}
                              </div>
                              <div className="truncate text-[11px] text-slate-500">
                                {c?.shortName} • {b.dosageForm}
                              </div>
                            </div>
                          </div>
                          <div className="shrink-0 text-right">
                            <div className="font-mono text-sm font-bold text-slate-900">
                              {formatBDT(b.unitPrice)}
                            </div>
                            <div className="text-[10px] text-slate-400">{b.status}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </section>

                {/* Live Company Updates Feed */}
                <section className="rounded-xl border border-slate-200 bg-white p-5">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <Rss className="h-4 w-4 text-emerald-600" />
                      <h2 className="text-base font-bold text-slate-900">
                        Recent Manufacturer Product Updates
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => void handleSyncFeeds()}
                        disabled={syncing}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
                        Sync Feeds
                      </button>
                      <button
                        type="button"
                        onClick={() => navigateTab('updates')}
                        className="text-xs font-semibold text-teal-700 hover:underline"
                      >
                        Full Changelog →
                      </button>
                    </div>
                  </div>

                  <div className="divide-y divide-slate-100">
                    {catalog.updates.slice(0, 5).map((upd) => (
                      <div
                        key={upd.id}
                        className="flex flex-col justify-between gap-2 py-2.5 sm:flex-row sm:items-center"
                      >
                        <div className="flex items-start gap-2.5">
                          <span
                            className={`mt-0.5 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                              upd.changeType === 'New Product'
                                ? 'border-teal-200 bg-teal-50 text-teal-700'
                                : upd.changeType === 'Price Updated'
                                  ? 'border-amber-200 bg-amber-50 text-amber-700'
                                  : 'border-slate-200 bg-slate-100 text-slate-700'
                            }`}
                          >
                            {upd.changeType}
                          </span>
                          <div className="text-xs sm:text-sm">
                            <button
                              type="button"
                              onClick={() => openBrandById(upd.brandId)}
                              className="font-bold text-teal-700 hover:underline"
                            >
                              {upd.brandName}
                            </button>{' '}
                            <span className="text-slate-400">({upd.genericName})</span> —{' '}
                            <span className="text-slate-700">{upd.summary}</span>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-[11px] text-slate-400">
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-600">
                            {upd.source}
                          </span>
                          <span>{formatRelativeTime(upd.timestamp)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Dosage Forms Strip */}
                <section>
                  <h2 className="mb-3 text-base font-bold text-slate-900">
                    Browse by Dosage Form
                  </h2>
                  <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
                    {DOSAGE_FORMS.map((form) => {
                      const count = dosageFormCounts.get(form) ?? 0;
                      return (
                        <button
                          key={form}
                          type="button"
                          onClick={() => {
                            setBrandFormFilter(form);
                            setBrandLetter('ALL');
                            navigateTab('brands');
                          }}
                          className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left transition hover:border-teal-500"
                        >
                          <div className="flex items-center gap-2">
                            <DosageIcon form={form} className="h-4 w-4" />
                            <span className="text-sm font-semibold text-slate-800">{form}</span>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${getDosageBadgeColor(
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
                      Showing {filteredBrands.length} of {catalog.brands.length} formulations.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigateTab('portal')}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-teal-700 px-3.5 py-2 text-xs font-semibold text-white hover:bg-teal-800"
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    Add / Update Brand
                  </button>
                </div>

                {/* Filters */}
                <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <input
                      type="text"
                      value={brandSearch}
                      onChange={(e) => setBrandSearch(e.target.value)}
                      placeholder="Filter by brand, generic, strength..."
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    />
                    <select
                      value={brandFormFilter}
                      onChange={(e) => setBrandFormFilter(e.target.value as DosageForm | 'ALL')}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
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
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                    >
                      <option value="ALL">All Pharmaceuticals</option>
                      {catalog.companies.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={brandStatusFilter}
                      onChange={(e) => setBrandStatusFilter(e.target.value as ProductStatus | 'ALL')}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
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
                      className={`rounded-md px-2.5 py-1 text-xs font-semibold ${
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
                        className={`rounded-md px-2 py-1 text-xs font-semibold ${
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

                {/* Compact MedEx Brand Rows */}
                {filteredBrands.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                    No medicine brands match your current filters.
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredBrands.slice(0, brandLimit).map((b) => {
                      const g = genericMap.get(b.genericId);
                      const c = companyMap.get(b.companyId);
                      return (
                        <div
                          key={b.id}
                          onClick={() => openBrand(b)}
                          className="cursor-pointer rounded-xl border border-slate-200 bg-white p-3.5 transition hover:border-teal-500 hover:shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex min-w-0 items-start gap-2.5">
                              <DosageIcon form={b.dosageForm} className="mt-0.5 h-4 w-4 shrink-0" />
                              <div className="min-w-0">
                                <div className="truncate text-sm font-extrabold text-slate-900">
                                  {b.brandName}{' '}
                                  <span className="font-mono text-xs font-normal text-slate-500">
                                    {b.strength}
                                  </span>
                                </div>
                                <div className="truncate text-xs font-medium text-teal-700">
                                  {g?.name ?? b.genericId}
                                </div>
                                <div className="truncate text-[11px] text-slate-500">
                                  {c?.shortName ?? b.companyId} • {b.dosageForm}
                                </div>
                              </div>
                            </div>

                            <div className="shrink-0 text-right">
                              <div className="font-mono text-sm font-bold text-slate-900">
                                {formatBDT(b.unitPrice)}
                              </div>
                              {b.previousUnitPrice !== undefined &&
                                b.previousUnitPrice !== b.unitPrice && (
                                  <div className="font-mono text-[11px] text-slate-400 line-through">
                                    {formatBDT(b.previousUnitPrice)}
                                  </div>
                                )}
                              <span
                                className={`mt-1 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${getStatusBadgeClass(
                                  b.status,
                                )}`}
                              >
                                {b.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {filteredBrands.length > brandLimit && (
                    <div className="flex justify-center pt-2">
                      <button
                        type="button"
                        onClick={() => setBrandLimit((prev) => prev + 60)}
                        className="rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-teal-600 hover:text-teal-700"
                      >
                        Load More Brands ({filteredBrands.length - brandLimit} remaining)
                      </button>
                    </div>
                  )}
                  </>
                )}
              </div>
            )}

            {activeTab === 'generics' && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    Generics Directory ({filteredGenerics.length})
                  </h1>
                  <p className="text-sm text-slate-500">
                    Click any generic to view its full clinical monograph and compare brand prices.
                  </p>
                </div>

                <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-2">
                  <input
                    type="text"
                    value={genericSearch}
                    onChange={(e) => setGenericSearch(e.target.value)}
                    placeholder="Search generic name, indication, or class..."
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  />
                  <select
                    value={therapeuticFilter}
                    onChange={(e) => setTherapeuticFilter(e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-600 focus:outline-none"
                  >
                    <option value="ALL">All Therapeutic Classes</option>
                    {therapeuticClasses.map((tc) => (
                      <option key={tc} value={tc}>
                        {tc}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredGenerics.map((g) => {
                    const matchingBrands = catalog.brands.filter((b) => b.genericId === g.id);
                    const prices = matchingBrands.map((b) => b.unitPrice);
                    const minPrice = prices.length ? Math.min(...prices) : 0;
                    const maxPrice = prices.length ? Math.max(...prices) : 0;
                    return (
                      <div
                        key={g.id}
                        onClick={() => openGeneric(g)}
                        className="cursor-pointer rounded-xl border border-slate-200 bg-white p-4 transition hover:border-indigo-400 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h3 className="text-base font-extrabold text-slate-900">{g.name}</h3>
                            <span className="mt-1 inline-block rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-semibold text-indigo-700">
                              {g.therapeuticClass}
                            </span>
                          </div>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-700">
                            {matchingBrands.length} Brands
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-2 text-xs text-slate-600">{g.indications}</p>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
                          <span className="font-mono font-semibold text-teal-700">
                            {matchingBrands.length > 0
                              ? minPrice === maxPrice
                                ? formatBDT(minPrice)
                                : `${formatBDT(minPrice)} – ${formatBDT(maxPrice)}`
                              : 'No brands'}
                          </span>
                          <span className="font-semibold text-indigo-600">Monograph →</span>
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
                      Pharmaceuticals Directory ({filteredCompanies.length})
                    </h1>
                    <p className="text-sm text-slate-500">
                      Manufacturers connected to MedPulse with online product feeds and portals.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void handleSyncFeeds()}
                    disabled={syncing}
                    className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${syncing ? 'animate-spin' : ''}`} />
                    Sync All Feeds
                  </button>
                </div>

                <input
                  type="text"
                  value={companySearch}
                  onChange={(e) => setCompanySearch(e.target.value)}
                  placeholder="Search pharmaceutical companies..."
                  className="w-full max-w-md rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm focus:border-teal-600 focus:outline-none"
                />

                <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredCompanies.map((c) => {
                    const count = catalog.brands.filter((b) => b.companyId === c.id).length;
                    return (
                      <div
                        key={c.id}
                        onClick={() => openCompany(c)}
                        className="flex cursor-pointer flex-col justify-between rounded-xl border border-slate-200 bg-white p-4 transition hover:border-teal-500 hover:shadow-sm"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-base font-extrabold text-slate-900">{c.name}</h3>
                            <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              {c.syncMode}
                            </span>
                          </div>
                          <p className="mt-1.5 line-clamp-2 text-xs text-slate-600">
                            {c.description}
                          </p>
                        </div>
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5 text-xs">
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

            {activeTab === 'therapeutic' && (
              <div className="space-y-5">
                <div>
                  <h1 className="text-2xl font-extrabold text-slate-900">
                    Drug Classes / Therapeutic Index
                  </h1>
                  <p className="text-sm text-slate-500">
                    Browse generics grouped by clinical therapeutic classification.
                  </p>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {therapeuticClasses.map((tc) => {
                    const classGenerics = catalog.generics.filter(
                      (g) => g.therapeuticClass === tc,
                    );
                    return (
                      <div
                        key={tc}
                        className="rounded-xl border border-slate-200 bg-white p-5"
                      >
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h3 className="text-base font-bold text-slate-900">{tc}</h3>
                          <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            {classGenerics.length} Generics
                          </span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {classGenerics.map((g) => (
                            <button
                              key={g.id}
                              type="button"
                              onClick={() => openGeneric(g)}
                              className="rounded-lg border border-teal-200 bg-teal-50/50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition hover:bg-teal-100"
                            >
                              {g.name}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {activeTab === 'interactions' && <InteractionChecker catalog={catalog} />}

            {activeTab === 'updates' && (
              <div className="space-y-5">
                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                  <div>
                    <h1 className="text-2xl font-extrabold text-slate-900">
                      Live Manufacturer Product Updates
                    </h1>
                    <p className="text-sm text-slate-500">
                      Chronological feed of price revisions, new launches, and stock updates synced
                      from companies online.
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

                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
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
          </>
        )}
      </main>

      <footer className="mt-12 border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 sm:flex-row sm:px-6">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-teal-700" />
            <span className="font-bold text-slate-800">MedPulse</span>
            <span>— Online Pharmaceutical Index &amp; Manufacturer Product Sync</span>
          </div>
          <div>
            Clinical reference for informational purposes. Always verify prescriptions with a
            licensed healthcare professional.
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
