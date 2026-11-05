const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
require('../clinic-core.js');
const C=globalThis.ClinicCore;
const visit=(extra={})=>({id:'v1',date:'2026-10-23',time:'10:00',client:'QA-1',duration:60,status:'scheduled',service:'Konsultacja',place:'Gabinet',...extra});
test('Calendar rejects impossible dates, times, midnight crossing and missing patients',()=>{
  for(const date of ['2026-02-29','2026-13-01','2026-00-01','2026-10-32','2026-1-1'])assert.equal(C.dateOK(date),false);
  assert.equal(C.dateOK('2024-02-29'),true);
  for(const extra of [{time:'24:00'},{time:'10:99'},{duration:0},{duration:-1},{duration:10.5},{client:' '},{time:'23:30',duration:60},{status:'unknown'}])assert.equal(C.validateVisit(visit(extra)),false);
  assert.equal(C.validateVisit(visit()),true);
});
test('Overlap considers full duration, adjacent slots and cancelled appointments',()=>{
  assert.equal(C.overlap(visit(),visit({time:'10:30'})),true);
  assert.equal(C.overlap(visit(),visit({time:'11:00'})),false);
  assert.equal(C.overlap(visit(),visit({time:'09:30',duration:45})),true);
  assert.equal(C.overlap(visit(),visit({status:'cancelled'})),false);
  assert.equal(C.overlap(visit(),visit({status:'noshow'})),false);
  assert.equal(C.overlap(visit(),visit({date:'2026-10-24'})),false);
});
test('CSV parses BOM, Polish labels, quoted delimiters/newlines and zero duplicates',()=>{
  const text='\uFEFFdata;godzina;pacjent;usluga;czas;status;id\r\n2026-10-23;10:00;"QA; 1";"Pierwsza\nDruga";45;odbyta;abc\r\n';
  const r=C.importCSV(text,[]);assert.equal(r.issues.length,0);assert.equal(r.added[0].client,'QA; 1');assert.equal(r.added[0].service,'Pierwsza\nDruga');assert.equal(r.added[0].status,'completed');
  assert.equal(C.importCSV(text,r.added).duplicates,1);
});
test('CSV never silently changes existing external IDs or imports invalid rows',()=>{
  const text='date,time,client,duration,status,id\n2026-10-23,11:00,QA-1,30,scheduled,abc';
  assert.match(C.importCSV(text,[visit({source:'csv',externalId:'abc'})]).issues[0],/ID/);
  assert.equal(C.importCSV(text.replace('11:00','10:30'),[visit()]).issues.length,1);
  assert.equal(C.importCSV(text.replace('scheduled','x'),[]).issues.length,1);
  assert.throws(()=>C.importCSV('date,date,client\n2026-10-23,10:00,QA',[]));
  assert.throws(()=>C.parseCSV('date,time,client\n2026-10-23,10:00,"QA'));
  assert.equal(C.importCSV('date,time,client\n2026-10-23,10:00,QA,extra',[]).issues.length,1);
});
test('Metrics separate completion, cancellation and cards linked by visit/patient/date',()=>{
  const visits=[visit({status:'completed'}),visit({id:'v2',status:'cancelled'}),visit({id:'v3',status:'noshow'}),visit({id:'v4',date:'2026-09-01',status:'completed'})];
  const m=C.metrics(visits,[{visitId:'v1',patient:'OTHER',date:'2026-10-23'}],'2026-10-23');
  assert.deepEqual(m,{today:1,month:3,completed:1,cancelled:1,noshow:1,missing:2});
  assert.equal(C.metrics(visits,[{visitId:'v1',patient:'QA-1',date:'2026-10-23'}],'2026-10-23').missing,1);
});
const payload=()=>({format:'maciej-panel',version:1,data:{maciej_visits:JSON.stringify([visit()]),maciej_docs:JSON.stringify([{patient:'QA-1',date:'2026-10-23',proc:[],subj:'Treść QA'}])}});
test('Backup whitelists data and rejects credentials, invalid shape and malformed records',()=>{
  assert.deepEqual(C.validateBackup(payload()),payload());
  for(const data of [{maciej_ai_key:'secret'},{maciej_visits:'{}'},{maciej_docs:'[null]'},{maciej_plan_v2:'{"items":[null]}'},{maciej_favorites:'[{}]'}])assert.throws(()=>C.validateBackup({...payload(),data}));
});
test('Encrypted backup round-trip preserves Polish content; wrong password/tampering fail',async()=>{
  const input=payload(),password='tylko-testowe-haslo-123';
  const encrypted=await C.encrypt(input,password);
  assert.ok(!JSON.stringify(encrypted).includes('QA-1'));
  assert.deepEqual(await C.decrypt(encrypted,password),input);
  await assert.rejects(()=>C.decrypt(encrypted,'niepoprawne-haslo'));
  await assert.rejects(()=>C.decrypt({...encrypted,cipher:encrypted.cipher.slice(0,-8)+'AAAAAAAA'},password));
  await assert.rejects(()=>C.encrypt(input,'short'));
  await assert.rejects(()=>C.decrypt({...encrypted,iterations:1},password));
});
test('Hosting denies missing config, malformed auth and wrong password; response is not cacheable',async()=>{
  const source=fs.readFileSync(path.join(__dirname,'../../netlify/edge-functions/basic-auth.ts'),'utf8').replace('export default','globalThis.handler =');
  const env={},sandbox={Netlify:{env:{get:k=>env[k]}},Response,TextDecoder,Uint8Array,atob};vm.createContext(sandbox);vm.runInContext(source,sandbox);
  const context={next:()=>new Response('ok')};const req=auth=>new Request('https://example.test/panel/',{headers:auth?{authorization:auth}:{}});
  assert.equal((await sandbox.handler(req(),context)).status,503);
  env.PANEL_AUTH_USER='QA';env.PANEL_AUTH_PASSWORD='qa-test-password';
  for(const auth of [undefined,'Basic @','Basic '+btoa('QA:wrong')])assert.equal((await sandbox.handler(req(auth),context)).status,401);
  const ok=await sandbox.handler(req('Basic '+btoa('QA:qa-test-password')),context);assert.equal(ok.status,200);assert.equal(ok.headers.get('cache-control'),'no-store');
});
