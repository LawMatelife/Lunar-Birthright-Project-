/*
 * Lunar Birthright post-handoff claim-state recovery exporter.
 * READ-ONLY: this script does not set, remove, or clear browser storage.
 *
 * Run only while visiting the exact Lunar Birthright origin that received the
 * post-27-August claims. It scans localStorage and sessionStorage for values
 * likely to contain claim/citizen/registration data, recursively redacts
 * secret-like fields, and downloads a JSON evidence file for reconciliation.
 */
(() => {
  'use strict';

  const VERSION = '1.0.0';
  const CLAIM_KEY = /(claim|register|registration|form|draft|citizen|profile|identity|plot|certificate|lunar|birth.?moon)/i;
  const CLAIM_VALUE = /(email|birth.?date|citizen|claim|plot|certificate|lunar_(?:lat|lon|sector)|lunar\s+(?:lat|lon|sector)|birth.?moon)/i;
  const SECRET_KEY = /(password|passwd|secret|token|jwt|stripe|api.?key|authorization|bearer|cookie|session.?token|refresh.?token|access.?token)/i;
  const ALLOWED_STABLE_KEY = /^(id|user_id|userId|account_id|accountId|owner_id|ownerId|plot_id|plotId|certificate_id|certificateId|citizen_number|citizenNumber|session_id|sessionId)$/i;

  function redact(value, depth = 0) {
    if (depth > 12) return '[MAX_DEPTH]';
    if (Array.isArray(value)) return value.map(v => redact(v, depth + 1));
    if (!value || typeof value !== 'object') return value;
    const out = {};
    for (const [key, val] of Object.entries(value)) {
      if (SECRET_KEY.test(key) && !ALLOWED_STABLE_KEY.test(key)) out[key] = '[REDACTED]';
      else out[key] = redact(val, depth + 1);
    }
    return out;
  }

  function parseMaybe(raw) {
    if (typeof raw !== 'string') return raw;
    const trimmed = raw.trim();
    if (!trimmed) return raw;
    try { return JSON.parse(trimmed); } catch (_) { return raw; }
  }

  function safeEntries(storage) {
    const out = [];
    try {
      for (let i = 0; i < storage.length; i++) {
        const key = storage.key(i);
        if (!key) continue;
        const raw = storage.getItem(key);
        const parsed = parseMaybe(raw);
        const serialized = typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
        if (!CLAIM_KEY.test(key) && !CLAIM_VALUE.test(serialized || '')) continue;
        if (SECRET_KEY.test(key) && !CLAIM_KEY.test(key)) continue;
        out.push({ key, value: redact(parsed) });
      }
    } catch (error) {
      out.push({ error: String(error && error.message || error) });
    }
    return out;
  }

  const evidence = {
    kind: 'lunar_birthright_browser_claim_recovery',
    version: VERSION,
    exported_at: new Date().toISOString(),
    origin: location.origin,
    href: location.href,
    user_agent: navigator.userAgent,
    storage: {
      localStorage: safeEntries(localStorage),
      sessionStorage: safeEntries(sessionStorage),
    },
  };

  const json = JSON.stringify(evidence, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  a.href = url;
  a.download = `lunar-browser-claim-recovery-${stamp}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);

  console.info('LUNAR_CLAIM_RECOVERY_EXPORT_OK', {
    localStorageMatches: evidence.storage.localStorage.length,
    sessionStorageMatches: evidence.storage.sessionStorage.length,
    file: a.download,
  });
})();
