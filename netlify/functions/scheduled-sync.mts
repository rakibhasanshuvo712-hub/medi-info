import type { Config } from '@netlify/functions';
import { syncAllCompanyFeeds } from '../lib/blobStore';

export default async (req: Request) => {
  const body = (await req.json().catch(() => ({}))) as { next_run?: string };
  const result = await syncAllCompanyFeeds();
  console.log(
    `[MedPulse Scheduled Sync] synced=${result.syncedCompanies} updated=${result.updatedProducts} next=${body.next_run ?? 'unknown'}`,
  );
};

export const config: Config = {
  schedule: '*/15 * * * *',
};
