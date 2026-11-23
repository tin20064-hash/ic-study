import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {database,assets} from './d1-adapter.mjs';
import {bucket} from './r2-adapter.mjs';
import {fetchApp,passwordHash} from '../dist/server/index.js';
const origin='https://ic-study.test',password='wallpaper-test-password-2026';
const image=Uint8Array.from([137,80,78,71,13,10,26,10,0,0,0,0,1,2,3]);
async function setup(){return {DB:database(),ASSETS:assets(),BUCKET:bucket(),IC_ADMIN_USERNAME:'icadmin',IC_ADMIN_HASH:await passwordHash(password)}}
async function call(env,path,method='GET',data,cookie,extra={}){
 const headers={origin,'x-ic-request':'1',...extra};if(cookie)headers.cookie=cookie;
 const raw=data instanceof Uint8Array;const body=data?(raw?data:JSON.stringify(data)):undefined;
 if(body&&!raw)headers['content-type']='application/json';
 return fetchApp(new Request(origin+path,{method,headers,...(body?{body}:{})}),env);
}
async function login(env,username='icadmin',pw=password){const r=await call(env,'/api/login','POST',{username,password:pw});assert.equal(r.status,200);return r.headers.get('set-cookie').split(';')[0]}
const upload=(env,cookie,version='none',bytes=image)=>call(env,'/api/wallpaper','PUT',bytes,cookie,{'x-ic-wallpaper-version':version,'x-ic-wallpaper-name':encodeURIComponent('Ảnh anime gốc.png'),'content-type':'image/png'});

test('Original image bytes and filename persist across independent sessions of the same account',async()=>{
 const env=await setup(),one=await login(env),two=await login(env);
 assert.equal((await (await call(env,'/api/wallpaper','GET',null,one)).json()).wallpaper,null);
 const put=await upload(env,one);assert.equal(put.status,200);const saved=await put.json();
 const remote=await (await call(env,'/api/wallpaper','GET',null,two)).json();assert.equal(remote.revision,saved.revision);assert.equal(remote.wallpaper.name,'Ảnh anime gốc.png');
 const downloaded=await call(env,remote.wallpaper.url,'GET',null,two);assert.equal(downloaded.status,200);assert.deepEqual(new Uint8Array(await downloaded.arrayBuffer()),image);assert.equal(downloaded.headers.get('cache-control'),'private, no-store');assert.equal(downloaded.headers.get('content-type'),'image/png');
});
test('Wallpaper is private per account; anonymous and cross-origin uploads are rejected',async()=>{
 const env=await setup(),admin=await login(env);await upload(env,admin);
 const created=await (await call(env,'/api/admin/users','POST',{name:'Test Student'},admin)).json();const student=await login(env,created.username,created.password);
 assert.equal((await (await call(env,'/api/wallpaper','GET',null,student)).json()).wallpaper,null);
 assert.equal((await call(env,'/api/wallpaper/image','GET',null,student)).status,404);
 assert.equal((await call(env,'/api/wallpaper/image')).status,401);
 assert.equal((await upload(env,null)).status,401);
 assert.equal((await call(env,'/api/wallpaper','PUT',image,admin,{origin:'https://other.test','x-ic-wallpaper-version':'none'})).status,403);
});
test('Stale devices cannot overwrite a newer wallpaper or resurrect a reset wallpaper',async()=>{
 const env=await setup(),cookie=await login(env);const first=await (await upload(env,cookie)).json();
 assert.equal((await upload(env,cookie)).status,409);
 const reset=await call(env,'/api/wallpaper','DELETE',null,cookie,{'x-ic-wallpaper-version':first.revision});assert.equal(reset.status,200);
 const tombstone=await reset.json();assert.equal(tombstone.wallpaper,null);assert.ok(tombstone.revision);
 assert.equal((await upload(env,cookie,first.revision)).status,409);
 assert.equal((await upload(env,cookie,'none')).status,409);
 assert.equal((await call(env,'/api/wallpaper/image','GET',null,cookie)).status,404);
 assert.equal((await upload(env,cookie,tombstone.revision)).status,200);
});
test('Invalid image formats and oversized uploads are rejected before replacing the saved image',async()=>{
 const env=await setup(),cookie=await login(env);assert.equal((await upload(env,cookie,'none',new TextEncoder().encode('<svg onload="alert(1)"></svg>'))).status,415);
 assert.equal((await call(env,'/api/wallpaper','PUT',image,cookie,{'x-ic-wallpaper-version':'none','content-length':String(21*1024*1024)})).status,413);
 assert.equal((await upload(env,cookie,'none',new Uint8Array(20*1024*1024+1))).status,413);
 assert.equal((await upload(env,cookie)).status,200);
});
test('Account deletion removes only that student wallpaper, and protected HTML includes migration/cache hooks',async()=>{
 const env=await setup(),admin=await login(env),created=await (await call(env,'/api/admin/users','POST',{name:'Delete Wallpaper'},admin)).json();
 const student=await login(env,created.username,created.password);await upload(env,student);await upload(env,admin);
 assert.ok(await env.BUCKET.head('wallpapers/'+created.id+'/active'));
 assert.equal((await call(env,'/api/admin/users/'+created.id,'DELETE',{username:created.username},admin)).status,200);
 assert.equal(await env.BUCKET.head('wallpapers/'+created.id+'/active'),null);
 assert.ok(await env.BUCKET.head('wallpapers/initial-admin/active'));
 const html=await (await call(env,'/study','GET',null,admin)).text();assert.ok(html.includes('window.icLocalWallpaperReady=restoreStoredWallpaper()'));assert.ok(html.includes('icWallpaperSelected(file)'));assert.ok(html.includes('icWallpaperReset()'));assert.ok(html.includes('/account/wallpaper-client.js'));assert.ok(!html.includes('GIF dưới 60 MB'));
 const manifest=JSON.parse(fs.readFileSync('.openai/hosting.json','utf8'));assert.equal(manifest.r2,'BUCKET');
});
