import fs from 'node:fs/promises';
import path from 'node:path';
import { createInitialCatalog } from '../../src/data/seedCatalog';
import { applyCompanyFeedItems } from '../../src/lib/catalogEngine';
import type { CatalogState, FeedProductItem } from '../../src/types/pharma';

const TMP_DIR = '/tmp/medpulse-data';
const CATALOG_FILE = path.join(TMP_DIR, 'catalog.json');
const FEEDS_FILE = path.join(TMP_DIR, 'feeds.json');

type FeedStore = Record<string, FeedProductItem[]>;

let memoryCatalog: CatalogState | null = null;
let memoryFeeds: FeedStore | null = null;

async function ensureDir(): Promise<void> {
  await fs.mkdir(TMP_DIR, { recursive: true });
}

export async function loadCatalog(): Promise<CatalogState> {
  if (memoryCatalog) return memoryCatalog;
  try {
    const raw = await fs.readFile(CATALOG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as CatalogState;
    if (parsed && Array.isArray(parsed.brands)) {
      memoryCatalog = parsed;
      return parsed;
    }
  } catch {
    // initialize
  }
  const initial = createInitialCatalog();
  await saveCatalog(initial);
  return initial;
}

export async function saveCatalog(catalog: CatalogState): Promise<void> {
  memoryCatalog = catalog;
  try {
    await ensureDir();
    await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog), 'utf8');
  } catch {
    // ignore read-only fs errors
  }
}

export async function loadFeeds(): Promise<FeedStore> {
  if (memoryFeeds) return memoryFeeds;
  try {
    const raw = await fs.readFile(FEEDS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as FeedStore;
    if (parsed && typeof parsed === 'object') {
      memoryFeeds = parsed;
      return parsed;
    }
  } catch {
    // initialize
  }
  memoryFeeds = {};
  return memoryFeeds;
}

export async function saveFeeds(feeds: FeedStore): Promise<void> {
  memoryFeeds = feeds;
  try {
    await ensureDir();
    await fs.writeFile(FEEDS_FILE, JSON.stringify(feeds), 'utf8');
  } catch {
    // ignore
  }
}

export async function syncAllCompanyFeeds(targetCompanyId?: string): Promise<{
  catalog: CatalogState;
  syncedCompanies: number;
  updatedProducts: number;
  errors: string[];
}> {
  let catalog = await loadCatalog();
  const feeds = await loadFeeds();
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
          const body = (await res.json()) as
            | FeedProductItem[]
            | { items?: FeedProductItem[]; products?: FeedProductItem[] };
          if (Array.isArray(body)) items = body;
          else if (Array.isArray(body.items)) items = body.items;
          else if (Array.isArray(body.products)) items = body.products;
        }
      } else {
        items = feeds[company.id] ?? null;
      }

      if (items && items.length > 0) {
        const res = applyCompanyFeedItems(catalog, company.id, items, 'Online Feed Sync');
        catalog = res.catalog;
        updatedProducts += res.appliedCount;
      } else {
        const now = new Date().toISOString();
        catalog = {
          ...catalog,
          companies: catalog.companies.map((c) =>
            c.id === company.id ? { ...c, lastSyncedAt: now } : c,
          ),
        };
      }
      syncedCompanies += 1;
    } catch (err) {
      errors.push(`${company.shortName}: ${err instanceof Error ? err.message : 'Sync failed'}`);
    }
  }

  await saveCatalog(catalog);
  return { catalog, syncedCompanies, updatedProducts, errors };
}
