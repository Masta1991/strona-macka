document.addEventListener('DOMContentLoaded', () => {
    // 1. Theme Management
    const themeToggle = document.getElementById('theme-toggle');
    const htmlElement = document.documentElement;
    
    // Check saved theme or system preference
    const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    htmlElement.setAttribute('data-theme', savedTheme);

    themeToggle.addEventListener('click', () => {
        const currentTheme = htmlElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        htmlElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        // Add a nice ripple effect or transition state if needed
    });

    // 2. GSAP Animations
    gsap.registerPlugin(ScrollTrigger);

    // Hero Bento Entrance
    const bentoItems = document.querySelectorAll('.bento-item');
    gsap.to(bentoItems, {
        duration: 1.2,
        y: 0,
        opacity: 1,
        stagger: 0.15,
        ease: "power4.out",
        delay: 0.3
    });

    // Generic Reveal Animation for sections
    const reveals = document.querySelectorAll('.reveal');
    reveals.forEach(el => {
        gsap.to(el, {
            scrollTrigger: {
                trigger: el,
                start: "top 90%",
                toggleActions: "play none none none"
            },
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power2.out"
        });
    });

    // 3. AI Consultation Wizard Logic
    const startWizardBtn = document.getElementById('start-wizard');
    const toStep2Btn = document.getElementById('to-step-2');
    const bodyParts = document.querySelectorAll('.body-part');
    const partLabel = document.getElementById('selected-part-label');
    const aiInput = document.getElementById('ai-input');
    const fileInput = document.getElementById('medical-docs');
    const fileLabel = document.getElementById('file-label');
    const finalSubmit = document.getElementById('ai-final-submit');
    const responseDiv = document.getElementById('ai-response');

    // View Toggles
    const toggleFront = document.getElementById('toggle-front');
    const toggleBack = document.getElementById('toggle-back');
    const bodyFront = document.getElementById('body-front');
    const bodyBack = document.getElementById('body-back');

    if (toggleFront && toggleBack) {
        toggleFront.addEventListener('click', () => {
            toggleFront.classList.add('active');
            toggleBack.classList.remove('active');
            bodyFront.classList.remove('hidden');
            bodyBack.classList.add('hidden');
        });
        toggleBack.addEventListener('click', () => {
            toggleBack.classList.add('active');
            toggleFront.classList.remove('active');
            bodyBack.classList.remove('hidden');
            bodyFront.classList.add('hidden');
        });
    }

    if (startWizardBtn) {
        startWizardBtn.addEventListener('click', () => {
            document.getElementById('wizard-step-0').classList.add('hidden');
            document.getElementById('wizard-step-1').classList.remove('hidden');
        });
    }

    bodyParts.forEach(part => {
        part.addEventListener('click', () => {
            bodyParts.forEach(p => p.classList.remove('active'));
            part.classList.add('active');
            
            const areaName = part.getAttribute('data-name');
            partLabel.textContent = `Wybrano: ${areaName}`;
            toStep2Btn.classList.remove('hidden');
            
            aiInput.value = `Obszar bólu: ${areaName}.\n\nDodatkowe informacje:\n- Rodzaj bólu (kłujący, tępy, piekący): \n- Skala (1-10): \n- Co nasila ból: `;
        });
    });

    if (toStep2Btn) {
        toStep2Btn.addEventListener('click', () => {
            document.getElementById('wizard-step-1').classList.add('hidden');
            document.getElementById('wizard-step-2').classList.remove('hidden');
        });
    }

    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const count = e.target.files.length;
            fileLabel.textContent = `📎 Załączono ${count} plik(ów)`;
        });
    }

    if (finalSubmit) {
        finalSubmit.addEventListener('click', () => {
            const selectedPart = partLabel.textContent.replace('Wybrano: ', '');
            const userNotes = aiInput.value.toLowerCase();
            
            finalSubmit.textContent = "Twój asystent analizuje zgłoszenie...";
            finalSubmit.disabled = true;

            // BAZA WIEDZY ASYSTENTA (Zgodna z System Promptem)
            const aiKnowledge = {
                'Kolano': {
                    class: "Przeciążenie aparatu więzadłowego lub stawowego kolana.",
                    exercises: "Delikatne izometryczne napinanie mięśnia czworogłowego (w siadzie prostym), powolne prostowanie nogi w odciążeniu.",
                    tests: "USG stawu kolanowego lub RTG (jeśli był uraz mechaniczny).",
                    warnings: "Unikaj głębokich przysiadów, klękania oraz gwałtownych skrętów nogi do czasu konsultacji."
                },
                'Kręgosłup': {
                    class: "Zespoły bólowe o charakterze przeciążeniowym lub dyskopatycznym.",
                    exercises: "Pozycja embrionalna (leżenie boku z podciągniętymi nogami), delikatne kołysanie miednicą w leżeniu tyłem.",
                    tests: "Rezonans Magnetyczny (MRI) - złoty standard przy podejrzeniu ucisku na nerwy.",
                    warnings: "Unikaj skłonów w przód z prostymi nogami, dźwigania ciężarów oraz długotrwałego siedzenia bez podparcia."
                },
                'Bark': {
                    class: "Napięcia w obrębie stożka rotatorów lub konfliktu podbarkowego.",
                    exercises: "Ćwiczenia wahadłowe Codmana (luźne zwisanie ramienia w opadzie), delikatne rozciąganie klatki piersiowej przy futrynie.",
                    tests: "USG barku (wykrywa stany zapalne tkanek miękkich).",
                    warnings: "Unikaj spania na bolesnym boku oraz podnoszenia rąk powyżej linii barków."
                }
                // Domyślne wartości dla pozostałych
            };

            // Wybór odpowiedniej wiedzy
            let result = aiKnowledge[Object.keys(aiKnowledge).find(key => selectedPart.includes(key))] || {
                class: "Ogólne napięcie mięśniowo-powięziowe w wybranym obszarze.",
                exercises: "Delikatne krążenia i rozciąganie statyczne (do pierwszego uczucia oporu, nigdy przez ból).",
                tests: "Podstawowa konsultacja fizjoterapeutyczna z badaniem palpacyjnym.",
                warnings: "Unikaj czynności, które wywołują ostry, kłujący ból."
            };

            setTimeout(() => {
                const step2 = document.getElementById('wizard-step-2');
                if(step2) step2.classList.add('hidden');
                
                if(responseDiv) {
                    responseDiv.classList.remove('hidden');
                    responseDiv.style.display = "block";
                    responseDiv.style.opacity = "1";
                    
                    const intro = `Rozumiem, że ten ból w obszarze ${selectedPart.toLowerCase()} może być uciążliwy. Przygotowałem brief, który pomoże Maciejowi w diagnozie.`;
                    
                    responseDiv.innerHTML = `
                        <div class="ai-result" style="opacity: 1 !important;">
                            <h3>Brief dla Fizjoterapeuty</h3>
                            <p class="ai-intro">${intro}</p>
                            
                            <div class="ai-rec-box">
                                <h4>🧠 Wstępna klasyfikacja:</h4>
                                <p>${result.class}</p>
                            </div>
    
                            <div class="ai-rec-box">
                                <h4>📍 Rekomendowane badania:</h4>
                                <p>Przed wizytą warto rozważyć: <strong>${result.tests}</strong>.</p>
                            </div>
    
                            <div class="ai-rec-box">
                                <h4>🧘 Sugestie i ćwiczenia:</h4>
                                <p>${result.exercises}</p>
                            </div>
    
                            <div class="ai-rec-box danger">
                                <h4>⚠️ Krytyczne przeciwskazania:</h4>
                                <p>${result.warnings}</p>
                            </div>
    
                            <p class="ai-disclaimer">To są jedynie sugestie. Pamiętaj, aby skonsultować się z fizjoterapeutą bądź lekarzem.</p>
                            
                            <div style="text-align:center; margin-top: 2rem;">
                                <a href="https://booksy.com/pl-pl/320195_fizjoterapia-maciej-liedel_fizjoterapia_3_warszawa?do=invite#ba_s=dl_1" target="_blank" class="btn-primary">Umów wizytę u Macieja</a>
                            </div>
                        </div>
                    `;
                    gsap.from(".ai-result", { y: 20, opacity: 0, duration: 0.8 });
                }
            }, 1500);
        });
    }

    // 4. Smooth Scrolling
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                window.scrollTo({
                    top: target.offsetTop - 80,
                    behavior: 'smooth'
                });
            }
        });
    });
});
