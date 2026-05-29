# FAS 5 — Migrera `automation-pillar` → `wexoe-pages`-sektioner

> **Status: runbook (implementations-spec).** Den här filen är den kanoniska
> planen för att avveckla det deprecade `automation-pillar`-pluginet genom att
> uttrycka dess innehåll som `wexoe-pages`-sektioner.
>
> **Varför inte färdig kod i denna PR:** varje tung del av FAS 5 är *gated* på
> samma sätt som FAS 3 — den kräver (a) live-Airtable-ändringar (nya fält /
> datamigrering) och (b) verifiering genom att titta på sidan i WP. Det går
> inte att skriva renderare mot ett schema som ännu inte finns och verifiera
> dem utan WP. Specen nedan är gjord så att de stegen kan köras med en människa
> vid Airtable/WP — inte blint.

`automation-pillar` = 5 shortcodes (~3 950 rader). Kartläggning:

| Shortcode | Datakälla | → Mål | Typ av arbete |
|---|---|---|---|
| `[wexoe_hero_automation]` | hårdkodad / atts | **`hero`-sektion** (finns) | **Ingen kod** — content-rebuild i buildern |
| `[wexoe_contact_form]` | hårdkodad / atts | **`contact_form`-sektion** (finns) | **Ingen kod** — content-rebuild |
| `[wexoe_offerings]` | `automation_offerings` | **`tabs`-sektion** (finns) | **Datamigrering** (gated) |
| `[wexoe_team_rack]` | `automation_team_members` | **NY `team_rack`-sektion** | Ny renderare + nya fält (gated) |
| `[wexoe_product_nav]` | `automation_product_navigation` | **NY `product_nav`-sektion** | Ny renderare + nya fält + datamigrering (gated) |

---

## 1. Återanvänd befintliga sektioner — ingen kod

`hero-automation` och `contact-form` täcks helt av de existerande
`hero`- och `contact_form`-sektionstyperna (samma visuella block, samma fält).
Migrering = bygg om pillar-sidans hero/kontaktsektion som `cms_page_sections`
i buildern. Inget plugin-arbete. Hero:ns navy-gradient-bakgrund är hårdkodad i
`sections/hero.php` redan; kontaktformuläret renderas av `Core::renderer('contact-form')`.

**Steg:** i buildern, lägg en `hero`- och en `contact_form`-sektion på pillar-`cms_pages`-recorden, fyll i fälten från den gamla shortcode-datan.

## 2. `offerings-tabs` → `tabs` (datamigrering, gated)

`tabs`-sektionen läser redan `cms_section_tabs`. De 7 `automation_offerings`-recorden
ska kopieras dit:

| `automation_offerings` | → `cms_section_tabs` |
|---|---|
| name/heading | `name` |
| description | `body` |
| benefit_1..5 (lines) | `bullets` |
| image_url | `image_url` |
| cta_text/url | `cta_text` / `cta_url` |
| order | `order` |

**Gated:** kopiera 7 records via Airtable MCP/UI (kräver godkännande — live-data).
Därefter: skapa en `tabs`-sektion på pillar-sidan som länkar dem via `tabs_tab_ids`.
Ingen renderar-kod behövs (tabs-sektionen finns).

## 3. NY sektionstyp: `team_rack` (gated på fält + render-test)

Den enda automation-sektion med helt egen rendering (CompactLogix I/O-rack-metafor,
~1 074 rader CSS/HTML i `wexoe-team-rack.php`). `team_grid` kan **inte**
återanvändas (helt annan visuell modell).

**Datakälla:** `automation_team_members` (befintlig Core-entitet). Verifiera om
den ska aliasas/migreras till `core_coworkers` (kolla fält-paritet: full_name,
title, email, phone, image_url, tags). Tills vidare: läs `automation_team_members`.

**Nya fält på `cms_page_sections` (Airtable — gated):**

| Fält | Typ |
|---|---|
| `tr_eyebrow` | singleLineText |
| `tr_title` | singleLineText |
| `tr_subtitle` | multilineText |
| `tr_tag` | singleLineText (filtrera på members `tags`) |
| `tr_coworker_manual_ids` | multipleRecordLinks → core_coworkers/automation_team_members |
| `tr_scope_country` | singleLineText |
| `tr_scope_division` | singleLineText |
| `tr_limit` | number |

Plus `team_rack` som val i `section_type`-singleSelect.

**Implementation (när fälten finns):**
1. `wexoe-core/entities/cms_page_sections.php`: lägg `tr_*`-mappningar (samma stil som `tg_*`).
2. `New plugins/wexoe-pages/sections/team-rack.php`: closure `function($section, $page, $ctx)` — porta rack-HTML/CSS **verbatim** från `wexoe-team-rack.php` (hjälparna `get_initials/get_module_color/get_module_tab_text/get_module_id` följer med), läs members via `wexoe_pages_pin_then_scope($section['tr_coworker_manual_ids'], 'automation_team_members', fetcher, $section['tr_limit'])`, scope via `wexoe_pages_resolve_scope`. CSS scopas på `#{$ctx['wrapper_id']}` (samma mönster som `team-grid.php`).
3. Registrera `'team_rack' => …` i renderar-mappen i `wexoe-pages.php`.
4. **Render-testa i WP** innan pillar-content flyttas.

## 4. NY sektionstyp: `product_nav` (gated på datamigrering + fält + render-test)

**Blockerare:** `automation_product_navigation` (`tblJa2Kd6QHjFXPJZ`) ligger i
**legacy-basen, ej migrerad till Wexoe NY**. Måste migreras först (→ t.ex.
`cms_product_navigation` enligt namnkonventionen) innan en wexoe-pages-sektion
kan läsa den från SSOT.

**Nya fält på `cms_page_sections` (efter datamigrering):** `pn_eyebrow`,
`pn_title`, `pn_subtitle`, `pn_scope_division` (link), `pn_scope_country` (link),
+ `product_nav` i `section_type`. Renderaren porteras från `wexoe-product-nav.php`
(grid av nav-kort + 2 featured-slots).

## 5. Ordning & Definition of Done

1. [ ] (kod, ofarligt) Lägg `team_rack`-renderare + `tr_*`-schemamappning (mot ovan spec).
2. [ ] (Airtable, gated) Lägg `tr_*`-fält + `team_rack`-option på `cms_page_sections`.
3. [ ] (Airtable, gated) Migrera `automation_offerings` → `cms_section_tabs`.
4. [ ] (Airtable, gated) Migrera `automation_product_navigation` → Wexoe NY; lägg `pn_*`-fält; bygg `product_nav`-renderare.
5. [ ] (content, operativt) Bygg om pillar-sidorna som `cms_pages` med sektionerna ovan (hero, tabs, team_rack, product_nav, contact_form).
6. [ ] (WP) Render-testa varje pillar-sida.
7. [ ] **När allt verifierat:** radera `New plugins/automation-pillar/` och dess shortcode-registreringar. **Klar.**

> Den enda icke-gated kodbiten (`team_rack`-renderare + schemamappning, steg 1)
> kan göras i förväg men är dead tills steg 2 är gjort och kan bara verifieras
> i WP — därför levereras den inte blint här utan väntar på att fält-steget
> godkänns, så att den kan render-testas direkt.
