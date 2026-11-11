import type { Config, Context } from '@netlify/functions';
import {
  applyCompanyFeedItems,
  upsertBrandInCatalog,
  type UpsertBrandInput,
} from '../../src/lib/catalogEngine';
import type { FeedProductItem } from '../../src/types/pharma';
import { loadCatalog, saveCatalog } from '../lib/blobStore';

interface WebhookPayload {
  companyId: string;
  product?: Omit<UpsertBrandInput, 'companyId' | 'source'>;
  items?: FeedProductItem[];
}

export default async (req: Request, _context: Context) => {
  try {
    const payload = (await req.json()) as WebhookPayload;
    if (!payload.companyId) {
      return Response.json({ error: 'companyId is required' }, { status: 400 });
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
      return Response.json({
        ok: true,
        appliedCount: result.appliedCount,
        version: result.catalog.version,
        logs: result.logs,
      });
    }

    if (payload.product) {
      const result = upsertBrandInCatalog(current, {
        ...payload.product,
        companyId: payload.companyId,
        source: 'Webhook API',
      });
      await saveCatalog(result.catalog);
      return Response.json({
        ok: true,
        brand: result.brand,
        version: result.catalog.version,
        log: result.log,
      });
    }

    return Response.json(
      { error: 'Provide either "product" or "items" in webhook payload' },
      { status: 400 },
    );
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Webhook processing failed' },
      { status: 400 },
    );
  }
};

export const config: Config = {
  path: '/api/webhook/company-update',
  method: ['POST'],
};
