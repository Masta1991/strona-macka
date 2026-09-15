/* Dokumentacja wizyty (KIOF-roboczo) + Asystent AI (OpenRouter/OpenAI/ custom) + dyktowanie. */
document.addEventListener('DOMContentLoaded', () => {
    const $ = (id) => document.getElementById(id);
    const msg = (t) => { $('doc-msg').textContent = t; };

    // ---------- ustawienia AI ----------
    const aiGet = () => ({
        provider: localStorage.getItem('maciej_ai_provider') || 'openrouter',
        url: localStorage.getItem('maciej_ai_url') || '',
        key: localStorage.getItem('maciej_ai_key') || '',
        model: localStorage.getItem('maciej_ai_model') || 'openai/gpt-4o-mini',
        opBase: (localStorage.getItem('maciej_ai_opbase') || 'http://127.0.0.1:4096').replace(/\/$/, ''),
        opUser: localStorage.getItem('maciej_ai_opuser') || '',
        opPass: localStorage.getItem('maciej_ai_oppass') || ''
    });
    const aiShow = () => {
        const s = aiGet();
        $('ai-provider').value = s.provider; $('ai-url').value = s.url;
        $('ai-key').value = s.key; $('ai-model').value = s.model;
        $('ai-opbase').value = s.opBase; $('ai-opuser').value = s.opUser; $('ai-oppass').value = s.opPass;
        $('ai-url-wrap').classList.toggle('hidden', s.provider !== 'custom');
        $('ai-opencode-wrap').classList.toggle('hidden', s.provider !== 'opencode');
    };
    aiShow();
    $('ai-provider').onchange = () => {
        $('ai-url-wrap').classList.toggle('hidden', $('ai-provider').value !== 'custom');
        $('ai-opencode-wrap').classList.toggle('hidden', $('ai-provider').value !== 'opencode');
    };
    $('ai-save').onclick = () => {
        localStorage.setItem('maciej_ai_provider', $('ai-provider').value);
        localStorage.setItem('maciej_ai_url', $('ai-url').value.trim());
        localStorage.setItem('maciej_ai_key', $('ai-key').value.trim());
        localStorage.setItem('maciej_ai_model', $('ai-model').value.trim() || 'openai/gpt-4o-mini');
        localStorage.setItem('maciej_ai_opbase', $('ai-opbase').value.trim() || 'http://127.0.0.1:4096');
        localStorage.setItem('maciej_ai_opuser', $('ai-opuser').value.trim());
        localStorage.setItem('maciej_ai_oppass', $('ai-oppass').value);
        $('ai-msg').textContent = 'Zapisano w tej przeglądarce ✓';
    };
    const aiEndpoint = () => {
        const s = aiGet();
        if (s.provider === 'openai') return 'https://api.openai.com/v1/chat/completions';
        if (s.provider === 'custom') return s.url;
        return 'https://openrouter.ai/api/v1/chat/completions';
    };
    // OpenCode serve: health-check + sesja + wiadomość (czeka na odpowiedź)
    async function opencodeAsk(system, user) {
        const s = aiGet();
        const headers = { 'Content-Type': 'application/json' };
        if (s.opUser || s.opPass) headers['Authorization'] = 'Basic ' + btoa(`${s.opUser || 'opencode'}:${s.opPass}`);
        const call = async (path, opts) => {
            const res = await fetch(s.opBase + path, { ...opts, headers });
            if (res.status === 401) throw new Error('Serwer wymaga loginu/hasła (OPENCODE_SERVER_PASSWORD).');
            if (!res.ok) throw new Error('OpenCode: HTTP ' + res.status);
            return res.json();
        };
        const session = await call('/session', { method: 'POST', body: JSON.stringify({ title: 'Notatka fizjo' }) });
        const body = { system, parts: [{ type: 'text', text: user }] };
        const m = (s.model || '').trim();
        if (m.includes('/')) { const [providerID, ...rest] = m.split('/'); body.model = { providerID, modelID: rest.join('/') }; }
        const answer = await call(`/session/${session.id}/message`, { method: 'POST', body: JSON.stringify(body) });
        const text = (answer.parts || []).filter(p => p.type === 'text').map(p => p.text).join('\n').trim();
        if (!text) throw new Error('Serwer nie zwrócił tekstu.');
        return text;
    }
    async function aiAsk(system, user) {
        const s = aiGet();
        if (s.provider === 'opencode') return opencodeAsk(system, user);
        if (!s.key) throw new Error('Brak klucza API — uzupełnij zakładkę Asystent AI.');
        const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + s.key };
        if (s.provider === 'openrouter') { headers['HTTP-Referer'] = location.href; headers['X-Title'] = 'Panel Fizjoterapeuty — Maciej Liedel'; }
        const res = await fetch(aiEndpoint(), {
            method: 'POST', headers,
            body: JSON.stringify({ model: s.model, temperature: 0.3, max_tokens: 1500, messages: [{ role: 'system', content: system }, { role: 'user', content: user }] })
        });
        if (!res.ok) throw new Error('API: ' + res.status);
        const data = await res.json();
        return data.choices[0].message.content.trim();
    }
    $('ai-test').onclick = async () => {
        $('ai-msg').textContent = 'Testowanie...';
        try {
            if (aiGet().provider === 'opencode') {
                const s = aiGet();
                const headers = {};
                if (s.opUser || s.opPass) headers['Authorization'] = 'Basic ' + btoa(`${s.opUser || 'opencode'}:${s.opPass}`);
                const res = await fetch(s.opBase + '/global/health', { headers });
                if (!res.ok) throw new Error('HTTP ' + res.status + ' — czy serwer działa (opencode serve) i zgadza się adres/CORS?');
                const h = await res.json();
                $('ai-msg').textContent = `Serwer działa ✓ (wersja ${h.version || '?'})`;
            } else {
                await aiAsk('Odpowiedz jednym słowem.', 'Test. Odpowiedz: OK');
                $('ai-msg').textContent = 'Połączenie działa ✓';
            }
        }
        catch (e) { $('ai-msg').textContent = 'Błąd: ' + e.message; }
    };

    // ---------- dyktowanie (Web Speech API, pl-PL) ----------
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    let rec = null, recTarget = null;
    document.querySelectorAll('.dict-btn').forEach(btn => btn.onclick = () => {
        if (!SR) { msg('Dyktowanie wymaga Chrome lub Edge na komputerze/telefonie.'); return; }
        const ta = $(btn.dataset.target);
        if (rec && recTarget === ta) { rec.stop(); return; }
        if (rec) rec.stop();
        rec = new SR(); rec.lang = 'pl-PL'; rec.interimResults = true; rec.continuous = true;
        recTarget = ta;
        btn.classList.add('rec'); btn.textContent = '⏹ Stop';
        let base = ta.value ? ta.value.replace(/\s+$/, '') + ' ' : '';
        rec.onresult = (e) => {
            let interim = '', fin = '';
            for (const r of e.results) { if (r.isFinal) fin += r[0].transcript + ' '; else interim += r[0].transcript; }
            ta.value = base + fin + interim;
        };
        rec.onend = () => { btn.classList.remove('rec'); btn.textContent = '🎙 Dyktuj'; if (recTarget === ta) { rec = null; recTarget = null; } };
        rec.onerror = () => { btn.classList.remove('rec'); btn.textContent = '🎙 Dyktuj'; };
        rec.start();
    });

    // ---------- duże dyktowanie wizyty → AI wypełnia kartę ----------
    let bigText = '', bigRec = null;
    const bigBtn = $('doc-dict-big'), bigStatus = $('doc-dict-status');
    const bigBox = $('doc-transcript'), bigAi = $('doc-dict-ai'), bigClear = $('doc-dict-clear');
    bigBtn.onclick = () => {
        if (!SR) { bigStatus.textContent = 'Dyktowanie wymaga Chrome lub Edge (komputer/telefon, najlepiej HTTPS lub localhost).'; return; }
        if (bigRec) { bigRec.stop(); return; }
        if (rec) rec.stop();
        bigRec = new SR(); bigRec.lang = 'pl-PL'; bigRec.interimResults = true; bigRec.continuous = true;
        bigBtn.classList.add('rec'); bigBtn.textContent = '⏹ Zatrzymaj dyktowanie';
        bigStatus.textContent = 'Słucham... opowiedz przebieg wizyty. Pamiętaj: bez nazwiska, PESEL-u i telefonu.';
        bigBox.classList.remove('hidden');
        bigRec.onresult = (e) => {
            let interim = '', fin = '';
            for (const r of e.results) { if (r.isFinal) fin += r[0].transcript + ' '; else interim += r[0].transcript; }
            bigText += fin;
            bigBox.textContent = bigText + interim;
            bigBox.scrollTop = bigBox.scrollHeight;
        };
        bigRec.onend = () => {
            bigBtn.classList.remove('rec'); bigBtn.textContent = '🎙 Rozpocznij dyktowanie'; bigRec = null;
            if (bigText.trim()) {
                bigStatus.textContent = 'Nagranie gotowe. Sprawdź tekst, potem przetwórz przez AI albo przepisz ręcznie poniżej.';
                bigAi.classList.remove('hidden'); bigClear.classList.remove('hidden');
            } else bigStatus.textContent = 'Nic nie usłyszałem — spróbuj ponownie.';
        };
        bigRec.onerror = (e) => {
            bigBtn.classList.remove('rec'); bigBtn.textContent = '🎙 Rozpocznij dyktowanie'; bigRec = null;
            bigStatus.textContent = e.error === 'not-allowed' ? 'Zablokowany mikrofon — zezwól w przeglądarce.' : 'Błąd dyktowania. Możesz wpisać tekst ręcznie poniżej.';
        };
        bigRec.start();
    };
    bigClear.onclick = () => { bigText = ''; bigBox.textContent = ''; bigBox.classList.add('hidden'); bigAi.classList.add('hidden'); bigClear.classList.add('hidden'); bigStatus.textContent = ''; };
    bigAi.onclick = async () => {
        if (!bigText.trim()) return;
        if (!$('doc-ai-consent').checked) { bigStatus.textContent = 'Najpierw zaznacz potwierdzenie prywatności pod kartą.'; $('doc-ai-consent').scrollIntoView({ behavior: 'smooth', block: 'center' }); return; }
        bigStatus.textContent = 'AI rozkłada nagranie na pola karty...';
        try {
            const out = await aiAsk(
                SYS + ' Z nagrania terapeuty wyodrębnij dane do karty wizyty. Odpowiedz WYŁĄCZNIE poprawnym JSON: {"subj":"...","obj":"...","assess":"...","icf":"...","proc":["..."],"plan":"..."}. Procedury dobieraj tylko z listy: Terapia manualna, Masaż tkanek głębokich, Suche igłowanie, Kinesiotaping, Ćwiczenia nadzorowane, Edukacja pacjenta. Puste pola jako "". Bez komentarzy poza JSON.',
                bigText);
            const json = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1));
            if (json.subj) $('doc-subj').value = json.subj;
            if (json.obj) $('doc-obj').value = json.obj;
            if (json.assess) $('doc-assess').value = json.assess;
            if (json.icf) $('doc-icf').value = json.icf;
            if (json.plan) $('doc-plan').value = json.plan;
            if (Array.isArray(json.proc)) document.querySelectorAll('#doc-proc input').forEach(c => {
                c.checked = json.proc.some(p => c.value.toLowerCase().includes(String(p).toLowerCase()) || String(p).toLowerCase().includes(c.value.toLowerCase()));
            });
            bigStatus.textContent = 'Karta wypełniona ✓ Sprawdź pola, dopisz dane pacjenta ręcznie i zapisz.';
        } catch (e) { bigStatus.textContent = 'Błąd AI: ' + e.message + ' — nagranie zostaje, przepisz ręcznie poniżej.'; }
    };

    // ---------- karty wizyt ----------
    const safeLoad = (k, fb) => { try { const v = JSON.parse(localStorage.getItem(k)); return v ?? fb; } catch (_) { return fb; } };
    const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    const docs = safeLoad('maciej_docs', []);
    const saveDocs = () => localStorage.setItem('maciej_docs', JSON.stringify(docs));
    const procSel = () => [...document.querySelectorAll('#doc-proc input:checked')].map(c => c.value);
    const fillVisitOptions = () => {
        const sel = $('doc-visit');
        sel.replaceChildren(new Option('— nowa / spoza listy —', ''));
        safeLoad('maciej_visits', [])
            .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 30)
            .forEach((v, i) => sel.append(new Option(`${v.date} ${v.time} — ${v.client} (${v.service})`, i)));
        sel.onchange = () => {
            const v = JSON.parse(localStorage.getItem('maciej_visits') || '[]')
                .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))[+sel.value];
            if (!v) return;
            $('doc-date').value = v.date; $('doc-patient').value = v.client;
        };
    };
    fillVisitOptions();
    $('doc-date').valueAsDate = new Date();

    const collect = () => ({
        id: Date.now(), date: $('doc-date').value, patient: $('doc-patient').value.trim() || '—',
        subj: $('doc-subj').value.trim(), obj: $('doc-obj').value.trim(),
        assess: $('doc-assess').value.trim(), icf: $('doc-icf').value.trim(),
        proc: procSel(), plan: $('doc-plan').value.trim(), sign: $('doc-sign').value.trim()
    });
    const docText = (d) =>
        `KARTA WIZYTY FIZJOTERAPEUTYCZNEJ (robocza, w duchu KIOF)\nData: ${d.date}\nPacjent (kod): ${d.patient}\n\nS — wywiad: ${d.subj || '—'}\nO — badanie: ${d.obj || '—'}\nA — rozpoznanie/problem: ${d.assess || '—'}\nFunkcjonowanie (ICF): ${d.icf || '—'}\nP — wykonano: ${d.proc.join('; ') || '—'}\nZalecenia i plan: ${d.plan || '—'}\n\nPodpis: ${d.sign}`;
    const renderDocs = () => {
        const box = $('doc-list');
        box.replaceChildren();
        if (!docs.length) { box.innerHTML = '<p class="empty">Brak zapisanych kart.</p>'; return; }
        [...docs].reverse().forEach((d) => {
            const row = document.createElement('div');
            row.className = 'visit-row';
            row.innerHTML = `<div><strong>${esc(d.date)}</strong> — ${esc(d.patient)}<small>${esc(d.assess || 'bez rozpoznania').slice(0, 80)}</small></div><span class="row-btns"><button data-a="load">Otwórz</button><button data-a="del" aria-label="Usuń">×</button></span>`;
            row.querySelector('[data-a=load]').onclick = () => {
                $('doc-date').value = d.date; $('doc-patient').value = d.patient;
                $('doc-subj').value = d.subj; $('doc-obj').value = d.obj;
                $('doc-assess').value = d.assess; $('doc-icf').value = d.icf;
                document.querySelectorAll('#doc-proc input').forEach(c => c.checked = d.proc.includes(c.value));
                $('doc-plan').value = d.plan; $('doc-sign').value = d.sign;
                msg('Wczytano kartę — sprawdź i zapisz jako nową wersję.');
            };
            row.querySelector('[data-a=del]').onclick = () => { docs.splice(docs.indexOf(d), 1); saveDocs(); renderDocs(); };
            box.append(row);
        });
    };
    renderDocs();

    $('doc-save').onclick = () => {
        const d = collect();
        if (!d.date || d.patient === '—') { msg('Uzupełnij datę i kod pacjenta.'); return; }
        docs.push(d); saveDocs(); renderDocs(); msg('Kartę zapisano ✓ (wpis roboczy — przenieś do systemu gabinetu).');
    };
    $('doc-print').onclick = () => {
        const w = window.open('', '_blank');
        w.document.write(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>Karta wizyty</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.65}pre{white-space:pre-wrap;font:inherit}</style></head><body><pre>${docText(collect()).replace(/</g, '&lt;')}</pre><script>onload=()=>print()<\/script></body></html>`);
        w.document.close();
    };
    const emailDoc = async () => {
        const to = $('doc-email').value.trim();
        if (!to || !to.includes('@')) { msg('Wpisz e-mail pacjenta.'); return; }
        const text = docText(collect());
        if (EMAIL_CONFIG.publicKey && typeof emailjs !== 'undefined') {
            try {
                emailjs.init({ publicKey: EMAIL_CONFIG.publicKey });
                await emailjs.send(EMAIL_CONFIG.serviceId, EMAIL_CONFIG.templateId, { to_email: to, patient: $('doc-patient').value, goal: 'Karta wizyty', plan_text: text });
                msg(`Wysłano na ${to} ✓`); return;
            } catch (_) { msg('Błąd EmailJS — otwieram program pocztowy.'); }
        }
        window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent('Karta wizyty — Maciej Liedel')}&body=${encodeURIComponent(text)}`;
    };
    $('doc-email-send').onclick = emailDoc;

    // ---------- akcje AI (TYLKO opis kliniczny — bez danych pacjenta) ----------
    const SYS = 'Jesteś asystentem doświadczonego fizjoterapeuty. Otrzymujesz WYŁĄCZNIE anonimowy opis kliniczny (bez danych osobowych). Piszesz zwięźle, profesjonalnym językiem medycznym po polsku. Nie stawiasz rozpoznań lekarskich; formułujesz problemy funkcjonalne. Bez wymyślania faktów spoza notatki.';
    const aiGuard = () => {
        if (!$('doc-ai-consent').checked) { msg('Zaznacz potwierdzenie, że notatka nie zawiera danych pacjenta.'); return false; }
        return true;
    };
    $('doc-ai-tidy').onclick = async () => {
        if (!aiGuard()) return;
        msg('AI porządkuje zapis...');
        try {
            const out = await aiAsk(SYS + ' Uporządkuj poniższą roboczą notatkę z wizyty w strukturę S-O-A-P z nagłówkami, popraw język na profesjonalny, zachowaj wszystkie fakty. Oznacz [?] miejsca niejasne.',
                `S: ${$('doc-subj').value}\nO: ${$('doc-obj').value}\nA: ${$('doc-assess').value}\nICF: ${$('doc-icf').value}\nP: ${procSel().join('; ')}\nPlan: ${$('doc-plan').value}`);
            const parts = out.split(/(?=^O\s*[-–:]|^A\s*[-–:]|^P\s*[-–:])/m);
            if (parts[0]) $('doc-subj').value = parts[0].replace(/^S\s*[-–:]/, '').trim();
            const get = (l) => { const m = out.match(new RegExp('^' + l + '\\s*[-–:]([\\s\\S]*?)(?=^[SOAP]\\s*[-–:]|$)', 'm')); return m ? m[1].trim() : ''; };
            const o = get('O'), a = get('A'), p = get('P');
            if (o) $('doc-obj').value = o;
            if (a) $('doc-assess').value = a;
            if (p) $('doc-plan').value = p;
            msg('Zapis uporządkowany — zweryfikuj przed zapisem ✓');
        } catch (e) { msg('Błąd AI: ' + e.message); }
    };
    $('doc-ai-patient').onclick = async () => {
        if (!aiGuard()) return;
        msg('AI pisze streszczenie...');
        try {
            const out = await aiAsk('Jesteś fizjoterapeutą. Napisz krótkie (max 8 zdań), ciepłe streszczenie wizyty dla pacjenta prostym językiem: co znaleziono, co zrobiono, co ma robić w domu. Bez żargonu, bez rozpoznań lekarskich.',
                `Problem: ${$('doc-assess').value}\nWykonano: ${procSel().join('; ')}\nZalecenia: ${$('doc-plan').value}`);
            $('doc-plan').value = ($('doc-plan').value ? $('doc-plan').value + '\n\n' : '') + '--- Dla pacjenta ---\n' + out;
            msg('Streszczenie dopisane do zaleceń ✓');
        } catch (e) { msg('Błąd AI: ' + e.message); }
    };
});
