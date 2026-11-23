import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database,assets} from './d1-adapter.mjs';
import {fetchApp,passwordHash} from '../dist/server/index.js';
const html=fs.readFileSync('source/study.html','utf8');
const embedded=id=>JSON.parse(html.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const bank=embedded('question-bank'),cards=embedded('keyword-cards');
const line=n=>html.split('\n').find(s=>s.startsWith('function '+n+'('));
const between=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
const plain=x=>JSON.parse(JSON.stringify(x));
function fixture(q=bank.find(q=>q.id==='COS201-809')){
 let copied='',keydown;
 const c={BANK:bank,BY_ID:new Map(bank.map(q=>[q.id,q])),KEYWORD_CARDS:cards,KEYWORD_BY_ID:new Map(cards.map(c=>[c.id,c])),SUBJECTS:Object.fromEntries(['DGT302','COS201','ICI211','LOS201'].map(id=>[id,{name:id}])),
  S:{responses:{},overrides:{},notes:{},bookmarks:{},sessions:[],history:[],session:{id:'session',mode:'practice',ids:[q.id],index:0,answers:{},drafts:{}}},view:'player',subject:q.subject,draft:[],showSource:false,flipped:false,
  document:{addEventListener:(type,fn)=>{if(type==='keydown')keydown=fn}},window:{isSecureContext:true},navigator:{clipboard:{writeText:async s=>{copied=s}}},
  currentQ:()=>q,currentAnswer:()=>c.S.session.answers[q.id],studySessionAllowed:()=>true,studyRestrictIds:ids=>ids,studyFocus:()=>null,
  persist(){},render(){},setView(v){c.view=v},sessionId:()=>Math.random().toString(),toast(){},updateWrong(){},markDay(){},finishExam(){},move(){},
  header:()=>'',btn:(text,act)=>`<button data-act="${act}">${text}</button>`,studyBuddyWidget:()=>'',timeText:()=>'',source:()=>'',explanation:()=>'',esc:String,$:()=>({open:false})};
 vm.createContext(c);vm.runInContext(fs.readFileSync('source/study-focus.js','utf8').replace("Object.freeze(['DGT302'])","Object.freeze(['DGT302','COS201','LOS201','ICI211'])"),c);
 vm.runInContext(['studyResponse','studyCorrect','studySaved','studyNote','studyMatches','toggleStudySaved','choiceLabel','validChoices','same','keys','shuffle','createOptionOrders','answerKey','correct','selectChoice','submitAnswer','newSession','player','sessionKeys'].map(line).join('\n')+'\n'+between('normalizeSavedSession','normalizeSessionStore'),c);
 vm.runInContext(html.split('\n').find(s=>s.startsWith('async function copyQuestion(')),c);
 vm.runInContext(html.split('\n').find(s=>s.startsWith("document.addEventListener('keydown'")&&s.includes("view!=='player'")),c);
 return {c,q,press:key=>keydown({key,preventDefault(){},target:{closest:()=>false}}),copied:()=>copied};
}
test('Every new session permutes canonical choices including E and differs from the preceding session',()=>{
 const {c}=fixture(),ids=bank.map(q=>q.id),before=JSON.stringify(bank);c.newSession(ids,'practice');const first=plain(c.S.session.optionOrders);
 for(const q of bank){assert.deepEqual([...first[q.id]].sort(),q.options.map((_,i)=>i));assert.notDeepEqual(first[q.id],q.options.map((_,i)=>i));}
 c.newSession(ids,'practice');for(const q of bank)assert.notDeepEqual(plain(c.S.session.optionOrders[q.id]),first[q.id]);assert.equal(JSON.stringify(bank),before);
});
test('Switching question, rendering, serializing and resuming keep each session permutation and draft',()=>{
 const {c,q}=fixture();c.newSession([q.id,'DGT302-529'],'practice');const order=plain(c.S.session.optionOrders);
 c.selectChoice(order[q.id][1]);c.S.session.index=1;c.S.session.index=0;c.player();
 const restored=plain(c.normalizeSavedSession(plain(c.S.session)));assert.deepEqual(restored.optionOrders,order);assert.deepEqual(restored.drafts[q.id],[order[q.id][1]]);
 c.STUDY_BRIEFS={COS201:[{id:'pcm'}]};
 const fromBrief={...restored,briefOrigin:{subject:'COS201',card:'pcm'}};
 assert.deepEqual(plain(c.normalizeSavedSession(fromBrief).briefOrigin),fromBrief.briefOrigin);
 const legacy={...restored};delete legacy.optionOrders;assert.deepEqual(plain(c.normalizeSavedSession(legacy).optionOrders[q.id]),[0,1,2,3,4]);
 legacy.optionOrders={[q.id]:[0,0,2,3,4]};assert.deepEqual(plain(c.normalizeSavedSession(legacy).optionOrders[q.id]),[0,1,2,3,4]);
});
test('Displayed E/keyboard 5 grades its original answer, and copy/answer letters match the screen',async()=>{
 for(const mode of ['practice','exam']){
  const f=fixture(),{c,q}=f;c.S.session.mode=mode;c.S.session.deadline=Date.now()+60000;c.S.session.optionOrders={[q.id]:[4,2,0,3,1]};c.S.overrides[q.id]=[1];
  const out=c.player();assert.ok(out.includes('data-choice="1"'));assert.ok(out.includes('class="letter">E</span>'));
  f.press('5');assert.deepEqual(plain(c.draft),[1]);if(mode==='practice')c.submitAnswer();assert.deepEqual(plain(c.S.session.answers[q.id]),[1]);assert.equal(c.correct(q,c.S.session.answers[q.id]),true);assert.equal(c.sessionKeys(q,[1]),'E');
  await c.copyQuestion();assert.ok(f.copied().includes('\nA. '+q.options[4]));assert.ok(f.copied().includes('\nE. '+q.options[1]));
 }
});
test('Multi-select grading stays canonical after permuting visible labels',()=>{
 const f=fixture(),{c,q}=f;c.S.session.optionOrders={[q.id]:[4,2,0,3,1]};c.S.overrides[q.id]=[0,4];f.press('1');f.press('3');c.submitAnswer();assert.deepEqual(plain(c.S.responses[q.id].value),[0,4]);assert.equal(c.correct(q,c.S.responses[q.id].value),true);assert.equal(c.sessionKeys(q,[0,4]),'A + C');
});
test('Exam submission snapshots the permutation while storing canonical graded answers',()=>{
 const {c,q}=fixture();c.S.session.mode='exam';c.S.session.started=10;c.S.session.duration=30;c.S.session.optionOrders={[q.id]:[4,2,0,3,1]};c.S.session.answers={[q.id]:[1]};c.S.overrides[q.id]=[1];c.$=()=>({close(){}});
 vm.runInContext(line('finishExam'),c);c.finishExam();const h=plain(c.S.history[0]);assert.deepEqual(h.optionOrders[q.id],[4,2,0,3,1]);assert.deepEqual(h.answers[q.id],[1]);assert.deepEqual(h.answerKeys[q.id],[1]);assert.equal(c.sessionKeys(q,h.answers[q.id],h.optionOrders),'E');assert.equal(c.S.session,null);
});
test('Exam review marks survive resume and submission without leaking into saved questions',()=>{
 const {c,q,press}=fixture();
 const other=c.BY_ID.get('DGT302-529');
 Object.assign(c.S.session,{mode:'exam',ids:[q.id,other.id],deadline:Date.now()+60000,started:10,duration:30});
 c.S.bookmarks[other.id]=true;
 vm.runInContext(html.match(/^function togglePlayerMark\(id\)\{[\s\S]*?^}/m)[0],c);
 press('b');
 assert.deepEqual(plain(c.S.session.examMarks),{[q.id]:true});
 assert.deepEqual(plain(c.S.bookmarks),{[other.id]:true});
 c.S.session.examMarks.unrelated=true;
 c.S.session=plain(c.normalizeSavedSession(c.S.session));
 assert.deepEqual(c.S.session.examMarks,{[q.id]:true});
 c.$=()=>({close(){}});
 vm.runInContext(line('finishExam'),c);
 c.finishExam();
 assert.deepEqual(plain(c.S.history[0].examMarks),{[q.id]:true});
 Object.assign(c,{label:q=>q.question,shortExplanation:()=>'',pagination:()=>'',page:0,reviewFilter:'marked'});
 vm.runInContext(line('result'),c);
 const review=c.result();
 assert.match(review,/Đánh dấu xem lại \(1\)/);
 assert.ok(review.includes(q.id));
 assert.ok(!review.includes(other.id));
 assert.deepEqual(plain(c.S.bookmarks),{[other.id]:true});
});
test('Movable all/none-above options are worded without positional dependencies',async()=>{
 const f=fixture(bank.find(q=>q.id==='DGT302-711'));f.c.S.session.optionOrders={[f.q.id]:[1,3,2,0]};assert.ok(f.c.player().includes('All the other listed choices'));await f.c.copyQuestion();assert.ok(f.copied().includes('All the other listed choices'));
});
function keywordFixture(){const f=fixture();f.c.view='keywords';vm.runInContext(fs.readFileSync('source/keyword-study.js','utf8'),f.c);return f;}
test('48 curated keyword cards embed identically, with four unique answers and the screenshot concepts',()=>{
 assert.equal(cards.length,48);assert.deepEqual(cards,JSON.parse(fs.readFileSync('source/keyword-cards.json','utf8')));for(const c of cards){assert.equal(c.options.length,4);assert.equal(new Set(c.options).size,4);assert.ok(c.reason.length>20);}
 for(const course of ['DGT302','COS201','ICI211','LOS201'])assert.equal(cards.filter(c=>c.subject===course).length,12);
 for(const term of ['Real signal','JPEG / DCT','Rectangular window','n·x[n]','Real + even','Downsample'])assert.ok(cards.some(c=>c.prompt.includes(term)),term);
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');assert.deepEqual(cards,JSON.parse(offline.match(/<script id="keyword-cards"[^>]*>([\s\S]*?)<\/script>/)[1]));
});
test('Keyword reveal/hide removes answer, reason and correctness colours, retaining the chosen card/order',()=>{
 const {c}=keywordFixture();const responses=plain(c.S.responses),main=plain(c.S.session);c.startKeywordStudy('DGT302');const session=plain(c.S.keywordStudy),card=cards.find(x=>x.id===session.ids[0]);
 c.keywordSelect(1);let out=c.keywordsPage();assert.ok(!out.includes('id="keyword-answer"'));assert.ok(!out.includes('option correct'));assert.ok(!out.includes(card.reason));
 c.keywordToggle();out=c.keywordsPage();assert.ok(out.includes('id="keyword-answer"'));assert.ok(out.includes(card.reason));assert.ok(out.includes('option correct'));
 c.keywordToggle();out=c.keywordsPage();assert.ok(!out.includes('id="keyword-answer"'));assert.ok(!out.includes('option incorrect'));assert.ok(!out.includes(card.reason));
 c.keywordMove(1);c.keywordMove(-1);assert.deepEqual(plain(c.S.keywordStudy.optionOrders),session.optionOrders);assert.equal(c.S.keywordStudy.selected[card.id],1);assert.deepEqual(plain(c.S.responses),responses);assert.deepEqual(plain(c.S.session),main);
 const restored=plain(c.normalizeKeywordStudy(plain(c.S.keywordStudy)));assert.deepEqual(restored,plain(c.S.keywordStudy));
});
test('Cloud reconciliation retains immutable choice orders and merges keyword choices on two devices',()=>{
 const {c}=keywordFixture();c.startKeywordStudy('DGT302');const base=plain(c.S),left=structuredClone(base),right=structuredClone(base),ids=base.keywordStudy.ids;
 left.session.optionOrders={[left.session.ids[0]]:[4,3,2,1,0]};delete right.session.optionOrders;right.session.updated=100;
 left.keywordStudy.selected[ids[0]]=1;right.keywordStudy.selected[ids[1]]=2;right.keywordStudy.updated+=100;
 const ctx=vm.createContext({validate:s=>s});vm.runInContext(fs.readFileSync('account/progress-merge.js','utf8'),ctx);const out=plain(ctx.icReconcileProgress(left,right,base));
 assert.deepEqual(out.session.optionOrders,left.session.optionOrders);assert.deepEqual(out.keywordStudy.optionOrders,base.keywordStudy.optionOrders);assert.deepEqual(out.keywordStudy.selected,{[ids[0]]:1,[ids[1]]:2});
});
test('Cloud round-trip retains option permutations and keyword progress without inflating main progress',async()=>{
 const {c,q}=keywordFixture();c.S.session.optionOrders={[q.id]:[4,3,2,1,0]};c.startKeywordStudy('DGT302');c.keywordSelect(2);c.keywordMove(1);const state={...plain(c.S),version:1};
 const env={DB:database(),ASSETS:assets(),IC_ADMIN_USERNAME:'shuffleadmin',IC_ADMIN_HASH:await passwordHash('shuffle-keyword-test-2026')},origin='https://ic-study.test';
 const call=(path,method='GET',data,cookie)=>fetchApp(new Request(origin+path,{method,headers:{origin,'x-ic-request':'1','content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);
 const login=await call('/api/login','POST',{username:'shuffleadmin',password:'shuffle-keyword-test-2026'});const cookie=login.headers.get('set-cookie').split(';')[0];assert.equal((await call('/api/progress','PUT',{state,revision:0},cookie)).status,200);
 const saved=(await(await call('/api/progress','GET',null,cookie)).json()).state;assert.deepEqual(saved.session.optionOrders,state.session.optionOrders);assert.deepEqual(saved.keywordStudy,state.keywordStudy);
 const p=(await(await call('/api/admin/users','GET',null,cookie)).json()).users.find(u=>u.username==='shuffleadmin').progress;assert.equal(p.done,0);
});
