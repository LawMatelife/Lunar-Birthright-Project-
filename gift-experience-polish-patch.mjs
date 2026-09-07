import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_GIFT_EXPERIENCE_POLISH_V1';

const enhancement = String.raw`<style id="lbp-gift-polish-style">
.lbp-gift-polish{max-width:920px;margin:22px auto;padding:0 16px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f7f2e6}.lbp-gift-polish h2{font-family:Georgia,serif;color:#f0c967;text-align:center;font-size:clamp(25px,4vw,38px);margin:0 0 8px}.lbp-gift-polish .lead{text-align:center;color:#ded5bd;max-width:760px;margin:0 auto 18px;line-height:1.55}.lbp-gift-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:12px}.lbp-gift-step{background:linear-gradient(145deg,#080808,#15120a);border:1px solid rgba(212,175,55,.55);border-radius:15px;padding:18px;min-height:130px}.lbp-gift-step b{display:block;color:#f0c967;margin-bottom:7px;font-size:16px}.lbp-gift-step span{color:#ddd4be;line-height:1.5;font-size:14px}.lbp-delivery-card{margin-top:14px;border:1px solid rgba(212,175,55,.45);background:#090909;border-radius:14px;padding:16px 18px;text-align:center}.lbp-delivery-card strong{color:#f0c967}.lbp-delivery-card p{margin:6px 0;color:#d9d1bf;line-height:1.5}.lbp-privacy-note{font-size:13px!important;color:#bfb7a5!important}.lbp-success-polish{max-width:760px;margin:24px auto;padding:22px;border:1px solid #d4af37;border-radius:16px;background:linear-gradient(145deg,#050505,#141107);text-align:center;color:#f6edd7}.lbp-success-polish h2{color:#f0c967;font-family:Georgia,serif;margin:0 0 10px}.lbp-success-polish .status{display:inline-block;padding:7px 12px;border-radius:999px;border:1px solid rgba(212,175,55,.6);color:#f0c967;font-weight:800;margin:6px}.lbp-success-polish p{line-height:1.55;color:#ddd4be}.lbp-success-polish .small{font-size:13px;color:#bdb5a2}@media(max-width:720px){.lbp-gift-steps{grid-template-columns:1fr}.lbp-gift-step{min-height:0}}
</style>
<script id="lbp-gift-polish-script">
/* ${MARKER} */
(function(){
'use strict';
function text(el){return ((el&&el.textContent)||'').replace(/\\s+/g,' ').trim()}
function route(){return (location.pathname||'/').toLowerCase()}
function onGift(){return /gift/.test(route())}
function onCertificate(){return /certificate|upgrade|dashboard/.test(route())}
function insertGiftExplainer(){
  if(!onGift()||document.getElementById('lbp-gift-polish'))return;
  var main=document.querySelector('main')||document.body;
  var box=document.createElement('section');box.id='lbp-gift-polish';box.className='lbp-gift-polish';
  box.innerHTML='<h2>A gift written in the Moon</h2><p class="lead">Create something personal in three simple steps. Their birthday reveals their Birth Moon, the registry records a unique symbolic lunar place, and a premium certificate becomes their keepsake.</p><div class="lbp-gift-steps"><div class="lbp-gift-step"><b>1. Tell us who it is for</b><span>Enter the recipient’s name, birth date and country, plus an optional personal message.</span></div><div class="lbp-gift-step"><b>2. Discover their Birth Moon</b><span>The experience calculates their Birth Moon and links it to their symbolic lunar location.</span></div><div class="lbp-gift-step"><b>3. Receive the keepsake</b><span>After verified payment, the personalised certificate is generated for download and email. A Token ID appears only after a genuine mint succeeds.</span></div></div><div class="lbp-delivery-card"><strong>NZ$12 • Personalised • Digital keepsake</strong><p>Certificate delivery is designed for immediate download with an email copy after verified payment.</p><p class="lbp-privacy-note">Birth dates are used for personalisation and are not displayed in public share or NFT metadata.</p></div>';
  var form=main.querySelector('form');
  if(form)form.insertAdjacentElement('beforebegin',box);else main.insertBefore(box,main.firstChild);
}
function insertSuccessMessaging(){
  if(!onCertificate()||document.getElementById('lbp-success-polish'))return;
  var q=new URLSearchParams(location.search);
  var paid=q.get('certificate')==='success'||q.get('payment')==='success'||q.has('session_id')||q.has('checkout_session_id');
  if(!paid)return;
  var main=document.querySelector('main')||document.body;
  var box=document.createElement('section');box.id='lbp-success-polish';box.className='lbp-success-polish';
  box.innerHTML='<h2>Payment received</h2><div class="status">Certificate fulfilment</div><div class="status">Mint verification</div><p>Your payment has been verified. Lunar Birthright now matches or creates the recipient’s registry record, prepares the personalised certificate for download and email, and then attempts the digital collectible mint.</p><p class="small">The certificate must remain available independently of minting. A Token ID is shown only after a genuine mint has succeeded and been verified.</p>';
  main.insertBefore(box,main.firstChild);
}
function refineCopy(){
  Array.from(document.querySelectorAll('button,a,[role="button"]')).forEach(function(el){
    var t=text(el);
    if(/^download certificate$/i.test(t))el.textContent='Download My Certificate';
    if(/^share$/i.test(t)&&onCertificate())el.textContent='Share My Place on the Moon';
  });
}
function run(){insertGiftExplainer();insertSuccessMessaging();refineCopy()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
var queued=false;new MutationObserver(function(){if(queued)return;queued=true;requestAnimationFrame(function(){queued=false;run()})}).observe(document.documentElement,{subtree:true,childList:true});
window.addEventListener('popstate',run);window.addEventListener('hashchange',run);
})();
</script>`;

html = html.replace(/<style id="lbp-gift-polish-style">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<script id="lbp-gift-polish-script">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<\/body>/i, enhancement + '\n</body>');
fs.writeFileSync(indexPath, html);
console.log('LBP_GIFT_EXPERIENCE_POLISH_OK');
