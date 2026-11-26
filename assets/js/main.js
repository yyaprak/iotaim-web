(function () {
  const STORAGE_KEY = 'iotaim_lang';
  const translations = window.IOTAIM_TRANSLATIONS || {};

  function getNested(obj, path) {
    return path.split('.').reduce((acc, part) => (acc && acc[part] !== undefined ? acc[part] : null), obj);
  }

  function applyLanguage(lang) {
    const dict = translations[lang] || translations.tr;
    if (!dict) return;

    document.documentElement.lang = lang;
    document.documentElement.setAttribute('data-lang', lang);
    document.title = dict.metaTitle || document.title;

    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const value = getNested(dict, key);
      if (value !== null) {
        el.textContent = value;
      }
    });

    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const value = getNested(dict, key);
      if (value !== null) {
        el.setAttribute('placeholder', value);
      }
    });

    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      const isActive = btn.getAttribute('data-lang-btn') === lang;
      btn.classList.toggle('is-active', isActive);
      btn.setAttribute('aria-pressed', String(isActive));
    });

    try {
      localStorage.setItem(STORAGE_KEY, lang);
    } catch (_) {
      // Ignore storage errors in restricted environments
    }
  }

  function initLanguage() {
    let saved = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch (_) {
      saved = null;
    }

    const isEnPath = window.location.pathname.startsWith('/en');
    const browserLang = (navigator.language || 'tr').toLowerCase().startsWith('en') ? 'en' : 'tr';
    const initialLang = isEnPath ? 'en' : saved && translations[saved] ? saved : browserLang;
    applyLanguage(initialLang);

    document.querySelectorAll('[data-lang-btn]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const nextLang = btn.getAttribute('data-lang-btn');
        if (nextLang) applyLanguage(nextLang);
      });
    });
  }

  function initNavbar() {
    const navbar = document.getElementById('navbar');
    const toggle = document.getElementById('nav-toggle');
    const nav = document.getElementById('primary-nav');

    if (navbar) {
      const onScroll = () => {
        navbar.classList.toggle('is-scrolled', window.scrollY > 12);
      };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }

    if (toggle && nav) {
      toggle.addEventListener('click', () => {
        const isOpen = nav.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(isOpen));
      });

      nav.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => {
          nav.classList.remove('is-open');
          toggle.setAttribute('aria-expanded', 'false');
        });
      });
    }
  }

  function initReveal() {
    const items = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
      items.forEach((item) => item.classList.add('is-visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -30px 0px' }
    );

    items.forEach((item) => observer.observe(item));
  }

  function initContactForm() {
    const form = document.getElementById('contact-form');
    const feedback = document.getElementById('form-feedback');
    if (!form || !feedback) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      const lang = document.documentElement.getAttribute('data-lang') || 'tr';
      const dict = translations[lang] || translations.tr;

      const name = form.elements.name.value.trim();
      const email = form.elements.email.value.trim();
      const message = form.elements.message.value.trim();
      const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

      feedback.classList.remove('is-success', 'is-error');

      if (!name || !emailValid || !message) {
        feedback.textContent = dict.contact.formErrorRequired;
        feedback.classList.add('is-error');
        return;
      }

      feedback.textContent = dict.contact.formSuccess;
      feedback.classList.add('is-success');
      form.reset();
    });
  }

  document.addEventListener('DOMContentLoaded', () => {
    initLanguage();
    initNavbar();
    initReveal();
    initContactForm();
  });
})();
