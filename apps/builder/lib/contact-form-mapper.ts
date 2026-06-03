/**
 * Bidirektional mappning för contact-form-fält i sidtyps-records.
 *
 * Contact-form-blocket återanvänds av flera sidtyper (audience, product-page,
 * landing-page, ...). Sidtyperna ligger i olika baser och olika naming-eror:
 *
 *  - Legacy-basen (audience, m.fl.) — Title Case-fält:
 *    `Contact Form Eyebrow`, `Contact Form Show Company`, etc.
 *  - Wexoe NY (cms_*-tabellerna) — snake_case-fält:
 *    `contact_form_eyebrow`, `contact_form_show_company`, etc.
 *
 * Schemat väljs via `schema`-parametern. `title_case` är default för
 * bakåtkompat med äldre callers, men nya callsites (cms_*) ska skicka
 * `snake_case`. Internt mappar funktionen mellan ContactFormState-fält och
 * Airtable-fältnamn för rätt schema.
 *
 * Read-sidan använder `emptyContactFormState()` som fallback när record:en
 * saknar toggle-fält — så defaults som "Show Company = true" består även
 * om Airtable-fältet är otillsatt (det vanliga fallet för äldre records).
 *
 * Write-sidan returnerar råa värden. Callers ansvarar själva för
 * empty→null-konvertering om sidtypen vill den semantiken.
 *
 * FAS 3 — delat block via JSON-kolumn (KLAR): hela blocket lagras i EN enda
 * JSON-kolumn (`contact_form_json`). Expand-contract genomförd:
 *   1. Lade JSON-kolumnen + dual-write. Flata fält var källa-till-sanning.
 *   2. Read-prefer: `contactFormFromFields` föredrar JSON-spegeln när den finns,
 *      annars de flata fälten (bakåtkompat för records skrivna innan kolumnen).
 *   3. (NU) PHP läser uteslutande JSON (`ContactForm::from_record`); de 15 flata
 *      `contact_form_*`-fälten är borttagna ur Airtable. Skriv-vägen
 *      (`contactFormToFields`) emittar därför bara JSON-kolumnen — att skriva
 *      ett borttaget fält ger "Unknown field name" och failar hela sparet.
 * JSON-payloaden är ContactFormState serialiserad (snake_case) — oberoende av
 * varje tabells flat-fält-naming, så samma blob kan delas av alla sidtyper.
 */

import { AirtableFields, asString, asBool } from './airtable-helpers';
import {
  ContactFormState,
  ContactFormLayout,
  ContactFormTheme,
  emptyContactFormState,
} from './contact-form-types';

export type ContactFormSchema = 'title_case' | 'snake_case';

interface SchemaSpec {
  prefix: string;
  /** Fältnamn för den serialiserade JSON-spegeln (FAS 3, delat block). */
  jsonField: string;
  /** Map från ContactFormState-fält → Airtable-fältnamn (utan prefix). */
  keys: {
    eyebrow: string;
    title: string;
    subtitle: string;
    layout: string;
    theme: string;
    showCompany: string;
    showPhone: string;
    showDropdown: string;
    dropdownLabel: string;
    options: string;
    ctaText: string;
    messageLabel: string;
    trustSignals: string;
    showContactPerson: string;
  };
}

const SCHEMAS: Record<ContactFormSchema, SchemaSpec> = {
  title_case: {
    prefix: 'Contact Form ',
    jsonField: 'Contact Form JSON',
    keys: {
      eyebrow: 'Eyebrow',
      title: 'Title',
      subtitle: 'Subtitle',
      layout: 'Layout',
      theme: 'Theme',
      showCompany: 'Show Company',
      showPhone: 'Show Phone',
      showDropdown: 'Show Dropdown',
      dropdownLabel: 'Dropdown Label',
      options: 'Options',
      ctaText: 'CTA Text',
      messageLabel: 'Message Label',
      trustSignals: 'Trust Signals',
      showContactPerson: 'Show Contact Person',
    },
  },
  snake_case: {
    prefix: 'contact_form_',
    jsonField: 'contact_form_json',
    keys: {
      eyebrow: 'eyebrow',
      title: 'title',
      subtitle: 'subtitle',
      layout: 'layout',
      theme: 'theme',
      showCompany: 'show_company',
      showPhone: 'show_phone',
      showDropdown: 'show_dropdown',
      dropdownLabel: 'dropdown_label',
      options: 'options',
      ctaText: 'cta_text',
      messageLabel: 'message_label',
      trustSignals: 'trust_signals',
      showContactPerson: 'show_contact_person',
    },
  },
};

/** @deprecated Kept for callers that still reference the constant directly. */
export const CONTACT_FORM_FIELD_PREFIX = SCHEMAS.title_case.prefix;

/**
 * Normaliserar ett löst camelCase-objekt (från JSON-spegeln *eller* från de
 * flata fälten) till en giltig `ContactFormState`. Toggles faller tillbaka på
 * `emptyContactFormState()`-defaults när nyckeln saknas, så "Show Company =
 * true" består för records utan fältet. Enda coercion-vägen för båda källorna.
 */
export function coerceContactForm(raw: unknown): ContactFormState {
  const empty = emptyContactFormState();
  const o = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const layoutRaw = asString(o.layout);
  const themeRaw = asString(o.theme);
  return {
    eyebrow: asString(o.eyebrow),
    title: asString(o.title),
    subtitle: asString(o.subtitle),
    layout: (layoutRaw === 'centered' ? 'centered' : 'split') as ContactFormLayout,
    theme: (themeRaw === 'light' ? 'light' : 'dark') as ContactFormTheme,
    showCompany: asBool(o.showCompany, empty.showCompany),
    showPhone: asBool(o.showPhone, empty.showPhone),
    showDropdown: asBool(o.showDropdown, empty.showDropdown),
    dropdownLabel: asString(o.dropdownLabel),
    options: asString(o.options),
    ctaText: asString(o.ctaText),
    messageLabel: asString(o.messageLabel),
    trustSignals: asString(o.trustSignals),
    showContactPerson: asBool(o.showContactPerson, empty.showContactPerson),
  };
}

/**
 * Serialiserar blocket till JSON-spegeln. **snake_case, oprefixade nycklar** —
 * samma naming som Airtable-fälten och som `ContactForm::render` (PHP) vill ha,
 * så PHP-läsningen blir en ren `json_decode` utan nyckel-översättning. Stabil
 * nyckelordning. Oberoende av per-tabell flat-fält-naming — samma blob delas av
 * alla sidtyper.
 */
export function contactFormToJson(state: ContactFormState): string {
  const payload = {
    eyebrow: state.eyebrow,
    title: state.title,
    subtitle: state.subtitle,
    layout: state.layout,
    theme: state.theme,
    show_company: state.showCompany,
    show_phone: state.showPhone,
    show_dropdown: state.showDropdown,
    dropdown_label: state.dropdownLabel,
    options: state.options,
    cta_text: state.ctaText,
    message_label: state.messageLabel,
    trust_signals: state.trustSignals,
    show_contact_person: state.showContactPerson,
  };
  return JSON.stringify(payload);
}

/**
 * Parsar JSON-spegeln → `ContactFormState`. Returnerar `null` när värdet saknas
 * eller inte är giltig JSON, så callers kan falla tillbaka på de flata fälten.
 *
 * JSON lagras i snake_case (se `contactFormToJson`); här mappas nycklarna till
 * den camelCase-form `coerceContactForm` förväntar sig.
 */
export function contactFormFromJson(raw: unknown): ContactFormState | null {
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object') return null;
  const o = parsed as Record<string, unknown>;
  return coerceContactForm({
    eyebrow: o.eyebrow,
    title: o.title,
    subtitle: o.subtitle,
    layout: o.layout,
    theme: o.theme,
    showCompany: o.show_company,
    showPhone: o.show_phone,
    showDropdown: o.show_dropdown,
    dropdownLabel: o.dropdown_label,
    options: o.options,
    ctaText: o.cta_text,
    messageLabel: o.message_label,
    trustSignals: o.trust_signals,
    showContactPerson: o.show_contact_person,
  });
}

export function contactFormFromFields(
  fields: AirtableFields,
  schema: ContactFormSchema = 'title_case',
): ContactFormState {
  const { prefix, keys, jsonField } = SCHEMAS[schema];

  // FAS 3: föredra JSON-spegeln när den finns (delat-block-källan efter
  // migrering). Faller tillbaka på de flata fälten för records skrivna innan
  // kolumnen fanns.
  const fromJson = contactFormFromJson(fields[jsonField]);
  if (fromJson) return fromJson;

  const f = (k: keyof SchemaSpec['keys']) => fields[`${prefix}${keys[k]}`];
  return coerceContactForm({
    eyebrow: f('eyebrow'),
    title: f('title'),
    subtitle: f('subtitle'),
    layout: f('layout'),
    theme: f('theme'),
    showCompany: f('showCompany'),
    showPhone: f('showPhone'),
    showDropdown: f('showDropdown'),
    dropdownLabel: f('dropdownLabel'),
    options: f('options'),
    ctaText: f('ctaText'),
    messageLabel: f('messageLabel'),
    trustSignals: f('trustSignals'),
    showContactPerson: f('showContactPerson'),
  });
}

export interface ContactFormToFieldsOptions {
  schema?: ContactFormSchema;
}

/**
 * Skriv-vägen för det delade kontaktformuläret. Efter FAS 3 (delat block via
 * JSON-kolumn) skrivs hela blocket som EN serialiserad JSON-kolumn
 * (`contact_form_json`) — de 15 flata `contact_form_*`-fälten är borttagna ur
 * Airtable och PHP läser uteslutande JSON-spegeln (`ContactForm::from_record`).
 * Att skriva ett borttaget fält ger Airtable-felet "Unknown field name", så
 * skriv-vägen får aldrig emitta de flata fälten igen.
 *
 * `schema` väljer bara kolumnNAMNET (snake_case → `contact_form_json`,
 * title_case → `Contact Form JSON`). Själva JSON-innehållet är alltid samma
 * schemaoberoende snake_case-blob, så samma blob kan delas av alla sidtyper.
 */
export function contactFormToFields(
  state: ContactFormState,
  options: ContactFormToFieldsOptions = {},
): Record<string, unknown> {
  const { jsonField } = SCHEMAS[options.schema ?? 'title_case'];
  return { [jsonField]: contactFormToJson(state) };
}
