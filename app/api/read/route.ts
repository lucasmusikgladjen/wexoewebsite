import { NextResponse } from 'next/server';
import { getRecord, listRecords, TABLE_IDS, AirtableRecord } from '@/lib/airtable';
import { pageStateFromRecords } from '@/lib/page-mapper';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'appXoUcK68dQwASjF';
const LP_TABLE_ID = TABLE_IDS.landingPages;

export async function GET(request: Request) {
  if (!AIRTABLE_API_KEY) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'list') {
      // List all landing pages (id, name, slug, h1)
      const url = `https://api.airtable.com/v0/${BASE_ID}/${LP_TABLE_ID}?fields%5B%5D=Name&fields%5B%5D=Slug&fields%5B%5D=H1&sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=asc&pageSize=100`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Airtable error: ${res.status}`);
      }
      const data = await res.json();
      const pages = data.records.map((r: AirtableRecord) => ({
        id: r.id,
        name: (r.fields?.Name as string) || '',
        slug: (r.fields?.Slug as string) || '',
        h1: (r.fields?.H1 as string) || '',
      }));
      return NextResponse.json({ pages });
    }

    if (action === 'get') {
      const recordId = searchParams.get('id');
      if (!recordId) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }

      // Fetch LP record + linked tabs + downloads in parallel where possible
      const lp = await getRecord(AIRTABLE_API_KEY, TABLE_IDS.landingPages, recordId);

      // Fetch linked tabs by record IDs from the LP record (avoids filterByFormula)
      const tabIds = (lp.fields['LP Tabs'] as string[] | undefined) ?? [];
      let tabs: AirtableRecord[] = [];
      if (tabIds.length > 0) {
        const formula = `OR(${tabIds.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
        tabs = await listRecords(AIRTABLE_API_KEY, TABLE_IDS.tabs, {
          filterByFormula: formula,
        });
      }

      // Collect all download IDs across tabs
      const downloadIds = new Set<string>();
      for (const tab of tabs) {
        const ids = (tab.fields['LP Downloads'] as string[] | undefined) ?? [];
        ids.forEach((id) => downloadIds.add(id));
      }

      let downloads: AirtableRecord[] = [];
      if (downloadIds.size > 0) {
        const formula = `OR(${[...downloadIds].map((id) => `RECORD_ID()='${id}'`).join(',')})`;
        downloads = await listRecords(AIRTABLE_API_KEY, TABLE_IDS.downloads, {
          filterByFormula: formula,
        });
      }

      // Group downloads by their parent tab id
      const downloadsByTabId: Record<string, AirtableRecord[]> = {};
      for (const dl of downloads) {
        const tabRefs = (dl.fields['Tab'] as string[] | undefined) ?? [];
        for (const tabId of tabRefs) {
          (downloadsByTabId[tabId] ??= []).push(dl);
        }
      }

      const state = pageStateFromRecords({
        landingPage: lp,
        tabs,
        downloadsByTabId,
      });

      return NextResponse.json({ state });
    }

    return NextResponse.json({ error: 'Unknown action. Use ?action=list or ?action=get&id=recXXX' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
