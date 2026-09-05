import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_REGISTRY_STATS_LIVE_V1';

const enhancement = String.raw`<script id="lbp-registry-stats-live">
/* ${MARKER} */
(function(){
'use strict';
var last=null;
function norm(t){return String(t||'').replace(/\s+/g,' ').trim()}
function replaceStatLabels(stats){
  var nodes=Array.from(document.querySelectorAll('body *')).filter(function(el){return el&&el.children.length===0});
  nodes.forEach(function(el){
    var t=norm(el.textContent);
    if(!t||t.length>120)return;
    if(/^\d+\s+citizens?\b/i.test(t)) el.textContent=stats.citizens+' Citizens';
    else if(/^\d+\s+countries?\b/i.test(t)) el.textContent=stats.countries+' Countries';
    else if(/^citizens?\s*[:—-]\s*\d+$/i.test(t)) el.textContent='Citizens: '+stats.citizens;
    else if(/^countries?\s*[:—-]\s*\d+$/i.test(t)) el.textContent='Countries: '+stats.countries;
    else if(/^\d+\s*citizens?\s*[•|·]\s*\d+\s*countries?$/i.test(t)) el.textContent=stats.citizens+' Citizens • '+stats.countries+' Countries';
  });
  document.documentElement.setAttribute('data-lbp-registry-citizens',String(stats.citizens));
  document.documentElement.setAttribute('data-lbp-registry-countries',String(stats.countries));
}
async function load(){
  try{
    var r=await fetch('/api/registry-stats',{credentials:'same-origin',cache:'no-store',headers:{'accept':'application/json'}});
    if(!r.ok)return;
    var j=await r.json();
    if(!Number.isInteger(j.citizens)||j.citizens<0||!Number.isInteger(j.countries)||j.countries<0)return;
    last=j;replaceStatLabels(j);
  }catch(_){/* Preserve existing UI rather than inventing a fallback total. */}
}
function rerun(){if(last)replaceStatLabels(last)}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',load,{once:true});else load();
var queued=false;new MutationObserver(function(){if(!last||queued)return;queued=true;requestAnimationFrame(function(){queued=false;rerun()})}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;

if (!html.includes(MARKER)) {
  html = html.replace(/<\/body>/i, enhancement + '\n</body>');
  fs.writeFileSync(indexPath, html);
}

console.log('LBP_REGISTRY_STATS_LIVE_PATCH_OK');
