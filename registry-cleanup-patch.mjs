import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_REGISTRY_CLEANUP_V2';

const cleanup = String.raw`<script id="lbp-registry-cleanup">
/* ${MARKER} */
(function(){
'use strict';

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

/*
 * Deliberately NO citizen-card/row de-duplication here.
 * Two genuine citizens can have identical visible names/text. Any duplicate
 * decision belongs to the authoritative registry reconciliation and must use
 * stable identifiers such as user/account ID, normalized email, plot ID,
 * citizen number or certificate ID. Presentation code must not hide people.
 */
function cleanupRegistry(){
  removeLegacyProductionNotice();
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

/* Replace V1 if present so old build artifacts cannot keep unsafe DOM dedupe. */
html = html.replace(/<script id="lbp-registry-cleanup">[\s\S]*?<\/script>/i, cleanup.match(/<script[\s\S]*<\/script>/i)?.[0] || '');
if (!html.includes(MARKER)) {
  html = html.replace(/<\/body>/i, cleanup + '\n</body>');
}
fs.writeFileSync(indexPath, html);

console.log('LBP_REGISTRY_CLEANUP_OK — stable-ID reconciliation only');
