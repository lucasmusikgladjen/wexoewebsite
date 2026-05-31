# docs/ — dokumentationsindex

Tvärgående dokumentation för Wexoe-monorepot. Börja alltid i **`/CLAUDE.md`**
(monorepo-roten) — den är ingången och kartan. Den här mappen är referens i djupet.

## Levande dokumentation (följ denna)

| Fil | Vad | När du läser den |
|---|---|---|
| `SKAPA-SIDA.md` | Marknadsförar-flödet för att skapa en ny sida (4 faser, en LLM-session per fas). | Du ska skapa en ny sidtyp och vill ha steg-för-steg-flödet. |
| `NEW_PAGE_TYPE-builder.md` | Teknisk recept: bygg-sidan (Next.js-editorn) av en ny sidtyp. | Du implementerar builder-halvan. Pair-läs med plugin-versionen. |
| `NEW_PAGE_TYPE-plugin.md` | Teknisk recept: WP-sidan (Airtable-tabell + Core-schema + PHP-plugin). | Du implementerar plugin-halvan. Pair-läs med builder-versionen. |
| `AIRTABLE-AUDIT.md` | Hur schema-mot-verklig-Airtable-auditen funkar + engångsinställning. | Du vill slå på audit-CI eller förstår ett rött audit-fel. |
| `IMPLEMENTATION_LOG.md` | Historik över migrationer + **Airtable-datamutationer** (record-id-mappningar). | Du undrar om en datafix redan gjorts, eller ska logga en ny. |

> **Skapa en ny sidtyp?** Snabbaste vägen är slash-kommandot `/add-page-type`
> (det kodar in receptet och kör väktaren). Recept-filerna ovan är referensen
> bakom det. För en enskild sektion: `/add-section`.

## Genererat (rör ej för hand)

| Fil | Genereras av |
|---|---|
| `DOCS-MAP.md` | `npm run guardian` — "var bor allt": sidtyper, sektioner, entiteter, touchpoints. |

## Annan referens (i sina egna mappar)

| Fil | Var | Vad |
|---|---|---|
| Monorepo-router | `/CLAUDE.md` | Ingången: karta, sanningskällor, verify, hårda regler. |
| Bygg-sidan | `/apps/builder/CLAUDE.md` | Page-type-ramverket, deterministisk save, konventioner. |
| WP-sidan | `/apps/wordpress/CLAUDE.md` | Core-fasaden, plugin-mönster, scheman som shims. |
| Core-API-referens | `/apps/wordpress/UTVECKLINGSGUIDE.md` | Alla Core-metoder, schemaformat, plugin-anatomi, cache, felsökning. |
| Schema-formatet | `/packages/schema/README.md` | Fälttyper, hints (`php_only`/`block`/`builder_as`), pseudo_array. |

## Historik (läs som historik, inte sanning)

`archive/` — genomförda/halvfärdiga planer (monorepo-utrullning, modulariserings-
refaktor, ALB-design). Sparade för *motiv och beslut*. Se `archive/README.md`.
