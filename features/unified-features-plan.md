# Wexoe enhetlig utvecklingsplan: SSOT, unika sidor och kontaktformulär

**Status:** Beslutad — redo för implementation
**Senast uppdaterad:** 2026-05-13
**Branch (båda repos):** `claude/plan-wexoe-features-5OxPZ`
**Airtable-baser:** `Wexoe NY` (`appokKSTaBdCa8YiW`) — SSOT/CMS. `Wexoe` (`appXoUcK68dQwASjF`) — sid-data (kvarstår).
**Ersätter (efter konsolidering):** `ssotanduniquepagesplan.md`, `contactformintegrationbuilder.md`, `contactformintegrationplugins.md`.

Detta dokument är skrivet för att läsas och utföras av en LLM-agent. Varje fas är självstående med beroenden, konkreta artefakter, kodexempel och valideringar. Implementera faserna i ordning. Hoppa inte över valideringssteg.

---

## Innehåll

1. [Leveransvärden per fas](#1-leveransvärden-per-fas)
2. [Designprinciper](#2-designprinciper)
3. [Arkitektur](#3-arkitektur)
4. [Synergier mellan de tre planerna](#4-synergier-mellan-de-tre-planerna)
5. [Datamodell — vad som ändras var](#5-datamodell--vad-som-ändras-var)
6. [Fasplan](#6-fasplan)
   - [Fas 0 — Builder-grund: BuilderShell + section-typer](#fas-0--builder-grund-buildershell--section-typer)
   - [Fas 1 — Airtable-städning och cms-tabell-design](#fas-1--airtable-städning-och-cms-tabell-design)
   - [Fas 2 — Wexoe Core: SSOT-scheman + Helpers](#fas-2--wexoe-core-ssot-scheman--helpers)
   - [Fas 3 — Wexoe Core: REST CRUD för SSOT](#fas-3--wexoe-core-rest-crud-för-ssot)
   - [Fas 4 — Builder: `/globals/*` för SSOT-redigering](#fas-4--builder-globals-för-ssot-redigering)
   - [Fas 5 — Tier 2: grundinfrastruktur](#fas-5--tier-2-grundinfrastruktur)
   - [Fas 6 — Sektion-bibliotek wave 1](#fas-6--sektion-bibliotek-wave-1)
   - [Fas 7 — Sektion `contact-form` (renderer + handler + editor)](#fas-7--sektion-contact-form-renderer--handler--editor)
   - [Fas 8 — Per-plugin: contact-form i LP/PA/Audience](#fas-8--per-plugin-contact-form-i-lppaaudience)
   - [Fas 9 — Builder: ContactFormEditor i LP/PA/Audience](#fas-9--builder-contactformeditor-i-lppaaudience)
   - [Fas 10 — Globals-driven defaults i LP/PA](#fas-10--globals-driven-defaults-i-lppa)
   - [Fas 11 — Polish och deprecation](#fas-11--polish-och-deprecation)
7. [Risker och mitigations](#7-risker-och-mitigations)
8. [Designbeslut tagna](#8-designbeslut-tagna)
9. [Öppna frågor](#9-öppna-frågor)
10. [Bilagor](#10-bilagor)

---

## 1. Leveransvärden per fas

| Efter fas | Vad fungerar |
|---|---|
| Fas 0 | Audience-buildern använder delad shell. Section-registry-skelett finns. Ingen funktionell ändring för redaktör. |
| Fas 2 | Wexoe Core kan läsa alla 8 SSOT-tabeller och 2 CMS-tabeller. PHP-helpers fungerar. |
| Fas 4 | Redaktörer kan redigera alla SSOT-data i builder. Ingen Airtable-direktåtkomst behövs. |
| Fas 5 | Tomma Tier 2-sidor kan skapas och rendreras med 0 sektioner. Infrastrukturen finns. |
| Fas 6 | En "om-oss"-sida kan byggas helt i builder med 7 sektion-typer (varav 3 SSOT-drivna). |
| Fas 7 | Kontaktformulär-sektion fungerar på Tier 2-sidor. Submissions hamnar i `User data`. |
| Fas 9 | LP/PA/Audience har integrerat kontaktformulär. Gamla `[wexoe_contact_form]`-shortcoden kan ersättas. |
| Fas 10 | Nya LP/PA förfylls med default-coworker. |
| Fas 11 | `Old plugins/wexoe-contact-form.php` deprecated. SEO-meta + audit-länkar på plats. |

Varje fas är ett potentiellt deploy-tillfälle. Faser kan inte hoppas över men efterföljande faser kan pausas utan att tidigare leveranser bryts.

---

## 2. Designprinciper

1. **DRY mellan unika sidor och kontaktform.** Kontaktformuläret är en sektion-typ i samma bibliotek som hero/text-image/team-grid. En renderer, en handler, två konsumenter (Tier 2-sidor + LP/PA/Audience).
2. **SSOT är data, inte UI.** core-tabeller lagrar fakta. Plugins och sektioner *konsumerar* SSOT via Wexoe Core. Builder *redigerar* SSOT via REST.
3. **Wexoe Core äger renderer-registry.** Sektioner registreras via `wexoe_section_register($type, $callable)`-mönstret. Pluginen `wexoe-sections` levererar standardbiblioteket; tredje part kan utöka.
4. **Två page-renderer-strategier samexisterar.** Dedikerade (LP/PA/Audience) renderar med pluginen som idag och *inkorporerar* sektioner punktvis (t.ex. kontaktform sist). Tier 2 (cms_unique_pages) renderar genom att loopa sektioner.
5. **Tre roller per SSOT-tabell.** Singleton (1 record per scope + `Is Default`-fallback), Collection (många records med scope-länkar), Taxonomy (referensdata).
6. **Country/Division-scope finns från dag 1.** Även om bara `SE` används initialt — schemat ska ej migreras senare.
7. **Defaults i PHP, override i Airtable.** Tomma SSOT-fält faller tillbaka på vettiga PHP-defaults. Implementationen kräver inte att Airtable är fullt populerat för att fungera.
8. **Soft-delete via `Active`.** Hård-delete inte i builder för SSOT. Records som "tas bort" markeras `Active = false` och döljs i renderingen.
9. **Inga tidsangivelser i denna plan.** Faser har beroenden, inte deadlines.

---

## 3. Arkitektur

```
┌─────────────────────────────────────────┐       ┌──────────────────────────────────────────────┐
│ Web-editor (Next.js, Vercel)            │       │ WordPress                                    │
│                                         │       │                                              │
│  /globals/*       — SSOT-editor         │       │   wexoe-core ──► Cache (transients)          │
│  /editor/unique   — CMS-editor (Tier 2) │       │      │                                       │
│  /editor/...      — LP/PA/Audience      │       │      ├─► wexoe-landing-page                  │
│                                         │       │      ├─► wexoe-product-area                  │
└───────────────┬─────────────────────────┘       │      ├─► wexoe-audience-hero                 │
                │                                 │      ├─► wexoe-page    (Tier 2 shortcode)    │
                │ REST writes + reads             │      ├─► wexoe-sections (section renderers)  │
                ▼                                 │      ├─► wexoe-contact-page (oförändrad)     │
┌─────────────────────────────────────────┐       │      └─► wxcf AJAX-handler  → User data      │
│ Airtable                                │       │                                              │
│                                         │◄──────┤                                              │
│  Wexoe NY (appokKSTaBdCa8YiW)           │ reads │                                              │
│   • core_*  (SSOT)                      │       │                                              │
│   • cms_*   (CMS unika sidor)           │       │                                              │
│                                         │       │                                              │
│  Wexoe (appXoUcK68dQwASjF)              │       │                                              │
│   • Landing Pages / Product Areas /     │       │                                              │
│     Audience Heroes / User data         │       │                                              │
└─────────────────────────────────────────┘       └──────────────────────────────────────────────┘
```

Två-bas-modellen är medveten: gamla Wexoe-basen är "live" och innehåller sid-data + submissions. Wexoe NY är ny och innehåller plattformsdata (SSOT) + Tier 2-sid-data. Migrationer mellan baser görs *inte* i denna plan.

---

## 4. Synergier mellan de tre planerna

Tre planer slås ihop. Följande dubbelarbete elimineras:

| Dubbelarbete identifierat | Lösning i denna plan |
|---|---|
| Båda planer förespråkar BuilderShell-extraktion | Görs en gång i Fas 0. Alla efterföljande sektioner använder den. |
| Båda planer kräver nya Wexoe Core-hjälpare och boot-ändringar | Konsolideras i Fas 2 (boot rörs en gång). |
| Båda planer kräver Claude-prompt-uppdatering (`airtable-schema-lp.md` + `-pa.md`) | Görs en gång i Fas 9 med alla nya fält samtidigt. |
| Kontaktformulär-renderaren skulle skapas som `wexoe-core/src/ContactForm/Renderer.php` | Skapas i stället som sektion `contact-form` i `wexoe-sections`-pluginen (Fas 7). Används både av Tier 2 *och* LP/PA/Audience. |
| Båda planer rör cache-invalidering | En endpoint, byggs i Fas 3. |
| Båda planer planerar editor-sektioner i builder | Samma `lib/sections/registry.ts`-mönster används för Tier 2-sektioner *och* för ContactFormEditor i LP/PA/Audience. |
| Båda planer behöver Country/Division-helpers | `Wexoe\Core\Helpers\Context` (Fas 2) används av båda. |

**Konsekvens:** Tier 2 (composition-bygge) levereras *före* kontaktform-integrationen, för att kontaktformuläret ska vara den första "riktiga" sektionen i biblioteket istället för en separat modul.

---

## 5. Datamodell — vad som ändras var

### 5.1 Airtable `Wexoe NY` (`appokKSTaBdCa8YiW`)

**Befintligt (verifierat):** 8 core-tabeller med korrekta fält men tomma/glesa records, samt 8 cms-placeholders med default-mall-fält som behöver omdesignas.

**Ändringar i denna plan:**

| Tabell | Åtgärd | Fas |
|---|---|---|
| `core_company` | Lägg `Hours Mon-Fri`, `Hours Saturday`, `Hours Sunday`, `Hours Lunch`, `Hours Override` (multilineText). Populera SE-default-record. | 1 |
| `core_graphic_profile` | Populera default-record (1 record med `Is Default = true`). | 1 |
| `core_countries` | Populera SE-record med Domain + `Is Default`-flagga via `Active = true` på SE. | 1 |
| `core_divisions` | Populera initiala divisioner (industri, automation, kassasystem). | 1 |
| `core_customer_types` | Populera initiala (industri, bygg, offentlig). | 1 |
| `core_coworkers` | Inga schema-ändringar. Populeras av redaktör senare via `/globals/coworkers`. | 4 |
| `core_partners` / `core_testimonials` | Inga schema-ändringar. | 4 |
| `cms_landing_pages` etc. (placeholders) | **Radera** dessa 8 placeholder-tabeller. De är inte rätt mental-modell. | 1 |
| `cms_unique_pages` (ny) | Skapa: `Slug` (primary, unique), `H1`, `SEO Title`, `SEO Description`, `OG Image URL` (url), `Published` (checkbox), `Country` (link → `core_countries`), `Sections` (länkfält till `cms_page_sections`, reverse). | 5 |
| `cms_page_sections` (ny) | Skapa: `Name` (formula `{Type} {Order}`), `Unique Page` (link → `cms_unique_pages`), `Order` (number), `Type` (singleSelect: `hero`, `text-image`, `text-only`, `cta-banner`, `faq`, `team-grid`, `partner-marquee`, `testimonial-card`, `contact-form`), `Data JSON` (multilineText), `Active` (checkbox, default true). | 5 |

### 5.2 Airtable `Wexoe` (`appXoUcK68dQwASjF`)

**Befintligt (verifierat):**
- Landing Pages (`tbl8KDqGq0Ray1uqS`), Product Areas (`tblgatNFYFMwF4EcQ`), Audience Heroes (`tblvNf1CqAYEFvTpu`), User data (`tblxrwMhSysupcDwe`).
- `User data.Submission Type` har redan värdet `contact`. ✓

**Ändringar i denna plan:**

Lägg till följande fält i `Landing Pages`, `Product Areas` och `Audience Heroes` (samma uppsättning, en gång per tabell):

| Airtable-fältnamn | Typ | Default | Not |
|---|---|---|---|
| `Show Contact Form` | checkbox | false | |
| `Contact Form Eyebrow` | singleLineText | — | |
| `Contact Form Title` | singleLineText | — | Tom → PHP-default "Prata med någon som kan automation". |
| `Contact Form Subtitle` | multilineText | — | |
| `Contact Form Layout` | singleSelect (`split`, `centered`) | `split` | |
| `Contact Form Theme` | singleSelect (`dark`, `light`) | `dark` | |
| `Contact Form Show Company` | checkbox | true | |
| `Contact Form Show Phone` | checkbox | true | |
| `Contact Form Show Dropdown` | checkbox | true | |
| `Contact Form Dropdown Label` | singleLineText | — | |
| `Contact Form Options` | multilineText | — | En per rad. Tom → PHP-default. |
| `Contact Form CTA Text` | singleLineText | — | Default "Skicka". |
| `Contact Form Message Label` | singleLineText | — | |
| `Contact Form Trust Signals` | multilineText | — | Format `**Bold** \| Resten`, en per rad, max 3. |
| `Contact Form Show Contact Person` | checkbox | true | |

Skapas i Fas 8 (Airtable-fält först, sedan schema-utökning, sedan plugin-integration).

### 5.3 Wexoe Core-scheman (PHP)

| Schemafil | Åtgärd | Fas |
|---|---|---|
| `wexoe-core/entities/core_company.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_graphic_profile.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_countries.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_divisions.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_customer_types.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_coworkers.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_partners.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/core_testimonials.php` (ny) | Skapa | 2 |
| `wexoe-core/entities/cms_unique_pages.php` (ny) | Skapa | 5 |
| `wexoe-core/entities/cms_page_sections.php` (ny) | Skapa | 5 |
| `wexoe-core/entities/landing_pages.php` (utökas) | Lägg `contact_form_*` domain-keys | 8 |
| `wexoe-core/entities/product_areas.php` (utökas) | Samma | 8 |
| `wexoe-core/entities/audience_heroes.php` (utökas) | Samma | 8 |

---

## 6. Fasplan

### Fas 0 — Builder-grund: BuilderShell + section-typer

**Beroenden:** inga.

**Mål:** Extrahera duplicerad plumbing från LP/PA/Audience till en delad `BuilderShell`. Lägg grund för section-registry som Tier 2 och kontaktform använder.

**Konkreta artefakter:**

1. `wexoebuilder/components/BuilderShell.tsx` (ny) — props: `{ toolbar, editorPanel, previewPanel, scrollSync }`. Innehåller layout (split 65/35), publish-knapp, error/saved-banners. Tar emot toolbar och paneler som children.
2. `wexoebuilder/lib/sections/types.ts` (ny):
   ```ts
   export type SectionTypeId =
     | 'hero' | 'text-image' | 'text-only' | 'cta-banner' | 'faq'
     | 'team-grid' | 'partner-marquee' | 'testimonial-card' | 'contact-form';

   export interface SectionInstance<TData = unknown> {
     id: string;
     recordId?: string;
     type: SectionTypeId;
     order: number;
     data: TData;
   }

   export interface SectionTypeDescriptor<TData = unknown> {
     id: SectionTypeId;
     label: string;
     defaultData: TData;
     EditorComponent: React.FC<{ data: TData; onChange: (d: TData) => void; context?: SectionEditorContext }>;
     PreviewComponent: React.FC<{ data: TData; theme: 'dark' | 'light' }>;
     phpRendererSlug: string;
     ssotDriven?: boolean;
   }

   export interface SectionEditorContext {
     country?: string;
     division?: string;
   }
   ```
3. `wexoebuilder/lib/sections/registry.ts` (ny) — tom export:
   ```ts
   export const SECTION_REGISTRY: Partial<Record<SectionTypeId, SectionTypeDescriptor<any>>> = {};
   export function registerSection<T>(d: SectionTypeDescriptor<T>) { SECTION_REGISTRY[d.id] = d; }
   ```
4. `wexoebuilder/components/audience/AudienceBuilder.tsx` (refaktor) — använd `BuilderShell`. Detta är proof-of-concept (minsta page-typen).

**Vad du *inte* gör i denna fas:**
- LP/PA flyttas inte till `BuilderShell` än. De refaktoreras opportunistiskt senare när vi ändå rör dem.
- Ingen sektion implementeras (registry fylls i senare faser).

**Validering:**
- [ ] `pnpm dev` startar utan typfel.
- [ ] Audience-editorn fungerar likadant som före refaktoringen (skapa ny audience-sida → spara → läs in igen → samma fält).
- [ ] LP/PA-editorerna fungerar oförändrat.
- [ ] `SECTION_REGISTRY` är tom men importerbar.

---

### Fas 1 — Airtable-städning och cms-tabell-design

**Beroenden:** inga.

**Mål:** Få Wexoe NY-basen till "ren" status redo för Wexoe Core att läsa.

**Steg (utförs via Airtable MCP eller manuellt):**

1. **Radera de 8 placeholder-cms-tabellerna** (`cms_landing_pages`, `cms_product_pages`, `cms_customer_type_pages`, `cms_partner_pages`, `cms_case_pages`, `cms_pillar_pages`, `cms_products`, `cms_articles`). De har bara default-mall-fält och är fel mental-modell.
2. **Rensa default-mall-fält** (`Notes`, `Assignee`, `Status`, `Attachments`, `Attachment Summary`) från alla `core_*`-tabeller där de finns. Behåll de fält som faktiskt används (se [5.1](#51-airtable-wexoe-ny-appokkstabdca8yiw)).
3. **Lägg "Hours *"-fält i `core_company`** (öppen fråga 9.1 i SSOT-planen är besvarad: A — lägg dem i SSOT).
4. **Populera initial-data:**
   - `core_countries`: 1 record `Name=Sweden, Code=SE, Domain=wexoe.se, Active=true`. (Lägg fler länder senare.)
   - `core_divisions`: 3 records (`Industri`, `Automation`, `Kassasystem`) länkade till SE-country.
   - `core_customer_types`: 3 records (`Industri-kund`, `Bygg`, `Offentlig sektor`).
   - `core_company`: 1 record `Slug=wexoe-se, Is Default=true, Country=[SE]`, övriga fält tomma (redaktör fyller via builder senare).
   - `core_graphic_profile`: 1 record `Slug=default, Is Default=true`, övriga fält tomma.
   - `core_coworkers`/`core_partners`/`core_testimonials`: 0 records — redaktör fyller via builder.
5. **Säkerställ att exakt EN `Is Default=true`-record finns** på `core_company` och `core_graphic_profile`. Detta är en hård invariant i Wexoe Core.
6. **Skriv eller verifiera tabell-beskrivningar** på alla core-tabeller (en mening per tabell, snabb intro för redaktör).

**Validering:**
- [ ] `mcp__d3b2344d-9467-4fc9-b768-696435140bf6__list_tables_for_base baseId=appokKSTaBdCa8YiW` returnerar exakt 8 tabeller (alla `core_*`).
- [ ] `core_company.Slug=wexoe-se` finns och har `Is Default=true`.
- [ ] `core_countries.Code=SE` finns med `Domain=wexoe.se`.
- [ ] Inga `cms_*`-tabeller finns kvar i basen (de återskapas i Fas 5).
- [ ] Tabell-beskrivningar visas i Airtable UI när du hovrar tabell-fliken.

---

### Fas 2 — Wexoe Core: SSOT-scheman + Helpers

**Beroenden:** Fas 1.

**Mål:** Wexoe Core kan läsa alla 8 SSOT-tabeller via `Core::entity('core_company')->all()` osv. Country/Division-context-detektering fungerar i WP.

**Konkreta artefakter:**

1. **8 entity-schemafiler** i `wexoeplugins/wexoe-core/entities/`. Mall (`core_company.php`):
   ```php
   <?php
   if (!defined('ABSPATH')) exit;
   return [
       'table_id' => 'tblwq9y74ertsNyYG',
       'primary_key' => 'slug',
       'cache_ttl' => 3600, // 1h, kortare än sid-data
       'required' => ['slug'],
       'fields' => [
           'slug' => 'Slug',
           'is_default' => ['source' => 'Is Default', 'type' => 'bool'],
           'country_ids' => ['source' => 'Country', 'type' => 'link', 'entity' => 'core_countries'],
           'company_name' => 'Company Name',
           'tagline' => 'Tagline',
           'org_number' => 'Org Number',
           'vat_number' => 'VAT Number',
           'email' => 'Email',
           'phone' => 'Phone',
           'phone_emergency' => 'Phone Emergency',
           'address_line_1' => 'Address Line 1',
           'address_postal_code' => 'Address Postal Code',
           'address_city' => 'Address City',
           'linkedin_url' => 'LinkedIn URL',
           'facebook_url' => 'Facebook URL',
           'instagram_url' => 'Instagram URL',
           'youtube_url' => 'YouTube URL',
           'hours_mon_fri' => 'Hours Mon-Fri',
           'hours_saturday' => 'Hours Saturday',
           'hours_sunday' => 'Hours Sunday',
           'hours_lunch' => 'Hours Lunch',
           'hours_override' => 'Hours Override',
           'internal_notes' => 'Internal Notes',
       ],
   ];
   ```
   Bygg motsvarande för: `core_graphic_profile.php`, `core_countries.php`, `core_divisions.php`, `core_customer_types.php`, `core_coworkers.php`, `core_partners.php`, `core_testimonials.php`. Tabell-ID:n finns i [avsnitt 5.1](#51-airtable-wexoe-ny-appokkstabdca8yiw).
2. **Helpers** i `wexoe-core/src/Helpers/`:
   - `Context.php`:
     ```php
     namespace Wexoe\Core\Helpers;
     class Context {
         private static array $cache = [];
         public static function current_country_record(): ?array {
             if (isset(self::$cache['country'])) return self::$cache['country'];
             $host = wp_parse_url(home_url(), PHP_URL_HOST);
             $countries = \Wexoe\Core\Core::entity('core_countries')->all();
             foreach ($countries as $c) {
                 if (($c['domain'] ?? '') === $host && !empty($c['active'])) {
                     return self::$cache['country'] = $c;
                 }
             }
             // Fallback: URL Prefix
             $path = wp_parse_url(home_url(), PHP_URL_PATH) ?: '';
             foreach ($countries as $c) {
                 $prefix = $c['url_prefix'] ?? '';
                 if ($prefix && str_starts_with($path, '/' . trim($prefix, '/'))) {
                     return self::$cache['country'] = $c;
                 }
             }
             // Fallback: Is Default på company → använd dess country
             $companies = \Wexoe\Core\Core::entity('core_company')->all();
             foreach ($companies as $co) {
                 if (!empty($co['is_default']) && !empty($co['country_ids'])) {
                     foreach ($countries as $c) {
                         if (in_array($c['_record_id'], $co['country_ids'], true)) {
                             error_log('[wexoe-core] Country fallback to default for host=' . $host);
                             return self::$cache['country'] = $c;
                         }
                     }
                 }
             }
             error_log('[wexoe-core] No country could be resolved for host=' . $host);
             return self::$cache['country'] = null;
         }
         public static function current_country_code(): string {
             $c = self::current_country_record();
             return $c['code'] ?? 'SE';
         }
         public static function current_division_slug(): ?string {
             // Resolves från URL eller WP-option senare; null = "global"
             return null;
         }
     }
     ```
   - `Singletons.php`:
     ```php
     namespace Wexoe\Core\Helpers;
     class Singletons {
         public static function company_for_country(string $code): array {
             $countries = \Wexoe\Core\Core::entity('core_countries')->all();
             $country_id = null;
             foreach ($countries as $c) if (($c['code'] ?? '') === $code) { $country_id = $c['_record_id']; break; }
             $companies = \Wexoe\Core\Core::entity('core_company')->all();
             if ($country_id) {
                 foreach ($companies as $co) {
                     if (!empty($co['country_ids']) && in_array($country_id, $co['country_ids'], true)) return $co;
                 }
             }
             foreach ($companies as $co) if (!empty($co['is_default'])) return $co;
             return [];
         }
         public static function graphic_profile_for_division(?string $slug): array {
             $profiles = \Wexoe\Core\Core::entity('core_graphic_profile')->all();
             if ($slug) {
                 $divisions = \Wexoe\Core\Core::entity('core_divisions')->all();
                 $division_id = null;
                 foreach ($divisions as $d) if (($d['slug'] ?? '') === $slug) { $division_id = $d['_record_id']; break; }
                 if ($division_id) {
                     foreach ($profiles as $p) {
                         if (!empty($p['division_ids']) && in_array($division_id, $p['division_ids'], true)) return $p;
                     }
                 }
             }
             foreach ($profiles as $p) if (!empty($p['is_default'])) return $p;
             return [];
         }
     }
     ```
   - `Collections.php`:
     ```php
     namespace Wexoe\Core\Helpers;
     class Collections {
         /** @param array{country?:string,division?:string,customer_type?:string,limit?:int} $scope */
         public static function coworkers_for_scope(array $scope = []): array {
             return self::filter('core_coworkers', $scope, ['country','division']);
         }
         public static function partners_for_scope(array $scope = []): array {
             return self::filter('core_partners', $scope, ['country','division']);
         }
         public static function testimonials_for_scope(array $scope = []): array {
             return self::filter('core_testimonials', $scope, ['country','division','customer_type']);
         }
         private static function filter(string $entity, array $scope, array $dims): array {
             $records = \Wexoe\Core\Core::entity($entity)->all();
             $records = array_filter($records, fn($r) => !empty($r['active']));
             foreach ($dims as $dim) {
                 if (empty($scope[$dim])) continue;
                 $target_id = self::resolve_dim_id($dim, $scope[$dim]);
                 if (!$target_id) continue;
                 $field = $dim . '_ids';
                 $records = array_filter($records, fn($r) =>
                     empty($r[$field]) || in_array($target_id, $r[$field], true)
                 );
             }
             usort($records, fn($a, $b) => ($a['order'] ?? 999) - ($b['order'] ?? 999));
             if (!empty($scope['limit'])) $records = array_slice($records, 0, $scope['limit']);
             return array_values($records);
         }
         private static function resolve_dim_id(string $dim, string $value): ?string {
             $entity_map = ['country' => 'core_countries', 'division' => 'core_divisions', 'customer_type' => 'core_customer_types'];
             $field_map = ['country' => 'code', 'division' => 'slug', 'customer_type' => 'slug'];
             $records = \Wexoe\Core\Core::entity($entity_map[$dim])->all();
             foreach ($records as $r) if (($r[$field_map[$dim]] ?? '') === $value) return $r['_record_id'];
             return null;
         }
     }
     ```
3. **Boot** i `wexoe-core/src/Plugin.php` — säkerställ att helpers autoloads via PSR-4 (de bör redan göra det om namespace stämmer).
4. **Mapper-utvidgning:** Säkerställ att existerande entity-mapper hanterar `_record_id` exponering — den behövs i Helpers ovan.

**Validering:**
- [ ] WP-test (kör i WP via plugin debug-bar eller egen test-fil):
  ```php
  $company = \Wexoe\Core\Core::entity('core_company')->all();
  var_dump($company); // Förväntar 1 record med slug=wexoe-se
  $context = \Wexoe\Core\Helpers\Context::current_country_record();
  var_dump($context['code']); // 'SE'
  $coworkers = \Wexoe\Core\Helpers\Collections::coworkers_for_scope(['country' => 'SE']);
  var_dump($coworkers); // Tom array (Fas 1 lade inga coworkers)
  ```
- [ ] WP-transienten `wexoe_core_core_company` finns efter första anrop.
- [ ] Cache-TTL är 3600s för core-tabeller (skiljer sig från 86400s default).

---

### Fas 3 — Wexoe Core: REST CRUD för SSOT

**Beroenden:** Fas 2.

**Mål:** Buildern kan skapa, läsa, uppdatera och radera SSOT-records via Wexoe Core REST. Cache rensas automatiskt på write.

**Artefakter (alla i `wexoeplugins/wexoe-core/`):**

1. **WriteRegistry-utökning:** Se till att `WriteRegistry` har write-entities för alla 8 core-tabeller + 2 cms-tabeller (Fas 5). Använd samma mall som `write-entities/user_submissions.php`. För `core_company`:
   ```php
   // wexoe-core/write-entities/core_company.php
   return [
       'table_id' => 'tblwq9y74ertsNyYG',
       'entity_name' => 'core_company',
       'fields' => [
           'slug' => 'Slug',
           'is_default' => 'Is Default',
           'country_ids' => 'Country',
           'company_name' => 'Company Name',
           // ... samma som entity-schemat
       ],
   ];
   ```
2. **REST-route** `wp-json/wexoe-core/v1/entity/{entity}` med metoder GET (list/single via `?slug=x`), POST (create), PATCH (update via `?record_id=rec...`), DELETE. Whitelistas — bara entiteter som finns i en `CORE_EDITABLE_ENTITIES`-array tillåts.
3. **REST-route** `wp-json/wexoe-core/v1/invalidate` (POST) — body `{ entities: string[] }` rensar transients för dessa entiteter. Säkras med en shared secret (samma som dagens publish-webhook).
4. **Singleton-invariant-validering:** Vid PATCH/POST på `core_company` eller `core_graphic_profile`, om `is_default=true` sätts — säkerställ att inget annat record har `is_default=true`. Annars 409.

**Validering:**
- [ ] `curl -u admin:pwd https://wp.example.com/wp-json/wexoe-core/v1/entity/core_company` returnerar JSON-array.
- [ ] `curl -X PATCH ... entity/core_company?record_id=rec... -d '{"phone": "+46..."}'` uppdaterar och svar `200`.
- [ ] Direkt efter PATCH: `Core::entity('core_company')->all()` returnerar gamla cached värdet *tills* invalidate-anropet körts (eller TTL gått ut). PATCH-routen ska anropa invalidate internt.
- [ ] Försök sätta `is_default=true` på en andra `core_company` → returnerar `409 Conflict`.
- [ ] Försök PATCH på `landing_pages` via denna route → `403` (whitelist hindrar).

---

### Fas 4 — Builder: `/globals/*` för SSOT-redigering

**Beroenden:** Fas 2, Fas 3.

**Mål:** Redaktörer kan redigera alla 8 SSOT-tabeller direkt i builder. Ingen Airtable-direktåtkomst.

**Artefakter (`wexoebuilder/`):**

1. **`lib/core/`** ny mapp:
   - `types.ts` — TypeScript-interfaces per entity (`CoreCompany`, `CoreCountry`, ...).
   - `mapper.ts` — bidirektional Airtable record ↔ TS-objekt.
   - `loader.ts` — server-side fetch per entity (anropar Airtable direkt, samma mönster som `lib/page-mapper.ts`).
   - `registry.ts`:
     ```ts
     export const CORE_ENTITIES = {
       'core_company':         { tableId: 'tblwq9y74ertsNyYG', role: 'singleton', label: 'Företag' },
       'core_graphic_profile': { tableId: 'tbl4c4HjiKVCcJI5v', role: 'singleton', label: 'Grafisk profil' },
       'core_countries':       { tableId: 'tblCZ082jWGUBrUAK', role: 'taxonomy',  label: 'Länder' },
       'core_divisions':       { tableId: 'tblyxs2zsoRBozxQS', role: 'taxonomy',  label: 'Divisioner' },
       'core_customer_types':  { tableId: 'tblLsYRMZz6JA6GBK', role: 'taxonomy',  label: 'Kundtyper' },
       'core_coworkers':       { tableId: 'tblYwMQlW9HFd41pg', role: 'collection',label: 'Medarbetare' },
       'core_partners':        { tableId: 'tblZ5YIYFelxA0nBm', role: 'collection',label: 'Partners' },
       'core_testimonials':    { tableId: 'tbl1pe0bWz5zdkqJF', role: 'collection',label: 'Citat' },
     } as const;
     export type CoreEntityId = keyof typeof CORE_ENTITIES;
     ```
   - `forms.ts` — field-config per entity (vilka fält visas i form, vilken inputtyp: text/textarea/url/email/phone/image/select/multilink).
2. **`app/api/core/[entity]/route.ts`** — generisk route. Validerar entity mot `CORE_ENTITIES`-whitelist. GET (list+single), POST (create), PATCH (update), DELETE. Anropar Airtable direkt (samma mönster som `app/api/publish/route.ts`). Efter mutation: anropar Wexoe Core invalidate-endpoint.
3. **Komponenter:**
   - `components/core/CoreEntityShell.tsx` — generiskt skal: rubrik, list-vy, form-vy, save-banner.
   - `components/core/CoreEntityForm.tsx` — generisk form som tar field-config från `forms.ts`.
   - `components/core/SsotImageField.tsx` — Airtable attachment uploader (kopia av befintliga image-fält i builder).
4. **Routes:**
   ```
   app/globals/page.tsx                  — entitets-grid med 8 kort
   app/globals/company/page.tsx          — list/edit core_company (tab-bar per Country)
   app/globals/graphic-profile/page.tsx  — list/edit core_graphic_profile (tab-bar per Division)
   app/globals/countries/page.tsx        — inline-redigerbar tabell
   app/globals/divisions/page.tsx        — inline-redigerbar tabell
   app/globals/customer-types/page.tsx   — list + form
   app/globals/coworkers/page.tsx        — sökbar lista + form, bulk active-toggle
   app/globals/partners/page.tsx         — sökbar lista + form
   app/globals/testimonials/page.tsx     — lista + form, Featured-toggle prominent
   ```
5. **Sidlistan i `/`:** lägg "Globaler"-länk högst upp i `app/page.tsx`. Auth: återanvänd `lib/auth.ts`-mönstret.

**Validering:**
- [ ] Logga in i builder → `/globals` visar 8 entitet-kort.
- [ ] Klicka "Företag" → öppnar `core_company` med 1 record (SE).
- [ ] Ändra `Phone` → spara → ladda om sidan → fältet visar nya värdet.
- [ ] I separat terminal: `curl wp/wp-json/wexoe-core/v1/entity/core_company` → returnerar nya telefonnumret efter invalidate.
- [ ] Skapa en ny coworker via `/globals/coworkers` → ny record skapas i Airtable.
- [ ] Försök markera en andra `core_company` som default → felmeddelande i UI.

---

### Fas 5 — Tier 2: grundinfrastruktur

**Beroenden:** Fas 0, Fas 2.

**Mål:** En tom Tier 2-sida kan skapas och rendreras i WordPress, även om den har noll sektioner. Section-render-pipeline finns.

**Artefakter:**

**Airtable (`Wexoe NY`):**
1. Skapa `cms_unique_pages`-tabell. Fält: se [5.1](#51-airtable-wexoe-ny-appokkstabdca8yiw).
2. Skapa `cms_page_sections`-tabell. Fält: se [5.1](#51-airtable-wexoe-ny-appokkstabdca8yiw).
3. Lägg tabell-beskrivningar.
4. Skapa 1 test-record i `cms_unique_pages`: `Slug=test-page, H1=Testsida, Published=true, Country=[SE]`. Ingen sektion än.

**Wexoe Core:**
1. `wexoe-core/entities/cms_unique_pages.php` (entity-schema).
2. `wexoe-core/entities/cms_page_sections.php` (entity-schema). Lägg JSON-parse på `Data JSON`:
   ```php
   'data' => ['source' => 'Data JSON', 'type' => 'json'],
   ```
   Förutsätter att entity-engine stöder `json`-type. Om inte: lägg den.
3. Reserved-slugs-konstant i `wexoe-core/src/Constants.php`:
   ```php
   const RESERVED_SLUGS = ['kontakt', 'nedladdningar', 'om-oss-statisk', /* osv */];
   ```

**Ny plugin `wexoe-page` (`wexoeplugins/New plugins/wexoe-page/`):**
1. `wexoe-page.php`:
   - Registrerar shortcode `[wexoe_page slug="..."]`.
   - Hämtar `cms_unique_pages` via `Core::entity('cms_unique_pages')->find_by('slug', $slug)`.
   - Hämtar tillhörande `cms_page_sections` filtrerat på unique-page-record-id, sorterat på `order`.
   - Per sektion: `do_action('wexoe_section_render', $section_type, $section)`.
   - Output buffer: börja, render, sluta, return.
   - Lägg `id="kontakt"` på contact-form-sektion-wrapper (om någon sektion är av typ `contact-form`).

**Ny plugin `wexoe-sections` (`wexoeplugins/New plugins/wexoe-sections/`):**
1. `wexoe-sections.php`:
   - Lägg helper `wexoe_section_register($type, $callable)` som registrerar mot en singleton-registry.
   - `add_action('wexoe_section_render', $type, $section)` hämtar callable från registry och anropar.
   - Render-callable signatur: `function wexoe_section_render_xxx(array $section): string`.
   - Default-fallback om inget renderer-registrerat: `<!-- wexoe-section: type "..." not registered -->`.
2. `sections/` (tom mapp — fylls i Fas 6 och 7).

**Builder (`wexoebuilder/`):**
1. `app/editor/unique/page.tsx` (create) + `app/editor/unique/[recordId]/page.tsx` (edit).
2. `components/UniquePageBuilder.tsx` — använder `BuilderShell` (Fas 0). Toolbar: slug-input, H1, SEO-fält, Published-toggle. Editor-panel: vertikal stack med sektioner, "Lägg till sektion"-knapp (öppnar dialog), pilar upp/ner per sektion. Preview-panel: använder `SECTION_REGISTRY`-PreviewComponents.
3. `app/api/unique-page/route.ts` — POST (create), PATCH (update inkl. sektion-diffning likt LP/tabs), DELETE. Cache-invalidate efter mutation.
4. `lib/core/reserved-slugs.ts` — speglar PHP-konstanten ovan.
5. Lägg "Unik sida" som ny typ i `Ny sida`-dialogen i `app/page.tsx`.

**Validering:**
- [ ] WP: `echo do_shortcode('[wexoe_page slug="test-page"]')` returnerar HTML med H1 men 0 sektioner.
- [ ] Skapa sida via builder → ny record i `cms_unique_pages`.
- [ ] Försök skapa sida med slug `kontakt` → felmeddelande i UI.
- [ ] Builder: lägg till en sektion av godtycklig typ → record i `cms_page_sections` länkad till sidan.
- [ ] WP: efter cache-bust visar shortcoden HTML-kommentaren `<!-- wexoe-section: type "..." not registered -->` (sektion-typer implementeras i Fas 6).

---

### Fas 6 — Sektion-bibliotek wave 1

**Beroenden:** Fas 5.

**Mål:** 7 sektion-typer fungerar end-to-end (Airtable-data → Wexoe Core → wexoe-sections renderer → WP output). Editor + preview i builder. Inkluderar 3 SSOT-drivna sektioner.

**Sektion-typer:**

| Type | Data-fält | SSOT-driven? |
|---|---|---|
| `hero` | `title`, `subtitle`, `image_url`, `cta_text`, `cta_url`, `theme` | Nej |
| `text-image` | `h2`, `body`, `image_url`, `reversed` (bool), `theme` | Nej |
| `text-only` | `h2`, `body`, `align` (left/center) | Nej |
| `cta-banner` | `h2`, `body`, `cta_text`, `cta_url`, `theme` | Nej |
| `faq` | `h2`, `items: [{q, a}]` | Nej |
| `team-grid` | `h2`, `scope: { division?, country?, customer_type?, limit? }` | Ja → `core_coworkers` |
| `partner-marquee` | `h2`, `scope` | Ja → `core_partners` |
| `testimonial-card` | `scope` | Ja → `core_testimonials` |

**För varje sektion-typ skapa följande artefakter:**

**Wexoe Sections (PHP, `wexoeplugins/New plugins/wexoe-sections/sections/<type>/`):**
- `render.php`:
  ```php
  // exempel: sections/team-grid/render.php
  wexoe_section_register('team-grid', function(array $section): string {
      $data = $section['data'] ?? [];
      $scope = $data['scope'] ?? [];
      $coworkers = \Wexoe\Core\Helpers\Collections::coworkers_for_scope($scope);
      ob_start();
      ?>
      <section class="wxs-team-grid">
          <?php if (!empty($data['h2'])): ?><h2><?= esc_html($data['h2']) ?></h2><?php endif; ?>
          <div class="wxs-team-grid__list">
              <?php foreach ($coworkers as $c): ?>
                  <div class="wxs-team-grid__item">
                      <?php if (!empty($c['image'])): ?><img src="<?= esc_url($c['image']) ?>" alt=""/><?php endif; ?>
                      <h3><?= esc_html($c['full_name'] ?? '') ?></h3>
                      <p><?= esc_html($c['title'] ?? '') ?></p>
                  </div>
              <?php endforeach; ?>
          </div>
      </section>
      <?php return ob_get_clean();
  });
  ```
- CSS som inline i render-output, scopad med prefix `wxs-<type>__`.

**Builder (`wexoebuilder/components/sections/<type>/`):**
- `descriptor.ts`:
  ```ts
  import { registerSection } from '@/lib/sections/registry';
  import Editor from './editor';
  import Preview from './preview';
  registerSection({
    id: 'team-grid',
    label: 'Team-rutnät',
    defaultData: { h2: 'Vårt team', scope: {} },
    EditorComponent: Editor,
    PreviewComponent: Preview,
    phpRendererSlug: 'team-grid',
    ssotDriven: true,
  });
  ```
- `editor.tsx` — FieldInput för h2, ScopeFieldset för scope (returnerar `{ division?, country?, customer_type?, limit? }`).
- `preview.tsx` — fetcher som drar coworkers från builder-API:s (`/api/core/core_coworkers?country=SE`) och visar grid.

**`lib/sections/index.ts`:** importera alla descriptor-filer så registry fylls vid app-start.

**Validering (per sektion-typ):**
- [ ] Lägg sektionen på test-page via builder → preview visar förväntat resultat.
- [ ] WP: `[wexoe_page slug="test-page"]` renderar sektionen.
- [ ] För SSOT-drivna: lägg en coworker via `/globals/coworkers` → sektionen visar coworkern utan att test-page-recordet ändras.
- [ ] CSS-scope: två sektioner av samma typ på samma sida krockar inte (uniqid eller class-prefix).
- [ ] Tom scope-filter → visar alla aktiva records (globalt synliga).

---

### Fas 7 — Sektion `contact-form` (renderer + handler + editor)

**Beroenden:** Fas 5, Fas 6.

**Mål:** Kontaktformulär fungerar som sektion-typ på Tier 2-sidor. Submissions hamnar i `User data` med `submission_type=contact`.

**Artefakter:**

**Wexoe Sections — ny sektion `contact-form` (`wexoeplugins/New plugins/wexoe-sections/sections/contact-form/`):**

1. `render.php`:
   ```php
   wexoe_section_register('contact-form', function(array $section): string {
       $data = $section['data'] ?? [];
       $cfg = \Wexoe\Core\ContactForm\Config::normalize($data);
       return \Wexoe\Core\ContactForm\Renderer::render($cfg);
   });
   ```
2. CSS/HTML/JS-skelett kopieras från `Old plugins/wexoe-contact-form.php` men:
   - CSS-prefix byts till `wxcf-*`.
   - Scopas till `#wxcf-{uniqid}`.
   - Parameters: title/eyebrow/subtitle/layout/theme/options/cta/trust-signals/colors.
3. Honeypot-fält `<input name="_hp" style="display:none" tabindex="-1" autocomplete="off">` (spam-skydd, beslut 9.3).

**Wexoe Core — ny modul `wexoe-core/src/ContactForm/`:**

1. `Config.php` — DTO + normaliserare:
   ```php
   namespace Wexoe\Core\ContactForm;
   class Config {
       public static function normalize(array $raw): array {
           return [
               'eyebrow'        => $raw['eyebrow'] ?? '',
               'title'          => $raw['title'] ?: 'Prata med någon som kan automation',
               'subtitle'       => $raw['subtitle'] ?? '',
               'layout'         => in_array($raw['layout'] ?? 'split', ['split','centered']) ? $raw['layout'] : 'split',
               'theme'          => in_array($raw['theme'] ?? 'dark', ['dark','light']) ? $raw['theme'] : 'dark',
               'show_company'   => $raw['show_company'] ?? true,
               'show_phone'     => $raw['show_phone'] ?? true,
               'show_dropdown'  => $raw['show_dropdown'] ?? true,
               'dropdown_label' => $raw['dropdown_label'] ?: 'Vad kan vi hjälpa dig med?',
               'options'        => is_array($raw['options'] ?? null) ? $raw['options'] : (
                                       $raw['options']
                                       ? array_filter(array_map('trim', explode("\n", $raw['options'])))
                                       : ['Generell fråga','Diskutera ett projekt','Lägga en order','Minska stillestånd','Förbättra OEE','Info om produkt']
                                   ),
               'cta_text'       => $raw['cta_text'] ?: 'Skicka',
               'message_label'  => $raw['message_label'] ?: 'Berätta mer (valfritt)',
               'trust_signals'  => is_array($raw['trust_signals'] ?? null) ? $raw['trust_signals'] : (
                                       $raw['trust_signals']
                                       ? array_filter(array_map('trim', explode("\n", $raw['trust_signals'])))
                                       : []
                                   ),
               'colors'         => $raw['colors'] ?? [],
               'source_plugin'  => $raw['source_plugin'] ?? 'wexoe-page',
               'page_slug'      => $raw['page_slug'] ?? '',
               'contact_person' => $raw['contact_person'] ?? null,
           ];
       }
   }
   ```
2. `Renderer.php` — `public static function render(array $cfg): string` med all HTML/CSS/JS. Outputtar `wxcf-*`-CSS scopad till `#wxcf-{uniqid}`.
3. `Handler.php`:
   ```php
   namespace Wexoe\Core\ContactForm;
   class Handler {
       public static function register(): void {
           add_action('wp_ajax_wxcf_submit',        [self::class, 'handle']);
           add_action('wp_ajax_nopriv_wxcf_submit', [self::class, 'handle']);
       }
       public static function handle(): void {
           if (!wp_verify_nonce($_POST['_wxcf_nonce'] ?? '', 'wxcf_submit')) {
               wp_send_json(['success' => false, 'error' => 'invalid_nonce'], 403);
           }
           // Honeypot
           if (!empty($_POST['_hp'])) {
               wp_send_json(['success' => true]); // tyst avvisning
           }
           // Rate-limit: 10/h/IP
           $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
           $key = 'wxcf_rl_' . md5($ip);
           $count = (int) get_transient($key);
           if ($count >= 10) wp_send_json(['success' => false, 'error' => 'rate_limited'], 429);
           set_transient($key, $count + 1, HOUR_IN_SECONDS);

           $payload = [
               'submission_type'    => 'contact',
               'email'              => sanitize_email($_POST['email'] ?? ''),
               'name'               => sanitize_text_field($_POST['name'] ?? ''),
               'company'            => sanitize_text_field($_POST['company'] ?? ''),
               'phone'              => sanitize_text_field($_POST['phone'] ?? ''),
               'message'            => sanitize_textarea_field($_POST['message'] ?? ''),
               'newsletter_consent' => !empty($_POST['newsletter_consent']),
               'submitted_at'       => current_time('c'),
               'page_slug'          => sanitize_text_field($_POST['page_slug'] ?? ''),
               'page_url'           => esc_url_raw($_POST['page_url'] ?? ''),
               'source_plugin'      => sanitize_text_field($_POST['source_plugin'] ?? ''),
               'extra'              => [
                   'behov'      => sanitize_text_field($_POST['behov'] ?? ''),
                   'user_agent' => sanitize_text_field($_SERVER['HTTP_USER_AGENT'] ?? ''),
               ],
           ];
           $res = \Wexoe\Core\Core::submission('user_submissions')->create_mapped($payload);
           if (!empty($res['success'])) wp_send_json(['success' => true]);
           wp_send_json(['success' => false, 'error' => $res['error'] ?? 'unknown'], 500);
       }
   }
   ```
4. **Boot** i `wexoe-core/src/Plugin.php`:
   ```php
   add_action('init', [\Wexoe\Core\ContactForm\Handler::class, 'register']);
   ```

**Builder — sektion-descriptor (`wexoebuilder/components/sections/contact-form/`):**
1. `lib/contact-form-types.ts` (delad, för Fas 9 också):
   ```ts
   export type ContactFormLayout = 'split' | 'centered';
   export type ContactFormTheme = 'dark' | 'light';
   export interface ContactFormState {
     eyebrow: string;
     title: string;
     subtitle: string;
     layout: ContactFormLayout;
     theme: ContactFormTheme;
     showCompany: boolean;
     showPhone: boolean;
     showDropdown: boolean;
     dropdownLabel: string;
     options: string;       // multiline, en per rad
     ctaText: string;
     messageLabel: string;
     trustSignals: string;  // multiline, en per rad, format: **Bold** | Resten
     showContactPerson: boolean;
   }
   export function emptyContactFormState(): ContactFormState {
     return {
       eyebrow: '',
       title: 'Prata med någon som kan automation',
       subtitle: '',
       layout: 'split',
       theme: 'dark',
       showCompany: true,
       showPhone: true,
       showDropdown: true,
       dropdownLabel: 'Vad kan vi hjälpa dig med?',
       options: 'Generell fråga\nDiskutera ett projekt\nLägga en order\nMinska stillestånd\nFörbättra OEE\nInfo om produkt',
       ctaText: 'Skicka',
       messageLabel: 'Berätta mer (valfritt)',
       trustSignals: '**30+ års erfarenhet** | av Rockwell och svensk industri\n**Vi säljer inte bara produkter** | vi löser problem\n**Lager i Köpenhamn** | snabb leverans när det krisar',
       showContactPerson: true,
     };
   }
   ```
2. `components/sections/contact-form/editor.tsx` — editor enligt skiss i `contactformintegrationbuilder.md` avsnitt "Editor-skiss" (FieldInput för text-fält, SingleSelect för layout/theme, FieldCheckbox för toggles, RichTextarea för options/trustSignals).
3. `components/sections/contact-form/preview.tsx` — visuell skiss av formulärlayout som reflekterar `state.theme` och `state.layout` live. Återanvänd `colorOr` / `textOn` från `lib/color-utils.ts`.
4. `components/sections/contact-form/descriptor.ts` — registrerar mot `SECTION_REGISTRY`.

**Validering:**
- [ ] Lägg contact-form-sektion på test-page i builder. Editor visar alla fält.
- [ ] WP: `[wexoe_page slug="test-page"]` renderar formuläret.
- [ ] Fyll i formuläret → submit → ny rad i `User data` med `Submission Type=contact`.
- [ ] Inspectera nätverket: AJAX-anropet går till `?action=wxcf_submit` (inte `wexoe_contact_submit` — det undviker krock med Old-pluginet).
- [ ] Skicka 11 submissions från samma IP inom en timme → 11:e svarar med 429.
- [ ] Fyll honeypot-fältet `_hp` programmatiskt → submit svarar `success: true` men ingen rad skapas i Airtable.
- [ ] Inga JS-fel i konsolen. CSS-scope krockar inte med Tier 2-omgivande sektioner.

---

### Fas 8 — Per-plugin: contact-form i LP/PA/Audience

**Beroenden:** Fas 7.

**Mål:** LP/PA/Audience-sidor får integrerat kontaktformulär utan att duplicera renderer-kod. Befintliga `#kontakt`-anchors fortsätter fungera.

**Airtable (`Wexoe`-basen):**
1. Lägg de 15 `Contact Form *`-fälten i `Landing Pages`, `Product Areas` och `Audience Heroes`. Se [5.2](#52-airtable-wexoe-appxoucks68dqwasjf).
2. Sätt defaults där möjligt (`Show Contact Form=false`, `Contact Form Layout=split`, `Contact Form Theme=dark`).

**Wexoe Core scheman:**
1. Utöka `wexoe-core/entities/landing_pages.php` med `contact_form_*` domain-keys mappade mot nya Airtable-fält. Cache-TTL stannar på 86400 (sid-data).
2. Samma för `product_areas.php` och `audience_heroes.php`.

**Per page-plugin:**
1. `wexoe-landing-page/`: Lägg helper `wexoe_lp_render_contact_form_section($data): string` enligt pseudo-kod i `contactformintegrationplugins.md` avsnitt 4.4. Anropa i shortcode-renderloop sist. Wrappa i `<section id="kontakt">`. Renderaren anropar `wexoe_section_render('contact-form', $section)` — *inte* `Core::contact_form()::render()` direkt, så Tier 2 och LP delar exakt samma sektion-renderer.
   - Mappning: `contact_form_show_contact_person=true` → läs `contact_*`-fält från samma record och skicka som `contact_person` i config.
   - `colors`: `{ main: $data['color_main'], accent: $data['color_secondary'] }`.
   - `source_plugin`: `wexoe-landing-page`.
2. `wexoe-product-area/`: samma mönster. Färgkälla: `--contact-bg` på PA-record om finns, annars `color_main`.
3. `wexoe-audience-hero/`: samma mönster. Notera: Audience har inget kontaktperson-kort idag — så `show_contact_person=true` ska peka på antingen en `core_coworker` (via scope) eller falla tillbaka på record-egna `contact_*`-fält om de existerar (de gör de inte på Audience — så för Audience-pluginet faller `show_contact_person=true` alltid tillbaka på en `Collections::coworkers_for_scope`-uppslag med limit 1).
4. **Audience-marginalvalidering:** Audience-pluginen använder `100vw`-trick. Säkerställ att `<section id="kontakt">` antingen alltid är fullbredd eller alltid container. Bestäm i denna fas — rekommendation: alltid container (formuläret behöver inte vara fullbredd).

**Validering:**
- [ ] Skapa LP, sätt `Show Contact Form=true` i Airtable, ladda om sidan i WP → formuläret renderar.
- [ ] `<section id="kontakt">` finns i HTML.
- [ ] En knapp på samma sida med `href="#kontakt"` scrollar till formuläret.
- [ ] Submit fungerar → rad i `User data` med `source_plugin=wexoe-landing-page`.
- [ ] Samma test för PA och Audience.
- [ ] CSS-prefix `wxcf-*` krockar inte med `wexoe-lp-*` / `wexoe-pa-*` / `wah-*`.
- [ ] Audience: hero-marginalerna (100vw) påverkas inte av att kontaktform-sektionen finns nedanför.

---

### Fas 9 — Builder: ContactFormEditor i LP/PA/Audience

**Beroenden:** Fas 7, Fas 8.

**Mål:** Redaktörer redigerar contact_form_*-fälten direkt i LP/PA/Audience-editorn med live preview.

**Artefakter (`wexoebuilder/`):**

1. **Typ-utökning:**
   - `lib/types.ts` (LP `PageState`) → lägg `contactForm: ContactFormState`.
   - `lib/product-area-types.ts` → samma.
   - `lib/audience-types.ts` → samma.
2. **Mappers:**
   - `lib/page-mapper.ts` → läs `Contact Form *`-fält till state.
   - `lib/product-area-mapper.ts` → samma.
   - `lib/audience-mapper.ts` → samma (forward + reverse, eftersom Audience är direct mapper).
3. **Editorer:** Återanvänd `components/sections/contact-form/editor.tsx` (samma komponent som Tier 2). Wrappa den i `components/editors/ContactFormEditor.tsx` (LP), `components/audience/editors/ContactFormEditor.tsx` (Audience), `components/product-area/editors/ContactFormEditor.tsx` (PA) — wrappers tar emot `state.contactForm` och `setField`-callback från respektive reducer. **Ingen duplicering av fält-UI** — bara state-mappning.
4. **Previews:** Återanvänd `components/sections/contact-form/preview.tsx` per page-typ. Samma mönster som editorer.
5. **Reducer/state-uppdateringar:**
   - `lib/state.ts` (LP) — lägg `SET_CONTACT_FORM_FIELD`-action.
   - Motsvarande i PA och Audience.
6. **EditorPanel / PreviewPanel:**
   - `components/EditorPanel.tsx` — lägg `'contactForm'` i sections-arrayen + quick-nav.
   - `components/PreviewPanel.tsx` — rendera ContactFormPreview om `state.contactForm.show` (men `show` ligger på PageState-nivå som top-level `showContactForm` om vi följer befintligt mönster — alternativt på `contactForm.show`; välj det andra för konsistens).
   - Motsvarande i `AudiencePreviewPanel.tsx` / `AudienceBuilder.tsx` / `ProductAreaBuilder.tsx` / `ProductAreaPreviewPanel.tsx`.
7. **Claude-prompt-uppdatering** (en gång, för LP och PA):
   - `lib/airtable-schema-lp.md` → lägg de 15 Contact Form-fälten i fältlistan + formateringsregel (se `contactformintegrationbuilder.md` avsnitt "Claude-prompt-uppdatering").
   - `lib/airtable-schema-pa.md` → samma.
   - Audience använder direct mapper, ingen Claude-prompt.

**Visibility-flagga:** Följ befintligt mönster. PA/Audience har `showXxx` på top-level. För contact-form: lägg `contactForm.show: boolean` (inom state-objektet) istället för top-level `showContactForm` — så hela contact-form-strukturen är encapslerad.

**Validering:**
- [ ] LP-editor: expandera "Kontaktformulär"-sektion → fyll i fält → live preview uppdateras.
- [ ] Publish → Airtable-recordet uppdateras med `Contact Form *`-värden.
- [ ] Cache-bust → WP-sidan visar nya värdena.
- [ ] Stäng av `contactForm.show=false` → sektion försvinner från preview och från WP-sidan.
- [ ] Samma för PA och Audience.
- [ ] Claude-transform tappar inte `Contact Form *`-fält vid UPDATE mode (verifiera genom att ändra ett LP-fält UTAN att röra contact-form → contact-form-värdena bevaras).
- [ ] Befintliga LP utan `Contact Form *`-värden öppnas i editor → `contactForm` = `emptyContactFormState()` med `show=false`.

---

### Fas 10 — Globals-driven defaults i LP/PA

**Beroenden:** Fas 4, Fas 9.

**Mål:** Nya LP/PA skapas med förfyllda Contact-fält (kontaktperson) baserat på `core_coworkers`-uppslag. Existerande sidor påverkas inte.

**Konkreta steg:**

1. **Builder — create-flöde:**
   - I `app/api/publish/route.ts` (eller pre-create hook): när en ny LP/PA skapas och `contact_name` är tomt, slå upp `core_coworkers` filtrerat på `country` (LP) eller `country + division` (PA). Välj record med lägst `Order`.
   - Sätt `contact_name`, `contact_title`, `contact_email`, `contact_phone`, `contact_image` från coworker-recordet.
2. **Respektera manuell input:** Om redaktören har skrivit något i Contact-fälten i editorn före publish → använd det. Default sätts endast om alla Contact-fält är tomma.
3. **Markera default-sourced:** Lägg ett internt `_contact_source: 'default-coworker' | 'manual'`-fält i state (ej skickad till Airtable). Om redaktören ändrar något fält → flippa till `manual`. Inget UI-värde, men möjlig framtid: visa banner "Använder default-kontaktperson från SSOT".

**Validering:**
- [ ] Skapa ny LP med country=SE → contact-fält förfyllda från första aktiva coworker med country=SE.
- [ ] Skapa ny LP, fyll i contact_name manuellt → publish → manuella värdet bevaras.
- [ ] Existerande LP öppnad och publicerad utan ändringar → contact-fält oförändrade.
- [ ] Skapa ny LP utan att någon coworker finns för country=SE → contact-fält tomma, ingen krasch.

---

### Fas 11 — Polish och deprecation

**Beroenden:** alla tidigare faser.

**Mål:** Avveckla `Old plugins/wexoe-contact-form.php`. Lägg på kvalitetshöjningar.

**Steg:**

1. **Datamigration:** För varje existerande sida som idag använder `[wexoe_contact_form]`:
   - Identifiera sidans page-typ (LP / PA / Audience / annat).
   - Sätt `Show Contact Form=true` i Airtable och fyll i ev. avvikande titel/subtitel.
   - Ta bort `[wexoe_contact_form]`-shortcoden från WP-sidan i editorn.
   - Ta bort den explicit-döpta "kontakt"-WP-sektionen (eftersom `<section id="kontakt">` nu kommer från pluginet).
2. **Make.com-flöden:**
   - Identifiera vilka automation-scenarier som hänger på webhooken `https://hook.eu1.make.com/sulae2u3lux9g9dqfabtsdngiwz46s6g`.
   - Skapa motsvarande Airtable-automation som triggas på "ny rad i User data där Submission Type=contact".
   - Kör båda parallellt i en vecka.
   - Inaktivera Make-webhook när Airtable-automation visat sig stabil.
3. **Deprecate `Old plugins/wexoe-contact-form.php`:**
   - Lägg `[DEPRECATED]` i plugin-headern.
   - Lägg en `add_action('admin_notices', ...)` som varnar om pluginet är aktivt.
   - När 0 sidor använder shortcoden: avaktivera och radera.
4. **Polish:**
   - SEO-meta retrofit för LP/PA/Audience (`<title>`, `<meta description>`, `<meta og:image>`).
   - Saved sections / page-templates: spara en sektion-instans, klona till annan sida.
   - Audit-länkar i `/globals/*` → "Visa historik i Airtable".
   - "Vad använder det här SSOT-recordet?"-vy.
   - Bulk-operationer i collections.
   - "Cache rensad i Wexoe Core ✓"-bekräftelse i builder efter save.

**Validering:**
- [ ] WP-databas-sökning `[wexoe_contact_form` returnerar 0 träffar.
- [ ] Old plugin inaktivt → kontaktformulär fortsätter fungera.
- [ ] Airtable-automation triggas på nya submissions med samma kvalitet som Make-webhook.
- [ ] SEO-meta visas korrekt i sidkällan på LP/PA/Audience.

---

## 7. Risker och mitigations

| Risk | Sannolikhet | Påverkan | Mitigation |
|---|---|---|---|
| **`/globals`-redigering bryter publicerade sidor** | Medel | Hög | Soft-delete via `Active`. Audit-vy visar referenser innan radering. Fältvalidering (telefon/email-format). |
| **Cache-stale efter SSOT-ändring** | Hög | Medel | Auto-invalidate vid POST/PATCH. "Tvinga rensning"-knapp. Kort TTL (1h) för SSOT vs 24h sid-data. |
| **Land-kontext-detektering felar i WP-konfig** | Medel | Hög | Fallback-kedja: Domain → URL Prefix → `Is Default` → SE-hårdkod. Logga vilken fallback som triggade. |
| **Tier 2 section-bibliotek växer okontrollerat** | Hög | Medel | Initiala 8 typer är MVP-gräns. Ny typ kräver explicit motivering. Mätning per typ. |
| **`Data JSON`-fält blir orättningsbart** | Medel | Hög | Zod-validering per typ. Schema-versioning: `{ _schema: 1, ...data }`. Migration-strategi vid schema-bump. |
| **Singleton-fallback ger fel record** | Låg | Hög | Hård invariant: max 1 `Is Default=true` per tabell. REST validerar vid PATCH. PHP loggar warning vid dubblett. |
| **Två `id="kontakt"`-element under migrationen** | Medel | Medel | Migrera en sida i taget: sätt `Show Contact Form=true` *samtidigt* som gamla shortcoden tas bort. Checklista i Fas 11. |
| **AJAX-handler-krock med Old plugin** | Medel | Medel | Nytt action-namn `wxcf_submit` (inte `wexoe_contact_submit`). |
| **CSS-prefix-kollision** | Låg | Låg | Nytt prefix `wxcf-*` + uniqid-scope. |
| **Audience full-bredd-trick (100vw) krockar med kontaktform** | Medel | Medel | Renderaren ska alltid vara container, aldrig 100vw. Bestäms i Fas 8. |
| **Claude-transform tappar Contact Form-fält i UPDATE** | Hög | Medel | Lägg fälten i "always echo"-listan i `airtable-schema-lp.md` / `-pa.md`. Testa explicit i Fas 9. |
| **Spam i kontaktformulär** | Hög | Låg | Honeypot + rate-limit 10/h/IP. Lägg reCAPTCHA om problemet eskalerar. |
| **Migration av `core_company` från Item/Value bryter pluginer** | Låg | Medel | Verifierat: inga pluginer läser gamla strukturen. Greenfield. |
| **Airtable API-rate-limit vid SSOT-edit-vågor** | Låg | Låg | Wexoe Core cache:ar reads. Builder-write är icke-frekvent. |

---

## 8. Designbeslut tagna

Följande beslut är gjorda för att eliminera ambiguity inför implementation:

1. **Kontaktformulär är en sektion, inte en separat modul.** Renderer ligger som `contact-form`-sektion i `wexoe-sections`-pluginen. `Core::contact_form()` exponeras *inte* — istället anropas `wexoe_section_render('contact-form', $section)` både från Tier 2-loopen och från LP/PA/Audience-plugins. (Synergi med Tier 2-mönstret; eliminerar dubbel-renderer.)
2. **AJAX-actionnamn är `wxcf_submit`.** Inte `wexoe_contact_submit` — undviker krock med Old-pluginet under migrationsperioden.
3. **Spam-mitigering: honeypot + rate-limit.** Honeypot-fält `_hp` + transient-baserad rate-limit 10/h/IP. reCAPTCHA tillkommer endast om spam visar sig vara ett problem.
4. **Defaults bor i PHP, inte Airtable.** Tomma Airtable-fält faller tillbaka på vettiga PHP-defaults. Migrationen är "soft" — sidor som inte fyllt i något får standardform.
5. **`show_contact_person=true`**:
   - LP/PA: läs sidans `contact_*`-fält som idag.
   - Audience: slå upp `Collections::coworkers_for_scope` med limit 1.
6. **Tier 2 byggs före kontaktform.** Grunden gör att kontaktform blir den första riktiga sektionen, inte en separat modul. (Detta är avsteg från ordningen i `contactformintegrationplugins.md` Fas 1.)
7. **CMS-tabeller i Wexoe NY skapas från scratch.** De 8 placeholder-cms-tabellerna raderas i Fas 1. Endast `cms_unique_pages` + `cms_page_sections` skapas i Fas 5.
8. **Country/Division-scope finns från dag 1** även om bara SE används. Inga schema-migrationer för att lägga till länder senare.
9. **Hours-fält läggs i `core_company`** (öppen fråga 9.1 i SSOT-planen besvarad). Status-logik (öppet/stängt) stannar i PHP.
10. **wexoe-contact-page migreras inte i denna plan.** Separat plan senare.
11. **LP/PA Contact-fält pekar inte på `core_coworkers` ännu.** Bara default-förfyllnad vid create (Fas 10). Faktisk linkning är framtida iteration.
12. **Audience har inget visitkort.** Vid `show_contact_person=true` → SSOT-uppslag (Fas 8).
13. **Inga drag-drop-sektioner.** Pilar upp/ner räcker. Tangentbordstillgänglig drag-drop är veckor extra arbete.
14. **Inga draft/publish-stadier.** Allt går live direkt. Lägg på senare om problemet uppstår.
15. **`Data JSON`-fält versioneras.** Lägg `{ _schema: 1, ...data }` i alla sektion-data så framtida schema-bumps är hanterbara.

---

## 9. Öppna frågor

Dessa är frågor som *inte* hindrar implementation men ska bevakas:

1. **Multi-language.** Per-country-records räcker som plattformsfundament. Riktig översättning av sid-innehåll: WPML/Polylang eller liknande, utanför scope.
2. **Approval status på testimonials.** `core_testimonials` har `Active` + `Featured`. Lägg `Approval Status` (Pending/Approved/Withdrawn) om legal kräver det.
3. **AI-orkestrerad sidgenerering.** Spännande som "Fas 12" senare när byggstenarna finns. Inte i scope nu.
4. **Migration av LP/PA till composition-modellen.** De stannar som dedikerade builders. Tier 2 är *additivt*.
5. **wexoe-contact-page**, **downloads-sidor**, **start-sidan**: separata planer.
6. **Section-render-hook eller filter?** Fas 5 använder `do_action('wexoe_section_render', ...)`. Övervägt: `apply_filters` för att möjliggöra wrapper-injektion. Beslut: stanna på action, byt vid behov.
7. **Reverse-länkar i Airtable**: auto-genererade `Companies`/`Coworkers`/etc.-fält på `core_countries` osv. Estetiskt — döp om vid behov, ignoreras av Wexoe Core-mapper.

---

## 10. Bilagor

### A. Terminologi

| Term | Definition |
|---|---|
| **SSOT** | Single Source of Truth. `core_*`-tabeller i Wexoe NY som plattformsdata-lager. |
| **CMS** | `cms_*`-tabeller i Wexoe NY för composition-byggda sidor (Tier 2). |
| **Tier 1** | Statisk PHP-renderad sida som drar SSOT men inte är layout-redigerbar i builder (t.ex. framtida kontaktsida-migration). |
| **Tier 2** | Composition-byggd sida med sektioner valda i builder. `cms_unique_pages`. |
| **Section** | Återanvändbar UI-byggsten (hero, faq, contact-form, …) med React preview + PHP renderer. |
| **Scope** | Filter-uppsättning `{ country?, division?, customer_type? }` som styr vilka SSOT-records som visas. |
| **Singleton** | Tabell med 1 record per scope, fallback till `Is Default = true`. |
| **Collection** | Tabell med många records, filtrerade via scope-länkar. |
| **Taxonomy** | Referensdata-tabell som andra tabeller länkar till. |
| **Wexoe Core** | WP-plugin med `Core::entity('foo')`-API mot Airtable med transient-cache. |

### B. Filstruktur efter implementering

**`wexoebuilder/`:**
```
app/
  globals/
    page.tsx                              -- entitets-grid
    {company,graphic-profile,countries,divisions,customer-types,coworkers,partners,testimonials}/page.tsx
  editor/
    unique/
      page.tsx                            -- create
      [recordId]/page.tsx                 -- edit
  api/
    core/[entity]/route.ts                -- SSOT CRUD
    unique-page/route.ts                  -- Tier 2 CRUD
components/
  BuilderShell.tsx                        -- delad plumbing
  UniquePageBuilder.tsx                   -- Tier 2 builder
  sections/
    hero/{editor,preview,descriptor}
    text-image/...
    text-only/...
    cta-banner/...
    faq/...
    team-grid/...                         -- SSOT-driven
    partner-marquee/...                   -- SSOT-driven
    testimonial-card/...                  -- SSOT-driven
    contact-form/...                      -- delas av Tier 2 + LP/PA/Audience
  core/
    CoreEntityShell.tsx
    CoreEntityForm.tsx
    SsotImageField.tsx
  editors/
    ContactFormEditor.tsx                 -- LP wrapper kring sections/contact-form/editor
  audience/editors/
    ContactFormEditor.tsx                 -- Audience wrapper
  product-area/editors/
    ContactFormEditor.tsx                 -- PA wrapper
  preview/
    ContactFormPreview.tsx                -- LP wrapper kring sections/contact-form/preview
  audience/preview/
    ContactFormPreview.tsx
  product-area/preview/
    ContactFormPreview.tsx
lib/
  core/
    types.ts
    mapper.ts
    loader.ts
    registry.ts
    forms.ts
    reserved-slugs.ts
  sections/
    types.ts
    registry.ts
    index.ts                              -- importerar alla descriptors
  contact-form-types.ts                   -- ContactFormState, emptyContactFormState()
```

**`wexoeplugins/wexoe-core/`:**
```
entities/
  core_company.php
  core_graphic_profile.php
  core_countries.php
  core_divisions.php
  core_customer_types.php
  core_coworkers.php
  core_partners.php
  core_testimonials.php
  cms_unique_pages.php
  cms_page_sections.php
  (utökade) landing_pages.php / product_areas.php / audience_heroes.php
write-entities/
  (samma 10 nya core/cms entiteter)
src/
  ContactForm/
    Config.php
    Renderer.php                          -- renderer kallas av wexoe-sections, inte direkt av plugins
    Handler.php                           -- wxcf_submit AJAX → user_submissions
  Helpers/
    Context.php
    Singletons.php
    Collections.php
  Constants.php                           -- RESERVED_SLUGS
```

**`wexoeplugins/New plugins/`:**
```
wexoe-page/                               -- [wexoe_page slug="..."] shortcode
wexoe-sections/
  wexoe-sections.php                      -- sektion-registry boot
  sections/
    hero/render.php
    text-image/render.php
    text-only/render.php
    cta-banner/render.php
    faq/render.php
    team-grid/render.php                  -- SSOT-driven via Helpers\Collections
    partner-marquee/render.php
    testimonial-card/render.php
    contact-form/render.php               -- anropar Core\ContactForm\Renderer
```

### C. Cache-strategi

| Lager | Cache | TTL | Invalidering |
|---|---|---|---|
| Builder → Airtable read | SWR-style i React | 5 min | Manual revalidate efter mutation |
| Wexoe Core → Airtable read (SSOT) | WP transient | 1h | `POST /wp-json/wexoe-core/v1/invalidate` |
| Wexoe Core → Airtable read (sid-data) | WP transient | 24h | Samma |
| WP fragment cache | Object cache | Per renderer | Plugin-uppdatering |

Vid `/globals`-save:
1. PATCH Airtable.
2. POST `/wp-json/wexoe-core/v1/invalidate` med entity-namn.
3. Wexoe Core rensar transient.
4. Nästa WP-request → cache-miss → fräsch data från Airtable.

### D. Sektion-data-versioning

Alla sektion-data lagras i `cms_page_sections.Data JSON` med versionsfält:

```json
{ "_schema": 1, "h2": "Vårt team", "scope": { "country": "SE" } }
```

Vid framtida schema-bump:
1. Sektion-typens descriptor uppdateras med ny defaultData (schema 2).
2. Migration-skript läser alla records med `_schema=1`, transformerar, skriver tillbaka med `_schema=2`.
3. Renderer i wexoe-sections har en `migrate_v1_to_v2`-funktion som körs JIT på read om något missas.

### E. Snabbreferens — `Core::*`-API efter implementation

```php
// Singletons + entity-API (Fas 2)
$company         = \Wexoe\Core\Core::entity('core_company')->find_by('slug', 'wexoe-se');
$profile         = \Wexoe\Core\Helpers\Singletons::graphic_profile_for_division('industri');

// Collections (Fas 2)
$coworkers       = \Wexoe\Core\Helpers\Collections::coworkers_for_scope(['country' => 'SE', 'division' => 'automation', 'limit' => 4]);
$partners        = \Wexoe\Core\Helpers\Collections::partners_for_scope(['country' => 'SE']);
$testimonials    = \Wexoe\Core\Helpers\Collections::testimonials_for_scope(['customer_type' => 'industri-kund']);

// Context (Fas 2)
$country_code    = \Wexoe\Core\Helpers\Context::current_country_code();

// Submissions (befintligt, används från Fas 7)
\Wexoe\Core\Core::submission('user_submissions')->create_mapped([
    'submission_type' => 'contact',
    'email' => $email,
    // ...
]);

// Sektion-render (Fas 5+)
echo apply_filters('wexoe_section_render', '', 'contact-form', $section_record);
```

---

**Slut på dokument.** Implementera fas för fas, validera, dokumentera avvikelser i denna fil som separata commits.
