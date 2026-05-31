import { getRecord, listRecords, AirtableRecord } from './airtable';
import { PA_TABLE_IDS, PA_BASE_ID, productPageStateFromRecords } from './product-page-mapper';
import { ProductPageState, Division } from './product-page-types';

/** Fetch all Divisions (tiny table — no pagination concerns).
 *  Lever i core_divisions i Wexoe NY. */
export async function loadDivisions(apiKey: string): Promise<Division[]> {
  const records = await listRecords(apiKey, PA_TABLE_IDS.divisions, {
    fields: ['name'],
    sort: [{ field: 'name', direction: 'asc' }],
    baseId: PA_BASE_ID,
  });
  return records.map((r) => ({
    id: r.id,
    name: (r.fields.name as string) || '',
  }));
}

/** Fetches a Product Page record plus all linked Products, Articles, Sections,
 *  and Solutions, and returns a fully-populated ProductPageState.
 *
 *  Sections är nya sub-records i cms_product_page_sections (post-migration);
 *  PA-recordet pekar på dem via `section_ids` istället för det gamla
 *  Normal 1-4-pseudo-array-fältet. */
export async function loadProductPageState(
  apiKey: string,
  recordId: string,
): Promise<ProductPageState> {
  const pa = await getRecord(apiKey, PA_TABLE_IDS.productPages, recordId, PA_BASE_ID);

  const productIds = (pa.fields['product_ids'] as string[] | undefined) ?? [];
  const solutionIds = (pa.fields['solution_ids'] as string[] | undefined) ?? [];
  const sectionIds = (pa.fields['section_ids'] as string[] | undefined) ?? [];

  let products: AirtableRecord[] = [];
  if (productIds.length > 0) {
    const formula = `OR(${productIds.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    products = await listRecords(apiKey, PA_TABLE_IDS.products, {
      filterByFormula: formula,
      baseId: PA_BASE_ID,
    });
  }

  const articleIds = new Set<string>();
  for (const p of products) {
    const ids = (p.fields['article_ids'] as string[] | undefined) ?? [];
    ids.forEach((id) => articleIds.add(id));
  }

  let articles: AirtableRecord[] = [];
  if (articleIds.size > 0) {
    const formula = `OR(${[...articleIds].map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    articles = await listRecords(apiKey, PA_TABLE_IDS.articles, {
      filterByFormula: formula,
      baseId: PA_BASE_ID,
    });
  }

  let solutions: AirtableRecord[] = [];
  if (solutionIds.length > 0) {
    const formula = `OR(${solutionIds.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    solutions = await listRecords(apiKey, PA_TABLE_IDS.solutions, {
      filterByFormula: formula,
      baseId: PA_BASE_ID,
    });
  }

  let sections: AirtableRecord[] = [];
  if (sectionIds.length > 0) {
    const formula = `OR(${sectionIds.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    sections = await listRecords(apiKey, PA_TABLE_IDS.productPageSections, {
      filterByFormula: formula,
      baseId: PA_BASE_ID,
    });
  }

  return productPageStateFromRecords({
    productPage: pa,
    products,
    articles,
    solutions,
    sections,
  });
}
