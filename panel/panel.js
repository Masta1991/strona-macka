/* Panel fizjoterapeuty: baza + generator (współdzielone z exercises.js) + kalendarz. */
const EMAIL_CONFIG = { publicKey: '', serviceId: '', templateId: '' };
// Aby wysyłać maile jednym klikiem: załóż konto https://www.emailjs.com,
// podepnij skrzynkę (Email Services), utwórz szablon ze zmiennymi
// {{to_email}}, {{patient}}, {{goal}}, {{plan_text}} i wpisz klucze powyżej.
document.addEventListener('DOMContentLoaded', () => {
    const html = document.documentElement;
    html.setAttribute('data-theme', localStorage.getItem('theme') || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
    document.getElementById('theme-toggle').onclick = () => {
        const next = html.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', next); localStorage.setItem('theme', next);
    };
    // tabs
    document.querySelectorAll('.panel-tabs button').forEach(b => b.onclick = () => {
        document.querySelectorAll('.panel-tabs button').forEach(x => x.classList.remove('is-on'));
        b.classList.add('is-on');
        ['baza', 'generator', 'kalendarz', 'dokumentacja', 'ai'].forEach(t => document.getElementById('tab-' + t).classList.toggle('hidden', t !== b.dataset.tab));
    });

    // --- podgląd filmów (modal z odtwarzaczem) ---
    const vModal = document.getElementById('video-modal');
    const vFrame = document.getElementById('video-frame');
    const vLink = document.getElementById('video-link');
    const openVideo = (e) => {
        vFrame.src = `https://www.youtube-nocookie.com/embed/${e.yt}?rel=0`;
        vLink.href = e.video;
        vLink.textContent = `Otwórz w YouTube: ${e.videoLabel} ↗`;
        vModal.showModal();
    };
    document.getElementById('video-close').onclick = () => { vFrame.src = ''; vModal.close(); };
    vModal.addEventListener('close', () => { vFrame.src = ''; });
    vModal.addEventListener('click', (ev) => { if (ev.target === vModal) { vFrame.src = ''; vModal.close(); } });
    const thumb = (e) => `https://i.ytimg.com/vi/${e.yt}/hqdefault.jpg`;

    // --- baza ---
    const safeLoad = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch (_) { return fb; } };
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const plan = safeLoad('maciej_plan', []);
    const savePlan = () => localStorage.setItem('maciej_plan', JSON.stringify(plan));
    const exList = document.getElementById('ex-list');
    const renderExercises = (f = 'all') => {
        exList.replaceChildren();
        EXERCISES.filter(e => f === 'all' || e.area === f).forEach(e => {
            const inPlan = plan.some(p => p.id === e.id);
            const card = document.createElement('article');
            card.className = 'ex-card';
            card.innerHTML = `<span class="ex-area">${e.area}</span><h3>${e.name}</h3>
                <p class="ex-goal"><strong>Cel:</strong> ${e.goal}</p>
                <ol>${e.steps.map(s => `<li>${s}</li>`).join('')}</ol>
                <p class="ex-dose"><strong>Dawkowanie:</strong> ${e.dosage}</p>
                <p class="ex-contra">⚠ ${e.contra}</p>
                <button class="thumb-btn" aria-label="Obejrzyj: ${e.videoLabel}"><img loading="lazy" src="${thumb(e)}" alt="Podgląd filmu: ${e.videoLabel}"><span>▶ ${e.videoLabel}</span></button>
                <div class="ex-actions"><a href="${e.video}" target="_blank" rel="noopener" class="btn-secondary">YouTube ↗</a>
                <button class="btn-primary" ${inPlan ? 'disabled' : ''}>${inPlan ? '✓ W planie' : '+ Do planu'}</button></div>`;
            card.querySelector('.thumb-btn').onclick = () => openVideo(e);
            card.querySelector('.btn-primary').onclick = (ev) => { plan.push({ id: e.id, sets: '', reps: '' }); savePlan(); renderPlan(); ev.target.disabled = true; ev.target.textContent = '✓ W planie'; };
            exList.append(card);
        });
    };
    document.querySelectorAll('#ex-filters button').forEach(b => b.onclick = () => {
        document.querySelectorAll('#ex-filters button').forEach(x => x.classList.remove('is-on'));
        b.classList.add('is-on'); renderExercises(b.dataset.f);
    });

    // --- generator ---
    const planBox = document.getElementById('plan-items');
    const planMsg = document.getElementById('plan-msg');
    const renderPlan = () => {
        planBox.replaceChildren();
        if (!plan.length) { planBox.innerHTML = '<p class="empty">Brak ćwiczeń — dodaj je z zakładki „Baza ćwiczeń”.</p>'; return; }
        plan.forEach((p, i) => {
            const e = EXERCISES.find(x => x.id === p.id);
            if (!e) return;
            const row = document.createElement('div');
            row.className = 'plan-row';
            row.innerHTML = `<button class="plan-thumb" aria-label="Obejrzyj: ${e.videoLabel}"><img loading="lazy" src="${thumb(e)}" alt=""><span>▶</span></button>
                <div><strong>${i + 1}. ${e.name}</strong><small>${e.dosage} · <a href="${e.video}" target="_blank" rel="noopener">film: ${e.videoLabel} ↗</a></small></div>
                <label>Serie <input data-k="sets" value="${esc(p.sets)}" placeholder="3"></label>
                <label>Powt. <input data-k="reps" value="${esc(p.reps)}" placeholder="12"></label>
                <button aria-label="Usuń">×</button>`;
            row.querySelector('.plan-thumb').onclick = () => openVideo(e);
            row.querySelectorAll('input').forEach(inp => inp.oninput = () => { p[inp.dataset.k] = inp.value; savePlan(); });
            row.querySelector('button').onclick = () => { plan.splice(i, 1); savePlan(); renderPlan(); renderExercises(document.querySelector('#ex-filters .is-on')?.dataset.f || 'all'); };
            planBox.append(row);
        });
    };
    const planText = () => {
        const name = document.getElementById('plan-patient').value || '—';
        const goal = document.getElementById('plan-goal').value || '—';
        const notes = document.getElementById('plan-notes').value || '—';
        const lines = plan.map((p, i) => {
            const e = EXERCISES.find(x => x.id === p.id);
            return `${i + 1}. ${e.name} — ${p.sets || '?'} serii × ${p.reps || '?'} powt. (propozycja: ${e.dosage})\n   Jak: ${e.steps.join(' / ')}\n   Film: ${e.video}\n   Uwaga: ${e.contra}`;
        });
        return `PLAN TRENINGOWY — Maciej Liedel, fizjoterapia\nKlient: ${name}\nCel: ${goal}\n\n${lines.join('\n\n')}\n\nZalecenia: ${notes}\n\nZasada bezpieczeństwa: ból akceptowalny do 3–4/10, wracający do bazy do rana. Przy niepokojących objawach — kontakt z gabinetem.`;
    };
    document.getElementById('plan-print').onclick = () => {
        if (!plan.length) { planMsg.textContent = 'Najpierw dodaj ćwiczenia do planu.'; return; }
        const w = window.open('', '_blank');
        w.document.write(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Plan treningowy</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6}pre{white-space:pre-wrap;font:inherit}</style></head><body><h1>Plan treningowy — Maciej Liedel</h1><pre>${planText().replace(/</g, '&lt;')}</pre><script>onload=()=>print()<\/script></body></html>`);
        w.document.close();
    };
    document.getElementById('plan-copy').onclick = async () => {
        if (!plan.length) { planMsg.textContent = 'Najpierw dodaj ćwiczenia do planu.'; return; }
        try { await navigator.clipboard.writeText(planText()); planMsg.textContent = 'Skopiowano — wklej do SMS-a, maila lub Booksy.'; }
        catch (_) { planMsg.textContent = 'Nie udało się skopiować — użyj wydruku.'; }
    };
    document.getElementById('plan-clear').onclick = () => { plan.length = 0; savePlan(); renderPlan(); renderExercises(); planMsg.textContent = ''; };
    // --- wysyłka e-mail ---
    const emailReady = () => EMAIL_CONFIG.publicKey && EMAIL_CONFIG.serviceId && EMAIL_CONFIG.templateId && typeof emailjs !== 'undefined';
    document.getElementById('plan-email-send').onclick = async () => {
        if (!plan.length) { planMsg.textContent = 'Najpierw dodaj ćwiczenia do planu.'; return; }
        const to = document.getElementById('plan-email').value.trim();
        if (!to || !to.includes('@')) { planMsg.textContent = 'Wpisz poprawny e-mail klienta.'; return; }
        const name = document.getElementById('plan-patient').value || '—';
        const goal = document.getElementById('plan-goal').value || '—';
        if (emailReady()) {
            planMsg.textContent = 'Wysyłanie...';
            try {
                emailjs.init({ publicKey: EMAIL_CONFIG.publicKey });
                await emailjs.send(EMAIL_CONFIG.serviceId, EMAIL_CONFIG.templateId, { to_email: to, patient: name, goal, plan_text: planText() });
                planMsg.textContent = `Plan wysłany na ${to} ✓`;
            } catch (_) { planMsg.textContent = 'Błąd wysyłki EmailJS — sprawdź klucze w panel.js.'; }
            return;
        }
        // Fallback: program pocztowy z gotową treścią (działa od razu, bez konfiguracji)
        const body = planText();
        if (body.length > 1800) { planMsg.textContent = 'Plan jest za długi dla programu pocztowego — użyj Drukuj/PDF albo Kopiuj.'; return; }
        const subject = encodeURIComponent(`Plan treningowy — Maciej Liedel (${name})`);
        window.location.href = `mailto:${encodeURIComponent(to)}?subject=${subject}&body=${encodeURIComponent(body)}`;
        planMsg.textContent = 'Otwieram program pocztowy z gotowym planem. Dla wysyłki jednym klikiem skonfiguruj EmailJS (instrukcja poniżej).';
    };
    ['plan-patient', 'plan-goal', 'plan-notes'].forEach(id => {
        const el = document.getElementById(id);
        el.value = localStorage.getItem('maciej_' + id) || '';
        el.oninput = () => localStorage.setItem('maciej_' + id, el.value);
    });
    renderExercises(); renderPlan();

    // --- kalendarz (lokalny + eksport ICS) ---
    const visits = safeLoad('maciej_visits', []);
    const saveVisits = () => localStorage.setItem('maciej_visits', JSON.stringify(visits));
    const list = document.getElementById('visit-list');
    const renderVisits = () => {
        list.replaceChildren();
        visits.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
        const now = new Date().toISOString().slice(0, 16);
        if (!visits.length) { list.innerHTML = '<p class="empty">Brak wizyt — dodaj pierwszą powyżej.</p>'; return; }
        visits.forEach((v) => {
            const past = (v.date + 'T' + v.time) < now;
            const d = document.createElement('div');
            d.className = 'visit-row' + (past ? ' is-past' : '');
            d.innerHTML = `<div><strong>${esc(v.date)} · ${esc(v.time)}</strong> — ${esc(v.client)}${past ? ' <span class="past-tag">archiwalna</span>' : ''}<small>${esc(v.service)} · ${esc(v.place)}</small></div><button aria-label="Usuń">×</button>`;
            d.querySelector('button').onclick = () => { visits.splice(visits.indexOf(v), 1); saveVisits(); renderVisits(); };
            list.append(d);
        });
        if (visits.some(v => (v.date + 'T' + v.time) < now)) {
            const clean = document.createElement('button');
            clean.className = 'btn-link'; clean.textContent = 'Usuń wizyty archiwalne';
            clean.onclick = () => {
                for (let i = visits.length - 1; i >= 0; i--) if ((visits[i].date + 'T' + visits[i].time) < now) visits.splice(i, 1);
                saveVisits(); renderVisits();
            };
            list.append(clean);
        }
    };
    document.getElementById('visit-form').onsubmit = (e) => {
        e.preventDefault();
        visits.push({ date: document.getElementById('v-date').value, time: document.getElementById('v-time').value, client: document.getElementById('v-client').value, service: document.getElementById('v-service').value, place: document.getElementById('v-place').value });
        saveVisits(); renderVisits(); e.target.reset();
    };
    document.getElementById('visit-export').onclick = () => {
        const icsEsc = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
        const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//MKW//Panel//PL',
            ...visits.map((v, i) => ['BEGIN:VEVENT', `UID:maciej-${Date.now()}-${i}@panel`, `DTSTAMP:${stamp}`, `DTSTART:${v.date.replaceAll('-', '')}T${v.time.replace(':', '')}00`, `SUMMARY:${icsEsc(v.client)} — ${icsEsc(v.service)}`, `LOCATION:${icsEsc(v.place)}`, 'END:VEVENT'].join('\r\n')),
            'END:VCALENDAR'].join('\r\n');
        const a = document.createElement('a');
        a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' }));
        a.download = 'wizyty-maciej.ics'; a.click();
    };
    renderVisits();
});
