# CLAUDE.md — Wexoe monorepo

> Ingången till hela systemet. Läs denna först, gå sedan till rätt app-CLAUDE.md.
> Senast verifierad mot kod: 2026-05-31.

## Vad systemet är (i en mening)

Marknadsförare redigerar sidor i en **Next.js-builder** med live-preview; allt
innehåll lagras i **Airtable**; **WordPress-plugins** läser från Airtable (via
`wexoe-core`) och renderar de publika sidorna. Ingen marknadsförare ser någonsin
Airtable eller WP-admin.

```
apps/builder ──skriver──►  Airtable  ──läses av──►  apps/wordpress/wexoe-core ──►  feature-plugins ──►  publika WP-sidor
 (Next.js/TS,             (CMS,           (PHP, enda Airtable-          (shortcodes)
  deterministisk save)     Wexoe NY)       auktoriteten på WP-sidan)
```

Två "halvor", ett repo. Buildern (TS) och WordPress (PHP) renderar **samma**
sidtyper var för sig — därför är den delade sanningskällan (`packages/schema`)
och väktaren (`tools/guardian`) kärnan i hela arkitekturen: de hindrar de två
halvorna från att glida isär.

## Karta — var bor vad

```
apps/
  builder/          # Next.js/TS-buildern. Vercel (Root Directory = apps/builder). → apps/builder/CLAUDE.md
  wordpress/        # WordPress-pluginsen.                                          → apps/wordpress/CLAUDE.md
    wexoe-core/     #   datalager + helpers (enda som pratar med Airtable från WP)
    plugins/        #   ett feature-plugin per sidtyp (renderar shortcode)
packages/
  schema/           # ⭐ SANNINGSKÄLLAN. entities/<table>.json (fältlistan EN gång) + enums/ (section_type)
tools/
  schema-sync.mjs   # kopierar packages/schema → committade kopior (builder + wexoe-core)
  guardian/         # ⭐ VÄKTAREN — validerar att halvorna är i synk; genererar manifest + DOCS-MAP
  verify.mjs        # kör ALLA lokala grindar i en körning (= CI)
  airtable-audit.mjs# jämför schemat mot den FAKTISKA Airtable-basen (bara CI)
docs/               # tvärgående dokumentation (se docs/README.md för index)
.claude/            # SessionStart-hook + slash-kommandon (/add-section, /add-page-type, /tdd)
manifest.json       # ⭐ GENERERAD systemkarta (av guardian) — maskinläsbar
```

**"Var bor allt om sidtyp/sektion X?"** → läs `docs/DOCS-MAP.md` (genererad) eller
`manifest.json`. Leta aldrig igenom trädet för hand — väktaren har redan kartlagt det.

## Sanningskällor — vad synkar, vad synkar inte

| Sak | Definieras EN gång i | Synkas hur | Vem mer läser |
|---|---|---|---|
| **Fält per entitet** | `packages/schema/entities/<table>.json` | `npm run schema:sync` → committade kopior | PHP: `Schema::from_json` · Builder: `@/schema/*` |
| **`section_type`-menyn** | `packages/schema/enums/section-types.json` | väktaren validerar | PHP-dispatcher + builderns `SectionType` |
| **Var allt bor** | (inget — genereras) | `npm run guardian` | `manifest.json`, `docs/DOCS-MAP.md` |

**Schema-flödet, viktigt:** du redigerar **bara** originalet i
`packages/schema/entities/`. Kör sedan `npm run schema:sync`. Det skriver två
committade kopior:
- `apps/builder/schema/<table>.json` — buildern importerar `@/schema/*`.
- `apps/wordpress/wexoe-core/schema/<table>.json` — WP-pluginet läser den i drift.
  **Måste vara committad** eftersom du deployar WP genom att ladda ner/zippa
  mappen (online-GitHub-zipper) — inget script körs vid zip; kopian följer med
  för att den redan ligger där.

Synken sker alltså **vid push/utveckling, aldrig vid zip**. Väktaren failar om en
kopia driftat från originalet. Detta är inte codegen — det är ren filkopia.
(Det finns ingen cross-repo GitHub Action längre; den dog när monorepot bildades.)

## Innan du är klar: kör verify

```
npm run verify        # ⭐ ALLA grindar i en körning (= CI): schema-synk, guardian,
                      #   tsc, lint, vitest, php -l, pest. Avbryter INTE vid första felet.
npm run verify:quick  # snabb loop under utveckling (hoppar tsc/lint)
npm run check         # bara sanningsvakten (schema-synk + guardian) — snabbast
npm run guardian      # bygg om manifest.json + docs/DOCS-MAP.md efter en strukturändring
```

`npm run verify` är **den enda sanningen för "klart"**: samma grindar som CI
(`.github/workflows/ci.yml`), hela bilden i en körning, grönt lokalt = grönt i CI.
En ändring som rör en sektion eller sidtyp är inte klar förrän verify är grön.

För agenter: `node tools/verify.mjs --json` och
`node tools/guardian/guardian.mjs --json` ger maskinläsbar `{ ok, errors[] }`.

## Hårda regler (bryt inte utan att fråga)

1. **Spar är deterministiskt.** state→Airtable sker via rena funktioner
   (`apps/builder/lib/deterministic-transform.ts`) — **inga Claude-anrop på spar.**
   Claude finns bara på input/copy (`/api/parse`, `/api/copy`). Hittar du en text
   som påstår "Claude-transform på spar" är den inaktuell → rätta den.
2. **Bara `wexoe-core` pratar med Airtable** från WP-sidan. Feature-plugins går
   via fasaden `\Wexoe\Core\Core`. Duplicera aldrig Core-helpers lokalt.
3. **Redigera aldrig schema-kopiorna** (`apps/builder/schema/`,
   `apps/wordpress/wexoe-core/schema/`). Bara `packages/schema/entities/` + `schema:sync`.
4. **Naming är låst:** snake_case, engelska, tabellprefix `core_`/`cms_`/`inbox_`.
   State-typer heter `<Tabell>State` (tabellnamnet utan `cms_`, PascalCase).
   Full tabell i `apps/wordpress/UTVECKLINGSGUIDE.md` § 2.
5. **Inga Airtable-fältnamn i UI-kod.** State är snake_case domänfält; Airtable-namn
   lever bara i mappers, transform-byggarna och `packages/schema`.

## Vart pekar resten?

| Du vill… | Gå till |
|---|---|
| Förstå bygg-sidan (page-types, save, preview) | `apps/builder/CLAUDE.md` |
| Förstå WP-sidan (Core-API, plugins, rendering) | `apps/wordpress/CLAUDE.md` |
| Core-API-referens (alla metoder, schemaformat) | `apps/wordpress/UTVECKLINGSGUIDE.md` |
| Schema-formatet (fälttyper, hints) | `packages/schema/README.md` |
| Skapa en ny sidtyp | `/add-page-type` · `docs/SKAPA-SIDA.md` (flöde) · `docs/NEW_PAGE_TYPE-*.md` (teknik) |
| Lägga till en sektion | `/add-section` |
| TDD ur en kravspec | `/tdd` |
| Airtable-audit (schema ↔ verklig bas) | `docs/AIRTABLE-AUDIT.md` |
| All dokumentation, indexerad | `docs/README.md` |

## Miljö

- **Node 22 + PHP 8.x** finns. `npm run check`/`guardian` är beroendefria (Node stdlib).
- SessionStart-hooken (`.claude/hooks/session-start.sh`) installerar builder-deps +
  composer-deps + kör schema-synk, så `tsc`/`vitest`/`pest` funkar direkt i en ny session.
- **Ingen auto-deploy på WP-sidan.** En push gör inget live — du zippar plugin-mappen
  och laddar upp i WP-admin. (Buildern auto-deployar däremot via Vercel.)
