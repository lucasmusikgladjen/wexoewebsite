# Airtable Schema — Wexoe Landing Pages

Base ID: `appXoUcK68dQwASjF`

## Tabell 1: Landing Pages (`tbl8KDqGq0Ray1uqS`)

Fält (alla string om inget annat anges):

- **Name** — Samma som Slug
- **Slug** — URL-slug, lowercase a-z, 0-9, bindestreck
- **H1** — Huvudrubrik
- **Hero Description** (multilineText)
- **Hero Image** (url)
- **Hero CTA Text**, **Hero CTA URL** (url)
- **Hero CTA2 Text**, **Hero CTA2 URL** (url)
- **Content H2**
- **Content Text** (multilineText)
- **Content Benefits** (multilineText) — En benefit per rad, \n-separerad. Om input är en paragraf eller kommaseparerad lista, splitta till en per rad.
- **Sidebar Type** (singleSelect) — Ett av: `case`, `event`, `leadmagnet`, `calculator`
- Case-fält (bara om Sidebar Type = case): **Case Title**, **Case Description** (multilineText), **Case Image** (url), **Case Outcomes** (multilineText, \n-separerad, samma regel som Benefits), **Case CTA Text**, **Case CTA URL** (url)
- Event-fält (bara om Sidebar Type = event): **Event Type**, **Event Title**, **Event Description** (multilineText), **Event Date**, **Event Location**, **Event Webhook** (url)
- Leadmagnet-fält (bara om Sidebar Type = leadmagnet): **Magnet Title**, **Magnet Format**, **Magnet Description** (multilineText), **Magnet File URL** (url), **Magnet Webhook** (url)
- Calculator-fält (bara om Sidebar Type = calculator): **Calc Title**, **Calc HTML** (multilineText, HTML-kod)
- **Contact Name**, **Contact Title**, **Contact Email** (email), **Contact Phone** (phoneNumber), **Contact Image** (url), **Contact Quote** (multilineText)
- **Color Main**, **Color Secondary** — Hex-färgkoder
- **Show Content**, **Show Sidebar**, **Show Tabs**, **Show Contact** — checkbox, ska ALLTID inkluderas

## Tabell 2: LP Tabs (`tblvecOh3rAGmw3mw`)

- **Landing Page** — Linked record, array med Landing Page record-ID: `["recXXX"]`
- **Name** — Tab-rubrik i pill-knappen
- **Tab Type** (singleSelect) — Ett av: `textimage`, `fullmedia`, `faq`, `calameo`, `downloads`, `compare`, `steps`
- **Order** (number) — 1-baserat index
- **Visa** (checkbox) — alltid `true`

Typ-specifika fält (inkludera BARA de som hör till tabens Tab Type):

- **textimage**: `TI H2`, `TI Text` (multilineText), `TI Benefits` (multilineText, \n-separerad), `TI Image` (url), `TI Inverted` (checkbox)
- **fullmedia**: `FM URL` (url)
- **faq**: `FAQ Items` (multilineText) — Format: `Q: Fråga\nA: Svar\n\nQ: Fråga2\nA: Svar2`
- **calameo**: `Calameo 1 Title`, `Calameo 1 Src` (url), `Calameo 2 Title`, `Calameo 2 Src` (url), `Calameo 3 Title`, `Calameo 3 Src` (url)
- **downloads**: Inga tab-fält — downloads skapas i LP Downloads-tabellen
- **compare**: `Compare Title`, `Compare Col A`, `Compare Col B`, `Compare Rows` (multilineText) — Format: `Label | Värde A | Värde B` per rad (\n-separerad)
- **steps**: `Steps Title`, `Steps` (multilineText) — Format: `Rubrik | Beskrivning` per rad (\n-separerad)

## Tabell 3: LP Downloads (`tblbLM827DzjWGjCR`)

- **Tab** — Linked record, array med Tab record-ID: `["recXXX"]`
- **Name**
- **Description**
- **Thumbnail** (url)
- **File URL** (url)
- **Button Text**
- **Order** (number)
- **Visa** (checkbox) — alltid `true`

## Formateringsregler

1. Utelämna fält med tomt värde — skicka INTE tomma strängar
2. Benefits/Outcomes: Om input ser ut som en paragraf eller kommaseparerad lista → splitta till en per rad (\n)
3. FAQ: Säkerställ Q:/A:-prefix på varje fråga/svar
4. Compare rows: Säkerställ pipe-format `Label | Värde A | Värde B`
5. Steps rows: Säkerställ pipe-format `Rubrik | Beskrivning`
6. Boolean-fält (Show Content, Show Sidebar, Show Tabs, Show Contact, Visa, TI Inverted) ska ALLTID inkluderas
