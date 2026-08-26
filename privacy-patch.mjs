import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('frontend/build/index.html missing; privacy patch cannot be applied safely');
}

let html = fs.readFileSync(indexPath, 'utf8');

const marker = 'LBP_AUTH_PRIVACY_PATCH_V2';
if (html.includes(marker)) {
  console.log('LBP_AUTH_PRIVACY_PATCH_ALREADY_PRESENT');
  process.exit(0);
}

const script = String.raw`<script id="lbp-auth-privacy-patch">
/* LBP_AUTH_PRIVACY_PATCH_V2
 * Privacy migration for legacy/demo browser state.
 * - New visitors remain anonymous unless they authenticate themselves.
 * - Removes legacy Daniel founder/demo identity values from auth and claim-form browser state.
 * - Clears any legacy Daniel founder/demo name that appears pre-filled in a public claim field.
 * - Leaves the public founding certificate/sample founder references untouched.
 * - Adds a fallback Log out control only when an authenticated-looking browser state exists
 *   and the app itself does not already expose a logout/sign-out control.
 */
(function () {
  'use strict';
  var MIGRATION_KEY = 'lbp_auth_privacy_migration_v2';
  var AUTH_KEY = /(auth|user|login|session|account|profile|identity)/i;
  var IDENTITY_KEY = /(auth|user|login|session|account|profile|identity|claim|form|name|citizen|draft)/i;
  var DANIEL = /^\s*daniel\s+(allan\s+)?(?:heslip|heslop|hyslop|heslet)\s*$/i;
  var DANIEL_ANYWHERE = /daniel\s+(allan\s+)?(?:heslip|heslop|hyslop|heslet)/i;

  function safeEntries(storage) {
    var out = [];
    try {
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        if (!key) continue;
        out.push([key, storage.getItem(key) || '']);
      }
    } catch (_) {}
    return out;
  }

  function clearLegacyDanielState(storage) {
    safeEntries(storage).forEach(function (pair) {
      var key = pair[0];
      var value = pair[1];
      if (IDENTITY_KEY.test(key) && DANIEL_ANYWHERE.test(value)) {
        try { storage.removeItem(key); } catch (_) {}
      }
    });
  }

  try {
    if (localStorage.getItem(MIGRATION_KEY) !== 'done') {
      clearLegacyDanielState(localStorage);
      clearLegacyDanielState(sessionStorage);
      localStorage.setItem(MIGRATION_KEY, 'done');
    }
  } catch (_) {
    clearLegacyDanielState(sessionStorage);
  }

  function hasAuthState() {
    var stores = [];
    try { stores.push(localStorage); } catch (_) {}
    try { stores.push(sessionStorage); } catch (_) {}
    return stores.some(function (storage) {
      return safeEntries(storage).some(function (pair) {
        return AUTH_KEY.test(pair[0]) && !!pair[1] && pair[1] !== 'null' && pair[1] !== 'undefined';
      });
    });
  }

  function hasVisibleLogout() {
    var nodes = document.querySelectorAll('button,a,[role="button"]');
    for (var i = 0; i < nodes.length; i++) {
      var text = (nodes[i].textContent || '').trim();
      if (/^(log\s*out|logout|sign\s*out)$/i.test(text)) return true;
    }
    return false;
  }

  function clearAuthLikeState() {
    [localStorage, sessionStorage].forEach(function (storage) {
      safeEntries(storage).forEach(function (pair) {
        if (AUTH_KEY.test(pair[0])) {
          try { storage.removeItem(pair[0]); } catch (_) {}
        }
      });
    });
  }

  function clearLegacyPrefill() {
    var fields = document.querySelectorAll('input, textarea');
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      var type = (field.getAttribute('type') || 'text').toLowerCase();
      if (type === 'hidden' || type === 'submit' || type === 'button' || type === 'checkbox' || type === 'radio') continue;
      var value = (field.value || '').trim();
      if (!DANIEL.test(value)) continue;
      try {
        var nativeSetter = Object.getOwnPropertyDescriptor(
          field.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype,
          'value'
        );
        if (nativeSetter && nativeSetter.set) nativeSetter.set.call(field, '');
        else field.value = '';
        field.removeAttribute('value');
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
      } catch (_) {
        try { field.value = ''; } catch (_) {}
      }
    }
  }

  function ensureFallbackLogout() {
    if (!document.body || !hasAuthState() || hasVisibleLogout() || document.getElementById('lbp-fallback-logout')) return;
    var button = document.createElement('button');
    button.id = 'lbp-fallback-logout';
    button.type = 'button';
    button.textContent = 'Log out';
    button.setAttribute('aria-label', 'Log out of Lunar Birthright');
    button.style.cssText = 'position:fixed;right:16px;top:16px;z-index:2147483647;padding:9px 14px;border:1px solid rgba(220,190,110,.7);border-radius:999px;background:rgba(8,8,12,.92);color:#f3df9a;font:600 14px system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;cursor:pointer;box-shadow:0 4px 18px rgba(0,0,0,.35)';
    button.addEventListener('click', function () {
      clearAuthLikeState();
      try {
        document.cookie.split(';').forEach(function (cookie) {
          var name = cookie.split('=')[0].trim();
          if (AUTH_KEY.test(name)) {
            document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
          }
        });
      } catch (_) {}
      location.replace('/');
    });
    document.body.appendChild(button);
  }

  function runPrivacyGuards() {
    clearLegacyPrefill();
    ensureFallbackLogout();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runPrivacyGuards, { once: true });
  } else {
    runPrivacyGuards();
  }

  var queued = false;
  var observer = new MutationObserver(function () {
    if (queued) return;
    queued = true;
    setTimeout(function () {
      queued = false;
      runPrivacyGuards();
    }, 0);
  });
  document.addEventListener('DOMContentLoaded', function () {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true });
  }, { once: true });
})();
</script>`;

if (!html.includes('</head>')) {
  throw new Error('index.html has no </head>; refusing unsafe privacy injection');
}

html = html.replace('</head>', `${script}\n</head>`);
fs.writeFileSync(indexPath, html);
console.log('LBP_AUTH_PRIVACY_PATCH_OK');
