import { createInitialCatalog } from '../data/seedCatalog';
import type { CatalogState, FeedProductItem } from '../types/pharma';
import {
  applyCompanyFeedItems,
  registerCompanyInCatalog,
  upsertBrandInCatalog,
  type RegisterCompanyInput,
  type UpsertBrandInput,
} from './catalogEngine';

const LOCAL_STORAGE_KEY = 'medpulse_local_catalog_v2';

function readLocalCatalog(): CatalogState {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as CatalogState;
      if (parsed && Array.isArray(parsed.brands)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  const initial = createInitialCatalog();
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(initial));
  } catch {
    // ignore
  }
  return initial;
}

function writeLocalCatalog(catalog: CatalogState): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    // ignore
  }
}

export async function fetchCatalog(sinceVersion?: number): Promise<{
  catalog?: CatalogState;
  upToDate?: boolean;
  mode: 'live-api' | 'local-fallback';
}> {
  try {
    const query = sinceVersion !== undefined ? `?sinceVersion=${sinceVersion}` : '';
    const res = await fetch(`/api/catalog${query}`, { cache: 'no-store' });
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as CatalogState & { upToDate?: boolean };
      if (data.upToDate) {
        return { upToDate: true, mode: 'live-api' };
      }
      if (Array.isArray(data.brands)) {
        writeLocalCatalog(data);
        return { catalog: data, mode: 'live-api' };
      }
    }
  } catch {
    // fallback below
  }

  return {
    catalog: readLocalCatalog(),
    mode: 'local-fallback',
  };
}

export async function submitBrandUpdate(
  input: UpsertBrandInput,
): Promise<{ catalog: CatalogState; mode: 'live-api' | 'local-fallback' }> {
  try {
    const res = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'upsert-brand', data: input }),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as { catalog: CatalogState };
      if (data.catalog) {
        writeLocalCatalog(data.catalog);
        return { catalog: data.catalog, mode: 'live-api' };
      }
    }
  } catch {
    // fallback below
  }

  const local = readLocalCatalog();
  const result = upsertBrandInCatalog(local, input);
  writeLocalCatalog(result.catalog);
  return { catalog: result.catalog, mode: 'local-fallback' };
}

export async function submitBatchFeed(
  companyId: string,
  items: FeedProductItem[],
): Promise<{ catalog: CatalogState; appliedCount: number; mode: 'live-api' | 'local-fallback' }> {
  try {
    const res = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'batch-feed', companyId, items }),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as { catalog: CatalogState; appliedCount: number };
      if (data.catalog) {
        writeLocalCatalog(data.catalog);
        return { ...data, mode: 'live-api' };
      }
    }
  } catch {
    // fallback below
  }

  const local = readLocalCatalog();
  const result = applyCompanyFeedItems(local, companyId, items, 'Company Portal');
  writeLocalCatalog(result.catalog);
  return { catalog: result.catalog, appliedCount: result.appliedCount, mode: 'local-fallback' };
}

export async function registerCompany(
  input: RegisterCompanyInput,
): Promise<{ catalog: CatalogState; mode: 'live-api' | 'local-fallback' }> {
  try {
    const res = await fetch('/api/catalog', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register-company', data: input }),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as { catalog: CatalogState };
      if (data.catalog) {
        writeLocalCatalog(data.catalog);
        return { catalog: data.catalog, mode: 'live-api' };
      }
    }
  } catch {
    // fallback below
  }

  const local = readLocalCatalog();
  const result = registerCompanyInCatalog(local, input);
  writeLocalCatalog(result.catalog);
  return { catalog: result.catalog, mode: 'local-fallback' };
}

export async function triggerSyncAllFeeds(companyId?: string): Promise<{
  catalog: CatalogState;
  syncedCompanies: number;
  updatedProducts: number;
  mode: 'live-api' | 'local-fallback';
}> {
  try {
    const res = await fetch('/api/sync-feeds', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(companyId ? { companyId } : {}),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && contentType.includes('application/json')) {
      const data = (await res.json()) as {
        catalog: CatalogState;
        syncedCompanies: number;
        updatedProducts: number;
      };
      if (data.catalog) {
        writeLocalCatalog(data.catalog);
        return { ...data, mode: 'live-api' };
      }
    }
  } catch {
    // fallback below
  }

  const local = readLocalCatalog();
  const now = new Date().toISOString();
  const updated: CatalogState = {
    ...local,
    version: local.version + 1,
    lastUpdatedAt: now,
    companies: local.companies.map((c) =>
      !companyId || c.id === companyId ? { ...c, lastSyncedAt: now } : c,
    ),
  };
  writeLocalCatalog(updated);
  return {
    catalog: updated,
    syncedCompanies: companyId ? 1 : updated.companies.length,
    updatedProducts: 0,
    mode: 'local-fallback',
  };
}

export async function triggerTestWebhook(
  companyId: string,
  product: Omit<UpsertBrandInput, 'companyId' | 'source'>,
): Promise<{ catalog: CatalogState; mode: 'live-api' | 'local-fallback' }> {
  try {
    const res = await fetch('/api/webhook/company-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ companyId, product }),
    });
    const contentType = res.headers.get('content-type') ?? '';
    if (res.ok && contentType.includes('application/json')) {
      const fetched = await fetchCatalog();
      if (fetched.catalog) {
        return { catalog: fetched.catalog, mode: 'live-api' };
      }
    }
  } catch {
    // fallback below
  }

  const local = readLocalCatalog();
  const result = upsertBrandInCatalog(local, {
    ...product,
    companyId,
    source: 'Webhook API',
  });
  writeLocalCatalog(result.catalog);
  return { catalog: result.catalog, mode: 'local-fallback' };
}
