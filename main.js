document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Management
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    htmlElement.setAttribute('data-theme', savedTheme);
    themeToggle.addEventListener('click', () => {
        const newTheme = htmlElement.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
    });

    // 2. GSAP Animations (graceful when CDN blocked)
    try {
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
    const show = (id) => { ['wizard-step-0', 'wizard-step-1', 'wizard-step-2', 'wizard-step-3'].forEach(s => document.getElementById(s)?.classList.add('hidden')); document.getElementById(id)?.classList.remove('hidden'); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };
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
            redAlert.innerHTML = `<strong>⚠ Pilne — nie ćwicz na własną rękę:</strong> ${checked.join('; ')}. Umów się pilnie (SOR / lekarz / gabinet: <a href="https://booksy.com/pl-pl/320195_fizjoterapia-maciej-liedel_fizjoterapia_3_warszawa?do=invite#ba_s=dl_1" target="_blank">Booksy</a>), a wywiad dokończ tylko jako notatkę dla terapeuty.`;
        } else redAlert.classList.add('hidden');
    });
    document.getElementById('to-step-2a').onclick = () => show('wizard-step-2');
    document.getElementById('to-step-1').onclick = () => show('wizard-step-1');

    // view toggles
    const tF = document.getElementById('toggle-front'), tB = document.getElementById('toggle-back');
    const bF = document.getElementById('body-front'), bB = document.getElementById('body-back');
    tF.onclick = () => { tF.classList.add('active'); tB.classList.remove('active'); bF.classList.remove('hidden'); bB.classList.add('hidden'); };
    tB.onclick = () => { tB.classList.add('active'); tF.classList.remove('active'); bB.classList.remove('hidden'); bF.classList.add('hidden'); };

    // map selection
    const parts = document.querySelectorAll('.body-part');
    const partLabel = document.getElementById('selected-part-label');
    const toStep2 = document.getElementById('to-step-2');
    const aiInput = document.getElementById('ai-input');
    let selectedArea = '';
    parts.forEach(p => p.onclick = () => {
        parts.forEach(x => x.classList.remove('active')); p.classList.add('active');
        selectedArea = p.dataset.name;
        partLabel.textContent = `Wybrano: ${selectedArea}`;
        toStep2.classList.remove('hidden');
        aiInput.value = `Obszar bólu: ${selectedArea}.\n\nCo nasila ból:\nCo pomaga:\nLeki / zabiegi do tej pory:`;
    });
    toStep2.onclick = () => show('wizard-step-3');
    document.getElementById('to-step-2-back').onclick = () => show('wizard-step-2');
    document.getElementById('vas').oninput = (e) => document.getElementById('vas-value').textContent = e.target.value;

    // file validation (local only)
    const fileInput = document.getElementById('medical-docs');
    const fileLabel = document.getElementById('file-label');
    let attachedNames = [];
    fileInput.onchange = () => {
        attachedNames = [];
        for (const f of fileInput.files) {
            if (f.size > 10 * 1024 * 1024) { fileLabel.textContent = `⚠ ${f.name} przekracza 10 MB — pominięto.`; continue; }
            attachedNames.push(`${f.name} (${(f.size / 1024).toFixed(0)} KB)`);
        }
        if (attachedNames.length) fileLabel.textContent = `📎 Załączono lokalnie ${attachedNames.length} plik(ów): ${attachedNames.join(', ')}`;
    };

    const KB = [
        { k: ['kolan'], class: "Przeciążenie / podrażnienie struktur stawu kolanowego (m.in. łąkotka, więzadła, rzepka).", ex: "Quad set 10×10 s, TKE z gumą 3×12, mostek 3×12; chodzenie tyłem 10 min (filmy w panelu fizjoterapeuty).", tests: "USG kolana; po urazie skrętnym RTG; przy blokowaniu / niestabilności — rezonans.", warn: "Unikaj głębokich przysiadów, klękania i pivotów do wizyty." },
        { k: ['lędźwia', 'krzyż', 'kręgosłup', 'grzbiet', 'th-l', 'potylica', 'szyj'], class: "Zespół bólowy kręgosłupa o charakterze przeciążeniowym lub dyskopatycznym.", ex: "Press-up McKenzie co 2–3 h (jeśli centralizuje ból), kot–wielbłąd 2×10, dead bug 3×8.", tests: "Rezonans (MRI) przy promieniowaniu poniżej kolana, drętwieniu lub braku poprawy po 2–4 tyg.", warn: "Unikaj skłonów z prostymi nogami, dźwigania i długiego siedzenia bez podparcia." },
        { k: ['bark', 'rami'], class: "Konflikt podbarkowy / przeciążenie stożka rotatorów.", ex: "Wahadełka Codmana 2×dziennie, scaption 3×10, rotacja zewnętrzna z gumą 3×12.", tests: "USG barku (ścięgna, kaletka).", warn: "Nie śpij na bolesnym boku; nie wyciskaj nad głowę przez ból." },
        { k: ['łokieć', 'przedramię', 'nadgarstek'], class: "Przeciążenie przyczepów (m.in. łokieć tenisisty/golfisty) lub pochewek ścięgnistych.", ex: "Ekscentryka prostowników z lekkim hantlem, rozciąganie zginaczy, przerwy w pracy myszką.", tests: "USG okolicy; przy drętwieniu palców — diagnostyka nerwu.", warn: "Unikaj powtarzalnych chwytów siłowych i pełnych pompek do wizyty." },
        { k: ['biodr', 'krzyżowo-biodrowy', 'miednica'], class: "Przeciążenie biodra / stawu krzyżowo-biodrowego lub konflikt panewkowo-udowy.", ex: "Mostek 3×12, odwodzenie z gumą, mobilność zginaczy bioder.", tests: "RTG/AP + USG; przy klikaniu z bólem — rezonans.", warn: "Unikaj głębokiego przysiadu i długiego siedzenia po turecku." },
        { k: ['udo', 'podudzie', 'łydka'], class: "Naciągnięcie mięśniowe lub przeciążenie powięziowe.", ex: "Spokojny marsz, ekscentryka łydki od niskiego stopnia, rolowanie 1–2 min.", tests: "USG mięśnia przy krwiaku / braku poprawy po 10 dniach.", warn: "Nie rozciągaj agresywnie świeżego naciągnięcia (48–72 h)." },
        { k: ['skokowy'], class: "Skręcenie stawu skokowego / niestabilność kostki.", ex: "Alfabet stopą 2×dziennie, wspięcia 3×12, balans na jednej nodze.", tests: "RTG przy braku obciążania (kryteria ottawskie); USG więzadeł.", warn: "Unikaj nierównego terenu i sportów zwrotnych do wizyty." },
        { k: ['głowa', 'żuchw', 'skroniowo'], class: "Dysfunkcja układu żucia (TMD) — m.in. bruksizm, dysk, napięcia żwaczy.", ex: "Rocabado 6×6, cofanie brody, higiena snu + miękka dieta (filmy w panelu fizjoterapeuty).", tests: "Konsultacja stomatologiczna + fizjoterapia stomatologiczna; MRI stawu tylko przy blokadach.", warn: "Nie otwieraj szeroko (jabłko, kanapki), unikaj gumy i zaciskania w dzień." }
    ];
    const matchKB = (area) => KB.find(e => e.k.some(k => area.toLowerCase().includes(k))) || {
        class: "Ogólne napięcie mięśniowo-powięziowe w wybranym obszarze.",
        ex: "Delikatna ruchomość bezbolesna, ciepło 15 min, spacer; szczegóły dobierze Maciej na wizycie.",
        tests: "Podstawowa konsultacja z badaniem palpacyjnym i testami funkcjonalnymi.",
        warn: "Unikaj ruchów wywołujących ostry, kłujący ból." };
    const briefBtn = document.getElementById('ai-final-submit');
    briefBtn.onclick = () => {
        const area = selectedArea || 'nie wybrano (opis poniżej)';
        const kb = matchKB(area);
        const types = [...document.querySelectorAll('#pain-types input:checked')].map(c => c.value).join(', ') || 'nie podano';
        const vas = document.getElementById('vas').value;
        const dur = document.getElementById('pain-duration').value;
        const onset = document.getElementById('pain-onset').value;
        const flags = [...document.querySelectorAll('#redflags input:checked')].map(c => c.value);
        const notes = aiInput.value.trim() || '—';
        briefBtn.textContent = 'Asystent przygotowuje brief...'; briefBtn.disabled = true;
        setTimeout(() => {
            document.getElementById('wizard-step-3').classList.add('hidden');
            const box = document.getElementById('ai-response');
            box.classList.remove('hidden'); box.style.display = 'block'; box.style.opacity = 1;
            const flagHtml = flags.length ? `<div class="ai-rec-box danger"><h4>🚨 Zgłoszone objawy alarmowe:</h4><p>${flags.join('; ')} — pacjent poinformowany o pilnej konsultacji.</p></div>` : '';
            box.innerHTML = `<div class="ai-result">
                <h3>Brief dla fizjoterapeuty — gotowy do przekazania</h3>
                <dl class="brief-grid">
                    <div><dt>Obszar</dt><dd>${area}</dd></div>
                    <div><dt>Rodzaj bólu</dt><dd>${types}</dd></div>
                    <div><dt>Nasilenie (VAS)</dt><dd>${vas}/10</dd></div>
                    <div><dt>Czas trwania</dt><dd>${dur}</dd></div>
                    <div><dt>Początek</dt><dd>${onset}</dd></div>
                    <div><dt>Załączniki (lokalnie)</dt><dd>${attachedNames.length ? attachedNames.join(', ') : 'brak'}</dd></div>
                </dl>
                <p class="ai-notes"><strong>Opis pacjenta:</strong> ${notes.replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p>
                ${flagHtml}
                <div class="ai-rec-box"><h4>🧠 Wstępna klasyfikacja:</h4><p>${kb.class}</p></div>
                <div class="ai-rec-box"><h4>📍 Sugerowana diagnostyka:</h4><p>${kb.tests}</p></div>
                <div class="ai-rec-box"><h4>🧘 Bezpieczne pierwsze kroki:</h4><p>${kb.ex}</p></div>
                <div class="ai-rec-box danger"><h4>⚠️ Czego unikać do wizyty:</h4><p>${kb.warn}</p></div>
                <p class="ai-disclaimer">To materiał poglądowy, nie diagnoza. Ostateczną ocenę stawia fizjoterapeuta / lekarz po badaniu.</p>
                <div class="brief-actions">
                    <button id="brief-copy" class="btn-secondary">Kopiuj brief</button>
                    <button id="brief-print" class="btn-secondary">Drukuj / PDF</button>
                    <button id="brief-restart" class="btn-link">Wypełnij ponownie</button>
                    <a href="https://booksy.com/pl-pl/320195_fizjoterapia-maciej-liedel_fizjoterapia_3_warszawa?do=invite#ba_s=dl_1" target="_blank" class="btn-primary">Umów wizytę u Macieja</a>
                </div></div>`;
            const txt = `BRIEF DLA FIZJOTERAPEUTY (Maciej Liedel)\nObszar: ${area}\nRodzaj bólu: ${types}\nVAS: ${vas}/10\nCzas: ${dur}\nPoczątek: ${onset}\nZałączniki: ${attachedNames.join(', ') || 'brak'}\nOpis: ${aiInput.value}\nKlasyfikacja wstępna: ${kb.class}\nDiagnostyka: ${kb.tests}\nPierwsze kroki: ${kb.ex}\nUnikać: ${kb.warn}${flags.length ? `\nALARMOWE: ${flags.join('; ')}` : ''}`;
            document.getElementById('brief-copy').onclick = async (e) => { try { await navigator.clipboard.writeText(txt); e.target.textContent = 'Skopiowano ✓'; } catch (_) {} };
            document.getElementById('brief-print').onclick = () => openPrint('Brief dla fizjoterapeuty', `<pre>${txt.replace(/</g, '&lt;')}</pre>`);
            document.getElementById('brief-restart').onclick = () => {
                box.classList.add('hidden'); box.replaceChildren();
                parts.forEach(x => x.classList.remove('active'));
                selectedArea = ''; partLabel.textContent = 'Wybierz obszar na modelu...';
                toStep2.classList.add('hidden'); show('wizard-step-0');
            };
            briefBtn.textContent = 'Generuj brief (krok 4)'; briefBtn.disabled = false;
        }, 900);
    };

    // 6. Smooth scrolling
    document.querySelectorAll('a[href^="#"]').forEach(a => a.addEventListener('click', (e) => {
        const t = document.querySelector(a.getAttribute('href'));
        if (t) { e.preventDefault(); window.scrollTo({ top: t.offsetTop - 80, behavior: 'smooth' }); }
    }));
});
