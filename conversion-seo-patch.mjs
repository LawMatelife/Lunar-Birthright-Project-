import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const buildDir = path.join(root, 'frontend', 'build');
const indexPath = path.join(buildDir, 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_CONVERSION_SEO_V1';

function upsertHead(source) {
  source = source.replace(/<title>[\s\S]*?<\/title>/i, '<title>Your Birth Moon. Your Place on the Moon. | Lunar Birthright Project</title>');
  const tags = `\n<!-- ${MARKER} -->
<meta name="description" content="Discover your Birth Moon and claim a free symbolic quarter-acre place on the Moon. Create a personalised lunar certificate or gift pack from NZ$12.">
<link rel="canonical" href="https://lunarbirthrightproject.com/">
<meta property="og:title" content="Your Birth Moon. Your Place on the Moon.">
<meta property="og:description" content="Discover the Moon as it appeared when you were born and claim your symbolic place in the Lunar Birthright archive.">
<meta property="og:url" content="https://lunarbirthrightproject.com/">
<meta property="og:type" content="website">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="Your Birth Moon. Your Place on the Moon.">
<meta name="twitter:description" content="Discover your Birth Moon, claim a free symbolic lunar place, and turn it into a personalised keepsake.">
<script defer src="/_vercel/insights/script.js"></script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Lunar Birthright Project","url":"https://lunarbirthrightproject.com/","description":"A symbolic commemorative lunar registry with Birth Moon discovery, personalised certificates and gifts."}</script>
<script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"Personalised Lunar Gift Pack","description":"Personalised lunar keepsake with symbolic quarter-acre registry place, Birth Moon identity, certificate and archive verification.","offers":{"@type":"Offer","priceCurrency":"NZD","price":"12.00","availability":"https://schema.org/InStock","url":"https://lunarbirthrightproject.com/gift"}}</script>`;
  return source.replace(/<\/head>/i, tags + '\n</head>');
}

const enhancement = String.raw`<style id="lbp-conversion-seo-style">
.lbp-audit-card{max-width:980px;margin:18px auto;padding:20px 22px;border:1px solid rgba(214,170,65,.42);border-radius:18px;background:linear-gradient(180deg,rgba(22,18,12,.92),rgba(6,6,9,.94));box-shadow:0 16px 40px rgba(0,0,0,.28);color:#f3ead0;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lbp-audit-card h2,.lbp-audit-card h3{margin:0 0 10px;color:#f0c967}.lbp-audit-card p{line-height:1.55;color:#ddd2b5}.lbp-hero-copy{max-width:780px;margin:10px auto 18px;text-align:center;color:#e8ddbf;font-size:clamp(16px,2.2vw,21px);line-height:1.55}.lbp-trustline{display:flex;justify-content:center;gap:10px 18px;flex-wrap:wrap;margin:12px auto 22px;color:#f2d57b;font-size:14px}.lbp-steps{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.lbp-step{padding:15px;border-radius:14px;background:rgba(255,255,255,.035);border:1px solid rgba(214,170,65,.18)}.lbp-step b{display:block;color:#f0c967;margin-bottom:5px}.lbp-legal-note,.lbp-privacy-note{max-width:760px;margin:10px auto;padding:10px 13px;border-radius:12px;background:rgba(255,255,255,.04);color:#cfc6ad;font-size:13px;line-height:1.45}.lbp-privacy-note a,.lbp-seo-footer a{color:#f0c967}.lbp-upgrade{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.lbp-upgrade div{padding:13px;border-radius:12px;background:rgba(255,255,255,.035)}.lbp-upgrade b{color:#f0c967}.lbp-share-btn{display:inline-flex;align-items:center;justify-content:center;margin:12px auto;padding:11px 17px;border:1px solid #d6aa41;border-radius:999px;background:#d6aa41;color:#0a0907;font-weight:800;cursor:pointer}.lbp-seo-footer{margin:28px auto 10px;padding:18px;text-align:center;color:#bcb39d;font-size:13px}.lbp-seo-footer a{margin:0 7px}.lbp-cert-preview{display:flex;gap:18px;align-items:center}.lbp-cert-preview img{width:min(260px,38vw);border-radius:10px;border:1px solid rgba(214,170,65,.45);box-shadow:0 15px 36px rgba(0,0,0,.35)}
@media(max-width:720px){.lbp-steps,.lbp-upgrade{grid-template-columns:1fr}.lbp-cert-preview{align-items:flex-start}.lbp-cert-preview img{width:36vw}.lbp-audit-card{margin:14px 10px;padding:16px}}
</style>
<script id="lbp-conversion-seo-script">
/* ${MARKER} */
(function(){
'use strict';
window.va=window.va||function(){(window.vaq=window.vaq||[]).push(arguments)};
function track(name,props){try{window.va('event',{name:name,data:props||{}})}catch(_){}}
function txt(el){return ((el&&el.textContent)||'').replace(/\s+/g,' ').trim()}
function byText(sel,re){return Array.from(document.querySelectorAll(sel)).find(function(e){return re.test(txt(e))})}
function once(id,fn){if(document.getElementById(id))return;fn()}
function insertAfter(node,newNode){if(node&&node.parentNode)node.parentNode.insertBefore(newNode,node.nextSibling)}
function card(id,body){var s=document.createElement('section');s.id=id;s.className='lbp-audit-card';s.innerHTML=body;return s}
function enhance(){
  document.querySelectorAll('body *').forEach(function(el){if(el.children.length===0&&/For full cross-device login later, connect Supabase accounts\.?/i.test(txt(el)))el.textContent='Already claimed your lunar place? Enter your email or certificate ID to find it again.';if(el.children.length===0&&/registry records hundreds of lunar citizens/i.test(txt(el)))el.textContent=el.textContent.replace(/records hundreds of lunar citizens from countries around the world/i,'records verified Lunar Citizens from around the world');});
  var h1=byText('h1',/claim your (place|free|symbolic)|place on the moon/i)||document.querySelector('h1');
  if(h1&&!h1.dataset.lbpHero){h1.dataset.lbpHero='1';h1.textContent='Your Birth Moon. Your Place on the Moon.';var p=document.createElement('p');p.className='lbp-hero-copy';p.textContent='Discover the Moon as it appeared when you were born and claim your own symbolic ¼-acre place in the Lunar Birthright archive.';insertAfter(h1,p);var trust=document.createElement('div');trust.className='lbp-trustline';trust.innerHTML='<span>Free forever</span><span>•</span><span>No credit card</span><span>•</span><span>Takes about 30 seconds</span>';insertAfter(p,trust)}
  once('lbp-how-it-works',function(){var anchor=h1&&h1.parentElement;if(!anchor)return;var s=card('lbp-how-it-works','<h2>Discover your lunar place in three steps</h2><div class="lbp-steps"><div class="lbp-step"><b>1. Enter your birth date</b>We calculate your Birth Moon phase and symbolic lunar region.</div><div class="lbp-step"><b>2. Discover your Birth Moon</b>Explore the Moon and reveal the region linked to your birth date.</div><div class="lbp-step"><b>3. Receive your lunar place</b>Your symbolic ¼-acre place is recorded with a unique archive identity.</div>');insertAfter(anchor,s)});
  once('lbp-certificate-showcase',function(){var a=document.getElementById('lbp-how-it-works');if(!a)return;var s=card('lbp-certificate-showcase','<div class="lbp-cert-preview"><img src="/founding-certificate.svg" alt="Example Lunar Birthright personalised certificate"><div><h2>See what your lunar keepsake can become</h2><p>Your free claim creates your symbolic lunar place. The optional NZ$12 personalised keepsake adds a polished certificate designed to save, print, frame or give as a gift.</p><p><b>Personalised to you.</b> Your name, lunar location, Birth Moon and unique certificate ID.</p></div></div>');insertAfter(a,s)});
  var claimBtn=byText('button,a,[role="button"]',/claim.*(¼|1\/4|quarter|free).*acre|claim my free lunar place/i);if(claimBtn){if(!claimBtn.dataset.lbpTracked){claimBtn.dataset.lbpTracked='1';claimBtn.addEventListener('click',function(){track('claim_cta_click')})}once('lbp-symbolic-note',function(){var d=document.createElement('div');d.id='lbp-symbolic-note';d.className='lbp-legal-note';d.innerHTML='<b>Clear and symbolic:</b> your Lunar Birthright claim is a commemorative registry experience. It does not create legal ownership, land title, sovereignty, mining rights or real-estate rights on the Moon.';insertAfter(claimBtn,d)})}
  var giftBtn=byText('button,a,[role="button"]',/gift the moon|lunar gift/i);if(giftBtn&&!giftBtn.dataset.lbpTracked){giftBtn.dataset.lbpTracked='1';giftBtn.addEventListener('click',function(){track('gift_cta_click')})}
  document.querySelectorAll('form').forEach(function(form){var t=txt(form);if(/claim|birth date|country|email/i.test(t)&&!form.dataset.lbpPrivacy){form.dataset.lbpPrivacy='1';var n=document.createElement('div');n.className='lbp-privacy-note';n.innerHTML='Your details are used to create and manage your lunar claim. Your raw birth date is not intended for public NFT metadata or public share cards. <a href="/privacy/">Read our privacy information</a>.';form.appendChild(n)}});
  var priceNode=byText('button,a,h2,h3,p,div',/(NZ\$\s?12|\$12).*certificate|certificate.*(NZ\$\s?12|\$12)|upgrade.*(NZ\$\s?12|\$12)/i);if(priceNode)once('lbp-upgrade-reframe',function(){var s=card('lbp-upgrade-reframe','<h2>Turn your lunar place into a keepsake — NZ$12</h2><p>The certificate is the main product. Digital collectible / NFT features remain available as a secondary archive option.</p><div class="lbp-upgrade"><div><b>Personalised to you</b><br>Your name, lunar location, Birth Moon and certificate ID.</div><div><b>Beautiful PDF certificate</b><br>Save it, print it, frame it or give it as a gift.</div><div><b>Permanent archive record</b><br>Your claim receives its own verifiable archive identity.</div></div>');insertAfter(priceNode,s)});
  var result=byText('main,section,div',/lunar citizen.*(certificate|coordinates)|your.*(lunar place|birth moon).*recorded/i);if(result&&txt(result).length<3500)once('lbp-share-place',function(){var b=document.createElement('button');b.id='lbp-share-place';b.className='lbp-share-btn';b.type='button';b.textContent='Share My Place on the Moon';b.addEventListener('click',async function(){var share={title:'My Lunar Birthright',text:'I now have a symbolic place on the Moon 🌙 Find your Birth Moon and claim yours.',url:location.origin};try{if(navigator.share)await navigator.share(share);else{await navigator.clipboard.writeText(share.text+' '+share.url);b.textContent='Share link copied';setTimeout(function(){b.textContent='Share My Place on the Moon'},1800)}track('share_place')}catch(_){}});result.appendChild(b)});
  once('lbp-seo-footer',function(){if(!document.body)return;var f=document.createElement('footer');f.id='lbp-seo-footer';f.className='lbp-seo-footer';f.innerHTML='<a href="/birth-moon/">Birth Moon</a><a href="/moon-certificate/">Moon Certificate</a><a href="/moon-gift/">Moon Gift</a><a href="/what-is-lunar-birthright/">How it works</a><a href="/faq/">FAQ</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a>';document.body.appendChild(f)});
  document.querySelectorAll('button,a').forEach(function(el){if(el.dataset.lbpAnalytics)return;var t=txt(el);if(/checkout|buy|upgrade|purchase|get.*certificate/i.test(t)){el.dataset.lbpAnalytics='1';el.addEventListener('click',function(){track('upgrade_or_checkout_click',{label:t.slice(0,80)})})}})
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',enhance);else enhance();
new MutationObserver(function(){enhance()}).observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;

if (!html.includes(MARKER)) {
  html = upsertHead(html);
  html = html.replace(/<\/body>/i, enhancement + '\n</body>');
  fs.writeFileSync(indexPath, html);
}

const baseStyle = `body{margin:0;background:#050508;color:#eee5cf;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}main{max-width:900px;margin:auto;padding:42px 22px 70px}a{color:#e8bd58}h1{color:#f0c967;font-size:clamp(34px,7vw,64px);line-height:1.03}h2{color:#f0c967;margin-top:34px}p,li{line-height:1.65;color:#d8cfb7}.cta{display:inline-block;margin:18px 0;padding:12px 18px;border-radius:999px;background:#d6aa41;color:#090805;text-decoration:none;font-weight:800}.note{padding:14px 16px;border:1px solid #6e5624;border-radius:12px;background:#0c0b0d}.nav{margin-bottom:24px}.nav a{margin-right:14px}`;
const pages = {
  'birth-moon': ['What Was the Moon Phase When I Was Born?', 'Your Birth Moon is the lunar phase and illumination associated with your birth date. Lunar Birthright turns that moment into a symbolic lunar identity and region, then lets you claim a free commemorative quarter-acre place in the registry.', ['Discover your Birth Moon phase and illumination','Reveal a symbolic lunar region linked to your date','Continue into the free Lunar Birthright claim']],
  'moon-certificate': ['Personalised Moon Certificate', 'Create a personalised Lunar Birthright certificate featuring your name, symbolic lunar place, Birth Moon identity, lunar coordinates and unique archive ID.', ['Free symbolic lunar claim first','Optional NZ$12 personalised keepsake','Designed to save, print, frame or gift']],
  'moon-gift': ['Personalised Moon Gift', 'Give someone a symbolic place among the stars. Enter their name and birth date, discover their Birth Moon and create a personalised lunar keepsake.', ['Birthday, anniversary, wedding or newborn gift','Birth Moon identity and symbolic lunar place','Optional NZ$12 certificate gift pack']],
  'birthday-moon-gift': ['Moon Gifts for Birthdays', 'A birthday gift based on the Moon as it appeared when someone was born. Their birth date becomes a Birth Moon identity, symbolic lunar region and personalised keepsake.', ['Personal and date-linked','Digital delivery','Shareable lunar reveal']],
  'newborn-moon-gift': ['Birth Moon Keepsake for a New Baby', 'Record a newborn’s Birth Moon as a symbolic commemorative lunar place and create a keepsake for parents or family.', ['Birth-date linked Moon identity','Symbolic quarter-acre registry place','Printable personalised certificate option']],
  'wedding-moon-gift': ['Personalised Moon Wedding Gift', 'Create an unusual wedding or anniversary keepsake: a symbolic Lunar Birthright place, personalised certificate and Birth Moon story for someone you care about.', ['Personalised names and message','Lunar archive identity','NZ$12 keepsake option']],
  'what-is-lunar-birthright': ['How Lunar Birthright Works', 'Lunar Birthright is a symbolic, educational and commemorative lunar registry. It does not sell legal ownership of the Moon. The experience combines a Birth Moon calculation, a symbolic quarter-acre lunar place, archive verification and optional personalised certificates.', ['Enter a birth date','Discover a Birth Moon and symbolic lunar region','Claim a free registry place','Optionally create a personalised keepsake']],
  'faq': ['Lunar Birthright FAQ', 'Answers to common questions about symbolic lunar claims, Birth Moon results, certificates, privacy and the optional paid keepsake.', ['Is this legal ownership of Moon land? No. It is symbolic and commemorative.','Is the basic claim free? Yes, the core claim is free.','What is the NZ$12 option? A personalised keepsake/certificate upgrade.','Is my raw birth date public? Public-facing assets should not expose the raw birth date.']],
  'privacy': ['Privacy', 'Lunar Birthright uses information you provide to create, identify and manage your symbolic lunar claim, Birth Moon result and certificate experience. Public-facing share cards and public NFT metadata should not expose your raw birth date.', ['Only provide information needed for your claim','Do not publish another person’s private information without permission','Contact the project through the account or site contact channel if you need a privacy correction']],
  'terms': ['Terms & Symbolic Claim Notice', 'Lunar Birthright is a symbolic commemorative registry and not a real-estate service. A claim or certificate does not confer legal ownership, title, sovereignty, exclusion rights, mining rights or other property rights on the Moon.', ['The free claim is symbolic','Paid certificates are commemorative keepsakes','Digital collectible features do not convert a symbolic claim into legal lunar property']]
};

for (const [slug, data] of Object.entries(pages)) {
  const dir = path.join(buildDir, slug); fs.mkdirSync(dir,{recursive:true});
  const [title, desc, bullets] = data;
  const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} | Lunar Birthright Project</title><meta name="description" content="${desc.replace(/"/g,'&quot;')}"><link rel="canonical" href="https://lunarbirthrightproject.com/${slug}/"><style>${baseStyle}</style></head><body><main><div class="nav"><a href="/">Lunar Birthright Project</a><a href="/faq/">FAQ</a><a href="/privacy/">Privacy</a><a href="/terms/">Terms</a></div><h1>${title}</h1><p>${desc}</p><ul>${bullets.map(x=>`<li>${x}</li>`).join('')}</ul><p class="note"><strong>Important:</strong> Lunar Birthright claims are symbolic and commemorative. They do not confer legal ownership or property rights on the Moon.</p><a class="cta" href="/">Claim My Free Lunar Place →</a></main></body></html>`;
  fs.writeFileSync(path.join(dir,'index.html'),page);
}

const robots = `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: https://lunarbirthrightproject.com/sitemap.xml\n`;
fs.writeFileSync(path.join(buildDir,'robots.txt'), robots);
const urls = ['','birth-moon','moon-certificate','moon-gift','birthday-moon-gift','newborn-moon-gift','wedding-moon-gift','what-is-lunar-birthright','faq','privacy','terms'];
const sitemap = `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.map(u=>`<url><loc>https://lunarbirthrightproject.com/${u?u+'/':''}</loc><changefreq>${u?'monthly':'weekly'}</changefreq><priority>${u?'.8':'1.0'}</priority></url>`).join('')}</urlset>`;
fs.writeFileSync(path.join(buildDir,'sitemap.xml'), sitemap);
console.log('LBP_CONVERSION_SEO_PATCH_OK', Object.keys(pages).length, 'pages');
