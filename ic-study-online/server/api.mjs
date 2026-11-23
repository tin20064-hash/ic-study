const encoder=new TextEncoder();
const cookieName='__Host-icstudy';
const lifetime=7*24*60*60*1000;
class HttpError extends Error{constructor(status,message){super(message);this.status=status}}
const json=(data,status=200,headers={})=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json; charset=utf-8','cache-control':'no-store',...headers}});
const random=()=>Array.from(crypto.getRandomValues(new Uint8Array(24)),n=>n.toString(16).padStart(2,'0')).join('');
const sha=async s=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(s))),n=>n.toString(16).padStart(2,'0')).join('');
const safeUser=u=>({id:u.id,username:u.username,name:u.display_name,role:u.role,disabled:!!u.disabled,createdAt:u.created_at,lastLogin:u.last_login});
async function passwordHash(password,salt=random().slice(0,32)){
 const key=await crypto.subtle.importKey('raw',encoder.encode(password),'PBKDF2',false,['deriveBits']);
 const bits=await crypto.subtle.deriveBits({name:'PBKDF2',salt:encoder.encode(salt),iterations:100000,hash:'SHA-256'},key,256);
 return 'pbkdf2$100000$'+salt+'$'+Array.from(new Uint8Array(bits),n=>n.toString(16).padStart(2,'0')).join('');
}
async function verifyPassword(password,stored){
 const parts=String(stored).split('$');if(parts.length!==4||parts[0]!=='pbkdf2'||parts[1]!=='100000')return false;
 const candidate=await passwordHash(password,parts[2]);let difference=candidate.length^stored.length;for(let i=0;i<candidate.length;i++)difference|=candidate.charCodeAt(i)^stored.charCodeAt(i);return difference===0;
}
async function body(request){
 const size=Number(request.headers.get('content-length'));if(size>1500000)throw new HttpError(413,'Dữ liệu quá lớn. Hãy xuất bớt các phiên cũ.');
 const raw=await request.text();if(raw.length>1500000)throw new HttpError(413,'Dữ liệu quá lớn.');try{return JSON.parse(raw)}catch{throw new HttpError(400,'Dữ liệu không hợp lệ.')}
}
function csrf(request){if(!['GET','HEAD'].includes(request.method)&&(request.headers.get('origin')!==new URL(request.url).origin||request.headers.get('x-ic-request')!=='1'))throw new HttpError(403,'Yêu cầu không hợp lệ. Hãy tải lại trang.');}
function checkPassword(value){if(typeof value!=='string'||value.length<12||value.length>128)throw new HttpError(400,'Mật khẩu cần từ 12 đến 128 ký tự.');}
async function initialAdmin(env){
 if(!env.IC_ADMIN_HASH||!env.IC_ADMIN_USERNAME)throw new HttpError(503,'Trang đang được cấu hình tài khoản quản trị.');
 await env.DB.prepare('INSERT OR IGNORE INTO users (id,username,display_name,role,password_hash,disabled,created_at) VALUES (?,?,?,?,?,0,?)').bind('initial-admin',env.IC_ADMIN_USERNAME,'Quản trị IC Study','admin',env.IC_ADMIN_HASH,Date.now()).run();
}
async function identity(request,env){
 const token=(request.headers.get('cookie')||'').split(';').map(v=>v.trim()).find(v=>v.startsWith(cookieName+'='))?.slice(cookieName.length+1);
 if(!token||!/^[a-f0-9]{48}$/.test(token))return null;
 return await env.DB.prepare('SELECT u.*, s.token_hash AS session_hash FROM auth_sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires>? AND u.disabled=0').bind(await sha(token),Date.now()).first();
}
async function authorized(request,env,admin=false){const u=await identity(request,env);if(!u)throw new HttpError(401,'Vui lòng đăng nhập.');if(admin&&u.role!=='admin')throw new HttpError(403,'Chỉ admin được sử dụng chức năng này.');return u}
async function audit(env,u,action,target=null){await env.DB.prepare('INSERT INTO audit (id,actor_id,action,target_id,at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),u.id,action,target,Date.now()).run()}
const cookie=(token,age=604800)=>`${cookieName}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`;
async function throttled(env,key,limit){const row=await env.DB.prepare('SELECT * FROM auth_limits WHERE key=?').bind(key).first();if(row&&Date.now()-row.started_at<600000&&row.attempts>=limit)throw new HttpError(429,'Thử lại sau 10 phút vì đã có quá nhiều lần đăng nhập.');}
async function increment(env,key){await env.DB.prepare('INSERT INTO auth_limits (key,attempts,started_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN started_at<? THEN 1 ELSE attempts+1 END,started_at=CASE WHEN started_at<? THEN excluded.started_at ELSE started_at END').bind(key,Date.now(),Date.now()-600000,Date.now()-600000).run()}
function validAnswerValues(id,a){const n=Object.hasOwn(QUESTION_KEYS,id)?QUESTION_KEYS[id].optionCount:0;return Number.isInteger(n)&&n>0&&Array.isArray(a)&&a.length>0&&a.length<=n&&a.every(i=>Number.isInteger(i)&&i>=0&&i<n)}
function cleanState(s){
 if(!s||s.version!==1||!s.responses||typeof s.responses!=='object'||Array.isArray(s.responses))throw new HttpError(400,'Bản tiến độ không hợp lệ.');
 const copy=JSON.parse(JSON.stringify(s));for(const [id,r] of Object.entries(copy.responses))if(!r||!validAnswerValues(id,r.value))delete copy.responses[id];
 for(const field of ['sessions','history','deletedSessions'])if(!Array.isArray(copy[field]))copy[field]=[];
 copy.sessions=copy.sessions.filter(v=>v&&typeof v==='object'&&Array.isArray(v.ids)&&v.answers&&typeof v.answers==='object');
 return copy;
}
function summarize(state){
 const subjects=Object.fromEntries(['DGT302','COS201','LOS201','ICI211'].map(s=>[s,{total:0,done:0,right:0}]));for(const [id,q] of Object.entries(QUESTION_KEYS))if((q.canonicalId||id)===id)subjects[q.subject].total++;
 const latest=new Map();let lastAnswer=0;
 for(const [id,r] of Object.entries(state?.responses||{})){
  if(!Object.hasOwn(QUESTION_KEYS,id)||!r||!validAnswerValues(id,r.value))continue;
  const q=QUESTION_KEYS[id],key=q.canonicalId||id,old=latest.get(key),at=Number(r.at)||0;
  if(!old||at>old.at||(at===old.at&&(q.canonicalRank||0)<(old.q.canonicalRank||0)))latest.set(key,{id,r,q,at});
  lastAnswer=Math.max(lastAnswer,at);
 }
 for(const {r,q}of latest.values()){subjects[q.subject].done++;const expected=q.answer;if(r.value.length===expected.length&&[...r.value].sort().every((n,i)=>n===[...expected].sort()[i]))subjects[q.subject].right++;}
 const done=Object.values(subjects).reduce((n,s)=>n+s.done,0),right=Object.values(subjects).reduce((n,s)=>n+s.right,0);
 const sessions=(Array.isArray(state?.sessions)?state.sessions:[]).filter(s=>s&&typeof s==='object').slice().sort((a,b)=>(b.updated||0)-(a.updated||0)).slice(0,12).map(s=>{const historical=s.mode==='exam'&&s.status==='completed',key=id=>historical?id:QUESTION_KEYS[id].canonicalId||id;const keys=new Set((Array.isArray(s.ids)?s.ids:[]).filter(id=>Object.hasOwn(QUESTION_KEYS,id)).map(key));const answered=new Set(Object.entries(s.answers||{}).filter(([id,a])=>validAnswerValues(id,a)&&keys.has(key(id))).map(([id])=>key(id)));return {mode:s.reviewWrong?'mistakes':s.mode,total:keys.size,answered:answered.size,updated:s.updated,status:s.status}});
 return {subjects,done,right,accuracy:done?Math.round(right/done*100):0,lastAnswer,sessions,examCount:Array.isArray(state?.history)?state.history.length:0};
}
const wallpaperLimit=20*1024*1024;
const wallpaperKey=id=>'wallpapers/'+encodeURIComponent(id)+'/active';
async function wallpaperBytes(request){
 if(!request.body)throw new HttpError(400,'Chưa có dữ liệu ảnh.');
 const reader=request.body.getReader(),chunks=[];let size=0;
 for(;;){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>wallpaperLimit){await reader.cancel();throw new HttpError(413,'Chọn ảnh có dung lượng tối đa 20 MB để đồng bộ.')}chunks.push(value);}
 const data=new Uint8Array(size);let offset=0;for(const chunk of chunks){data.set(chunk,offset);offset+=chunk.byteLength}return data;
}
function wallpaperType(bytes){
 const at=(offset,text)=>[...text].every((c,i)=>bytes[offset+i]===c.charCodeAt(0));
 if(bytes.length>=8&&[137,80,78,71,13,10,26,10].every((n,i)=>bytes[i]===n))return 'image/png';
 if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)return 'image/jpeg';
 if(at(0,'RIFF')&&at(8,'WEBP'))return 'image/webp';
 if(at(0,'GIF87a')||at(0,'GIF89a'))return 'image/gif';
 if(at(4,'ftyp')){for(let i=8;i<Math.min(bytes.length,64)-3;i+=4)if(at(i,'avif')||at(i,'avis'))return 'image/avif';}
 return null;
}
function wallpaperInfo(object){
 if(!object)return {wallpaper:null,revision:null};
 const revision=object.etag,updatedAt=Number(object.customMetadata?.updatedAt)||object.uploaded?.getTime()||null;
 if(object.customMetadata?.kind==='default')return {wallpaper:null,revision,updatedAt};
 let name='Ảnh nền của bạn';try{name=decodeURIComponent(object.customMetadata?.name||'Ảnh nền của bạn')}catch{}
 return {wallpaper:{url:'/api/wallpaper/image?v='+encodeURIComponent(revision),name,size:object.size,type:object.httpMetadata?.contentType},revision,updatedAt};
}
async function wallpaperApi(request,env,u){
 if(!env.BUCKET)throw new HttpError(503,'Kho ảnh nền đang được chuẩn bị. Ảnh trên máy vẫn được giữ.');
 const url=new URL(request.url),key=wallpaperKey(u.id);
 if(url.pathname==='/api/wallpaper/image'&&request.method==='GET'){
  const image=await env.BUCKET.get(key);
  if(!image||image.customMetadata?.kind==='default')throw new HttpError(404,'Tài khoản chưa có ảnh nền.');
  if(url.searchParams.has('v')&&url.searchParams.get('v')!==image.etag)throw new HttpError(409,'Ảnh nền đã thay đổi. Hãy tải lại ảnh từ tài khoản.');
  return new Response(image.body,{headers:{'content-type':image.httpMetadata?.contentType||'application/octet-stream','content-length':String(image.size),'cache-control':'private, no-store','vary':'Cookie','etag':image.httpEtag,'cross-origin-resource-policy':'same-origin'}});
 }
 if(url.pathname!=='/api/wallpaper')throw new HttpError(404,'Không tìm thấy ảnh.');
 if(request.method==='GET')return json({...wallpaperInfo(await env.BUCKET.head(key)),maxBytes:wallpaperLimit});
 if(!['PUT','DELETE'].includes(request.method))throw new HttpError(405,'Thao tác không hỗ trợ.');
 const revision=request.headers.get('x-ic-wallpaper-version');
 if(revision===null||!(revision==='none'||/^[a-zA-Z0-9-]{1,100}$/.test(revision)))throw new HttpError(400,'Hãy kiểm tra ảnh nền tài khoản trước khi cập nhật.');
 const onlyIf=revision==='none'?{etagDoesNotMatch:'*'}:{etagMatches:revision};
 const metadata={kind:request.method==='DELETE'?'default':'image',updatedAt:String(Date.now())};
 let data,type;
 if(request.method==='DELETE'){data=JSON.stringify({default:true,version:crypto.randomUUID()});type='application/json';}
 else{
  if(Number(request.headers.get('content-length'))>wallpaperLimit)throw new HttpError(413,'Ảnh đồng bộ cần nhỏ hơn hoặc bằng 20 MB. Ảnh gốc trên máy vẫn được giữ.');
  data=await wallpaperBytes(request);
  if(!data.byteLength||data.byteLength>wallpaperLimit)throw new HttpError(413,'Chọn ảnh có dung lượng tối đa 20 MB để đồng bộ.');
  type=wallpaperType(data);if(!type)throw new HttpError(415,'Chỉ nhận ảnh PNG, JPG, WebP, AVIF hoặc GIF hợp lệ.');
  let name='Ảnh nền';try{name=decodeURIComponent(request.headers.get('x-ic-wallpaper-name')||'Ảnh nền')}catch{}
  metadata.name=encodeURIComponent(name.replace(/[\x00-\x1f\x7f]/g,'').slice(0,180));
 }
 const object=await env.BUCKET.put(key,data,{onlyIf,httpMetadata:{contentType:type,cacheControl:'private, no-store'},customMetadata:metadata});
 if(!object)throw new HttpError(409,'Ảnh nền đã được đổi ở thiết bị khác. Bạn có thể tải ảnh từ tài khoản hoặc chọn đồng bộ lại ảnh trên máy.');
 return json(wallpaperInfo(object));
}
async function api(request,env){
 csrf(request);const url=new URL(request.url),path=url.pathname;
 if(path==='/api/login'&&request.method==='POST'){
  const b=await body(request),username=String(b.username||'').trim().toLowerCase(),password=typeof b.password==='string'?b.password:'';if(username.length>80||password.length>128)throw new HttpError(400,'Thông tin đăng nhập không hợp lệ.');
  const ip=await sha(request.headers.get('cf-connecting-ip')||'unknown'),account='user:'+username,network='ip:'+ip;await throttled(env,account,8);await throttled(env,network,60);await initialAdmin(env);
  const u=await env.DB.prepare('SELECT * FROM users WHERE username=?').bind(username).first();const valid=await verifyPassword(password,u?.password_hash||env.IC_ADMIN_HASH);
  if(!valid||!u||u.disabled){await increment(env,account);await increment(env,network);throw new HttpError(401,'Tên đăng nhập hoặc mật khẩu chưa đúng, hoặc tài khoản đã bị khóa.');}
  const token=random(),now=Date.now();await env.DB.batch([env.DB.prepare('INSERT INTO auth_sessions (token_hash,user_id,expires,created_at) VALUES (?,?,?,?)').bind(await sha(token),u.id,now+lifetime,now),env.DB.prepare('UPDATE users SET last_login=? WHERE id=?').bind(now,u.id),env.DB.prepare('DELETE FROM auth_limits WHERE key=?').bind(account),env.DB.prepare('DELETE FROM auth_sessions WHERE expires<?').bind(now)]);
  return json({user:safeUser(u)},200,{'set-cookie':cookie(token)});
 }
 const u=await authorized(request,env,path.startsWith('/api/admin/'));
 if(path==='/api/wallpaper'||path==='/api/wallpaper/image')return wallpaperApi(request,env,u);
 if(path==='/api/me'&&request.method==='GET')return json({user:safeUser(u)});
 if(path==='/api/logout'&&request.method==='POST'){await env.DB.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(u.session_hash).run();return json({ok:true},200,{'set-cookie':cookie('',0)})}
 if(path==='/api/password'&&request.method==='POST'){
  const b=await body(request);checkPassword(b.password);if(!await verifyPassword(String(b.currentPassword||''),u.password_hash))throw new HttpError(400,'Mật khẩu hiện tại chưa đúng.');
  if(b.password===b.currentPassword)throw new HttpError(400,'Hãy dùng mật khẩu mới khác mật khẩu cũ.');
  await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_changed=? WHERE id=?').bind(await passwordHash(b.password),Date.now(),u.id),env.DB.prepare('DELETE FROM auth_sessions WHERE user_id=? AND token_hash<>?').bind(u.id,u.session_hash)]);await audit(env,u,'password-change',u.id);return json({ok:true});
 }
 if(path==='/api/progress'&&request.method==='GET'){const p=await env.DB.prepare('SELECT * FROM progress WHERE user_id=?').bind(u.id).first();return json({state:p?JSON.parse(p.state):null,revision:p?.revision||0,updatedAt:p?.updated_at||null})}
 if(path==='/api/progress'&&request.method==='PUT'){
  const b=await body(request),state=cleanState(b.state),revision=Number(b.revision);if(!Number.isInteger(revision)||revision<0)throw new HttpError(400,'Phiên đồng bộ không hợp lệ.');
  const now=Date.now();let changed;
  if(revision===0)changed=await env.DB.prepare('INSERT OR IGNORE INTO progress (user_id,state,revision,updated_at) VALUES (?,?,1,?)').bind(u.id,JSON.stringify(state),now).run();
  else changed=await env.DB.prepare('UPDATE progress SET state=?,revision=revision+1,updated_at=? WHERE user_id=? AND revision=?').bind(JSON.stringify(state),now,u.id,revision).run();
  if(!changed.meta.changes)throw new HttpError(409,'Tiến độ đã được cập nhật ở thiết bị khác. Hãy xuất bản sao hiện tại rồi tải lại trang.');return json({revision:revision+1,updatedAt:now});
 }
 if(path==='/api/admin/users'&&request.method==='GET'){
  const rows=await env.DB.prepare('SELECT u.id,u.username,u.display_name,u.role,u.disabled,u.created_at,u.last_login,p.state,p.updated_at FROM users u LEFT JOIN progress p ON p.user_id=u.id ORDER BY u.created_at DESC').all();
  return json({users:rows.results.map(r=>({...safeUser(r),updatedAt:r.updated_at,progress:summarize(r.state?JSON.parse(r.state):null)}))});
 }
 if(path==='/api/admin/users'&&request.method==='POST'){
  const b=await body(request),name=String(b.name||'').trim().replace(/\s+/g,' ');if(name.length<2||name.length>100)throw new HttpError(400,'Họ tên cần từ 2 đến 100 ký tự.');
  const base=name.normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]+/g,'.').replace(/^\.|\.$/g,'').slice(0,28)||'hocvien';
  const username=base+'.'+random().slice(0,6),password=random().slice(0,24),id=crypto.randomUUID();await env.DB.prepare('INSERT INTO users (id,username,display_name,role,password_hash,disabled,created_at) VALUES (?,?,?,?,?,0,?)').bind(id,username,name,'user',await passwordHash(password),Date.now()).run();await audit(env,u,'create-user',id);return json({id,name,username,password},201);
 }
 const match=path.match(/^\/api\/admin\/users\/([a-zA-Z0-9-]+)(?:\/(reset-password))?$/);
 if(match&&['PATCH','POST','DELETE'].includes(request.method)){
  const target=await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(match[1]).first();if(!target)throw new HttpError(404,'Không tìm thấy tài khoản.');if(target.role==='admin')throw new HttpError(400,'Tài khoản admin được quản lý riêng.');
  if(!match[2]&&request.method==='DELETE'){
   const b=await body(request);if(b.username!==target.username)throw new HttpError(400,'Nhập đúng username để xác nhận xóa tài khoản.');
   if(env.BUCKET)await env.BUCKET.delete(wallpaperKey(target.id));
   await env.DB.batch([
    env.DB.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(target.id),
    env.DB.prepare('DELETE FROM progress WHERE user_id=?').bind(target.id),
    env.DB.prepare('DELETE FROM users WHERE id=? AND role=?').bind(target.id,'user'),
    env.DB.prepare('INSERT INTO audit (id,actor_id,action,target_id,at) VALUES (?,?,?,?,?)').bind(crypto.randomUUID(),u.id,'delete-user',target.id,Date.now())
   ]);return json({ok:true});
  }
  if(match[2]==='reset-password'&&request.method==='POST'){const password=random().slice(0,24);await env.DB.batch([env.DB.prepare('UPDATE users SET password_hash=?,password_changed=? WHERE id=?').bind(await passwordHash(password),Date.now(),target.id),env.DB.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(target.id)]);await audit(env,u,'reset-password',target.id);return json({username:target.username,password})}
  if(!match[2]&&request.method==='PATCH'){const b=await body(request);if(typeof b.disabled!=='boolean')throw new HttpError(400,'Trạng thái không hợp lệ.');await env.DB.prepare('UPDATE users SET disabled=? WHERE id=?').bind(b.disabled?1:0,target.id).run();if(b.disabled)await env.DB.prepare('DELETE FROM auth_sessions WHERE user_id=?').bind(target.id).run();await audit(env,u,b.disabled?'disable-user':'enable-user',target.id);return json({ok:true})}
 }
 throw new HttpError(404,'Không tìm thấy chức năng.');
}
const security={'x-content-type-options':'nosniff','referrer-policy':'same-origin','x-frame-options':'SAMEORIGIN','permissions-policy':'camera=(), microphone=(), geolocation=()'};
async function fetchApp(request,env){
 try{
  const url=new URL(request.url);let response;
  if(url.pathname.startsWith('/api/'))response=await api(request,env);
  else if(url.pathname==='/study'){
   const u=await identity(request,env);if(!u)return Response.redirect(url.origin+'/',302);
   const p=await env.DB.prepare('SELECT state,revision,updated_at FROM progress WHERE user_id=?').bind(u.id).first();
   let html=STUDY_HTML;
   const initial=JSON.stringify({user:safeUser(u),state:p?JSON.parse(p.state):null,revision:p?.revision||0,updatedAt:p?.updated_at||null}).replace(/</g,'\\u003c');
   html=html.replace('<!--IC_ADMIN_BRIEF_EXTRA-->',()=>u.role==='admin'?`<script>${ADMIN_BRIEF_EXTRA}</script>`:'');
   html=html.replace('/*IC_ACCOUNT_BOOT*/',()=>initial);response=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }else if(url.pathname==='/admin'){
   const u=await identity(request,env);if(!u)return Response.redirect(url.origin+'/',302);if(u.role!=='admin')throw new HttpError(403,'Chỉ admin được truy cập trang quản trị.');
   const progress=await env.DB.prepare('SELECT state FROM progress WHERE user_id=?').bind(u.id).first();
   const saved=progress?JSON.parse(progress.state).accountLook:null;
   const look=saved?{palette:ADMIN_PALETTES.includes(saved.palette)?saved.palette:'sakura',glass:saved.glass===true}:null;
   const boot=JSON.stringify({userId:u.id,look,palettes:ADMIN_PALETTES}).replace(/</g,'\\u003c');
   const html=ADMIN_HTML.replace('null /* IC_ADMIN_LOOK */',()=>boot);
   response=new Response(html,{headers:{'content-type':'text/html; charset=utf-8','cache-control':'no-store'}});
  }else if(['/study.html','/admin.html'].includes(url.pathname))throw new HttpError(404,'Không tìm thấy trang.');
  else response=await env.ASSETS.fetch(request);
  const headers=new Headers(response.headers);for(const [k,v]of Object.entries(security))headers.set(k,v);if(url.pathname==='/admin'||url.pathname==='/')headers.set('cache-control','no-store');
  return new Response(response.body,{status:response.status,headers});
 }catch(e){if(e instanceof HttpError)return json({error:e.message},e.status,security);console.error('Request failed',new URL(request.url).pathname,e?.name);return json({error:'Máy chủ đang bận. Vui lòng thử lại.'},500,security)}
}
export {passwordHash,verifyPassword,summarize,fetchApp};
export default {fetch:fetchApp};
