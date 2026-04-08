import { NextResponse } from 'next/server';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'appXoUcK68dQwASjF';
const LP_TABLE_ID = 'tbl8KDqGq0Ray1uqS';

export async function GET(request: Request) {
  if (!AIRTABLE_API_KEY) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'list') {
      // List all landing pages (name + slug)
      const url = `https://api.airtable.com/v0/${BASE_ID}/${LP_TABLE_ID}?fields%5B%5D=Name&fields%5B%5D=Slug&fields%5B%5D=H1&sort%5B0%5D%5Bfield%5D=Name&sort%5B0%5D%5Bdirection%5D=asc`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Airtable error: ${res.status}`);
      }
      const data = await res.json();
      const pages = data.records.map((r: Record<string, unknown>) => ({
        id: r.id,
        name: (r.fields as Record<string, string>)?.Name || '',
        slug: (r.fields as Record<string, string>)?.Slug || '',
        h1: (r.fields as Record<string, string>)?.H1 || '',
      }));
      return NextResponse.json({ pages });
    }

    if (action === 'get') {
      const recordId = searchParams.get('id');
      if (!recordId) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }
      const url = `https://api.airtable.com/v0/${BASE_ID}/${LP_TABLE_ID}/${recordId}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` },
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Airtable error: ${res.status}`);
      }
      const record = await res.json();
      return NextResponse.json({ record });
    }

    return NextResponse.json({ error: 'Unknown action. Use ?action=list or ?action=get&id=recXXX' }, { status: 400 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
