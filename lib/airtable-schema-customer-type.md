# Airtable Schema — Wexoe Customer Type Pages

**Base ID:** `appokKSTaBdCa8YiW` (Wexoe NY)

Detta schema används av Claude-middlemannen för att transformera
state-JSON till Airtable-fältnamn när en Kundtyp-sida (Customer Type Page,
tidigare "Audience") skapas eller uppdateras via buildern. snake_case
överallt — både i Airtable display-namn och här.

Sidtypen har bara en tabell — `cms_customer_type_pages`. Inga child-records.

---

## Tabell 1: cms_customer_type_pages

**Table ID:** `tblZufoWVNKPuJdMK`

Huvudrecorden. Flatt schema med hero + värdeproposition + contact-form-fält.

| Fältnamn | Typ | Kommentar |
|---|---|---|
| **slug** | singleLineText | Primary key. URL-slug, lowercase a-z, 0-9, bindestreck. |
| **internal_notes** | multilineText | Redaktörs-notering. **Inkludera ej i Claudes output.** |
| **is_active** | checkbox | Ska ALLTID inkluderas, även `false`. |
| **name** | singleLineText | Internt label/display-namn ("Installatör", "OEM"). |
| **eyebrow** | singleLineText | Liten label ovanför hero-titel. |
| **title** | singleLineText | Hero-rubrik (motsvarar `h1` på andra sidtyper). |
| **description** | multilineText | Brödtext i hero. |
| **cta_text** | singleLineText | Primär CTA-knapp. |
| **cta_url** | singleLineText | Länk för primär CTA. |
| **hero_image_url** | singleLineText | URL till hero-bild. |
| **stat_number** | number | Stat-bricka tal. Tom sträng → utelämna vid CREATE, `null` vid UPDATE. |
| **stat_label** | singleLineText | Label under stat-talet. |
| **value_h2** | singleLineText | Rubrik i värdeproposition-sektionen. |
| **value_text_1** | multilineText | Brödtext, första kolumnen. |
| **value_text_2** | multilineText | Brödtext, andra kolumnen. |
| **benefit_1** | singleLineText | Bullet #1. |
| **benefit_2** | singleLineText | Bullet #2. |
| **benefit_3** | singleLineText | Bullet #3. |
| **country_ids** | multipleRecordLinks | core_countries-länk. **Inkludera ej — backend rör inte fältet.** |
| **customer_type_ids** | multipleRecordLinks | Self-/cross-länk. **Inkludera ej.** |
| **case_ids** | multipleRecordLinks | cms_cases-länk. Read-only i buildern — **inkludera ej.** |

---

## Formateringsregler

1. **Utelämna tomma fält** (tomma strängar, null) vid CREATE. Vid UPDATE
   skickas tomma textfält som `""` så Airtable rensar dem — Claude ska
   alltså emittera dem även om värdet är tomt vid UPDATE.

2. **Boolean-fält** (`is_active`, `show_contact_form`, alla
   `contact_form_show_*`-checkboxes) ska ALLTID inkluderas, även `false`.

3. **stat_number** är ett Airtable number-fält. Skicka ett `number` om
   värdet är ifyllt. Vid CREATE: utelämna när tomt. Vid UPDATE: skicka
   `null` när tomt så Airtable rensar fältet.

4. **Linkade records** (`country_ids`, `customer_type_ids`, `case_ids`):
   **Inkludera ALDRIG** i Claudes output. Backend rör dem inte i denna
   sidtyp — länkning sker via Airtable UI.

5. **Contact Form-fält:** Alla 15 `contact_form_*`-fält ska ALLTID inkluderas
   i `customerTypePage`-objektet vid UPDATE (även tomma eller false) så att
   ingen data tappas vid en partial save. `contact_form_layout` =
   `split` eller `centered`. `contact_form_theme` = `dark` eller `light`.
   `contact_form_trust_signals` format: `**Bold** | Resten` per rad, max 3.

---

## Contact Form-fält (cms_customer_type_pages-tabellen)

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
