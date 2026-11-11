import type { Config, Context } from '@netlify/functions';
import { createInitialCatalog } from '../../src/data/seedCatalog';
import {
  applyCompanyFeedItems,
  registerCompanyInCatalog,
  upsertBrandInCatalog,
  type RegisterCompanyInput,
  type UpsertBrandInput,
} from '../../src/lib/catalogEngine';
import type { FeedProductItem } from '../../src/types/pharma';
import { loadCatalog, saveCatalog } from '../lib/blobStore';

type CatalogActionPayload =
  | { action: 'upsert-brand'; data: UpsertBrandInput }
  | { action: 'register-company'; data: RegisterCompanyInput }
  | { action: 'batch-feed'; companyId: string; items: FeedProductItem[] }
  | { action: 'reset-demo' };

export default async (req: Request, _context: Context) => {
  if (req.method === 'GET') {
    const url = new URL(req.url);
    const sinceVersionParam = url.searchParams.get('sinceVersion');
    const catalog = await loadCatalog();

    if (sinceVersionParam !== null && Number(sinceVersionParam) === catalog.version) {
      return Response.json({
        upToDate: true,
        version: catalog.version,
        lastUpdatedAt: catalog.lastUpdatedAt,
      });
    }

    return Response.json(catalog, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const payload = (await req.json()) as CatalogActionPayload;

      if (payload.action === 'reset-demo') {
        const fresh = createInitialCatalog();
        await saveCatalog(fresh);
        return Response.json({ catalog: fresh });
      }

      const current = await loadCatalog();

      if (payload.action === 'upsert-brand') {
        const result = upsertBrandInCatalog(current, payload.data);
        await saveCatalog(result.catalog);
        return Response.json(result, { status: 200 });
      }

      if (payload.action === 'register-company') {
        const result = registerCompanyInCatalog(current, payload.data);
        await saveCatalog(result.catalog);
        return Response.json(result, { status: 200 });
      }

      if (payload.action === 'batch-feed') {
        const result = applyCompanyFeedItems(
          current,
          payload.companyId,
          payload.items,
          'Company Portal',
        );
        await saveCatalog(result.catalog);
        return Response.json(result, { status: 200 });
      }

      return Response.json({ error: 'Unsupported action' }, { status: 400 });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Failed to update catalog' },
        { status: 400 },
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/catalog',
  method: ['GET', 'POST'],
};
