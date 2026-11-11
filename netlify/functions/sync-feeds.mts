import type { Config, Context } from '@netlify/functions';
import { syncAllCompanyFeeds } from '../lib/blobStore';

export default async (req: Request, _context: Context) => {
  try {
    let companyId: string | undefined;
    if (req.method === 'POST') {
      const text = await req.text();
      if (text) {
        const parsed = JSON.parse(text) as { companyId?: string };
        companyId = parsed.companyId;
      }
    }
    const result = await syncAllCompanyFeeds(companyId);
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : 'Feed sync failed' },
      { status: 500 },
    );
  }
};

export const config: Config = {
  path: '/api/sync-feeds',
  method: ['POST'],
};
