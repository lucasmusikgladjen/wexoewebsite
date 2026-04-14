/**
 * Reverse mapping from Airtable records → PageState, used by the editor to
 * hydrate the builder when editing an existing Landing Page.
 *
 * Forward mapping (state → Airtable fields) now lives entirely in Claude
 * via `lib/claude-transform.ts` — there are no deterministic forward
 * mappers in this file anymore.
 */

import {
  PageState,
  Tab,
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

// ─── Forward: PageState → Landing Pages fields ─────────────────────────────

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
