// ─── Product Area state model ──────────────────────────────────────────────
//
// Mirrors the Airtable "Product Areas" table plus enough of the linked
// "Products" and "Solutions & Concepts" records for in-place editing, and a
// read-only projection of linked "Articles" beneath each product.

export interface NormalSection {
  h2: string;
  text: string;
  bullets: string;
  image: string;
  reversed: boolean;
  bg: string;
  /** Only used on section 1 in the current schema, but modelled uniformly. */
  upp: boolean;
}

/** Read-only view of a linked Article record. */
export interface LinkedArticleReadonly {
  recordId: string;
  name: string;
  artikelnummer: string;
  description: string;
  bild: string;
  datablad: string;
  lankTillWebshop: string;
  varianter: string;
}

/** Editable projection of a linked Product record. */
export interface LinkedProduct {
  recordId: string;
  name: string;
  headerSideMenu: string;
  description: string;
  ecosystemDescription: string;
  bullets: string;
  image: string;
  button1Text: string;
  button1Url: string;
  button2Text: string;
  button2Url: string;
  horizontal: boolean;
  order: number;
  visa: boolean;
  /** Linked Articles — read-only in v1. */
  articles: LinkedArticleReadonly[];
}

/** Editable projection of a linked Solutions & Concepts record. */
export interface LinkedSolution {
  recordId: string;
  name: string;
  image: string;
  url: string;
  description: string;
  category: string;
  ctaText: string;
  order: number;
  visa: boolean;
}

export interface ProductAreaState {
  mode: 'edit';
  recordId: string;
  slug: string;

  // Top banner
  h1: string;
  topBg: string;

  // Hero
  heroH2: string;
  heroText: string;
  heroCtaText: string;
  heroCtaUrl: string;
  heroBenefits: string;
  heroImage: string;
  heroBg: string;
  heroAccent: string;

  // NPI card
  npiTitle: string;
  npiDescription: string;
  npiImage: string;
  npiLink: string;

  // Toggle / side-menu colors
  toggleBg: string;
  toggleHeaderBg: string;
  toggleAccent: string;

  // Solutions grid settings
  solutionsTitle: string;
  solutionsBg: string;
  solutionsCardBg: string;

  // Normal 1–4
  normal1: NormalSection;
  normal2: NormalSection;
  normal3: NormalSection;
  normal4: NormalSection;

  // Contact ("our guy")
  contactName: string;
  contactTitle: string;
  contactEmail: string;
  contactPhone: string;
  contactImage: string;
  contactText: string;
  contactBg: string;

  // Docs iframe
  docsTitle: string;
  docsIframe: string;
  docsBg: string;

  // Feature flags
  sideMenu: boolean;
  request: boolean;
  defaultOpen: boolean;

  // Linked records
  products: LinkedProduct[];
  solutions: LinkedSolution[];
}

export type ProductAreaSectionId =
  | 'hero'
  | 'npi'
  | 'normal1'
  | 'normal2'
  | 'normal3'
  | 'normal4'
  | 'products'
  | 'solutions'
  | 'contact'
  | 'docs'
  | 'settings';

export function emptyNormalSection(): NormalSection {
  return {
    h2: '',
    text: '',
    bullets: '',
    image: '',
    reversed: false,
    bg: '',
    upp: false,
  };
}
