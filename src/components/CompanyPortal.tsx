import { useEffect, useMemo, useState } from 'react';
import {
  Building2,
  CheckCircle2,
  Code2,
  FileJson,
  PlusCircle,
  Send,
  Sparkles,
  UploadCloud,
  Webhook,
} from 'lucide-react';
import type {
  CatalogState,
  Company,
  DosageForm,
  FeedProductItem,
  ProductStatus,
} from '../types/pharma';
import { DOSAGE_FORMS, formatBDT, formatRelativeTime } from '../lib/formatters';
import type { RegisterCompanyInput, UpsertBrandInput } from '../lib/catalogEngine';

interface CompanyPortalProps {
  catalog: CatalogState;
  onUpsertBrand: (input: UpsertBrandInput) => Promise<void>;
  onBatchFeed: (companyId: string, items: FeedProductItem[]) => Promise<void>;
  onRegisterCompany: (input: RegisterCompanyInput) => Promise<void>;
  onTestWebhook: (
    companyId: string,
    product: Omit<UpsertBrandInput, 'companyId' | 'source'>,
  ) => Promise<void>;
}

type PortalSubTab = 'product' | 'feed' | 'webhook';

const SAMPLE_FEED_ITEMS: FeedProductItem[] = [
  {
    brandName: 'Ace Plus',
    genericName: 'Paracetamol',
    dosageForm: 'Tablet',
    strength: '500 mg + 65 mg',
    unitPrice: 2.50,
    packSize: '20×10 (200 pcs)',
    packPrice: 500.00,
    darNumber: 'DAR 102-310-008',
    status: 'New Launch',
  },
  {
    brandName: 'Seclo',
    genericName: 'Omeprazole',
    dosageForm: 'Capsule',
    strength: '20 mg',
    unitPrice: 6.25,
    packSize: '15×10 (150 pcs)',
    packPrice: 937.50,
    darNumber: 'DAR 102-030-019',
    status: 'Price Revised',
  },
];

export function CompanyPortal({
  catalog,
  onUpsertBrand,
  onBatchFeed,
  onRegisterCompany,
  onTestWebhook,
}: CompanyPortalProps) {
  const [subTab, setSubTab] = useState<PortalSubTab>('product');
  const [companyId, setCompanyId] = useState(catalog.companies[0]?.id ?? 'square');
  const [mode, setMode] = useState<'update' | 'new'>('update');
  const [selectedBrandId, setSelectedBrandId] = useState('');

  // Form fields
  const [brandName, setBrandName] = useState('');
  const [genericName, setGenericName] = useState('Paracetamol');
  const [therapeuticClass, setTherapeuticClass] = useState('');
  const [dosageForm, setDosageForm] = useState<DosageForm>('Tablet');
  const [strength, setStrength] = useState('500 mg');
  const [unitPrice, setUnitPrice] = useState('1.50');
  const [packSize, setPackSize] = useState('10×10 (100 pcs)');
  const [packPrice, setPackPrice] = useState('150.00');
  const [darNumber, setDarNumber] = useState('');
  const [status, setStatus] = useState<ProductStatus>('Price Revised');

  // Feed & Registration fields
  const [feedJson, setFeedJson] = useState(JSON.stringify(SAMPLE_FEED_ITEMS, null, 2));
  const [newCompName, setNewCompName] = useState('');
  const [newCompShort, setNewCompShort] = useState('');
  const [newCompFeedUrl, setNewCompFeedUrl] = useState('');
  const [newCompSyncMode, setNewCompSyncMode] = useState<Company['syncMode']>('Auto Feed');

  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const companyBrands = useMemo(
    () => catalog.brands.filter((b) => b.companyId === companyId),
    [catalog.brands, companyId],
  );

  // Sync selected brand when switching company or mode
  useEffect(() => {
    if (mode === 'update') {
      const target =
        companyBrands.find((b) => b.id === selectedBrandId) ?? companyBrands[0];
      if (target) {
        setSelectedBrandId(target.id);
        setBrandName(target.brandName);
        const gen = catalog.generics.find((g) => g.id === target.genericId);
        setGenericName(gen?.name ?? target.genericId);
        setDosageForm(target.dosageForm);
        setStrength(target.strength);
        setUnitPrice(target.unitPrice.toFixed(2));
        setPackSize(target.packSize);
        setPackPrice(target.packPrice.toFixed(2));
        setDarNumber(target.darNumber);
        setStatus(target.status);
      } else {
        setSelectedBrandId('');
      }
    } else {
      setSelectedBrandId('');
      setBrandName('');
      setStrength('500 mg');
      setUnitPrice('10.00');
      setPackSize('3×10 (30 pcs)');
      setPackPrice('300.00');
      setDarNumber('');
      setStatus('New Launch');
    }
  }, [companyId, mode, companyBrands, selectedBrandId, catalog.generics]);

  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!brandName.trim() || !genericName.trim()) {
      setFeedback({ type: 'err', text: 'Brand name and generic name are required.' });
      return;
    }

    setBusy(true);
    try {
      await onUpsertBrand({
        id: mode === 'update' && selectedBrandId ? selectedBrandId : undefined,
        companyId,
        brandName: brandName.trim(),
        genericName: genericName.trim(),
        therapeuticClass: therapeuticClass.trim() || undefined,
        dosageForm,
        strength: strength.trim(),
        unitPrice: parseFloat(unitPrice) || 0,
        packSize: packSize.trim(),
        packPrice: parseFloat(packPrice) || 0,
        darNumber: darNumber.trim() || undefined,
        status,
        source: 'Company Portal',
      });
      setFeedback({
        type: 'ok',
        text: `Published live update for ${brandName} ${strength}. Catalog and Live Updates feed are now updated.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to publish update.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleBatchSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    setBusy(true);
    try {
      const parsed = JSON.parse(feedJson) as FeedProductItem[];
      if (!Array.isArray(parsed) || parsed.length === 0) {
        throw new Error('JSON feed must be a non-empty array of products.');
      }
      await onBatchFeed(companyId, parsed);
      setFeedback({
        type: 'ok',
        text: `Synced ${parsed.length} online product items for ${
          catalog.companies.find((c) => c.id === companyId)?.shortName ?? companyId
        }.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Invalid JSON feed payload.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleRegisterCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);
    if (!newCompName.trim() || !newCompShort.trim()) {
      setFeedback({ type: 'err', text: 'Company full name and short name are required.' });
      return;
    }
    setBusy(true);
    try {
      await onRegisterCompany({
        name: newCompName.trim(),
        shortName: newCompShort.trim(),
        feedUrl: newCompFeedUrl.trim() || undefined,
        syncMode: newCompSyncMode,
      });
      setNewCompName('');
      setNewCompShort('');
      setNewCompFeedUrl('');
      setFeedback({
        type: 'ok',
        text: 'New pharmaceutical company registered and connected to MedPulse.',
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Failed to register company.',
      });
    } finally {
      setBusy(false);
    }
  };

  const handleSimulateWebhook = async () => {
    setBusy(true);
    setFeedback(null);
    try {
      const randomPrice = Number((7 + Math.random() * 4).toFixed(2));
      await onTestWebhook('beximco', {
        brandName: 'Napa Rapid',
        genericName: 'Paracetamol',
        dosageForm: 'Tablet',
        strength: '500 mg (Fast Act)',
        unitPrice: randomPrice,
        packSize: '20×10 (200 pcs)',
        packPrice: Number((randomPrice * 200).toFixed(2)),
        status: 'New Launch',
      });
      setFeedback({
        type: 'ok',
        text: `Webhook received from Beximco ERP! "Napa Rapid 500 mg (Fast Act)" updated live at ৳${randomPrice.toFixed(2)}.`,
      });
    } catch (err) {
      setFeedback({
        type: 'err',
        text: err instanceof Error ? err.message : 'Webhook simulation failed.',
      });
    } finally {
      setBusy(false);
    }
  };

  const origin =
    typeof window !== 'undefined' ? window.location.origin : 'https://medpulse.netlify.app';

  const curlSnippet = `curl -X POST ${origin}/api/webhook/company-update \\
  -H "Content-Type: application/json" \\
  -d '{
    "companyId": "${companyId}",
    "product": {
      "brandName": "Napa",
      "genericName": "Paracetamol",
      "dosageForm": "Tablet",
      "strength": "500 mg",
      "unitPrice": 1.25,
      "packSize": "50x10 (500 pcs)",
      "packPrice": 625.00,
      "status": "Price Revised"
    }
  }'`;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-900 via-teal-800 to-emerald-800 p-6 text-white shadow-sm">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-emerald-200">
              <UploadCloud className="h-3.5 w-3.5" />
              Manufacturer Online Sync Center
            </div>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              Company Product Update Portal
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-teal-100">
              Pharmaceutical companies can publish new launches, revise unit prices, update stock
              availability, or connect their online JSON product feeds &amp; webhooks for instant
              MedPulse catalog updates.
            </p>
          </div>
          <div className="rounded-xl bg-white/10 px-4 py-3 text-right backdrop-blur-xs">
            <div className="text-xs text-teal-200">Catalog Version</div>
            <div className="font-mono text-2xl font-bold">v{catalog.version}</div>
            <div className="text-[11px] text-emerald-300">
              Synced {formatRelativeTime(catalog.lastUpdatedAt)}
            </div>
          </div>
        </div>
      </div>

      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setSubTab('product')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'product'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <PlusCircle className="h-4 w-4" />
          Publish / Update Product
        </button>
        <button
          type="button"
          onClick={() => setSubTab('feed')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'feed'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <FileJson className="h-4 w-4" />
          Online JSON Feed &amp; Register Company
        </button>
        <button
          type="button"
          onClick={() => setSubTab('webhook')}
          className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
            subTab === 'webhook'
              ? 'bg-teal-700 text-white shadow-sm'
              : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Webhook className="h-4 w-4" />
          ERP Webhook &amp; Auto-Sync API
        </button>
      </div>

      {feedback && (
        <div
          className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium ${
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
          }`}
        >
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>{feedback.text}</span>
        </div>
      )}

      {subTab === 'product' && (
        <form
          onSubmit={handleProductSubmit}
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
        >
          <div className="mb-6 flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Single Product Live Update
              </h3>
              <p className="text-xs text-slate-500">
                Changes are published immediately to all visitors and logged in Live Updates.
              </p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setMode('update')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === 'update'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Update Existing Product
              </button>
              <button
                type="button"
                onClick={() => setMode('new')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  mode === 'new'
                    ? 'bg-white text-teal-700 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Publish New Launch
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Pharmaceutical Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
              >
                {catalog.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {mode === 'update' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Select Existing Brand
                </label>
                <select
                  value={selectedBrandId}
                  onChange={(e) => setSelectedBrandId(e.target.value)}
                  className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 focus:border-teal-600 focus:outline-none"
                >
                  {companyBrands.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.brandName} ({b.strength} {b.dosageForm}) — {formatBDT(b.unitPrice)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Brand Name
              </label>
              <input
                type="text"
                required
                value={brandName}
                onChange={(e) => setBrandName(e.target.value)}
                placeholder="e.g., Napa, Sergel, Maxpro"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Generic Name
              </label>
              <input
                type="text"
                required
                list="medpulse-generics-list"
                value={genericName}
                onChange={(e) => setGenericName(e.target.value)}
                placeholder="e.g., Paracetamol"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              />
              <datalist id="medpulse-generics-list">
                {catalog.generics.map((g) => (
                  <option key={g.id} value={g.name} />
                ))}
              </datalist>
            </div>

            {mode === 'new' && (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Therapeutic Class (if new generic)
                </label>
                <input
                  type="text"
                  value={therapeuticClass}
                  onChange={(e) => setTherapeuticClass(e.target.value)}
                  placeholder="e.g., Proton Pump Inhibitor"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Dosage Form
              </label>
              <select
                value={dosageForm}
                onChange={(e) => setDosageForm(e.target.value as DosageForm)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              >
                {DOSAGE_FORMS.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Strength
              </label>
              <input
                type="text"
                required
                value={strength}
                onChange={(e) => setStrength(e.target.value)}
                placeholder="e.g., 500 mg"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Unit Price (৳ BDT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Pack Size
              </label>
              <input
                type="text"
                required
                value={packSize}
                onChange={(e) => setPackSize(e.target.value)}
                placeholder="e.g., 10×10 (100 pcs)"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Pack Price (৳ BDT)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={packPrice}
                onChange={(e) => setPackPrice(e.target.value)}
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Availability / Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as ProductStatus)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm focus:border-teal-600 focus:outline-none"
              >
                <option value="Available">Available</option>
                <option value="Price Revised">Price Revised</option>
                <option value="New Launch">New Launch</option>
                <option value="Limited Stock">Limited Stock</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                DAR Number
              </label>
              <input
                type="text"
                value={darNumber}
                onChange={(e) => setDarNumber(e.target.value)}
                placeholder="DAR 102-xxx-xxx"
                className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-sm focus:border-teal-600 focus:outline-none"
              />
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              {busy ? 'Publishing...' : 'Publish Live Update'}
            </button>
          </div>
        </form>
      )}

      {subTab === 'feed' && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Batch JSON Sync */}
          <form
            onSubmit={handleBatchSubmit}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Sync Company Online Product JSON
                </h3>
                <p className="text-xs text-slate-500">
                  Paste a company&apos;s online JSON feed items to update multiple products at once.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFeedJson(JSON.stringify(SAMPLE_FEED_ITEMS, null, 2))}
                className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50"
              >
                Reset Sample
              </button>
            </div>

            <div className="mb-3">
              <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                Target Company
              </label>
              <select
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm"
              >
                {catalog.companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.feedUrl})
                  </option>
                ))}
              </select>
            </div>

            <textarea
              rows={11}
              value={feedJson}
              onChange={(e) => setFeedJson(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-slate-950 p-3 font-mono text-xs text-emerald-300 focus:border-teal-600 focus:outline-none"
            />

            <div className="mt-4 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
              >
                <UploadCloud className="h-4 w-4" />
                {busy ? 'Syncing...' : 'Apply Online Feed'}
              </button>
            </div>
          </form>

          {/* Register New Company */}
          <form
            onSubmit={handleRegisterCompany}
            className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs"
          >
            <div className="mb-4 flex items-center gap-2">
              <Building2 className="h-5 w-5 text-teal-700" />
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Connect New Pharmaceutical Company
                </h3>
                <p className="text-xs text-slate-500">
                  Add a company with its online HTTPS product feed URL for automated MedPulse sync.
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Company Legal Name
                </label>
                <input
                  type="text"
                  required
                  value={newCompName}
                  onChange={(e) => setNewCompName(e.target.value)}
                  placeholder="e.g., Beacon Pharmaceuticals PLC"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Short Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newCompShort}
                    onChange={(e) => setNewCompShort(e.target.value)}
                    placeholder="e.g., Beacon"
                    className="w-full rounded-xl border border-slate-300 px-3 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                    Sync Pipeline Mode
                  </label>
                  <select
                    value={newCompSyncMode}
                    onChange={(e) => setNewCompSyncMode(e.target.value as Company['syncMode'])}
                    className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm"
                  >
                    <option value="Auto Feed">Auto Feed (15m Cron)</option>
                    <option value="Webhook">Real-Time Webhook</option>
                    <option value="Portal">Company Portal</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-600">
                  Online Product JSON Feed URL (Optional)
                </label>
                <input
                  type="url"
                  value={newCompFeedUrl}
                  onChange={(e) => setNewCompFeedUrl(e.target.value)}
                  placeholder="https://pharma-company.com/api/products.json"
                  className="w-full rounded-xl border border-slate-300 px-3 py-2.5 font-mono text-xs"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Leave blank to auto-assign a hosted MedPulse feed endpoint under /api/company-feed/.
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                type="submit"
                disabled={busy}
                className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
              >
                <PlusCircle className="h-4 w-4" />
                Register &amp; Connect Company
              </button>
            </div>
          </form>
        </div>
      )}

      {subTab === 'webhook' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex flex-col justify-between gap-4 border-b border-slate-200 pb-4 sm:flex-row sm:items-center">
            <div>
              <div className="flex items-center gap-2">
                <Code2 className="h-5 w-5 text-teal-700" />
                <h3 className="text-lg font-bold text-slate-900">
                  Real-Time Manufacturer Webhook API
                </h3>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Whenever a pharmaceutical company updates a product on their online store or ERP,
                they can POST to this endpoint and MedPulse updates instantaneously. Scheduled feed
                sync also polls every 15 minutes automatically.
              </p>
            </div>

            <button
              type="button"
              onClick={handleSimulateWebhook}
              disabled={busy}
              className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-60"
            >
              <Sparkles className="h-4 w-4" />
              Simulate Live Company Webhook
            </button>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">Webhook Endpoint</div>
              <div className="mt-1 font-mono text-xs font-semibold text-teal-700">
                POST /api/webhook/company-update
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">Company JSON Feeds</div>
              <div className="mt-1 font-mono text-xs font-semibold text-teal-700">
                GET /api/company-feed/:companyId
              </div>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-xs font-bold uppercase text-slate-500">Scheduled Auto-Sync</div>
              <div className="mt-1 font-mono text-xs font-semibold text-emerald-700">
                Cron: */15 * * * * (Netlify)
              </div>
            </div>
          </div>

          <div className="mt-5">
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Example cURL Request
            </div>
            <pre className="overflow-x-auto rounded-xl bg-slate-950 p-4 font-mono text-xs leading-relaxed text-emerald-300">
              {curlSnippet}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
