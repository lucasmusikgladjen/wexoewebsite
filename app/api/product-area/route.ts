import { NextResponse } from 'next/server';
import {
  listRecords,
  updateRecord,
  updateRecords,
} from '@/lib/airtable';
import {
  PA_TABLE_IDS,
  productAreaPatchFields,
  productPatchFields,
  solutionPatchFields,
} from '@/lib/product-area-mapper';
import { loadProductAreaState } from '@/lib/product-area-loader';
import { ProductAreaState } from '@/lib/product-area-types';

const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// ─── GET: list or get ──────────────────────────────────────────────────────

export async function GET(request: Request) {
  if (!AIRTABLE_API_KEY) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const action = searchParams.get('action');

  try {
    if (action === 'list') {
      const records = await listRecords(AIRTABLE_API_KEY, PA_TABLE_IDS.productAreas, {
        fields: ['Name', 'Slug', 'H1'],
        sort: [{ field: 'Name', direction: 'asc' }],
      });
      const pages = records.map((r) => ({
        id: r.id,
        name: (r.fields.Name as string) || '',
        slug: (r.fields.Slug as string) || '',
        h1: (r.fields.H1 as string) || '',
      }));
      return NextResponse.json({ pages });
    }

    if (action === 'get') {
      const recordId = searchParams.get('id');
      if (!recordId) {
        return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
      }
      const state = await loadProductAreaState(AIRTABLE_API_KEY, recordId);
      return NextResponse.json({ state });
    }

    return NextResponse.json(
      { error: 'Unknown action. Use ?action=list or ?action=get&id=recXXX' },
      { status: 400 },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── POST: save (update only — v1 doesn't create new PAs) ──────────────────

export async function POST(request: Request) {
  if (!AIRTABLE_API_KEY) {
    return NextResponse.json({ error: 'AIRTABLE_API_KEY not configured' }, { status: 500 });
  }

  try {
    const state: ProductAreaState = await request.json();

    if (!state.recordId) {
      return NextResponse.json(
        { error: 'Product Area save kräver ett existerande recordId (ingen create i v1).' },
        { status: 400 },
      );
    }
    if (!state.slug?.trim()) {
      return NextResponse.json({ error: 'Slug är obligatoriskt' }, { status: 400 });
    }

    // 1. PATCH the Product Area record itself
    await updateRecord(
      AIRTABLE_API_KEY,
      PA_TABLE_IDS.productAreas,
      state.recordId,
      productAreaPatchFields(state),
    );

    // 2. PATCH linked Products (by recordId). Skip any entries missing a
    //    recordId — v1 doesn't support creating new products.
    const productUpdates = state.products
      .filter((p) => p.recordId)
      .map((p) => ({
        id: p.recordId,
        fields: productPatchFields(p),
      }));
    if (productUpdates.length > 0) {
      await updateRecords(AIRTABLE_API_KEY, PA_TABLE_IDS.products, productUpdates);
    }

    // 3. PATCH linked Solutions (by recordId)
    const solutionUpdates = state.solutions
      .filter((s) => s.recordId)
      .map((s) => ({
        id: s.recordId,
        fields: solutionPatchFields(s),
      }));
    if (solutionUpdates.length > 0) {
      await updateRecords(AIRTABLE_API_KEY, PA_TABLE_IDS.solutions, solutionUpdates);
    }

    return NextResponse.json({
      success: true,
      recordId: state.recordId,
      slug: state.slug,
      productsUpdated: productUpdates.length,
      solutionsUpdated: solutionUpdates.length,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel';
    console.error('[product-area:save] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
