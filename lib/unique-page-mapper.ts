/**
 * Bidirektional mappning mellan Airtable cms_unique_pages-records och
 * UniquePageState i builder.
 *
 * Post-migration: snake_case överallt — Airtable display-namn matchar
 * passthrough mot wexoe-core domain-keys.
 */

import { AirtableRecord } from './airtable';
import {
  UniquePageState,
  emptyUniquePageState,
  Theme,
  TextOnlyAlign,
  ContactFormLayout,
} from './unique-page-types';

function asString(v: unknown): string {
  return typeof v === 'string' ? v : (v == null ? '' : String(v));
}
function asNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v !== '') { const n = Number(v); if (!Number.isNaN(n)) return n; }
  return 0;
}
function asBool(v: unknown): boolean { return v === true || v === 'true' || v === 1; }
function asLinkIds(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}
function asTheme(v: unknown, def: Theme = 'dark'): Theme {
  return v === 'light' ? 'light' : v === 'dark' ? 'dark' : def;
}
function asAlign(v: unknown): TextOnlyAlign {
  return v === 'center' ? 'center' : 'left';
}
function asLayout(v: unknown): ContactFormLayout {
  return v === 'centered' ? 'centered' : 'split';
}

export function uniquePageStateFromRecord(rec: AirtableRecord): UniquePageState {
  const f = rec.fields;
  const state = emptyUniquePageState();
  state.mode = 'edit';
  state.recordId = rec.id;

  state.slug = asString(f['slug']);
  state.h1 = asString(f['h1']);
  state.seoTitle = asString(f['seo_title']);
  state.seoDescription = asString(f['seo_description']);
  state.ogImageUrl = asString(f['og_image_url']);
  state.published = asBool(f['is_published']);
  state.countryIds = asLinkIds(f['country_ids']);
  state.divisionIds = asLinkIds(f['division_ids']);

  // Hero
  state.showHero = asBool(f['show_hero']);
  state.hero = {
    eyebrow: asString(f['hero_eyebrow']),
    h1Override: asString(f['hero_h1_override']),
    subtitle: asString(f['hero_subtitle']),
    imageUrl: asString(f['hero_image_url']),
    ctaText: asString(f['hero_cta_text']),
    ctaUrl: asString(f['hero_cta_url']),
    theme: asTheme(f['hero_theme']),
  };

  // Text-image A
  state.showTextImageA = asBool(f['show_text_image_a']);
  state.textImageA = {
    h2: asString(f['text_image_a_h2']),
    body: asString(f['text_image_a_body']),
    imageUrl: asString(f['text_image_a_image_url']),
    reversed: asBool(f['text_image_a_reversed']),
    theme: asTheme(f['text_image_a_theme'], 'light'),
  };

  // Text-image B
  state.showTextImageB = asBool(f['show_text_image_b']);
  state.textImageB = {
    h2: asString(f['text_image_b_h2']),
    body: asString(f['text_image_b_body']),
    imageUrl: asString(f['text_image_b_image_url']),
    reversed: asBool(f['text_image_b_reversed']),
    theme: asTheme(f['text_image_b_theme'], 'light'),
  };

  // Text-only
  state.showTextOnly = asBool(f['show_text_only']);
  state.textOnly = {
    h2: asString(f['text_only_h2']),
    body: asString(f['text_only_body']),
    align: asAlign(f['text_only_align']),
  };

  // FAQ
  state.showFaq = asBool(f['show_faq']);
  state.faq = {
    h2: asString(f['faq_h2']),
    items: asString(f['faq_items']),
  };

  // Team Grid
  state.showTeamGrid = asBool(f['show_team_grid']);
  state.teamGrid = {
    h2: asString(f['team_grid_h2']),
    scope: {
      division: asString(f['team_grid_scope_division']),
      country: asString(f['team_grid_scope_country']),
      limit: asNumber(f['team_grid_limit']),
    },
  };

  // Partners Marquee
  state.showPartnersMarquee = asBool(f['show_partners_marquee']);
  state.partnersMarquee = {
    h2: asString(f['partners_marquee_h2']),
    scope: {
      division: asString(f['partners_marquee_scope_division']),
      country: asString(f['partners_marquee_scope_country']),
    },
  };

  // Testimonial Card
  state.showTestimonialCard = asBool(f['show_testimonial_card']);
  state.testimonialCard = {
    scope: {
      customerType: asString(f['testimonial_scope_customer_type']),
      division: asString(f['testimonial_scope_division']),
      country: asString(f['testimonial_scope_country']),
    },
  };

  // CTA Banner
  state.showCtaBanner = asBool(f['show_cta_banner']);
  state.ctaBanner = {
    h2: asString(f['cta_banner_h2']),
    body: asString(f['cta_banner_body']),
    ctaText: asString(f['cta_banner_cta_text']),
    ctaUrl: asString(f['cta_banner_cta_url']),
    theme: asTheme(f['cta_banner_theme']),
  };

  // Contact Form
  state.showContactForm = asBool(f['show_contact_form']);
  state.contactForm = {
    eyebrow: asString(f['contact_form_eyebrow']),
    title: asString(f['contact_form_title']),
    subtitle: asString(f['contact_form_subtitle']),
    layout: asLayout(f['contact_form_layout']),
    theme: asTheme(f['contact_form_theme']),
    showCompany: asBool(f['contact_form_show_company']),
    showPhone: asBool(f['contact_form_show_phone']),
    showDropdown: asBool(f['contact_form_show_dropdown']),
    dropdownLabel: asString(f['contact_form_dropdown_label']),
    options: asString(f['contact_form_options']),
    ctaText: asString(f['contact_form_cta_text']),
    messageLabel: asString(f['contact_form_message_label']),
    trustSignals: asString(f['contact_form_trust_signals']),
    showContactPerson: asBool(f['contact_form_show_contact_person']),
  };

  return state;
}

/**
 * Konvertera UniquePageState → Airtable-fält-map.
 *
 * `mode`:
 *   - 'create' (default): tomma värden tas bort innan POST så Airtable använder
 *     fält-defaults.
 *   - 'update': tomma textfält skickas som tom sträng så Airtable rensar dem.
 */
export function uniquePageStateToFields(
  state: UniquePageState,
  mode: 'create' | 'update' = 'create',
): Record<string, unknown> {
  const fields: Record<string, unknown> = {
    'slug': state.slug || null,
    'h1': state.h1 || null,
    'seo_title': state.seoTitle || null,
    'seo_description': state.seoDescription || null,
    'og_image_url': state.ogImageUrl || null,
    'is_published': !!state.published,
    'country_ids': state.countryIds,
    'division_ids': state.divisionIds,

    'show_hero': state.showHero,
    'hero_eyebrow': state.hero.eyebrow || null,
    'hero_h1_override': state.hero.h1Override || null,
    'hero_subtitle': state.hero.subtitle || null,
    'hero_image_url': state.hero.imageUrl || null,
    'hero_cta_text': state.hero.ctaText || null,
    'hero_cta_url': state.hero.ctaUrl || null,
    'hero_theme': state.hero.theme,

    'show_text_image_a': state.showTextImageA,
    'text_image_a_h2': state.textImageA.h2 || null,
    'text_image_a_body': state.textImageA.body || null,
    'text_image_a_image_url': state.textImageA.imageUrl || null,
    'text_image_a_reversed': state.textImageA.reversed,
    'text_image_a_theme': state.textImageA.theme,

    'show_text_image_b': state.showTextImageB,
    'text_image_b_h2': state.textImageB.h2 || null,
    'text_image_b_body': state.textImageB.body || null,
    'text_image_b_image_url': state.textImageB.imageUrl || null,
    'text_image_b_reversed': state.textImageB.reversed,
    'text_image_b_theme': state.textImageB.theme,

    'show_text_only': state.showTextOnly,
    'text_only_h2': state.textOnly.h2 || null,
    'text_only_body': state.textOnly.body || null,
    'text_only_align': state.textOnly.align,

    'show_faq': state.showFaq,
    'faq_h2': state.faq.h2 || null,
    'faq_items': state.faq.items || null,

    'show_team_grid': state.showTeamGrid,
    'team_grid_h2': state.teamGrid.h2 || null,
    'team_grid_scope_division': state.teamGrid.scope.division || null,
    'team_grid_scope_country': state.teamGrid.scope.country || null,
    'team_grid_limit': state.teamGrid.scope.limit ? Number(state.teamGrid.scope.limit) : null,

    'show_partners_marquee': state.showPartnersMarquee,
    'partners_marquee_h2': state.partnersMarquee.h2 || null,
    'partners_marquee_scope_division': state.partnersMarquee.scope.division || null,
    'partners_marquee_scope_country': state.partnersMarquee.scope.country || null,

    'show_testimonial_card': state.showTestimonialCard,
    'testimonial_scope_customer_type': state.testimonialCard.scope.customerType || null,
    'testimonial_scope_division': state.testimonialCard.scope.division || null,
    'testimonial_scope_country': state.testimonialCard.scope.country || null,

    'show_cta_banner': state.showCtaBanner,
    'cta_banner_h2': state.ctaBanner.h2 || null,
    'cta_banner_body': state.ctaBanner.body || null,
    'cta_banner_cta_text': state.ctaBanner.ctaText || null,
    'cta_banner_cta_url': state.ctaBanner.ctaUrl || null,
    'cta_banner_theme': state.ctaBanner.theme,

    'show_contact_form': state.showContactForm,
    'contact_form_eyebrow': state.contactForm.eyebrow || null,
    'contact_form_title': state.contactForm.title || null,
    'contact_form_subtitle': state.contactForm.subtitle || null,
    'contact_form_layout': state.contactForm.layout,
    'contact_form_theme': state.contactForm.theme,
    'contact_form_show_company': state.contactForm.showCompany,
    'contact_form_show_phone': state.contactForm.showPhone,
    'contact_form_show_dropdown': state.contactForm.showDropdown,
    'contact_form_dropdown_label': state.contactForm.dropdownLabel || null,
    'contact_form_options': state.contactForm.options || null,
    'contact_form_cta_text': state.contactForm.ctaText || null,
    'contact_form_message_label': state.contactForm.messageLabel || null,
    'contact_form_trust_signals': state.contactForm.trustSignals || null,
    'contact_form_show_contact_person': state.contactForm.showContactPerson,
  };

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v === undefined) continue;
    if (v === null) {
      if (mode === 'update') {
        out[k] = null;
      }
      continue;
    }
    out[k] = v;
  }
  return out;
}

export const UNIQUE_PAGES_TABLE_ID = 'tblpAM1wZWDbrpeai';
