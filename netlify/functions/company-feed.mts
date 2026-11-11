import type { Config, Context } from '@netlify/functions';
import type { FeedProductItem } from '../../src/types/pharma';
import { loadCatalog, loadCompanyFeed, saveCompanyFeed } from '../lib/blobStore';

export default async (req: Request, context: Context) => {
  const companyId = context.params.companyId;
  if (!companyId) {
    return Response.json({ error: 'companyId is required' }, { status: 400 });
  }

  if (req.method === 'GET') {
    const customFeed = await loadCompanyFeed(companyId);
    if (customFeed) {
      return Response.json({
        companyId,
        source: 'live-online-feed',
        items: customFeed,
      });
    }

    const catalog = await loadCatalog();
    const company = catalog.companies.find((c) => c.id === companyId);
    if (!company) {
      return Response.json({ error: 'Company not found' }, { status: 404 });
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

    return Response.json({
      companyId,
      companyName: company.name,
      source: 'catalog-derived-feed',
      items,
    });
  }

  if (req.method === 'POST') {
    try {
      const body = (await req.json()) as { items?: FeedProductItem[] } | FeedProductItem[];
      const items = Array.isArray(body) ? body : body.items;
      if (!Array.isArray(items)) {
        return Response.json({ error: 'Expected an items array' }, { status: 400 });
      }
      await saveCompanyFeed(companyId, items);
      return Response.json({
        ok: true,
        companyId,
        itemCount: items.length,
        updatedAt: new Date().toISOString(),
      });
    } catch (err) {
      return Response.json(
        { error: err instanceof Error ? err.message : 'Invalid feed payload' },
        { status: 400 },
      );
    }
  }

  return new Response('Method not allowed', { status: 405 });
};

export const config: Config = {
  path: '/api/company-feed/:companyId',
  method: ['GET', 'POST'],
};
