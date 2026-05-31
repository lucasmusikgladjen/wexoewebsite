# `schema/` — entitetsscheman (AUTO-SPEGLAD, ARKITEKTURPLAN FAS 0–1)

> ⚠️ **Redigera INTE `*.json` här.** De är automatiska spegelkopior av de
> kanoniska schemana i `wexoeplugins/wexoe-core/schema/`. Ändra fält **där**,
> pusha till `main`, så uppdateras filerna här av sig själva (vanligtvis inom
> någon minut). Ändringar du gör direkt i den här mappen skrivs över vid nästa
> synk.

Dessa JSON-filer definierar en entitets fältlista *en gång* (i wexoe-core) och
konsumeras här av `lib/schema/to-state.ts` (record → state), samtidigt som
wexoe-core (PHP) läser samma fil för sin read-normalisering. Samma fältlista
driver alltså både builder-read och PHP-read.

## Hur synken fungerar

GitHub Actions-workflowet `.github/workflows/sync-schema.yml` i **wexoeplugins**
triggar när `wexoe-core/schema/**` ändras på `main`, speglar `*.json` hit och
pushar direkt till builderns `main`. Är buildern kopplad till auto-deploy (Vercel
på push) går schema-ändringen live utan någon manuell åtgärd. `README.md` i den
här mappen rörs aldrig av synken.

Engångs-setup (GitHub App-credential) dokumenteras i wexoeplugins:
`.github/SCHEMA_SYNC_SETUP.md`.

Status: `cms_customer_type_pages` är piloten (FAS 1). Övriga entiteter migreras
en i taget — varje ny `*.json` i wexoe-core dyker upp här automatiskt.
