/* Pure local data rules shared by the UI and regression tests. No network. */
(() => {
  'use strict';
  const statuses = {scheduled:'Zaplanowana',completed:'Odbyta',cancelled:'Odwołana',noshow:'Nieobecność'};
  const dateOK = s => typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && Number(s.slice(0,4))>=1900 && Number(s.slice(0,4))<=2200 && !Number.isNaN(Date.parse(s+'T12:00:00Z')) && new Date(s+'T12:00:00Z').toISOString().slice(0,10)===s;
  const timeOK = s => typeof s==='string' && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s);
  const minutes = s => Number(s.slice(0,2))*60+Number(s.slice(3));
  const duration = v => Number(v.duration)||60;
  const active = v => !['cancelled','noshow'].includes(v.status);
  const overlap = (a,b) => active(a)&&active(b)&&a.date===b.date&&minutes(a.time)<minutes(b.time)+duration(b)&&minutes(b.time)<minutes(a.time)+duration(a);
  const validateVisit = v => v && dateOK(v.date) && timeOK(v.time) && typeof v.client==='string' && !!v.client.trim() && v.client.length<=200 && Number.isInteger(Number(v.duration)) && Number(v.duration)>=5 && Number(v.duration)<=480 && minutes(v.time)+Number(v.duration)<=1440 && !!statuses[v.status];
  const normalize = s => String(s??'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
  function parseCSV(text) {
    if(typeof text!=='string'||text.length>2_000_000) throw Error('Plik musi mieć mniej niż 2 MB.');
    text=text.replace(/^\uFEFF/,'');
    const first=text.split(/\r?\n/)[0];
    const delimiter=first.includes(';')?';':',';
    const rows=[];let row=[],field='',quoted=false,closed=false;
    for(let i=0;i<text.length;i++){
      const c=text[i];
      if(quoted){if(c==='"'){if(text[i+1]==='"'){field+='"';i++;}else{quoted=false;closed=true;}}else field+=c;}
      else if(c==='"'){if(field||closed)throw Error('Nieprawidłowy cudzysłów w CSV.');quoted=true;}
      else if(c===delimiter||c==='\n'||c==='\r'){
        row.push(field.trim());field='';closed=false;
        if(c!==delimiter){if(c==='\r'&&text[i+1]==='\n')i++;if(row.some(Boolean))rows.push(row);row=[];}
      }else {if(closed&&c.trim())throw Error('Nieprawidłowe pole CSV.');field+=c;}
    }
    if(quoted)throw Error('Niezamknięty cudzysłów w CSV.');
    row.push(field.trim());if(row.some(Boolean))rows.push(row);
    if(rows.length<2||rows.length>2001)throw Error('Wymagany nagłówek i od 1 do 2000 wizyt.');
    return rows;
  }
  function importCSV(text,existing){
    const rows=parseCSV(text), rawHeaders=rows.shift();
    const aliases={data:'date',godzina:'time',pacjent:'client',klient:'client',usluga:'service',gabinet:'place',czas:'duration',status:'status',id:'externalId',date:'date',time:'time',client:'client',service:'service',place:'place',duration:'duration',externalid:'externalId'};
    const headers=rawHeaders.map(h=>aliases[normalize(h)]||'');
    if(['date','time','client'].some(h=>!headers.includes(h))||headers.filter(Boolean).length!==new Set(headers.filter(Boolean)).size)throw Error('Potrzebne unikalne kolumny: data, godzina, pacjent. Użyj wzoru CSV.');
    const statusMap={zaplanowana:'scheduled',odbyta:'completed',odwolana:'cancelled',nieobecnosc:'noshow',scheduled:'scheduled',completed:'completed',cancelled:'cancelled',noshow:'noshow'};
    const added=[],issues=[];let duplicates=0;
    rows.forEach((cells,i)=>{
      if(cells.length!==headers.length){issues.push(`Wiersz ${i+2}: liczba kolumn nie zgadza się z nagłówkiem.`);return;}
      const data={};headers.forEach((h,j)=>{if(h)data[h]=cells[j];});
      const v={date:data.date,time:data.time,client:data.client,service:data.service||'Wizyta',place:data.place||'',duration:Number(data.duration||60),status:statusMap[normalize(data.status||'scheduled')],source:'csv',externalId:data.externalId||''};
      if(!validateVisit(v)||[v.service,v.place,v.externalId].some(s=>s.length>500)){issues.push(`Wiersz ${i+2}: sprawdź datę (RRRR-MM-DD), godzinę, pacjenta, czas (5–480 min) i status.`);return;}
      const all=[...existing,...added];
      const identical=all.some(x=>['date','time','client','service','place'].every(k=>(x[k]||'')===v[k])&&duration(x)===v.duration&&(x.status||'scheduled')===v.status);
      if(identical){duplicates++;return;}
      if(all.some(x=>x.date===v.date&&x.time===v.time&&x.client===v.client)){issues.push(`Wiersz ${i+2}: wizyta tego pacjenta już istnieje z innymi danymi. Sprawdź zmianę ręcznie.`);return;}
      if(v.externalId&&all.some(x=>x.source==='csv'&&x.externalId===v.externalId)){issues.push(`Wiersz ${i+2}: to ID już istnieje z innymi danymi. Sprawdź zmianę ręcznie.`);return;}
      if(all.some(x=>overlap(x,v))){issues.push(`Wiersz ${i+2}: termin nakłada się na inną wizytę.`);return;}
      added.push(v);
    });
    return {added,issues,duplicates,total:rows.length};
  }
  function metrics(visits,docs,today){
    const month=visits.filter(v=>v.date.startsWith(today.slice(0,7)));
    return {today:visits.filter(v=>v.date===today&&active(v)).length,month:month.length,completed:month.filter(v=>v.status==='completed').length,cancelled:month.filter(v=>v.status==='cancelled').length,noshow:month.filter(v=>v.status==='noshow').length,missing:visits.filter(v=>v.status==='completed'&&!docs.some(d=>d.visitId&&d.visitId===v.id&&d.date===v.date&&d.patient===v.client)).length};
  }
  const backupKeys=['maciej_docs','maciej_doc_draft','maciej_plan_v2','maciej_plan_history','maciej_visits','maciej_favorites','maciej_templates','maciej_import_info','maciej_practice','maciej_plan','maciej_plan-patient','maciej_plan-date','maciej_plan-goal','maciej_plan-frequency','maciej_plan-review','maciej_plan-notes','maciej_plan-email'];
  function validateBackup(payload){
    if(!payload||payload.format!=='maciej-panel'||payload.version!==1||!payload.data||typeof payload.data!=='object'||Array.isArray(payload.data))throw Error('Nieobsługiwany format kopii.');
    for(const [key,raw] of Object.entries(payload.data)){
      if(!backupKeys.includes(key)||typeof raw!=='string'||raw.length>10_000_000)throw Error('Kopia zawiera nieobsługiwane dane.');
      if(key.startsWith('maciej_plan-'))continue;
      const v=JSON.parse(raw);
      const arrays=['maciej_docs','maciej_plan_history','maciej_visits','maciej_favorites','maciej_templates','maciej_plan'];
      if(arrays.includes(key)?!Array.isArray(v):!v||typeof v!=='object'||Array.isArray(v))throw Error('Uszkodzona struktura kopii: '+key);
      if(key==='maciej_docs'&&v.some(d=>!d||typeof d.patient!=='string'||!dateOK(d.date)||!Array.isArray(d.proc)||!d.proc.every(x=>typeof x==='string')))throw Error('Nieprawidłowe karty w kopii.');
      if(key==='maciej_visits'&&v.some(d=>!validateVisit({...d,status:d?.status||'scheduled',duration:d?.duration||60})))throw Error('Nieprawidłowe wizyty w kopii.');
      if(key==='maciej_favorites'&&v.some(x=>typeof x!=='string'))throw Error('Nieprawidłowe ulubione.');
      const validItems=items=>Array.isArray(items)&&items.every(x=>x&&typeof x.id==='string'&&(x.dose===undefined||typeof x.dose==='string')&&(x.note===undefined||typeof x.note==='string'));
      if(key==='maciej_plan_v2'&&!validItems(v.items))throw Error('Nieprawidłowy plan.');
      if(['maciej_templates','maciej_plan_history'].includes(key)&&v.some(x=>!x||typeof x.id!=='string'||!validItems(x.items)))throw Error('Nieprawidłowe plany w kopii.');
    }
    return payload;
  }
  const bytesTo64 = bytes => {let s='';for(const b of bytes)s+=String.fromCharCode(b);return btoa(s);};
  const from64 = s => Uint8Array.from(atob(s),c=>c.charCodeAt(0));
  async function keyFor(password,salt,usages){const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},material,{name:'AES-GCM',length:256},false,usages);}
  async function encrypt(payload,password){
    validateBackup(payload);if(password.length<12)throw Error('Użyj hasła z co najmniej 12 znaków.');
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyFor(password,salt,['encrypt']),new TextEncoder().encode(JSON.stringify(payload)));
    return {format:'maciej-panel-encrypted',version:1,kdf:'PBKDF2-SHA256',iterations:310000,salt:bytesTo64(salt),iv:bytesTo64(iv),cipher:bytesTo64(new Uint8Array(cipher))};
  }
  async function decrypt(envelope,password){
    if(envelope?.format!=='maciej-panel-encrypted'||envelope.version!==1||envelope.iterations!==310000||envelope.kdf!=='PBKDF2-SHA256'||typeof envelope.cipher!=='string'||envelope.cipher.length>30_000_000)throw Error('Nieobsługiwany plik kopii.');
    try{const salt=from64(envelope.salt),iv=from64(envelope.iv);if(salt.length!==16||iv.length!==12)throw Error();const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await keyFor(password,salt,['decrypt']),from64(envelope.cipher));return validateBackup(JSON.parse(new TextDecoder().decode(plain)));}catch{throw Error('Nieprawidłowe hasło albo uszkodzona kopia. Nie zmieniono danych.');}
  }
  globalThis.ClinicCore={statuses,dateOK,timeOK,duration,active,overlap,validateVisit,parseCSV,importCSV,metrics,backupKeys,validateBackup,encrypt,decrypt};
})();
