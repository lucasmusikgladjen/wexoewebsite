# Airtable Schema — Wexoe Unique Pages

**Base ID:** `appokKSTaBdCa8YiW` (Wexoe NY)

Detta schema används av Claude-middlemannen för att transformera
state-JSON till Airtable-fältnamn när en "egen sida" (Unique Page —
om-oss, karriär, etc.) skapas eller uppdateras via buildern. snake_case
överallt.

Sidtypen har bara en tabell — `cms_unique_pages`. Inga child-records;
country/division är multipleRecordLinks-fält direkt på huvud-recorden.

---

## Tabell 1: cms_unique_pages

**Table ID:** `tblpAM1wZWDbrpeai`

Flatt schema med metadata + en uppsättning section-block (hero, text-image
A/B, text-only, faq, team-grid, partners-marquee, testimonial-card,
cta-banner, contact-form). Varje block har ett `show_*`-fält som styr om
sektionen visas.

### Metadata

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **slug** | singleLineText | Primary key. URL-slug, lowercase a-z, 0-9, bindestreck. |
| **h1** | singleLineText | Sidans huvudrubrik. Default-källa för hero `h1_override`. |
| **seo_title** | singleLineText | Valfri SEO-rubrik. |
| **seo_description** | multilineText | Valfri meta-description. |
| **og_image_url** | url | Open Graph-bild-URL. |
| **is_published** | checkbox | Ska ALLTID inkluderas. Sidan visas bara publikt när `true`. |
| **country_ids** | multipleRecordLinks | Array av core_countries-record-IDs. **Backend echo:ar arrayen rakt av — skicka den vidare som array av string-IDs.** |
| **division_ids** | multipleRecordLinks | Array av core_divisions-record-IDs. Samma som ovan. |
| **internal_notes** | multilineText | Redaktörs-notering. **Inkludera ej i Claudes output.** |

### Hero-sektion

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_hero** | checkbox | Ska ALLTID inkluderas. |
| **hero_eyebrow** | singleLineText | |
| **hero_h1_override** | singleLineText | Override av `h1` i hero-blocket (fallback: `h1`). |
| **hero_subtitle** | multilineText | |
| **hero_image_url** | singleLineText | URL. |
| **hero_cta_text** | singleLineText | |
| **hero_cta_url** | url | |
| **hero_theme** | singleSelect | `dark` eller `light`. |

### Text-image A

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_text_image_a** | checkbox | Ska ALLTID inkluderas. |
| **text_image_a_h2** | singleLineText | |
| **text_image_a_body** | multilineText | |
| **text_image_a_image_url** | singleLineText | URL. |
| **text_image_a_reversed** | checkbox | Bild vänster, text höger. Ska ALLTID inkluderas. |
| **text_image_a_theme** | singleSelect | `dark` eller `light`. |

### Text-image B

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_text_image_b** | checkbox | Ska ALLTID inkluderas. |
| **text_image_b_h2** | singleLineText | |
| **text_image_b_body** | multilineText | |
| **text_image_b_image_url** | singleLineText | URL. |
| **text_image_b_reversed** | checkbox | Ska ALLTID inkluderas. |
| **text_image_b_theme** | singleSelect | `dark` eller `light`. |

### Text-only

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_text_only** | checkbox | Ska ALLTID inkluderas. |
| **text_only_h2** | singleLineText | |
| **text_only_body** | multilineText | |
| **text_only_align** | singleSelect | `left` eller `center`. |

### FAQ

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_faq** | checkbox | Ska ALLTID inkluderas. |
| **faq_h2** | singleLineText | |
| **faq_items** | multilineText | `Q: Fråga\nA: Svar\n\nQ: Fråga 2\nA: Svar 2` (tom rad separerar). |

### Team Grid

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_team_grid** | checkbox | Ska ALLTID inkluderas. |
| **team_grid_h2** | singleLineText | |
| **team_grid_scope_division** | singleLineText | Filter — division-namn eller record-id som scope. |
| **team_grid_scope_country** | singleLineText | Filter — country-namn eller record-id. |
| **team_grid_limit** | number | Max antal teammedlemmar att visa. `0` / tom = ingen gräns. Tom sträng → utelämna vid CREATE, `null` vid UPDATE. |

### Partners Marquee

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_partners_marquee** | checkbox | Ska ALLTID inkluderas. |
| **partners_marquee_h2** | singleLineText | |
| **partners_marquee_scope_division** | singleLineText | |
| **partners_marquee_scope_country** | singleLineText | |

### Testimonial Card

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_testimonial_card** | checkbox | Ska ALLTID inkluderas. |
| **testimonial_scope_customer_type** | singleLineText | |
| **testimonial_scope_division** | singleLineText | |
| **testimonial_scope_country** | singleLineText | |

### CTA Banner

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **show_cta_banner** | checkbox | Ska ALLTID inkluderas. |
| **cta_banner_h2** | singleLineText | |
| **cta_banner_body** | multilineText | |
| **cta_banner_cta_text** | singleLineText | |
| **cta_banner_cta_url** | url | |
| **cta_banner_theme** | singleSelect | `dark` eller `light`. |

---

## Formateringsregler

1. **Utelämna tomma fält** (tomma strängar, null) vid CREATE. Vid UPDATE
   skicka tomma textfält som `""` så Airtable rensar dem — Claude ska
   alltså emittera dem även om värdet är tomt vid UPDATE.

2. **Boolean-fält** (`is_published`, alla `show_*`-block-toggles,
   `text_image_a_reversed`, `text_image_b_reversed`, `show_contact_form`,
   alla `contact_form_show_*`-checkboxes) ska ALLTID inkluderas, även
   när `false`.

3. **singleSelect-fält** (alla `*_theme`, `text_only_align`):
   `hero_theme`, `text_image_a_theme`, `text_image_b_theme`,
   `cta_banner_theme`, `contact_form_theme` är `dark`/`light`.
   `text_only_align` är `left`/`center`. `contact_form_layout` är
   `split`/`centered`. Ska ALLTID inkluderas — skicka det aktuella
   värdet.

4. **team_grid_limit** är ett Airtable number-fält. Skicka ett `number`
   om värdet är > 0. Tom/0: utelämna vid CREATE, `null` vid UPDATE.

5. **faq_items** ska ha varje fråga prefixad med `Q: ` och varje svar
   med `A: `. Separera QA-par med en blank rad. Om input redan är i det
   formatet — låt det vara. Om input är freeform-radbruten lista, normalisera.

6. **country_ids / division_ids**: skicka som array av string-IDs.
   Backend hanterar inte arrayen åt dig — utelämna inte fältet vid UPDATE.

7. **Contact Form-fält:** Alla 15 `contact_form_*`-fält ska ALLTID inkluderas
   i `uniquePage`-objektet vid UPDATE (även tomma eller false) så ingen
   data tappas i en partial save. `contact_form_trust_signals` format:
   `**Bold** | Resten` per rad, max 3.

---

## Contact Form-fält (cms_unique_pages-tabellen)

Samma 15 fält som i Landing Pages / Product Areas, renderas av
`\Wexoe\Core\Renderers\ContactForm` sist på sidan när
`show_contact_form` = true.

| Fältnamn | Typ |
|---|---|
| `show_contact_form` | checkbox |
| `contact_form_eyebrow` | singleLineText |
| `contact_form_title` | singleLineText |
| `contact_form_subtitle` | multilineText |
| `contact_form_layout` | singleSelect (`split` / `centered`) |
| `contact_form_theme` | singleSelect (`dark` / `light`) |
| `contact_form_show_company` | checkbox |
| `contact_form_show_phone` | checkbox |
| `contact_form_show_dropdown` | checkbox |
| `contact_form_dropdown_label` | singleLineText |
| `contact_form_options` | multilineText (en per rad) |
| `contact_form_cta_text` | singleLineText |
| `contact_form_message_label` | singleLineText |
| `contact_form_trust_signals` | multilineText (`**Bold** \| Text`, max 3) |
| `contact_form_show_contact_person` | checkbox |
