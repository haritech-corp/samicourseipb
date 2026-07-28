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
      'html{scroll-behavior:smooth}',
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
      '#sami-page-overlay{position:fixed;inset:0;z-index:9998;background:linear-gradient(135deg,var(--primary-darker,#5B9700),var(--primary,#5B9700));opacity:0;pointer-events:none;transition:opacity .3s ease;display:flex;align-items:center;justify-content:center}',
      '#sami-page-overlay.active{opacity:1;pointer-events:all}',
      '#sami-page-overlay .spinner{width:38px;height:38px;border:3px solid rgba(255,255,255,0.12);border-top-color:#fff;border-radius:50%;animation:samiSpin .6s linear infinite}',
      '#sami-page-overlay .spinner-text{color:rgba(255,255,255,.7);font-size:13px;margin-top:12px;font-family:"Inter",sans-serif}',
      '@keyframes samiSpin{to{transform:rotate(360deg)}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function showPageTransition() {
    injectOverlayCSS();
    if (!transitionOverlay) {
      transitionOverlay = document.createElement('div');
      transitionOverlay.id = 'sami-page-overlay';
      transitionOverlay.innerHTML = '<div style="text-align:center;"><div class="spinner"></div><div class="spinner-text">Loading...</div></div>';
      document.body.appendChild(transitionOverlay);
    }
    transitionOverlay.classList.add('active');
  }

  function clearPageTransition() {
    var overlay = document.getElementById('sami-page-overlay');
    if (overlay) overlay.classList.remove('active');
  }

  function setupPageTransition() {
    document.addEventListener('click', function(e) {
      var a = e.target.closest('a');
      if (!a) return;
      var href = a.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('javascript') || href.startsWith('http') || a.hasAttribute('download') || a.target === '_blank') return;
      e.preventDefault();
      showPageTransition();
      setTimeout(function() { window.location.href = href; }, 300);
    });
  }

  // ===== ENHANCED ANIMATIONS =====
  function injectAnimCSS() {
    if (document.getElementById('sami-anim-style')) return;
    var s = document.createElement('style');
    s.id = 'sami-anim-style';
    s.textContent = [
      '.sami-fade-in{opacity:0;transform:translateY(20px);transition:opacity .5s ease,transform .5s cubic-bezier(.34,1.56,.64,1)}',
      '.sami-fade-in.visible{opacity:1;transform:translateY(0)}',
      '.sami-fade-in-left{opacity:0;transform:translateX(-24px);transition:opacity .45s ease,transform .45s cubic-bezier(.34,1.56,.64,1)}',
      '.sami-fade-in-left.visible{opacity:1;transform:translateX(0)}',
      '.sami-fade-in-right{opacity:0;transform:translateX(24px);transition:opacity .45s ease,transform .45s cubic-bezier(.34,1.56,.64,1)}',
      '.sami-fade-in-right.visible{opacity:1;transform:translateX(0)}',
      '.sami-scale-in{opacity:0;transform:scale(.92);transition:opacity .4s ease,transform .4s cubic-bezier(.34,1.56,.64,1)}',
      '.sami-scale-in.visible{opacity:1;transform:scale(1)}',
      '.sami-bounce{animation:samiBounce .5s cubic-bezier(.34,1.56,.64,1)}',
      '@keyframes samiBounce{0%{opacity:0;transform:scale(.8)}50%{transform:scale(1.05)}100%{opacity:1;transform:scale(1)}}',
      '.sami-shake{animation:samiShake .4s ease}',
      '@keyframes samiShake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}',
      '.sami-highlight{animation:samiHighlight 1.2s ease}',
      '@keyframes samiHighlight{0%{background:rgba(246,141,35,.3)}100%{background:transparent}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function setupScrollReveal() {
    if (!window.IntersectionObserver) return;
    var els = document.querySelectorAll('.course-card, .panel, .resource-card, .speaker-card, .faq-item, .gallery-item, .session-mini, .menu-item, .hero, .tl-phase, .module-item');
    els.forEach(function(el) {
      if (el.classList.contains('sami-fade-in') || el.classList.contains('visible')) return;
      el.classList.add('sami-fade-in');
    });
    var observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });
    els.forEach(function(el) { observer.observe(el); });
  }

  // ===== ENHANCED ALERT =====
  function injectAlertCSS() {
    if (document.getElementById('sami-alert-style')) return;
    var s = document.createElement('style');
    s.id = 'sami-alert-style';
    s.textContent = [
      '#sami-alert-overlay{position:fixed;inset:0;z-index:9997;background:rgba(0,0,0,.5);backdrop-filter:blur(6px);display:none;align-items:center;justify-content:center;padding:20px;animation:samiFadeIn .25s ease}',
      '#sami-alert-overlay.open{display:flex}',
      '#sami-alert-box{background:#fff;border-radius:20px;max-width:400px;width:100%;padding:28px 24px 20px;box-shadow:0 24px 60px rgba(0,0,0,.25);text-align:center;animation:samiAlertIn .35s cubic-bezier(.34,1.56,.64,1)}',
      '@keyframes samiAlertIn{from{opacity:0;transform:scale(.85) translateY(20px)}to{opacity:1;transform:scale(1) translateY(0)}}',
      '@keyframes samiFadeIn{from{opacity:0}to{opacity:1}}',
      '#sami-alert-box .alert-icon{font-size:40px;display:block;margin-bottom:8px}',
      '#sami-alert-box .alert-title{font-family:"Fraunces",serif;font-size:18px;font-weight:700;color:var(--primary-darker,#1a1a2e);margin-bottom:6px}',
      '#sami-alert-box .alert-msg{font-size:14px;color:#666;line-height:1.5;margin-bottom:16px}',
      '#sami-alert-box .alert-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 28px;border-radius:50px;background:var(--primary,#5B9700);color:#fff;font-weight:600;font-size:14px;border:none;cursor:pointer;transition:all .2s}',
      '#sami-alert-box .alert-btn:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(91,151,0,.3)}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function showAlert(title, message, icon) {
    injectAlertCSS();
    var existing = document.getElementById('sami-alert-overlay');
    if (existing) existing.remove();
    var overlay = document.createElement('div');
    overlay.id = 'sami-alert-overlay';
    overlay.innerHTML = '<div id="sami-alert-box"><span class="alert-icon">' + (icon || 'ℹ️') + '</span><div class="alert-title">' + title + '</div><div class="alert-msg">' + message + '</div><button class="alert-btn" onclick="this.closest(\'#sami-alert-overlay\').remove()">OK</button></div>';
    document.body.appendChild(overlay);
    setTimeout(function() { overlay.classList.add('open'); }, 10);
    overlay.addEventListener('click', function(e) { if (e.target === overlay) overlay.remove(); });
  }

  // ===== FLOATING NOTES =====
  function injectNotesCSS() {
    if (document.getElementById('sami-notes-style')) return;
    var s = document.createElement('style');
    s.id = 'sami-notes-style';
    s.textContent = [
      '#sami-notes-btn{position:fixed;bottom:24px;right:24px;z-index:9995;width:52px;height:52px;border-radius:50%;background:linear-gradient(135deg,var(--primary,#5B9700),#3d7a00);color:#fff;border:none;box-shadow:0 6px 24px rgba(91,151,0,.35);cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:22px;transition:all .3s cubic-bezier(.34,1.56,.64,1)}',
      '#sami-notes-btn:hover{transform:scale(1.1) translateY(-3px);box-shadow:0 10px 32px rgba(91,151,0,.45)}',
      '#sami-notes-btn:active{transform:scale(.95)}',
      '#sami-notes-btn .note-badge{position:absolute;top:-4px;right:-4px;width:18px;height:18px;border-radius:50%;background:var(--accent,#F68D23);color:#fff;font-size:9px;font-weight:700;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 8px rgba(246,141,35,.4)}',
      '#sami-notes-panel{position:fixed;bottom:90px;right:24px;z-index:9994;width:340px;max-height:460px;background:rgba(255,255,255,.97);backdrop-filter:blur(20px);border-radius:18px;box-shadow:0 16px 48px rgba(0,0,0,.18);border:1px solid rgba(91,151,0,.12);display:none;flex-direction:column;overflow:hidden;animation:samiNotesIn .3s cubic-bezier(.34,1.56,.64,1)}',
      '#sami-notes-panel.open{display:flex}',
      '@keyframes samiNotesIn{from{opacity:0;transform:translateY(20px) scale(.95)}to{opacity:1;transform:translateY(0) scale(1)}}',
      '#sami-notes-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px 10px;border-bottom:1px solid var(--line,#EAFFC9);flex-shrink:0}',
      '#sami-notes-header .notes-title{font-family:"Fraunces",serif;font-size:15px;font-weight:700;color:var(--primary-darker,#1a1a2e);display:flex;align-items:center;gap:8px}',
      '#sami-notes-header .notes-title .ni{font-size:18px}',
      '#sami-notes-close{width:28px;height:28px;border-radius:50%;background:var(--bg,#F4F7F9);border:none;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:14px;color:var(--ink-soft,#666);transition:all .2s}',
      '#sami-notes-close:hover{background:#e0e0e0;color:var(--primary,#5B9700)}',
      '#sami-notes-textarea{flex:1;padding:12px 16px;border:none;resize:none;font-family:"Inter",sans-serif;font-size:13.5px;line-height:1.6;color:var(--ink,#333);background:transparent;min-height:160px;outline:none}',
      '#sami-notes-textarea::placeholder{color:var(--ink-faint,#aaa)}',
      '#sami-notes-footer{padding:8px 16px 12px;border-top:1px solid var(--line,#EAFFC9);display:flex;justify-content:space-between;align-items:center;flex-shrink:0}',
      '#sami-notes-footer .note-status{font-size:10.5px;color:var(--ink-faint,#aaa);font-family:"Inter",sans-serif}',
      '#sami-notes-footer .note-clear{font-size:10.5px;color:#d32f2f;cursor:pointer;background:none;border:none;font-family:"Inter",sans-serif;opacity:.6;transition:opacity .2s}',
      '#sami-notes-footer .note-clear:hover{opacity:1}',
      '@media(max-width:500px){#sami-notes-panel{width:calc(100vw - 32px);right:16px;bottom:84px}#sami-notes-btn{right:16px;bottom:18px}}'
    ].join('\n');
    document.head.appendChild(s);
  }

  function injectNotesHTML() {
    if (document.getElementById('sami-notes-btn')) return;
    var btn = document.createElement('button');
    btn.id = 'sami-notes-btn';
    btn.innerHTML = '📝<span class="note-badge" id="notesBadge">!</span>';
    btn.setAttribute('aria-label', 'Toggle notes');
    document.body.appendChild(btn);

    var panel = document.createElement('div');
    panel.id = 'sami-notes-panel';
    panel.innerHTML = '<div id="sami-notes-header"><div class="notes-title"><span class="ni">📝</span>My Notes</div><button id="sami-notes-close">✕</button></div><textarea id="sami-notes-textarea" placeholder="Take notes during courses..." spellcheck="true"></textarea><div id="sami-notes-footer"><span class="note-status">Auto-saved</span><button class="note-clear" id="notesClear">Clear</button></div>';
    document.body.appendChild(panel);

    var ta = document.getElementById('sami-notes-textarea');
    var saved = localStorage.getItem('sami-user-notes');
    if (saved) { ta.value = saved; document.getElementById('notesBadge').style.display = 'flex'; }

    ta.addEventListener('input', function() {
      localStorage.setItem('sami-user-notes', ta.value);
      document.getElementById('notesBadge').style.display = ta.value.trim() ? 'flex' : 'none';
    });

    document.getElementById('sami-notes-btn').addEventListener('click', function() {
      document.getElementById('sami-notes-panel').classList.toggle('open');
      if (document.getElementById('sami-notes-panel').classList.contains('open')) {
        document.getElementById('sami-notes-textarea').focus();
      }
    });

    document.getElementById('sami-notes-close').addEventListener('click', function() {
      document.getElementById('sami-notes-panel').classList.remove('open');
    });

    document.getElementById('notesClear').addEventListener('click', function() {
      if (confirm('Clear all notes?')) {
        document.getElementById('sami-notes-textarea').value = '';
        localStorage.setItem('sami-user-notes', '');
        document.getElementById('notesBadge').style.display = 'none';
        showToast('Notes cleared', 'info');
      }
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

  function initNotes() {
    injectNotesCSS();
    injectNotesHTML();
  }

  async function init() {
    clearPageTransition();
    injectGlobalStyles();
    injectAnimCSS();
    injectToastCSS();
    currentLang = detectLanguage();
    var data = await loadTranslations(currentLang);
    setTranslations(data);
    applyTranslations();
    updateLanguageSwitcher();
    initLanguageSwitcher();
    setupPageTransition();
    setTimeout(setupScrollReveal, 200);
    initNotes();
    if (readyPromiseResolve) { readyPromiseResolve(); readyPromiseResolve = null; }
  }

  window.addEventListener('pageshow', function(e) {
    clearPageTransition();
    if (e.persisted) {
      setTimeout(setupScrollReveal, 150);
    }
  });

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
    showToast: showToast,
    showAlert: showAlert
  };
})();
