// Verify the actual deployed origin. No owner records are created or modified.
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { createClient } from '@libsql/client/web';
import { mintSession } from '../../adapters/http/session.ts';
import { protectedRoutes } from '../integration/auth-fixtures.ts';
const secrets=JSON.parse(readFileSync('.env.production.secrets.json','utf8'));
const config={secret:secrets.RITMO_SESSION_SECRET,origin:secrets.RITMO_AUTH_ORIGIN,ownerId:secrets.RITMO_OWNER_ID,passwordHash:secrets.RITMO_PASSWORD_HASH};
const request=(path,options={})=>fetch(config.origin+path,{...options,redirect:'manual',signal:AbortSignal.timeout(30000)});
const tokens=['',(await mintSession(config,'invalid'))+'x',await mintSession(config,'invalid',Date.now()-1800001)];
const matrix=[];
for(const [method,path] of protectedRoutes){
  const statuses=[];
  for(const token of tokens){
    const response=await request(path,{method,headers:{Origin:config.origin,Cookie:token?`ritmo_session=${token}`:''}});
    assert.equal(response.status,path.startsWith('/api/')?401:302,`${method} ${path}`);
    if(!path.startsWith('/api/'))assert.equal(response.headers.get('location'),'/entrar');
    await response.body?.cancel();statuses.push(response.status);
  }
  console.log(method,path,statuses.join('/'));matrix.push({method,path,missing:statuses[0],altered:statuses[1],expired:statuses[2]});
}
const password=readFileSync('.env.initial-access','utf8').match(/^Contraseña inicial: (.+)$/m)?.[1];
assert(password,'Initial access file missing');
const login=await request('/api/auth/password',{method:'POST',headers:{Origin:config.origin,'Content-Type':'application/json'},body:JSON.stringify({password})});
assert.equal(login.status,200,'Deployed password sign-in');await login.body?.cancel();
const cookie=login.headers.getSetCookie().find(v=>v.startsWith('ritmo_session=')).split(';')[0];
for(const path of ['/','/registrar','/ajustes','/archivo','/api/portfolio','/api/settings','/api/archive']){
  const response=await request(path,{headers:{Cookie:cookie}});assert.equal(response.status,200,path);
  const body=await response.text();assert(!body.includes('No se pudo leer')&&!body.includes('No se pudieron leer'),`SSR failed: ${path}`);
}
const response=await request('/api/export',{headers:{Cookie:cookie}});assert.equal(response.status,200,'Hosted SQLite export');
assert.equal(response.headers.get('content-type'),'application/vnd.sqlite3');
const path='data/T-040-respaldo-2026-09-24/ritmo-hosted-export.sqlite';
writeFileSync(path,new Uint8Array(await response.arrayBuffer()),{mode:0o600});
const db=new DatabaseSync(path,{readOnly:true});
const client=createClient({url:secrets.RITMO_DATABASE_URL,authToken:secrets.RITMO_DATABASE_TOKEN});
try{
  assert.equal(db.prepare('PRAGMA integrity_check').get().integrity_check,'ok');assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(),[]);
  for(const {name} of db.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name").all()){
    const sql='SELECT * FROM "'+name.replaceAll('"','""')+'" ORDER BY rowid';
    assert.deepEqual(db.prepare(sql).all().map(r=>({...r})),(await client.execute(sql)).rows.map(r=>Object.fromEntries(Object.entries(r))),`Export contents: ${name}`);
  }
}finally{db.close();client.close();}
writeFileSync('data/T-040-respaldo-2026-09-24/deployed-checks.json',JSON.stringify({checkedAt:new Date().toISOString(),origin:config.origin,matrix,passwordLogin:'passed',ssr:'passed',export:'all tables/rows equal; integrity and FKs passed'},null,2),{mode:0o600});
console.log('PASS deployed authentication, authenticated screens and complete SQLite export; no owner records changed');
