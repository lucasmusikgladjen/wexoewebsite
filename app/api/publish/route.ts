import { NextResponse } from 'next/server';
import { PageState } from '@/lib/types';

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

function buildPublishPrompt(state: PageState): string {
  const tabsJson = state.tabs.map((tab, i) => ({
    index: i + 1,
    name: tab.name,
    type: tab.type,
    ...(tab.type === 'textimage' && {
      tiH2: tab.tiH2,
      tiText: tab.tiText,
      tiBenefits: tab.tiBenefits,
      tiImage: tab.tiImage,
      tiInverted: tab.tiInverted,
    }),
    ...(tab.type === 'fullmedia' && { fmUrl: tab.fmUrl }),
    ...(tab.type === 'faq' && { faqContent: tab.faqContent }),
    ...(tab.type === 'calameo' && {
      calTitle1: tab.calTitle1, calUrl1: tab.calUrl1,
      calTitle2: tab.calTitle2, calUrl2: tab.calUrl2,
      calTitle3: tab.calTitle3, calUrl3: tab.calUrl3,
    }),
    ...(tab.type === 'downloads' && { downloads: tab.downloads }),
    ...(tab.type === 'compare' && {
      compareTitle: tab.compareTitle,
      compareColA: tab.compareColA,
      compareColB: tab.compareColB,
      compareRows: tab.compareRows,
    }),
    ...(tab.type === 'steps' && {
      stepsTitle: tab.stepsTitle,
      stepsRows: tab.stepsRows,
    }),
  }));

  return `Du ska skapa en landing page i Airtable. Följ instruktionerna exakt.

Base ID: appXoUcK68dQwASjF
Landing Pages table ID: tbl8KDqGq0Ray1uqS
LP Tabs table ID: tblvecOh3rAGmw3mw
LP Downloads table ID: tblbLM827DzjWGjCR

## Steg 1: Skapa Landing Page record

Skapa EN record i Landing Pages-tabellen med följande data. Använd fältnamn (inte fält-ID). Utelämna fält som har tomt värde.

Landing Page data:
- Name: "${state.slug}"
- Slug: "${state.slug}"
- H1: "${state.h1}"
- Hero Description: "${state.heroDescription}"
- Hero Image: "${state.heroImage}"
- Hero CTA 1 Text: "${state.heroCta1Text}"
- Hero CTA 1 URL: "${state.heroCta1Url}"
- Hero CTA 2 Text: "${state.heroCta2Text}"
- Hero CTA 2 URL: "${state.heroCta2Url}"
- Content H2: "${state.contentH2}"
- Content Text: ${JSON.stringify(state.contentText)}
- Content Benefits: ${JSON.stringify(state.contentBenefits)}
- Sidebar Type: "${state.sidebarType}"
${state.sidebarType === 'case' ? `- Case Title: "${state.caseTitle}"
- Case Description: "${state.caseDescription}"
- Case Image: "${state.caseImage}"
- Case Outcomes: ${JSON.stringify(state.caseOutcomes)}
- Case CTA: "${state.caseCta}"
- Case CTA URL: "${state.caseCtaUrl}"` : ''}
${state.sidebarType === 'event' ? `- Event Type: "${state.eventType}"
- Event Title: "${state.eventTitle}"
- Event Description: "${state.eventDescription}"
- Event Date: "${state.eventDate}"
- Event Location: "${state.eventLocation}"
- Event Webhook: "${state.eventWebhook}"` : ''}
${state.sidebarType === 'leadmagnet' ? `- Magnet Title: "${state.magnetTitle}"
- Magnet Format: "${state.magnetFormat}"
- Magnet Description: "${state.magnetDescription}"
- Magnet File URL: "${state.magnetFileUrl}"
- Magnet Webhook: "${state.magnetWebhook}"` : ''}
${state.sidebarType === 'calculator' ? `- Calc Title: "${state.calcTitle}"
- Calc HTML: ${JSON.stringify(state.calcHtml)}` : ''}
- Contact Name: "${state.contactName}"
- Contact Title: "${state.contactTitle}"
- Contact Email: "${state.contactEmail}"
- Contact Phone: "${state.contactPhone}"
- Contact Image: "${state.contactImage}"
- Contact Quote: "${state.contactQuote}"
- Color Main: "${state.colorMain}"
- Color Secondary: "${state.colorSecondary}"
- Show Content: ${state.showContent}
- Show Sidebar: ${state.showSidebar}
- Show Tabs: ${state.showTabs}
- Show Contact: ${state.showContact}

## Steg 2: Skapa Tabs

${state.tabs.length === 0 ? 'Inga tabs att skapa.' : `Skapa ${state.tabs.length} records i LP Tabs-tabellen. VARJE tab MÅSTE ha en linked record till Landing Page-recordet (fältet "Landing Page").

Tabs data:
${JSON.stringify(tabsJson, null, 2)}
`}

## Steg 3: Skapa Downloads

${state.tabs.some(t => t.type === 'downloads' && t.downloads.length > 0) ?
  `Skapa download-records i LP Downloads-tabellen, länkade till rätt tab via "LP Tab"-fältet.` :
  'Inga downloads att skapa.'}

## Formatregler (VIKTIGT)
- Om benefits/outcomes ser ut som en paragraf, splitta till en benefit per rad (\\n-separerad)
- Om FAQ inte har Q:/A:-prefix, lägg till det
- Om jämförelserader inte använder pipe-format (Label | Värde A | Värde B), konvertera dem
- Om steg inte använder pipe-format (Rubrik | Beskrivning), konvertera dem
- Utelämna helt tomma fält — skicka inte tomma strängar till Airtable

## Output
Svara med en sammanfattning av vad du skapade:
- Landing Page record ID
- Antal tabs skapade
- Antal downloads skapade
- Eventuella formateringskorrigeringar du gjorde`;
}

export async function POST(request: Request) {
  if (!ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: 'ANTHROPIC_API_KEY not configured. Set it in environment variables.' },
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

    const prompt = buildPublishPrompt(state);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [{ role: 'user', content: prompt }],
        mcp_servers: [
          {
            type: 'url',
            url: 'https://mcp.airtable.com/mcp',
            name: 'airtable-mcp',
          },
        ],
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      const errMsg =
        errData.error?.message || `Claude API error: ${response.status}`;
      throw new Error(errMsg);
    }

    const data = await response.json();

    // Extract record ID from MCP tool results
    let recordId: string | null = null;
    let tabCount = 0;

    if (data.content && Array.isArray(data.content)) {
      for (const block of data.content) {
        // Look for record IDs in mcp_tool_result blocks
        if (block.type === 'mcp_tool_result' && block.content) {
          const contentStr = typeof block.content === 'string'
            ? block.content
            : JSON.stringify(block.content);

          // Try to extract LP record ID (first record created)
          const recMatch = contentStr.match(/"id"\s*:\s*"(rec[A-Za-z0-9]+)"/g);
          if (recMatch) {
            if (!recordId) {
              // First record = landing page
              const idMatch = recMatch[0].match(/"(rec[A-Za-z0-9]+)"/);
              if (idMatch) recordId = idMatch[1];
            } else {
              // Subsequent records = tabs
              tabCount += recMatch.length;
            }
          }
        }

        // Also check text blocks for summary info
        if (block.type === 'text' && typeof block.text === 'string') {
          if (!recordId) {
            const recMatch = block.text.match(/rec[A-Za-z0-9]{14,}/);
            if (recMatch) recordId = recMatch[0];
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      recordId,
      slug: state.slug,
      tabCount: tabCount || state.tabs.length,
      rawResponse: data.content,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
