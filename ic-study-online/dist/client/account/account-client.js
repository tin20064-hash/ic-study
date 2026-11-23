let icRevision=IC_BOOT.revision,icDirty=false,icSending=false,icTimer=null,icConflict=false,icLastSerialized='',icFlight=null,icReading=false;
const icMetaKey='ic-sync:'+IC_BOOT.user.id;
const icBaseKey='ic-sync-base:'+IC_BOOT.user.id;
function icReadLocal(key){try{return JSON.parse(localStorage.getItem(key)||'null')}catch{return null}}
function icWriteLocal(key,value){try{localStorage.setItem(key,JSON.stringify(value))}catch{}}
let icBase=icReadLocal(icBaseKey);
async function icApi(path,method='GET',data){const r=await fetch(path,{method,headers:{'content-type':'application/json','x-ic-request':'1'},...(data?{body:JSON.stringify(data)}:{})});const out=await r.json();if(!r.ok){const e=Error(out.error||'Chưa kết nối được máy chủ.');e.status=r.status;throw e}return out}
function icSetStatus(text,error=false){const el=document.getElementById('ic-sync-status');if(el){el.textContent=text;el.dataset.error=String(error)}}
function icShowConflictBanner(message){
 document.querySelectorAll('.ic-sync-banner').forEach(el=>el.remove());
 const box=document.createElement('section');box.className='ic-sync-banner';box.setAttribute('role','alert');
 const close=document.createElement('button');close.type='button';close.className='ic-banner-close';close.setAttribute('aria-label','Đóng thông báo');close.title='Đóng thông báo';close.textContent='×';close.onclick=()=>box.remove();
 const text=document.createElement('p');text.textContent=message;
 const backup=document.createElement('button');backup.type='button';backup.textContent='Xuất bản sao hiện tại';backup.onclick=()=>download('ic-study-tien-do-chua-dong-bo.json',S);
 box.append(close,text,backup);document.body.append(box);
}
function icQueueSync(){
 if(typeof S==='undefined')return;
 if(typeof look!=='undefined')S.accountLook={palette:look.palette,opacity:look.opacity,effects:look.effects,fit:look.fit,glass:look.glass===true};
 const serialized=JSON.stringify(S);if(serialized===icLastSerialized&&!icDirty)return;
 icDirty=true;icWriteLocal(KEY,S);icWriteLocal(icMetaKey,{revision:icRevision,dirty:true});icSetStatus(icConflict?'Cần đăng nhập lại':'Đang chờ đồng bộ…',icConflict);clearTimeout(icTimer);if(!icConflict)icTimer=setTimeout(icFlush,700);
}
function icApplyState(state){
 const changed=JSON.stringify(S)!==JSON.stringify(state),paletteBefore=JSON.stringify(S.accountLook);S=state;icWriteLocal(KEY,S);
 if(paletteBefore!==JSON.stringify(S.accountLook)&&S.accountLook&&typeof look!=='undefined'){
  for(const key of ['palette','opacity','effects','fit','glass'])if(S.accountLook[key]!==undefined)look[key]=S.accountLook[key];
  applyLook(false);saveLookSettings();
 }
 if(changed&&!document.getElementById('modal')?.open&&!['INPUT','TEXTAREA','SELECT'].includes(document.activeElement?.tagName)){
  const x=window.scrollX,y=window.scrollY;restoreSessionDraft();render();window.scrollTo({left:x,top:y,behavior:'instant'});
 }
}
function icAcceptCloud(out,{keepActive=typeof view==='undefined'||view==='player'}={}){
 const remote=out.state?validate(out.state):initial();
 const merged=icReconcileProgress(S,remote,icBase,{preserveActive:keepActive});
 icBase=remote;icRevision=out.revision;icWriteLocal(icBaseKey,remote);icLastSerialized=JSON.stringify(remote);
 icApplyState(merged);icDirty=JSON.stringify(S)!==icLastSerialized;icWriteLocal(icMetaKey,{revision:icRevision,dirty:icDirty});
}
function icFlush(){
 if(icFlight)return icFlight;if(!icDirty||icConflict)return Promise.resolve();
 icFlight=icSend().finally(()=>{icFlight=null});return icFlight;
}
async function icSend(){
 icSending=true;clearTimeout(icTimer);icSetStatus('Đang lưu lên tài khoản…');
 try{
  for(let attempt=0;attempt<3&&icDirty;attempt++){
   const snapshot=JSON.stringify(S);
   try{
    const out=await icApi('/api/progress','PUT',{revision:icRevision,state:JSON.parse(snapshot)});
    icRevision=out.revision;icBase=JSON.parse(snapshot);icWriteLocal(icBaseKey,icBase);icLastSerialized=snapshot;
    icDirty=JSON.stringify(S)!==snapshot;icWriteLocal(icMetaKey,{revision:icRevision,dirty:icDirty});
    localStorage.removeItem('ic-recovery:'+IC_BOOT.user.id);
   }catch(e){if(e.status!==409)throw e;icSetStatus('Đang gộp tiến độ các thiết bị…');icAcceptCloud(await icApi('/api/progress'));}
  }
  icSetStatus(icDirty?'Đang chờ đồng bộ…':'✓ Đã lưu vào tài khoản');
 }catch(e){if(e.status===401)icConflict=true;icSetStatus(e.status===401?'Cần đăng nhập lại':'Mất kết nối · Sẽ tự lưu khi có mạng',true)}
 finally{icSending=false;if(icDirty&&!icConflict)icTimer=setTimeout(icFlush,5000)}
}
async function icRefreshCloud(){
 if(icSending||icReading||icConflict||document.visibilityState==='hidden')return;
 if(icDirty){await icFlush();return}icReading=true;
 try{
  const out=await icApi('/api/progress');if(out.revision>icRevision){
   // A user may answer while the GET is in flight. Reconcile against that live state.
   const hadLocalEdits=icDirty;icAcceptCloud(out);
   if(!hadLocalEdits){icDirty=false;icLastSerialized=JSON.stringify(S);icWriteLocal(icMetaKey,{revision:icRevision,dirty:false})}
   icSetStatus(icDirty?'Đang chờ đồng bộ…':'✓ Đã lưu vào tài khoản');if(icDirty)icTimer=setTimeout(icFlush,700);
  }
 }catch(e){if(e.status===401){icConflict=true;icSetStatus('Cần đăng nhập lại',true)}}finally{icReading=false}
}
function icAccountPanel(){modal(`<h2>${esc(IC_BOOT.user.name)}</h2><p>${esc(IC_BOOT.user.username)} · ${IC_BOOT.user.role==='admin'?'Admin':'Học viên'}</p><div class="ic-account-actions">${IC_BOOT.user.role==='admin'?'<a class="btn" href="/admin">Quản lý học viên →</a>':''}<button class="btn" data-ic="sync">Đồng bộ ngay</button><button class="btn" data-ic="logout">Đăng xuất</button></div><details class="ic-backup-tools"><summary>Sao lưu &amp; nhập tiến độ cũ</summary><p>Web tự lưu theo tài khoản. Chỉ cần các nút này khi chuyển bài làm từ file HTML hoặc muốn giữ thêm bản sao.</p><div class="ic-account-actions"><button class="btn" data-act="backup">Xuất bản sao tiến độ</button><button class="btn" data-ic="import">Nhập từ file HTML / JSON</button></div></details><h3 style="font-size:16px">Đổi mật khẩu</h3><form id="ic-password-form" class="ic-account-form"><label>Mật khẩu hiện tại<input name="current" type="password" autocomplete="current-password" required maxlength="128"></label><label>Mật khẩu mới (ít nhất 12 ký tự)<input name="next" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label>Nhập lại mật khẩu mới<input name="repeat" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><p id="ic-account-error" class="ic-account-error" role="alert"></p><button class="btn primary">Lưu mật khẩu mới</button></form><p style="font-size:11px;margin-top:20px">Tiến độ, bảng màu và ảnh nền tải lên được đồng bộ theo tài khoản. Ảnh gốc tối đa 20 MB, không bị nén lại. Trình duyệt giữ thêm bản ảnh để dùng khi mất mạng.</p>`)}
function icImportPanel(){modal(`<h2>Tiếp tục tiến độ từ file HTML</h2><p>1. Mở đúng file HTML và trình duyệt bạn đã dùng để học.<br>2. Chọn <strong>Xuất bản sao tiến độ</strong> để tải file JSON.<br>3. Nhấn nút bên dưới, chọn file JSON đó rồi xác nhận gộp vào tài khoản.</p><p>Web sẽ giữ ${Object.keys(S.responses).length} câu hiện có và gộp thêm bài làm từ HTML. Các phiên học cũng được chuyển để bạn tiếp tục đúng chỗ cũ.</p><p style="font-size:12px">Nếu file xuất ghi 0 câu, hãy quay lại đúng file cũ và đúng trình duyệt trước khi xuất. Trang web không thể tự đọc dữ liệu lưu trong một file trên máy.</p><div class="btnrow">${btn('Chọn file tiến độ JSON','import','','primary')}${btn('Xuất bản sao tiến độ web','backup')}</div>`)}
const icStrip=document.createElement('div');icStrip.className='ic-account-strip';icStrip.innerHTML=`<span id="ic-sync-status" class="account-sync-state" role="status">✓ Đã lưu vào tài khoản</span><button class="textbtn ic-account-button" data-ic="account" aria-label="Mở tài khoản và sao lưu">${esc(IC_BOOT.user.name)} · Tài khoản ▾</button>`;document.querySelector('.topright').append(icStrip);
document.querySelector('.topright .avatar')?.remove();

document.addEventListener('click',async e=>{const b=e.target.closest('[data-ic]');if(!b)return;if(b.dataset.ic==='account')icAccountPanel();if(b.dataset.ic==='sync'){await icFlush();if(typeof icFlushWallpaper==='function')await icFlushWallpaper();toast(icDirty?'Đang chờ đồng bộ.':'Đã lưu tiến độ vào tài khoản.')}if(b.dataset.ic==='logout'){await icFlush();if(typeof icFlushWallpaper==='function')await icFlushWallpaper();if(icDirty||typeof icHasPendingWallpaper==='function'&&icHasPendingWallpaper()){toast('Còn tiến độ hoặc ảnh nền chưa đồng bộ. Hãy đồng bộ xong trước khi đăng xuất.');return}await icApi('/api/logout','POST',{});location.assign('/')}});
document.addEventListener('click',e=>{if(e.target.closest('[data-ic="import"]'))icImportPanel()});
document.addEventListener('submit',async e=>{if(e.target.id!=='ic-password-form')return;e.preventDefault();const f=e.target,error=document.getElementById('ic-account-error');if(f.elements.next.value!==f.elements.repeat.value){error.textContent='Hai mật khẩu mới chưa giống nhau.';return}const button=f.querySelector('button');button.disabled=true;try{await icApi('/api/password','POST',{currentPassword:f.elements.current.value,password:f.elements.next.value});f.reset();toast('Đã đổi mật khẩu. Các phiên đăng nhập khác đã được đăng xuất.');document.getElementById('modal').close()}catch(e){error.textContent=e.message}finally{button.disabled=false}});
addEventListener('online',()=>{if(!icConflict){icFlush();icRefreshCloud()}});
addEventListener('focus',()=>icRefreshCloud());
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')icFlush();else icRefreshCloud()});
setInterval(icRefreshCloud,15000);
const icPreviousMeta=icReadLocal(icMetaKey),icCloud=IC_BOOT.state?validate(IC_BOOT.state):initial();
const icRecovery=icReadLocal('ic-recovery:'+IC_BOOT.user.id);
if(icPreviousMeta?.dirty||icRecovery){
 if(icRecovery){try{S=icReconcileProgress(S,validate(icRecovery),null,{preserveActive:false})}catch{}}
 icApplyState(icReconcileProgress(S,icCloud,icBase,{preserveActive:false}));
}
icBase=icCloud;icWriteLocal(icBaseKey,icBase);icLastSerialized=JSON.stringify(icCloud);
icDirty=JSON.stringify(S)!==icLastSerialized;icWriteLocal(KEY,S);icWriteLocal(icMetaKey,{revision:icRevision,dirty:icDirty});
if(icDirty)icFlush();else icSetStatus('✓ Đã lưu vào tài khoản');
