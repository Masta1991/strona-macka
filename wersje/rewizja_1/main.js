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

    // 3. AI Consultation Logic (Mockup)
    const aiSubmit = document.getElementById('ai-submit');
    const aiInput = document.getElementById('ai-input');
    const aiResponse = document.getElementById('ai-response');

    if (aiSubmit) {
        aiSubmit.addEventListener('click', () => {
            const text = aiInput.value.trim();
            if (text.length < 10) {
                alert('Proszę opisz swój problem nieco dokładniej.');
                return;
            }

            aiSubmit.innerHTML = 'Analizowanie...';
            aiSubmit.disabled = true;

            // Simulate AI Processing
            setTimeout(() => {
                aiSubmit.innerHTML = 'Generuj Analizę';
                aiSubmit.disabled = false;
                
                aiResponse.classList.remove('hidden');
                aiResponse.innerHTML = `
                    <div class="ai-result">
                        <h3>Wstępna Analiza Systemowa</h3>
                        <p>Na podstawie Twojego opisu: <em>"${text.substring(0, 50)}..."</em></p>
                        <ul>
                            <li><strong>Obszar:</strong> Wykryto potencjalne napięcie w rejonie wspomnianym w opisie.</li>
                            <li><strong>Rekomendacja:</strong> Zalecana konsultacja manualna w celu dekompresji.</li>
                            <li><strong>Dokumentacja:</strong> Twoje załączniki zostaną przesłane bezpośrednio do Macieja.</li>
                        </ul>
                        <p class="ai-note">Pamiętaj: To nie jest diagnoza lekarska. Ostateczną ocenę wystawi mgr Maciej Liedel podczas wizyty.</p>
                    </div>
                `;
                
                gsap.from(aiResponse, { opacity: 0, y: 20, duration: 0.5 });
            }, 2000);
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
