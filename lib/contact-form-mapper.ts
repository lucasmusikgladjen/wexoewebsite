/**
 * Bidirektional mappning för contact-form-fält i sidtyps-records.
 *
 * Contact-form-blocket återanvänds av flera sidtyper (audience, product-area,
 * unique-page, ...) och har historiskt definierats om i varje mapper.
 *
 * Fältnamnen prefixas så samma block kan ligga i flera tabeller. Default
 * är `Contact Form ` (Title Case) som matchar nuvarande Airtable-schema.
 * Vid framtida snake_case-rename räcker det att uppdatera default-prefixet
 * (eller skicka ett eget per anrop).
 *
 * Read-sidan använder `emptyContactFormState()` som fallback när record:en
 * saknar toggle-fält — så defaults som "Show Company = true" består även
 * om Airtable-fältet är otillsatt (det vanliga fallet för äldre records).
 *
 * Write-sidan returnerar råa värden. Callers ansvarar själva för
 * empty→null-konvertering om sidtypen vill den semantiken.
 */

import { AirtableFields, asString, asBool } from './airtable-helpers';
import {
  ContactFormState,
  ContactFormLayout,
  ContactFormTheme,
  emptyContactFormState,
} from './contact-form-types';

export const CONTACT_FORM_FIELD_PREFIX = 'Contact Form ';

export function contactFormFromFields(
  fields: AirtableFields,
  prefix: string = CONTACT_FORM_FIELD_PREFIX,
): ContactFormState {
  const empty = emptyContactFormState();
  const k = (key: string) => `${prefix}${key}`;
  const layoutRaw = asString(fields[k('Layout')]);
  const themeRaw = asString(fields[k('Theme')]);
  return {
    eyebrow: asString(fields[k('Eyebrow')]),
    title: asString(fields[k('Title')]),
    subtitle: asString(fields[k('Subtitle')]),
    layout: (layoutRaw === 'centered' ? 'centered' : 'split') as ContactFormLayout,
    theme: (themeRaw === 'light' ? 'light' : 'dark') as ContactFormTheme,
    showCompany: asBool(fields[k('Show Company')], empty.showCompany),
    showPhone: asBool(fields[k('Show Phone')], empty.showPhone),
    showDropdown: asBool(fields[k('Show Dropdown')], empty.showDropdown),
    dropdownLabel: asString(fields[k('Dropdown Label')]),
    options: asString(fields[k('Options')]),
    ctaText: asString(fields[k('CTA Text')]),
    messageLabel: asString(fields[k('Message Label')]),
    trustSignals: asString(fields[k('Trust Signals')]),
    showContactPerson: asBool(fields[k('Show Contact Person')], empty.showContactPerson),
  };
}

export interface ContactFormToFieldsOptions {
  prefix?: string;
  /** Konvertera tomma textfält till `null` (Airtable-konvention som
   *  unique-page-mapper använder för att rensa fält). Booleans påverkas inte. */
  nullForEmpty?: boolean;
}

export function contactFormToFields(
  state: ContactFormState,
  options: ContactFormToFieldsOptions = {},
): Record<string, unknown> {
  const prefix = options.prefix ?? CONTACT_FORM_FIELD_PREFIX;
  const k = (key: string) => `${prefix}${key}`;
  const text = (v: string): string | null =>
    options.nullForEmpty && v === '' ? null : v;
  return {
    [k('Eyebrow')]: text(state.eyebrow),
    [k('Title')]: text(state.title),
    [k('Subtitle')]: text(state.subtitle),
    [k('Layout')]: state.layout,
    [k('Theme')]: state.theme,
    [k('Show Company')]: state.showCompany,
    [k('Show Phone')]: state.showPhone,
    [k('Show Dropdown')]: state.showDropdown,
    [k('Dropdown Label')]: text(state.dropdownLabel),
    [k('Options')]: text(state.options),
    [k('CTA Text')]: text(state.ctaText),
    [k('Message Label')]: text(state.messageLabel),
    [k('Trust Signals')]: text(state.trustSignals),
    [k('Show Contact Person')]: state.showContactPerson,
  };
}
