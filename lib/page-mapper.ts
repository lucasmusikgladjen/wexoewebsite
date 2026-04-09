/**
 * Bidirectional mapping between Airtable records and PageState.
 *
 * Forward mappers (state → Airtable fields) are pure TypeScript so the update
 * flow can run without a Claude API call — fast and deterministic.
 *
 * Reverse mappers (Airtable → state) are used by the editor to load existing
 * landing pages.
 */

import {
  PageState,
  Tab,
  TabDownload,
  TabType,
  SidebarType,
  FaqItem,
  CompareRow,
  StepItem,
} from './types';
import { createEmptyTab, initialState } from './state';
import { AirtableRecord } from './airtable';

type Fields = Record<string, unknown>;

// ─── Helpers ───────────────────────────────────────────────────────────────

function str(fields: Fields, key: string): string {
  const v = fields[key];
  return typeof v === 'string' ? v : '';
}

function bool(fields: Fields, key: string, fallback = false): boolean {
  const v = fields[key];
  return typeof v === 'boolean' ? v : fallback;
}

function num(fields: Fields, key: string, fallback = 0): number {
  const v = fields[key];
  return typeof v === 'number' ? v : fallback;
}

/** Strip empty strings from an object — Airtable should never receive `""`. */
function compact(obj: Fields): Fields {
  const out: Fields = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === '' || v === null || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

// ─── Forward: PageState → Landing Pages fields ─────────────────────────────

export function landingPageFields(state: PageState): Fields {
  const fields: Fields = compact({
    Name: state.slug,
    Slug: state.slug,
    H1: state.h1,
    'Hero Description': state.heroDescription,
    'Hero Image': state.heroImage,
    'Hero CTA Text': state.heroCta1Text,
    'Hero CTA URL': state.heroCta1Url,
    'Hero CTA2 Text': state.heroCta2Text,
    'Hero CTA2 URL': state.heroCta2Url,
    'Content H2': state.contentH2,
    'Content Text': state.contentText,
    'Content Benefits': state.contentBenefits,
    'Contact Name': state.contactName,
    'Contact Title': state.contactTitle,
    'Contact Email': state.contactEmail,
    'Contact Phone': state.contactPhone,
    'Contact Image': state.contactImage,
    'Contact Quote': state.contactQuote,
    'Color Main': state.colorMain,
    'Color Secondary': state.colorSecondary,
  });

  // Sidebar Type — singleSelect, only set if non-empty
  if (state.sidebarType) {
    fields['Sidebar Type'] = state.sidebarType;
  }

  // Sidebar-specific fields
  if (state.sidebarType === 'case') {
    Object.assign(fields, compact({
      'Case Title': state.caseTitle,
      'Case Description': state.caseDescription,
      'Case Image': state.caseImage,
      'Case Outcomes': state.caseOutcomes,
      'Case CTA Text': state.caseCta,
      'Case CTA URL': state.caseCtaUrl,
    }));
  } else if (state.sidebarType === 'event') {
    Object.assign(fields, compact({
      'Event Type': state.eventType,
      'Event Title': state.eventTitle,
      'Event Description': state.eventDescription,
      'Event Date': state.eventDate,
      'Event Location': state.eventLocation,
      'Event Webhook': state.eventWebhook,
    }));
  } else if (state.sidebarType === 'leadmagnet') {
    Object.assign(fields, compact({
      'Magnet Title': state.magnetTitle,
      'Magnet Format': state.magnetFormat,
      'Magnet Description': state.magnetDescription,
      'Magnet File URL': state.magnetFileUrl,
      'Magnet Webhook': state.magnetWebhook,
    }));
  } else if (state.sidebarType === 'calculator') {
    Object.assign(fields, compact({
      'Calc Title': state.calcTitle,
      'Calc HTML': state.calcHtml,
    }));
  }

  // Boolean visibility fields are always included
  fields['Show Content'] = state.showContent;
  fields['Show Sidebar'] = state.showSidebar;
  fields['Show Tabs'] = state.showTabs;
  fields['Show Contact'] = state.showContact;

  return fields;
}

/**
 * For PATCH (update mode): explicitly clear sidebar-specific fields that don't
 * belong to the active sidebar type, so switching from `case` to `event`
 * doesn't leave orphaned case data behind.
 */
export function landingPagePatchFields(state: PageState): Fields {
  const fields = landingPageFields(state);

  const allCase = ['Case Title', 'Case Description', 'Case Image', 'Case Outcomes', 'Case CTA Text', 'Case CTA URL'];
  const allEvent = ['Event Type', 'Event Title', 'Event Description', 'Event Date', 'Event Location', 'Event Webhook'];
  const allMagnet = ['Magnet Title', 'Magnet Format', 'Magnet Description', 'Magnet File URL', 'Magnet Webhook'];
  const allCalc = ['Calc Title', 'Calc HTML'];

  const clear = (keys: string[]) => keys.forEach((k) => { if (!(k in fields)) fields[k] = ''; });

  if (state.sidebarType !== 'case') clear(allCase);
  if (state.sidebarType !== 'event') clear(allEvent);
  if (state.sidebarType !== 'leadmagnet') clear(allMagnet);
  if (state.sidebarType !== 'calculator') clear(allCalc);
  if (!state.sidebarType) fields['Sidebar Type'] = '';

  return fields;
}

// ─── Forward: Tab → LP Tabs fields ─────────────────────────────────────────

export function tabFields(tab: Tab, order: number): Fields {
  const fields: Fields = {
    Name: tab.name,
    'Tab Type': tab.type,
    Order: order,
    Visa: true,
  };

  switch (tab.type) {
    case 'textimage':
      Object.assign(fields, compact({
        'TI H2': tab.tiH2,
        'TI Text': tab.tiText,
        'TI Benefits': tab.tiBenefits,
        'TI Image': tab.tiImage,
      }));
      fields['TI Inverted'] = tab.tiInverted;
      break;

    case 'fullmedia':
      Object.assign(fields, compact({ 'FM URL': tab.fmUrl }));
      break;

    case 'faq': {
      const faqText = tab.faqItems
        .filter((f) => f.question.trim() || f.answer.trim())
        .map((f) => `Q: ${f.question.trim()}\nA: ${f.answer.trim()}`)
        .join('\n\n');
      if (faqText) fields['FAQ Items'] = faqText;
      break;
    }

    case 'calameo':
      Object.assign(fields, compact({
        'Calameo 1 Title': tab.calTitle1,
        'Calameo 1 Src': tab.calUrl1,
        'Calameo 2 Title': tab.calTitle2,
        'Calameo 2 Src': tab.calUrl2,
        'Calameo 3 Title': tab.calTitle3,
        'Calameo 3 Src': tab.calUrl3,
      }));
      break;

    case 'compare': {
      const rows = tab.compareRows
        .filter((r) => r.label.trim() || r.valueA.trim() || r.valueB.trim())
        .map((r) => `${r.label.trim()} | ${r.valueA.trim()} | ${r.valueB.trim()}`)
        .join('\n');
      Object.assign(fields, compact({
        'Compare Title': tab.compareTitle,
        'Compare Col A': tab.compareColA,
        'Compare Col B': tab.compareColB,
      }));
      if (rows) fields['Compare Rows'] = rows;
      break;
    }

    case 'steps': {
      const stepsText = tab.stepsItems
        .filter((s) => s.title.trim() || s.description.trim())
        .map((s) => `${s.title.trim()} | ${s.description.trim()}`)
        .join('\n');
      Object.assign(fields, compact({ 'Steps Title': tab.stepsTitle }));
      if (stepsText) fields['Steps'] = stepsText;
      break;
    }

    case 'downloads':
      // No tab-level fields — downloads are stored as linked records
      break;
  }

  return fields;
}

/** PATCH version: explicitly clears type-specific fields that don't belong. */
export function tabPatchFields(tab: Tab, order: number): Fields {
  const fields = tabFields(tab, order);
  const allTypeFields = [
    'TI H2', 'TI Text', 'TI Benefits', 'TI Image',
    'FM URL',
    'FAQ Items',
    'Calameo 1 Title', 'Calameo 1 Src', 'Calameo 2 Title', 'Calameo 2 Src', 'Calameo 3 Title', 'Calameo 3 Src',
    'Compare Title', 'Compare Col A', 'Compare Col B', 'Compare Rows',
    'Steps Title', 'Steps',
  ];
  for (const k of allTypeFields) {
    if (!(k in fields)) fields[k] = '';
  }
  // TI Inverted is a checkbox — set false when not a textimage tab
  if (tab.type !== 'textimage') fields['TI Inverted'] = false;
  return fields;
}

// ─── Forward: TabDownload → LP Downloads fields ────────────────────────────

export function downloadFields(dl: TabDownload, order: number): Fields {
  const fields: Fields = compact({
    Name: dl.name,
    Description: dl.description,
    'File URL': dl.fileUrl,
    'Button Text': dl.fileType,
  });
  fields.Order = order;
  fields.Visa = true;
  return fields;
}

// ─── Reverse: Airtable record → PageState ──────────────────────────────────

const TAB_TYPES: TabType[] = ['textimage', 'fullmedia', 'faq', 'calameo', 'downloads', 'compare', 'steps'];
const SIDEBAR_TYPES: SidebarType[] = ['', 'case', 'calculator', 'event', 'leadmagnet'];

function parseFaqItems(text: string): FaqItem[] {
  if (!text.trim()) return [];
  const items: FaqItem[] = [];
  // Split on blank lines, then parse each block
  const blocks = text.split(/\n\s*\n/);
  let counter = 0;
  for (const block of blocks) {
    const lines = block.split('\n').map((l) => l.trim()).filter(Boolean);
    let question = '';
    let answer = '';
    for (const line of lines) {
      if (/^Q:\s*/i.test(line)) {
        question = line.replace(/^Q:\s*/i, '').trim();
      } else if (/^A:\s*/i.test(line)) {
        answer = line.replace(/^A:\s*/i, '').trim();
      } else if (answer) {
        answer += '\n' + line;
      } else if (question) {
        question += ' ' + line;
      }
    }
    if (question || answer) {
      items.push({ id: `faq-load-${counter++}`, question, answer });
    }
  }
  return items;
}

function parseCompareRows(text: string): CompareRow[] {
  if (!text.trim()) return [];
  const rows: CompareRow[] = [];
  let counter = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('|').map((p) => p.trim());
    rows.push({
      id: `cmp-load-${counter++}`,
      label: parts[0] || '',
      valueA: parts[1] || '',
      valueB: parts[2] || '',
    });
  }
  return rows;
}

function parseSteps(text: string): StepItem[] {
  if (!text.trim()) return [];
  const items: StepItem[] = [];
  let counter = 0;
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    const parts = line.split('|').map((p) => p.trim());
    items.push({
      id: `step-load-${counter++}`,
      title: parts[0] || '',
      description: parts[1] || '',
    });
  }
  return items;
}

function tabFromRecord(record: AirtableRecord, downloads: AirtableRecord[]): Tab {
  const f = record.fields;
  const rawType = str(f, 'Tab Type');
  const type: TabType = (TAB_TYPES as string[]).includes(rawType) ? (rawType as TabType) : 'textimage';

  const tab: Tab = {
    ...createEmptyTab(),
    recordId: record.id,
    name: str(f, 'Name'),
    type,
    tiH2: str(f, 'TI H2'),
    tiText: str(f, 'TI Text'),
    tiBenefits: str(f, 'TI Benefits'),
    tiImage: str(f, 'TI Image'),
    tiInverted: bool(f, 'TI Inverted'),
    fmUrl: str(f, 'FM URL'),
    faqItems: parseFaqItems(str(f, 'FAQ Items')),
    calTitle1: str(f, 'Calameo 1 Title'),
    calUrl1: str(f, 'Calameo 1 Src'),
    calTitle2: str(f, 'Calameo 2 Title'),
    calUrl2: str(f, 'Calameo 2 Src'),
    calTitle3: str(f, 'Calameo 3 Title'),
    calUrl3: str(f, 'Calameo 3 Src'),
    downloads: downloads
      .slice()
      .sort((a, b) => num(a.fields, 'Order') - num(b.fields, 'Order'))
      .map((d, i) => ({
        id: `dl-load-${record.id}-${i}`,
        recordId: d.id,
        name: str(d.fields, 'Name'),
        description: str(d.fields, 'Description'),
        fileUrl: str(d.fields, 'File URL'),
        fileType: str(d.fields, 'Button Text'),
      })),
    compareTitle: str(f, 'Compare Title'),
    compareColA: str(f, 'Compare Col A') || 'Alternativ A',
    compareColB: str(f, 'Compare Col B') || 'Alternativ B',
    compareRows: parseCompareRows(str(f, 'Compare Rows')),
    stepsTitle: str(f, 'Steps Title'),
    stepsItems: parseSteps(str(f, 'Steps')),
  };

  return tab;
}

/**
 * Build a complete PageState from an LP record + its linked tabs + each tab's
 * linked downloads. Caller is responsible for fetching all three.
 */
export function pageStateFromRecords(args: {
  landingPage: AirtableRecord;
  tabs: AirtableRecord[];
  downloadsByTabId: Record<string, AirtableRecord[]>;
}): PageState {
  const { landingPage, tabs, downloadsByTabId } = args;
  const f = landingPage.fields;

  const sortedTabs = tabs
    .slice()
    .sort((a, b) => num(a.fields, 'Order') - num(b.fields, 'Order'));

  const rawSidebar = str(f, 'Sidebar Type');
  const sidebarType: SidebarType = (SIDEBAR_TYPES as string[]).includes(rawSidebar)
    ? (rawSidebar as SidebarType)
    : '';

  return {
    ...initialState,
    mode: 'edit',
    recordId: landingPage.id,
    slug: str(f, 'Slug'),

    h1: str(f, 'H1'),
    heroDescription: str(f, 'Hero Description'),
    heroImage: str(f, 'Hero Image'),
    heroCta1Text: str(f, 'Hero CTA Text') || 'Kontakta oss',
    heroCta1Url: str(f, 'Hero CTA URL') || '/kontakt/',
    heroCta2Text: str(f, 'Hero CTA2 Text'),
    heroCta2Url: str(f, 'Hero CTA2 URL'),

    contentH2: str(f, 'Content H2'),
    contentText: str(f, 'Content Text'),
    contentBenefits: str(f, 'Content Benefits'),

    sidebarType,
    caseTitle: str(f, 'Case Title'),
    caseDescription: str(f, 'Case Description'),
    caseImage: str(f, 'Case Image'),
    caseOutcomes: str(f, 'Case Outcomes'),
    caseCta: str(f, 'Case CTA Text'),
    caseCtaUrl: str(f, 'Case CTA URL'),
    eventType: str(f, 'Event Type'),
    eventTitle: str(f, 'Event Title'),
    eventDescription: str(f, 'Event Description'),
    eventDate: str(f, 'Event Date'),
    eventLocation: str(f, 'Event Location'),
    eventWebhook: str(f, 'Event Webhook'),
    magnetTitle: str(f, 'Magnet Title'),
    magnetFormat: str(f, 'Magnet Format'),
    magnetDescription: str(f, 'Magnet Description'),
    magnetFileUrl: str(f, 'Magnet File URL'),
    magnetWebhook: str(f, 'Magnet Webhook'),
    calcTitle: str(f, 'Calc Title'),
    calcHtml: str(f, 'Calc HTML'),

    tabs: sortedTabs.map((t) => tabFromRecord(t, downloadsByTabId[t.id] ?? [])),

    contactName: str(f, 'Contact Name'),
    contactTitle: str(f, 'Contact Title'),
    contactEmail: str(f, 'Contact Email'),
    contactPhone: str(f, 'Contact Phone'),
    contactImage: str(f, 'Contact Image'),
    contactQuote: str(f, 'Contact Quote'),

    showContent: bool(f, 'Show Content', true),
    showSidebar: bool(f, 'Show Sidebar', true),
    showTabs: bool(f, 'Show Tabs', true),
    showContact: bool(f, 'Show Contact', true),

    colorMain: str(f, 'Color Main') || '#11325D',
    colorSecondary: str(f, 'Color Secondary') || '#F28C28',
  };
}
