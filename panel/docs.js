/* Wywiad i karty: lokalne szkice, wersje, opcjonalne dyktowanie i redakcja AI. */
(() => {
    'use strict';
    const P=window.Panel, {$,esc,read,readText,write,toast,go,confirmChange,dateLocal}=P;
    const keys=['date','patient','subj','obj','assess','icf','plan','sign','email'];
    const guideKeys=['area','pain','factors','history','goal'];
    const defaultSign='Maciej Liedel, mgr fizjoterapii';
    let docGoal='', revision=0, recognition=null, requestGeneration=0;
    const proc=()=>[...document.querySelectorAll('#doc-proc input:checked')].map(input=>input.value);
    const collect=()=>Object.fromEntries([...keys.map(key=>[key,$('doc-'+key).value.trim()]),['proc',proc()],['goal',docGoal]]);
    const guide=()=>Object.fromEntries(guideKeys.map(key=>[key,$('intake-'+key).value]));
    const saveDraft=()=>{
        const ok=write('maciej_doc_draft',{...collect(),guide:guide(),transcript:$('doc-transcript').value});
        P.setText('doc-draft-status',ok?'Szkic zapisany lokalnie':'Nie zapisano szkicu');
        return ok;
    };
    const dirty=()=>keys.filter(k=>!['date','sign'].includes(k)).some(k=>$('doc-'+k).value.trim()) || proc().length || guideKeys.some(k=>$('intake-'+k).value.trim()) || $('doc-transcript').value.trim();
    const msg=text=>{$('doc-msg').textContent=text;};
    const stopRecording=()=>{if(recognition){recognition.onend=null;recognition.onresult=null;recognition.stop();recognition=null;}$('doc-dict-big').textContent='Rozpocznij dyktowanie';$('doc-dict-big').setAttribute('aria-pressed','false');};
    const fill=data=>{
        stopRecording();requestGeneration++;revision++;
        keys.forEach(key=>$('doc-'+key).value=typeof data[key]==='string'?data[key]:(key==='date'?dateLocal():key==='sign'?defaultSign:''));
        const procedures=Array.isArray(data.proc)?data.proc:[];
        document.querySelectorAll('#doc-proc input').forEach(input=>input.checked=procedures.includes(input.value));
        guideKeys.forEach(key=>$('intake-'+key).value=typeof data.guide?.[key]==='string'?data.guide[key]:'');
        $('doc-transcript').value=typeof data.transcript==='string'?data.transcript:'';docGoal=typeof data.goal==='string'?data.goal:'';
        $('doc-ai-consent').checked=false;$('speech-consent').checked=false;$('doc-dict-status').textContent='';$('doc-visit').value='';msg('');
    };
    fill(read('maciej_doc_draft',{}));
    [...keys.map(k=>'doc-'+k),...guideKeys.map(k=>'intake-'+k),'doc-transcript'].forEach(id=>$(id).addEventListener('input',()=>{revision++;saveDraft();}));
    document.querySelectorAll('#doc-proc input').forEach(input=>input.onchange=()=>{revision++;saveDraft();});
    $('intake-apply').onclick=()=>{
        if(!$('intake-pain').reportValidity())return;
        const labels={area:'Obszar i czas trwania',pain:'Ból według pacjenta (0–10)',factors:'Co nasila / pomaga',history:'Historia i istotne informacje',goal:'Cel pacjenta'};
        const g=guide();const text=guideKeys.filter(key=>g[key].trim()).map(key=>`${labels[key]}: ${g[key].trim()}`).join('\n');
        if(!text){toast('Uzupełnij przynajmniej jedno pole pomocnika.');return;}
        $('doc-subj').value=[$('doc-subj').value.trim(),text].filter(Boolean).join('\n\n');docGoal=g.goal.trim()||docGoal;
        guideKeys.forEach(key=>$('intake-'+key).value='');revision++;saveDraft();$('doc-subj').focus();toast('Dodano odpowiedzi do wywiadu.');
    };
    const pendingGuide=()=>{if(guideKeys.some(key=>$('intake-'+key).value.trim())){document.querySelector('.interview-guide').open=true;$('intake-apply').focus();toast('Dodaj odpowiedzi z pomocnika do wywiadu przed zapisaniem lub eksportem.');return true;}return false;};
    const valid=()=>{
        if(pendingGuide())return false;
        const d=collect();
        for(const [key,label] of [['patient','Wpisz pacjenta lub jego kod.'],['date','Uzupełnij datę wizyty.']])if(!d[key]){msg(label);toast(label);$('doc-'+key).focus();return false;}
        if(!['subj','obj','assess','plan'].some(key=>d[key])){msg('Uzupełnij wywiad, badanie lub zalecenia.');toast('Karta nie zawiera jeszcze notatki z wizyty.');$('doc-subj').focus();return false;}return true;
    };
    const newPatient=async visit=>{
        if((dirty()||P.planHasContent())&&!await confirmChange('Rozpocząć wizytę dla nowego pacjenta? Szkic karty i bieżący plan zostaną wyczyszczone. Zapisane karty i wersje planów pozostaną w historii.','Rozpocznij nową wizytę'))return false;
        fill(visit?{patient:visit.client,date:visit.date}:{});P.resetPlan();saveDraft();go('dokumentacja');$('doc-patient').focus();return true;
    };
    document.querySelectorAll('[data-new-patient]').forEach(button=>button.onclick=()=>newPatient());
    document.addEventListener('panel:open-visit',event=>newPatient(event.detail));
    const fillVisitOptions=()=>{const sel=$('doc-visit');sel.replaceChildren(new Option('Nowa wizyta / spoza listy',''));P.getVisits().forEach((v,i)=>sel.append(new Option(`${v.date} ${v.time} — ${v.client}`,String(i))));};
    fillVisitOptions();document.addEventListener('panel:visits',fillVisitOptions);
    $('doc-visit').onchange=async()=>{const value=$('doc-visit').value;if(value==='')return;await newPatient(P.getVisits()[Number(value)]);$('doc-visit').value='';};
    let docs=read('maciej_docs',[]).filter(d=>d && typeof d.patient==='string' && typeof d.date==='string').map(d=>({...d,proc:Array.isArray(d.proc)?d.proc:[]}));
    const renderDocs=()=>{
        const q=P.normalize($('doc-search').value);const matches=docs.map((d,index)=>({...d,index})).reverse().filter(d=>P.normalize(`${d.patient} ${d.date} ${d.assess||''}`).includes(q));
        $('doc-list').innerHTML=matches.length?matches.map(d=>`<div class="record-row"><div><strong>${esc(d.patient)} · ${esc(d.date)}</strong><small>${esc(d.assess||'Karta wizyty')}</small></div><div class="row-btns"><button class="btn-secondary" data-doc-load="${d.index}">Otwórz</button><button class="icon-button" data-doc-remove="${d.index}" aria-label="Usuń kartę ${esc(d.patient)} ${esc(d.date)}">×</button></div></div>`).join(''):`<div class="empty">${q?'Nie znaleziono karty. Zmień wyszukiwanie.':'Zapisz pierwszą kartę, aby wrócić do niej później.'}</div>`;
        P.counts();
    };
    $('doc-search').oninput=renderDocs;
    $('doc-save').onclick=()=>{
        if(!valid())return;const data={...collect(),id:crypto.randomUUID()};
        const last=docs.at(-1);if(last && keys.every(k=>(last[k]||'')===(data[k]||'')) && JSON.stringify(last.proc)===JSON.stringify(data.proc)){msg('Ta wersja karty jest już zapisana.');return;}
        const next=[...docs,data];if(write('maciej_docs',next)){docs=next;saveDraft();renderDocs();msg('Zapisano nową wersję karty. Przenieś zatwierdzony wpis do dokumentacji gabinetu.');toast('Karta wizyty zapisana.');}
    };
    $('doc-list').onclick=async event=>{
        const load=event.target.closest('[data-doc-load]'),remove=event.target.closest('[data-doc-remove]');
        if(load){const data=docs[+load.dataset.docLoad];const differentPlan=P.planHasContent()&&P.getPlanPatient()!==data.patient;const prompt=differentPlan?'Wczytać kartę tego pacjenta? Bieżący szkic karty i plan innego pacjenta zostaną wyczyszczone. Zapisane wersje pozostaną w historii.':'Wczytać kartę? Bieżący szkic zostanie zastąpiony. Zapisana karta pozostanie bez zmian.';if((dirty()||differentPlan)&&!await confirmChange(prompt,'Wczytaj kartę'))return;if(differentPlan)P.resetPlan();fill(data);saveDraft();$('doc-patient').focus();msg('Wczytano kartę. Zmiany zapiszesz jako nową wersję.');}
        if(remove){if(!await confirmChange('Usunąć tę zapisaną wersję karty z lokalnej historii? Tej operacji nie można cofnąć.','Usuń wersję'))return;const next=docs.filter((d,i)=>i!==+remove.dataset.docRemove);if(write('maciej_docs',next)){docs=next;renderDocs();$('doc-search').focus();}}
    };
    const textFor=d=>`KARTA WIZYTY — Maciej Liedel\nWpis roboczy\nData: ${d.date}\nPacjent: ${d.patient}\n\nWYWIAD\n${d.subj||'—'}\n\nBADANIE\n${d.obj||'—'}\n\nPROBLEM / ROZPOZNANIE\n${d.assess||'—'}\n\nFUNKCJONOWANIE / ICF\n${d.icf||'—'}\n\nWYKONANE PROCEDURY\n${d.proc.join(', ')||'—'}\n\nZALECENIA\n${d.plan||'—'}\n\nPodpis: ${d.sign||'—'}`;
    $('doc-preview').onclick=()=>{if(!valid())return;const d=collect();const sections=[['Wywiad',d.subj],['Badanie',d.obj],['Problem / rozpoznanie',d.assess],['Funkcjonowanie / ICF',d.icf],['Wykonane procedury',d.proc.join(', ')],['Zalecenia',d.plan],['Podpis',d.sign]];P.exportDocument({title:'Karta wizyty',filename:'karta-wizyty-'+d.date,email:d.email,text:textFor(d),html:`<div class="paper-brand">MACIEJ LIEDEL · FIZJOTERAPIA</div><h2>Karta wizyty</h2><div class="paper-meta"><p>Wpis roboczy<br><strong>Pacjent:</strong> ${esc(d.patient)}<br><strong>Data:</strong> ${esc(d.date)}</p></div>${sections.map(([label,value])=>`<h3>${label}</h3><p>${esc(value||'—')}</p>`).join('')}`});};
    $('doc-to-plan').onclick=()=>{if(!valid())return;const d=collect();P.fromDoc({patient:d.patient,email:d.email,goal:docGoal||d.assess,notes:d.plan});};
    renderDocs();

    // Configuration and requests are explicit; no remote SDK is loaded at startup.
    const configKeys={provider:'provider',url:'url',key:'key',model:'model',opbase:'opbase',opuser:'opuser',oppass:'oppass'};
    Object.keys(configKeys).forEach(key=>$('ai-'+key).value=readText('maciej_ai_'+key,key==='provider'?'openrouter':key==='opbase'?'http://127.0.0.1:4096':''));
    const aiShow=()=>{const provider=$('ai-provider').value;$('ai-url-wrap').classList.toggle('hidden',provider!=='custom');$('ai-opencode-wrap').classList.toggle('hidden',provider!=='opencode');$('ai-key-wrap').classList.toggle('hidden',provider==='opencode');};
    $('ai-provider').onchange=aiShow;aiShow();
    const settings=()=>Object.fromEntries(Object.keys(configKeys).map(key=>[key,readText('maciej_ai_'+key,key==='provider'?'openrouter':key==='opbase'?'http://127.0.0.1:4096':'')]));
    $('ai-save').onclick=()=>{const ok=Object.keys(configKeys).map(key=>write('maciej_ai_'+key,$('ai-'+key).value.trim(),true)).every(Boolean);$('ai-msg').textContent=ok?'Ustawienia zapisane w tej przeglądarce.':'Nie zapisano wszystkich ustawień.';};
    const getJSON=async(url,options)=>{
        const parsed=new URL(url);if(!['https:','http:'].includes(parsed.protocol))throw new Error('Niepoprawny adres serwera.');
        const response=await fetch(url,{...options,signal:AbortSignal.timeout(60000)});if(!response.ok)throw new Error(`Połączenie zwróciło błąd ${response.status}. Sprawdź ustawienia.`);return response.json();
    };
    const ask=async(system,user)=>{
        const s=settings();const headers={'Content-Type':'application/json'};
        if(s.provider==='opencode'){
            if(s.opuser||s.oppass)headers.Authorization='Basic '+btoa(`${s.opuser||'opencode'}:${s.oppass}`);
            const base=s.opbase.replace(/\/$/,'');const session=await getJSON(base+'/session',{method:'POST',headers,body:JSON.stringify({title:'Notatka fizjo'})});
            const body={system,parts:[{type:'text',text:user}]};if(s.model.includes('/')){const [providerID,...model]=s.model.split('/');body.model={providerID,modelID:model.join('/')};}
            const result=await getJSON(base+'/session/'+encodeURIComponent(session.id)+'/message',{method:'POST',headers,body:JSON.stringify(body)});
            const text=(result.parts||[]).filter(p=>p.type==='text').map(p=>p.text).join('\n').trim();if(!text)throw new Error('Serwer nie zwrócił tekstu.');return text;
        }
        if(!s.key||!s.model)throw new Error('Uzupełnij i zapisz klucz oraz model w ustawieniach AI.');
        headers.Authorization='Bearer '+s.key;
        const url=s.provider==='openai'?'https://api.openai.com/v1/chat/completions':s.provider==='custom'?s.url:'https://openrouter.ai/api/v1/chat/completions';
        const result=await getJSON(url,{method:'POST',headers,body:JSON.stringify({model:s.model,temperature:0.3,max_tokens:2200,messages:[{role:'system',content:system},{role:'user',content:user}]})});
        const text=result.choices?.[0]?.message?.content;if(typeof text!=='string'||!text.trim())throw new Error('Model nie zwrócił tekstu.');return text.trim();
    };
    $('ai-test').onclick=async()=>{const button=$('ai-test');button.disabled=true;$('ai-msg').textContent='Sprawdzam zapisane ustawienia…';try{const s=settings();if(s.provider==='opencode'){const headers={};if(s.opuser||s.oppass)headers.Authorization='Basic '+btoa(`${s.opuser||'opencode'}:${s.oppass}`);await getJSON(s.opbase.replace(/\/$/,'')+'/global/health',{headers});}else await ask('Odpowiedz jednym słowem.','Test. Odpowiedz: OK');$('ai-msg').textContent='Połączenie działa.';}catch(error){$('ai-msg').textContent=error.message;}finally{button.disabled=false;}};
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    $('doc-dict-big').setAttribute('aria-pressed','false');
    $('doc-dict-big').onclick=()=>{
        if(recognition){stopRecording();saveDraft();return;}
        if(!$('speech-consent').checked){$('doc-dict-status').textContent='Najpierw zaznacz zgodę na rozpoznawanie mowy.';$('speech-consent').focus();return;}
        if(!SR){$('doc-dict-status').textContent='Ta przeglądarka nie udostępnia dyktowania. Wpisz lub wklej notatkę poniżej.';return;}
        const r=new SR();recognition=r;r.lang='pl-PL';r.interimResults=true;r.continuous=true;
        const base=$('doc-transcript').value.trim();let failed=false;
        r.onresult=event=>{const text=Array.from(event.results,result=>result[0].transcript).join(' ');$('doc-transcript').value=[base,text].filter(Boolean).join('\n');revision++;saveDraft();};
        r.onerror=event=>{failed=true;$('doc-dict-status').textContent=event.error==='not-allowed'?'Mikrofon jest zablokowany. Wpisz notatkę lub zmień uprawnienia przeglądarki.':'Nie udało się rozpoznać mowy. Wpisz notatkę ręcznie.';};
        r.onend=()=>{recognition=null;$('doc-dict-big').textContent='Rozpocznij dyktowanie';$('doc-dict-big').setAttribute('aria-pressed','false');if(!failed)$('doc-dict-status').textContent='Dyktowanie zakończone. Sprawdź treść przed użyciem AI.';saveDraft();};
        try{r.start();$('doc-dict-big').textContent='Zatrzymaj dyktowanie';$('doc-dict-big').setAttribute('aria-pressed','true');$('doc-dict-status').textContent='Słucham. Nie wymawiaj danych identyfikujących pacjenta.';}catch{stopRecording();$('doc-dict-status').textContent='Nie można rozpocząć dyktowania. Wpisz tekst ręcznie.';}
    };
    $('speech-consent').onchange=()=>{if(!$('speech-consent').checked)stopRecording();};
    document.addEventListener('panel:tab',event=>{if(event.detail!=='dokumentacja')stopRecording();});
    const clinical=()=>({subj:$('doc-subj').value,obj:$('doc-obj').value,assess:$('doc-assess').value,icf:$('doc-icf').value,proc:proc(),plan:$('doc-plan').value});
    const system='Redagujesz notatkę fizjoterapeuty po polsku. Zachowaj fakty i niepewność. Nie diagnozuj, nie wymyślaj informacji, zaleceń ani procedur. Odpowiedź wymaga weryfikacji terapeuty.';
    const aiButtons=['doc-dict-ai','doc-ai-tidy','doc-ai-patient'];
    let pendingAI=null;
    const runAI=async mode=>{
        if(!$('doc-ai-consent').checked){msg('Sprawdź opis i zaznacz zgodę na wysłanie go do wybranego dostawcy AI.');$('doc-ai-consent').focus();return;}
        stopRecording();
        const input=mode==='dict'?$('doc-transcript').value.trim():JSON.stringify(clinical());
        if((mode==='dict'&&!input)||(mode!=='dict'&&!Object.values(clinical()).some(v=>Array.isArray(v)?v.length:String(v).trim()))){toast('Najpierw wpisz notatkę do opracowania.');return;}
        const before=revision,generation=++requestGeneration;aiButtons.forEach(id=>$(id).disabled=true);msg('AI opracowuje propozycję. Twoja karta pozostaje bez zmian.');$('doc-dict-status').textContent='Opracowuję propozycję AI…';
        try{
            const instruction=mode==='patient'?'Napisz krótkie streszczenie dla pacjenta prostym językiem, wyłącznie na podstawie notatki.':`Odpowiedz tylko JSON z polami tekstowymi subj, obj, assess, icf, plan oraz tablicą proc. Zachowaj wszystkie informacje. Procedury wyłącznie z listy: ${[...document.querySelectorAll('#doc-proc input')].map(i=>i.value).join(', ')}. Brak danych oznacz pustym polem.`;
            const result=await ask(system+' '+instruction,input);
            if(before!==revision||generation!==requestGeneration){msg('Karta zmieniła się w trakcie zapytania. Propozycja nie została zastosowana — uruchom AI ponownie dla bieżącej notatki.');return;}
            let data;
            if(mode==='patient')data={summary:result};else{data=JSON.parse(result.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,''));if(!data||typeof data!=='object'||!['subj','obj','assess','icf','plan'].every(key=>typeof data[key]==='string')||!Array.isArray(data.proc)||!data.proc.every(p=>typeof p==='string'))throw new Error('AI zwróciło niepoprawną strukturę. Karta nie została zmieniona.');}
            if(mode!=='patient' && data.proc.some(p=>![...document.querySelectorAll('#doc-proc input')].some(i=>i.value===p)))throw new Error('AI zwróciło procedurę spoza dostępnej listy. Karta nie została zmieniona. Popraw notatkę lub wpisz procedury ręcznie.');
            pendingAI={data,revision:before,generation,mode};
            $('ai-review-text').textContent=mode==='patient'?data.summary:`WYWIAD\n${data.subj}\n\nBADANIE\n${data.obj}\n\nPROBLEM\n${data.assess}\n\nICF\n${data.icf}\n\nPROCEDURY\n${data.proc.join(', ')}\n\nZALECENIA\n${data.plan}`;
            P.openDialog('ai-review-modal');msg('Propozycja gotowa do sprawdzenia.');
        }catch(error){msg('Błąd AI: '+error.message);toast('Nie zmieniono karty. Sprawdź komunikat przy formularzu.');}
        finally{aiButtons.forEach(id=>$(id).disabled=false);$('doc-dict-status').textContent='Sprawdź wynik przy karcie wizyty.';}
    };
    $('doc-dict-ai').onclick=()=>runAI('dict');$('doc-ai-tidy').onclick=()=>runAI('tidy');$('doc-ai-patient').onclick=()=>runAI('patient');
    $('ai-review-apply').onclick=()=>{
        if(!pendingAI||pendingAI.revision!==revision||pendingAI.generation!==requestGeneration){$('ai-review-modal').close();toast('Karta zmieniła się. Uruchom AI ponownie.');return;}
        const {data,mode}=pendingAI;
        if(mode==='patient')$('doc-plan').value=[$('doc-plan').value.trim(),'Dla pacjenta:\n'+data.summary].filter(Boolean).join('\n\n');
        else{['subj','obj','assess','icf','plan'].forEach(key=>$('doc-'+key).value=data[key]);document.querySelectorAll('#doc-proc input').forEach(i=>i.checked=data.proc.includes(i.value));}
        revision++;saveDraft();$('ai-review-modal').close();pendingAI=null;msg('Zastosowano propozycję. Sprawdź kartę przed zapisaniem wersji.');
    };
})();
