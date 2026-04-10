import { NextResponse } from 'next/server';
import { readFileSync } from 'fs';
import { join } from 'path';
import { PageState } from '@/lib/types';
import {
  createRecord,
  createRecords,
  updateRecord,
  updateRecords,
  deleteRecords,
  getRecord,
  TABLE_IDS,
  AirtableRecord,
} from '@/lib/airtable';
import {
  landingPagePatchFields,
  tabFields,
  tabPatchFields,
  downloadFields,
} from '@/lib/page-mapper';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;

// ── Load Airtable schema once at module level ───────────────────────────
const SCHEMA = readFileSync(
  join(process.cwd(), 'lib', 'airtable-schema.md'),
  'utf-8',
);

// ── Build the user-data payload that Claude will transform ──────────────
function buildDataPayload(state: PageState): string {
  const tabsData = state.tabs.map((tab, i) => {
    const base: Record<string, unknown> = {
      index: i + 1,
      name: tab.name,
      type: tab.type,
    };

    switch (tab.type) {
      case 'textimage':
        Object.assign(base, {
          tiH2: tab.tiH2,
          tiText: tab.tiText,
          tiBenefits: tab.tiBenefits,
          tiImage: tab.tiImage,
          tiInverted: tab.tiInverted,
        });
        break;
      case 'fullmedia':
        base.fmUrl = tab.fmUrl;
        break;
      case 'faq':
        base.faqItems = tab.faqItems
          .filter((f) => f.question || f.answer)
          .map((f) => ({ q: f.question, a: f.answer }));
        break;
      case 'calameo':
        Object.assign(base, {
          calTitle1: tab.calTitle1, calUrl1: tab.calUrl1,
          calTitle2: tab.calTitle2, calUrl2: tab.calUrl2,
          calTitle3: tab.calTitle3, calUrl3: tab.calUrl3,
        });
        break;
      case 'downloads':
        base.downloads = tab.downloads
          .filter((d) => d.name || d.fileUrl)
          .map((d) => ({
            name: d.name,
            description: d.description,
            fileUrl: d.fileUrl,
            fileType: d.fileType,
          }));
        break;
      case 'compare':
        Object.assign(base, {
          compareTitle: tab.compareTitle,
          compareColA: tab.compareColA,
          compareColB: tab.compareColB,
          compareRows: tab.compareRows
            .filter((r) => r.label || r.valueA || r.valueB)
            .map((r) => ({ label: r.label, a: r.valueA, b: r.valueB })),
        });
        break;
      case 'steps':
        Object.assign(base, {
          stepsTitle: tab.stepsTitle,
          stepsItems: tab.stepsItems
            .filter((s) => s.title || s.description)
            .map((s) => ({ title: s.title, description: s.description })),
        });
        break;
    }

    return base;
  });

  const data: Record<string, unknown> = {
    slug: state.slug,
    h1: state.h1,
    heroDescription: state.heroDescription,
    heroImage: state.heroImage,
    heroCta1Text: state.heroCta1Text,
    heroCta1Url: state.heroCta1Url,
    heroCta2Text: state.heroCta2Text,
    heroCta2Url: state.heroCta2Url,
    contentH2: state.contentH2,
    contentText: state.contentText,
    contentBenefits: state.contentBenefits,
    sidebarType: state.sidebarType,
    contactName: state.contactName,
    contactTitle: state.contactTitle,
    contactEmail: state.contactEmail,
    contactPhone: state.contactPhone,
    contactImage: state.contactImage,
    contactQuote: state.contactQuote,
    colorMain: state.colorMain,
    colorSecondary: state.colorSecondary,
    showContent: state.showContent,
    showSidebar: state.showSidebar,
    showTabs: state.showTabs,
    showContact: state.showContact,
  };

  // Include sidebar-specific fields
  if (state.sidebarType === 'case') {
    Object.assign(data, {
      caseTitle: state.caseTitle,
      caseDescription: state.caseDescription,
      caseImage: state.caseImage,
      caseOutcomes: state.caseOutcomes,
      caseCta: state.caseCta,
      caseCtaUrl: state.caseCtaUrl,
    });
  } else if (state.sidebarType === 'event') {
    Object.assign(data, {
      eventType: state.eventType,
      eventTitle: state.eventTitle,
      eventDescription: state.eventDescription,
      eventDate: state.eventDate,
      eventLocation: state.eventLocation,
      eventWebhook: state.eventWebhook,
    });
  } else if (state.sidebarType === 'leadmagnet') {
    Object.assign(data, {
      magnetTitle: state.magnetTitle,
      magnetFormat: state.magnetFormat,
      magnetDescription: state.magnetDescription,
      magnetFileUrl: state.magnetFileUrl,
      magnetWebhook: state.magnetWebhook,
    });
  } else if (state.sidebarType === 'calculator') {
    Object.assign(data, {
      calcTitle: state.calcTitle,
      calcHtml: state.calcHtml,
    });
  }

  if (tabsData.length > 0) {
    data.tabs = tabsData;
  }

  return JSON.stringify(data, null, 2);
}

// ── Expected JSON output shape from Claude ──────────────────────────────
interface TransformResult {
  landingPage: Record<string, unknown>;
  tabs: Array<Record<string, unknown>>;
  downloads: Array<{
    tabIndex: number;
    fields: Record<string, unknown>;
  }>;
}

interface DownloadValidationFailure {
  index: number;
  tabIndex: unknown;
}

// ── Main publish handler ────────────────────────────────────────────────
export async function POST(request: Request) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ej konfigurerad.' },
      { status: 500 },
    );
  }
  if (!AIRTABLE_API_KEY) {
    return NextResponse.json(
      { error: 'AIRTABLE_API_KEY ej konfigurerad.' },
      { status: 500 },
    );
  }

  try {
    const state: PageState = await request.json();

    if (!state.slug?.trim()) {
      return NextResponse.json({ error: 'Slug är obligatoriskt' }, { status: 400 });
    }
    if (!state.h1?.trim()) {
      return NextResponse.json({ error: 'H1 (rubrik) är obligatoriskt' }, { status: 400 });
    }

    // ── Update path: deterministic diff against existing Airtable records ─
    if (state.recordId) {
      const result = await updateExistingPage(AIRTABLE_API_KEY, state);
      return NextResponse.json(result);
    }

    const dataPayload = buildDataPayload(state);

    // ── Step 1: Claude transforms data to Airtable-ready JSON ───────
    const claudeResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: `Du är en datatransformerare. Du tar emot landing page-data i JSON-format och konverterar den till Airtable-redo JSON enligt schemat nedan.

${SCHEMA}

Svara med ENBART valid JSON (ingen markdown, ingen förklaring). Formatet:

{
  "landingPage": { <fältnamn>: <värde>, ... },
  "tabs": [ { <fältnamn>: <värde>, ... }, ... ],
  "downloads": [ { "tabIndex": <0-baserat index i tabs-arrayen>, "fields": { <fältnamn>: <värde>, ... } }, ... ]
}

Regler:
- Använd exakta Airtable-fältnamn från schemat ovan
- Utelämna fält med tomt värde (tomma strängar, null)
- Inkludera ALLTID boolean-fält (Show Content, Show Sidebar, etc.)
- Tabs: inkludera Name, Tab Type, Order (1-baserat), Visa (alltid true), och typ-specifika fält
- Tabs: inkludera INTE "Landing Page"-fältet — det läggs till av backend
- Downloads: inkludera INTE "Tab"-fältet — det läggs till av backend
- Downloads: inkludera Visa (alltid true)
- Applicera formateringsreglerna (benefits-splitting, FAQ-format, pipe-format, etc.)`,
            cache_control: { type: 'ephemeral' },
          },
        ],
        messages: [
          {
            role: 'user',
            content: `Transformera denna data till Airtable-format:\n\n${dataPayload}`,
          },
        ],
      }),
    });

    if (!claudeResponse.ok) {
      const errData = await claudeResponse.json().catch(() => ({}));
      throw new Error(
        errData.error?.message || `Claude API error: ${claudeResponse.status}`,
      );
    }

    const claudeData = await claudeResponse.json();

    // ── Token tracking ──────────────────────────────────────────────
    const INPUT_PRICE_PER_M = 3.0;
    const OUTPUT_PRICE_PER_M = 15.0;

    const usage = claudeData.usage ?? {};
    const inputTokens = usage.input_tokens ?? 0;
    const outputTokens = usage.output_tokens ?? 0;
    const cacheWriteTokens = usage.cache_creation_input_tokens ?? 0;
    const cacheReadTokens = usage.cache_read_input_tokens ?? 0;
    const totalTokens = inputTokens + outputTokens;
    const estimatedCostUsd =
      (inputTokens / 1_000_000) * INPUT_PRICE_PER_M +
      (outputTokens / 1_000_000) * OUTPUT_PRICE_PER_M;

    // ── Parse Claude's JSON response ────────────────────────────────
    let responseText = '';
    if (claudeData.content && Array.isArray(claudeData.content)) {
      for (const block of claudeData.content) {
        if (block.type === 'text') responseText += block.text;
      }
    }

    // Strip markdown code fences if Claude added them
    responseText = responseText
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    let transformed: TransformResult;
    try {
      transformed = JSON.parse(responseText);
    } catch {
      console.error('[publish] Claude returned invalid JSON:', responseText);
      throw new Error('Claude returnerade ogiltig JSON. Försök igen.');
    }

    // ── Step 2: Create Landing Page via Airtable REST API ───────────
    const lpRecord = await createRecord(
      AIRTABLE_API_KEY,
      TABLE_IDS.landingPages,
      transformed.landingPage,
    );

    // ── Step 3: Create Tabs (linked to Landing Page) ────────────────
    let tabRecords: Array<{ id: string; fields: Record<string, unknown> }> = [];
    if (transformed.tabs && transformed.tabs.length > 0) {
      const tabPayloads = transformed.tabs.map((tab) => ({
        fields: {
          ...tab,
          'Landing Page': [lpRecord.id],
        },
      }));
      tabRecords = await createRecords(
        AIRTABLE_API_KEY,
        TABLE_IDS.tabs,
        tabPayloads,
      );
    }

    // ── Step 4: Create Downloads (linked to Tabs) ───────────────────
    let downloadCount = 0;
    if (transformed.downloads && transformed.downloads.length > 0) {
      const maxTabIndex = tabRecords.length - 1;
      const invalidDownloads: DownloadValidationFailure[] = transformed.downloads
        .map((dl, index) => ({
          index,
          tabIndex: dl.tabIndex,
          isValid:
            Number.isInteger(dl.tabIndex) &&
            dl.tabIndex >= 0 &&
            dl.tabIndex <= maxTabIndex,
        }))
        .filter((item) => !item.isValid)
        .map(({ index, tabIndex }) => ({ index, tabIndex }));

      if (invalidDownloads.length > 0) {
        console.error(
          '[publish] Download validation failed: invalid tabIndex reference',
          JSON.stringify({
            recordId: lpRecord.id,
            tabCount: tabRecords.length,
            downloadCount: transformed.downloads.length,
            invalidDownloads,
          }),
        );
        return NextResponse.json(
          {
            error: 'Ogiltig download-referens: tabIndex måste vara ett heltal inom giltigt tab-intervall.',
            validation: {
              recordId: lpRecord.id,
              tabCount: tabRecords.length,
              validTabIndexRange: `0..${maxTabIndex}`,
              invalidDownloads,
            },
          },
          { status: 400 },
        );
      }

      const dlPayloads = transformed.downloads.map((dl, index) => {
        const linkedTabIds = [tabRecords[dl.tabIndex]?.id].filter(
          (id): id is string => Boolean(id),
        );

        if (linkedTabIds.length !== 1) {
          console.error(
            '[publish] Download invariant violated: Tab linked field must contain exactly one record ID',
            JSON.stringify({
              recordId: lpRecord.id,
              downloadIndex: index,
              tabIndex: dl.tabIndex,
              tabCount: tabRecords.length,
              linkedTabIdsCount: linkedTabIds.length,
            }),
          );
          throw new Error(
            `Invariant violation for download index ${index}: expected exactly one Tab link, got ${linkedTabIds.length}`,
          );
        }

        return {
        fields: {
          ...dl.fields,
          'Tab': linkedTabIds,
        },
        };
      });
      const dlRecords = await createRecords(
        AIRTABLE_API_KEY,
        TABLE_IDS.downloads,
        dlPayloads,
      );
      downloadCount = dlRecords.length;
    }

    const tokenUsage = {
      inputTokens,
      outputTokens,
      cacheWriteTokens,
      cacheReadTokens,
      totalTokens,
      estimatedCostUsd: parseFloat(estimatedCostUsd.toFixed(4)),
    };

    console.log('[publish] Token usage:', JSON.stringify(tokenUsage, null, 2));

    return NextResponse.json({
      success: true,
      recordId: lpRecord.id,
      slug: state.slug,
      tabCount: tabRecords.length,
      downloadCount,
      tokenUsage,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel';
    console.error('[publish] Error:', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// ─── Update flow: deterministic diff (no Claude) ───────────────────────────
async function updateExistingPage(apiKey: string, state: PageState) {
  if (!state.recordId) throw new Error('updateExistingPage called without recordId');

  // 1. Read the current LP record so we can determine which tabs/downloads
  //    currently exist (and need to be diffed against the incoming state).
  const lp = await getRecord(apiKey, TABLE_IDS.landingPages, state.recordId);
  const existingTabIds: string[] = (lp.fields['LP Tabs'] as string[] | undefined) ?? [];

  // Fetch existing tab records to know their downloads
  let existingTabs: AirtableRecord[] = [];
  if (existingTabIds.length > 0) {
    const formula = `OR(${existingTabIds.map((id) => `RECORD_ID()='${id}'`).join(',')})`;
    const url = new URL(`https://api.airtable.com/v0/appXoUcK68dQwASjF/${TABLE_IDS.tabs}`);
    url.searchParams.set('filterByFormula', formula);
    url.searchParams.set('pageSize', '100');
    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Airtable error: ${res.status}`);
    }
    const data = await res.json();
    existingTabs = data.records;
  }

  const existingTabsById = new Map(existingTabs.map((t) => [t.id, t]));

  // 2. PATCH the Landing Page record itself.
  await updateRecord(
    apiKey,
    TABLE_IDS.landingPages,
    state.recordId,
    landingPagePatchFields(state),
  );

  // 3. Diff tabs.
  //    - Tabs in state with a recordId that matches existing → PATCH
  //    - Tabs in state without recordId (or stale) → CREATE
  //    - Existing tabs not referenced by state → DELETE (cascades to downloads)
  const stateTabRecordIds = new Set(
    state.tabs.map((t) => t.recordId).filter((id): id is string => !!id),
  );

  const tabsToPatch: Array<{ id: string; fields: Record<string, unknown>; index: number }> = [];
  const tabsToCreate: Array<{ stateIndex: number; fields: Record<string, unknown> }> = [];

  state.tabs.forEach((tab, i) => {
    const order = i + 1;
    if (tab.recordId && existingTabsById.has(tab.recordId)) {
      tabsToPatch.push({
        id: tab.recordId,
        fields: tabPatchFields(tab, order),
        index: i,
      });
    } else {
      tabsToCreate.push({
        stateIndex: i,
        fields: { ...tabFields(tab, order), 'Landing Page': [state.recordId!] },
      });
    }
  });

  const tabIdsToDelete = existingTabIds.filter((id) => !stateTabRecordIds.has(id));

  // Delete first to free up the link slots, then patch, then create.
  // (Order doesn't actually matter for Airtable correctness — just stays clean.)
  if (tabIdsToDelete.length > 0) {
    await deleteRecords(apiKey, TABLE_IDS.tabs, tabIdsToDelete);
  }

  if (tabsToPatch.length > 0) {
    await updateRecords(
      apiKey,
      TABLE_IDS.tabs,
      tabsToPatch.map(({ id, fields }) => ({ id, fields })),
    );
  }

  // Map state tab index → final Airtable record ID (existing or freshly created)
  const tabRecordIdByStateIndex: Record<number, string> = {};
  tabsToPatch.forEach(({ index, id }) => { tabRecordIdByStateIndex[index] = id; });

  if (tabsToCreate.length > 0) {
    const created = await createRecords(
      apiKey,
      TABLE_IDS.tabs,
      tabsToCreate.map((t) => ({ fields: t.fields })),
    );
    tabsToCreate.forEach((t, i) => {
      tabRecordIdByStateIndex[t.stateIndex] = created[i].id;
    });
  }

  // 4. Diff downloads. Each tab has its own download set.
  //    Need existing download record IDs per tab — those came back on the
  //    existing tab records via the "LP Downloads" linked field.
  let downloadsCreated = 0;
  let downloadsUpdated = 0;
  let downloadsDeleted = 0;

  for (let i = 0; i < state.tabs.length; i++) {
    const tab = state.tabs[i];
    const tabRecordId = tabRecordIdByStateIndex[i];
    if (!tabRecordId) continue;

    // Existing download IDs for this tab (only if it's a previously-existing tab)
    const existingTabRecord = tab.recordId ? existingTabsById.get(tab.recordId) : undefined;
    const existingDlIds: string[] =
      (existingTabRecord?.fields['LP Downloads'] as string[] | undefined) ?? [];

    const stateDlRecordIds = new Set(
      tab.downloads.map((d) => d.recordId).filter((id): id is string => !!id),
    );

    const dlToPatch: Array<{ id: string; fields: Record<string, unknown> }> = [];
    const dlToCreate: Array<{ fields: Record<string, unknown> }> = [];

    tab.downloads.forEach((dl, dlIndex) => {
      const order = dlIndex + 1;
      const fields = downloadFields(dl, order);
      if (dl.recordId && existingDlIds.includes(dl.recordId)) {
        dlToPatch.push({ id: dl.recordId, fields });
      } else {
        dlToCreate.push({
          fields: { ...fields, Tab: [tabRecordId] },
        });
      }
    });

    const dlToDelete = existingDlIds.filter((id) => !stateDlRecordIds.has(id));

    if (dlToDelete.length > 0) {
      await deleteRecords(apiKey, TABLE_IDS.downloads, dlToDelete);
      downloadsDeleted += dlToDelete.length;
    }
    if (dlToPatch.length > 0) {
      await updateRecords(apiKey, TABLE_IDS.downloads, dlToPatch);
      downloadsUpdated += dlToPatch.length;
    }
    if (dlToCreate.length > 0) {
      await createRecords(apiKey, TABLE_IDS.downloads, dlToCreate);
      downloadsCreated += dlToCreate.length;
    }
  }

  return {
    success: true,
    mode: 'update' as const,
    recordId: state.recordId,
    slug: state.slug,
    tabCount: state.tabs.length,
    tabsCreated: tabsToCreate.length,
    tabsUpdated: tabsToPatch.length,
    tabsDeleted: tabIdsToDelete.length,
    downloadsCreated,
    downloadsUpdated,
    downloadsDeleted,
  };
}
