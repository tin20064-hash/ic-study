// Original image bytes live in the account's private R2 object. IndexedDB is an offline cache.
const icWallKey='ic-wallpaper-sync:'+IC_BOOT.user.id;
let icWall={revision:null,pending:null,managed:false},icWallKnown=false,icWallBusy=false,icWallGeneration=0,icWallFile=null;
let icWallMessage='Đang kiểm tra ảnh nền tài khoản…',icWallFailed=false;
try{const saved=JSON.parse(localStorage.getItem(icWallKey)||'null');if(saved&&typeof saved==='object')icWall={...icWall,...saved}}catch{}
function icSaveWall(){try{localStorage.setItem(icWallKey,JSON.stringify(icWall))}catch{}}
function icWallpaperStatus(){return icWallMessage}
function icSetWallStatus(message){icWallMessage=message;document.querySelectorAll('[data-ic-wall-status]').forEach(el=>{el.textContent=message})}
function icHasPendingWallpaper(){return !!icWall.pending}
async function icWallRequest(method,blob,name){
 const headers={'x-ic-request':'1','x-ic-wallpaper-version':icWall.revision||'none'};
 if(blob){headers['content-type']=blob.type||'application/octet-stream';headers['x-ic-wallpaper-name']=encodeURIComponent(name||'Ảnh nền');}
 const response=await fetch('/api/wallpaper',{method,headers,...(blob?{body:blob}:{})});
 const result=await response.json();if(!response.ok){const error=Error(result.error||'Chưa đồng bộ được ảnh nền.');error.status=response.status;throw error}return result;
}
async function icLocalWallpaper(){
 if(icWallFile)return {blob:icWallFile,name:icWallFile.name||look.name};
 try{const record=await wallStorage('get');if(record?.blob)return record}catch{}
 if(look.wallpaper){const response=await fetch(localOriginalData||look.wallpaper);return {blob:await response.blob(),name:look.name}}
 return null;
}
function icWallpaperSelected(file){
 ++icWallGeneration;icWallFile=file;icWall.pending='upload';icWallFailed=false;icSaveWall();
 icSetWallStatus('Ảnh đã lưu trên máy · Đang đồng bộ ảnh gốc vào tài khoản…');void icFlushWallpaper();
}
function icWallpaperReset(){
 ++icWallGeneration;icWallFile=null;icWall.pending='reset';icWallFailed=false;icSaveWall();
 icSetWallStatus('Đang đồng bộ lựa chọn dùng nền mặc định…');void icFlushWallpaper();
}
async function icFlushWallpaper(force=false){
 if(icWallBusy||!icWall.pending)return;
 icWallBusy=true;icWallFailed=false;const generation=icWallGeneration,pending=icWall.pending;
 try{
  await window.icLocalWallpaperReady;
  if(!icWallKnown||force){const remote=await icApi('/api/wallpaper');if(!icWall.managed||force)icWall.revision=remote.revision;icWallKnown=true;}
  if(generation!==icWallGeneration)return;
  let record=null;
  if(pending==='upload'){
   record=await icLocalWallpaper();if(!record?.blob)throw Error('Chưa tìm thấy ảnh gốc ở máy này. Hãy chọn lại file ảnh để đồng bộ.');
   if(record.blob.size>20*1024*1024)throw Error('Ảnh đang giữ ở máy lớn hơn 20 MB. Hãy chọn ảnh tối đa 20 MB để đồng bộ nguyên chất lượng.');
  }
  if(generation!==icWallGeneration)return;
  icSetWallStatus(pending==='upload'?'Đang tải ảnh gốc lên tài khoản…':'Đang lưu nền mặc định vào tài khoản…');
  const result=await icWallRequest(pending==='upload'?'PUT':'DELETE',record?.blob,record?.name);
  icWall.revision=result.revision;icWall.managed=true;
  if(generation===icWallGeneration){icWall.pending=null;icWallFile=null;icSetWallStatus(pending==='upload'?'✓ Ảnh gốc đã đồng bộ · Dùng được trên các thiết bị khác':'✓ Nền mặc định đã đồng bộ theo tài khoản');toast(pending==='upload'?'Đã đồng bộ ảnh nền vào tài khoản.':'Đã đồng bộ nền mặc định.');}
  icSaveWall();
 }catch(error){icWallFailed=true;icSetWallStatus(error.status===409?'Ảnh tài khoản đã đổi ở nơi khác. Chọn “Tải từ tài khoản” hoặc “Đồng bộ ảnh máy này”.':error.message||'Chưa có mạng · Ảnh vẫn được giữ trên máy, sẽ thử lại khi kết nối.');}
 finally{icWallBusy=false;if(icWall.pending&&!icWallFailed)void icFlushWallpaper();}
}
async function icApplyAccountWallpaper(remote,generation){
 const source=sourceVersion;
 if(remote.wallpaper){
  const response=await fetch(remote.wallpaper.url,{cache:'no-store'});if(!response.ok)throw Error('Chưa tải được ảnh từ tài khoản. Ảnh trên máy vẫn được giữ.');
  const blob=await response.blob(),url=URL.createObjectURL(blob);let dims;
  try{dims=await getImageDimensions(url)}catch(error){URL.revokeObjectURL(url);throw error}
  if(generation!==icWallGeneration||source!==sourceVersion){URL.revokeObjectURL(url);return false}
  ++sourceVersion;clearProcessed();if(rawBlobUrl)URL.revokeObjectURL(rawBlobUrl);
  rawBlobUrl=url;localOriginalData=null;
  Object.assign(look,{wallpaper:url,source:'original',persisted:true,width:dims.width,height:dims.height,name:remote.wallpaper.name,size:blob.size});
  try{await wallStorage('put',{blob,...dims,name:look.name,size:blob.size,type:blob.type,cloudRevision:remote.revision})}catch{}
 }else{
  if(generation!==icWallGeneration||source!==sourceVersion)return false;
  ++sourceVersion;clearProcessed();if(rawBlobUrl){URL.revokeObjectURL(rawBlobUrl);rawBlobUrl=null}
  localOriginalData=null;Object.assign(look,DEFAULT_WALLPAPER.appearance);
  try{await wallStorage('delete')}catch{}
 }
 // Do not let an older async download replace a new local selection/reset.
 if(generation!==icWallGeneration)return false;
 applyLook(false);saveLookSettings();
 if(document.querySelector('#modal[open] .look-preview'))appearancePanel();
 return true;
}
async function icRestoreAccountWallpaper(discardPending=false){
 if(icWallBusy)return;
 if(discardPending){++icWallGeneration;icWall.pending=null;icWallFile=null;icSaveWall();}
 if(icWall.pending){await icFlushWallpaper();return;}
 const generation=icWallGeneration;icWallBusy=true;
 try{
  await window.icLocalWallpaperReady;
  const remote=await icApi('/api/wallpaper');icWallKnown=true;if(!icWall.managed)icWall.revision=remote.revision;
  if(generation!==icWallGeneration)return;
  if(remote.revision){
   if(icWall.revision!==remote.revision||!icWall.managed||(remote.wallpaper?!look.wallpaper:!!look.wallpaper)){
    icSetWallStatus('Đang tải ảnh nền đã lưu trong tài khoản…');
    if(!await icApplyAccountWallpaper(remote,generation))return;
   }
   icWall.revision=remote.revision;icWall.managed=true;icSaveWall();
   icSetWallStatus(remote.wallpaper?'✓ Ảnh gốc đã đồng bộ theo tài khoản':'✓ Đang dùng nền mặc định của tài khoản');
  }else if(look.wallpaper){
   // First upgrade: migrate the original bytes already cached in this browser.
   icWall.revision=null;icWall.managed=false;icWall.pending='upload';icSaveWall();icSetWallStatus('Đang chuyển ảnh đã lưu trên máy vào tài khoản…');
  }else{icWall.revision=null;icWall.managed=true;icSaveWall();icSetWallStatus('Chưa có ảnh riêng · Ảnh bạn tải lên sẽ tự đồng bộ theo tài khoản.');}
 }catch(error){icSetWallStatus(error.message||'Chưa kết nối kho ảnh. Ảnh trên máy vẫn được giữ.');}
 finally{icWallBusy=false;if(icWall.pending&&!icWallFailed)void icFlushWallpaper();}
}
document.addEventListener('click',async event=>{
 const button=event.target.closest('[data-ic-wall]');if(!button)return;
 if(button.dataset.icWall==='retry'){if(!icWall.pending&&look.wallpaper){icWall.pending='upload';icSaveWall();}icWallFailed=false;await icFlushWallpaper(true);}
 else if(button.dataset.icWall==='restore')await icRestoreAccountWallpaper(true);
});
addEventListener('online',()=>{icWallFailed=false;if(icWall.pending)void icFlushWallpaper();else void icRestoreAccountWallpaper()});
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&!icWall.pending)void icRestoreAccountWallpaper()});
void icRestoreAccountWallpaper();
