// Read-only hosted verification before admitting application writes. No secret values are printed.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client/web';
const config=JSON.parse(readFileSync(process.argv[2]??'.env.production.secrets.json','utf8'));
const source=new DatabaseSync(process.argv[3]??'data/T-040-respaldo-2026-09-24/ritmo-candidato.sqlite',{readOnly:true});
const client=createClient({url:config.RITMO_DATABASE_URL,authToken:config.RITMO_DATABASE_TOKEN,intMode:'number'});
const quote=n=>'"'+n.replaceAll('"','""')+'"';
try {
  const names=source.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map(r=>r.name);
  const remoteNames=(await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name")).rows.map(r=>r.name);
  assert.deepEqual(remoteNames,names);
  const counts=[];
  for(const name of names){
    const local=source.prepare(`SELECT * FROM ${quote(name)} ORDER BY rowid`).all().map(r=>({...r}));
    const remote=(await client.execute(`SELECT * FROM ${quote(name)} ORDER BY rowid`)).rows.map(r=>Object.fromEntries(Object.entries(r)));
    assert.deepEqual(remote,local,`Full contents differ: ${name}`);
    counts.push({table:name,source:local.length,remote:remote.length});
  }
  assert.equal((await client.execute('PRAGMA integrity_check')).rows[0].integrity_check,'ok');
  assert.deepEqual((await client.execute('PRAGMA foreign_key_check')).rows,[]);
  const samples={};
  for(const table of ['entries','steps','projects']){
    const ids=source.prepare(`SELECT id FROM ${quote(table)} ORDER BY id`).all();
    samples[table]=[ids[0]?.id,ids.at(-1)?.id];
  }
  console.log(JSON.stringify({counts,integrity:'ok',foreignKeys:'ok',oldestNewestRows:'all equal by ID and full contents'},null,2));
  // Keep detailed IDs in the protected backup folder, not the public task record.
  writeFileSync('data/T-040-respaldo-2026-09-24/hosted-comparison.json',JSON.stringify({checkedAt:new Date().toISOString(),counts,samples},null,2),{mode:0o600});
}finally{source.close();client.close();}
