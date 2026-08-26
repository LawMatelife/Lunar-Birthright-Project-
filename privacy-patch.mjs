import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');

if (!fs.existsSync(indexPath)) {
  throw new Error('frontend/build/index.html missing; privacy patch cannot be applied safely');
}

let html = fs.readFileSync(indexPath, 'utf8');

const marker = 'LBP_AUTH_PRIVACY_PATCH_V3';
if (html.includes(marker)) {
  console.log('LBP_AUTH_PRIVACY_PATCH_ALREADY_PRESENT');
  process.exit(0);
}

const script = String.raw`<script id="lbp-auth-privacy-patch">
/* LBP_AUTH_PRIVACY_PATCH_V3
 * Free-claim registration privacy guard.
 * - New/public visitors see blank personal-information fields in Claim Your Free 1/4 Acre.
 * - Removes legacy Daniel founder/demo identity values from claim/auth browser state.
 * - Neutralises hard-coded/initial React values and late browser autofill before user interaction.
 * - Never wipes a field after the visitor has personally typed/selected into it.
 * - Leaves the Original Founding Citizen sample certificate and founder references untouched.
 */
(function () {
  'use strict';

  var MIGRATION_KEY = 'lbp_auth_privacy_migration_v3';
  var AUTH_KEY = /(auth|user|login|session|account|profile|identity)/i;
  var CLAIM_STATE_KEY = /(claim|register|registration|form|draft|citizen|profile|identity)/i;
  var DANIEL_ANYWHERE = /daniel\s+(allan\s+)?(?:heslip|heslop|hyslop|heslet)/i;
  var CLAIM_TEXT = /(claim\s+(?:your\s+)?(?:free\s+)?(?:¼|1\s*\/\s*4|quarter)[-\s]*acre|claim\s+your\s+free|free\s+(?:¼|1\s*\/\s*4|quarter)[-\s]*acre)/i;
  var touched = new WeakSet();
  var initialGuardUntil = Date.now() + 5000;

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

  function clearLegacyDemoState(storage) {
    safeEntries(storage).forEach(function (pair) {
      var key = pair[0];
      var value = pair[1];
      if ((AUTH_KEY.test(key) || CLAIM_STATE_KEY.test(key)) && DANIEL_ANYWHERE.test(value)) {
        try { storage.removeItem(key); } catch (_) {}
      }
    });
  }

  try {
    if (localStorage.getItem(MIGRATION_KEY) !== 'done') {
      clearLegacyDemoState(localStorage);
      clearLegacyDemoState(sessionStorage);
      localStorage.setItem(MIGRATION_KEY, 'done');
    }
  } catch (_) {
    try { clearLegacyDemoState(sessionStorage); } catch (_) {}
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
    var stores = [];
    try { stores.push(localStorage); } catch (_) {}
    try { stores.push(sessionStorage); } catch (_) {}
    stores.forEach(function (storage) {
      safeEntries(storage).forEach(function (pair) {
        if (AUTH_KEY.test(pair[0])) {
          try { storage.removeItem(pair[0]); } catch (_) {}
        }
      });
    });
  }

  function elementText(node) {
    try { return (node && node.textContent ? node.textContent : '').replace(/\s+/g, ' ').trim(); }
    catch (_) { return ''; }
  }

  function claimContainerFor(field) {
    var node = field;
    var best = null;
    for (var depth = 0; node && depth < 8; depth++, node = node.parentElement) {
      if (node.tagName === 'FORM') best = node;
      if (CLAIM_TEXT.test(elementText(node))) return node;
    }
    if (best && CLAIM_TEXT.test(elementText(best))) return best;
    return null;
  }

  function isEditableClaimField(field) {
    if (!field || !field.tagName || touched.has(field)) return false;
    if (!claimContainerFor(field)) return false;
    var tag = field.tagName.toUpperCase();
    if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
    if (tag !== 'INPUT') return false;
    var type = (field.getAttribute('type') || 'text').toLowerCase();
    return !/^(hidden|submit|button|reset|image|file)$/i.test(type);
  }

  function setNativeValue(field, value) {
    try {
      var proto = field.tagName === 'TEXTAREA'
        ? HTMLTextAreaElement.prototype
        : field.tagName === 'SELECT'
          ? HTMLSelectElement.prototype
          : HTMLInputElement.prototype;
      var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');
      if (descriptor && descriptor.set) descriptor.set.call(field, value);
      else field.value = value;
    } catch (_) {
      try { field.value = value; } catch (_) {}
    }
  }

  function blankField(field) {
    if (!isEditableClaimField(field)) return;

    var tag = field.tagName.toUpperCase();
    var type = (field.getAttribute('type') || '').toLowerCase();

    try {
      field.setAttribute('autocomplete', 'off');
      field.setAttribute('autocapitalize', field.getAttribute('autocapitalize') || 'none');
    } catch (_) {}

    if (tag === 'INPUT' && (type === 'checkbox' || type === 'radio')) {
      if (field.checked) {
        try { field.checked = false; } catch (_) {}
        try { field.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
      }
      return;
    }

    var current = '';
    try { current = String(field.value == null ? '' : field.value); } catch (_) {}
    var hasValueAttribute = false;
    try { hasValueAttribute = field.hasAttribute('value') && field.getAttribute('value') !== ''; } catch (_) {}

    if (current !== '' || hasValueAttribute) {
      setNativeValue(field, '');
      try { field.removeAttribute('value'); } catch (_) {}
      if (tag === 'SELECT') {
        try { field.selectedIndex = -1; } catch (_) {}
      }
      try { field.dispatchEvent(new Event('input', { bubbles: true })); } catch (_) {}
      try { field.dispatchEvent(new Event('change', { bubbles: true })); } catch (_) {}
    }
  }

  function blankUntouchedClaimFields() {
    if (Date.now() > initialGuardUntil) return;
    var fields = document.querySelectorAll('input, textarea, select');
    for (var i = 0; i < fields.length; i++) blankField(fields[i]);
  }

  function markTouched(event) {
    if (!event || !event.isTrusted) return;
    var field = event.target;
    if (!field || !field.tagName) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(field.tagName.toUpperCase()) && claimContainerFor(field)) {
      touched.add(field);
    }
  }

  document.addEventListener('beforeinput', markTouched, true);
  document.addEventListener('input', markTouched, true);
  document.addEventListener('change', markTouched, true);
  document.addEventListener('keydown', markTouched, true);
  document.addEventListener('pointerdown', function (event) {
    var field = event && event.target;
    if (field && field.tagName && /^(SELECT|INPUT)$/.test(field.tagName.toUpperCase()) && claimContainerFor(field)) {
      if ((field.getAttribute('type') || '').toLowerCase() === 'checkbox' ||
          (field.getAttribute('type') || '').toLowerCase() === 'radio' ||
          field.tagName.toUpperCase() === 'SELECT') {
        touched.add(field);
      }
    }
  }, true);

  function hardenClaimAutocomplete() {
    var fields = document.querySelectorAll('input, textarea, select');
    for (var i = 0; i < fields.length; i++) {
      var field = fields[i];
      if (!claimContainerFor(field)) continue;
      try { field.setAttribute('autocomplete', 'off'); } catch (_) {}
      var form = null;
      try { form = field.closest('form'); } catch (_) {}
      if (form) {
        try { form.setAttribute('autocomplete', 'off'); } catch (_) {}
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
    hardenClaimAutocomplete();
    blankUntouchedClaimFields();
    ensureFallbackLogout();
  }

  function runInitialPasses() {
    runPrivacyGuards();
    [50, 150, 350, 750, 1500, 3000, 4800].forEach(function (delay) {
      setTimeout(runPrivacyGuards, delay);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runInitialPasses, { once: true });
  } else {
    runInitialPasses();
  }

  var queued = false;
  var observer = new MutationObserver(function () {
    if (queued || Date.now() > initialGuardUntil) return;
    queued = true;
    setTimeout(function () {
      queued = false;
      runPrivacyGuards();
    }, 0);
  });

  function startObserver() {
    if (document.body) observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['value', 'autocomplete'] });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  else startObserver();
})();
</script>`;

if (!html.includes('</head>')) {
  throw new Error('index.html has no </head>; refusing unsafe privacy injection');
}

html = html.replace('</head>', `${script}\n</head>`);
fs.writeFileSync(indexPath, html);
console.log('LBP_AUTH_PRIVACY_PATCH_OK');
