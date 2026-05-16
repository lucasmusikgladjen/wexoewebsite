# Airtable Schema — Wexoe CMS Pages (informationssidor)

**Base ID:** `appokKSTaBdCa8YiW` (Wexoe NY)

Detta schema används av Claude-middlemannen för att transformera state-JSON
till Airtable-fältnamn när en informationssida (`cms_pages`) skapas eller
uppdateras via buildern. snake_case överallt.

Sidtypen har **tre tabeller**:

1. `cms_pages` — sidans metadata
2. `cms_page_sections` — polymorfa sektioner (1 record per sektion)
3. `cms_section_tabs` — sub-records för `tabs`-sektionstypen (1 record per flik)

---

## Tabell 1: cms_pages

**Table ID:** `tblglNKHehRWy3lEM`

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **slug** | singleLineText | Primary key. URL-slug, lowercase a-z 0-9 bindestreck. |
| **internal_label** | singleLineText | Marknadsförarens egna namn på sidan. |
| **internal_notes** | multilineText | Redaktörsnotering. **Inkludera ej i Claudes output.** |
| **h1** | singleLineText | Sidans huvudrubrik. Default-källa för hero-sektionens fallback-h1. |
| **seo_title** | singleLineText | |
| **seo_description** | multilineText | |
| **og_image_url** | url | |
| **is_published** | checkbox | Ska ALLTID inkluderas. Sidan visas bara publikt när `true`. |
| **country_ids** | multipleRecordLinks | Array av core_countries-record-IDs. Backend echo:ar arrayen. |
| **division_ids** | multipleRecordLinks | Array av core_divisions-record-IDs. Backend echo:ar. |
| **page_theme** | singleSelect | `light` eller `dark`. Default `light`. Sektioner med `theme=inherit` ärver detta. |
| **max_width** | singleSelect | `narrow` / `normal` / `wide` / `full`. Default `normal`. |
| **section_ids** | multipleRecordLinks | **Inkludera ej i Claudes output.** Backend hanterar länkning efter att sektionerna skrivits. |

---

## Tabell 2: cms_page_sections (polymorf)

**Table ID:** `tblWDvAe3s45P2Nok`

`section_type` är diskriminator. För varje record skriver vi de universella
fälten + den uppsättning prefixerade fält som hör till `section_type`. Fält
för andra typer **utelämnas** (skickas inte). Backend rensar inte stale-fält
mellan typer (sidor byter sällan typ på en sektion — om det händer raderas
sektionen och en ny skapas).

### Universella fält (för ALLA section_type)

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **section_type** | singleSelect | `hero` / `text_image` / `text_only` / `company_data_strip` / `news_text_split` / `case_grid` / `news_grid` / `catalog` / `tabs` / `team_grid` / `partner_list` / `faq` / `testimonial` / `cta_banner` / `contact_form`. Ska ALLTID inkluderas. |
| **internal_label** | singleLineText | |
| **internal_notes** | multilineText | **Inkludera ej.** |
| **is_active** | checkbox | Ska ALLTID inkluderas. |
| **order** | number | Sätt = `_clientIndex + 1` (1-baserad). Ska ALLTID inkluderas. |
| **anchor_id** | singleLineText | Optional CSS id för sektionen. |
| **layout** | singleSelect | `contained` (default) / `full_bleed` / `narrow`. Ska ALLTID inkluderas. |
| **theme** | singleSelect | `light` / `dark` / `inherit` (ärv från sidan). Ska ALLTID inkluderas. |
| **top_padding** | singleSelect | `none` / `sm` / `md` (default) / `lg`. Ska ALLTID inkluderas. |
| **bottom_padding** | singleSelect | `none` / `sm` / `md` (default) / `lg`. Ska ALLTID inkluderas. |
| **page_ids** | multipleRecordLinks | **Inkludera ej.** Backend länkar via cms_pages.section_ids. |
| **tabs_tab_ids** | multipleRecordLinks | **Inkludera ej.** Backend länkar tabs efter att de skrivits. |

### Type-specifika fält per `section_type`

#### hero (prefix `hero_`)
| Fält | Typ |
|---|---|
| hero_eyebrow | singleLineText |
| hero_h1 | singleLineText |
| hero_subtitle | multilineText |
| hero_image_url | url |
| hero_cta_text | singleLineText |
| hero_cta_url | url |
| hero_cta2_text | singleLineText |
| hero_cta2_url | url |

#### text_image (prefix `ti_`)
| Fält | Typ |
|---|---|
| ti_eyebrow | singleLineText |
| ti_h2 | singleLineText |
| ti_body | multilineText |
| ti_bullets | multilineText (en per rad) |
| ti_image_url | url |
| ti_image_alt | singleLineText |
| ti_reversed | checkbox — ALLTID inkluderas |
| ti_cta_text | singleLineText |
| ti_cta_url | url |
| ti_cta2_text | singleLineText |
| ti_cta2_url | url |

#### text_only (prefix `to_`)
| Fält | Typ |
|---|---|
| to_eyebrow | singleLineText |
| to_h2 | singleLineText |
| to_body | multilineText |
| to_align | singleSelect (`left` / `center`) — ALLTID inkluderas |

#### company_data_strip (prefix `cds_`)
| Fält | Typ |
|---|---|
| cds_h2 | singleLineText |
| cds_use_company_singleton | checkbox — ALLTID inkluderas |
| cds_country_code | singleLineText |
| cds_items | multilineText (format: `värde \| label` per rad) |

#### news_text_split (prefix `nts_`)
| Fält | Typ |
|---|---|
| nts_eyebrow | singleLineText |
| nts_h2 | singleLineText |
| nts_body | multilineText |
| nts_cta_text | singleLineText |
| nts_cta_url | url |
| nts_news_manual_ids | multipleRecordLinks (articles) — array av rec... |
| nts_scope_division | singleLineText |
| nts_scope_country | singleLineText |
| nts_limit | number — `0`/tom = obegränsat. Vid CREATE: utelämna när `0`. Vid UPDATE: skicka `null` när `0`. |

#### case_grid (prefix `cg_`)
| Fält | Typ |
|---|---|
| cg_eyebrow | singleLineText |
| cg_h2 | singleLineText |
| cg_body | multilineText |
| cg_case_manual_ids | multipleRecordLinks (case_pages) |
| cg_scope_country | singleLineText |
| cg_scope_division | singleLineText |
| cg_scope_customer_type | singleLineText |
| cg_limit | number — samma regel som nts_limit |
| cg_columns | singleSelect (`2` / `3` / `4`) — ALLTID inkluderas |

#### news_grid (prefix `ng_`)
| Fält | Typ |
|---|---|
| ng_eyebrow | singleLineText |
| ng_h2 | singleLineText |
| ng_article_manual_ids | multipleRecordLinks (articles) |
| ng_scope_country | singleLineText |
| ng_scope_division | singleLineText |
| ng_scope_topic | singleLineText |
| ng_limit | number — samma regel som nts_limit |
| ng_columns | singleSelect (`2` / `3` / `4`) — ALLTID inkluderas |

#### catalog (prefix `cat_`)
| Fält | Typ |
|---|---|
| cat_eyebrow | singleLineText |
| cat_h2 | singleLineText |
| cat_intro_body | multilineText |
| cat_include_products | checkbox — ALLTID inkluderas |
| cat_include_articles | checkbox — ALLTID inkluderas |
| cat_scope_division | singleLineText |
| cat_scope_country | singleLineText |
| cat_facet_fields | multilineText (en per rad) |
| cat_placeholder | singleLineText |
| cat_empty_text | singleLineText |

#### tabs (prefix `tabs_`)
| Fält | Typ |
|---|---|
| tabs_eyebrow | singleLineText |
| tabs_h2 | singleLineText |
| tabs_intro_body | multilineText |

Sub-records för fliken: se Tabell 3 (cms_section_tabs).
**INKLUDERA INTE `tabs_tab_ids`** i sections.fields — backend länkar.

#### team_grid (prefix `tg_`)
| Fält | Typ |
|---|---|
| tg_eyebrow | singleLineText |
| tg_h2 | singleLineText |
| tg_body | multilineText |
| tg_variant | singleSelect (`cards` / `rack` / `compact`) — ALLTID inkluderas |
| tg_coworker_manual_ids | multipleRecordLinks (core_coworkers) |
| tg_scope_country | singleLineText |
| tg_scope_division | singleLineText |
| tg_limit | number — samma regel som nts_limit |

#### partner_list (prefix `pl_`)
| Fält | Typ |
|---|---|
| pl_eyebrow | singleLineText |
| pl_h2 | singleLineText |
| pl_body | multilineText |
| pl_variant | singleSelect (`marquee` / `grid` / `list`) — ALLTID inkluderas |
| pl_partner_manual_ids | multipleRecordLinks (core_partners) |
| pl_scope_division | singleLineText |
| pl_scope_country | singleLineText |
| pl_limit | number — samma regel som nts_limit |

#### faq (prefix `faq_`)
| Fält | Typ |
|---|---|
| faq_eyebrow | singleLineText |
| faq_h2 | singleLineText |
| faq_body | multilineText |
| faq_items | multilineText. Format: `Q: Fråga\nA: Svar\n\nQ: Fråga 2\nA: Svar 2` (tom rad mellan QA-par). Om input redan är i formatet: låt vara. |

#### testimonial (prefix `t_`)
| Fält | Typ |
|---|---|
| t_eyebrow | singleLineText |
| t_quote | multilineText |
| t_author_name | singleLineText |
| t_author_title | singleLineText |
| t_author_image_url | url |
| t_testimonial_manual_ids | multipleRecordLinks (core_testimonials) |
| t_scope_country | singleLineText |
| t_scope_division | singleLineText |
| t_scope_customer_type | singleLineText |
| t_featured_only | checkbox — ALLTID inkluderas |

#### cta_banner (prefix `cta_`)
| Fält | Typ |
|---|---|
| cta_eyebrow | singleLineText |
| cta_h2 | singleLineText |
| cta_body | multilineText |
| cta_cta_text | singleLineText |
| cta_cta_url | url |
| cta_cta2_text | singleLineText |
| cta_cta2_url | url |
| cta_image_url | url |

#### contact_form (prefix `cf_`)
| Fält | Typ |
|---|---|
| cf_eyebrow | singleLineText |
| cf_title | singleLineText |
| cf_subtitle | multilineText |
| cf_layout | singleSelect (`split` / `centered`) — ALLTID inkluderas |
| cf_show_company | checkbox — ALLTID inkluderas |
| cf_show_phone | checkbox — ALLTID inkluderas |
| cf_show_dropdown | checkbox — ALLTID inkluderas |
| cf_dropdown_label | singleLineText |
| cf_options | multilineText (en per rad) |
| cf_cta_text | singleLineText |
| cf_message_label | singleLineText |
| cf_trust_signals | multilineText (`**Bold** \| Resten`, max 3) |
| cf_show_contact_person | checkbox — ALLTID inkluderas |
| cf_contact_scope_country | singleLineText |
| cf_contact_scope_division | singleLineText |

---

## Tabell 3: cms_section_tabs

**Table ID:** `tblxEtcLO4N9k83rn`

Sub-records för `tabs`-section-typen. En record per flik. Backend länkar
dem till parent-sektionen via tabs_tab_ids EFTER att de skapats — INKLUDERA
INTE `section_ids` i tabs.fields.

| Fältnamn | Typ |
|---|---|
| name | singleLineText |
| internal_notes | multilineText — **Inkludera ej.** |
| is_active | checkbox — ALLTID inkluderas |
| order | number — sätt = `_clientIndex + 1`. ALLTID inkluderas |
| eyebrow | singleLineText |
| h2 | singleLineText |
| body | multilineText |
| bullets | multilineText (en per rad) |
| image_url | url |
| image_alt | singleLineText |
| cta_text | singleLineText |
| cta_url | url |
| cta2_text | singleLineText |
| cta2_url | url |
| section_ids | multipleRecordLinks — **Inkludera ej.** Backend länkar. |

---

## Formateringsregler

1. **Utelämna tomma textfält** vid CREATE (tomma strängar, null). Vid UPDATE:
   skicka tomma textfält som `""` så Airtable rensar dem.

2. **Boolean-fält** (alla som är markerade "ALLTID inkluderas") ska skickas
   även när `false` — annars ärver Airtable det gamla värdet vid PATCH.

3. **singleSelect-fält** (alla som är markerade "ALLTID inkluderas") ska
   skickas även om värdet är default — bevara aktuellt värde.

4. **Number-fält** (`nts_limit`, `cg_limit`, `ng_limit`, `pl_limit`,
   `tg_limit`): skicka som number om > 0. Vid CREATE: utelämna när `0`/tom.
   Vid UPDATE: skicka `null` när `0`/tom.

5. **Linked-record-fält** (`*_manual_ids`, `country_ids`, `division_ids`):
   skicka som array av string rec-IDs. Backend echo:ar dem. Vid UPDATE:
   skicka även tom array `[]` så Airtable rensar.

6. **`order`-fältet** (på sektioner och tabs): sätt alltid till
   `_clientIndex + 1` så Airtable speglar UI-ordningen för manual editing.

7. **Aldrig inkludera dessa fält** (backend hanterar):
   - `cms_pages.section_ids`
   - `cms_page_sections.page_ids`
   - `cms_page_sections.tabs_tab_ids`
   - `cms_section_tabs.section_ids`
   - `internal_notes` (alla tabeller)
