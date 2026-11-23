import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {database,assets} from './d1-adapter.mjs';
import {fetchApp,passwordHash} from '../dist/server/index.js';
const html=fs.readFileSync('source/study.html','utf8');
const parse=(s,id)=>JSON.parse(s.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const bank=parse(html,'question-bank'),groups=parse(html,'duplicate-groups'),by=new Map(bank.map(q=>[q.id,q]));
const report=JSON.parse(fs.readFileSync('source/duplicate-review.json','utf8'));
const source=fs.readFileSync('source/duplicate-questions.js','utf8').replaceAll('\r\n','\n');
const line=n=>html.split('\n').find(s=>s.startsWith('function '+n+'('));
const section=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
const plain=x=>JSON.parse(JSON.stringify(x));
const initial=()=>({version:1,responses:{},overrides:{},bookmarks:{},notes:{},daily:{},history:[],sessions:[],deletedSessions:[],wrongIds:[],session:null});
function fixture(){
 const c={BANK:bank,BY_ID:by,SHORT_EXPLANATIONS:parse(html,'short-explanations'),groups,S:initial(),initial,SUBJECTS:{DGT302:{},COS201:{},ICI211:{},LOS201:{}},normalizeStudyState:()=>({}),subject:'all',studyFocus:()=>null,query:'',filter:'all',view:'practice',draft:[],showSource:false,flipped:false,toast(){},render(){},setView(){},persist(){},studyRestrictIds:a=>a,studySessionAllowed:()=>true};
 vm.createContext(c);vm.runInContext(fs.readFileSync('source/study-focus.js','utf8').replace("Object.freeze(['DGT302'])","Object.freeze(['DGT302','COS201','LOS201','ICI211'])"),c);vm.runInContext(source+'\nvar ICDuplicates=createDuplicateIndex(BANK,groups);',c);
 const names=['studyResponse','studyCorrect','studySaved','studyNote','studyMatches','toggleStudySaved','same','validChoices','answerKey','correct','choiceLabel','counts','subjectQuestions','answeredQuestionIds','wrongQuestionIds','matching','unique','examQuestionPool','sessionId','shuffle','createOptionOrders','newSession','sessionStats'];
 vm.runInContext(names.map(line).join('\n')+'\n'+section('collectionQuestions','startWrongReview')+section('normalizeSavedSession','saveActiveSession')+section('regradeReviewedHistory','persist'),c);
 return c;
}

test('Curated groups reduce 959 to 753 and cover every identical stem without merging different numeric problems',()=>{
 const c=fixture(),q=c.ICDuplicates.questions(bank);assert.equal(q.length,753);assert.equal(c.ICDuplicates.total,753);assert.equal(report.removedDuplicates,206);
 assert.deepEqual(Object.fromEntries(Object.keys(report.totals).map(s=>[s,q.filter(q=>q.subject===s).length])),report.totals);
 const seen=new Map();for(const q of bank){const k=q.subject+q.question.normalize('NFKC').toLowerCase().replace(/\W/g,'');if(seen.has(k))assert.equal(c.ICDuplicates.root(q.id),c.ICDuplicates.root(seen.get(k)),q.id);else seen.set(k,q.id);}
 for(const [a,b]of [['ICI211-334','ICI211-450'],['ICI211-308','ICI211-342'],['LOS201-196','LOS201-203'],['DGT302-521','DGT302-739']])assert.notEqual(c.ICDuplicates.root(a),c.ICDuplicates.root(b));
});

test('Alias-only correct work retains its original answer index and counts once under the canonical question',()=>{
 const c=fixture();c.S.responses['DGT302-500']={value:[1],at:10};
 assert.deepEqual(by.get('DGT302-585').answer,[2]);assert.deepEqual(plain(c.counts(bank)),{done:1,right:1});
 assert.deepEqual(plain(c.answeredQuestionIds()),['DGT302-585']);assert.deepEqual(plain(c.wrongQuestionIds()),[]);
 assert.deepEqual(c.S.responses['DGT302-500'].value,[1]);assert.ok(!c.S.responses['DGT302-585']);
 c.S.responses['DGT302-585']={value:[0],at:20};assert.deepEqual(plain(c.counts(bank)),{done:1,right:0});assert.deepEqual(plain(c.wrongQuestionIds()),['DGT302-585']);
 c.S.responses['DGT302-773']={value:[3],at:30};assert.deepEqual(plain(c.counts(bank)),{done:1,right:1});assert.equal(Object.keys(c.S.responses).length,3);
});

test('All pools show one canonical record, use latest result and retain alias search/bookmarks/notes',()=>{
 const c=fixture();c.S.responses['DGT302-500']={value:[0],at:10};c.S.bookmarks['DGT302-638']=true;c.S.notes['DGT302-773']='ghi chú cũ';
 assert.equal(c.subjectQuestions().length,753);assert.equal(c.examQuestionPool('all').length,753);
 for(const pool of ['answered','wrong','saved'])assert.deepEqual(plain(c.examQuestionPool(pool).map(q=>q.id)),['DGT302-585']);
 c.query='DGT302-638';assert.deepEqual(plain(c.matching().map(q=>q.id)),['DGT302-585']);assert.equal(c.studyNote('DGT302-585'),'ghi chú cũ');
 c.toggleStudySaved('DGT302-585');assert.equal(c.studySaved('DGT302-585'),false);assert.equal(Object.keys(c.S.bookmarks).length,0);
 c.toggleStudySaved('DGT302-585');assert.equal(c.studySaved('DGT302-638'),true);
 c.S.responses['DGT302-585']={value:[2],at:20};assert.equal(c.examQuestionPool('wrong').length,0);
});

test('Resuming a duplicate session retains current question, all original choices, drafts, and immutable option orders',()=>{
 const c=fixture(),ids=['DGT302-500','DGT302-529','DGT302-585','DGT302-773'];
 const state={...initial(),responses:{'DGT302-500':{value:[1],at:10}},session:{id:'old-session',mode:'practice',ids,index:2,answers:{'DGT302-500':[1],'DGT302-585':[2]},drafts:{'DGT302-773':[0]},optionOrders:{'DGT302-500':[2,1,3,0],'DGT302-585':[3,2,1,0],'DGT302-773':[0,3,2,1]},started:5,updated:10},notes:{'DGT302-773':'keep'},bookmarks:{'DGT302-638':true},history:[]};
 const out=plain(c.validate(state));assert.deepEqual(out.session.ids,['DGT302-585','DGT302-529']);assert.equal(out.session.index,0);assert.equal(out.session.ids[out.session.index],'DGT302-585');assert.equal(out.session.id,'old-session');
 assert.deepEqual(out.session.answers,state.session.answers);assert.deepEqual(out.session.drafts,state.session.drafts);assert.deepEqual(out.session.optionOrders['DGT302-500'],[2,1,3,0]);assert.deepEqual(out.session.optionOrders['DGT302-585'],[3,2,1,0]);assert.deepEqual(out.session.sourceIds,ids);
 assert.deepEqual(out.responses,state.responses);assert.deepEqual(out.notes,state.notes);assert.deepEqual(out.bookmarks,state.bookmarks);assert.deepEqual(plain(c.validate(out)),out);
});

test('New sessions remove duplicate aliases while keeping answers hidden and legacy completed exams intact',()=>{
 const c=fixture();c.newSession(bank.map(q=>q.id),'practice');assert.equal(c.S.session.ids.length,753);assert.equal(new Set(c.S.session.ids.map(c.ICDuplicates.root)).size,753);assert.deepEqual(plain(c.S.session.answers),{});
 const exam={id:'old-exam',mode:'exam',status:'completed',ids:['DGT302-500','DGT302-585'],index:1,answers:{'DGT302-500':[1],'DGT302-585':[2]},started:10,deadline:20};
 const out=plain(c.normalizeSavedSession(exam));assert.deepEqual(out.ids,exam.ids);assert.deepEqual(out.answers,exam.answers);assert.equal(out.index,1);
});

test('Timeline covers all 753 unique questions exactly once before final review days',()=>{
 const c=fixture(),definition=html.match(/const STUDY_NEW=\{[\s\S]*?\n\};/)[0];
 vm.runInContext(definition+'\n'+line('studyRange')+'\n'+line('studyDayIds')+'\nvar planDays=Object.keys(STUDY_NEW);',c);
 const ids=c.planDays.flatMap(day=>plain(c.studyDayIds(day)));assert.equal(ids.length,753);assert.equal(new Set(ids).size,753);assert.ok(c.planDays.every(day=>day<='2026-11-15'));
 assert.deepEqual([...ids].sort(),plain(c.ICDuplicates.questions(bank).map(q=>q.id)).sort());
});

test('Cloud preserves alias data verbatim while admin totals count latest unique results',async()=>{
 const env={DB:database(),ASSETS:assets(),IC_ADMIN_USERNAME:'duplicateadmin',IC_ADMIN_HASH:await passwordHash('test-duplicate-review-2026')},origin='https://ic-study.test';
 const call=(path,method='GET',data,cookie)=>fetchApp(new Request(origin+path,{method,headers:{origin,'x-ic-request':'1','content-type':'application/json',...(cookie?{cookie}:{})},...(data?{body:JSON.stringify(data)}:{})}),env);
 const login=await call('/api/login','POST',{username:'duplicateadmin',password:'test-duplicate-review-2026'}),cookie=login.headers.get('set-cookie').split(';')[0];
 const state={...initial(),responses:{'DGT302-500':{value:[1],at:10},'DGT302-585':{value:[0],at:20},'COS201-985':{value:[4],at:30}},session:null,sessions:[{id:'completed-exam',mode:'exam',status:'completed',ids:['DGT302-500','DGT302-585'],answers:{'DGT302-500':[1],'DGT302-585':[0]},updated:100}]};
 assert.equal((await call('/api/progress','PUT',{state,revision:0},cookie)).status,200);
 const restored=await(await call('/api/progress','GET',null,cookie)).json();assert.deepEqual(restored.state.responses,state.responses);
 let p=(await(await call('/api/admin/users','GET',null,cookie)).json()).users.find(u=>u.username==='duplicateadmin').progress;
 assert.equal(p.done,2);assert.equal(p.right,1);assert.deepEqual(Object.fromEntries(Object.entries(p.subjects).map(([s,v])=>[s,v.total])),report.totals);assert.equal(p.sessions[0].total,2);assert.equal(p.sessions[0].answered,2);
 state.responses['DGT302-773']={value:[3],at:40};assert.equal((await call('/api/progress','PUT',{state,revision:1},cookie)).status,200);
 p=(await(await call('/api/admin/users','GET',null,cookie)).json()).users.find(u=>u.username==='duplicateadmin').progress;assert.equal(p.done,2);assert.equal(p.right,2);
});

test('Offline and online duplicate data/code agree and all inline scripts compile',()=>{
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');assert.deepEqual(parse(offline,'duplicate-groups'),groups);assert.deepEqual(groups,report.groups);assert.ok(html.replaceAll('\r\n','\n').includes(source));assert.ok(offline.replaceAll('\r\n','\n').includes(source));
 for(const [name,text]of [['offline',offline],['online',html]])for(const m of text.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g))if(!/application\/json/.test(m[1]))assert.doesNotThrow(()=>new vm.Script(m[2]),name);
});
