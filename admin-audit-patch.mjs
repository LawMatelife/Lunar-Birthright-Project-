import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_ADMIN_REGISTRY_AUDIT_V1';

const injection = String.raw`<style id="lbp-admin-audit-style">
#lbp-admin-audit{max-width:1180px;margin:22px auto 44px;padding:0 18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5}#lbp-admin-audit *{box-sizing:border-box}.lbp-audit-card{background:#0d0d12;border:1px solid rgba(212,175,55,.36);border-radius:16px;padding:18px;box-shadow:0 12px 36px rgba(0,0,0,.22)}.lbp-audit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.lbp-audit-head h2{margin:0;color:#f0c967;font-size:22px}.lbp-audit-head p{margin:6px 0 0;color:#b9b9c3;font-size:13px;max-width:760px;line-height:1.5}.lbp-audit-actions{display:flex;gap:8px;flex-wrap:wrap}.lbp-audit-actions input{min-width:240px;background:#08080c;color:#fff;border:1px solid #33333d;border-radius:9px;padding:10px 12px}.lbp-audit-actions button,.lbp-audit-row button{border:0;border-radius:9px;padding:10px 13px;font-weight:800;cursor:pointer}.lbp-audit-refresh{background:#d4af37;color:#090909}.lbp-audit-stats{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.lbp-audit-stat{padding:8px 11px;border-radius:999px;background:#17171f;border:1px solid #2c2c36;color:#ddd;font-size:12px}.lbp-audit-status{min-height:20px;color:#c9c9d4;font-size:13px;margin:8px 0}.lbp-audit-list{display:grid;gap:10px}.lbp-audit-row{display:grid;grid-template-columns:minmax(170px,1.3fr) minmax(190px,1.3fr) minmax(150px,1fr) auto;gap:12px;align-items:center;background:#101016;border:1px solid #24242e;border-radius:12px;padding:12px}.lbp-audit-row[data-excluded="true"]{border-color:#7f1d1d;background:#160d0f}.lbp-audit-primary{font-weight:800;color:#fff}.lbp-audit-meta{font-size:12px;color:#9292a0;margin-top:3px;overflow-wrap:anywhere}.lbp-audit-decision{font-size:12px;color:#e5d097}.lbp-audit-row button[data-action="exclude"]{background:#7f1d1d;color:#fff}.lbp-audit-row button[data-action="include"]{background:#166534;color:#fff}.lbp-audit-empty{padding:18px;text-align:center;color:#a5a5b0;border:1px dashed #30303a;border-radius:10px}@media(max-width:820px){.lbp-audit-row{grid-template-columns:1fr}.lbp-audit-actions{width:100%}.lbp-audit-actions input{min-width:0;flex:1}}
</style>
<script id="lbp-admin-audit-script">
/* ${MARKER} */
(function(){
'use strict';
function onAdmin(){return (location.pathname||'').replace(/\\/+$/,'')==='/admin'}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
async function jsonFetch(url,options){var r=await fetch(url,Object.assign({credentials:'same-origin',headers:{'Accept':'application/json'}},options||{}));if(r.status===401){location.assign('/login?redirect=/admin');throw new Error('Not authenticated')}if(r.status===403)throw new Error('Admin access required');var data=null;try{data=await r.json()}catch(e){}if(!r.ok)throw new Error((data&&data.detail)||('Request failed: '+r.status));return data}
function mount(){
  if(!onAdmin()||document.getElementById('lbp-admin-audit'))return;
  var host=document.createElement('section');host.id='lbp-admin-audit';host.innerHTML='<div class="lbp-audit-card"><div class="lbp-audit-head"><div><h2>Registry Audit & Exclusions</h2><p>Public counts exclude only records you explicitly classify here. Source citizen records are never deleted by this control. Match suspected duplicates using stable IDs, email/account identifiers, citizen or certificate IDs — never the visible name alone.</p></div><div class="lbp-audit-actions"><input id="lbp-audit-search" type="search" placeholder="Search ID, email, certificate or name" autocomplete="off"><button class="lbp-audit-refresh" id="lbp-audit-refresh" type="button">Refresh</button></div></div><div class="lbp-audit-stats" id="lbp-audit-stats"></div><div class="lbp-audit-status" id="lbp-audit-status"></div><div class="lbp-audit-list" id="lbp-audit-list"></div></div>';
  var main=document.querySelector('main')||document.querySelector('#root')||document.body;main.appendChild(host);
  var list=host.querySelector('#lbp-audit-list'),status=host.querySelector('#lbp-audit-status'),stats=host.querySelector('#lbp-audit-stats'),search=host.querySelector('#lbp-audit-search');
  async function load(){status.textContent='Loading audited registry…';try{var q=(search.value||'').trim();var rows=await jsonFetch('/api/admin/registry-audit?limit=150'+(q?'&q='+encodeURIComponent(q):''));var totals=await jsonFetch('/api/registry-stats');stats.innerHTML='<span class="lbp-audit-stat">Public citizens: '+esc(totals.citizens)+'</span><span class="lbp-audit-stat">Countries: '+esc(totals.countries)+'</span><span class="lbp-audit-stat">Excluded: '+esc(totals.excluded_records)+'</span><span class="lbp-audit-stat">Records shown: '+esc((rows.records||[]).length)+' / '+esc(rows.total)+'</span>';list.innerHTML='';if(!(rows.records||[]).length){list.innerHTML='<div class="lbp-audit-empty">No matching registry records.</div>'}else{(rows.records||[]).forEach(function(r){var row=document.createElement('div');row.className='lbp-audit-row';row.dataset.excluded=r.excluded?'true':'false';var action=r.excluded?'include':'exclude';row.innerHTML='<div><div class="lbp-audit-primary">'+esc(r.full_name||'Unnamed citizen')+'</div><div class="lbp-audit-meta">Stable user ID: '+esc(r.id)+'</div></div><div><div>'+esc(r.email||'No email recorded')+'</div><div class="lbp-audit-meta">Certificate: '+esc(r.certificate_number||'—')+'</div></div><div><div>'+esc(r.country||'No country')+'</div><div class="lbp-audit-decision">'+(r.excluded?('Excluded: '+esc(r.exclusion_reason||'reason recorded')):'Included in public registry')+'</div></div><button type="button" data-action="'+action+'">'+(r.excluded?'Restore to public count':'Exclude from public count')+'</button>';row.querySelector('button').addEventListener('click',async function(){var excluding=action==='exclude';var reason='';if(excluding){reason=prompt('Reason for excluding this record (for example: test, admin, health-check, proven duplicate by stable identifier):','')||'';if(!reason.trim())return}else{reason=prompt('Optional note for restoring this record to public counts:','')||''}status.textContent='Saving audit decision…';try{await jsonFetch('/api/admin/registry-decision',{method:'POST',headers:{'Accept':'application/json','Content-Type':'application/json'},body:JSON.stringify({target_id:r.id,excluded:excluding,reason:reason})});await load()}catch(e){status.textContent=e.message}});list.appendChild(row)})}status.textContent='Audit decisions are reversible and do not delete registry records.'}catch(e){status.textContent=e.message}}
  host.querySelector('#lbp-audit-refresh').addEventListener('click',load);search.addEventListener('keydown',function(e){if(e.key==='Enter')load()});load();
}
function run(){if(onAdmin())mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
var observer=new MutationObserver(run);observer.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('popstate',run);
})();
</script>`;

html = html.replace(/<style id="lbp-admin-audit-style">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<script id="lbp-admin-audit-script">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<\/body>/i, injection + '\n</body>');
fs.writeFileSync(indexPath, html);
console.log('LBP_ADMIN_REGISTRY_AUDIT_OK');
