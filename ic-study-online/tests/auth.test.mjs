import {test} from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import {database,assets} from './d1-adapter.mjs';import {fetchApp,passwordHash,verifyPassword} from '../dist/server/index.js';
const adminPassword='test-admin-password-2026',origin='https://ic-study.test';
async function setup(){return {DB:database(),ASSETS:assets(),IC_ADMIN_USERNAME:'icadmin',IC_ADMIN_HASH:await passwordHash(adminPassword)}}
async function call(env,path,method='GET',data,token,extra={}){const headers={'origin':origin,'x-ic-request':'1','content-type':'application/json',...extra};if(token)headers.cookie=token;return fetchApp(new Request(origin+path,{method,headers,...(data?{body:JSON.stringify(data)}:{})}),env)}
async function login(env,username='icadmin',password=adminPassword){const r=await call(env,'/api/login','POST',{username,password});return {r,token:r.headers.get('set-cookie')?.split(';')[0],body:await r.json()}}
async function student(env,token,name='Nguyễn Văn An'){const r=await call(env,'/api/admin/users','POST',{name,role:'admin'},token);assert.equal(r.status,201);return r.json()}
test('Passwords have salted hashes and verify only the correct password',async()=>{const a=await passwordHash('long-password-test'),b=await passwordHash('long-password-test');assert.notEqual(a,b);assert(await verifyPassword('long-password-test',a));assert.equal(await verifyPassword('wrong',a),false)});
test('Anonymous access cannot read progress, study HTML or admin routes',async()=>{const env=await setup();assert.equal((await call(env,'/api/progress')).status,401);assert.equal((await call(env,'/study')).status,302);assert.equal((await call(env,'/study.html')).status,404);assert.equal((await call(env,'/admin.html')).status,404)});
test('Login uses a secure HttpOnly session cookie, never client role claims',async()=>{const env=await setup(),{r,token,body}=await login(env);assert.equal(r.status,200);assert.equal(body.user.role,'admin');assert.match(r.headers.get('set-cookie'),/HttpOnly; Secure; SameSite=Strict/);assert.equal((await call(env,'/api/me','GET',null,'__Host-icstudy=fake')).status,401);assert.equal((await call(env,'/api/me','GET',null,token)).status,200)});
test('Admin creates unique derived usernames and user cannot create accounts',async()=>{const env=await setup(),a=await login(env),one=await student(env,a.token),two=await student(env,a.token);assert.match(one.username,/nguyen.van.an\.[a-f0-9]+/);assert.notEqual(one.username,two.username);assert.notEqual(one.password,two.password);assert(one.password.length>=12);const u=await login(env,one.username,one.password);assert.equal(u.body.user.role,'user');assert.equal((await call(env,'/api/admin/users','GET',null,u.token)).status,403);assert.equal((await call(env,'/api/admin/users','POST',{name:'Another'},u.token)).status,403);assert.equal((await call(env,'/admin','GET',null,u.token)).status,403)});
test('Progress is isolated by account and rejects stale updates',async()=>{const env=await setup(),a=await login(env),one=await student(env,a.token),two=await student(env,a.token),u1=await login(env,one.username,one.password),u2=await login(env,two.username,two.password);const state={version:1,responses:{'DGT302-500':{value:[1],at:Date.now()}},sessions:[],history:[]};assert.equal((await call(env,'/api/progress','PUT',{state,revision:0},u1.token)).status,200);assert.equal((await(await call(env,'/api/progress','GET',null,u2.token)).json()).state,null);assert.equal((await call(env,'/api/progress','PUT',{state,revision:0},u1.token)).status,409);const users=(await(await call(env,'/api/admin/users','GET',null,a.token)).json()).users;assert.equal(users.find(u=>u.username===one.username).progress.done,1);assert.equal(users.find(u=>u.username===one.username).progress.right,1)});
test('Password change verifies the current password and invalidates other devices',async()=>{const env=await setup(),a=await login(env),s=await student(env,a.token),u=await login(env,s.username,s.password),other=await login(env,s.username,s.password);assert.equal((await call(env,'/api/password','POST',{currentPassword:'wrong',password:'my-new-password-2026'},u.token)).status,400);assert.equal((await call(env,'/api/password','POST',{currentPassword:s.password,password:'my-new-password-2026'},u.token)).status,200);assert.equal((await call(env,'/api/me','GET',null,other.token)).status,401);assert.equal((await login(env,s.username,s.password)).r.status,401);assert.equal((await login(env,s.username,'my-new-password-2026')).r.status,200)});
test('Disabling a user and resetting a password revoke existing sessions',async()=>{const env=await setup(),a=await login(env),s=await student(env,a.token),u=await login(env,s.username,s.password);assert.equal((await call(env,'/api/admin/users/'+s.id,'PATCH',{disabled:true},a.token)).status,200);assert.equal((await call(env,'/api/me','GET',null,u.token)).status,401);assert.equal((await login(env,s.username,s.password)).r.status,401);await call(env,'/api/admin/users/'+s.id,'PATCH',{disabled:false},a.token);const reset=await(await call(env,'/api/admin/users/'+s.id+'/reset-password','POST',{},a.token)).json();assert.equal((await login(env,s.username,s.password)).r.status,401);assert.equal((await login(env,s.username,reset.password)).r.status,200)});
test('Cross-origin writes and repeated guesses are denied',async()=>{const env=await setup();assert.equal((await call(env,'/api/login','POST',{username:'icadmin',password:adminPassword},null,{origin:'https://other.test'})).status,403);for(let i=0;i<8;i++)assert.equal((await login(env,'icadmin','bad')).r.status,401);assert.equal((await login(env)).r.status,429)});
test('Protected study HTML injects only current user progress and no password hashes',async()=>{const env=await setup(),a=await login(env),r=await call(env,'/study','GET',null,a.token),text=await r.text();assert.equal(r.status,200);assert(text.includes('window.IC_BOOT={"user":'));assert(!text.includes('/*IC_ACCOUNT_BOOT*/'));assert(!text.includes(env.IC_ADMIN_HASH));assert(text.includes("const KEY='on-tap-anime-v1:'+IC_BOOT.user.id"));assert(text.includes('Tổng quan ôn tập'));assert.doesNotMatch(text,/senpai|Đổi châm ngôn/i);assert(text.includes('Ảnh nền HD'))});
test('Malformed progress cannot break the administrator overview',async()=>{const env=await setup(),a=await login(env),s=await student(env,a.token),u=await login(env,s.username,s.password);const state=JSON.parse('{"version":1,"responses":{"constructor":{"value":[1]}},"sessions":{},"history":"bad"}');assert.equal((await call(env,'/api/progress','PUT',{state,revision:0},u.token)).status,200);const r=await call(env,'/api/admin/users','GET',null,a.token);assert.equal(r.status,200);assert.equal((await r.json()).users.find(v=>v.id===s.id).progress.done,0)});
test('Static asset routing cannot bypass authentication for protected HTML',()=>{for(const name of ['dist/client/study.html','dist/client/admin.html','dist/client/account/admin.html'])assert.equal(fs.existsSync(name),false)});
test('Only admin study responses include the supplemental brief review controls',async()=>{
 const env=await setup(),admin=await login(env),account=await student(env,admin.token);
 const learner=await login(env,account.username,account.password);
 const study=async token=>(await call(env,'/study','GET',null,token)).text();
 assert.match(await study(admin.token),/data-act="admin-brief-extra"/);
 assert.doesNotMatch(await study(learner.token),/Ôn bổ sung|data-act="admin-brief-extra"/);
 assert.doesNotMatch(fs.readFileSync('../IC_Study_Anime.html','utf8'),/renderAdminBriefExtra/);
 assert.equal((await call(env,'/source/admin-brief-extra.js','GET',null,learner.token)).status,404);
});
test('Sign-in and the default study wallpaper use the shared landscape asset',async()=>{
 const env=await setup(),{token}=await login(env);
 const asset='/assets/wallpapers/default-landscape.webp';
 const study=await(await call(env,'/study','GET',null,token)).text();
 assert.ok(study.includes(asset));
 assert.doesNotMatch(study,/Ảnh anime mặc định|62ebed340aff4e5256eb1f37/);
 const loginPage=fs.readFileSync('dist/client/index.html','utf8');
 assert.match(loginPage,/href="\/account\/login.css"/);
 assert.match(loginPage,/for="username"/);
 assert.match(loginPage,/for="password"/);
 assert.ok(fs.readFileSync('dist/client/account/login.css','utf8').includes(asset));
 assert.equal(fs.readFileSync('dist/client'+asset).subarray(8,12).toString(),'WEBP');
});
test('Admin page loads the signed-in account theme without embedding study progress',async()=>{
 const env=await setup(),{token}=await login(env);
 const getBoot=async()=>{
  const response=await call(env,'/admin','GET',null,token);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const html=await response.text();
  assert.doesNotMatch(html,/PRIVATE-NOTE|IC_ACCOUNT_BOOT/);
  return JSON.parse(html.match(/window\.IC_ADMIN_LOOK=(\{[^<]*\});<\/script>/)[1]);
 };
 assert.equal((await getBoot()).look,null);
 const state={version:1,responses:{},notes:{example:'PRIVATE-NOTE'},accountLook:{palette:'neon-circuit',glass:true,opacity:25}};
 assert.equal((await call(env,'/api/progress','PUT',{state,revision:0},token)).status,200);
 const boot=await getBoot();
 assert.deepEqual(boot.look,{palette:'neon-circuit',glass:true});
 const css=fs.readFileSync('dist/client/account/admin-palette.css','utf8');
 for(const palette of boot.palettes)assert.ok(css.includes(`data-palette="${palette}"`));
 state.accountLook={palette:'<script>',glass:'true'};
 assert.equal((await call(env,'/api/progress','PUT',{state,revision:1},token)).status,200);
 assert.deepEqual((await getBoot()).look,{palette:'sakura',glass:false});
});
test('Admin deletion requires the exact username and protects administrator accounts',async()=>{const env=await setup(),a=await login(env),s=await student(env,a.token);assert.equal((await call(env,'/api/admin/users/'+s.id,'DELETE',{username:'wrong'},a.token)).status,400);assert.equal((await login(env,s.username,s.password)).r.status,200);assert.equal((await call(env,'/api/admin/users/initial-admin','DELETE',{username:'icadmin'},a.token)).status,400);assert.equal((await call(env,'/api/me','GET',null,a.token)).status,200)});
test('Deleting a student removes only that student and progress, revokes all sessions and records the action',async()=>{const env=await setup(),a=await login(env),s=await student(env,a.token),other=await student(env,a.token),u=await login(env,s.username,s.password),second=await login(env,s.username,s.password);await call(env,'/api/progress','PUT',{revision:0,state:{version:1,responses:{'DGT302-500':{value:[1],at:1}},sessions:[],history:[]}},u.token);assert.equal((await call(env,'/api/admin/users/'+s.id,'DELETE',{username:s.username},a.token)).status,200);assert.equal((await call(env,'/api/me','GET',null,u.token)).status,401);assert.equal((await call(env,'/api/me','GET',null,second.token)).status,401);assert.equal((await login(env,s.username,s.password)).r.status,401);assert.equal(await env.DB.prepare('SELECT * FROM users WHERE id=?').bind(s.id).first(),null);assert.equal(await env.DB.prepare('SELECT * FROM progress WHERE user_id=?').bind(s.id).first(),null);assert.equal((await login(env,other.username,other.password)).r.status,200);assert.equal((await env.DB.prepare('SELECT * FROM audit WHERE action=? AND target_id=?').bind('delete-user',s.id).first()).actor_id,'initial-admin')});
test('Students, anonymous requests and other origins cannot delete accounts',async()=>{const env=await setup(),a=await login(env),s=await student(env,a.token),u=await login(env,s.username,s.password);assert.equal((await call(env,'/api/admin/users/'+s.id,'DELETE',{username:s.username},u.token)).status,403);assert.equal((await call(env,'/api/admin/users/'+s.id,'DELETE',{username:s.username})).status,401);assert.equal((await call(env,'/api/admin/users/'+s.id,'DELETE',{username:s.username},a.token,{origin:'https://other.test'})).status,403);assert.equal((await login(env,s.username,s.password)).r.status,200)});
