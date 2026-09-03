import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_REGISTRY_CLEANUP_V1';

const cleanup = String.raw`<script id="lbp-registry-cleanup">
/* ${MARKER} */
(function(){
'use strict';

function norm(value){
  return (value || '').replace(/\s+/g,' ').trim().toLowerCase();
}

function removeLegacyProductionNotice(){
  var patterns = [
    /names?\s+(?:are\s+)?waiting\s+(?:to\s+come\s+)?from\s+production/i,
    /waiting\s+(?:on|for)\s+.*production/i,
    /(?:users?|citizens?|names?)\s+(?:are\s+)?(?:being\s+)?(?:migrated|transferred|moved|changed\s+over)\s+from\s+(?:the\s+)?(?:old\s+)?(?:development|production)/i,
    /(?:production|old\s+development)\s+(?:migration|transfer)\s+(?:is\s+)?(?:pending|waiting|in\s+progress)/i,
    /(?:records?|names?|citizens?)\s+(?:still\s+)?(?:pending|waiting)\s+(?:from|in)\s+production/i
  ];

  Array.from(document.querySelectorAll('body *')).forEach(function(el){
    if (!el || el.id === 'lbp-registry-cleanup') return;
    if (el.children && el.children.length > 0) return;
    var text = (el.textContent || '').replace(/\s+/g,' ').trim();
    if (!text || text.length > 500) return;
    if (!patterns.some(function(re){ return re.test(text); })) return;

    var block = el.closest('section,article,aside,footer,div,p,li') || el;
    var blockText = (block.textContent || '').replace(/\s+/g,' ').trim();
    if (blockText.length <= 900) block.remove();
    else el.remove();
  });
}

function dedupeExactCitizenEntries(){
  var selectors = [
    'tr',
    'article',
    'li',
    '[class*="citizen" i]',
    '[class*="registry" i]',
    '[class*="claimant" i]',
    '[class*="member" i]',
    '[class*="user-card" i]'
  ];
  var nodes = Array.from(document.querySelectorAll(selectors.join(',')));
  var seen = new Set();

  nodes.forEach(function(el){
    if (!el || !el.isConnected) return;
    var text = norm(el.textContent);
    if (text.length < 4 || text.length > 700) return;

    var className = norm(typeof el.className === 'string' ? el.className : '');
    var citizenLike = /citizen|registry|claimant|lunar\s+citizen|certificate\s*(?:id|no)|country|claim/.test(text + ' ' + className);
    if (!citizenLike) return;

    var key = el.tagName.toLowerCase() + '|' + text;
    if (seen.has(key)) {
      el.remove();
      return;
    }
    seen.add(key);
  });
}

function cleanupRegistry(){
  removeLegacyProductionNotice();
  dedupeExactCitizenEntries();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', cleanupRegistry, {once:true});
} else {
  cleanupRegistry();
}

var queued = false;
new MutationObserver(function(){
  if (queued) return;
  queued = true;
  requestAnimationFrame(function(){
    queued = false;
    cleanupRegistry();
  });
}).observe(document.documentElement, {subtree:true, childList:true});
})();
</script>`;

if (!html.includes(MARKER)) {
  html = html.replace(/<\/body>/i, cleanup + '\n</body>');
  fs.writeFileSync(indexPath, html);
}

console.log('LBP_REGISTRY_CLEANUP_OK');
