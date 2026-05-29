/**
 * Deterministiska state → Airtable-fält-transformer (ARKITEKTURPLAN FAS 2).
 *
 * Ersätter Claude-mellanlaget (`claude-transform.ts`) på skrivvägen för de
 * sidtyper vars regler är deterministiska (vilket de alla är — Claude gjorde
 * bara mekanisk omdöpning/formatering). Ingen LLM, ingen latens, inget
 * tredjepartsberoende, och ingen risk att ett spar tappar innehåll.
 *
 * Mode-semantik speglar de tidigare schema-MD-reglerna exakt:
 *   CREATE — utelämna tomma textfält och tomma länk-arrayer; booleans alltid.
 *   UPDATE — skicka '' för text (rensar i Airtable), [] för länkar; booleans
 *            alltid; pseudo-array-positioner utan data skickas som '' så att
 *            borttagna items rensas.
 *
 * Det delade kontaktformuläret skrivs via `contactFormToFields` (samma 14 fält
 * som tidigare); `show_contact_form` skrivs som vanlig boolean.
 */

import { PartnerPageState, QUICK_FACT_ICON_KEYS } from './partner-types';
import {
  CaseState,
  CASE_QUICK_STATS_MAX,
  CASE_RESULTS_MAX,
  CASE_GALLERY_MAX,
} from './case-types';
import { contactFormToFields } from './contact-form-mapper';
import type { WriteMode } from './schema/to-fields';

type Out = Record<string, unknown>;

// ─── Mode-medvetna put-helpers ─────────────────────────────────────────────

/** Text: CREATE utelämnar tomt; UPDATE skickar '' (rensar). */
function putText(out: Out, key: string, v: unknown, mode: WriteMode): void {
  const s = v == null ? '' : String(v);
  if (mode === 'update') out[key] = s;
  else if (s !== '') out[key] = s;
}

/** Boolean: alltid med (true/false). */
function putBool(out: Out, key: string, v: unknown): void {
  out[key] = v === true;
}

/** Länk-array: CREATE utelämnar tom; UPDATE skickar [] (kan ta bort länkning). */
function putLink(out: Out, key: string, v: unknown, mode: WriteMode): void {
  const a = Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
  if (mode === 'update' || a.length > 0) out[key] = a;
}

/** String[]-fält → multiline (trimmar + filtrerar tomma rader). CREATE utelämnar tomt. */
function putLines(out: Out, key: string, arr: unknown, mode: WriteMode): void {
  const s = (Array.isArray(arr) ? arr : [])
    .map((x) => String(x).trim())
    .filter((x) => x !== '')
    .join('\n');
  if (mode === 'update') out[key] = s;
  else if (s !== '') out[key] = s;
}

// ─── Partner ───────────────────────────────────────────────────────────────

const PARTNER_ICONS = new Set<string>(QUICK_FACT_ICON_KEYS);

/** Quick-facts-ikon valideras mot tillåtna keys; allt annat → ''. Alltid med. */
function putIcon(out: Out, key: string, icon: unknown): void {
  const v = String(icon ?? '');
  out[key] = PARTNER_ICONS.has(v) ? v : '';
}

/** FAQ-array → JSON-sträng (filtrerar tom fråga, droppar clientId). CREATE
 *  utelämnar om tom; UPDATE skickar alltid (även "[]"). */
function putFaqsJson(
  out: Out,
  key: string,
  faqs: PartnerPageState['faqs'],
  mode: WriteMode,
): void {
  const filtered = (Array.isArray(faqs) ? faqs : [])
    .filter((f) => f && typeof f.question === 'string' && f.question.trim() !== '')
    .map((f) => ({ question: f.question, answer: f.answer ?? '' }));
  const s = JSON.stringify(filtered);
  if (mode === 'update') out[key] = s;
  else if (filtered.length > 0) out[key] = s;
}

export function buildPartnerFields(state: PartnerPageState, mode: WriteMode): Out {
  const out: Out = {};

  // Identity & meta
  putText(out, 'slug', state.slug, mode);
  putBool(out, 'is_active', state.isActive);
  putText(out, 'internal_notes', state.internalNotes, mode);
  putLink(out, 'partner_ids', state.partnerIds, mode);
  putLink(out, 'country_ids', state.countryIds, mode);

  // SEO
  putText(out, 'seo_title', state.seoTitle, mode);
  putText(out, 'seo_description', state.seoDescription, mode);
  putText(out, 'og_image_url', state.ogImageUrl, mode);

  // Hero
  putText(out, 'hero_eyebrow', state.heroEyebrow, mode);
  putText(out, 'h1', state.h1, mode);
  putText(out, 'hero_tagline', state.heroTagline, mode);
  putText(out, 'hero_cta_text', state.heroCtaText, mode);
  putText(out, 'hero_cta_url', state.heroCtaUrl, mode);
  putText(out, 'hero_cta2_text', state.heroCta2Text, mode);
  putText(out, 'hero_cta2_url', state.heroCta2Url, mode);
  putText(out, 'hero_image_url', state.heroImageUrl, mode);

  // Quick Facts (4 fasta slots; ikon alltid med, value/label som text)
  putBool(out, 'show_quick_facts', state.showQuickFacts);
  for (let i = 0; i < 4; i++) {
    const slot = i + 1;
    const fact = state.facts[i] ?? { icon: '', value: '', label: '' };
    putIcon(out, `facts_${slot}_icon`, fact.icon);
    putText(out, `facts_${slot}_value`, fact.value, mode);
    putText(out, `facts_${slot}_label`, fact.label, mode);
  }

  // About
  putBool(out, 'show_about', state.showAbout);
  putText(out, 'about_eyebrow', state.aboutEyebrow, mode);
  putText(out, 'about_h2', state.aboutH2, mode);
  putText(out, 'about_text', state.aboutText, mode);
  putText(out, 'about_image_url', state.aboutImageUrl, mode);
  putText(out, 'about_badge_value', state.aboutBadgeValue, mode);
  putText(out, 'about_badge_label', state.aboutBadgeLabel, mode);

  // Why Wexoe + benefits + cases
  putBool(out, 'show_why_wexoe', state.showWhyWexoe);
  putText(out, 'why_h2', state.whyH2, mode);
  putText(out, 'why_text', state.whyText, mode);
  putLines(out, 'why_benefits', state.whyBenefits, mode);
  putLink(out, 'case_ids', state.caseIds, mode);
  putText(out, 'cases_view_all_text', state.casesViewAllText, mode);
  putText(out, 'cases_view_all_url', state.casesViewAllUrl, mode);

  // Categories
  putBool(out, 'show_categories', state.showCategories);
  putText(out, 'categories_eyebrow', state.categoriesEyebrow, mode);
  putText(out, 'categories_h2', state.categoriesH2, mode);
  putText(out, 'categories_intro', state.categoriesIntro, mode);
  putLink(out, 'category_ids', state.categoryIds, mode);

  // FAQ
  putBool(out, 'show_faq', state.showFaq);
  putText(out, 'faq_h2', state.faqH2, mode);
  putFaqsJson(out, 'faqs', state.faqs, mode);

  // Contact Person
  putBool(out, 'show_contact_person', state.showContactPerson);
  putText(out, 'contact_name', state.contactName, mode);
  putText(out, 'contact_title', state.contactTitle, mode);
  putText(out, 'contact_email', state.contactEmail, mode);
  putText(out, 'contact_phone', state.contactPhone, mode);
  putText(out, 'contact_image_url', state.contactImageUrl, mode);
  putText(out, 'contact_quote', state.contactQuote, mode);

  // Contact Form (delat block)
  putBool(out, 'show_contact_form', state.showContactForm);
  Object.assign(
    out,
    contactFormToFields(state.contactForm, { schema: 'snake_case', nullForEmpty: mode === 'update' }),
  );

  return out;
}

// ─── Case ────────────────────────────────────────────────────────────────

/** Expanderar en pseudo-array till numrerade fält upp till `max`. Tomma
 *  positioner skrivs '' vid UPDATE (rensar borttagna items) och utelämnas
 *  vid CREATE. */
function putPseudoArray<T extends Record<string, string>>(
  out: Out,
  prefix: string,
  items: T[],
  max: number,
  cols: Array<keyof T>,
  mode: WriteMode,
): void {
  for (let i = 0; i < max; i++) {
    const slot = i + 1;
    const item = items[i];
    for (const col of cols) {
      putText(out, `${prefix}_${slot}_${String(col)}`, item ? item[col] : '', mode);
    }
  }
}

export function buildCaseFields(state: CaseState, mode: WriteMode): Out {
  const out: Out = {};

  // Core (cms_partner_pages-backlänken skrivs ALDRIG)
  putText(out, 'slug', state.slug, mode);
  putText(out, 'internal_notes', state.internalNotes, mode);
  putBool(out, 'is_active', state.isActive);

  // SEO
  putText(out, 'seo_title', state.seoTitle, mode);
  putText(out, 'seo_description', state.seoDescription, mode);
  putText(out, 'og_image_url', state.ogImageUrl, mode);

  // Header (header_logos är ett lines-fält men hålls som rå sträng i state)
  putText(out, 'industry', state.industry, mode);
  putText(out, 'title', state.title, mode);
  putText(out, 'subtitle', state.subtitle, mode);
  putText(out, 'customer_name', state.customerName, mode);
  putText(out, 'location', state.location, mode);
  putText(out, 'project_year', state.projectYear, mode);
  putText(out, 'project_type', state.projectType, mode);
  putText(out, 'reading_time', state.readingTime, mode);
  putText(out, 'header_logos', state.headerLogos, mode);

  // Lead
  putText(out, 'lead_image_url', state.leadImageUrl, mode);
  putText(out, 'lead_image_caption', state.leadImageCaption, mode);
  putText(out, 'lead_paragraph', state.leadParagraph, mode);

  // Stats strip
  putBool(out, 'show_stats_strip', state.showStatsStrip);
  putPseudoArray(out, 'quick_stat', state.quickStats, CASE_QUICK_STATS_MAX, ['value', 'label'], mode);

  // Challenge (challenge_bullets = rå lines-sträng)
  putText(out, 'challenge_eyebrow', state.challengeEyebrow, mode);
  putText(out, 'challenge_title', state.challengeTitle, mode);
  putText(out, 'challenge_text', state.challengeText, mode);
  putText(out, 'challenge_bullets', state.challengeBullets, mode);
  putText(out, 'challenge_image_url', state.challengeImageUrl, mode);
  putText(out, 'challenge_image_caption', state.challengeImageCaption, mode);

  // Pullquote
  putBool(out, 'show_pullquote', state.showPullquote);
  putText(out, 'pullquote_text', state.pullquoteText, mode);
  putText(out, 'pullquote_attribution', state.pullquoteAttribution, mode);

  // Solution
  putText(out, 'solution_eyebrow', state.solutionEyebrow, mode);
  putText(out, 'solution_title', state.solutionTitle, mode);
  putText(out, 'solution_text', state.solutionText, mode);
  putText(out, 'solution_image_url', state.solutionImageUrl, mode);
  putText(out, 'solution_image_caption', state.solutionImageCaption, mode);

  // Products
  putText(out, 'products_title', state.productsTitle, mode);
  putText(out, 'products_meta', state.productsMeta, mode);
  putLink(out, 'product_ids', state.productIds, mode);
  putLink(out, 'article_ids', state.articleIds, mode);

  // Results
  putText(out, 'results_eyebrow', state.resultsEyebrow, mode);
  putText(out, 'results_title', state.resultsTitle, mode);
  putText(out, 'results_text', state.resultsText, mode);
  putPseudoArray(out, 'result', state.results, CASE_RESULTS_MAX, ['value', 'label'], mode);

  // Testimonial
  putBool(out, 'show_testimonial', state.showTestimonial);
  putText(out, 'testimonial_quote', state.testimonialQuote, mode);
  putText(out, 'testimonial_photo_url', state.testimonialPhotoUrl, mode);
  putText(out, 'testimonial_author_name', state.testimonialAuthorName, mode);
  putText(out, 'testimonial_author_title', state.testimonialAuthorTitle, mode);

  // Gallery
  putBool(out, 'show_gallery', state.showGallery);
  putText(out, 'gallery_title', state.galleryTitle, mode);
  putPseudoArray(out, 'gallery_image', state.galleryImages, CASE_GALLERY_MAX, ['url', 'caption'], mode);

  // About customer
  putBool(out, 'show_about_customer', state.showAboutCustomer);
  putText(out, 'about_customer_logo_url', state.aboutCustomerLogoUrl, mode);
  putText(out, 'about_customer_title', state.aboutCustomerTitle, mode);
  putText(out, 'about_customer_text', state.aboutCustomerText, mode);
  putText(out, 'about_customer_link_label', state.aboutCustomerLinkLabel, mode);
  putText(out, 'about_customer_url', state.aboutCustomerUrl, mode);

  // Glance sidebar
  putText(out, 'glance_challenge', state.glanceChallenge, mode);
  putText(out, 'glance_solution', state.glanceSolution, mode);
  putText(out, 'glance_result', state.glanceResult, mode);

  // Contact Form (delat block)
  putBool(out, 'show_contact_form', state.showContactForm);
  Object.assign(
    out,
    contactFormToFields(state.contactForm, { schema: 'snake_case', nullForEmpty: mode === 'update' }),
  );

  return out;
}
