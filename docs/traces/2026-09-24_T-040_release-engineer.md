## Trace
- 2026-09-23–24 — role: Release Engineer
  - read: STATUS, harness, T-040, validated T-039, quality gates, D-032–034, runtime/export code.
    Applied Cloudflare and Wrangler skills; current CLI/docs checked before cloud operations.
  - baseline: commit 6375cb3; unit 67/67, integration 120/120 with temporary sqld, isolation,
    types, both builds and harness green. No application changes; account selection confirmed.
  - account: user selected juans.leonv@icloud.com; Cloudflare Juan account, Turso login lionns.
    Official Turso CLI v1.0.32 downloaded into /tmp and SHA-256 verified; tokens never printed.
  - backup: no live Ritmo process or open source DB handle; read-only SQLite backup API used.
    Integrity/FKs clean; backup hash c166ac8959786249b375ed70e74606c28c135fbbecd7769ad124bf3209b45064.
  - exception: user requested a local folder to copy to external storage personally. Packaged it
    with checksum/instructions; off-machine storage not verified. Source remains untouched.
  - rehearsal: migration 0007 on copy; every original row preserved, ledger 6→7, two empty tables.
    Local libSQL import/export restored all 13 tables; integrity/FKs and oldest/newest IDs pass.
  - rollback: documented before cloud upload; restored export reopened idempotently in local SQLite.
    Dump import initially lacked referenced tables; create-all-schema-first fixed the rehearsal.
  - cloud: CLI file upload produced empty schema; stopped exposure, imported atomically into empty
    destination and compared every row. No existing database overwritten. Hosted integrity/FKs clean.
  - deploy: version 7406cd86-dee7-42e9-a930-ccb2d5720d80 on ritmo.juan-account.workers.dev.
    SSR initially failed; documented global_fetch_strictly_public flag fixed same-origin routing.
  - hosted: all 23 protected page/API methods tested with missing/altered/expired cookies; login,
    private screens and complete export pass. Actual export restored locally, all rows preserved.
  - final: unit 67/67, integration 120/120, isolation, types, dual builds; local dev copy verified.
  - owner: reports saved phone entry took <5 seconds; NFR-1 met. Full loop and second-device
    passkey results remain pending.
