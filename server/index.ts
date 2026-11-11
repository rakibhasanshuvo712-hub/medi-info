import express from 'express';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInitialCatalog } from '../src/data/seedCatalog.ts';
import {
  applyCompanyFeedItems,
  registerCompanyInCatalog,
  upsertBrandInCatalog,
  type RegisterCompanyInput,
  type UpsertBrandInput,
} from '../src/lib/catalogEngine.ts';
import type { CatalogState, FeedProductItem } from '../src/types/pharma.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');
const DIST_DIR = path.join(ROOT_DIR, 'dist');
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT_DIR, 'data');
const CATALOG_FILE = path.join(DATA_DIR, 'catalog.json');
const FEEDS_FILE = path.join(DATA_DIR, 'feeds.json');

type FeedStore = Record<string, FeedProductItem[]>;

async function ensureDataDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

async function loadCatalog(): Promise<CatalogState> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(CATALOG_FILE, 'utf8');
    const parsed = JSON.parse(raw) as CatalogState;
    if (parsed && Array.isArray(parsed.brands)) {
      return parsed;
    }
  } catch {
    // initialize below
  }
  const initial = createInitialCatalog();
  await saveCatalog(initial);
  return initial;
}

async function saveCatalog(catalog: CatalogState): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(CATALOG_FILE, JSON.stringify(catalog, null, 2), 'utf8');
}

async function loadFeeds(): Promise<FeedStore> {
  await ensureDataDir();
  try {
    const raw = await fs.readFile(FEEDS_FILE, 'utf8');
    const parsed = JSON.parse(raw) as FeedStore;
    if (parsed && typeof parsed === 'object') return parsed;
  } catch {
    // ignore
  }
  return {};
}

async function saveFeeds(feeds: FeedStore): Promise<void> {
  await ensureDataDir();
  await fs.writeFile(FEEDS_FILE, JSON.stringify(feeds, null, 2), 'utf8');
}

async function syncAllCompanyFeeds(targetCompanyId?: string): Promise<{
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

const app = express();
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'medpulse', timestamp: new Date().toISOString() });
});

app.get('/api/catalog', async (req, res) => {
  try {
    const catalog = await loadCatalog();
    const sinceVersion = req.query.sinceVersion;
    if (sinceVersion !== undefined && Number(sinceVersion) === catalog.version) {
      res.json({
        upToDate: true,
        version: catalog.version,
        lastUpdatedAt: catalog.lastUpdatedAt,
      });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.json(catalog);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Failed to load catalog' });
  }
});

app.post('/api/catalog', async (req, res) => {
  try {
    const payload = req.body as
      | { action: 'upsert-brand'; data: UpsertBrandInput }
      | { action: 'register-company'; data: RegisterCompanyInput }
      | { action: 'batch-feed'; companyId: string; items: FeedProductItem[] }
      | { action: 'reset-demo' };

    if (payload.action === 'reset-demo') {
      const fresh = createInitialCatalog();
      await saveCatalog(fresh);
      res.json({ catalog: fresh });
      return;
    }

    const current = await loadCatalog();

    if (payload.action === 'upsert-brand') {
      const result = upsertBrandInCatalog(current, payload.data);
      await saveCatalog(result.catalog);
      res.json(result);
      return;
    }

    if (payload.action === 'register-company') {
      const result = registerCompanyInCatalog(current, payload.data);
      await saveCatalog(result.catalog);
      res.json(result);
      return;
    }

    if (payload.action === 'batch-feed') {
      const result = applyCompanyFeedItems(
        current,
        payload.companyId,
        payload.items,
        'Company Portal',
      );
      await saveCatalog(result.catalog);
      res.json(result);
      return;
    }

    res.status(400).json({ error: 'Unsupported action' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Catalog update failed' });
  }
});

app.get('/api/company-feed/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const feeds = await loadFeeds();
    if (feeds[companyId]) {
      res.json({ companyId, source: 'live-online-feed', items: feeds[companyId] });
      return;
    }

    const catalog = await loadCatalog();
    const company = catalog.companies.find((c) => c.id === companyId);
    if (!company) {
      res.status(404).json({ error: 'Company not found' });
      return;
    }

    const items: FeedProductItem[] = catalog.brands
      .filter((b) => b.companyId === companyId)
      .map((b) => {
        const generic = catalog.generics.find((g) => g.id === b.genericId);
        return {
          brandName: b.brandName,
          genericName: generic?.name ?? b.genericId,
          dosageForm: b.dosageForm,
          strength: b.strength,
          unitPrice: b.unitPrice,
          packSize: b.packSize,
          packPrice: b.packPrice,
          darNumber: b.darNumber,
          status: b.status,
        };
      });

    res.json({
      companyId,
      companyName: company.name,
      source: 'catalog-derived-feed',
      items,
    });
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Feed read failed' });
  }
});

app.post('/api/company-feed/:companyId', async (req, res) => {
  try {
    const { companyId } = req.params;
    const body = req.body as { items?: FeedProductItem[] } | FeedProductItem[];
    const items = Array.isArray(body) ? body : body.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Expected an items array' });
      return;
    }
    const feeds = await loadFeeds();
    feeds[companyId] = items;
    await saveFeeds(feeds);
    res.json({
      ok: true,
      companyId,
      itemCount: items.length,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid feed payload' });
  }
});

app.post('/api/sync-feeds', async (req, res) => {
  try {
    const companyId = (req.body as { companyId?: string } | undefined)?.companyId;
    const result = await syncAllCompanyFeeds(companyId);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Feed sync failed' });
  }
});

app.post('/api/webhook/company-update', async (req, res) => {
  try {
    const payload = req.body as {
      companyId?: string;
      product?: Omit<UpsertBrandInput, 'companyId' | 'source'>;
      items?: FeedProductItem[];
    };
    if (!payload.companyId) {
      res.status(400).json({ error: 'companyId is required' });
      return;
    }
    const current = await loadCatalog();
    if (Array.isArray(payload.items) && payload.items.length > 0) {
      const result = applyCompanyFeedItems(
        current,
        payload.companyId,
        payload.items,
        'Webhook API',
      );
      await saveCatalog(result.catalog);
      res.json({
        ok: true,
        appliedCount: result.appliedCount,
        version: result.catalog.version,
        logs: result.logs,
      });
      return;
    }
    if (payload.product) {
      const result = upsertBrandInCatalog(current, {
        ...payload.product,
        companyId: payload.companyId,
        source: 'Webhook API',
      });
      await saveCatalog(result.catalog);
      res.json({
        ok: true,
        brand: result.brand,
        version: result.catalog.version,
        log: result.log,
      });
      return;
    }
    res.status(400).json({ error: 'Provide either "product" or "items"' });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : 'Webhook failed' });
  }
});

app.use(express.static(DIST_DIR));
app.get('/{*splat}', (_req, res) => {
  res.sendFile(path.join(DIST_DIR, 'index.html'));
});

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`MedPulse server listening on http://0.0.0.0:${port}`);
});

// Auto-sync external company feeds every 15 minutes
setInterval(() => {
  void syncAllCompanyFeeds().catch((err) => {
    console.error('[MedPulse Auto-Sync] Error:', err);
  });
}, 15 * 60 * 1000);
