# CLAUDE.md — WordPress-sidan (apps/wordpress)

> Router för WP-halvan. Läs monorepo-roten (`/CLAUDE.md`) först om du inte gjort det.
> Auktoritativ teknisk referens: `UTVECKLINGSGUIDE.md` (i denna mapp). Senast
> verifierad mot kod: 2026-05-31.

## Vad detta är

WordPress-pluginsen som renderar Wexoes publika sidor. Allt innehåll bor i
Airtable; **`wexoe-core` är den enda komponenten som pratar med Airtable** från
WP-sidan och cachar i transients. Varje sidtyp har ett eget **feature-plugin**
som registrerar en shortcode, läser data via Core och producerar HTML.

```
Airtable ──► wexoe-core (cache + fasad) ──► feature-plugin (shortcode) ──► HTML på WP-sida
```

## Layout

```
wexoe-core/            # Datalager + helpers. Den enda Airtable-auktoriteten.
  wexoe-core.php       #   bootstrap (sätter WEXOE_CORE_PATH, laddar src/)
  src/
    Core.php           #   ⭐ PUBLIKA FASADEN — feature-plugins anropar bara denna
    AirtableClient.php  Cache.php  EntityRepository.php  WriteRepository.php
    Schema.php         #   läser packages/schema-kopian (from_json) → Normalizer-form
    SchemaRegistry.php  Normalizer.php  Logger.php
    Helpers/           #   Markdown, Color, YouTube, Lines, … (duplicera ALDRIG dessa)
    Renderers/         #   delade renderers (ContactForm) — återanvänds av flera plugins
    ContactForm/       #   delad kontaktformulärsmodul (AJAX-handler)
    Admin/  RestApi.php (cache-clear-webhook)  EntityRestApi.php
  entities/            #   LÄS-scheman — numera enrads-shims: from_json('<table>')
  write-entities/      #   SKRIV-scheman (form-submissions m.m.)
  schema/              #   ⚠️ SYNKAD KOPIA av packages/schema (committad; rör ej för hand)

plugins/               # Ett feature-plugin per sidtyp
  wexoe-landing-page/  wexoe-audience-hero/  wexoe-product-area/  wexoe-case/
  wexoe-customer-type-page/  wexoe-contact-page/  wexoe-partner-page/
  wexoe-pages/         #   dispatcher-mönstret: cms_pages + sections/<type>.php (15 sektioner)
  wexoe-alb-blocks/    #   Avia Layout Builder-integrering (Enfold)
  automation-pillar/   #   @deprecated — utfasas till wexoe-pages-sektioner
```

## Det publika API:t (allt feature-plugins behöver)

Fasaden `\Wexoe\Core\Core`. Fullständig referens med alla metoder, parametrar och
returvärden finns i **`UTVECKLINGSGUIDE.md` § 3**. Kärnan:

```php
$page = Core::entity('landing_pages')->find('fjarraccess');   // läs (cachad)
$rows = Core::entity('core_partners')->all(['is_active' => true]);
$tabs = Core::entity('lp_tabs')->find_by_ids($page['tab_ids']);
Core::submission('user_submissions')->create_mapped([...]);    // skriv (form-inflöde)
$cls  = Core::renderer('contact-form');                        // delad markup
Core::log('warning', '…', ['context' => …]);
```

Output är alltid normaliserade **domänfält** (aldrig Airtable-fältnamn), med
`_record_id` på varje post. Fälttyper och normalisering: `UTVECKLINGSGUIDE.md` § 3.2.

## Scheman — hur de fungerar nu (viktigt)

`entities/<table>.php` är **inte längre handskrivna arrayer** — de är enrads-shims:

```php
return \Wexoe\Core\Schema::from_json('<table>');
```

`from_json` läser `wexoe-core/schema/<table>.json` (den committade synk-kopian av
`packages/schema/entities/<table>.json`). **Ändra aldrig fält här eller i
`schema/`-kopian** — ändra originalet i `packages/schema/entities/` och kör
`npm run schema:sync` från monorepo-roten. Väktaren failar annars. Format och
fälttyper: `packages/schema/README.md`.

`write-entities/*.php` är fortfarande vanliga arrayer (bara fältmappning, ingen
typ-normalisering) — de driver skriv-vägen för form-submissions.

## Två plugin-mönster

1. **Standard** (1–5 sektioner): ett `wexoe-<typ>.php` med en shortcode, Core-guard,
   läs via `Core::entity()`, rendera med escaping + Core-helpers. Mall: `UTVECKLINGSGUIDE.md` § 6.
2. **Dispatcher** (`wexoe-pages`, 10+ heterogena sektioner): sidan är en `cms_pages`-record
   med länkade `cms_page_sections`; en tunn dispatcher delegerar per `section_type` till
   `sections/<type>.php`. `section_type`-menyn definieras i
   `packages/schema/enums/section-types.json` (väktaren validerar). Lägg en sektion: `/add-section`.

## Hårda regler

1. **Aldrig** anropa Airtable från ett feature-plugin direkt — gå via `Core::entity()` /
   `Core::submission()` / `Core::writer()`.
2. **Aldrig** duplicera Core-helpers (Markdown/Color/YouTube/Lines/ContactForm) lokalt.
3. **Aldrig** aktivera ett plugin halvvägs — kolla `class_exists('\\Wexoe\\Core\\Core')`
   i shortcode-funktionen och returnera synligt fel om Core saknas.
4. **Plugin-basename är ett runtime-kontrakt.** WP lagrar `plugins/<dir>/<file>.php` i
   `active_plugins`. Döp **aldrig** om en plugin-mapp/fil som körs live (då avaktiveras
   pluginet tyst vid deploy). Samma gäller shortcode-namn — de kan ligga i WP `post_content`.
   (Därför heter `wexoe-product-area/` så än, fast sidtypen heter `product-page` överallt annars.)
5. **Naming låst:** snake_case, engelska, prefix per `UTVECKLINGSGUIDE.md` § 2. Vissa
   entity-filer behåller medvetet legacy-namn (`landing_pages`, `lp_tabs`) — döp inte om reflexmässigt.

## Verifiering & deploy i denna miljö

- `php -l` på filer du rört. Tester: `cd apps/wordpress && ./vendor/bin/pest`
  (eller `npm run verify` från roten kör allt). Pest testar WP-fria delar
  (Schema, Normalizer, helpers) — `tests/bootstrap.php` definierar `ABSPATH`/`WEXOE_CORE_PATH`.
- **Ingen auto-deploy.** En push gör inget live. Du zippar plugin-mappen (online-GitHub-zipper)
  och laddar upp i WP-admin. Schema-kopian i `wexoe-core/schema/` följer med (committad).
  Var därför extra tydlig i PR/sammanfattning om vad användaren måste installera om efter merge.

## Vart pekar resten?

| Du vill… | Gå till |
|---|---|
| Core-API i detalj (alla metoder, schemaformat, cache) | `UTVECKLINGSGUIDE.md` |
| Skapa ny sidtyp (plugin-sidan) | `/add-page-type` · `../../docs/NEW_PAGE_TYPE-plugin.md` |
| Marknadsförar-flödet för ny sida | `../../docs/SKAPA-SIDA.md` |
| Schema-formatet | `../../packages/schema/README.md` |
| Migrationshistorik / Airtable-datafixar | `../../docs/IMPLEMENTATION_LOG.md` |
| Koden själv när docs och kod skiljer sig | `wexoe-core/src/Core.php` (doc-kommentarerna är auktoritativa) |
