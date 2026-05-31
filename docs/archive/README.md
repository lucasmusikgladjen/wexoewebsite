# docs/archive — historiska planer (läs som historik, inte som sanning)

Dessa dokument beskriver hur vi *tänkte* när arbetet planerades. De är **inte**
aktuell dokumentation och ska inte följas som instruktion — koden och de levande
docs:en (`/CLAUDE.md`, app-CLAUDE.md, `UTVECKLINGSGUIDE.md`) är sanningen.

De sparas för att fånga *varför* arkitekturen ser ut som den gör — beslut, motiv,
icke-mål — vilket git-loggen inte fångar lika väl.

| Fil | Vad det var | Status |
|---|---|---|
| `MONOREPO-PLAN.md` | Utrullningsplan för monorepo + infrastruktur (FAS 0–8). | **Genomförd.** FAS 0–7 levererade; FAS 8 = denna docs-rework. |
| `ARKITEKTURPLAN.md` | Modulariserings-refaktorn (single-source-schema, deterministisk save, delade block). | **Delvis genomförd.** Schema + deterministisk save klara. Delade block (contact_form/faq), delad CSS och plugin-konsolidering återstår — men planens fas-tracker speglar inte längre kodläget; lita på koden. |
| `UTVECKLINGSPLAN-ALB-BLOCKS.md` | Designplan för Avia Layout Builder-elementen. | **Genomförd.** Pluginet `wexoe-alb-blocks` finns. |

**Vill du fortsätta ett halvfärdigt spår?** (t.ex. delade contact_form/faq-block,
eller utfasning av `automation-pillar`.) Läs `ARKITEKTURPLAN.md` för *motiven*,
men verifiera nuläget mot koden + `npm run guardian` innan du börjar — planens
kryssrutor är inte underhållna.
