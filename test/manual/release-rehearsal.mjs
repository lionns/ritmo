// Offline migration/import/export/restore rehearsal. The live source is only opened read-only.
import assert from 'node:assert/strict';
import { DatabaseSync, backup } from 'node:sqlite';
import { createHash } from 'node:crypto';
import { chmodSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { openDatabase } from '../../adapters/sqlite/database.ts';
import { libsqlDriver } from '../integration/libsql-driver.ts';
import { exportDatabase } from '../../adapters/libsql/export.ts';
const sourcePath = resolve(process.argv[2] ?? 'data/ritmo.sqlite');
const candidatePath = resolve(process.argv[3] ?? 'data/T-040-respaldo-2026-09-24/ritmo-candidato.sqlite');
assert.notEqual(sourcePath, candidatePath);
const hash = path => createHash('sha256').update(readFileSync(path)).digest('hex');
const sourceHash = hash(sourcePath);
const quote = name => '"' + name.replaceAll('"', '""') + '"';
function snapshot(db) {
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all();
  return Object.fromEntries(tables.map(({name}) => [name, db.prepare(`SELECT * FROM ${quote(name)} ORDER BY rowid`).all().map(row => ({...row}))]));
}
const original = new DatabaseSync(sourcePath, {readOnly:true});
const before = snapshot(original);
await backup(original,candidatePath);original.close();chmodSync(candidatePath,0o600);
const candidate = openDatabase(candidatePath);
assert.equal(candidate.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
assert.deepEqual(candidate.prepare('PRAGMA foreign_key_check').all(),[]);
const after = snapshot(candidate);
for(const [table,rows] of Object.entries(before)) {
  if(table==='_ritmo_migrations') {
    assert.deepEqual(after[table].slice(0,rows.length),rows);
    assert.deepEqual(after[table].slice(rows.length).map(x=>x.name),['0007_auth_challenges.sql','0008_owner_time_zone.sql']);
  } else assert.deepEqual(after[table],rows,`migration preservation: ${table}`);
}
candidate.close();
const dir=mkdtempSync(join(tmpdir(),'ritmo-release-rehearsal-'));chmodSync(dir,0o700);
let remote;let restore;
try {
  remote=await libsqlDriver.open(join(dir,'remote'));
  restore=await remote.configureRuntime();
  // Driver created a fresh latest schema. Clear it only in this disposable loopback server,
  // then replay the candidate dump within one deferred-FK transaction.
  await remote.exec('PRAGMA foreign_keys=OFF;'+Object.keys(after).map(n=>`DROP TABLE ${quote(n)};`).join('')+'PRAGMA foreign_keys=ON;');
  const statements=JSON.parse(execFileSync('python3',['-c','import sqlite3,sys,json; c=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True); print(json.dumps(list(c.iterdump())))',candidatePath],{encoding:'utf8'}));
  const body=statements.filter(sql=>!['BEGIN TRANSACTION;','COMMIT;'].includes(sql));
  const schema=body.filter(sql=>sql.startsWith('CREATE TABLE'));
  const remaining=body.filter(sql=>!sql.startsWith('CREATE TABLE'));
  const dump='BEGIN TRANSACTION; PRAGMA defer_foreign_keys=ON;'+[...schema,...remaining].join('\n')+'COMMIT;';
  await remote.exec(dump);
  for(const [table,rows] of Object.entries(after)) {
    assert.deepEqual(await remote.prepare(`SELECT * FROM ${quote(table)} ORDER BY rowid`).all(),rows,`remote equality: ${table}`);
    console.log(`${table}: source=${before[table]?.length ?? 0} candidate=${rows.length} remote=${rows.length}`);
  }
  const exported=await exportDatabase({url:process.env.RITMO_DATABASE_URL});
  const restoredPath=join(dir,'restored.sqlite');writeFileSync(restoredPath,exported.body,{mode:0o600});
  const restored=new DatabaseSync(restoredPath,{readOnly:true});
  assert.equal(restored.prepare('PRAGMA integrity_check').get().integrity_check,'ok');
  assert.deepEqual(restored.prepare('PRAGMA foreign_key_check').all(),[]);
  assert.deepEqual(snapshot(restored),after);
  for(const table of ['entries','steps','projects']) {
    const rows=after[table];const ordered=[...rows].sort((a,b)=>String(a.id).localeCompare(String(b.id)));
    for(const row of [ordered[0],ordered.at(-1)])if(row)assert.deepEqual({...restored.prepare(`SELECT * FROM ${quote(table)} WHERE id=?`).get(row.id)},row);
    console.log(`${table}: oldest/newest IDs and complete rows preserved`);
  }
  restored.close();
  const resumed=openDatabase(restoredPath);assert.deepEqual(snapshot(resumed),after);resumed.close();
  assert.equal(hash(sourcePath),sourceHash,'live source changed');
  console.log('PASS: migration, local HTTP import, remote export, local rollback, idempotent reopen; live source unchanged');
  console.log('Candidate SHA-256:',hash(candidatePath));
} finally {
  remote?.close();if(restore)await restore();await libsqlDriver.cleanup();rmSync(dir,{recursive:true,force:true});
}
