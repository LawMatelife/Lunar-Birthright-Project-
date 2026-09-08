import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'frontend', 'build', 'index.html');
if (!fs.existsSync(indexPath)) throw new Error('frontend/build/index.html missing');

let html = fs.readFileSync(indexPath, 'utf8');
const MARKER = 'LBP_SIMPLE_NATIVE_ADMIN_LOGIN_V1';

// The operational Admin panel used to redirect a 401 to the generic login page.
// Keep the native /auth/login + HttpOnly session-cookie system, but let /admin
// present its own clear sign-in instead. No parallel auth system is introduced.
html = html.replace(
  "if(r.status===401){location.assign('/login?redirect=/admin');throw new Error('Not authenticated')}",
  "if(r.status===401){window.dispatchEvent(new CustomEvent('lbp-admin-auth-required'));throw new Error('Not authenticated')}"
);

const injection = String.raw`<style id="lbp-simple-admin-login-style">
#lbp-admin-login-gate{position:fixed;inset:0;z-index:100000;background:radial-gradient(circle at 50% 10%,#1b1821 0,#09090d 42%,#030305 100%);display:flex;align-items:center;justify-content:center;padding:22px;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#fff}#lbp-admin-login-gate[hidden]{display:none}.lbp-admin-login-card{width:min(460px,100%);background:#0e0e14;border:1px solid rgba(212,175,55,.55);border-radius:20px;padding:28px;box-shadow:0 28px 80px rgba(0,0,0,.55)}.lbp-admin-login-kicker{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#d4af37;font-weight:850}.lbp-admin-login-card h1{font-size:28px;line-height:1.15;margin:10px 0 8px}.lbp-admin-login-card p{font-size:14px;line-height:1.55;color:#b9b9c6;margin:0 0 18px}.lbp-admin-login-card label{display:block;font-size:13px;font-weight:750;color:#dfdfe7;margin:12px 0 6px}.lbp-admin-login-card input{width:100%;box-sizing:border-box;border:1px solid #343440;border-radius:10px;background:#08080c;color:#fff;padding:12px 13px;font-size:16px;outline:none}.lbp-admin-login-card input:focus{border-color:#d4af37;box-shadow:0 0 0 3px rgba(212,175,55,.12)}.lbp-admin-login-card button{width:100%;border:0;border-radius:10px;background:#d4af37;color:#080808;font-size:15px;font-weight:900;padding:12px 14px;margin-top:16px;cursor:pointer}.lbp-admin-login-card button:disabled{opacity:.6;cursor:wait}.lbp-admin-login-status{min-height:22px;margin-top:12px;font-size:13px;color:#f3c9c9}.lbp-admin-login-note{margin-top:16px;padding:11px 12px;background:#111722;border:1px solid #26354d;border-radius:10px;color:#bfd0e8;font-size:12px;line-height:1.5}.lbp-admin-session-tools{max-width:1240px;margin:12px auto 0;padding:0 18px;display:flex;gap:8px;flex-wrap:wrap;font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.lbp-admin-session-tools button{border:1px solid rgba(212,175,55,.4);background:#111118;color:#f0c967;border-radius:9px;padding:9px 12px;font-weight:800;cursor:pointer}.lbp-admin-session-tools .danger{border-color:#5b2730;color:#f4c5cb}
</style>
<script id="lbp-simple-admin-login-script">
/* ${MARKER} */
(function(){
'use strict';
function onAdmin(){return (location.pathname||'').replace(/\\/+$/,'')==='/admin'}
async function req(url,options){var o=Object.assign({credentials:'same-origin',headers:{Accept:'application/json'}},options||{});if(options&&options.headers)o.headers=Object.assign({Accept:'application/json'},options.headers);var r=await fetch(url,o),d=null;try{d=await r.json()}catch(e){}return{r:r,d:d}}
function removeGate(){var g=document.getElementById('lbp-admin-login-gate');if(g)g.remove()}
function showGate(message){
 if(!onAdmin())return;
 var existing=document.getElementById('lbp-admin-login-gate');if(existing){existing.hidden=false;if(message){var s=existing.querySelector('.lbp-admin-login-status');if(s)s.textContent=message}return}
 var gate=document.createElement('div');gate.id='lbp-admin-login-gate';gate.innerHTML='<form class="lbp-admin-login-card" id="lbp-admin-login-form"><div class="lbp-admin-login-kicker">Lunar Birthright</div><h1>Admin sign in</h1><p>Sign in directly to the Lunar Birthright administration page. This is separate from whichever ChatGPT account is open in your browser.</p><label for="lbp-admin-email">Admin email</label><input id="lbp-admin-email" type="email" autocomplete="username" inputmode="email" required placeholder="you@example.com"><label for="lbp-admin-password">Password</label><input id="lbp-admin-password" type="password" autocomplete="current-password" required placeholder="Your Lunar admin password"><button id="lbp-admin-login-submit" type="submit">Sign in to Lunar Admin</button><div class="lbp-admin-login-status" aria-live="polite"></div><div class="lbp-admin-login-note">Your ChatGPT subscription does not control Lunar Admin access. Lunar Admin uses the project’s own protected account and HttpOnly session cookie.</div></form>';
 document.body.appendChild(gate);
 var form=gate.querySelector('#lbp-admin-login-form'),status=gate.querySelector('.lbp-admin-login-status'),button=gate.querySelector('#lbp-admin-login-submit');
 if(message)status.textContent=message;
 form.addEventListener('submit',async function(e){e.preventDefault();status.textContent='Signing in…';button.disabled=true;try{var email=gate.querySelector('#lbp-admin-email').value.trim(),password=gate.querySelector('#lbp-admin-password').value;var x=await req('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});if(!x.r.ok)throw new Error((x.d&&x.d.detail)||'Email or password was not accepted');var me=await req('/api/auth/me');if(!me.r.ok||!me.d||!me.d.is_admin){await req('/api/auth/logout',{method:'POST'});throw new Error('This account is valid but does not have Lunar Admin access.');}status.textContent='Admin access confirmed. Opening registry…';location.replace('/admin');}catch(err){status.textContent=err&&err.message?err.message:'Unable to sign in';button.disabled=false}})
}
async function downloadBackup(){
 var btn=document.getElementById('lbp-admin-backup');if(btn)btn.disabled=true;
 try{var rows=await req('/api/admin/registry-audit?limit=250');if(!rows.r.ok)throw new Error((rows.d&&rows.d.detail)||'Could not read registry');var records=(rows.d&&rows.d.records)||[],details=[];for(var i=0;i<records.length;i++){var d=await req('/api/admin/record-detail?target_id='+encodeURIComponent(records[i].id));if(d.r.ok&&d.d)details.push(d.d)}var payload={kind:'lunar_birthright_authenticated_admin_backup',version:'1.0.0',exported_at:new Date().toISOString(),origin:location.origin,registry:rows.d,record_details:details};var blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),u=URL.createObjectURL(blob),a=document.createElement('a'),stamp=new Date().toISOString().replace(/[:.]/g,'-');a.href=u;a.download='lunar-admin-registry-backup-'+stamp+'.json';document.body.appendChild(a);a.click();a.remove();setTimeout(function(){URL.revokeObjectURL(u)},30000)}catch(e){alert(e.message||'Backup failed')}finally{if(btn)btn.disabled=false}
}
async function logout(){await req('/api/auth/logout',{method:'POST'});location.replace('/admin')}
function mountTools(){if(!onAdmin()||document.getElementById('lbp-admin-session-tools'))return;var host=document.createElement('div');host.id='lbp-admin-session-tools';host.className='lbp-admin-session-tools';host.innerHTML='<button id="lbp-admin-backup" type="button">Download Registry Backup</button><button id="lbp-admin-logout" class="danger" type="button">Sign out</button>';var anchor=document.getElementById('lbp-admin-audit');if(anchor&&anchor.parentNode)anchor.parentNode.insertBefore(host,anchor);else(document.querySelector('main')||document.body).appendChild(host);host.querySelector('#lbp-admin-backup').onclick=downloadBackup;host.querySelector('#lbp-admin-logout').onclick=logout}
async function boot(){if(!onAdmin())return;var me=await req('/api/auth/me');if(me.r.ok&&me.d&&me.d.is_admin){removeGate();mountTools();return}showGate(me.r.ok?'This account is not authorised for Lunar Admin.':'Please sign in to continue.')}
window.addEventListener('lbp-admin-auth-required',function(){showGate('Your Lunar Admin session is not signed in or has expired.')});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
var mo=new MutationObserver(function(){if(onAdmin()&&!document.getElementById('lbp-admin-login-gate'))mountTools()});mo.observe(document.documentElement,{subtree:true,childList:true});
})();
</script>`;

html = html.replace(/<style id="lbp-simple-admin-login-style">[\s\S]*?<\/style>\s*/i, '');
html = html.replace(/<script id="lbp-simple-admin-login-script">[\s\S]*?<\/script>\s*/i, '');
html = html.replace('</body>', injection + '\n</body>');

if (!html.includes(MARKER)) throw new Error('simple native Admin login marker missing');
if (!html.includes('/api/auth/login') || !html.includes('/api/auth/me')) throw new Error('native auth routes missing from Admin login patch');
if (html.includes("location.assign('/login?redirect=/admin')")) throw new Error('legacy Admin generic-login redirect still present');

fs.writeFileSync(indexPath, html, 'utf8');
console.log('LBP_SIMPLE_NATIVE_ADMIN_LOGIN_OK');
