import { NextResponse } from 'next/server';
import { PageState } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = 'appXoUcK68dQwASjF';
const LP_TABLE = 'tbl8KDqGq0Ray1uqS';
const TABS_TABLE = 'tblvecOh3rAGmw3mw';
const DOWNLOADS_TABLE = 'tblbLM827DzjWGjCR';

// ── Airtable REST helper ──────────────────────────────────────────────
async function airtableCreate(tableId: string, fields: Record<string, unknown>) {
  const res = await fetch(`https://api.airtable.com/v0/${BASE_ID}/${tableId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${AIRTABLE_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `Airtable error: ${res.status}`);
  }
  return res.json();
}

// ── Claude formatting system prompt ───────────────────────────────────
const SYSTEM_PROMPT = `You are a data formatting assistant for the Wexoe Page Builder. Your ONLY job is to take user-provided landing page data and return a single JSON object formatted exactly for Airtable's REST API.

## Airtable Schema

### Landing Pages table
Field names (use these EXACTLY as object keys):
- "Name" (string) — use the slug value
- "Slug" (string)
- "H1" (string)
- "Hero Description" (string, long text)
- "Hero Image" (string, URL)
- "Hero CTA Text" (string)
- "Hero CTA URL" (string)
- "Hero CTA2 Text" (string)
- "Hero CTA2 URL" (string)
- "Content H2" (string)
- "Content Text" (string, long text)
- "Content Benefits" (string, long text — one benefit per line, \\n-separated)
- "Sidebar Type" (singleSelect: "case", "calculator", "event", "leadmagnet" or omit)
- "Case Title" (string)
- "Case Description" (string, long text)
- "Case Image" (string, URL)
- "Case Outcomes" (string, long text — one outcome per line, \\n-separated)
- "Case CTA Text" (string)
- "Case CTA URL" (string)
- "Calc Title" (string)
- "Calc HTML" (string, long text)
- "Event Type" (string)
- "Event Title" (string)
- "Event Description" (string, long text)
- "Event Date" (string)
- "Event Location" (string)
- "Event Webhook" (string, URL)
- "Magnet Title" (string)
- "Magnet Format" (string)
- "Magnet Description" (string, long text)
- "Magnet File URL" (string, URL)
- "Magnet Webhook" (string, URL)
- "Contact Name" (string)
- "Contact Title" (string)
- "Contact Email" (string, email)
- "Contact Phone" (string)
- "Contact Image" (string, URL)
- "Contact Quote" (string, long text)
- "Show Content" (boolean/checkbox)
- "Show Sidebar" (boolean/checkbox)
- "Show Tabs" (boolean/checkbox)
- "Show Contact" (boolean/checkbox)
- "Color Main" (string, hex color)
- "Color Secondary" (string, hex color)

### LP Tabs table
- "Name" (string)
- "Order" (number, 1-based)
- "Visa" (boolean, always true)
- "Tab Type" (singleSelect: "textimage", "fullmedia", "faq", "calameo", "downloads", "compare", "steps")
- "TI H2" (string)
- "TI Text" (string, long text)
- "TI Benefits" (string, long text — one benefit per line)
- "TI Image" (string, URL)
- "TI Inverted" (boolean)
- "FM URL" (string, URL)
- "FAQ Items" (string, long text — format: "Q: question\\nA: answer\\n\\nQ: question\\nA: answer")
- "Calameo 1 Title", "Calameo 1 Src" (strings)
- "Calameo 2 Title", "Calameo 2 Src" (strings)
- "Calameo 3 Title", "Calameo 3 Src" (strings)
- "Compare Title" (string)
- "Compare Col A" (string)
- "Compare Col B" (string)
- "Compare Rows" (string, long text — format: "Label | Value A | Value B" per line)
- "Steps Title" (string)
- "Steps" (string, long text — format: "Title | Description" per line)

### LP Downloads table
- "Name" (string)
- "Description" (string, long text)
- "File URL" (string, URL)
- "Button Text" (string — use the fileType value like "PDF")
- "Order" (number, 1-based within its tab)
- "Visa" (boolean, always true)

## Formatting Rules
1. OMIT any field whose value is empty string, null, or undefined — do NOT include empty strings.
2. Boolean fields (Show Content, Show Sidebar, etc.) must ALWAYS be included.
3. If "Content Benefits" or "Case Outcomes" look like a paragraph or comma-separated list, split them into one item per line (\\n-separated).
4. FAQ items must use "Q: question\\nA: answer" format, separated by double newlines.
5. Compare rows must use "Label | Value A | Value B" pipe format, one row per line.
6. Steps must use "Title | Description" pipe format, one step per line.
7. Tab "Order" is 1-based index.
8. Tab "Visa" is always true.
9. Download "Visa" is always true.

## Response Format
Return ONLY a JSON object (no markdown, no explanation, no code fences) with this exact structure:

{
  "landingPage": { ...fields for Landing Pages table... },
  "tabs": [
    {
      "fields": { ...fields for this tab... },
      "downloads": [ { ...fields for each download... } ]
    }
  ]
}

If there are no tabs, "tabs" should be an empty array.
If a tab has no downloads, its "downloads" should be an empty array.
Only include relevant fields for each tab type (e.g., don't include TI fields for an FAQ tab).`;

// ── Build the user message with all frontend data ─────────────────────
function buildUserMessage(state: PageState): string {
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
    caseTitle: state.caseTitle,
    caseDescription: state.caseDescription,
    caseImage: state.caseImage,
    caseOutcomes: state.caseOutcomes,
    caseCta: state.caseCta,
    caseCtaUrl: state.caseCtaUrl,
    calcTitle: state.calcTitle,
    calcHtml: state.calcHtml,
    eventType: state.eventType,
    eventTitle: state.eventTitle,
    eventDescription: state.eventDescription,
    eventDate: state.eventDate,
    eventLocation: state.eventLocation,
    eventWebhook: state.eventWebhook,
    magnetTitle: state.magnetTitle,
    magnetFormat: state.magnetFormat,
    magnetDescription: state.magnetDescription,
    magnetFileUrl: state.magnetFileUrl,
    magnetWebhook: state.magnetWebhook,
    contactName: state.contactName,
    contactTitle: state.contactTitle,
    contactEmail: state.contactEmail,
    contactPhone: state.contactPhone,
    contactImage: state.contactImage,
    contactQuote: state.contactQuote,
    showContent: state.showContent,
    showSidebar: state.showSidebar,
    showTabs: state.showTabs,
    showContact: state.showContact,
    colorMain: state.colorMain,
    colorSecondary: state.colorSecondary,
  };

  const tabs = state.tabs.map((tab, i) => {
    const t: Record<string, unknown> = {
      index: i,
      name: tab.name,
      type: tab.type,
    };

    switch (tab.type) {
      case 'textimage':
        t.tiH2 = tab.tiH2;
        t.tiText = tab.tiText;
        t.tiBenefits = tab.tiBenefits;
        t.tiImage = tab.tiImage;
        t.tiInverted = tab.tiInverted;
        break;
      case 'fullmedia':
        t.fmUrl = tab.fmUrl;
        break;
      case 'faq':
        t.faqItems = tab.faqItems.filter(f => f.question || f.answer);
        break;
      case 'calameo':
        t.calTitle1 = tab.calTitle1; t.calUrl1 = tab.calUrl1;
        t.calTitle2 = tab.calTitle2; t.calUrl2 = tab.calUrl2;
        t.calTitle3 = tab.calTitle3; t.calUrl3 = tab.calUrl3;
        break;
      case 'downloads':
        t.downloads = tab.downloads.filter(d => d.name || d.fileUrl);
        break;
      case 'compare':
        t.compareTitle = tab.compareTitle;
        t.compareColA = tab.compareColA;
        t.compareColB = tab.compareColB;
        t.compareRows = tab.compareRows.filter(r => r.label || r.valueA || r.valueB);
        break;
      case 'steps':
        t.stepsTitle = tab.stepsTitle;
        t.stepsItems = tab.stepsItems.filter(s => s.title || s.description);
        break;
    }

    return t;
  });

  data.tabs = tabs;

  return `Format this landing page data for Airtable. Return ONLY the JSON object, no other text.\n\n${JSON.stringify(data, null, 2)}`;
}

// ── Types for Claude's formatted response ─────────────────────────────
interface FormattedTab {
  fields: Record<string, unknown>;
  downloads: Record<string, unknown>[];
}

interface FormattedResponse {
  landingPage: Record<string, unknown>;
  tabs: FormattedTab[];
}

// ── Main publish handler ──────────────────────────────────────────────
export async function POST(request: Request) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY ej konfigurerad. Ställ in den i Vercel environment variables.' },
      { status: 500 }
    );
  }
  if (!AIRTABLE_API_KEY) {
    return NextResponse.json(
      { error: 'AIRTABLE_API_KEY ej konfigurerad. Ställ in den i Vercel environment variables.' },
      { status: 500 }
    );
  }

  try {
    const state: PageState = await request.json();

    // Validation
    if (!state.slug?.trim()) {
      return NextResponse.json({ error: 'Slug är obligatoriskt' }, { status: 400 });
    }
    if (!state.h1?.trim()) {
      return NextResponse.json({ error: 'H1 (rubrik) är obligatoriskt' }, { status: 400 });
    }

    // ── Step 1: Ask Claude to format the data ───────────────────────
    const userMessage = buildUserMessage(state);

    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!claudeRes.ok) {
      const errData = await claudeRes.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Claude API error: ${claudeRes.status}`);
    }

    const claudeData = await claudeRes.json();

    // Extract text response from Claude
    const textBlock = claudeData.content?.find(
      (b: { type: string }) => b.type === 'text'
    );
    if (!textBlock?.text) {
      throw new Error('Claude returnerade inget svar');
    }

    // Parse Claude's JSON response (strip any accidental markdown fences)
    let jsonText = textBlock.text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }

    let formatted: FormattedResponse;
    try {
      formatted = JSON.parse(jsonText);
    } catch {
      throw new Error(`Claude returnerade ogiltig JSON: ${jsonText.slice(0, 200)}`);
    }

    if (!formatted.landingPage || !Array.isArray(formatted.tabs)) {
      throw new Error('Claude returnerade ett oväntat format');
    }

    // ── Step 2: Write Landing Page to Airtable ──────────────────────
    const lpRecord = await airtableCreate(LP_TABLE, formatted.landingPage);
    const lpId: string = lpRecord.id;

    // ── Step 3: Write Tabs to Airtable (sequentially for order) ─────
    let tabCount = 0;
    let downloadCount = 0;

    for (const tabData of formatted.tabs) {
      // Link tab to landing page
      tabData.fields['Landing Page'] = [lpId];

      const tabRecord = await airtableCreate(TABS_TABLE, tabData.fields);
      tabCount++;

      // ── Step 4: Write Downloads for this tab ────────────────────
      if (tabData.downloads && tabData.downloads.length > 0) {
        for (const dlFields of tabData.downloads) {
          dlFields['Tab'] = [tabRecord.id];
          await airtableCreate(DOWNLOADS_TABLE, dlFields);
          downloadCount++;
        }
      }
    }

    return NextResponse.json({
      success: true,
      recordId: lpId,
      slug: state.slug,
      tabCount,
      downloadCount,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Okänt fel';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
