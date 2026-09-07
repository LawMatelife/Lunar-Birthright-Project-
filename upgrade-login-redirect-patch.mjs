import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_UPGRADE_LOGIN_REDIRECT_V1';

// The public Upgrade CTA intentionally enters /login?redirect=/upgrade.
// The checksum-verified V4 LoginPage predates redirect-query support and always
// navigates to /dashboard after successful authentication. Preserve only the
// known /upgrade intent here; do not accept arbitrary redirect destinations.
const script = String.raw`<script id="lbp-upgrade-login-redirect">
/* ${MARKER} */
(function(){
  'use strict';
  var KEY='lbp_post_login_redirect';
  var ALLOWED='/upgrade';
  var redirecting=false;

  function cachedUser(){
    try { return !!window.localStorage.getItem('user'); }
    catch (_) { return false; }
  }

  function requestedUpgrade(){
    if (window.location.pathname !== '/login') return false;
    try { return new URLSearchParams(window.location.search).get('redirect') === ALLOWED; }
    catch (_) { return false; }
  }

  function readPending(){
    try { return window.sessionStorage.getItem(KEY); }
    catch (_) { return null; }
  }

  function writePending(value){
    try {
      if (value) window.sessionStorage.setItem(KEY, value);
      else window.sessionStorage.removeItem(KEY);
    } catch (_) {}
  }

  function goUpgrade(){
    if (redirecting) return;
    redirecting=true;
    writePending(null);
    window.location.replace(ALLOWED);
  }

  function reconcile(){
    if (requestedUpgrade()) {
      writePending(ALLOWED);
      // Returning citizens with a still-valid cached session should not be
      // forced through the login form just to reach the upgrade page.
      if (cachedUser()) return goUpgrade();
      return;
    }

    // V4 LoginPage currently routes every successful login to /dashboard.
    // When that navigation follows an explicit upgrade login, restore the
    // original intent immediately. No other destination is permitted.
    if (window.location.pathname === '/dashboard' && readPending() === ALLOWED && cachedUser()) {
      return goUpgrade();
    }
  }

  function wrapHistory(name){
    var original=window.history && window.history[name];
    if (typeof original !== 'function') return;
    window.history[name]=function(){
      var result=original.apply(this, arguments);
      Promise.resolve().then(reconcile);
      return result;
    };
  }

  wrapHistory('pushState');
  wrapHistory('replaceState');
  window.addEventListener('popstate', reconcile);
  window.addEventListener('pageshow', reconcile);

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', reconcile, {once:true});
  else reconcile();

  // React route rendering mutates the root after history navigation. This is
  // a fallback for router implementations that do not call the wrapped methods.
  var root=document.getElementById('root') || document.documentElement;
  new MutationObserver(reconcile).observe(root, {subtree:true, childList:true});
})();
</script>`;

html = html.replace(/<script id="lbp-upgrade-login-redirect">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<\/body>/i, script + '\n</body>');

if (!html.includes(MARKER)) throw new Error('Upgrade login redirect patch was not installed');
if (/get\(['"]redirect['"]\)\s*===\s*[^'"\s]*[^/]upgrade/i.test(script)) {
  throw new Error('Unsafe redirect handling detected');
}

fs.writeFileSync(indexPath, html);
console.log('LBP_UPGRADE_LOGIN_REDIRECT_OK');
