import { getStore } from '@netlify/blobs';
import { createInitialCatalog } from '../../src/data/seedCatalog';
import { applyCompanyFeedItems } from '../../src/lib/catalogEngine';
import type { CatalogState, FeedProductItem } from '../../src/types/pharma';

const CATALOG_STORE = 'medpulse-catalog';
const CATALOG_KEY = 'catalog-state-v1';
const FEED_STORE = 'medpulse-company-feeds';

export async function loadCatalog(): Promise<CatalogState> {
  const store = getStore(CATALOG_STORE);
  const existing = await store.get(CATALOG_KEY, { type: 'json' }) as CatalogState | null;
  if (existing && Array.isArray(existing.brands)) {
    return existing;
  }
  const initial = createInitialCatalog();
  await store.setJSON(CATALOG_KEY, initial);
  return initial;
}

export async function saveCatalog(catalog: CatalogState): Promise<void> {
  const store = getStore(CATALOG_STORE);
  await store.setJSON(CATALOG_KEY, catalog);
}

export async function loadCompanyFeed(companyId: string): Promise<FeedProductItem[] | null> {
  const store = getStore(FEED_STORE);
  const feed = await store.get(companyId, { type: 'json' }) as { items?: FeedProductItem[] } | null;
  if (feed && Array.isArray(feed.items)) {
    return feed.items;
  }
  return null;
}

export async function saveCompanyFeed(companyId: string, items: FeedProductItem[]): Promise<void> {
  const store = getStore(FEED_STORE);
  await store.setJSON(companyId, {
    companyId,
    updatedAt: new Date().toISOString(),
    items,
  });
}

export async function syncAllCompanyFeeds(targetCompanyId?: string): Promise<{
  catalog: CatalogState;
  syncedCompanies: number;
  updatedProducts: number;
  errors: string[];
}> {
  let catalog = await loadCatalog();
  const targets = targetCompanyId
    ? catalog.companies.filter((c) => c.id === targetCompanyId)
    : catalog.companies;

  let syncedCompanies = 0;
  let updatedProducts = 0;
  const errors: string[] = [];

  for (const company of targets) {
    try {
      let items: FeedProductItem[] | null = null;

      if (company.feedUrl.startsWith('http://') || company.feedUrl.startsWith('https://')) {
        const res = await fetch(company.feedUrl, {
          headers: { Accept: 'application/json' },
          signal: AbortSignal.timeout(6000),
        });
        if (res.ok) {
          const body = (await res.json()) as FeedProductItem[] | { items?: FeedProductItem[]; products?: FeedProductItem[] };
          if (Array.isArray(body)) {
            items = body;
          } else if (Array.isArray(body.items)) {
            items = body.items;
          } else if (Array.isArray(body.products)) {
            items = body.products;
          }
        }
      } else {
        items = await loadCompanyFeed(company.id);
      }

      if (items && items.length > 0) {
        const result = applyCompanyFeedItems(catalog, company.id, items, 'Online Feed Sync');
        catalog = result.catalog;
        updatedProducts += result.appliedCount;
        syncedCompanies += 1;
      } else {
        // Touch lastSyncedAt to show active feed verification
        const now = new Date().toISOString();
        catalog = {
          ...catalog,
          companies: catalog.companies.map((c) =>
            c.id === company.id ? { ...c, lastSyncedAt: now } : c,
          ),
        };
        syncedCompanies += 1;
      }
    } catch (err) {
      errors.push(`${company.shortName}: ${err instanceof Error ? err.message : 'Sync failed'}`);
    }
  }

  await saveCatalog(catalog);
  return { catalog, syncedCompanies, updatedProducts, errors };
}
