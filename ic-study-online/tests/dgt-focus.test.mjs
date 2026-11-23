import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const read=id=>JSON.parse(html.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const bank=read('question-bank'),cards=read('keyword-cards'),exams=read('past-exams');
const focus=fs.readFileSync('source/study-focus.js','utf8').trim();
const line=name=>html.split('\n').find(s=>s.startsWith('function '+name+'('));
const section=(a,b)=>html.slice(html.indexOf('function '+a+'('),html.indexOf('function '+b+'('));
const plain=x=>JSON.parse(JSON.stringify(x));
const sample=subject=>bank.find(q=>q.subject===subject);
function fixture(){
 const c={BANK:bank,BY_ID:new Map(bank.map(q=>[q.id,q])),KEYWORD_CARDS:cards,KEYWORD_BY_ID:new Map(cards.map(q=>[q.id,q])),
  SUBJECTS:Object.fromEntries(['DGT302','COS201','LOS201','ICI211'].map(subject=>[subject,{name:subject,en:subject,keywords:[]}])) ,
  STUDY_EXAMS:['DGT302','COS201','LOS201','ICI211'].map(subject=>({subject,name:subject})),PAST_EXAMS:exams,
  SHORT_EXPLANATIONS:read('short-explanations'),S:{version:1,responses:{},bookmarks:{},notes:{},overrides:{},history:[],daily:{},sessions:[],deletedSessions:[],wrongIds:[],session:null,lastSubject:'COS201'},
  subject:'all',query:'',filter:'all',view:'home',page:0,draft:[],flipped:false,showSource:false,KEY:'progress',
  document:{addEventListener(){}},localStorage:{setItem(){}},toast(){},render(){},setView(v){c.view=v},markDay(){},
  $:()=>({close(){}}),localDay:()=> '2026-11-23',normalizeStudyState:()=>({}),header:()=>'',icon:()=>'',btn:(text,act)=>`<button data-act="${act}">${text}</button>`,esc:String,
  studyDailyHomeCard:()=>'',studyTaskById:()=>null,studyReadKey:()=>'',studyState:()=>({cards:{}}),studyToday:()=>'',
  studyResponse:id=>c.S.responses[id],studySaved:id=>!!c.S.bookmarks[id],studyMatches:()=>true,
  deletedSessionsPanel:()=>'',pastExamSubject:'all',pastExamTerm:'all',pastExamUrl:id=>'#past-exams?exam='+id,
  pastExamResponse:()=>null,pastExamCorrect:()=>null,keywordRevealed:false};
 vm.createContext(c);
 vm.runInContext(focus+'\n'+fs.readFileSync('source/duplicate-questions.js','utf8')+'\nvar ICDuplicates=createDuplicateIndex(BANK,'+JSON.stringify(read('duplicate-groups'))+');',c);
 vm.runInContext(['same','answerKey','correct','counts','subjectQuestions','answeredQuestionIds','wrongQuestionIds','updateWrong','persist','newSession','shuffle','createOptionOrders','sessionId','sessionStats','sessionTitle','subtitle','subjectSelect','examSetup','examQuestionPool','unique','validChoices','choiceLabel','studyResponse','studyCorrect','studySaved','studyNote','studyMatches'].map(line).join('\n')+'\n'+section('home','subjectSelect')+section('collectionQuestions','startWrongReview')+section('saveActiveSession','updateWrong')+section('sessionsPage', 'deletedSessionsPanel').split("document.addEventListener")[0]+section('pastExamLibrary','pastExamsPage'),c);
 vm.runInContext(fs.readFileSync('source/keyword-study.js','utf8'),c);
 return c;
}

test('DGT scope is embedded in both editions while all source banks remain intact',()=>{
 for(const file of ['source/study.html','../IC_Study_Anime.html']){
  const text=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
  assert.ok(text.includes(focus));
  for(const script of text.matchAll(/<script(?![^>]*type="application\/json")[^>]*>([\s\S]*?)<\/script>/g))new vm.Script(script[1]);
 }
 assert.equal(bank.length,959);
 assert.deepEqual(new Set(bank.map(q=>q.subject)),new Set(['DGT302','COS201','ICI211','LOS201']));
});

test('Every study pool and selector stays on DGT even with stale all/COS filters',()=>{
 const c=fixture();
 for(const subject of ['all','COS201','LOS201','ICI211','DGT302']){
  c.subject=subject;
  assert.ok(c.subjectQuestions().every(q=>q.subject==='DGT302'));
  assert.ok(c.examQuestionPool('all').every(q=>q.subject==='DGT302'));
 }
 c.subject='all';assert.equal(c.subjectQuestions().length,200);
 const selector=c.subjectSelect();assert.match(selector,/DGT302/);assert.doesNotMatch(selector,/COS201|LOS201|ICI211|value="all"/);
 assert.equal(c.studyScopeSubject(c.S.lastSubject),'DGT302');
});

test('Creating DGT practice preserves every other course response, mark and saved session',()=>{
 const c=fixture(),dgt=sample('DGT302'),cos=sample('COS201');
 c.S.responses[cos.id]={value:cos.answer,at:123};c.S.bookmarks[cos.id]=true;c.S.notes[cos.id]='Giữ ghi chú';
 c.S.session={id:'cos-session',ids:[cos.id],index:0,answers:{[cos.id]:cos.answer},drafts:{},mode:'practice',updated:1};
 c.newSession([cos.id,dgt.id],'practice');
 assert.deepEqual(plain(c.S.session.ids),[c.ICDuplicates.root(dgt.id)]);assert.equal(c.subject,'DGT302');
 assert.deepEqual(plain(c.S.responses[cos.id]),{value:cos.answer,at:123});
 assert.equal(c.S.bookmarks[cos.id],true);assert.equal(c.S.notes[cos.id],'Giữ ghi chú');
 assert.ok(c.S.sessions.some(s=>s.id==='cos-session'));
 assert.deepEqual(plain(c.S.session.answers),{});
});

test('Wrong-answer aggregation retains all courses while the visible collection only lists DGT',()=>{
 const c=fixture(),dgt=sample('DGT302'),cos=sample('COS201');
 for(const q of [dgt,cos])c.S.responses[q.id]={value:[(q.answer[0]+1)%q.options.length],at:123};
 c.persist();assert.equal(c.S.wrongIds.length,2);
 assert.ok(c.collectionQuestions('mistakes').every(q=>q.subject==='DGT302'));
 assert.equal(c.collectionQuestions('mistakes').length,1);
 assert.equal(c.collectionQuestions('answered').length,1);
 assert.equal(c.studyVisibleIds(c.S.wrongIds).length,1);
});

test('Dashboard, saved sessions and past exam library hide other subjects without modifying state',()=>{
 const c=fixture(),dgt=sample('DGT302'),cos=sample('COS201');
 const saved=(id,q)=>({id,ids:[q.id],index:0,answers:{},mode:'practice',updated:1});
 c.S.sessions=[saved('dgt-session',dgt),saved('cos-session',cos)];c.S.session=c.S.sessions[1];
 const before=JSON.stringify(c.S);
 for(const output of [c.home(),c.sessionsPage(),c.pastExamLibrary(),c.studyFocusBanner(),c.studyFocusTimeline()]){
  assert.match(output,/DGT302/);assert.doesNotMatch(output,/COS201|LOS201|ICI211|Tất cả 4 môn|17–20\/11/);
 }
 assert.equal(JSON.stringify(c.S),before);
 assert.equal(c.studySessionVisible({ids:[dgt.id,cos.id]}),false,'mixed sessions stay archived intact');
});

test('Keyword decks only contain DGT and hide an older foreign deck until a new one is started',()=>{
 const c=fixture();const old=cards.find(q=>q.subject==='COS201');
 c.S.keywordStudy={ids:[old.id],subject:'COS201'};
 assert.equal(c.studyVisibleKeywordStudy(),null);
 assert.doesNotMatch(c.keywordsPage(),/COS201|LOS201|ICI211|Tất cả 4 môn/);
 c.startKeywordStudy('all');
 assert.equal(c.S.keywordStudy.ids.length,12);
 assert.ok(c.S.keywordStudy.ids.every(id=>id.startsWith('DGT302-')));
 const orders=plain(c.S.keywordStudy.optionOrders);
 c.keywordMove(1);c.keywordMove(-1);assert.deepEqual(plain(c.S.keywordStudy.optionOrders),orders);
});
