import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_PRODUCTION_GIFT_PATH_V2';
const DISCLAIMER = 'Symbolic commemorative registry only—no legal ownership of lunar land is conveyed.';
const GIFT_PATH = '/gift';
const UPGRADE_PATH = '/login?redirect=/upgrade';

const enhancement = String.raw`<style id="lbp-production-gift-style">
.lbp-pathways{display:flex;gap:14px;justify-content:center;align-items:stretch;flex-wrap:wrap;margin:20px auto 12px;max-width:820px}.lbp-pathways a,.lbp-pathways button,.lbp-free-path,.lbp-premium-path{min-height:52px;padding:14px 22px;border-radius:999px;font:800 16px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;cursor:pointer}.lbp-free-path{background:#f5f5f5!important;color:#080808!important;border:1px solid #f5f5f5!important}.lbp-premium-path{background:linear-gradient(135deg,#090909,#1b170c)!important;color:#f0c967!important;border:1px solid #d4af37!important;box-shadow:0 10px 28px rgba(212,175,55,.14)}.lbp-production-subhead{max-width:760px;margin:10px auto 18px;text-align:center;color:#e8ddbf;font-size:clamp(16px,2.2vw,21px);line-height:1.5}.lbp-mandatory-disclaimer{max-width:820px;margin:14px auto;padding:12px 16px;border:1px solid rgba(212,175,55,.55);border-radius:12px;background:#0a0a0a;color:#f2d57b;text-align:center;font:700 13px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lbp-premium-certificate{background:linear-gradient(135deg,#000 0%,#1a1a1a 100%);border:2px solid #d4af37;color:#d4af37}.lbp-token-hidden{display:none!important}@media(max-width:640px){.lbp-pathways{flex-direction:column;padding:0 14px}.lbp-pathways a,.lbp-pathways button{width:100%;box-sizing:border-box}}
</style>
<script id="lbp-production-gift-script">
/* ${MARKER} */
(function(){
'use strict';
var DISCLAIMER=${JSON.stringify(DISCLAIMER)};
var GIFT_PATH=${JSON.stringify(GIFT_PATH)};
var UPGRADE_PATH=${JSON.stringify(UPGRADE_PATH)};
function text(el){return ((el&&el.textContent)||'').replace(/\\s+/g,' ').trim()}
function byText(sel,re){return Array.from(document.querySelectorAll(sel)).find(function(el){return re.test(text(el))})}
function landingRoute(){var p=(location.pathname||'/').replace(/\\/+$/,'')||'/';return p==='/'||p==='/gift'}
function setRouteAction(el,path,label){
  if(!el)return;
  el.textContent=label;
  el.classList.add('lbp-premium-path');
  el.setAttribute('data-lbp-native-route',path);
  if(el.tagName==='A')el.setAttribute('href',path);
  if(!el.dataset.lbpNativeRouteBound){
    el.dataset.lbpNativeRouteBound='1';
    el.addEventListener('click',function(ev){
      if(el.getAttribute('data-lbp-native-route')!==path)return;
      ev.preventDefault();
      ev.stopImmediatePropagation();
      window.location.assign(path);
    },true);
  }
}
function removeInternalStatus(){
  if(!landingRoute())return;
  var re=/(archive recovery|supabase connection|connect supabase|production migration|database recovery|citizens? waiting to be restored|waiting to be restored|restor(?:e|ing).*production|migration.*production|development.*migration)/i;
  Array.from(document.querySelectorAll('body *')).forEach(function(el){
    if(!el||el.id==='lbp-production-gift-script'||el.children.length)return;
    var t=text(el);if(!t||t.length>650||!re.test(t))return;
    var block=el.closest('aside,section,article,footer,div,p,li')||el;
    if(text(block).length<=1000)block.remove();else el.remove();
  });
}
function removeBrokenStripeSetup(){
  if(!landingRoute())return;
  Array.from(document.querySelectorAll('a,button,[role="button"]')).forEach(function(el){
    var href=(el.getAttribute&&el.getAttribute('href'))||'';
    var own=text(el);
    if(!/STRIPE_SETUP\\.md/i.test(href+' '+own))return;
    var context=(own+' '+href+' '+text(el.closest('section,article,div')||el)).slice(0,1200);
    if(/upgrade|existing claim|existing claimant/i.test(context))setRouteAction(el,UPGRADE_PATH,'Upgrade Existing Claim — NZ$12');
    else if(/gift|personalised|personalized|certificate/i.test(context))setRouteAction(el,GIFT_PATH,'Create a Personalised Gift — NZ$12');
    else el.remove();
  });
  Array.from(document.querySelectorAll('a[href*="buy.stripe.com"],a[href*="stripe.com"]')).forEach(function(el){
    var context=(text(el)+' '+text(el.closest('section,article,div')||el)).slice(0,1000);
    if(/existing claim|claimant upgrade|upgrade/i.test(context))setRouteAction(el,UPGRADE_PATH,'Upgrade Existing Claim — NZ$12');
    else if(/gift|personalised|personalized/i.test(context))setRouteAction(el,GIFT_PATH,'Create a Personalised Gift — NZ$12');
  });
}
function heroAndPaths(){
  if(!landingRoute())return;
  var h1=document.querySelector('h1');
  if(h1)h1.textContent='Their Birthday. Their Birth Moon. Their Place on the Moon.';
  var sub=document.querySelector('.lbp-production-subhead');
  if(!sub&&h1){sub=document.createElement('p');sub.className='lbp-production-subhead';sub.textContent='Create a personalised symbolic Lunar Birthright gift for only NZ$12.';h1.insertAdjacentElement('afterend',sub)}

  var free=byText('button,a,[role="button"]',/^(claim|claim your|claim mine|claim free).*?(free|¼|1\\/4|quarter|lunar place|acre)?$/i);
  if(free){
    free.textContent='Claim Mine Free';
    free.classList.add('lbp-free-path');
    var freeHref=(free.getAttribute&&free.getAttribute('href'))||'';
    if(/stripe\\.com|buy\\.stripe\\.com|STRIPE_SETUP\\.md/i.test(freeHref))free.removeAttribute('href');
  }

  // Only public gift-entry CTAs are rerouted. The post-claim NZ$12 purchase
  // button intentionally keeps its React onClick handler so /certificate/checkout
  // creates a pending certificate/payment record before Stripe.
  var premium=byText('button,a,[role="button"]',/^(gift the moon|create a lunar gift|create a personalised gift(?: — nz\\$12)?|create a personalized gift(?: — nz\\$12)?)$/i);
  if(premium)setRouteAction(premium,GIFT_PATH,'Create a Personalised Gift — NZ$12');

  if(free&&!premium&&!document.getElementById('lbp-premium-path')){
    premium=document.createElement('a');premium.id='lbp-premium-path';premium.className='lbp-premium-path';
    free.insertAdjacentElement('afterend',premium);
    setRouteAction(premium,GIFT_PATH,'Create a Personalised Gift — NZ$12');
  }

  var upgrade=byText('button,a,[role="button"]',/^(upgrade existing claim|existing claimant upgrade|upgrade existing claim — nz\\$12)$/i);
  if(upgrade)setRouteAction(upgrade,UPGRADE_PATH,'Upgrade Existing Claim — NZ$12');

  if(free&&premium&&!document.getElementById('lbp-pathways')){
    var wrap=document.createElement('div');wrap.id='lbp-pathways';wrap.className='lbp-pathways';
    free.parentNode.insertBefore(wrap,free);wrap.appendChild(free);if(premium.isConnected)wrap.appendChild(premium);
  }
  var anchor=document.getElementById('lbp-pathways')||premium||free;
  if(anchor&&!document.getElementById('lbp-path-disclaimer')){
    var d=document.createElement('div');d.id='lbp-path-disclaimer';d.className='lbp-mandatory-disclaimer';d.textContent=DISCLAIMER;anchor.insertAdjacentElement('afterend',d)
  }
}
function enforceTokenVisibility(){
  Array.from(document.querySelectorAll('body *')).forEach(function(el){
    if(!el||el.children.length)return;
    var t=text(el);if(!/(nft\\s*token\\s*id|token\\s*id|digital archive key)/i.test(t))return;
    var holder=el.closest('[data-minted],tr,li,article,section,div')||el;
    var minted=(holder.getAttribute&&holder.getAttribute('data-minted')||'').toLowerCase();
    var context=text(holder);
    var verified=minted==='true'||minted==='verified'||/(mint(?:ing)?\\s*(?:status)?\\s*[:—-]?\\s*(verified|succeeded|confirmed)|verified mint)/i.test(context);
    if(!verified){holder.classList.add('lbp-token-hidden');holder.setAttribute('aria-hidden','true')}
  });
}
function certificateAndCheckoutDisclosure(){
  var route=(location.pathname||'').toLowerCase();
  var relevant=/certificate|upgrade|gift/.test(route);
  if(relevant&&!document.getElementById('lbp-view-disclaimer')){
    var d=document.createElement('div');d.id='lbp-view-disclaimer';d.className='lbp-mandatory-disclaimer';d.textContent=DISCLAIMER;
    var target=document.querySelector('main')||document.body;target.appendChild(d)
  }
  Array.from(document.querySelectorAll('img')).forEach(function(img){if(/certificate/i.test((img.alt||'')+' '+(img.src||'')))img.classList.add('lbp-premium-certificate')});
}
function run(){removeInternalStatus();removeBrokenStripeSetup();heroAndPaths();enforceTokenVisibility();certificateAndCheckoutDisclosure()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
var queued=false;new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;run()})}).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('popstate',run);window.addEventListener('hashchange',run);
})();
</script>`;

// Replace older injected version rather than stacking two observers.
html = html.replace(/<style id="lbp-production-gift-style">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<script id="lbp-production-gift-script">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<\/body>/i, enhancement + '\n</body>');
fs.writeFileSync(indexPath, html);

for (const certPath of [
  path.join(root, 'frontend', 'public', 'founding-certificate.svg'),
  path.join(root, 'frontend', 'build', 'founding-certificate.svg')
]) {
  if (!fs.existsSync(certPath)) continue;
  let svg = fs.readFileSync(certPath, 'utf8');
  svg = svg.replace(/<text x="628" y="960"[^>]*>DIGITAL ARCHIVE KEY \/ NFT TOKEN ID<\/text>\s*<text x="628" y="990"[^>]*>Issued with verified digital collectible<\/text>/i, '');
  svg = svg.replace(/Symbolic commemorative registry certificate[^<]*/i, DISCLAIMER);
  fs.writeFileSync(certPath, svg);
}

if (/href=["'][^"']*STRIPE_SETUP\.md/i.test(html)) {
  throw new Error('Broken STRIPE_SETUP.md customer link remains in build HTML');
}
console.log('LBP_PRODUCTION_GIFT_PATH_OK');
