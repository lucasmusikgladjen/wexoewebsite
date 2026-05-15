# PR #47 conflict resolution

PR #47 (`codex/review-repo-against-development-plan`) was opened against the older
`claude/wexoe-page-builder-setup-DmUOd` base, while `main` had already absorbed PR
#46 (`claude/migrate-pa-family`). Both branches touched the same page-builder
surface area, so Git could not safely choose one side automatically.


Important nuance: this resolution does **not** treat PR #47 as a replacement for
PR #46. PR #46 remains the source of truth for the Product Area Wexoe NY / snake_case
schema migration. PR #47 is only mined for the generic builder and registry UX that
can sit safely on top of that newer data contract.

The conflicts existed for three reasons:

1. **Shared builder shell changes** — PR #47 introduced the standardized
   `SectionEditor`, dirty-state/save UX, and explicit API/edit paths in
   `PageTypeBuilder`; PR #46 had meanwhile migrated Product Area and related
   page types onto the same generic builder and route-factory plumbing.
2. **Registry ownership moved in both branches** — PR #47 centralized page-type
   counts, create/edit routing, and cache entities in the page-type registry;
   PR #46 had already added registry-driven homepage listing and server-side
   cache metadata for Product Area, Audience, and Unique Page.
3. **Contact-form mapper schema changed twice** — PR #47 refactored landing-page
   reverse mapping to reuse shared Airtable helpers and the shared contact-form
   mapper; PR #46 changed Product Area to the Wexoe NY / snake_case schema. The
   final resolution keeps the shared mapper helpers and preserves snake_case
   compatibility so both landing and Product Area reads stay aligned.

Resolution notes:

- Keep PR #46's latest route/page-type migration as the base, then re-apply PR
  #47's generic builder UX on top of it.
- Keep registry metadata as the single source of truth for homepage counts,
  create/edit navigation, and cache invalidation.
- Keep Claude-backed landing-page writes intact; only landing reverse-load and
  legacy contact-form helper code use shared deterministic mapper helpers.
