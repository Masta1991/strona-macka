document.addEventListener('DOMContentLoaded', () => {
    const escapeText=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    // 1. Theme Management
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    let storedTheme;try{storedTheme=localStorage.getItem('theme');}catch{}
    const savedTheme = storedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    htmlElement.setAttribute('data-theme', savedTheme);
    themeToggle.addEventListener('click', () => {
        const newTheme = htmlElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        try{localStorage.setItem('theme', newTheme);}catch{}
    });

    // 2. GSAP Animations (graceful when CDN blocked)
    try {
        if(reducedMotion)throw new Error('Reduced motion');
        gsap.registerPlugin(ScrollTrigger);
        gsap.to(document.querySelectorAll('.bento-item'), { duration: 1.2, y: 0, opacity: 1, stagger: 0.15, ease: "power4.out", delay: 0.3 });
        document.querySelectorAll('.reveal').forEach(el => {
            gsap.to(el, { scrollTrigger: { trigger: el, start: "top 90%", toggleActions: "play none none none" }, opacity: 1, y: 0, duration: 1, ease: "power2.out" });
        });
    } catch (_) { document.querySelectorAll('.bento-item,.reveal').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; }); }

    // 3. Publications + curiosities
    const pubList = document.getElementById('pub-list');
    if (pubList && typeof PUBLICATIONS !== 'undefined') {
        PUBLICATIONS.forEach(p => {
            const a = document.createElement('article');
            a.className = 'pub-card reveal';
            a.innerHTML = `<div class="pub-meta"><span>${p.source}</span><span>${p.year}</span></div>
                <h3>${p.title}</h3><p>${p.summary}</p>
                <p class="pub-take">➡ ${p.takeaway}</p>
                <a class="pub-link" href="${p.url}" target="_blank" rel="noopener">Czytaj oryginał ↗</a>`;
            pubList.append(a);
        });
        const curio = document.getElementById('curio-list');
        if (curio && typeof CURIOSITIES !== 'undefined') CURIOSITIES.forEach(c => {
            const d = document.createElement('div');
            d.className = 'curio-card';
            d.innerHTML = `<h4>${c.title}</h4><p>${c.why}</p>`;
            curio.append(d);
        });
    }

    // 4. Wspólne: wydruk do nowego okna (brief). Baza i generator mieszkają w panelu (panel/panel.js).
    const openPrint = (title, bodyHtml) => {
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<!doctype html><html lang="pl"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:Arial,sans-serif;max-width:700px;margin:40px auto;padding:0 20px;line-height:1.6}h1{font-size:22px}pre{white-space:pre-wrap;font:inherit}a{color:#1a4b84}</style></head><body><h1>${title}</h1>${bodyHtml}<script>onload=()=>print()<\/script></body></html>`);
        w.document.close();
    };


    // 5. Wizard — rebuilt (consent → red flags → map → details → brief)
    const show = (id) => { ['wizard-step-0', 'wizard-step-1', 'wizard-step-2', 'wizard-step-3'].forEach(s => document.getElementById(s)?.classList.add('hidden')); document.getElementById(id)?.classList.remove('hidden'); const target=document.getElementById(id);const heading=target?.querySelector('h2,h3');if(heading){heading.tabIndex=-1;heading.focus({preventScroll:true});}target?.scrollIntoView({ behavior: reducedMotion?'instant':'smooth', block: 'start' }); };
    const consent = document.getElementById('rodo-consent');
    document.getElementById('start-wizard').onclick = () => {
        if (!consent.checked) { document.getElementById('consent-error').classList.remove('hidden'); return; }
        document.getElementById('consent-error').classList.add('hidden');
        const oldBox = document.getElementById('ai-response');
        oldBox.classList.add('hidden'); oldBox.replaceChildren();
        show('wizard-step-1');
    };
    const redAlert = document.getElementById('redflag-alert');
    document.querySelectorAll('#redflags input').forEach(cb => cb.onchange = () => {
        const checked = [...document.querySelectorAll('#redflags input:checked')].map(c => c.value);
        if (checked.length) {
            redAlert.classList.remove('hidden');
            redAlert.innerHTML = `<strong>Objawy wymagają oceny medycznej.</strong> ${checked.map(escapeText).join('; ')}. Przy nagłym zagrożeniu zdrowia lub życia, np. silnym bólu w klatce piersiowej, nasilonej duszności lub utracie przytomności, zadzwoń pod <a href="tel:112">112</a> albo <a href="tel:999">999</a>. Nie czekaj wtedy na wizytę fizjoterapeutyczną ani zakończenie formularza. Pozostałe zaznaczone objawy skonsultuj pilnie z lekarzem. <a href="https://pacjent.gov.pl/kiedy-wezwac-karetke" target="_blank" rel="noopener noreferrer">Informacje NFZ</a>.`;
        } else redAlert.classList.add('hidden');
    });
    document.getElementById('to-step-2a').onclick = () => show('wizard-step-2');
    document.getElementById('to-step-1').onclick = () => show('wizard-step-1');

    // view toggles
    const tF = document.getElementById('toggle-front'), tB = document.getElementById('toggle-back');
    const bF = document.getElementById('body-front'), bB = document.getElementById('body-back');
    tF.setAttribute('aria-pressed','true');tB.setAttribute('aria-pressed','false');
    tF.onclick = () => {tF.setAttribute('aria-pressed','true');tB.setAttribute('aria-pressed','false'); tF.classList.add('active'); tB.classList.remove('active'); bF.classList.remove('hidden'); bB.classList.add('hidden'); };
    tB.onclick = () => {tB.setAttribute('aria-pressed','true');tF.setAttribute('aria-pressed','false'); tB.classList.add('active'); tF.classList.remove('active'); bB.classList.remove('hidden'); bF.classList.add('hidden'); };

    // map selection
    const parts = document.querySelectorAll('.body-part');
    const partLabel = document.getElementById('selected-part-label');
    const toStep2 = document.getElementById('to-step-2');
    const aiInput = document.getElementById('ai-input');
    let selectedArea = '';
    parts.forEach(p => {p.setAttribute('role','button');p.setAttribute('tabindex','0');p.setAttribute('aria-label',p.dataset.name);p.setAttribute('aria-pressed','false');p.onkeydown=e=>{if(['Enter',' '].includes(e.key)){e.preventDefault();p.dispatchEvent(new MouseEvent('click',{bubbles:true}));}};});
    parts.forEach(p => p.onclick = () => {
        parts.forEach(x => {x.classList.remove('active');x.setAttribute('aria-pressed','false');}); p.classList.add('active');p.setAttribute('aria-pressed','true');
        selectedArea = p.dataset.name;
        partLabel.textContent = `Wybrano: ${selectedArea}`;
        toStep2.classList.remove('hidden');
        aiInput.value = `Obszar bólu: ${selectedArea}.\n\nCo nasila ból:\nCo pomaga:\nLeki / zabiegi do tej pory:`;
    });
    toStep2.onclick = () => show('wizard-step-3');
    document.getElementById('to-step-2-back').onclick = () => show('wizard-step-2');
    let painRated=false;
    document.getElementById('vas').oninput = (e) => {painRated=true;document.getElementById('vas-value').textContent = e.target.value;};

    // file validation (local only)
    const fileInput = document.getElementById('medical-docs');
    const fileLabel = document.getElementById('file-label');
    let attachedNames = [];
    fileInput.onchange = () => {
        attachedNames = [];fileLabel.textContent='Wskaż pliki do zabrania na wizytę (tylko lista nazw)';
        for (const f of fileInput.files) {
            if (f.size > 10 * 1024 * 1024) { fileLabel.textContent = `⚠ ${f.name} przekracza 10 MB — pominięto.`; continue; }
            attachedNames.push(`${f.name} (${(f.size / 1024).toFixed(0)} KB)`);
        }
        if (attachedNames.length) fileLabel.textContent = `📎 Wskazano (bez wysyłki) ${attachedNames.length} plik(ów): ${attachedNames.join(', ')}`;
    };

    const briefBtn = document.getElementById('ai-final-submit');
    briefBtn.onclick = () => {
        const area = selectedArea || 'nie wybrano (opis poniżej)';
        const types = [...document.querySelectorAll('#pain-types input:checked')].map(c => c.value).join(', ') || 'nie podano';
        const vas = painRated?document.getElementById('vas').value+'/10':'nie oceniono';
        const dur = document.getElementById('pain-duration').value;
        const onset = document.getElementById('pain-onset').value;
        const flags = [...document.querySelectorAll('#redflags input:checked')].map(c => c.value);
        const notes = aiInput.value.trim() || '—';
        briefBtn.textContent = 'Przygotowuję notatkę…'; briefBtn.disabled = true;
        setTimeout(() => {
            document.getElementById('wizard-step-3').classList.add('hidden');
            const box = document.getElementById('ai-response');
            box.classList.remove('hidden'); box.style.display = 'block'; box.style.opacity = 1;
            const flagHtml = flags.length ? `<div class="ai-rec-box danger"><h4>🚨 Zgłoszone objawy alarmowe:</h4><p>${flags.map(escapeText).join('; ')}. Formularz wyświetlił komunikat o potrzebie oceny medycznej; nie potwierdza kontaktu z lekarzem.</p></div>` : '';
            box.innerHTML = `<div class="ai-result">
                <h3>Twoja notatka dla fizjoterapeuty</h3>
                <dl class="brief-grid">
                    <div><dt>Obszar</dt><dd>${escapeText(area)}</dd></div>
                    <div><dt>Rodzaj bólu</dt><dd>${escapeText(types)}</dd></div>
                    <div><dt>Nasilenie (VAS)</dt><dd>${escapeText(vas)}</dd></div>
                    <div><dt>Czas trwania</dt><dd>${escapeText(dur)}</dd></div>
                    <div><dt>Początek</dt><dd>${escapeText(onset)}</dd></div>
                    <div><dt>Wskazane pliki (nieprzesłane)</dt><dd>${attachedNames.length ? attachedNames.map(escapeText).join(', ') : 'brak'}</dd></div>
                </dl>
                <p class="ai-notes"><strong>Opis pacjenta:</strong> ${escapeText(notes).replace(/\n/g, '<br>')}</p>
                ${flagHtml}
                <p class="ai-disclaimer">Notatka zawiera Twoje odpowiedzi. Formularz nie ustala rozpoznania, nie zleca badań ani nie dobiera ćwiczeń. Wskazane pliki nie zostały przesłane ani dołączone do wydruku.</p>
                <div class="brief-actions">
                    <button id="brief-copy" class="btn-secondary">Kopiuj brief</button>
                    <button id="brief-print" class="btn-secondary">Drukuj / PDF</button>
                    <button id="brief-restart" class="btn-link">Wypełnij ponownie</button>
                    <a href="https://booksy.com/pl-pl/320195_fizjoterapia-maciej-liedel_fizjoterapia_3_warszawa?do=invite#ba_s=dl_1" target="_blank" class="btn-primary">Umów wizytę u Macieja</a>
                </div></div>`;
            const resultHeading=box.querySelector('h3');resultHeading.tabIndex=-1;resultHeading.focus();
            const txt = `NOTATKA DLA FIZJOTERAPEUTY (Maciej Liedel)\nObszar: ${area}\nRodzaj bólu: ${types}\nNasilenie: ${vas}\nCzas: ${dur}\nPoczątek: ${onset}\nWskazane pliki (nieprzesłane): ${attachedNames.join(', ') || 'brak'}\nOpis: ${notes}${flags.length ? `\nZGŁOSZONE OBJAWY ALARMOWE: ${flags.join('; ')}` : ''}\nNotatka zawiera odpowiedzi pacjenta. Nie jest diagnozą ani planem leczenia.`;
            document.getElementById('brief-copy').onclick = async (e) => { try { await navigator.clipboard.writeText(txt); e.target.textContent = 'Skopiowano ✓'; } catch (_) { e.target.textContent='Schowek niedostępny — użyj Drukuj / PDF'; } };
            document.getElementById('brief-print').onclick = () => openPrint('Brief dla fizjoterapeuty', `<pre>${escapeText(txt)}</pre>`);
            document.getElementById('brief-restart').onclick = () => {
                box.classList.add('hidden'); box.replaceChildren();
                parts.forEach(x => {x.classList.remove('active');x.setAttribute('aria-pressed','false');});
                document.querySelectorAll('#redflags input,#pain-types input').forEach(x=>x.checked=false);redAlert.classList.add('hidden');aiInput.value='';fileInput.value='';attachedNames=[];fileLabel.textContent='Wskaż pliki do zabrania na wizytę (tylko lista nazw)';document.getElementById('vas').value='5';document.getElementById('vas-value').textContent='—';painRated=false;document.getElementById('pain-duration').selectedIndex=0;document.getElementById('pain-onset').selectedIndex=0;consent.checked=false;
                selectedArea = ''; partLabel.textContent = 'Wybierz obszar na modelu...';
                toStep2.classList.add('hidden'); show('wizard-step-0');
            };
            briefBtn.textContent = 'Przygotuj notatkę (krok 4)'; briefBtn.disabled = false;
        }, 0);
    };

    // 6. Smooth scrolling (offset = realna wysokość paska + zapas)
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
        const t = document.querySelector(a.getAttribute('href'));
        if (t) {
            e.preventDefault();
            const navH = document.querySelector('.navbar')?.offsetHeight || 80;
            window.scrollTo({ top: t.getBoundingClientRect().top + window.scrollY - navH - 12, behavior: reducedMotion?'instant':'smooth' });
        }
    }));
});
