import type {
  CatalogState,
  Company,
  DosageForm,
  FeedProductItem,
  Generic,
  MedicineBrand,
  ProductStatus,
  ProductUpdateLog,
  UpdateSource,
} from '../types/pharma';

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export interface UpsertBrandInput {
  id?: string;
  companyId: string;
  brandName: string;
  genericId?: string;
  genericName?: string;
  therapeuticClass?: string;
  dosageForm: DosageForm;
  strength: string;
  unitPrice: number;
  packSize: string;
  packPrice: number;
  darNumber?: string;
  status?: ProductStatus;
  source?: Exclude<UpdateSource, 'Official Catalog'>;
}

export function upsertBrandInCatalog(
  catalog: CatalogState,
  input: UpsertBrandInput,
): { catalog: CatalogState; brand: MedicineBrand; log: ProductUpdateLog | null } {
  const now = new Date().toISOString();
  const source = input.source ?? 'Company Portal';

  const company = catalog.companies.find((c) => c.id === input.companyId);
  if (!company) {
    throw new Error(`Company "${input.companyId}" not found.`);
  }

  let generics = catalog.generics;
  let generic: Generic | undefined;

  if (input.genericId) {
    generic = generics.find((g) => g.id === input.genericId);
  }
  if (!generic && input.genericName) {
    const normalized = input.genericName.trim().toLowerCase();
    generic = generics.find(
      (g) =>
        g.name.toLowerCase() === normalized ||
        g.id.toLowerCase() === slugify(input.genericName ?? ''),
    );
  }

  if (!generic) {
    const genericName = (input.genericName ?? input.genericId ?? 'Unspecified Generic').trim();
    const newGenericId = slugify(genericName) || `generic-${Date.now()}`;
    generic = {
      id: newGenericId,
      name: genericName,
      therapeuticClass: input.therapeuticClass?.trim() || 'Pharmaceutical Agent',
      indications: `Submitted by ${company.shortName}. Clinical monograph pending editorial review.`,
      pharmacology: 'Detailed pharmacokinetic and pharmacodynamic profile synced from manufacturer dossier.',
      dosage: 'Refer to the approved prescribing information or consult a registered physician.',
      contraindications: 'Hypersensitivity to the active substance or any excipients.',
      sideEffects: 'Monitor patient response and consult approved product literature.',
      interactions: 'Check concomitant medications prior to prescribing.',
      pregnancyCategory: 'Consult prescribing physician.',
      storage: 'Store below 30°C in a dry place, away from light.',
    };
    generics = [generic, ...generics];
  }

  const existingIndex = catalog.brands.findIndex(
    (b) =>
      (input.id && b.id === input.id) ||
      (b.companyId === company.id &&
        b.brandName.toLowerCase() === input.brandName.trim().toLowerCase() &&
        b.strength.toLowerCase() === input.strength.trim().toLowerCase() &&
        b.dosageForm === input.dosageForm),
  );

  let updatedBrands = [...catalog.brands];
  let resultBrand: MedicineBrand;
  let log: ProductUpdateLog | null = null;

  if (existingIndex >= 0) {
    const prev = updatedBrands[existingIndex];
    const priceChanged = Math.abs(prev.unitPrice - input.unitPrice) > 0.001;
    const statusChanged = input.status !== undefined && input.status !== prev.status;
    const nextStatus: ProductStatus =
      input.status ?? (priceChanged ? 'Price Revised' : prev.status);

    resultBrand = {
      ...prev,
      brandName: input.brandName.trim(),
      genericId: generic.id,
      dosageForm: input.dosageForm,
      strength: input.strength.trim(),
      unitPrice: Number(input.unitPrice.toFixed(2)),
      previousUnitPrice: priceChanged ? prev.unitPrice : prev.previousUnitPrice,
      packSize: input.packSize.trim() || prev.packSize,
      packPrice: Number(input.packPrice.toFixed(2)),
      darNumber: input.darNumber?.trim() || prev.darNumber,
      status: nextStatus,
      updatedAt: now,
      updateSource: source,
    };
    updatedBrands[existingIndex] = resultBrand;

    let changeType: ProductUpdateLog['changeType'] = 'Spec Updated';
    const summaryParts: string[] = [];

    if (priceChanged) {
      changeType = 'Price Updated';
      summaryParts.push(
        `Unit price updated from ৳${prev.unitPrice.toFixed(2)} to ৳${resultBrand.unitPrice.toFixed(2)}`,
      );
    }
    if (statusChanged) {
      if (!priceChanged) changeType = 'Stock Changed';
      summaryParts.push(`Status changed to ${resultBrand.status}`);
    }
    if (prev.packPrice !== resultBrand.packPrice && !priceChanged) {
      summaryParts.push(
        `Pack price updated to ৳${resultBrand.packPrice.toFixed(2)} (${resultBrand.packSize})`,
      );
    }
    if (summaryParts.length === 0) {
      summaryParts.push(`Product record verified and refreshed by ${company.shortName}`);
    }

    log = {
      id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      companyId: company.id,
      companyName: company.name,
      brandId: resultBrand.id,
      brandName: `${resultBrand.brandName} ${resultBrand.strength}`,
      genericName: generic.name,
      changeType,
      summary: `${summaryParts.join('. ')}.`,
      source,
    };
  } else {
    const newId =
      input.id?.trim() ||
      `${slugify(input.brandName)}-${slugify(input.strength)}-${Date.now().toString(36)}`;

    resultBrand = {
      id: newId,
      brandName: input.brandName.trim(),
      genericId: generic.id,
      companyId: company.id,
      dosageForm: input.dosageForm,
      strength: input.strength.trim(),
      unitPrice: Number(input.unitPrice.toFixed(2)),
      packSize: input.packSize.trim() || '1×10 Strip',
      packPrice: Number(input.packPrice.toFixed(2)),
      darNumber:
        input.darNumber?.trim() ||
        `DAR ${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}`,
      status: input.status ?? 'New Launch',
      updatedAt: now,
      updateSource: source,
    };
    updatedBrands = [resultBrand, ...updatedBrands];

    log = {
      id: `upd-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: now,
      companyId: company.id,
      companyName: company.name,
      brandId: resultBrand.id,
      brandName: `${resultBrand.brandName} ${resultBrand.strength}`,
      genericName: generic.name,
      changeType: 'New Product',
      summary: `Published new ${resultBrand.dosageForm.toLowerCase()} at ৳${resultBrand.unitPrice.toFixed(2)} (${resultBrand.packSize}).`,
      source,
    };
  }

  const updatedCompanies = catalog.companies.map((c) =>
    c.id === company.id ? { ...c, lastSyncedAt: now } : c,
  );

  const updatedLogs = log ? [log, ...catalog.updates].slice(0, 80) : catalog.updates;

  return {
    catalog: {
      version: catalog.version + 1,
      lastUpdatedAt: now,
      companies: updatedCompanies,
      generics,
      brands: updatedBrands,
      updates: updatedLogs,
    },
    brand: resultBrand,
    log,
  };
}

export function applyCompanyFeedItems(
  catalog: CatalogState,
  companyId: string,
  items: FeedProductItem[],
  source: Exclude<UpdateSource, 'Official Catalog'> = 'Online Feed Sync',
): { catalog: CatalogState; appliedCount: number; logs: ProductUpdateLog[] } {
  let nextCatalog = catalog;
  const logs: ProductUpdateLog[] = [];

  for (const item of items) {
    const res = upsertBrandInCatalog(nextCatalog, {
      companyId,
      brandName: item.brandName,
      genericName: item.genericName,
      dosageForm: item.dosageForm,
      strength: item.strength,
      unitPrice: item.unitPrice,
      packSize: item.packSize,
      packPrice: item.packPrice,
      darNumber: item.darNumber,
      status: item.status,
      source,
    });
    nextCatalog = res.catalog;
    if (res.log) logs.push(res.log);
  }

  return {
    catalog: nextCatalog,
    appliedCount: items.length,
    logs,
  };
}

export interface RegisterCompanyInput {
  name: string;
  shortName: string;
  country?: string;
  website?: string;
  feedUrl?: string;
  syncMode?: Company['syncMode'];
  description?: string;
}

export function registerCompanyInCatalog(
  catalog: CatalogState,
  input: RegisterCompanyInput,
): { catalog: CatalogState; company: Company } {
  const now = new Date().toISOString();
  const baseId = slugify(input.shortName || input.name) || `company-${Date.now()}`;
  const exists = catalog.companies.some((c) => c.id === baseId);
  const id = exists ? `${baseId}-${Date.now().toString(36).slice(-4)}` : baseId;

  const company: Company = {
    id,
    name: input.name.trim(),
    shortName: input.shortName.trim(),
    country: input.country?.trim() || 'Bangladesh',
    website: input.website?.trim() || 'https://example.com',
    feedUrl: input.feedUrl?.trim() || `/api/company-feed/${id}`,
    syncMode: input.syncMode ?? 'Portal',
    lastSyncedAt: now,
    verified: true,
    description:
      input.description?.trim() ||
      'Connected pharmaceutical manufacturer syncing live brand & pricing updates to MedPulse.',
  };

  return {
    catalog: {
      ...catalog,
      version: catalog.version + 1,
      lastUpdatedAt: now,
      companies: [company, ...catalog.companies],
    },
    company,
  };
}
