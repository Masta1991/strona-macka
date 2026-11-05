/* Offline DOM integration, not a browser/visual accessibility acceptance test. */
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'../..');
const {JSDOM,VirtualConsole}=require(path.join(root,'.tmp/panel-20261023/test-runtime/node_modules/jsdom'));
const {webcrypto}=require('node:crypto');
function app(seed={}){
  const errors=[],navigation=[];const console=new VirtualConsole();console.on('jsdomError',e=>{if(e.message==='Not implemented: navigation (except hash changes)')navigation.push(e.message);else errors.push(e.message);});
  const dom=new JSDOM(fs.readFileSync(path.join(root,'panel/index.html'),'utf8'),{url:'https://panel.example.test/panel/',runScripts:'outside-only',virtualConsole:console}),w=dom.window;
  w.matchMedia=()=>({matches:false});w.scrollTo=()=>{};w.structuredClone=structuredClone;w.TextEncoder=TextEncoder;w.TextDecoder=TextDecoder;
  Object.defineProperty(w,'crypto',{value:webcrypto});
  w.fetch=()=>{throw Error('Unexpected network request');};
  w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};
  w.HTMLDialogElement.prototype.close=function(value){this.returnValue=value||'';this.open=false;this.dispatchEvent(new w.Event('close'));};
  for(const [key,value] of Object.entries(seed))w.localStorage.setItem(key,JSON.stringify(value));
  w.eval(['exercises.js','panel/demo-library.js','panel/clinic-core.js','panel/panel.js','panel/clinic.js','panel/docs.js'].map(file=>fs.readFileSync(path.join(root,file),'utf8')).join('\n')); 
  const $=id=>w.document.getElementById(id);
  const fill=(id,value)=>{$(id).value=value;$(id).dispatchEvent(new w.Event('input',{bubbles:true}));};
  const click=id=>$(id).click();
  const submit=()=> $('visit-form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));
  const tick=()=>new Promise(resolve=>setImmediate(resolve));
  const confirm=async()=>{click('confirm-ok');await tick();};
  return {dom,w,$,fill,click,submit,confirm,tick,navigation,close:()=>{w.close();assert.deepEqual(errors,[],'No unexpected DOM script errors');}};
}
test('Demo collection filters, favorites, explicit video loading and teardown',()=>{
  const a=app();try{
    assert.equal(a.w.document.querySelectorAll('.ex-card').length,22);
    a.click('demo-browse');assert.equal(a.w.document.querySelectorAll('.ex-card').length,4);
    assert.equal(a.$('video-frame').hasAttribute('src'),false);
    a.w.document.querySelector('[data-video="demo-e3-bridge"]').click();assert.equal(a.$('video-modal').open,true);
    assert.equal(a.$('video-frame').hasAttribute('src'),false);assert.match(a.$('video-source').textContent,/DEMO.*E3 Rehab/);
    a.click('video-load');assert.equal(a.$('video-frame').src,'https://www.youtube-nocookie.com/embed/_bCmHW_mLCU?rel=0');
    a.$('video-modal').close();assert.equal(a.$('video-frame').hasAttribute('src'),false);
    a.w.document.querySelector('[data-video="demo-e3-heel"]').click();assert.equal(a.$('video-frame').hasAttribute('src'),false);
    assert.equal(a.$('video-consent').classList.contains('hidden'),false);a.$('video-modal').close();
    a.fill('ex-search','Mata');assert.equal(a.w.document.querySelectorAll('.ex-card').length,3);
    a.w.document.querySelector('[data-favorite="demo-e3-bird"]').click();a.click('ex-favorites');assert.equal(a.w.document.querySelectorAll('.ex-card').length,1);
    a.$('ex-collection').value='existing';a.$('ex-collection').dispatchEvent(new a.w.Event('change'));assert.equal(a.w.document.querySelectorAll('.ex-card').length,0);
    a.click('demo-browse');assert.equal(a.w.document.querySelectorAll('.ex-card').length,4);
  }finally{a.close();}
});

test('Demo sets preserve patient fields, confirm replacement, retain labels on reload and export',async()=>{
  const a=app();try{
    a.fill('plan-patient','QA-DEMO');a.fill('plan-goal','Existing goal');
    a.w.document.querySelector('[data-demo-set="0"]').click();await a.tick();
    assert.equal(a.w.Panel.getPlan().items.length,3);assert.equal(a.$('plan-patient').value,'QA-DEMO');assert.equal(a.$('plan-goal').value,'Existing goal');
    a.w.document.querySelector('[data-demo-set="1"]').click();await a.tick();a.click('confirm-cancel');await a.tick();assert.equal(a.w.Panel.getPlan().items.length,3);
    a.w.document.querySelector('[data-demo-set="1"]').click();await a.confirm();assert.equal(a.w.Panel.getPlan().items.length,2);
    a.click('plan-preview');assert.match(a.$('export-body').textContent,/DEMO — plan pokazowy/);assert.equal(a.$('export-body').querySelectorAll('a').length,2);
    const restored=app({maciej_plan_v2:JSON.parse(a.w.localStorage.maciej_plan_v2)});assert.equal(restored.w.Panel.getPlan().items.length,2);assert.match(restored.$('plan-items').textContent,/DEMO/);restored.close();
  }finally{a.close();}
});

test('All modules initialize without network; formal fields persist and export safely',()=>{
  const a=app();try{
    a.fill('doc-patient','QA-1');a.fill('doc-subj','Opis QA');a.fill('doc-fullname','<img src=x onerror=alert(1)>');a.fill('doc-course','Przebieg QA');a.click('doc-save');
    const docs=JSON.parse(a.w.localStorage.maciej_docs);assert.equal(docs.length,1);assert.equal(docs[0].course,'Przebieg QA');assert.ok(docs[0].createdAt);
    a.click('doc-save');assert.equal(JSON.parse(a.w.localStorage.maciej_docs).length,1);
    a.click('doc-preview');assert.equal(a.$('export-body').querySelector('img'),null);assert.ok(a.$('export-body').textContent.includes('<img src=x'));
    const restored=app({maciej_doc_draft:JSON.parse(a.w.localStorage.maciej_doc_draft)});assert.equal(restored.$('doc-course').value,'Przebieg QA');restored.close();
  }finally{a.close();}
});
test('New versions require a reason and preserve prior entries',()=>{
  const a=app();try{
    a.fill('doc-patient','QA-1');a.fill('doc-subj','Pierwszy opis');a.click('doc-save');const original=JSON.parse(a.w.localStorage.maciej_docs)[0];
    a.fill('doc-subj','Uzupełniony opis');a.click('doc-save');assert.equal(JSON.parse(a.w.localStorage.maciej_docs).length,1);assert.match(a.$('doc-msg').textContent,/powód/);
    a.fill('doc-amendment','Dopisanie wyniku badania');a.click('doc-save');const docs=JSON.parse(a.w.localStorage.maciej_docs);assert.equal(docs.length,2);assert.deepEqual(docs[0],original);assert.equal(docs[1].supersedes,original.id);assert.equal(docs[1].rootId,original.id);assert.equal(a.w.document.querySelector('[data-doc-remove]'),null);
  }finally{a.close();}
});
test('Visit duration conflicts, completion, linked card, reopening and metrics work together',async()=>{
  const a=app();try{
    a.fill('v-client','QA-VISIT');a.fill('v-time','10:00');a.fill('v-duration','45');a.submit();assert.equal(a.w.Panel.getVisits().length,1);
    a.fill('v-client','QA-CONFLICT');a.fill('v-time','10:30');a.submit();assert.equal(a.w.Panel.getVisits().length,1);
    a.$('visit-filter').value='all';a.w.Panel.renderVisits();
    const status=a.w.document.querySelector('[data-visit-status]');status.value='completed';status.dispatchEvent(new a.w.Event('change',{bubbles:true}));await a.confirm();
    assert.equal(a.$('metric-missing').textContent,'1');
    a.w.document.querySelector('[data-visit-open]').click();await a.tick();a.fill('doc-subj','Powiązana notatka');a.click('doc-save');assert.equal(a.$('metric-missing').textContent,'0');
    const saved=JSON.parse(a.w.localStorage.maciej_docs)[0];assert.equal(saved.visitId,a.w.Panel.getVisits()[0].id);
    a.w.document.querySelector('[data-visit-open]').click();await a.confirm();assert.equal(a.$('doc-subj').value,'Powiązana notatka');
    a.fill('doc-patient','INNY-PACJENT');a.fill('doc-amendment','Korekta przypisania');a.click('doc-save');assert.equal(JSON.parse(a.w.localStorage.maciej_docs).at(-1).visitId,'');
  }finally{a.close();}
});
test('Favorite filters and reusable sets exclude patient metadata and custom notes',async()=>{
  const a=app();try{
    a.w.document.querySelector('[data-favorite="bridge"]').click();a.click('ex-favorites');assert.equal(a.w.document.querySelectorAll('.ex-card').length,1);
    a.w.document.querySelector('[data-add-ex="bridge"]').click();a.fill('plan-patient','PATIENT-PRIVATE');a.fill('plan-notes','PRIVATE NOTE');
    const note=a.w.document.querySelector('[data-key="note"]');note.value='PATIENT DETAILS';note.dispatchEvent(new a.w.Event('input',{bubbles:true}));
    a.fill('template-name','Zestaw QA');a.click('template-save');const raw=a.w.localStorage.maciej_templates;assert.ok(!raw.includes('PRIVATE'));assert.ok(!raw.includes('PATIENT'));assert.equal(JSON.parse(raw)[0].items.length,1);
    a.w.document.querySelector('[data-template]').click();await a.confirm();assert.equal(a.$('plan-patient').value,'PATIENT-PRIVATE');assert.equal(a.w.document.querySelector('[data-key="note"]').value,'');
  }finally{a.close();}
});
test('CSV preview is explicit, import is atomic and changed external state blocks commit',async()=>{
  const a=app();try{
    const file={size:200,text:async()=> 'data;godzina;pacjent;czas;status\n2027-01-01;10:00;QA-CSV;30;zaplanowana'};
    Object.defineProperty(a.$('visits-file'),'files',{configurable:true,value:[file]});await a.$('visits-preview').onclick();assert.equal(a.w.Panel.getVisits().length,0);assert.equal(a.$('visits-import').classList.contains('hidden'),false);
    const importing=a.$('visits-import').onclick();await a.confirm();await importing;assert.equal(a.w.Panel.getVisits().length,1);
    await a.$('visits-preview').onclick();assert.match(a.$('import-summary').textContent,/Duplikaty: 1/);assert.equal(a.$('visits-import').classList.contains('hidden'),true);
    file.text=async()=> 'data;godzina;pacjent;czas;status\n2027-01-02;10:00;QA-CSV;30;zaplanowana';await a.$('visits-preview').onclick();a.w.localStorage.maciej_visits='[]';
    const second=a.$('visits-import').onclick();await a.confirm();await second;assert.match(a.$('import-msg').textContent,/zmieniły/);assert.equal(a.w.localStorage.maciej_visits,'[]');
  }finally{a.close();}
});
test('Encrypted backup UI excludes credentials and refuses to overwrite an occupied panel',async()=>{
  const a=app();try{
    a.fill('doc-patient','QA-BACKUP');a.fill('doc-subj','Kopia QA');a.click('doc-save');a.w.localStorage.maciej_ai_key='SECRET-NOT-IN-BACKUP';
    let exported;a.w.Panel.download=(name,text)=>{exported=JSON.parse(text);};a.fill('backup-password','haslo-testowe-minimum-12');await a.$('backup-export').onclick();assert.ok(exported);assert.equal(a.$('backup-password').value,'');
    const decoded=await a.w.ClinicCore.decrypt(exported,'haslo-testowe-minimum-12');assert.ok(!Object.keys(decoded.data).some(k=>k.includes('ai_')));
    Object.defineProperty(a.$('backup-file'),'files',{value:[{size:1000,text:async()=>JSON.stringify(exported)}]});a.fill('backup-password','haslo-testowe-minimum-12');await a.$('backup-preview').onclick();const before=a.w.localStorage.maciej_docs;await a.$('backup-restore').onclick();assert.equal(a.w.localStorage.maciej_docs,before);assert.match(a.$('backup-msg').textContent,/już dane/);
  }finally{a.close();}
});
test('Existing legacy exercise doses and cards still load',()=>{
  const a=app({maciej_plan:[{id:'slr',sets:'4',reps:'7'}],maciej_docs:[{id:1,patient:'LEGACY',date:'2026-01-01',subj:'Old',proc:[]}]});try{assert.match(a.w.document.querySelector('[data-key="dose"]').value,/4.*7/);assert.equal(a.w.document.querySelectorAll('[data-doc-load]').length,1);}finally{a.close();}
});
test('Concurrent changes never overwrite stored cards or plans',()=>{
  const a=app();try{
    a.fill('doc-patient','QA');a.fill('doc-subj','Local draft');
    const external=JSON.stringify([{id:'other',patient:'EXTERNAL',date:'2026-10-01',proc:[]}]);a.w.localStorage.maciej_docs=external;a.click('doc-save');assert.equal(a.w.localStorage.maciej_docs,external);assert.match(a.$('storage-error').textContent,/innej karcie/);
  }finally{a.close();}
});
test('Restore into an empty panel writes the full snapshot; quota failure rolls back',async()=>{
  const payload={format:'maciej-panel',version:1,data:{maciej_docs:JSON.stringify([{id:'restore',patient:'QA',date:'2026-10-01',proc:[]}]),maciej_favorites:JSON.stringify(['bridge'])}};
  for(const fail of [false,true]){
    const a=app();try{
      const encrypted=await a.w.ClinicCore.encrypt(payload,'test-password-12345');
      Object.defineProperty(a.$('backup-file'),'files',{value:[{size:1000,text:async()=>JSON.stringify(encrypted)}]});a.fill('backup-password','test-password-12345');await a.$('backup-preview').onclick();
      const native=a.w.Storage.prototype.setItem;
      if(fail)a.w.Storage.prototype.setItem=function(k,v){if(k==='maciej_favorites')throw Error('Quota');return native.call(this,k,v);};
      const restoring=a.$('backup-restore').onclick();await a.confirm();await restoring;
      if(fail){assert.equal(a.w.localStorage.getItem('maciej_docs'),null);assert.match(a.$('backup-msg').textContent,/Wycofano/);}else{assert.equal(a.w.localStorage.maciej_docs,payload.data.maciej_docs);assert.equal(a.w.localStorage.maciej_favorites,payload.data.maciej_favorites);assert.equal(a.navigation.length,1,'Reload requested; navigation is outside jsdom scope');}
    }finally{a.close();}
  }
});
test('Public intake summarizes answers without algorithmic diagnoses, protects markup and resets data',async()=>{
  const dom=new JSDOM(fs.readFileSync(path.join(root,'index.html'),'utf8'),{url:'https://public.example.test/',runScripts:'outside-only'}),w=dom.window;
  try{
    w.matchMedia=()=>({matches:true});w.scrollTo=()=>{};w.Element.prototype.scrollIntoView=function(){};
    w.eval(fs.readFileSync(path.join(root,'main.js'),'utf8'));await new Promise(resolve=>w.document.addEventListener('DOMContentLoaded',resolve,{once:true}));
    const $=id=>w.document.getElementById(id);$('rodo-consent').checked=true;$('start-wizard').click();
    const red=w.document.querySelector('#redflags input');red.checked=true;red.dispatchEvent(new w.Event('change'));assert.ok(!$('redflag-alert').innerHTML.includes('booksy'));assert.ok($('redflag-alert').innerHTML.includes('tel:112'));
    const part=w.document.querySelector('.body-part');part.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(part.getAttribute('aria-pressed'),'true');
    $('ai-input').value='<img src=x onerror=alert(1)> & QA';$('ai-final-submit').click();await new Promise(r=>setTimeout(r,20));
    const box=$('ai-response');assert.equal(box.querySelector('img'),null);assert.ok(box.textContent.includes('<img src=x'));assert.ok(box.textContent.includes('nie oceniono'));assert.ok(!box.textContent.includes('Wstępna klasyfikacja'));assert.ok(!box.textContent.includes('Sugerowana diagnostyka'));assert.ok(!box.textContent.includes('3×12'));
    $('brief-restart').click();assert.equal($('ai-input').value,'');assert.equal(red.checked,false);assert.equal($('rodo-consent').checked,false);
  }finally{w.close();}
});
