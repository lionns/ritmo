// Explicit one-shot fallback for a verified EMPTY destination. Never overwrites a populated DB.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client/web';
const config=JSON.parse(readFileSync(process.argv[2]??'.env.production.secrets.json','utf8'));
const path=process.argv[3]??'data/T-040-respaldo-2026-09-24/ritmo-candidato.sqlite';
const local=new DatabaseSync(path,{readOnly:true});
const client=createClient({url:config.RITMO_DATABASE_URL,authToken:config.RITMO_DATABASE_TOKEN});
const tx=await client.transaction('write');
try{
  assert.equal((await tx.execute("SELECT count(*) n FROM sqlite_master WHERE type='table'")).rows[0].n,0,'Destination is not empty; import refused');
  const statements=JSON.parse(execFileSync('python3',['-c','import sqlite3,sys,json; c=sqlite3.connect("file:"+sys.argv[1]+"?mode=ro",uri=True); print(json.dumps(list(c.iterdump())))',path],{encoding:'utf8'}));
  const body=statements.filter(sql=>!['BEGIN TRANSACTION;','COMMIT;'].includes(sql));
  await tx.execute('PRAGMA defer_foreign_keys=ON');
  await tx.executeMultiple([...body.filter(sql=>sql.startsWith('CREATE TABLE')),...body.filter(sql=>!sql.startsWith('CREATE TABLE'))].join('\n'));
  assert.deepEqual((await tx.execute('PRAGMA foreign_key_check')).rows,[]);
  for(const {name} of local.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()){
    const sql='SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid';
    assert.deepEqual((await tx.execute(sql)).rows.map(r=>Object.fromEntries(Object.entries(r))),local.prepare(sql).all().map(r=>({...r})),name);
  }
  await tx.commit();console.log('Imported all schema and rows in one transaction; every table verified before commit.');
}catch(error){await tx.rollback();throw error;}finally{tx.close();client.close();local.close();}
