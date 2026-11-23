"""Add collapsible navigation to both maintained anime artifacts without rebuilding their UI."""
from pathlib import Path
import re,shutil
ROOT=Path(__file__).resolve().parents[1]
css='''/* IC_COLLAPSIBLE_NAVIGATION */
.shell{grid-template-columns:240px minmax(0,1fr);transition:grid-template-columns .22s ease}
body[data-sidebar="closed"] .shell{grid-template-columns:0 minmax(0,1fr)}
body .sidebar{width:240px;min-width:0;overflow:hidden;transition:transform .22s ease,visibility .22s;z-index:60}
body[data-sidebar="closed"] .sidebar{transform:translateX(-100%);visibility:hidden;pointer-events:none}
.sidebar-header{display:flex;align-items:flex-start;gap:6px;margin-bottom:30px;flex-shrink:0}
body .sidebar-header .brand{flex:1;min-width:0;margin:0;font-size:21px;gap:9px}
body .sidebar-header .brandmark{width:40px;height:40px;flex-shrink:0}
.sidebar-toggle{display:inline-grid;place-items:center;border:1px solid var(--line);background:var(--paper,#fff);color:var(--green);width:35px;height:35px;border-radius:10px;flex-shrink:0}
.sidebar-toggle:hover{background:var(--accent-light,#eaf2eb)}
.sidebar-header .sidebar-toggle{width:27px;height:29px;border-color:transparent;background:transparent}
body .sidebar #nav{display:flex;flex-direction:column;gap:5px;flex:1;min-height:0;overflow-y:auto;overflow-x:hidden;scrollbar-width:thin}
body .sidebar .navbtn{width:100%;flex:none;font-size:14px;font-weight:650;line-height:1.45;padding:12px 11px;min-height:44px}
body[data-palette] .sidebar .navbtn{color:var(--ink)}
body .sidebar .navbtn.active{font-weight:800}
body .sidebar .navbtn svg{width:18px;height:18px}
body .sidebar .navbtn .count{display:inline-block;font-size:11px;font-weight:750}
.sidebar-scrim{display:none}
body .topbar{height:auto;min-height:74px;position:relative;z-index:40;padding-top:10px;padding-bottom:10px;flex-wrap:wrap}
.breadcrumb-nav{display:flex;align-items:center;gap:10px;min-width:0;flex-shrink:0}
.breadcrumb-path{display:flex;align-items:center;gap:4px;min-width:0}
.crumb-home,.breadcrumb-picker>summary{display:flex;align-items:center;gap:7px;border:0;background:transparent;border-radius:8px;padding:8px;color:var(--ink);font-size:13px;line-height:1.4;cursor:pointer;white-space:nowrap}
.crumb-home{color:var(--muted);font-weight:600}
.crumb-home:hover,.breadcrumb-picker>summary:hover,.breadcrumb-picker[open]>summary{background:var(--accent-light,#eaf2eb);color:var(--green)}
.crumb-separator{color:var(--muted);display:inline-flex;align-items:center}
.breadcrumb-picker{position:relative}
.breadcrumb-picker>summary{list-style:none;font-weight:750}
.breadcrumb-picker>summary::-webkit-details-marker{display:none}
.breadcrumb-picker>summary b{font-weight:750;max-width:180px;overflow:hidden;text-overflow:ellipsis}
.breadcrumb-picker[open]>summary .crumb-down{transform:rotate(180deg)}
.breadcrumb-links{display:grid;grid-template-columns:minmax(0,1fr);gap:2px;overflow-x:hidden;position:absolute;top:calc(100% + 9px);left:0;width:255px;max-width:calc(100vw - 28px);max-height:min(65vh,520px);overflow-y:auto;padding:8px;background:var(--surface,var(--paper,#fff));border:1px solid var(--line);border-radius:14px;box-shadow:0 14px 45px #29263d26;z-index:90}
.breadcrumb-links button{display:flex;align-items:center;gap:11px;border:0;background:transparent;text-align:left;width:100%;border-radius:8px;padding:10px 12px;min-height:40px;font-size:14px;font-weight:600;color:var(--ink)}
.breadcrumb-links button:hover,.breadcrumb-links button[aria-current="page"]{background:var(--accent-light,#eaf2eb);color:var(--green)}
.breadcrumb-links button[aria-current="page"]{font-weight:800}
@media(max-width:800px){
 .shell,body[data-sidebar="closed"] .shell{display:block}
 body .sidebar{position:fixed;inset:0 auto 0 0;height:100vh;height:100dvh;width:min(280px,86vw);padding:24px 18px;border-right:1px solid var(--line);border-bottom:0;z-index:100;box-shadow:8px 0 35px #29263d1a}
 body[data-sidebar="open"]{overflow:hidden}
 body[data-sidebar="open"] .sidebar-scrim{display:block;position:fixed;inset:0;width:100%;height:100%;border:0;background:#28243b55;backdrop-filter:blur(3px);z-index:90;cursor:default}
 body .sidebar .navtitle{display:block;margin-top:0}
 body .sidebar .navbtn{font-size:14px;padding:12px}
 body .topbar{min-height:68px;padding:12px 18px;gap:8px 14px}
 .breadcrumb-nav{gap:8px;flex:1 1 auto}
 .breadcrumb-links{left:auto;right:0}
}
@media(max-width:600px){
 body .topbar .breadcrumb-nav{display:flex;width:100%;justify-content:flex-start}
 body .topbar .topright{width:100%;justify-content:space-between;gap:8px}
 .crumb-home,.breadcrumb-picker>summary{font-size:12px;padding:7px 5px}
 .breadcrumb-picker>summary b{max-width:155px}
 .breadcrumb-links{position:fixed;top:auto;left:14px;right:14px;width:auto;max-width:none;margin-top:8px}
}
@media(prefers-reduced-motion:reduce){.shell,body .sidebar{transition:none}}
@media print{.sidebar-scrim,.breadcrumb-nav{display:none!important}}
/* END_IC_COLLAPSIBLE_NAVIGATION */'''
panel='''<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3"/><path d="M9 4v16m-3-11h0m0 3h0"/></svg>'''
arrow='''<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m9 5 7 7-7 7"/></svg>'''
down='''<svg class="crumb-down" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>'''
top=f'''<div class="breadcrumb-nav"><button id="sidebar-toggle" class="sidebar-toggle" type="button" data-navigation="toggle" aria-controls="study-sidebar" aria-expanded="true" aria-label="Thu gọn thanh bên" title="Thu gọn thanh bên">{panel}</button><nav class="breadcrumb-path" aria-label="Đường dẫn"><button class="crumb-home" type="button" data-act="nav" data-view="home" title="Về tổng quan">Không gian học</button><span class="crumb-separator" aria-hidden="true">{arrow}</span><details class="breadcrumb-picker" id="breadcrumb-picker"><summary aria-label="Chuyển mục học"><b id="breadcrumb">Tổng quan</b>{down}</summary><nav class="breadcrumb-links" id="breadcrumb-links" aria-label="Chuyển mục nhanh"></nav></details></nav></div>'''
js=r'''/* IC_NAVIGATION_BEHAVIOR */
(()=>{
 const storageKey='ic-study-sidebar-v1',media=window.matchMedia('(max-width:800px)');
 const sidebar=document.getElementById('study-sidebar'),workspace=document.querySelector('.workspace'),toggle=document.getElementById('sidebar-toggle'),picker=document.getElementById('breadcrumb-picker');
 let preference='open';try{preference=localStorage.getItem(storageKey)||'open'}catch(e){}
 function setSidebar(open,{save=false,focus=false}={}){
  document.body.dataset.sidebar=open?'open':'closed';sidebar.inert=!open;sidebar.setAttribute('aria-hidden',String(!open));workspace.inert=media.matches&&open;
  for(const b of document.querySelectorAll('[data-navigation="toggle"]'))b.setAttribute('aria-expanded',String(open));
  const label=open?'Thu gọn thanh bên':'Hiện thanh bên';toggle.setAttribute('aria-label',label);toggle.title=label;
  if(save&&!media.matches){preference=open?'open':'closed';try{localStorage.setItem(storageKey,preference)}catch(e){}}
  if(focus){if(open&&media.matches)sidebar.querySelector('[data-navigation="toggle"]').focus();else toggle.focus()}
 }
 function closeQuickMenu(focus=false){picker.open=false;if(focus)picker.querySelector('summary').focus()}
 document.addEventListener('click',e=>{
  const control=e.target.closest('[data-navigation]');
  if(control){if(control.dataset.navigation==='toggle')setSidebar(document.body.dataset.sidebar!=='open',{save:true,focus:true});else if(control.dataset.navigation==='close')setSidebar(false,{focus:true});return}
  if(e.target.closest('[data-act="nav"]')){const fromPicker=!!e.target.closest('#breadcrumb-picker');closeQuickMenu(fromPicker);if(media.matches&&e.target.closest('#study-sidebar'))setSidebar(false,{focus:true})}
  else if(!e.target.closest('#breadcrumb-picker'))closeQuickMenu();
 },true);
 document.addEventListener('keydown',e=>{if(e.key!=='Escape')return;if(picker.open){closeQuickMenu(true);e.preventDefault()}else if(media.matches&&document.body.dataset.sidebar==='open'){setSidebar(false,{focus:true});e.preventDefault()}});
 media.addEventListener('change',()=>{closeQuickMenu();setSidebar(!media.matches&&preference!=='closed')});
 setSidebar(!media.matches&&preference!=='closed');
})();
/* END_IC_NAVIGATION_BEHAVIOR */'''
for p in [ROOT/'IC_Study_Anime.html',ROOT/'ic-study-online/source/study.html']:
 s=p.read_text(encoding='utf-8')
 if 'IC_COLLAPSIBLE_NAVIGATION' in s:raise SystemExit('Navigation already installed: '+str(p))
 backup=ROOT/'backups/before-collapsible-navigation-2026-11-09';backup.mkdir(parents=True,exist_ok=True)
 dest=backup/('offline.html' if p.name=='IC_Study_Anime.html' else 'online-source.html')
 if not dest.exists():shutil.copy2(p,dest)
 s=s.replace('</head>','<style>\n'+css+'\n</style>\n</head>',1)
 s=s.replace('<aside class="sidebar">','<button class="sidebar-scrim" data-navigation="close" aria-label="Đóng thanh bên" tabindex="-1"></button><aside class="sidebar" id="study-sidebar" aria-label="Menu học tập"><div class="sidebar-header">',1)
 anchor='</a><div class="navtitle">KHÔNG GIAN HỌC</div>'
 assert anchor in s
 s=s.replace(anchor,'</a><button class="sidebar-toggle" data-navigation="toggle" type="button" aria-controls="study-sidebar" aria-expanded="true" aria-label="Thu gọn thanh bên" title="Thu gọn thanh bên">'+arrow+'</button></div><div class="navtitle">KHÔNG GIAN HỌC</div>',1)
 old='<span class="breadcrumb">Không gian học <span>/</span> <b id="breadcrumb">Tổng quan</b></span>'
 assert old in s;s=s.replace(old,top,1)
 anchor="$('breadcrumb').textContent="
 assert anchor in s
 s=s.replace(anchor,"$('breadcrumb-links').innerHTML=items.map(([v,i,t])=>`<button type=\"button\" data-act=\"nav\" data-view=\"${v}\" ${view===v||(view==='player'&&S.session?.mode===v)?'aria-current=\"page\"':''}>${icon(i)}<span>${t}</span></button>`).join('');"+anchor,1)
 s=s.replace("e.target.closest('input,textarea,select,[contenteditable]')","e.target.closest('input,textarea,select,[contenteditable],.breadcrumb-nav,.sidebar-toggle,.sidebar-scrim,#study-sidebar')",1)
 bootstrap="<script>try{document.body.dataset.sidebar=window.matchMedia('(max-width:800px)').matches?'closed':localStorage.getItem('ic-study-sidebar-v1')||'open'}catch(e){document.body.dataset.sidebar='open'}</script>"
 s=re.sub(r'(<body[^>]*>)',lambda m:m[1]+bootstrap,s,count=1)
 s=s.replace('</body>','<script id="ic-navigation-script">\n'+js+'\n</script></body>',1)
 p.write_text(s,encoding='utf-8')
print('Installed collapsible sidebar, stronger menu text and interactive breadcrumbs in both anime artifacts.')
