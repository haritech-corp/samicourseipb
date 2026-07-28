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
  let readyPromiseResolve;
  const readyPromise = new Promise(resolve => { readyPromiseResolve = resolve; });

  // ===== GLOBAL UI STYLES =====
  function injectGlobalStyles() {
    if (document.getElementById('sami-global-style')) return;
    var s = document.createElement('style');
    s.id = 'sami-global-style';
    s.textContent = [
      'html{scroll-behavior:smooth;overflow-x:hidden}',
      'body{overflow-x:hidden}',
      '.btn:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(37,150,190,0.15)!important}',
      '.btn:active{transform:translateY(0);transition-duration:.05s}',
      '.course-card{transition:transform .35s cubic-bezier(.34,1.56,.64,1),box-shadow .35s ease,border-color .35s ease!important}',
      '.course-card:hover{transform:translateY(-8px)!important}',
      '.menu-item{transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease,border-color .3s ease!important}',
      '.menu-item:hover{transform:translateY(-4px)!important}',
      '.resource-card{transition:transform .3s cubic-bezier(.34,1.56,.64,1),box-shadow .3s ease,border-color .3s ease!important}',
      '.resource-card:hover{transform:translateY(-4px)!important}',
      'img{transition:transform .4s ease,filter .4s ease}',
      'img:hover{transform:scale(1.02)}',
      '@media(prefers-reduced-motion:reduce){*,:after,:before{animation-duration:.01ms!important;transition-duration:.01ms!important;scroll-behavior:auto}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  // ===== TOAST NOTIFICATION =====
  var toastTimer = null;
  function injectToastCSS() {
    if (document.getElementById('sami-toast-style')) return;
    var s = document.createElement('style');
    s.id = 'sami-toast-style';
    s.textContent = [
      '#sami-toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%) translateY(120px);z-index:9999;padding:14px 28px;border-radius:16px;font-family:"Inter",sans-serif;font-size:14px;font-weight:500;color:#fff;background:rgba(26,26,46,0.92);box-shadow:0 12px 40px rgba(0,0,0,0.3);opacity:0;transition:all .45s cubic-bezier(.34,1.56,.64,1);pointer-events:none;display:flex;align-items:center;gap:10px;backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,0.08);max-width:90vw;white-space:nowrap}',
      '#sami-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}',
      '#sami-toast .toast-icon{font-size:20px;flex-shrink:0}',
      '#sami-toast.toast-success{background:linear-gradient(135deg,rgba(26,107,26,0.95),rgba(45,138,45,0.95));border-color:rgba(255,255,255,0.15)}',
      '#sami-toast.toast-info{background:rgba(26,26,46,0.92);border-color:rgba(255,255,255,0.08)}',
      '#sami-toast.toast-warning{background:linear-gradient(135deg,rgba(180,120,20,0.95),rgba(220,160,30,0.95));border-color:rgba(255,255,255,0.15)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function showToast(message, type) {
    type = type || 'info';
    injectToastCSS();
    var el = document.getElementById('sami-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'sami-toast';
      document.body.appendChild(el);
    }
    el.className = 'toast-' + type;
    var icons = { success:'✓', info:'ℹ', warning:'⚠', error:'✕' };
    el.innerHTML = '<span class="toast-icon">' + (icons[type] || 'ℹ') + '</span>' + message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function() { el.classList.remove('show'); }, 2800);
  }

  // ===== PAGE TRANSITION OVERLAY =====
  var transitionOverlay = null;
  function injectOverlayCSS() {
    if (document.getElementById('sami-overlay-style')) return;
    var s = document.createElement('style');
    s.id = 'sami-overlay-style';
    s.textContent = [
      '#sami-page-overlay{position:fixed;inset:0;z-index:9998;background:linear-gradient(135deg,var(--primary-darker,#5B9700),var(--primary,#5B9700));opacity:0;pointer-events:none;transition:opacity .35s ease;display:flex;align-items:center;justify-content:center}',
      '#sami-page-overlay.active{opacity:1;pointer-events:all}',
      '#sami-page-overlay .spinner{width:38px;height:38px;border:3px solid rgba(255,255,255,0.12);border-top-color:#fff;border-radius:50%;animation:samiSpin .7s linear infinite}',
      '@keyframes samiSpin{to{transform:rotate(360deg)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function showPageTransition() {
    injectOverlayCSS();
    if (!transitionOverlay) {
      transitionOverlay = document.createElement('div');
      transitionOverlay.id = 'sami-page-overlay';
      transitionOverlay.innerHTML = '<div class="spinner"></div>';
      document.body.appendChild(transitionOverlay);
    }
    transitionOverlay.classList.add('active');
  }

  function setupPageTransition() {
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('http') || a.hasAttribute('download') || a.target === '_blank') return;
      e.preventDefault();
      showPageTransition();
      setTimeout(function() { window.location.href = href; }, 350);
    });
  }

  // ===== I18N CORE =====
  function detectLanguage() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved && LANGUAGES.some(function(l) { return l.code === saved; })) return saved;
    var browserLang = navigator.language.split('-')[0].toLowerCase();
    var matched = LANGUAGES.find(function(l) { return l.code === browserLang; });
    return matched ? matched.code : DEFAULT_LANG;
  }

  function getFlagClass(code) {
    var lang = LANGUAGES.find(function(l) { return l.code === code; });
    return lang ? 'fi fi-' + lang.flag : 'fi fi-us';
  }

  async function loadTranslations(lang) {
    try {
      var response = await fetch('/lang/' + lang + '.json');
      if (!response.ok) throw new Error('Failed to load');
      return await response.json();
    } catch (e) {
      console.warn('Failed to load ' + lang + ', falling back to ' + DEFAULT_LANG);
      if (lang !== DEFAULT_LANG) return loadTranslations(DEFAULT_LANG);
      return {};
    }
  }

  function setTranslations(data) { translations = data || {}; }

  function t(key, params) {
    var keys = key.split('.');
    var value = translations;
    for (var i = 0; i < keys.length; i++) {
      if (value && typeof value === 'object' && keys[i] in value) { value = value[keys[i]]; }
      else { return key; }
    }
    if (typeof value === 'string' && params) {
      return value.replace(/\{\{(\w+)\}\}/g, function(_, p) { return params[p] || ''; });
    }
    return typeof value === 'string' ? value : key;
  }

  function translateElement(el) {
    var key = el.getAttribute('data-i18n');
    if (!key) return;
    var translation = t(key);
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
      var ph = el.getAttribute('data-i18n-placeholder');
      if (ph) el.placeholder = t(ph);
      else if (el.placeholder) el.placeholder = translation;
      if (el.value && !el.value.includes('{{')) el.value = translation;
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
    var select = document.getElementById('langSwitcher');
    var flag = document.getElementById('langFlag');
    if (select) select.value = currentLang;
    if (flag) flag.className = getFlagClass(currentLang);
  }

  async function switchLanguage(lang) {
    if (!LANGUAGES.some(function(l) { return l.code === lang; })) return;
    if (lang === currentLang) return;
    currentLang = lang;
    localStorage.setItem(STORAGE_KEY, lang);
    var newTranslations = await loadTranslations(lang);
    setTranslations(newTranslations);
    applyTranslations();
    updateLanguageSwitcher();
    onLanguageChangeCallbacks.forEach(function(cb) { cb(lang); });
    var langName = LANGUAGES.find(function(l) { return l.code === lang; });
    showToast((langName ? langName.name : lang) + ' \u2713', 'success');
    var event = new CustomEvent('languageChanged', { detail: { lang: currentLang } });
    document.dispatchEvent(event);
    if (readyPromiseResolve) { readyPromiseResolve(); readyPromiseResolve = null; }
  }

  function onLanguageChange(callback) { onLanguageChangeCallbacks.push(callback); }

  function initLanguageSwitcher() {
    var select = document.getElementById('langSwitcher');
    if (select) {
      select.addEventListener('change', function() { switchLanguage(this.value); });
    }
  }

  async function init() {
    injectGlobalStyles();
    injectToastCSS();
    currentLang = detectLanguage();
    var data = await loadTranslations(currentLang);
    setTranslations(data);
    applyTranslations();
    updateLanguageSwitcher();
    initLanguageSwitcher();
    setupPageTransition();
    if (readyPromiseResolve) { readyPromiseResolve(); readyPromiseResolve = null; }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.i18n = {
    t: t,
    currentLang: function() { return currentLang; },
    switchLanguage: switchLanguage,
    onLanguageChange: onLanguageChange,
    languages: LANGUAGES,
    getFlagClass: getFlagClass,
    applyTranslations: applyTranslations,
    ready: readyPromise,
    showToast: showToast
  };
})();
