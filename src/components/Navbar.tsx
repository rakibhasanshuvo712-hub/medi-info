import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  Building2,
  FlaskConical,
  RefreshCw,
  Search,
  Sparkles,
  UploadCloud,
  X,
} from 'lucide-react';
import type { CatalogState, Company, Generic, MedicineBrand } from '../types/pharma';
import { formatBDT, formatRelativeTime } from '../lib/formatters';
import { DosageIcon } from './DosageIcon';

export type NavTab =
  | 'home'
  | 'brands'
  | 'generics'
  | 'companies'
  | 'therapeutic'
  | 'updates'
  | 'portal';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  catalog: CatalogState;
  syncing: boolean;
  apiMode: 'live-api' | 'local-fallback';
  onSyncNow: () => void;
  onOpenBrand: (brand: MedicineBrand) => void;
  onOpenGeneric: (generic: Generic) => void;
  onOpenCompany: (company: Company) => void;
}

export function Navbar({
  activeTab,
  onSelectTab,
  catalog,
  syncing,
  apiMode,
  onSyncNow,
  onOpenBrand,
  onOpenGeneric,
  onOpenCompany,
}: NavbarProps) {
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === '/' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA' &&
        document.activeElement?.tagName !== 'SELECT'
      ) {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchResults = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return { brands: [], generics: [], companies: [] };

    const genericMap = new Map(catalog.generics.map((g) => [g.id, g]));
    const companyMap = new Map(catalog.companies.map((c) => [c.id, c]));

    const brands = catalog.brands
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
      .slice(0, 6);

    const generics = catalog.generics
      .filter(
        (g) =>
          g.name.toLowerCase().includes(q) ||
          g.therapeuticClass.toLowerCase().includes(q),
      )
      .slice(0, 4);

    const companies = catalog.companies
      .filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.shortName.toLowerCase().includes(q),
      )
      .slice(0, 4);

    return { brands, generics, companies };
  }, [query, catalog]);

  const hasResults =
    searchResults.brands.length > 0 ||
    searchResults.generics.length > 0 ||
    searchResults.companies.length > 0;

  const navItems: { id: NavTab; label: string; badge?: number }[] = [
    { id: 'home', label: 'Home' },
    { id: 'brands', label: 'Brands', badge: catalog.brands.length },
    { id: 'generics', label: 'Generics', badge: catalog.generics.length },
    { id: 'companies', label: 'Pharmaceuticals', badge: catalog.companies.length },
    { id: 'therapeutic', label: 'Drug Classes' },
    { id: 'updates', label: 'Live Updates', badge: catalog.updates.length },
    { id: 'portal', label: 'Company Portal' },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur">
      {/* Live Sync Utility Bar */}
      <div className="border-b border-teal-900/10 bg-teal-950 text-teal-50">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-1.5 text-xs sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-300">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-live-dot" />
              Auto-Sync Active
            </span>
            <span className="hidden text-teal-300/60 sm:inline">|</span>
            <span className="hidden text-teal-200 sm:inline">
              Connected to {catalog.companies.length} pharmaceutical feeds • Last updated{' '}
              <strong className="text-white">{formatRelativeTime(catalog.lastUpdatedAt)}</strong>
            </span>
            <span className="rounded bg-teal-900/90 px-1.5 py-0.5 font-mono text-[10px] text-teal-200">
              {apiMode === 'live-api' ? 'Live Cloud API' : 'Local Preview Sync'}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSyncNow}
              disabled={syncing}
              className="inline-flex items-center gap-1.5 rounded bg-teal-800/90 px-2.5 py-0.5 font-medium text-teal-50 transition hover:bg-teal-700 disabled:opacity-60"
            >
              <RefreshCw className={`h-3 w-3 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Syncing Feeds...' : 'Sync Company Feeds'}
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('portal')}
              className="hidden items-center gap-1 font-medium text-emerald-300 transition hover:text-emerald-200 sm:inline-flex"
            >
              <UploadCloud className="h-3.5 w-3.5" />
              Company Update Portal
            </button>
          </div>
        </div>
      </div>

      {/* Main Header */}
      <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Brand Mark */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => onSelectTab('home')}
              className="flex items-center gap-2.5 text-left"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-emerald-600 text-white shadow-sm">
                <Activity className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xl font-extrabold tracking-tight text-slate-900">
                    Med<span className="text-teal-700">Pulse</span>
                  </span>
                  <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-teal-700 ring-1 ring-teal-600/20">
                    Live Index
                  </span>
                </div>
                <p className="text-[11px] text-slate-500">
                  Medicine Directory &amp; Real-Time Manufacturer Sync
                </p>
              </div>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('portal')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-semibold text-white shadow-sm md:hidden"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Portal
            </button>
          </div>

          {/* Instant Global Search */}
          <div ref={containerRef} className="relative flex-1 md:max-w-xl">
            <div className="relative flex items-center">
              <Search className="pointer-events-none absolute left-3.5 h-4 w-4 text-slate-400" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onFocus={() => setDropdownOpen(true)}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setDropdownOpen(true);
                }}
                placeholder="Search medicine brand, generic, or pharma company... (Press /)"
                className="w-full rounded-xl border border-slate-300 bg-slate-50 py-2.5 pl-10 pr-16 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/15"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-3 rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : (
                <kbd className="pointer-events-none absolute right-3 hidden rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] text-slate-500 sm:inline-block">
                  /
                </kbd>
              )}
            </div>

            {dropdownOpen && query.trim().length > 0 && (
              <div className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl">
                {!hasResults ? (
                  <div className="px-4 py-6 text-center text-sm text-slate-500">
                    No matching brands, generics, or companies found for &ldquo;{query}&rdquo;.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {searchResults.brands.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Brands
                        </div>
                        {searchResults.brands.map((b) => {
                          const g = catalog.generics.find((x) => x.id === b.genericId);
                          const c = catalog.companies.find((x) => x.id === b.companyId);
                          return (
                            <button
                              key={b.id}
                              type="button"
                              onClick={() => {
                                onOpenBrand(b);
                                setDropdownOpen(false);
                              }}
                              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-teal-50/70"
                            >
                              <div className="flex items-center gap-2.5">
                                <DosageIcon form={b.dosageForm} className="h-4 w-4 shrink-0" />
                                <div>
                                  <div className="text-sm font-semibold text-slate-900">
                                    {b.brandName}{' '}
                                    <span className="font-normal text-slate-500">
                                      {b.strength} • {b.dosageForm}
                                    </span>
                                  </div>
                                  <div className="text-xs text-slate-500">
                                    {g?.name} — {c?.shortName}
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-mono text-sm font-semibold text-teal-700">
                                  {formatBDT(b.unitPrice)}
                                </div>
                                <div className="text-[10px] text-slate-400">{b.status}</div>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {searchResults.generics.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Generics
                        </div>
                        {searchResults.generics.map((g) => (
                          <button
                            key={g.id}
                            type="button"
                            onClick={() => {
                              onOpenGeneric(g);
                              setDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-teal-50/70"
                          >
                            <div className="flex items-center gap-2.5">
                              <FlaskConical className="h-4 w-4 shrink-0 text-indigo-600" />
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{g.name}</div>
                                <div className="text-xs text-slate-500">{g.therapeuticClass}</div>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-indigo-600">
                              Monograph →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {searchResults.companies.length > 0 && (
                      <div>
                        <div className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                          Pharmaceutical Companies
                        </div>
                        {searchResults.companies.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              onOpenCompany(c);
                              setDropdownOpen(false);
                            }}
                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left transition hover:bg-teal-50/70"
                          >
                            <div className="flex items-center gap-2.5">
                              <Building2 className="h-4 w-4 shrink-0 text-emerald-600" />
                              <div>
                                <div className="text-sm font-semibold text-slate-900">{c.name}</div>
                                <div className="text-xs text-slate-500">
                                  {c.syncMode} • Synced {formatRelativeTime(c.lastSyncedAt)}
                                </div>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-emerald-700">
                              View Products →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="mt-3 flex items-center gap-1 overflow-x-auto pb-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            const isPortal = item.id === 'portal';
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectTab(item.id)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? isPortal
                      ? 'bg-teal-700 text-white shadow-sm'
                      : 'bg-teal-50 text-teal-800 ring-1 ring-teal-600/20'
                    : isPortal
                      ? 'bg-slate-900 text-white hover:bg-slate-800'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                {item.id === 'updates' && (
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-live-dot" />
                )}
                <span>{item.label}</span>
                {item.badge !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                      isActive
                        ? 'bg-teal-600/15 text-teal-800'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
