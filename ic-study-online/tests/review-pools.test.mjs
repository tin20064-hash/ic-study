import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script[^>]*id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const oneLine=name=>html.split('\n').find(line=>line.startsWith('function '+name+'('));
const between=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
const code=[...['studyResponse','studyCorrect','studySaved','studyNote','studyMatches','toggleStudySaved','choiceLabel','validChoices','same','shuffle','createOptionOrders','correct','answerKey','subjectQuestions','answeredQuestionIds','wrongQuestionIds','updateWrong','persist','newSession','submitAnswer','sessionStats'].map(oneLine),
 between('collectionQuestions','startWrongReview'),between('normalizeSavedSession','normalizeSessionStore'),between('normalizeSessionStore','saveActiveSession'),between('saveActiveSession','updateWrong'),between('resumeSavedSession','restoreSessionDraft'),between('deleteSavedSession','restoreDeletedSession'),between('validate','persist')].join('\n');
const ids=subject=>bank.filter(q=>q.subject===subject).map(q=>q.id);
const dgt=ids('DGT302').slice(0,18),cos=ids('COS201').slice(0,3);
const wrong=id=>[(bank.find(q=>q.id===id).answer[0]+1)%4];
const plain=value=>JSON.parse(JSON.stringify(value));
function fixture(){
 const context={BANK:bank,BY_ID:new Map(bank.map(q=>[q.id,q])),SUBJECTS:{DGT302:{},COS201:{},LOS201:{},ICI211:{}},
  S:{version:1,responses:{},overrides:{},bookmarks:{},notes:{},history:[],daily:{},sessions:[],wrongIds:[],session:null},
  subject:'all',filter:'all',query:'',draft:[],showSource:false,flipped:false,view:'home',
  KEY:'test',localStorage:{setItem(){}},normalizeStudyState:()=>({}),initial:()=>({version:1,responses:{},overrides:{},bookmarks:{},notes:{},history:[],daily:{},sessions:[],wrongIds:[],session:null}),
  studyFocus:()=>null,studyRestrictIds:x=>x,studySessionAllowed:()=>true,toast:()=>{},render:()=>{},setView:()=>{},markDay:()=>{},restoreSessionDraft:()=>{},sessionId:()=>String(Math.random()),$:()=>({close(){}})};
 vm.createContext(context);vm.runInContext(fs.readFileSync('source/study-focus.js','utf8').replace("Object.freeze(['DGT302'])","Object.freeze(['DGT302','COS201','LOS201','ICI211'])"),context);vm.runInContext(code,context);
 return context;
}
const run=(c,s)=>vm.runInContext(s,c);
function answer(c,id,value=wrong(id)){
 c.subject=bank.find(q=>q.id===id).subject;
 c.newSession([id],'practice');
 c.currentQ=()=>c.BY_ID.get(id);c.currentAnswer=()=>c.S.session.answers[id];c.draft=value;
 c.submitAnswer();
}

test('18 DGT mistakes plus 3 COS mistakes survive new sessions and filter to 21/18/3',()=>{
 const c=fixture();for(const id of [...dgt,...cos])answer(c,id);
 assert.equal(c.wrongQuestionIds().length,21);
 for(const [subject,n]of [['all',21],['DGT302',18],['COS201',3],['LOS201',0]]){c.subject=subject;assert.equal(c.collectionQuestions('mistakes').length,n,subject);}
 assert.equal(c.S.session.wrongIds.length,1,'session snapshot contains only its own answers');
 c.newSession([ids('LOS201')[0]],'practice');assert.equal(c.wrongQuestionIds().length,21);
 assert.deepEqual(plain(c.S.session.answers),{});assert.deepEqual(plain(c.S.session.wrongIds),[]);
});
test('Legacy progress rebuilds aggregate mistakes from responses despite a 3-question session cache',()=>{
 const c=fixture(),data=plain(c.S);for(const id of [...dgt,...cos])data.responses[id]={value:wrong(id),at:123};
 data.wrongIds=cos;data.sessions=[];
 const restored=c.validate(data);assert.equal(restored.wrongIds.length,21);assert.equal(Object.keys(restored.responses).length,21);
});
test('Correcting a DGT answer removes only that question; resuming/deleting an old session cannot resurrect it or clear COS',()=>{
 const c=fixture();for(const id of [...dgt,...cos])answer(c,id);
 const old=c.S.sessions.find(s=>s.ids.includes(dgt[0]));
 answer(c,dgt[0],c.BY_ID.get(dgt[0]).answer);
 assert.equal(c.wrongQuestionIds().length,20);assert.ok(!c.wrongQuestionIds().includes(dgt[0]));
 c.resumeSavedSession(old.id);assert.equal(c.wrongQuestionIds().length,20);assert.ok(!c.wrongQuestionIds().includes(dgt[0]));
 c.deleteSavedSession(old.id);assert.equal(c.wrongQuestionIds().length,20);c.subject='COS201';assert.equal(c.collectionQuestions('mistakes').length,3);
});
test('Answered practice includes correct and wrong checked answers with fresh hidden choices; subject/search filters do not leak stale status',()=>{
 const c=fixture();answer(c,dgt[0],c.BY_ID.get(dgt[0]).answer);answer(c,cos[0]);
 c.subject='all';c.filter='saved';assert.equal(c.collectionQuestions('answered').length,2);
 c.subject='DGT302';assert.deepEqual(plain(c.collectionQuestions('answered').map(q=>q.id)),[dgt[0]]);
 c.subject='all';c.query=cos[0];assert.deepEqual(plain(c.collectionQuestions('answered').map(q=>q.id)),[cos[0]]);
 c.query='';c.newSession(c.collectionQuestions('answered').map(q=>q.id),'practice',{reviewAnswered:true});
 assert.equal(c.S.session.ids.length,2);assert.deepEqual(plain(c.S.session.answers),{});assert.deepEqual(plain(c.S.session.drafts),{});assert.equal(c.answeredQuestionIds().length,2);
});
test('Unsubmitted exam drafts do not enter global answered or wrong pools',()=>{
 const c=fixture();const id=cos[0];c.newSession([id],'exam',{deadline:Date.now()+60000});c.S.session.answers[id]=wrong(id);c.persist();
 assert.equal(c.wrongQuestionIds().length,0);assert.equal(c.answeredQuestionIds().length,0);assert.deepEqual(plain(c.S.session.wrongIds),[]);
});
