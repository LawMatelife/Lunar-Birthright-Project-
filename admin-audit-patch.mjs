import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_ADMIN_REGISTRY_AUDIT_V1';
const PROFILE_MARKER = 'LBP_ADMIN_PROFILE_TOOLS_V1';

const injection = String.raw`<style id="lbp-admin-audit-style">
#lbp-admin-audit{max-width:1180px;margin:22px auto 44px;padding:0 18px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#f5f5f5}#lbp-admin-audit *{box-sizing:border-box}.lbp-audit-card{background:#0d0d12;border:1px solid rgba(212,175,55,.36);border-radius:16px;padding:18px;box-shadow:0 12px 36px rgba(0,0,0,.22)}.lbp-audit-head{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;flex-wrap:wrap}.lbp-audit-head h2{margin:0;color:#f0c967;font-size:22px}.lbp-audit-head p{margin:6px 0 0;color:#b9b9c3;font-size:13px;max-width:820px;line-height:1.5}.lbp-audit-actions{display:flex;gap:8px;flex-wrap:wrap}.lbp-audit-actions input{min-width:260px;background:#08080c;color:#fff;border:1px solid #33333d;border-radius:9px;padding:10px 12px}.lbp-audit-actions button,.lbp-audit-row button{border:0;border-radius:9px;padding:9px 11px;font-weight:800;cursor:pointer}.lbp-audit-refresh{background:#d4af37;color:#090909}.lbp-audit-stats{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}.lbp-audit-stat{padding:8px 11px;border-radius:999px;background:#17171f;border:1px solid #2c2c36;color:#ddd;font-size:12px}.lbp-audit-status{min-height:20px;color:#c9c9d4;font-size:13px;margin:8px 0}.lbp-audit-list{display:grid;gap:10px}.lbp-audit-row{display:grid;grid-template-columns:minmax(170px,1.3fr) minmax(190px,1.3fr) minmax(150px,1fr) minmax(260px,auto);gap:12px;align-items:center;background:#101016;border:1px solid #24242e;border-radius:12px;padding:12px}.lbp-audit-row[data-excluded="true"]{border-color:#7f1d1d;background:#160d0f}.lbp-audit-primary{font-weight:800;color:#fff}.lbp-audit-meta{font-size:12px;color:#9292a0;margin-top:3px;overflow-wrap:anywhere}.lbp-audit-decision{font-size:12px;color:#e5d097}.lbp-audit-row-actions{display:flex;gap:7px;flex-wrap:wrap;justify-content:flex-end}.lbp-edit-profile{background:#334155;color:#fff}.lbp-mark-duplicate{background:#92400e;color:#fff}.lbp-exclude{background:#7f1d1d;color:#fff}.lbp-include{background:#166534;color:#fff}.lbp-audit-empty{padding:18px;text-align:center;color:#a5a5b0;border:1px dashed #30303a;border-radius:10px}.lbp-audit-safety{margin:12px 0 0;padding:10px 12px;border-radius:10px;background:#10141b;border:1px solid #263241;color:#b9c9df;font-size:12px;line-height:1.5}@media(max-width:960px){.lbp-audit-row{grid-template-columns:1fr 1fr}.lbp-audit-row-actions{justify-content:flex-start}}@media(max-width:680px){.lbp-audit-row{grid-template-columns:1fr}.lbp-audit-actions{width:100%}.lbp-audit-actions input{min-width:0;flex:1}}
</style>
<script id="lbp-admin-audit-script">
/* ${MARKER} */
/* ${PROFILE_MARKER} */
(function(){
'use strict';
function onAdmin(){return (location.pathname||'').replace(/\\/+$/,'')==='/admin'}
function esc(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]})}
async function jsonFetch(url,options){var base={credentials:'same-origin',headers:{'Accept':'application/json'}};var opts=Object.assign({},base,options||{});if(options&&options.headers)opts.headers=Object.assign({},base.headers,options.headers);var r=await fetch(url,opts);if(r.status===401){location.assign('/login?redirect=/admin');throw new Error('Not authenticated')}if(r.status===403)throw new Error('Admin access required');var data=null;try{data=await r.json()}catch(e){}if(!r.ok)throw new Error((data&&data.detail)||('Request failed: '+r.status));return data}
function post(url,body){return jsonFetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}
function mount(){
  if(!onAdmin()||document.getElementById('lbp-admin-audit'))return;
  var host=document.createElement('section');host.id='lbp-admin-audit';host.innerHTML='<div class="lbp-audit-card"><div class="lbp-audit-head"><div><h2>Citizen Profiles, Duplicates & Registry Audit</h2><p>Edit genuine profile details, classify fake/test/admin/system records, and mark proven duplicates. Exclusions change public totals but preserve the source record and audit trail. Duplicate decisions require a stable identifier match — never a matching name alone.</p></div><div class="lbp-audit-actions"><input id="lbp-audit-search" type="search" placeholder="Search ID, email, certificate or name" autocomplete="off"><button class="lbp-audit-refresh" id="lbp-audit-refresh" type="button">Refresh</button></div></div><div class="lbp-audit-stats" id="lbp-audit-stats"></div><div class="lbp-audit-status" id="lbp-audit-status"></div><div class="lbp-audit-list" id="lbp-audit-list"></div><div class="lbp-audit-safety"><strong>Safety:</strong> Edit Profile can correct name, email and country only. Stable user ID, citizen/certificate number and historical claim identity remain locked. “Remove” is implemented as a reversible audited exclusion; no citizen is permanently deleted by these controls. Founding Citizen 000001 is protected from exclusion.</div></div>';
  var main=document.querySelector('main')||document.querySelector('#root')||document.body;main.appendChild(host);
  var list=host.querySelector('#lbp-audit-list'),status=host.querySelector('#lbp-audit-status'),stats=host.querySelector('#lbp-audit-stats'),search=host.querySelector('#lbp-audit-search');

  async function editProfile(r){
    var name=prompt('Citizen full name. Stable IDs remain locked:',r.full_name||'');if(name===null)return;
    var email=prompt('Citizen email:',r.email||'');if(email===null)return;
    var country=prompt('Citizen country:',r.country||'');if(country===null)return;
    var note=prompt('Audit note for this profile correction (optional):','')||'';
    status.textContent='Saving profile correction…';
    try{await post('/api/admin/profile-update',{target_id:r.id,full_name:name,email:email,country:country,note:note});await load()}catch(e){status.textContent=e.message}
  }

  async function markDuplicate(r){
    var canonical=prompt('Enter the stable user ID of the genuine citizen record to KEEP. The system will refuse a name-only duplicate decision:','');if(!canonical||!canonical.trim())return;
    status.textContent='Checking stable duplicate evidence…';
    try{
      var check=await post('/api/admin/duplicate-check',{target_id:r.id,canonical_target_id:canonical.trim()});
      if(!check.can_classify_duplicate){status.textContent='Duplicate NOT applied: no stable identifier match was found. Matching names alone are not enough.';return}
      var evidence=(check.stable_identifier_matches||[]).join(', ');
      if(!confirm('Stable duplicate evidence found: '+evidence+'\n\nExclude this duplicate while retaining the citizen ID '+canonical.trim()+'?')){status.textContent='Duplicate decision cancelled.';return}
      var reason=prompt('Audit reason for duplicate exclusion:','Proven duplicate by stable identifier: '+evidence)||'';if(!reason.trim())return;
      await post('/api/admin/registry-classify',{target_id:r.id,excluded:true,classification:'duplicate',reason:reason,canonical_target_id:canonical.trim()});await load();
    }catch(e){status.textContent=e.message}
  }

  async function excludeRecord(r){
    var classification=prompt('Classification: fake, test, admin, system, health-check, placeholder, or other','fake');if(classification===null)return;classification=classification.trim().toLowerCase();
    var allowed=['fake','test','admin','system','health-check','placeholder','other'];if(allowed.indexOf(classification)<0){status.textContent='Use one of: '+allowed.join(', ');return}
    var reason=prompt('Reason for excluding this record from public figures:','')||'';if(!reason.trim())return;
    if(!confirm('Exclude this record from public citizen/country totals?\n\nThe underlying record will be preserved and can be restored.'))return;
    status.textContent='Saving exclusion…';
    try{await post('/api/admin/registry-classify',{target_id:r.id,excluded:true,classification:classification,reason:reason});await load()}catch(e){status.textContent=e.message}
  }

  async function restoreRecord(r){
    var reason=prompt('Optional audit note for restoring this record:','')||'';
    status.textContent='Restoring record to public figures…';
    try{await post('/api/admin/registry-classify',{target_id:r.id,excluded:false,classification:'included',reason:reason});await load()}catch(e){status.textContent=e.message}
  }

  function renderRow(r){
    var row=document.createElement('div');row.className='lbp-audit-row';row.dataset.excluded=r.excluded?'true':'false';
    row.innerHTML='<div><div class="lbp-audit-primary">'+esc(r.full_name||'Unnamed citizen')+'</div><div class="lbp-audit-meta">Stable user ID: '+esc(r.id)+'</div><div class="lbp-audit-meta">Created: '+esc(r.created_at||'—')+'</div></div><div><div>'+esc(r.email||'No email recorded')+'</div><div class="lbp-audit-meta">Certificate: '+esc(r.certificate_number||'—')+'</div></div><div><div>'+esc(r.country||'No country')+'</div><div class="lbp-audit-decision">'+(r.excluded?('Excluded: '+esc(r.exclusion_reason||'reason recorded')):'Included in public registry')+'</div></div><div class="lbp-audit-row-actions"><button class="lbp-edit-profile" type="button">Edit Profile</button><button class="lbp-mark-duplicate" type="button">Mark Duplicate</button><button class="'+(r.excluded?'lbp-include':'lbp-exclude')+'" type="button">'+(r.excluded?'Restore':'Remove / Exclude')+'</button></div>';
    var buttons=row.querySelectorAll('button');buttons[0].addEventListener('click',function(){editProfile(r)});buttons[1].addEventListener('click',function(){markDuplicate(r)});buttons[2].addEventListener('click',function(){r.excluded?restoreRecord(r):excludeRecord(r)});return row;
  }

  async function load(){
    status.textContent='Loading audited registry…';
    try{
      var q=(search.value||'').trim();var rows=await jsonFetch('/api/admin/registry-audit?limit=250'+(q?'&q='+encodeURIComponent(q):''));var totals=await jsonFetch('/api/registry-stats');
      stats.innerHTML='<span class="lbp-audit-stat">Public citizens: '+esc(totals.citizens)+'</span><span class="lbp-audit-stat">Countries: '+esc(totals.countries)+'</span><span class="lbp-audit-stat">Excluded: '+esc(totals.excluded_records)+'</span><span class="lbp-audit-stat">Records shown: '+esc((rows.records||[]).length)+' / '+esc(rows.total)+'</span>';
      list.innerHTML='';if(!(rows.records||[]).length){list.innerHTML='<div class="lbp-audit-empty">No matching registry records.</div>'}else{(rows.records||[]).forEach(function(r){list.appendChild(renderRow(r))})}
      status.textContent='Changes are audited. Excluded records remain preserved and can be restored.';
    }catch(e){status.textContent=e.message}
  }
  host.querySelector('#lbp-audit-refresh').addEventListener('click',load);search.addEventListener('keydown',function(e){if(e.key==='Enter')load()});load();
}
function run(){if(onAdmin())mount()}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run,{once:true});else run();
var observer=new MutationObserver(run);observer.observe(document.documentElement,{subtree:true,childList:true});window.addEventListener('popstate',run);
})();
</script>`;

html = html.replace(/<style id="lbp-admin-audit-style">[\s\S]*?<\/style>\s*/i, '');
html = html.replace(/<script id="lbp-admin-audit-script">[\s\S]*?<\/script>\s*/i, '');
html = html.replace(/<\/body>/i, injection + '\n</body>');
fs.writeFileSync(indexPath, html);
console.log('LBP_ADMIN_REGISTRY_AUDIT_PROFILE_TOOLS_OK');
