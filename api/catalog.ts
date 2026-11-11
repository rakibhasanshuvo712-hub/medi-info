import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createInitialCatalog } from '../src/data/seedCatalog.js';
import {
  applyCompanyFeedItems,
  registerCompanyInCatalog,
  upsertBrandInCatalog,
  type RegisterCompanyInput,
  type UpsertBrandInput,
} from '../src/lib/catalogEngine.js';
import type { FeedProductItem } from '../src/types/pharma.js';
import { loadCatalog, saveCatalog } from './_lib/store.js';

type CatalogActionPayload =
  | { action: 'upsert-brand'; data: UpsertBrandInput }
  | { action: 'register-company'; data: RegisterCompanyInput }
  | { action: 'batch-feed'; companyId: string; items: FeedProductItem[] }
  | { action: 'reset-demo' };

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const catalog = await loadCatalog();
    const sinceVersion = req.query.sinceVersion;
    if (sinceVersion !== undefined && Number(sinceVersion) === catalog.version) {
      res.status(200).json({
        upToDate: true,
        version: catalog.version,
        lastUpdatedAt: catalog.lastUpdatedAt,
      });
      return;
    }
    res.setHeader('Cache-Control', 'no-store');
    res.status(200).json(catalog);
    return;
  }

  if (req.method === 'POST') {
    try {
      const payload = req.body as CatalogActionPayload;
      if (payload.action === 'reset-demo') {
        const fresh = createInitialCatalog();
        await saveCatalog(fresh);
        res.status(200).json({ catalog: fresh });
        return;
      }

      const current = await loadCatalog();

      if (payload.action === 'upsert-brand') {
        const result = upsertBrandInCatalog(current, payload.data);
        await saveCatalog(result.catalog);
        res.status(200).json(result);
        return;
      }

      if (payload.action === 'register-company') {
        const result = registerCompanyInCatalog(current, payload.data);
        await saveCatalog(result.catalog);
        res.status(200).json(result);
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
        res.status(200).json(result);
        return;
      }

      res.status(400).json({ error: 'Unsupported action' });
      return;
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Update failed' });
      return;
    }
  }

  res.status(405).send('Method not allowed');
}
