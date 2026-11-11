import type { VercelRequest, VercelResponse } from '@vercel/node';
import { syncAllCompanyFeeds } from './_lib/store.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST' && req.method !== 'GET') {
    res.status(405).send('Method not allowed');
    return;
  }

  try {
    const companyId = (req.body as { companyId?: string } | undefined)?.companyId;
    const result = await syncAllCompanyFeeds(companyId);
    res.status(200).json(result);
  } catch (err) {
    res.status(500).json({ error: err instanceof Error ? err.message : 'Feed sync failed' });
  }
}
