/* Lokalny gabinet: nawigacja, ćwiczenia, plany, eksport i wizyty. */
(() => {
    'use strict';
    const $ = id => document.getElementById(id);
    const setText = (id,value) => { const element=$(id); const text=String(value); if(element.textContent!==text)element.textContent=text; };
    const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const dateLocal = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const normalize = value => String(value ?? '').toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/ł/g,'l');
    const storageError = () => { $('storage-error').textContent = 'Nie udało się odczytać lub zapisać części danych w przeglądarce. Nie zamykaj karty: pobierz treść dokumentu i sprawdź dostępne miejsce oraz ustawienia pamięci.'; $('storage-error').classList.remove('hidden'); };
    const readText = (key, fallback = '') => { try { return localStorage.getItem(key) ?? fallback; } catch { storageError(); return fallback; } };
    const read = (key, fallback, validate = value => Array.isArray(fallback) ? Array.isArray(value) : value && typeof value === 'object' && !Array.isArray(value)) => {
        try { const raw = localStorage.getItem(key); if (raw === null) return fallback; const value = JSON.parse(raw); if (!validate(value)) throw new Error('Invalid shape'); return value; } catch { storageError(); return fallback; }
    };
    const write = (key, value, raw = false) => { try { localStorage.setItem(key, raw ? value : JSON.stringify(value)); return true; } catch { storageError(); return false; } };
    let toastTimer;
    const toast = message => { $('toast').textContent = message; $('toast').classList.remove('hidden'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('toast').classList.add('hidden'), 3500); };
    const tabs = [...document.querySelectorAll('[data-tab]')];
    const names = {start:'Pulpit',dokumentacja:'Wywiad i wizyta',baza:'Baza ćwiczeń',generator:'Plan rehabilitacji',kalendarz:'Wizyty',ai:'Ustawienia AI'};
    const go = (id, focus = true, updateHash = true) => {
        if (!names[id]) id = 'start';
        tabs.forEach(button => {
            const active = button.dataset.tab === id;
            button.classList.toggle('is-on', active); button.setAttribute('aria-selected', String(active)); button.tabIndex = active ? 0 : -1;
            const panel = $('tab-'+button.dataset.tab); panel.classList.toggle('hidden', !active); panel.hidden = !active;
        });
        $('current-area').textContent = names[id]; document.title = `${names[id]} · Maciej Liedel`;
        if (updateHash) history.replaceState(null,'','#'+id);
        if (focus) { const heading = $('tab-'+id).querySelector('h1'); heading.tabIndex = -1; heading.focus({preventScroll:true}); window.scrollTo({top:0,behavior:'instant'}); }
        document.dispatchEvent(new CustomEvent('panel:tab', {detail:id}));
    };
    const orientation = () => { document.querySelector('.panel-tabs').setAttribute('aria-orientation', matchMedia('(max-width:760px)').matches ? 'horizontal' : 'vertical'); };
    orientation(); window.addEventListener('resize', orientation);
    tabs.forEach((button,index) => {
        const id = button.dataset.tab; button.id = 'nav-'+id; button.setAttribute('aria-controls','tab-'+id);
        $('tab-'+id).setAttribute('role','tabpanel'); $('tab-'+id).setAttribute('aria-labelledby',button.id);
        button.onclick = () => go(id,false);
        button.onkeydown = event => {
            const horizontal = matchMedia('(max-width:760px)').matches;
            const nextKey = horizontal ? 'ArrowRight' : 'ArrowDown', prevKey = horizontal ? 'ArrowLeft' : 'ArrowUp';
            let next = index;
            if(event.key===nextKey) next=(index+1)%tabs.length; else if(event.key===prevKey) next=(index+tabs.length-1)%tabs.length;
            else if(event.key==='Home') next=0; else if(event.key==='End') next=tabs.length-1; else return;
            event.preventDefault(); go(tabs[next].dataset.tab,false); tabs[next].focus();
        };
    });
    document.addEventListener('click', event => { const target=event.target.closest('[data-go]'); if(target) go(target.dataset.go); });
    window.addEventListener('hashchange',()=>{ const id=location.hash.slice(1); if(names[id])go(id,true,false); });
    document.querySelector('.skip-link').onclick=event=>{event.preventDefault();$('workspace').focus();};
    const theme = value => { document.documentElement.dataset.theme=value; $('theme-toggle').setAttribute('aria-label',value==='light'?'Włącz ciemny motyw':'Włącz jasny motyw'); };
    theme(readText('theme','light')==='dark'?'dark':'light');
    $('theme-toggle').onclick=()=>{ const value=document.documentElement.dataset.theme==='light'?'dark':'light'; theme(value); write('theme',value,true); };
    $('today-label').textContent = new Intl.DateTimeFormat('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'}).format(new Date()).toLocaleUpperCase('pl');

    // Native dialog provides Escape, focus containment and background isolation.
    const openers = new WeakMap();
    const openDialog = id => { const dialog=$(id); openers.set(dialog,document.activeElement); dialog.showModal(); dialog.scrollTop=0; };
    document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('close',()=>{ const trigger=openers.get(dialog); if(trigger?.isConnected && trigger.getClientRects().length) trigger.focus({preventScroll:true}); else document.querySelector('[role=tab][aria-selected=true]')?.focus({preventScroll:true}); }));
    document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('keydown',event=>{
        if(event.key!=='Tab')return;
        const controls=[...dialog.querySelectorAll('button,a[href],input,select,textarea,iframe,[tabindex]')].filter(el=>!el.disabled&&el.tabIndex>=0&&el.getClientRects().length);
        const first=controls[0],last=controls.at(-1);
        if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
        else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }));
    document.querySelectorAll('[data-close]').forEach(button=>button.onclick=()=>$(button.dataset.close).close());
    const confirmChange = (text, label='Potwierdź') => new Promise(resolve=>{
        const dialog=$('confirm-modal'); $('confirm-text').textContent=text; $('confirm-ok').textContent=label; dialog.returnValue='';
        $('confirm-cancel').onclick=()=>dialog.close('cancel'); $('confirm-ok').onclick=()=>dialog.close('ok');
        dialog.addEventListener('close',()=>resolve(dialog.returnValue==='ok'),{once:true}); openDialog('confirm-modal');
    });
    const download = (name, text, type='text/plain;charset=utf-8') => { const url=URL.createObjectURL(new Blob([text],{type})); const a=document.createElement('a'); a.href=url; a.download=name; a.click(); setTimeout(()=>URL.revokeObjectURL(url),10000); };
    const copy = async (text, target) => { try { await navigator.clipboard.writeText(text); target.textContent='Skopiowano. Wklej treść do swojej wiadomości.'; } catch { target.textContent='Schowek jest niedostępny. Pobierz plik tekstowy z podglądu.'; } };
    const base64 = text => { const bytes=new TextEncoder().encode(text); let binary=''; bytes.forEach(byte=>binary+=String.fromCharCode(byte)); return btoa(binary); };
    const validEmail = value => { const input=document.createElement('input'); input.type='email'; input.required=true; input.value=value; return input.checkValidity() && !/[\r\n]/.test(value); };
    let currentExport;
    const exportDocument = data => { currentExport=data; $('export-title').textContent=data.title; $('export-body').innerHTML=data.html; $('export-msg').textContent=''; openDialog('export-modal'); };
    $('export-print').onclick=()=>window.print();
    $('export-copy').onclick=()=>copy(currentExport.text,$('export-msg'));
    $('export-text').onclick=()=>download(currentExport.filename+'.txt',currentExport.text);
    $('export-email').onclick=()=>{
        if (!validEmail(currentExport.email)) { $('export-msg').textContent='Zamknij podgląd i wpisz poprawny e-mail pacjenta w formularzu.'; return; }
        const encodedBody=base64(currentExport.text.replace(/\r?\n/g,'\r\n')).match(/.{1,76}/g)?.join('\r\n') || '';
        const eml=`To: ${currentExport.email}\r\nSubject: =?UTF-8?B?${base64(currentExport.title+' — Maciej Liedel')}?=\r\nX-Unsent: 1\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\nContent-Transfer-Encoding: base64\r\n\r\n${encodedBody}\r\n`;
        download(currentExport.filename+'.eml',eml,'message/rfc822'); $('export-msg').textContent='Pobrano wiadomość. Otwórz ją w programie obsługującym .eml i zatwierdź wysyłkę. Możesz też skopiować treść do swojej poczty.';
    };
    const openVideo = exercise => { $('video-title').textContent=exercise.name; $('video-frame').src=`https://www.youtube-nocookie.com/embed/${exercise.yt}?rel=0`; $('video-link').href=exercise.video; openDialog('video-modal'); };
    $('video-modal').addEventListener('close',()=>$('video-frame').removeAttribute('src'));

    const planFields = ['patient','date','goal','frequency','review','notes','email'];
    const cleanItems = items => Array.isArray(items) ? items.filter(p=>p && EXERCISES.some(e=>e.id===p.id)).map(p=>({id:p.id,dose:typeof p.dose==='string'?p.dose:(p.sets||p.reps ? `${p.sets||'—'} serii × ${p.reps||'—'} powt.` : EXERCISES.find(e=>e.id===p.id).dosage),note:typeof p.note==='string'?p.note:''})) : [];
    const legacy = {items:cleanItems(read('maciej_plan',[]))};
    planFields.forEach(key=>legacy[key]=readText('maciej_plan-'+key,key==='date'?dateLocal():''));
    let plan=read('maciej_plan_v2',legacy,value=>value && typeof value==='object' && Array.isArray(value.items));
    plan={...plan,items:cleanItems(plan.items)};
    let plans=read('maciej_plan_history',[]).filter(p=>p && Array.isArray(p.items));
    const applyPlanFields = ()=>planFields.forEach(key=>$('plan-'+key).value=typeof plan[key]==='string'?plan[key]:(key==='date'?dateLocal():''));
    const collectPlan = ()=>{ planFields.forEach(key=>plan[key]=$('plan-'+key).value); return plan; };
    const planHasContent = ()=>plan.items.length || ['patient','goal','notes','email','frequency','review'].some(key=>String(plan[key]||'').trim());
    const counts=()=>{ for(const id of ['plan-count','stat-plan','library-plan-count']) $(id).textContent=plan.items.length; $('stat-docs').textContent=read('maciej_docs',[]).length; $('library-patient').textContent=plan.patient ? `Bieżący plan: ${plan.patient}` : 'Bieżący plan: pacjent nie został jeszcze wskazany'; };
    const savePlan=()=>{ collectPlan(); const ok=write('maciej_plan_v2',plan); setText('plan-save-status',ok?'Szkic zapisany lokalnie':'Nie zapisano szkicu'); counts(); return ok; };
    applyPlanFields(); planFields.forEach(key=>$('plan-'+key).addEventListener('input',savePlan));
    let filter='all';
    const refreshAddButtons = ()=>document.querySelectorAll('[data-add-ex]').forEach(button=>{ const added=plan.items.some(p=>p.id===button.dataset.addEx); button.setAttribute('aria-disabled',String(added)); button.textContent=added?'✓ W planie':'＋ Do planu'; });
    const renderExercises=()=>{
        const query=normalize($('ex-search').value); const exercises=EXERCISES.filter(e=>(filter==='all'||e.area===filter)&&normalize(`${e.name} ${e.area} ${e.goal}`).includes(query));
        setText('ex-count',`Znalezione ćwiczenia: ${exercises.length} / ${EXERCISES.length}`);
        $('ex-list').innerHTML=exercises.length?exercises.map(e=>`<article class="ex-card"><span class="ex-area">${esc(e.area)}</span><h2>${esc(e.name)}</h2><p class="ex-goal">${esc(e.goal)}</p><div class="ex-dose"><span>Dawkowanie w bibliotece</span><strong>${esc(e.dosage)}</strong></div><details><summary>Instrukcja i uwagi</summary><ol>${e.steps.map(step=>`<li>${esc(step)}</li>`).join('')}</ol><p class="ex-contra">${esc(e.contra)}</p></details><div class="ex-actions"><button class="btn-secondary" data-video="${e.id}" aria-label="Obejrzyj film: ${esc(e.name)}">▷ Obejrzyj film</button><button class="btn-primary" data-add-ex="${e.id}">＋ Do planu</button></div></article>`).join(''):'<div class="empty"><strong>Nie znaleziono ćwiczeń</strong>Zmień słowo w wyszukiwarce lub wybierz inny obszar.</div>';
        refreshAddButtons();
    };
    $('ex-search').oninput=renderExercises;
    document.querySelectorAll('[data-f]').forEach(button=>button.onclick=()=>{filter=button.dataset.f;document.querySelectorAll('[data-f]').forEach(b=>{b.classList.toggle('is-on',b===button);b.setAttribute('aria-pressed',String(b===button));});renderExercises();});
    $('ex-list').onclick=event=>{ const video=event.target.closest('[data-video]'); if(video) openVideo(EXERCISES.find(e=>e.id===video.dataset.video)); const button=event.target.closest('[data-add-ex]'); if(!button||button.getAttribute('aria-disabled')==='true') return; const e=EXERCISES.find(e=>e.id===button.dataset.addEx); plan.items.push({id:e.id,dose:e.dosage,note:''}); savePlan(); renderPlan(); refreshAddButtons(); toast(`Dodano do planu: ${e.name}`); };
    const renderPlan=()=>{
        $('plan-items').innerHTML=plan.items.length?plan.items.map((p,i)=>{const e=EXERCISES.find(e=>e.id===p.id);return `<article class="plan-row" data-index="${i}"><div class="plan-row-header"><span class="plan-row-number">${i+1}</span><h3>${esc(e.name)}</h3><div class="row-btns"><button data-move="-1" ${i===0?'disabled':''} aria-label="Przesuń wyżej: ${esc(e.name)}">↑</button><button data-move="1" ${i===plan.items.length-1?'disabled':''} aria-label="Przesuń niżej: ${esc(e.name)}">↓</button><button data-remove aria-label="Usuń ćwiczenie: ${esc(e.name)}">×</button></div></div><label>Dawkowanie dla pacjenta<input data-key="dose" value="${esc(p.dose)}" placeholder="Serie, powtórzenia, czas lub dystans"></label><label>Wskazówka do wykonania <span class="optional">opcjonalnie</span><input data-key="note" value="${esc(p.note)}" placeholder="Doprecyzuj sposób wykonania…"></label><button class="btn-link" data-video="${e.id}">▷ Obejrzyj film</button></article>`;}).join(''):'<div class="empty"><strong>Tu powstaje plan pacjenta</strong>Wybierz pierwsze ćwiczenia z biblioteki.<br><button class="btn-secondary" data-go="baza">Przejdź do ćwiczeń →</button></div>';
        counts();
    };
    $('plan-items').oninput=event=>{const key=event.target.dataset.key; if(!key) return;plan.items[+event.target.closest('[data-index]').dataset.index][key]=event.target.value;savePlan();};
    $('plan-items').onclick=async event=>{
        const button=event.target.closest('button'); if(!button) return;
        if(button.dataset.video){openVideo(EXERCISES.find(e=>e.id===button.dataset.video));return;}
        const row=button.closest('[data-index]'); if(!row) return; const i=+row.dataset.index;
        if(button.hasAttribute('data-remove')){if(!await confirmChange('Usunąć to ćwiczenie z bieżącego planu?','Usuń ćwiczenie'))return;plan.items.splice(i,1);savePlan();renderPlan();refreshAddButtons();$('plan-items').querySelector('input,button')?.focus();}
        if(button.dataset.move){const j=i+Number(button.dataset.move);[plan.items[i],plan.items[j]]=[plan.items[j],plan.items[i]];savePlan();renderPlan();const moved=$('plan-items').querySelector(`[data-index="${j}"]`);moved.querySelector('input').focus();toast('Zmieniono kolejność ćwiczeń.');}
    };
    const resetPlan=()=>{plan={items:[],date:dateLocal()};applyPlanFields();savePlan();renderPlan();refreshAddButtons();$('plan-msg').textContent='';};
    $('plan-clear').onclick=async()=>{if(planHasContent()&&!await confirmChange('Rozpocząć pusty plan? Bieżący szkic zostanie zastąpiony. Zapisane wersje pozostaną w historii.','Rozpocznij nowy plan'))return;resetPlan();$('plan-patient').focus();};
    const planValid=()=>{
        collectPlan(); let field, message;
        if(!plan.patient.trim()){field=$('plan-patient');message='Wpisz pacjenta lub jego kod.';}
        else if(!plan.date){field=$('plan-date');message='Uzupełnij datę planu.';}
        else if(!plan.items.length){message='Dodaj co najmniej jedno ćwiczenie do planu.';}
        else {const i=plan.items.findIndex(p=>!p.dose.trim());if(i!==-1){field=$('plan-items').querySelector(`[data-index="${i}"] [data-key=dose]`);message='Uzupełnij dawkowanie każdego ćwiczenia.';}}
        if(message){$('plan-msg').textContent=message;toast(message);field?.focus();return false;}return true;
    };
    const planDocument=()=>{
        collectPlan();const lines=plan.items.map((p,i)=>{const e=EXERCISES.find(e=>e.id===p.id);return `${i+1}. ${e.name}\nDawkowanie: ${p.dose}${p.note?'\nWskazówka: '+p.note:''}\n${e.steps.map((s,n)=>`${n+1}) ${s}`).join('\n')}\nUwaga: ${e.contra}\nFilm: ${e.video}`;});
        const text=`PLAN REHABILITACJI — Maciej Liedel\nPacjent: ${plan.patient}\nData: ${plan.date}\nCel: ${plan.goal||'—'}\nHarmonogram: ${plan.frequency||'—'}\nKontrola: ${plan.review||'—'}\n\n${lines.join('\n\n')}\n\nZALECENIA\n${plan.notes||'—'}`;
        const html=`<div class="paper-brand">MACIEJ LIEDEL · FIZJOTERAPIA</div><h2>Twój plan rehabilitacji</h2><div class="paper-meta"><p><strong>Pacjent:</strong> ${esc(plan.patient)}<br><strong>Data:</strong> ${esc(plan.date)}<br><strong>Cel:</strong> ${esc(plan.goal||'—')}<br><strong>Harmonogram:</strong> ${esc(plan.frequency||'—')}<br><strong>Kontrola:</strong> ${esc(plan.review||'—')}</p></div>${plan.items.map((p,i)=>{const e=EXERCISES.find(e=>e.id===p.id);return `<section class="paper-exercise"><h3>${i+1}. ${esc(e.name)}</h3><p><strong>Dawkowanie:</strong> ${esc(p.dose)}</p>${p.note?`<p>${esc(p.note)}</p>`:''}<ol>${e.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol><p><strong>Uwaga:</strong> ${esc(e.contra)}</p><p><a href="${esc(e.video)}">Film: ${esc(e.video)}</a></p></section>`;}).join('')}<h3>Zalecenia</h3><p>${esc(plan.notes||'—')}</p>`;
        return {title:'Plan rehabilitacji',text,html,email:plan.email,filename:'plan-rehabilitacji-'+plan.date};
    };
    const showPlan=()=>{if(!planValid())return false;exportDocument(planDocument());return true;};
    $('plan-preview').onclick=showPlan;
    $('plan-print').onclick=()=>{if(showPlan())$('export-msg').textContent='Sprawdź podgląd i wybierz „Drukuj / PDF”. W oknie drukowania możesz zapisać dokument jako PDF.';};
    $('plan-copy').onclick=()=>{if(planValid())copy(planDocument().text,$('plan-msg'));};
    $('plan-email-send').onclick=()=>{if(!planValid())return;if(!$('plan-email').value||!$('plan-email').reportValidity()){toast('Wpisz poprawny e-mail pacjenta.');$('plan-email').focus();return;}showPlan();$('export-msg').textContent='Sprawdź plan i wybierz „Pobierz e-mail .eml”. Wiadomość nie jest wysyłana automatycznie.';};
    const renderPlanHistory=()=>{
        $('plan-history').innerHTML=plans.length?[...plans].reverse().map(p=>`<div class="record-row"><div><strong>${esc(p.patient)} · ${esc(p.date)}</strong><small>${esc(p.goal||'Plan rehabilitacji')} · ćwiczeń: ${p.items.length}</small></div><button class="btn-secondary" data-load-plan="${esc(p.id)}">Otwórz</button></div>`).join(''):'<div class="empty">Zapisane wersje planów pojawią się tutaj.</div>';
    };
    $('plan-save').onclick=()=>{if(!planValid())return;const version={...structuredClone(plan),id:crypto.randomUUID()};const next=[...plans,version];if(write('maciej_plan_history',next)){plans=next;renderPlanHistory();$('plan-msg').textContent='Zapisano nową wersję planu w historii.';}};
    $('plan-history').onclick=async event=>{const b=event.target.closest('[data-load-plan]');if(!b)return;const found=plans.find(p=>p.id===b.dataset.loadPlan);if(!found)return;if(planHasContent()&&!await confirmChange('Wczytać zapisaną wersję? Zastąpi bieżący szkic planu.','Wczytaj plan'))return;plan={...structuredClone(found),items:cleanItems(found.items)};applyPlanFields();savePlan();renderPlan();refreshAddButtons();$('plan-patient').focus();toast('Wczytano plan. Zmiany zapiszesz jako nową wersję.');};
    const fromDoc=async data=>{if(planHasContent()&&!await confirmChange('Przygotować nowy plan dla tej wizyty? Bieżący szkic planu zostanie zastąpiony. Zapisane plany pozostaną w historii.','Przygotuj plan'))return;plan={items:[],patient:data.patient,email:data.email,goal:data.goal,notes:data.notes,date:dateLocal()};applyPlanFields();savePlan();renderPlan();refreshAddButtons();go('generator');};

    let visits=read('maciej_visits',[]).filter(v=>v && typeof v.date==='string' && typeof v.time==='string' && typeof v.client==='string');
    const upcoming=v=>new Date(`${v.date}T${v.time}`)>=new Date();
    const renderVisits=()=>{
        visits.sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time));
        const rows=vs=>vs.map(v=>`<div class="record-row"><div><strong>${esc(v.date)} · ${esc(v.time)}</strong><div>${esc(v.client)}</div><small>${esc(v.service)} · ${esc(v.place)}</small></div><div class="row-btns"><button class="btn-secondary" data-visit-open="${visits.indexOf(v)}">Karta wizyty</button><button class="icon-button" data-visit-remove="${visits.indexOf(v)}" aria-label="Usuń wizytę ${esc(v.client)} ${esc(v.date)}">×</button></div></div>`).join('');
        $('visit-list').innerHTML=rows(visits.filter(upcoming))||'<div class="empty"><strong>Wolna przestrzeń w terminarzu</strong>Dodaj kolejną wizytę w formularzu.</div>';
        $('visit-past').innerHTML=rows(visits.filter(v=>!upcoming(v)))||'<p class="field-hint">Brak archiwalnych wizyt.</p>';
        $('stat-visits').textContent=visits.filter(v=>v.date===dateLocal()).length;
        $('home-visits').innerHTML=visits.filter(upcoming).slice(0,3).map(v=>`<div class="home-visit"><span class="date-block">${esc(v.time)}</span><div><strong>${esc(v.client)}</strong><small>${esc(v.date)} · ${esc(v.service)}</small></div></div>`).join('')||'<div class="empty"><strong>Spokojny start</strong>Nie masz jeszcze zaplanowanych spotkań.<br><button class="btn-secondary" data-go="kalendarz">Dodaj pierwszą wizytę</button></div>';
        document.dispatchEvent(new Event('panel:visits'));
    };
    $('v-date').value=dateLocal();
    $('visit-form').onsubmit=event=>{event.preventDefault();const v={id:crypto.randomUUID(),date:$('v-date').value,time:$('v-time').value,client:$('v-client').value.trim(),service:$('v-service').value,place:$('v-place').value};if(!v.client){$('v-client').focus();return;}if(visits.some(x=>x.date===v.date&&x.time===v.time)){$('visit-msg').textContent='O tej godzinie masz już zapisaną wizytę. Wybierz inną godzinę.';toast('Ten termin jest już zajęty.');return;}const next=[...visits,v];if(write('maciej_visits',next)){visits=next;renderVisits();event.target.reset();$('v-date').value=dateLocal();toast('Wizyta zapisana.');$('visit-msg').textContent='Dodano wizytę do terminarza.';}};
    const visitAction=async event=>{const del=event.target.closest('[data-visit-remove]'),open=event.target.closest('[data-visit-open]');if(open){document.dispatchEvent(new CustomEvent('panel:open-visit',{detail:visits[+open.dataset.visitOpen]}));return;}if(!del)return;const i=+del.dataset.visitRemove;if(!await confirmChange('Usunąć wizytę z terminarza? Zapisane karty pozostaną w historii.','Usuń wizytę'))return;const next=visits.filter((v,n)=>n!==i);if(write('maciej_visits',next)){visits=next;renderVisits();$('v-client').focus();}};
    $('visit-list').onclick=visitAction;$('visit-past').onclick=visitAction;
    $('visit-export').onclick=()=>{
        if(!visits.length){toast('Najpierw dodaj wizytę.');return;}
        const icsEsc=value=>String(value??'').replace(/\\/g,'\\\\').replace(/;/g,'\\;').replace(/,/g,'\\,').replace(/\r?\n/g,'\\n');
        const stamp=new Date().toISOString().replace(/[-:]/g,'').split('.')[0]+'Z';
        const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Maciej Liedel//Gabinet//PL',...visits.flatMap(v=>['BEGIN:VEVENT',`UID:${v.id||base64(v.date+v.time+v.client)}@maciej-panel`,`DTSTAMP:${stamp}`,`DTSTART:${v.date.replaceAll('-','')}T${v.time.replace(':','')}00`,`SUMMARY:${icsEsc(v.client)} — ${icsEsc(v.service)}`,`LOCATION:${icsEsc(v.place)}`,'END:VEVENT']),'END:VCALENDAR'];
        const fold=line=>{let out='',part='';for(const char of line){if(new TextEncoder().encode(part+char).length>73){out+=part+'\r\n ';part='';}part+=char;}return out+part;};
        download('wizyty-maciej.ics',lines.map(fold).join('\r\n')+'\r\n','text/calendar;charset=utf-8');
    };
    window.Panel={$,esc,setText,dateLocal,normalize,read,readText,write,toast,go,confirmChange,download,copy,exportDocument,openDialog,counts,resetPlan,fromDoc,planHasContent,getPlanPatient:()=>plan.patient||'',getVisits:()=>visits};
    renderExercises();renderPlan();renderPlanHistory();renderVisits();go(location.hash.slice(1)||'start',false);
})();
