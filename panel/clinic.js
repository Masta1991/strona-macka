/* Local imports, encrypted backups and reusable exercise sets. */
(() => {
  'use strict';
  const P=window.Panel,C=ClinicCore,{$,esc,read,write,toast}=P;
  let pendingImport=null,pendingBackup=null,backupBusy=false,importBusy=false;
  const snapshot=()=>Object.fromEntries(C.backupKeys.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));
  const payload=()=>C.validateBackup({format:'maciej-panel',version:1,createdAt:new Date().toISOString(),data:snapshot()});
  const importedInfo=read('maciej_import_info',{});
  if(importedInfo.at)P.setText('metrics-source','Dane lokalne • ostatni import '+new Date(importedInfo.at).toLocaleString('pl-PL'));
  const hideImport=()=>{pendingImport=null;$('visits-import').classList.add('hidden');$('import-summary').classList.add('hidden');};
  $('visits-file').onchange=hideImport;
  $('csv-template').onclick=()=>P.download('wzor-wizyt.csv','\uFEFFdata;godzina;pacjent;usluga;gabinet;czas;status;id\r\n2027-01-04;10:00;PACJENT-TEST;Konsultacja;Gabinet;60;zaplanowana;test-001\r\n','text/csv;charset=utf-8');
  $('visits-preview').onclick=async()=>{
    if(importBusy)return;importBusy=true;hideImport();$('import-msg').textContent='';
    try{
      const file=$('visits-file').files[0];if(!file||file.size>2_000_000)throw Error('Wybierz plik CSV mniejszy niż 2 MB.');
      const text=await file.text();if($('visits-file').files[0]!==file)return;
      const result=C.importCSV(text,P.getVisits());
      const rows=result.added.slice(0,20).map(v=>`<li>${esc(v.date)} ${esc(v.time)} · ${esc(v.client)} · ${v.duration} min · ${esc(C.statuses[v.status])}</li>`).join('');
      $('import-summary').innerHTML=`<strong>Do dodania: ${result.added.length}. Duplikaty: ${result.duplicates}. Błędy: ${result.issues.length}.</strong><ul>${rows}</ul>${result.added.length>20?'<p>Pokazano pierwsze 20 wizyt.</p>':''}${result.issues.length?`<ul>${result.issues.slice(0,20).map(x=>'<li>'+esc(x)+'</li>').join('')}</ul><p>Popraw wszystkie błędy i ponownie sprawdź plik. Nie zapisano żadnej wizyty.</p>`:''}`;
      $('import-summary').classList.remove('hidden');
      if(!result.issues.length&&result.added.length){pendingImport={result,baseline:JSON.stringify(P.getVisits()),raw:localStorage.getItem('maciej_visits')};$('visits-import').classList.remove('hidden');}
    }catch(e){$('import-msg').textContent=e.message;}finally{importBusy=false;}
  };
  $('visits-import').onclick=async()=>{
    const pending=pendingImport;if(!pending||importBusy)return;importBusy=true;
    try{
      if(!await P.confirmChange(`Dodać ${pending.result.added.length} wizyt z podglądu do lokalnego terminarza?`,'Dodaj wizyty'))return;
      if(pending!==pendingImport||JSON.stringify(P.getVisits())!==pending.baseline||localStorage.getItem('maciej_visits')!==pending.raw)throw Error('Dane zmieniły się od podglądu. Sprawdź plik ponownie.');
      if(P.saveVisits([...P.getVisits(),...pending.result.added.map(v=>({...v,id:crypto.randomUUID()}))])){
        const info={at:new Date().toISOString(),count:pending.result.added.length};write('maciej_import_info',info);
        P.setText('metrics-source','Dane lokalne • ostatni import '+new Date(info.at).toLocaleString('pl-PL'));
        hideImport();$('import-msg').textContent=`Dodano ${info.count} wizyt. Nie zmieniono rezerwacji w Booksy.`;
      }
    }catch(e){hideImport();$('import-msg').textContent=e.message;}finally{importBusy=false;}
  };
  const backupMessage=s=>$('backup-msg').textContent=s;
  const last=read('maciej_backup_info',{});
  $('backup-last').textContent=last.at?'Ostatnio wygenerowano plik: '+new Date(last.at).toLocaleString('pl-PL'):'Nie wygenerowano jeszcze kopii w tym panelu.';
  const busyBackup=busy=>{backupBusy=busy;for(const id of ['backup-export','backup-preview','backup-restore'])$(id).disabled=busy;};
  $('backup-export').onclick=async()=>{
    if(backupBusy)return;busyBackup(true);backupMessage('Przygotowuję zaszyfrowaną kopię…');
    try{
      if(!crypto.subtle)throw Error('Szyfrowanie wymaga bezpiecznego połączenia HTTPS lub localhost.');
      const data=payload(),password=$('backup-password').value;
      const encrypted=await C.encrypt(data,password);
      P.download('gabinet-kopia-'+P.dateLocal()+'.json',JSON.stringify(encrypted),'application/json');
      $('backup-password').value='';write('maciej_backup_info',{at:data.createdAt});
      $('backup-last').textContent='Wygenerowano plik: '+new Date(data.createdAt).toLocaleString('pl-PL');
      backupMessage('Wygenerowano zaszyfrowany plik. Sprawdź, czy pobieranie się zakończyło, i zachowaj hasło osobno.');
    }catch(e){backupMessage(e.message);}finally{busyBackup(false);}
  };
  const clearBackup=()=>{pendingBackup=null;$('backup-restore').classList.add('hidden');$('backup-summary').classList.add('hidden');};
  $('backup-file').onchange=clearBackup;
  $('backup-preview').onclick=async()=>{
    if(backupBusy)return;clearBackup();busyBackup(true);backupMessage('Sprawdzam kopię…');
    try{
      const file=$('backup-file').files[0];if(!file||file.size>30_000_000)throw Error('Wybierz zaszyfrowaną kopię panelu (do 30 MB).');
      const data=await C.decrypt(JSON.parse(await file.text()),$('backup-password').value);
      if($('backup-file').files[0]!==file){backupMessage('Plik zmieniono. Sprawdź nowy plik.');return;}
      pendingBackup=data;$('backup-password').value='';
      const count=key=>data.data[key]?JSON.parse(data.data[key]).length:0;
      $('backup-summary').textContent=`Karty: ${count('maciej_docs')}, wizyty: ${count('maciej_visits')}, zapisane plany: ${count('maciej_plan_history')}. Odtwarzanie jest możliwe wyłącznie w pustej przestrzeni panelu, aby nie nadpisać istniejących danych.`;
      $('backup-summary').classList.remove('hidden');$('backup-restore').classList.remove('hidden');backupMessage('Kopia została odszyfrowana i sprawdzona. Dane nie zostały jeszcze zapisane.');
    }catch(e){backupMessage(e.message);}finally{busyBackup(false);}
  };
  $('backup-restore').onclick=async()=>{
    if(!pendingBackup||backupBusy)return;busyBackup(true);const pending=pendingBackup;
    try{
      if(Object.keys(snapshot()).length)throw Error('Ten panel ma już dane. Odtwórz kopię w pustym profilu przeglądarki pod docelowym adresem. Istniejące dane pozostają bez zmian.');
      if(!await P.confirmChange('Odtworzyć sprawdzoną kopię w tej pustej przestrzeni? Panel zostanie przeładowany.','Odtwórz kopię'))return;
      if(pending!==pendingBackup||Object.keys(snapshot()).length)throw Error('Stan zmienił się podczas potwierdzania. Nie zapisano kopii.');
      C.validateBackup(pending);const written=[];
      try{for(const [key,value] of Object.entries(pending.data)){localStorage.setItem(key,value);written.push(key);}}
      catch(e){for(const key of written)localStorage.removeItem(key);throw Error('Brak miejsca na pełną kopię. Wycofano częściowy zapis.');}
      location.reload();
    }catch(e){backupMessage(e.message);}finally{busyBackup(false);}
  };
  let templates=read('maciej_templates',[]).filter(t=>t&&typeof t.id==='string'&&Array.isArray(t.items));
  const renderTemplates=()=>{
    $('template-list').innerHTML=templates.length?templates.map(t=>`<div class="record-row"><div><strong>${esc(t.name)}</strong><small>Ćwiczeń: ${t.items.length}</small></div><button class="btn-secondary" data-template="${esc(t.id)}">Użyj zestawu</button></div>`).join(''):'<p class="field-hint">Nie masz jeszcze zapisanych zestawów.</p>';
  };
  $('template-save').onclick=()=>{
    const plan=P.getPlan(),name=$('template-name').value.trim();
    if(!name){toast('Nazwij zestaw ćwiczeń.');$('template-name').focus();return;}
    if(!plan.items.length||plan.items.some(i=>!i.dose.trim())){toast('Dodaj ćwiczenia i uzupełnij dawkowanie.');return;}
    if(templates.some(t=>P.normalize(t.name)===P.normalize(name))){toast('Ta nazwa już istnieje. Wybierz inną nazwę wersji.');return;}
    const next=[...templates,{id:crypto.randomUUID(),name,items:plan.items.map(i=>({id:i.id,dose:i.dose,note:''}))}];
    if(write('maciej_templates',next)){templates=next;renderTemplates();$('template-name').value='';toast('Zapisano zestaw ćwiczeń.');}
  };
  $('template-list').onclick=event=>{const button=event.target.closest('[data-template]');if(!button)return;const t=templates.find(t=>t.id===button.dataset.template);if(t)P.useTemplate(t.items);};
  renderTemplates();
})();
