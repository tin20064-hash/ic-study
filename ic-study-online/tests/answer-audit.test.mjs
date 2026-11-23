import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database,assets} from './d1-adapter.mjs';
import {fetchApp,passwordHash} from '../dist/server/index.js';
const html=fs.readFileSync('source/study.html','utf8');
const parse=(s,id)=>JSON.parse(s.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const bank=parse(html,'question-bank'),exp=parse(html,'short-explanations'),audit=JSON.parse(fs.readFileSync('source/answer-audit.json','utf8'));
const by=new Map(bank.map(q=>[q.id,q]));
const plain=x=>JSON.parse(JSON.stringify(x));
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('Audit is reproducible across online/offline data and retains original source choices',()=>{
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');
 const content=qs=>qs.map(({questionImage,noteImage,...q})=>q);
 assert.deepEqual(content(parse(offline,'question-bank')),content(bank));
 assert.deepEqual(parse(offline,'short-explanations'),exp);
 assert.equal(Object.keys(audit).length,227);
 let changed=0;
 for(const [id,a]of Object.entries(audit)){
  const q=by.get(id);assert.deepEqual(q.answer,exp[id].correctedAnswer,id);
  assert.deepEqual(a.original.answer,exp[id].originalAnswer,id);
  if(JSON.stringify(q.answer)!==JSON.stringify(a.original.answer))changed++;
  for(const i of q.answer)assert.ok(i>=0&&i<q.options.length,id);
  if(q.options.length>a.original.options.length)assert.deepEqual(q.options.slice(0,4),a.original.options,id);
 }
 assert.equal(changed,23);
});
test('Parallel output is the sum of the branch impulse responses, not cascade convolution',()=>{
 const conv=(x,h)=>Array.from({length:x.length+h.length-1},(_,n)=>x.reduce((s,v,k)=>s+v*(h[n-k]||0),0));
 const x=[1,3,-2],h1=[2,1],h2=[-1,4];
 assert.deepEqual(conv(x,h1).map((v,i)=>v+conv(x,h2)[i]),conv(x,h1.map((v,i)=>v+h2[i])));
 assert.deepEqual(by.get('DGT302-529').answer,[2]);
});
test('Source photos explain wording changes and original letters without showing answers',()=>{
 const q=by.get('LOS201-119');
 assert.equal(q.question,'Which standard includes the curses screen-handling API? (Consider the separate X/Open Curses volume of the 2001 UNIX specification.)');
 assert.equal(q.options[q.answer[0]],'SUSv3');
 const ctx=vm.createContext({SHORT_EXPLANATIONS:exp,esc:String});
 const code=html.slice(html.indexOf('function sourcePhotoNotice('),html.indexOf('function source(q)'));
 const formatted=html.split('\n').find(line=>line.startsWith('function source(q)'));
 vm.runInContext(code+formatted,ctx);
 const photo=ctx.source(q);
 assert.match(photo,/Câu hỏi .*đã được hiệu chỉnh/);
 assert.match(photo,/Các chữ cái trong ảnh theo thứ tự của đề gốc/);
 assert.doesNotMatch(photo,/SUSv3/);
 assert.doesNotMatch(ctx.sourcePhotoNotice(q,'note'),/đã được hiệu chỉnh/);
 for(const [id,entry] of Object.entries(audit)){
  const stem=Object.hasOwn(entry.changes,'question')&&entry.changes.question!==entry.original.question;
  const choices=Object.hasOwn(entry.changes,'options')&&JSON.stringify(entry.changes.options)!==JSON.stringify(entry.original.options);
  assert.equal(exp[id].sourceEdits,stem&&choices?'both':stem?'stem':choices?'choices':undefined,id);
 }
});
test('Direct DFT validates Parseval normalization and cosine modulation',()=>{
 const dft=x=>x.map((_,k)=>x.reduce(([r,i],v,n)=>[r+v*Math.cos(-2*Math.PI*k*n/x.length),i+v*Math.sin(-2*Math.PI*k*n/x.length)],[0,0]));
 const x=[1,2,-3,4,2,0,-1,3],N=x.length,k0=2,X=dft(x);
 near(x.reduce((s,v)=>s+v*v,0),X.reduce((s,[r,i])=>s+r*r+i*i,0)/N);
 const Y=dft(x.map((v,n)=>v*Math.cos(2*Math.PI*k0*n/N)));
 for(let k=0;k<N;k++)for(let c=0;c<2;c++)near(Y[k][c],.5*(X[(k-k0+N)%N][c]+X[(k+k0)%N][c]));
 assert.deepEqual(by.get('DGT302-521').answer,[1]);assert.deepEqual(by.get('DGT302-519').answer,[0]);
});
test('Independent circuit arithmetic agrees with corrected options',()=>{
 near(.69*2000*100e-15/1e-12,138);near(.69*4000*50e-15/1e-12,138);
 near(2e-15/20e-15,.1);near(.8*2e-3/1e-3,1.6);near(600000/10000,60);
 for(const [id,key]of Object.entries({'ICI211-334':2,'ICI211-450':3,'ICI211-350':1,'ICI211-407':3,'ICI211-405':3}))assert.deepEqual(by.get(id).answer,[key]);
});
test('Cloud admin summaries use corrected grading keys for all reviewed key changes',async()=>{
 const env={DB:database(),ASSETS:assets(),IC_ADMIN_USERNAME:'auditadmin',IC_ADMIN_HASH:await passwordHash('test-answer-audit-2026')},origin='https://ic-study.test';
 const call=(path,method='GET',data,cookie)=>fetchApp(new Request(origin+path,{method,headers:{origin,'x-ic-request':'1','content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);
 const login=await call('/api/login','POST',{username:'auditadmin',password:'test-answer-audit-2026'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const changes=Object.entries(audit).filter(([id,a])=>JSON.stringify(a.original.answer)!==JSON.stringify(by.get(id).answer));
 const state={version:1,responses:Object.fromEntries(changes.map(([id])=>[id,{value:by.get(id).answer,at:100}])),history:[],sessions:[]};
 assert.equal((await call('/api/progress','PUT',{state,revision:0},cookie)).status,200);
 const users=(await(await call('/api/admin/users','GET',null,cookie)).json()).users;const p=users.find(u=>u.username==='auditadmin').progress;
 const groups=JSON.parse(fs.readFileSync('source/duplicate-review.json','utf8')).groups;const roots=new Map(groups.flatMap(g=>g.ids.map(id=>[id,g.ids[0]])));const expectedUnique=new Set(changes.map(([id])=>roots.get(id)||id)).size;assert.equal(p.done,expectedUnique);assert.equal(p.right,expectedUnique);
 for(const [id,a]of changes)state.responses[id].value=a.original.answer;
 assert.equal((await call('/api/progress','PUT',{state,revision:1},cookie)).status,200);
 const again=(await(await call('/api/admin/users','GET',null,cookie)).json()).users.find(u=>u.username==='auditadmin').progress;assert.equal(again.right,0);
});
test('Restore regrades prior keys and wrong lists without changing actual work or personal keys',()=>{
 const initial=()=>({version:1,responses:{},overrides:{},bookmarks:{},notes:{},daily:{},history:[],sessions:[],deletedSessions:[],wrongIds:[],session:null});
 const c={BANK:bank,BY_ID:by,SHORT_EXPLANATIONS:exp,initial,SUBJECTS:{DGT302:{}},normalizeStudyState:()=>({})};vm.createContext(c);
 const line=n=>html.split('\n').find(s=>s.startsWith('function '+n+'('));
 const section=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
 vm.runInContext(['same','validChoices'].map(line).join('\n')+'\n'+section('normalizeSavedSession','saveActiveSession')+section('regradeReviewedHistory','persist'),c);
 const id='DGT302-529',state={...initial(),responses:{[id]:{value:[2],at:100}},notes:{[id]:'keep'},bookmarks:{[id]:true},history:[{ids:[id],answers:{[id]:[2]},answerKeys:{[id]:[0]},finished:90}],session:{id:'keep-session',mode:'practice',ids:['DGT302-500',id],index:1,answers:{[id]:[2]},drafts:{[id]:[2]},wrongIds:[id],started:50}};
 let out=plain(c.validate(state));assert.deepEqual(out.history[0].answerKeys[id],[2]);assert.deepEqual(out.history[0].answers[id],[2]);assert.deepEqual(out.responses,state.responses);assert.deepEqual(out.wrongIds,[]);assert.deepEqual(out.session.wrongIds,[]);assert.equal(out.session.index,1);assert.equal(out.session.id,'keep-session');assert.deepEqual(out.session.drafts,state.session.drafts);assert.equal(out.notes[id],'keep');assert.equal(out.bookmarks[id],true);
 assert.deepEqual(plain(c.validate(out)),out,'migration is idempotent');
 state.responses[id].value=[0];state.session.answers[id]=[0];out=plain(c.validate(state));assert.deepEqual(out.wrongIds,[id]);assert.deepEqual(out.session.wrongIds,[id]);
 state.overrides[id]=[0];out=plain(c.validate(state));assert.deepEqual(out.history[0].answerKeys[id],[0]);assert.deepEqual(out.wrongIds,[]);
});
