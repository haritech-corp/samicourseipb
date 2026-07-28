(function() {
  'use strict';

  const LANGUAGES = [
    { code: 'en', name: 'English', flag: 'us' },
    { code: 'id', name: 'Bahasa Indonesia', flag: 'id' },
    { code: 'ms', name: 'Bahasa Melayu', flag: 'my' },
    { code: 'zh', name: '中文', flag: 'cn' },
    { code: 'ja', name: '日本語', flag: 'jp' },
    { code: 'ko', name: '한국어', flag: 'kr' },
    { code: 'th', name: 'ไทย', flag: 'th' },
    { code: 'vi', name: 'Tiếng Việt', flag: 'vn' },
    { code: 'ar', name: 'العربية', flag: 'sa' },
    { code: 'fr', name: 'Français', flag: 'fr' },
    { code: 'es', name: 'Español', flag: 'es' },
    { code: 'pt', name: 'Português', flag: 'pt' },
    { code: 'de', name: 'Deutsch', flag: 'de' },
    { code: 'ru', name: 'Русский', flag: 'ru' },
    { code: 'hi', name: 'हिन्दी', flag: 'in' },
    { code: 'bn', name: 'বাংলা', flag: 'bd' },
    { code: 'tl', name: 'Filipino', flag: 'ph' },
    { code: 'my', name: 'မြန်မာ', flag: 'mm' },
    { code: 'km', name: 'ខ្មែរ', flag: 'kh' },
    { code: 'lo', name: 'ລາວ', flag: 'la' }
  ];

  const STORAGE_KEY = 'sami-language';
  const DEFAULT_LANG = 'en';

  let translations = {};
  let currentLang = DEFAULT_LANG;
  let onLanguageChangeCallbacks = [];

  function detectLanguage() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some(l => l.code === saved)) {
      return saved;
    }
    const browserLang = navigator.language.split('-')[0].toLowerCase();
    const matched = LANGUAGES.find(l => l.code === browserLang);
    if (matched) return matched.code;
    return DEFAULT_LANG;
  }

  function getFlagClass(code) {
    const lang = LANGUAGES.find(l => l.code === code);
    return lang ? 'fi fi-' + lang.flag : 'fi fi-us';
  }

  async function loadTranslations(lang) {
    try {
      const response = await fetch('/lang/' + lang + '.json');
      if (!response.ok) throw new Error('Failed to load');
      return await response.json();
    } catch (e) {
      console.warn('Failed to load ' + lang + ', falling back to ' + DEFAULT_LANG);
      if (lang !== DEFAULT_LANG) {
        return loadTranslations(DEFAULT_LANG);
      }
      return {};
    }
  }

  function setTranslations(data) {
    translations = data || {};
  }

  function t(key, params) {
    const keys = key.split('.');
    let value = translations;
    for (const k of keys) {
      if (value && typeof value === 'object' && k in value) {
        value = value[k];
      } else {
        return key;
      }
    }
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, (_, p) => params[p] || '');
    }
    return typeof value === 'string' ? value : key;
  }

  function translateElement(el) {
    const key = el.getAttribute('data-i18n');
    if (!key) return;
    const translation = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      const placeholderKey = el.getAttribute('data-i18n-placeholder');
      if (placeholderKey) {
        el.placeholder = t(placeholderKey);
      }
      if (!placeholderKey && el.placeholder) {
        el.placeholder = translation;
      }
      if (el.value && !el.value.includes('{{')) {
        el.value = translation;
      }
    } else if (el.tagName === 'OPTION') {
      el.textContent = translation;
    } else {
      el.innerHTML = translation;
    }
  }

  function applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(translateElement);
    document.documentElement.lang = currentLang;
    document.title = t('siteTitle') || document.title;
  }

  function updateLanguageSwitcher() {
    const select = document.getElementById('langSwitcher');
    const flag = document.getElementById('langFlag');
    if (select) {
      select.value = currentLang;
    }
    if (flag) {
      flag.className = getFlagClass(currentLang);
    }
  }

  async function switchLanguage(lang) {
    if (!LANGUAGES.some(l => l.code === lang)) return;
    if (lang === currentLang) return;

    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);

    const newTranslations = await loadTranslations(lang);
    setTranslations(newTranslations);

    applyTranslations();
    updateLanguageSwitcher();

    onLanguageChangeCallbacks.forEach(cb => cb(lang));

    const event = new CustomEvent('languageChanged', { detail: { lang: currentLang } });
    document.dispatchEvent(event);
  }

  function onLanguageChange(callback) {
    onLanguageChangeCallbacks.push(callback);
  }

  function initLanguageSwitcher() {
    const select = document.getElementById('langSwitcher');
    if (select) {
      select.addEventListener('change', function() {
        switchLanguage(this.value);
      });
    }
  }

  async function init() {
    currentLang = detectLanguage();
    const data = await loadTranslations(currentLang);
    setTranslations(data);
    applyTranslations();
    updateLanguageSwitcher();
    initLanguageSwitcher();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.i18n = {
    t: t,
    currentLang: () => currentLang,
    switchLanguage: switchLanguage,
    onLanguageChange: onLanguageChange,
    languages: LANGUAGES,
    getFlagClass: getFlagClass,
    applyTranslations: applyTranslations
  };
})();