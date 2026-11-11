import type { VercelRequest, VercelResponse } from '@vercel/node';
import {
  applyCompanyFeedItems,
  upsertBrandInCatalog,
  type UpsertBrandInput,
} from '../../src/lib/catalogEngine';
import type { FeedProductItem } from '../../src/types/pharma';
import { loadCatalog, saveCatalog } from '../_lib/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const payload = req.body as {
      companyId?: string;
      product?: Omit<UpsertBrandInput, 'companyId' | 'source'>;
      items?: FeedProductItem[];
    };
    if (!payload?.companyId) {
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
      res.status(200).json({
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
      res.status(200).json({
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
}
