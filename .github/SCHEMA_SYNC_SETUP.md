# Schema-synk → builder: engångs-setup

Workflowet `.github/workflows/sync-schema.yml` speglar automatiskt
`wexoe-core/schema/*.json` till repot **wexoebuilder** varje gång ett schema
ändras på `main`. Det här dokumentet beskriver den **enda** manuella åtgärden:
att ge workflowet rätt att skriva till det andra repot. Görs en gång — sedan
är allt automatiskt.

Default-`GITHUB_TOKEN` i en Action når bara sitt eget repo. För att skriva till
wexoebuilder behövs en credential med tvärgående åtkomst. Välj **ett** av
alternativen nedan (App rekommenderas).

---

## Alternativ 1 — GitHub App (rekommenderat)

Robustast: kortlivade tokens, smal behörighet, ingen personlig användare inblandad.

1. **Skapa appen.** Org-nivå: `https://github.com/organizations/lucasmusikgladjen/settings/apps` → **New GitHub App**.
   - Namn: t.ex. `wexoe-schema-sync`.
   - Avbocka **Webhook → Active** (behövs inte).
   - **Repository permissions → Contents: Read and write.** Inget annat behövs.
   - Skapa appen.
2. **Generera en private key.** På appens sida → **Private keys → Generate a private key.** En `.pem`-fil laddas ner.
3. **Installera appen** på org:en, begränsa till repot **wexoebuilder** (Only select repositories). (Den behöver inte installeras på wexoeplugins — workflowet kör där och checkar bara ut sitt eget repo med default-token.)
4. **Lägg in credentials i wexoeplugins** (`Settings → Secrets and variables → Actions`):
   - **Variable** `SCHEMA_SYNC_APP_ID` = appens *App ID* (siffran på appens sida).
   - **Secret** `SCHEMA_SYNC_APP_PRIVATE_KEY` = hela innehållet i `.pem`-filen (inkl. `-----BEGIN...`-raderna).

Klart. Workflowet mintar en token per körning via `actions/create-github-app-token`.

---

## Alternativ 2 — Fine-grained PAT (enklare, mindre robust)

1. `https://github.com/settings/tokens?type=beta` → **Generate new token**.
   - **Resource owner:** lucasmusikgladjen.
   - **Only select repositories:** wexoebuilder.
   - **Repository permissions → Contents: Read and write.**
   - Sätt en utgångstid (måste förnyas då).
2. Lägg in i wexoeplugins som **Secret** `SCHEMA_SYNC_TOKEN`.
3. Byt i workflowet: ta bort `create-github-app-token`-steget och använd
   `token: ${{ secrets.SCHEMA_SYNC_TOKEN }}` direkt i builder-checkouten.

Nackdel: tokenen är knuten till en person och måste förnyas vid utgång.

---

## Valfritt — trigga deploy explicit

Om wexoebuilder **inte** auto-deployar på push till `main` (t.ex. ingen
Vercel-git-koppling), skapa en **Deploy Hook**-URL hos värden och lägg den som
secret `BUILDER_DEPLOY_HOOK` i wexoeplugins. Workflowet POST:ar då till den
efter en lyckad synk så ett nytt bygge startar. Saknas secret:en hoppas steget
tyst över (lämplig om push redan triggar deploy).

- **Vercel:** Project → Settings → Git → Deploy Hooks → skapa hook för `main`.

---

## Verifiera

1. Ändra valfri `wexoe-core/schema/*.json` på `main` (t.ex. en kommentar) och pusha.
2. **Actions**-fliken i wexoeplugins → körningen *"Sync schema → builder"* ska bli grön.
3. wexoebuilder/`schema/` ska få en ny commit från `wexoe-schema-bot`.

Manuell körning utan schemaändring: **Actions → Sync schema → builder → Run workflow** (`workflow_dispatch`).
