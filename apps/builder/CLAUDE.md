# CLAUDE.md — buildern (apps/builder)

> Router för bygg-sidan. Läs monorepo-roten (`/CLAUDE.md`) först. Senast
> verifierad mot kod: 2026-05-31.

Wexoe Page Builder är vår interna marknadsförar-app för att skapa och redigera
sidor på wexoe.com. Next.js (App Router) + TypeScript + Tailwind, värd på Vercel.
Läser och skriver direkt mot Airtable REST; state→Airtable sker via en
**deterministisk transform** (rena funktioner, **ingen Claude på spar-vägen**).

## 1. Varför buildern finns

**Buildern är inte en Airtable-vy.** Airtable är datakällan men ett dåligt UI för
icke-tekniker: kryptiska fältnamn, riskabla rich-text-format, inga previews, lätt
att skriva sönder en post. Buildern översätter den världen till en marknadsförar-
vänlig redaktör med live-preview till höger och sektionsbaserade kontroller till
vänster. Marknadsföraren ska aldrig behöva veta att Airtable existerar.

**En sidtyp = ett plugin = en editor.** WP-pluginet (PHP) och builder-editorn (TS)
renderar samma sidtyp var för sig — samma "form", men olika kod och olika
datamodell. Pluginet läser rå Airtable-data; buildern visar en putsad version och
översätter tillbaka vid spar. *Render-paritet hålls inte automatiskt — det är
därför väktaren och det delade schemat finns (se monorepo-roten).*

**Vibes:** Spotify, inte SAP. Direktredigering, snabba previews, "spara" som ett
icke-moment. Felmeddelanden pekar på sektion + fält. Tomma defaults > krockande placeholders.

## 2. Repo-layout

```
app/
  editor/<type>/      # Per-sidtyps redigeringsvyer (App Router server pages)
  globals/            # SSOT-redigerare (per core_* entitet)
  api/
    page/ product-page/ customer-type/ partner/ case/   # CRUD-routes per sidtyp
    copy/             # AI-textgenerering (Claude — INTE spar)
    parse/            # AI input-tolkning (Claude — INTE spar)
    publish/          # cache-invalidering mot WP
    core/             # SSOT-CRUD
components/<type>/     # Editor- + preview-komponenter per sidtyp
  shared/             # återanvändbara form-primitives
  contact-form/       # delad kontaktformulärsmodul
lib/
  page-types/         # ⭐ Page-type-ramverket (se § 3)
    types.ts          #   PageTypeServerDef, PageTypeUIDef — läs kommentarerna, de är spec
    registry.ts       #   alla sidtyper (klient-säker meta)
    <type>.server.ts  #   server-half: mappers, validering, list, create/update
    <type>.ui.tsx     #   UI-half: sektioner, preview-layout
  core/               # SSOT-ramverk (registry/forms/mapper/loader)
  deterministic-transform.ts  # ⭐ state → Airtable-fält (rena funktioner, ingen Claude)
  transform-shared.ts # delade skriv-primitiver (sectionToPayload, clears*, result-typer)
  schema/             # schema-RAMVERKET (vanlig kod): entity-schema.ts, to-state.ts, to-fields.ts
  *-types.ts *-mapper.ts  # per-sidtyp state-typer + record↔state-mappning
schema/               # ⚠️ SYNKAD KOPIA av packages/schema/entities (committad — se § 4)
```

## 3. Page-type-ramverket (hjärtat)

Att lägga till en sidtyp ska vara *datadeklaration*, inte handskriven CRUD. En
sidtyp = två filer:

```ts
// lib/page-types/<type>.server.ts  — importeras server-side
export const <type>Server: PageTypeServerDef<TState, TListItem> = {
  id, label, tableId, baseId, emptyState, fromRecord, validate,
  listItemMapper, listFields, listSort,
  create, update,            // Lager 3 — anropar build<Type> i deterministic-transform.ts
  relations: [...],          // Lager 2 — deklarativa child-tabeller (om sidtypen har det)
  cacheEntities, slug,
};
// lib/page-types/<type>.ui.tsx  — importeras client-side (React)
export const <type>UI: PageTypeUIDef<TState> = { id, label, sections, previewLayout, … };
```

Splittringen finns för att React-komponenter inte kan korsa Next:s server/client-
gräns som props. **Trelagsmodellen** (full kommentar i `lib/page-types/types.ts`):
Lager 1 = ren CRUD (finns men används ej), Lager 2 = deklarativa relationer,
**Lager 3 = full override som anropar den deterministiska transformen — standard
för alla sidtyper** (customer-type, cms-page, product-page, landing, case, partner).

**Copy-flödet** är opt-in: registry-entryn behöver `copy: { apiType }`, och strängen
**måste** matcha en handler i `app/api/copy/route.ts::COPY_HANDLERS` — annars syns
ingen Kopiera-knapp. (Väktarens R-strings fångar mismatch.)

Lägg till en sidtyp: `/add-page-type` eller `../../docs/NEW_PAGE_TYPE-builder.md`.

## 4. Schema — synkad kopia, redigera ALDRIG här

`apps/builder/schema/*.json` är en **committad synk-kopia** av sanningskällan
`packages/schema/entities/`. Buildern importerar den via `@/schema/<table>.json`
(t.ex. i `lib/customer-type-mapper.ts`) och `lib/schema/to-state.ts` konsumerar den.

> **Ändra ett fält?** Redigera `packages/schema/entities/<table>.json` (monorepo-roten),
> kör `npm run schema:sync`. Det uppdaterar denna kopia + WP-kopian. **Rör aldrig
> kopian för hand** — väktaren (`npm run check`) failar om den driftar.

`lib/schema/*.ts` (formatet + `to-state.ts` + `to-fields.ts`) är vanlig kod som
redigeras normalt — det är bara `*.json`-datafilerna som är synkade.

*(Det fanns tidigare en cross-repo GitHub Action som speglade schemat mellan två
repon. Den finns inte längre — i monorepot är synken `npm run schema:sync`.)*

## 5. Deterministisk skrivväg (state → Airtable)

Det viktigaste mönstret: WP-pluginen vill ha data i ett rendering-vänligt format
(t.ex. `Q: …\nA: …`-lines för FAQ); marknadsföraren vill ha ett vanligt formulär
(lista av `{question, answer}`). Buildern håller den enkla modellen i state och kör
vid spar en **ren funktion** som översätter state → Airtable-fält. Backenden diffar
och PATCH/CREATE/DELETE:ar.

- `lib/deterministic-transform.ts` — per-typ-byggare (`build<Type>…`). Standardvägen idag.
- `lib/schema/to-fields.ts` — schema-driven (single-source), pilot `customer-type`. Dit arkitekturen är på väg.

**Ingen Claude på spar.** (Tidigare gick spar via en Claude-transform; den togs bort
i FAS 2 — editorn producerar redan rent state, så Claude tillförde bara latens och
icke-determinism.) Claude finns kvar enbart på `/api/copy` + `/api/parse` (input/copy).
Hittar du text som påstår "Claude på spar" → den är inaktuell, rätta den.

## 6. SSOT-redigerare (`/globals`)

För `core_*`-entiteter (företag, divisioner, partners …) — referensdata, inte sidor.
Drivs av `lib/core/`: registrera i `registry.ts` + skriv en `forms.ts`-entry, så
renderar `CoreEntityForm` generiskt. Inga bespoke-komponenter behövs.

## 7. Konventioner

- **snake_case** i state, mappers, scheman, Airtable display-namn.
- **Inga Airtable-fältnamn i UI-kod** — bara i mappers, transform-byggarna och `packages/schema`.
- **State-typer heter `<Tabell>State`** — tabellnamnet utan `cms_`-prefix i PascalCase:
  `cms_partner_pages`→`PartnerPageState`, `cms_cases`→`CaseState`,
  `cms_customer_type_pages`→`CustomerTypeState`, `cms_pages`→`CmsPageState`,
  `cms_product_pages`→`ProductPageState`. **Utan undantag.**
- **State är immutabelt** — editor-komponenter får `state` + `onChange(next)`, använd spread.
- **Cache-invalidering obligatorisk** — varje muterande route kör `invalidateWexoeCoreCache(cacheEntities)`.

## 8. Miljövariabler

| Variabel | Användning |
|---|---|
| `AIRTABLE_API_KEY` · `AIRTABLE_BASE_ID` | Läs/skriv mot Airtable (Wexoe NY: `appokKSTaBdCa8YiW`) |
| `ANTHROPIC_API_KEY` | `/api/copy` + `/api/parse` — **inte** spar-vägen |
| `AUTH_USERNAME` / `AUTH_PASSWORD` | `/login`-gate |
| `WEXOE_CORE_WEBHOOK_URL` / `_SECRET` | cache-invalidering mot WP (`lib/wexoe-cache.ts`); utan dem skippas tyst |

## 9. Vart pekar resten?

| Du vill… | Gå till |
|---|---|
| Ramverket i detalj | `lib/page-types/types.ts` (kommentarerna ÄR spec) + `lib/page-types/registry.ts` |
| Skapa ny sidtyp (bygg-sidan) | `/add-page-type` · `../../docs/NEW_PAGE_TYPE-builder.md` |
| Skapa ny sidtyp (plugin-sidan, pair-läs) | `../../docs/NEW_PAGE_TYPE-plugin.md` |
| Marknadsförar-flödet | `../../docs/SKAPA-SIDA.md` |
| WP-sidan / Core-API | `../wordpress/CLAUDE.md` · `../wordpress/UTVECKLINGSGUIDE.md` |
| Verktyg, sanningskällor, verify | `/CLAUDE.md` (monorepo-roten) |
