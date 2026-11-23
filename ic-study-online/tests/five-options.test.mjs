import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database,assets} from './d1-adapter.mjs';
import {fetchApp,passwordHash} from '../dist/server/index.js';
const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script[^>]*id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const q=bank.find(q=>q.id==='COS201-809');
const line=name=>html.split('\n').find(s=>s.startsWith('function '+name+'('));
const section=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(mode='practice'){
 let keydown;let copied='';
 const initial=()=>({version:1,responses:{},overrides:{},bookmarks:{},notes:{},daily:{},history:[],sessions:[],wrongIds:[],session:null});
 const c={BANK:bank,BY_ID:new Map(bank.map(q=>[q.id,q])),S:initial(),SUBJECTS:{COS201:{name:'Communication'}},
  subject:'COS201',view:'player',draft:[],showSource:false,flipped:false,
  $:()=>({open:false}),document:{addEventListener:(type,handler)=>{if(type==='keydown')keydown=handler}},
  currentQ:()=>q,currentAnswer:()=>c.S.session.answers[q.id],studySessionAllowed:()=>true,persist(){},render(){},toast(){},updateWrong(){},markDay(){},finishExam(){},move(){},
  header:()=>'',btn:()=>'',studyBuddyWidget:()=>'',timeText:()=>'',source:()=>'',explanation:()=>'<section class="feedback"></section>',
  esc:String,initial,normalizeStudyState:()=>({}),window:{isSecureContext:true},navigator:{clipboard:{writeText:async text=>{copied=text}}}};
 c.S.session={id:'five-test',mode,ids:[q.id],index:0,answers:{},drafts:{},deadline:Date.now()+60000};
 vm.createContext(c);vm.runInContext(['studyResponse','studyCorrect','studySaved','studyNote','studyMatches','toggleStudySaved','choiceLabel','validChoices','keys','same','answerKey','correct','selectChoice','submitAnswer','player'].map(line).join('\n')+'\n'+section('normalizeSavedSession','normalizeSessionStore')+section('normalizeSessionStore','saveActiveSession')+section('validate','persist'),c);
 vm.runInContext(html.split('\n').find(s=>s.startsWith('async function copyQuestion(')),c);
 vm.runInContext(html.split('\n').find(s=>s.startsWith("document.addEventListener('keydown'")&&s.includes("view!=='player'")),c);
 return {c,press:key=>keydown({key,preventDefault(){},target:{closest:()=>false}}),get copied(){return copied}};
}
test('All nine source questions expose separate D and E options with unchanged source answers',()=>{
 const expected={809:'It does not use modulation',818:'It increases bandwidth',820:'A storage device',828:'It increases bandwidth efficiency',830:'Linear response',839:'Linear',840:'Linear phase response',844:'To deliver the message to the destination',846:'Noise addition'};
 assert.equal(bank.filter(q=>q.options.length===5).length,18);
 for(const [id,last]of Object.entries(expected)){const q=bank.find(q=>q.id==='COS201-'+id);assert.equal(q.options.length,5);assert.equal(q.options[4],last);assert.ok(!q.options[3].includes(' E. '));assert.ok(q.answer.every(i=>i<4));}
});
test('Player renders five separate buttons and 1–5 hints; keyboard 5 selects E in practice and exams',()=>{
 for(const mode of ['practice','exam']){const f=fixture(mode);const out=f.c.player();assert.deepEqual([...out.matchAll(/data-choice="(\d+)"/g)].map(m=>m[1]),['0','1','2','3','4']);assert.ok(out.includes('class="letter">E</span>'));assert.ok(out.includes('<kbd>5</kbd>'));
  f.press('5');assert.deepEqual(plain(f.c.draft),[4]);if(mode==='exam')assert.deepEqual(plain(f.c.S.session.answers[q.id]),[4]);else{f.c.submitAnswer();assert.deepEqual(plain(f.c.S.responses[q.id].value),[4]);}
 }
});
test('Copy includes a separate E line and answer labels support E and multiple choices',async()=>{
 const f=fixture();await f.c.copyQuestion();assert.ok(f.copied.includes('\nD. It operates at higher frequencies\nE. It does not use modulation'));assert.equal(f.c.keys([0,4]),'A + E');
 f.c.S.overrides[q.id]=[0,4];f.c.selectChoice(0);f.c.selectChoice(4);f.c.submitAnswer();assert.equal(f.c.correct(q,f.c.S.responses[q.id].value),true);
});
test('Import/resume retains E in responses, drafts, history and custom answer keys, while rejecting E on four-option questions',()=>{
 const f=fixture(),data=plain(f.c.S);data.responses[q.id]={value:[4],at:1};data.responses['DGT302-500']={value:[4],at:1};data.overrides[q.id]=[4];data.session.answers[q.id]=[4];data.session.drafts[q.id]=[4];data.history=[{ids:[q.id],answers:{[q.id]:[4]},answerKeys:{[q.id]:[4]}}];
 const restored=f.c.validate(data);assert.deepEqual(plain(restored.responses[q.id].value),[4]);assert.equal(restored.responses['DGT302-500'],undefined);assert.deepEqual(plain(restored.session.answers[q.id]),[4]);assert.deepEqual(plain(restored.session.drafts[q.id]),[4]);assert.deepEqual(plain(restored.overrides[q.id]),[4]);assert.deepEqual(plain(restored.history[0].answerKeys[q.id]),[4]);
 f.c.selectChoice(5);assert.deepEqual(plain(f.c.draft),[]);
});
test('Cloud progress round-trip preserves E only where that option exists',async()=>{
 const env={DB:database(),ASSETS:assets(),IC_ADMIN_USERNAME:'fiveadmin',IC_ADMIN_HASH:await passwordHash('five-options-test-password')},origin='https://ic-study.test';
 async function api(path,method='GET',data,cookie){return fetchApp(new Request(origin+path,{method,headers:{origin,'x-ic-request':'1','content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),env)}
 const login=await api('/api/login','POST',{username:'fiveadmin',password:'five-options-test-password'});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie').split(';')[0];
 const state={version:1,responses:{[q.id]:{value:[4],at:1},'DGT302-500':{value:[4],at:1}},sessions:[],history:[]};
 assert.equal((await api('/api/progress','PUT',{state,revision:0},cookie)).status,200);
 const saved=await (await api('/api/progress','GET',null,cookie)).json();assert.deepEqual(saved.state.responses[q.id].value,[4]);assert.equal(saved.state.responses['DGT302-500'],undefined);
});
