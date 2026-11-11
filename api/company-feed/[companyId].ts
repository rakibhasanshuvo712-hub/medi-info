import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { FeedProductItem } from '../../src/types/pharma';
import { loadCatalog, loadFeeds, saveFeeds } from '../_lib/store';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const rawId = req.query.companyId;
  const companyId = Array.isArray(rawId) ? rawId[0] : rawId;
  if (!companyId) {
    res.status(400).json({ error: 'companyId is required' });
    return;
  }

  if (req.method === 'GET') {
    const feeds = await loadFeeds();
    if (feeds[companyId]) {
      res.status(200).json({ companyId, source: 'live-online-feed', items: feeds[companyId] });
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

    res.status(200).json({
      companyId,
      companyName: company.name,
      source: 'catalog-derived-feed',
      items,
    });
    return;
  }

  if (req.method === 'POST') {
    const body = req.body as { items?: FeedProductItem[] } | FeedProductItem[];
    const items = Array.isArray(body) ? body : body?.items;
    if (!Array.isArray(items)) {
      res.status(400).json({ error: 'Expected an items array' });
      return;
    }
    const feeds = await loadFeeds();
    feeds[companyId] = items;
    await saveFeeds(feeds);
    res.status(200).json({
      ok: true,
      companyId,
      itemCount: items.length,
      updatedAt: new Date().toISOString(),
    });
    return;
  }

  res.status(405).send('Method not allowed');
}
