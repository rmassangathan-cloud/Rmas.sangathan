document.addEventListener('DOMContentLoaded', function () {
    // Hamburger Menu
    const hamburger = document.querySelector('.hamburger');
    const navBar = document.querySelector('.nav-bar');
    if (hamburger) {
        hamburger.addEventListener('click', function () {
            navBar.classList.toggle('active');
        });
    }

    // --- Officials Slider ---
    let officialsData = [];
    const officialsSlider = document.querySelector('.officials-slider');

    async function initializeOfficialsSlider() {
        if (!officialsSlider) return;

        try {
            const response = await fetch('/css/officials.json');
            if (!response.ok) throw new Error('Failed to load officials data');
            officialsData = await response.json();
            
            const currentLang = localStorage.getItem('language') || 'en';
            renderOfficials(currentLang);
            setupSliderControls();
        } catch (error) {
            console.error('Error initializing officials slider:', error);
            if (officialsSlider) {
                officialsSlider.innerHTML = '<p>Could not load officials at this time.</p>';
            }
        }
    }

    function renderOfficials(lang) {
        if (!officialsSlider || officialsData.length === 0) return;

        officialsSlider.innerHTML = officialsData.map(official => `
            <div class="official-card">
                <div class="official-image"><img src="${official.image}" alt="${official.name[lang]}"></div>
                <div class="official-info">
                    <h3 class="official-name">${official.name[lang]}</h3>
                    <p class="official-designation">${official.designation[lang]}</p>
                </div>
            </div>
        `).join('');
    }

    function setupSliderControls() {
        const sliderContainer = document.querySelector('.officials-slider-container');
        if (!sliderContainer) return;

        const prevBtn = sliderContainer.querySelector('.prev-btn');
        const nextBtn = sliderContainer.querySelector('.next-btn');

        nextBtn.addEventListener('click', () => officialsSlider.scrollBy({ left: 320, behavior: 'smooth' }));
        prevBtn.addEventListener('click', () => officialsSlider.scrollBy({ left: -320, behavior: 'smooth' }));
    }

    // --- Multilingual Support ---
    const languageSelector = document.getElementById('language-selector');
    let translations = {};
    let joinUsData = {};
    let donateData = {};

    // Function to fetch translations and update the page
    async function setLanguage(lang) {
        // Fetch translations if not already loaded
        if (Object.keys(translations).length === 0) {
            try {
                const response = await fetch('/translations.json');
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                translations = await response.json();
            } catch (error) {
                console.error("Could not load translations:", error);
                return;
            }
        }

        // Update all elements with a data-key
        document.querySelectorAll('[data-key]').forEach(element => {
            const key = element.getAttribute('data-key');
            const translation = translations[lang]?.[key];
            if (translation) {
                const attr = element.getAttribute('data-attr');
                if (attr) {
                    // Update a specific attribute, e.g., placeholder or alt
                    element.setAttribute(attr, translation);
                } else {
                    // Update text content
                    element.textContent = translation;
                }
            }
        });

        // Re-render officials with the new language
        if (officialsData.length > 0) {
            renderOfficials(lang);
        }

        // Re-render Join Us content
        if (Object.keys(joinUsData).length > 0) {
            renderJoinUsContent(joinUsData, lang);
        }

        // Re-render Donate content
        if (Object.keys(donateData).length > 0) {
            updateDonateContent(donateData, lang);
        }

        // Set the HTML lang attribute for accessibility
        document.documentElement.lang = lang;
        // Store selected language in localStorage
        localStorage.setItem('language', lang);

        // Handle text direction for RTL languages
        if (lang === 'ur') {
            document.body.classList.add('rtl');
        } else {
            document.body.classList.remove('rtl');
        }
    }

    // Event listener for the language selector
    if (languageSelector) {
        languageSelector.addEventListener('change', function () {
            setLanguage(this.value);
        });
    }

    // Testimonial Slider
    const slides = document.querySelectorAll('.testimonial-slider .slide');
    let currentSlide = 0;

    function showSlide(index) {
        slides.forEach((slide, i) => {
            slide.classList.remove('active');
            if (i === index) {
                slide.classList.add('active');
            }
        });
    }

    function nextSlide() {
        currentSlide = (currentSlide + 1) % slides.length;
        showSlide(currentSlide);
    }

    if (slides.length > 0) {
        setInterval(nextSlide, 5000); // Change slide every 5 seconds
    }

    // On page load, check for a stored language or default to 'en'
    const savedLanguage = localStorage.getItem('language') || 'en';
    if (languageSelector) {
        languageSelector.value = savedLanguage;
    }
    setLanguage(savedLanguage);

    // --- Join Us Page ---
    async function initializeJoinUsPage() {
        const joinUsContainer = document.getElementById('join-us-container');
        if (!joinUsContainer) return;

        try {
            const response = await fetch('/css/join-us.json');
            if (!response.ok) throw new Error('Failed to load join-us data');
            joinUsData = await response.json();
            
            const currentLang = localStorage.getItem('language') || 'en';
            renderJoinUsContent(joinUsData, currentLang);
        } catch (error) {
            console.error('Error initializing Join Us page:', error);
            if (joinUsContainer) {
                joinUsContainer.innerHTML = '<p>Could not load content at this time.</p>';
            }
        }
    }

    function renderJoinUsContent(data, lang) {
        const joinUsContainer = document.getElementById('join-us-container');
        if (!joinUsContainer) return;

        const content = data[lang];
        if (!content) return; // Guard against missing language

        joinUsContainer.className = 'join-us-page'; // Add the main class

        joinUsContainer.innerHTML = `
            <div class="container">
                <div class="join-us-intro">
                    <h1>${content.title}</h1>
                    <p>${content.intro}</p>
                </div>

                <section class="why-join-section">
                    <h2>${content.whyJoin.title}</h2>
                    <div class="grid-container">
                        ${content.whyJoin.points.map(point => `
                            <div class="why-join-card">
                                <h3>${point.title}</h3>
                                <p>${point.description}</p>
                            </div>
                        `).join('')}
                    </div>
                </section>

                <section class="how-involved-section">
                    <h2>${content.howInvolved.title}</h2>
                    ${content.howInvolved.methods.map(method => `
                        <div class="method">
                            <h3>${method.title}</h3>
                            <p>${method.description.replace(/\n/g, '<br>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>
                        </div>
                    `).join('')}
                </section>

                <section class="your-impact-section">
                    <h2>${content.impact.title}</h2>
                    <p>${content.impact.description}</p>
                    <ul>
                        ${content.impact.points.map(point => `<li>${point}</li>`).join('')}
                    </ul>
                </section>

                <section class="cta-section">
                    <h2>${content.cta.title}</h2>
                    <p>${content.cta.text}</p>
                    <p>${content.cta.contact}</p>
                </section>
            </div>
        `;
    }

    // --- Donate Page ---
    async function initializeDonatePage() {
        const donateContainer = document.getElementById('donate-container');
        if (!donateContainer) return;

        try {
            const response = await fetch('/css/donate.json');
            if (!response.ok) throw new Error('Failed to load donate data');
            donateData = await response.json();
            
            const currentLang = localStorage.getItem('language') || 'en';
            updateDonateContent(donateData, currentLang);
        } catch (error) {
            console.error('Error initializing Donate page:', error);
        }
    }

    function updateDonateContent(data, lang) {
        const content = data[lang];
        if (!content) return;

        for (const key in content) {
            const element = document.querySelector(`#donate-container [data-key="${key}"]`);
            if (element) {
                element.textContent = content[key];
            }
        }
    }

    // Initialize dynamic components
    initializeOfficialsSlider();
    initializeJoinUsPage();
    initializeDonatePage();
});
