# Manual release and rollback (T-040)

Do not expose Ritmo before T-039 is validated. It was validated by the independent Reviewer on
2026-09-23. Do not modify the source database during migration. Never run the application against
the source while preparing a copy: opening it applies migrations automatically.

## Before migration

1. Verify the release commit with the quality gates, both builds, the real libSQL integration suite,
   and `test/manual/auth-http.mjs` on Node and Workers. Record any unavailable checks explicitly.
2. Stop every Ritmo instance; check `lsof data/ritmo.sqlite` and running app/preview processes.
3. Create a consistent backup through SQLite's backup API using a read-only source connection,
   without importing `openDatabase` on the source. Check integrity and foreign keys.
4. Keep an independent backup. For this release the owner requested a local folder to copy to an
   external device personally: `data/T-040-respaldo-2026-09-24/`. The folder has the SQLite file,
   checksum and instructions; external storage has not been verified by the release agent.
5. Rehearse pending migrations on a copy, comparing every original table and row. Keep both the
   untouched pre-migration export and the migrated candidate. Check the migration ledger in order.
6. Rehearse exporting a disposable remote database, opening that export locally and comparing all
   rows before any live upload. Record oldest/newest entry, step and project equality by ID.

## Migration and release

Create a new, unused Turso database from the migrated candidate with `turso db create NAME
--from-file PATH --wait`. Never import over a populated production database.
For this release, CLI v1.0.32 reported successful upload but produced an empty database. The
read-only comparison caught it. `node test/manual/import-release.mjs` then imported the rehearsed
SQL transactionally, refusing any nonempty destination and comparing every row before commit.
`node test/manual/verify-release.mjs` repeats the full read-only comparison before application writes. Verify every table's
count and complete contents against the candidate before permitting application writes. The new
migration-ledger row and newly created empty tables must be explained, not counted as lost data.

Generate a database-scoped token and fresh session signing secret. Provision these plus the
password hash, existing owner ID and exact Workers HTTPS origin via Wrangler secrets, never Git.
Use a protected file outside tracked paths for `wrangler deploy --secrets-file FILE`. Delete
transient token files after provisioning; keep the fallback password in the owner's password manager.
Workers configuration must use the selected account, serve only the custom domain with `workers_dev: false`
(T-042), and keep preview URLs off.
Deploy the compiled Workers configuration after both build targets pass.

On the deployed HTTPS URL, enumerate all protected paths with missing, tampered and expired cookies;
expect pages to redirect and APIs to refuse, including export. Authenticate and verify screens and
download a SQLite export; open it and compare with the remote database. Do not log cookie/token values.
Record the URL, Worker version, database name, source hash and per-table counts in the task.
The Worker redirects HTTP requests to the same HTTPS URL before authentication and adds
`Strict-Transport-Security: max-age=31536000` to every HTTPS response. Verify both after each deploy
with `node test/manual/https-only.mjs`, which inspects HSTS in raw HTTPS response headers.
The redirect excludes `localhost`, matching the auth origin rule in `adapters/http/session.ts`;
the local Node dev server has no TLS listener. Keep its host set to `localhost` (not `127.0.0.1`).

The owner then registers a real phone passkey and a second device, preserving the first; walks the
step/log/history/finish loop; and measures opening-to-saved-entry time. Record the actual duration.
Synthetic credentials, localhost tests and estimated times cannot satisfy these acceptance criteria.

## Rollback — before it is needed

- Before owner writes on the deployment: disable the Worker's workers.dev route (and any routes),
  keep the remote database for diagnosis, and resume the last validated Node build using a separate
  working copy of the verified pre-migration backup. Let the same ordered migrations run on that
  copy. Configure a localhost auth origin, existing owner ID, fresh secret and fallback password.
  HTTPS-origin passkeys do not transfer to localhost; use password and register a local key if needed.
- After owner writes on the deployment: first stop further writes, export the remote database and
  verify integrity, foreign keys and row equality. Resume locally from that latest export, not the
  old backup, or the newly recorded work would be lost. If export is unavailable, keep the service
  closed and recover the remote data before resuming writes. Never discard it to make rollback quick.
- For code-only failure with a compatible schema, restore the previous Worker version; version
  rollback does not roll back Turso data. A first deployment has no prior working Worker version.
- Retain source and all backup copies. Do not overwrite `data/ritmo.sqlite` as a rollback shortcut.

References checked during preparation:
[Turso import from SQLite](https://docs.turso.tech/cli/db/create),
[Wrangler secrets](https://developers.cloudflare.com/workers/configuration/secrets/),
[Worker versions](https://developers.cloudflare.com/workers/versions-and-deployments/).

## Changing the origin

`RITMO_AUTH_ORIGIN` lives in `.env.production.secrets.json`, and every deploy passes that file with
`--secrets-file`. **Change it there, never only with `wrangler secret put`** — the next deploy would
silently put the old origin back and every write would be refused 403.

Changing the origin also changes the passkeys' relying party, so every registered passkey stops being
offered. Confirm the owner can sign in with the password first; afterwards they register a new passkey
and revoke the old ones from Ajustes.

## This release

- Application base: commit `6375cb3`. T-042 moved it to its own domain on 2026-09-24, version `9cf0fa02`.
- Cloudflare account: `46f5d55d7bec11f8408ac9990441fe4d`; Worker `ritmo`.
- Live origin: `https://ritmo.cosmiqstudio.com`, a Custom Domain on the Worker. `workers.dev` is off and
  answers 404. The zone's apex Worker is separate and was compared byte for byte before and after.
- Turso organization: `lionns`; database `ritmo`, default group in `aws-us-east-1`.
- Backup folder: `data/T-040-respaldo-2026-09-24/`, ignored by Git and private filesystem permissions.
- Source backup SHA-256: `c166ac8959786249b375ed70e74606c28c135fbbecd7769ad124bf3209b45064`.
- Candidate SHA-256: `c7f13f785db42e5cd46d1191b1ac282fe37fe7de44a0b8d55c78d6599ae607e7`.
- Local rehearsal: `RITMO_SQLD_BINARY=/path/to/sqld node test/manual/release-rehearsal.mjs`.
  Source → migration copy → local libSQL → exported SQLite → local reopen all compared equal.
- Hosted import: every table and every row matched the candidate before application writes.
  Detailed IDs and table counts are retained in the protected folder's `hosted-comparison.json`.
- Deployment secrets live in ignored `.env.production.secrets.json` with mode 0600; initial access
  is in ignored `.env.initial-access`, also 0600. Neither file is copied into the backup folder.
  Preserve secrets securely for repeatable deployment and move the initial password to a password
  manager; do not paste either file into reviews, logs or task records.

## Hosted verification result — 2026-09-24

Current Worker version: `e822deb6-92e9-4867-ac62-e45d2ebc8a71`.
The first version authenticated correctly but SSR's same-origin API fetch did not route back into
Workers. Adding `global_fetch_strictly_public` fixed the deployed-only failure, as documented in
[Cloudflare's fetch behavior](https://developers.cloudflare.com/workers/configuration/compatibility-flags/).
The current middleware also redirects HTTP before auth and applies HSTS to HTTPS responses.

`node test/manual/deployed-auth.mjs` passed against the HTTPS origin: five private pages redirect,
18 API methods return 401 for missing/altered/expired cookies, password sign-in succeeds, private
screens load their data, and export opens as SQLite with every table and row equal to the hosted
store. Its protected JSON report is in the backup folder. Authentication checks legitimately add
operational rate-counter rows after the pre-write comparison; no owner project/step/entry was changed.
The hosted export was then reopened locally through the migration runner with every row preserved,
completing a second rollback rehearsal against the actual provider's export.

The initial independent review found that HTTP served the password page. The Worker now redirects
HTTP to HTTPS before auth and adds HSTS; `node test/manual/https-only.mjs` passed against the new
release. Fetch filtered HSTS from script-visible response headers, so the check reads raw HTTPS.
`node test/manual/deployed-auth.mjs` was repeated on this version: all 23 protected methods kept
their expected 302/401 results, password login and private screens passed, and the complete export
still matched hosted rows.
The final gates passed: 67 unit tests, 120 integration tests, isolation, typecheck and both builds.
`npm run dev` also served authenticated portfolio and export using a disposable local SQLite copy.
The owner reports the phone entry took under five seconds. Two-device passkeys and the rest of the
step/log/history/finish loop are still pending.

Repeat deploy after gates with:

```sh
npm run build
npx wrangler deploy --config dist/workers/server/wrangler.json --secrets-file .env.production.secrets.json
```

Do not rerun the empty-database import after release. Hosted equality checks against the original
candidate are only valid before new owner writes; subsequent checks must compare a fresh export.
