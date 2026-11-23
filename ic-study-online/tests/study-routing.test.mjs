import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('source/study-routing.js','utf8').trim();
const ids = ['DGT302-533','DGT302-542'];

function fixture(hash = '#home') {
 const events = {};
 const page = {dataset:{studyPage:'0'}};
 const location = {hash};
 const history = {
  state:null, entries:[],
  replaceState(state, _, href) { this.state = state; location.hash = href; },
  pushState(state, _, href) {
   this.entries.push({state:this.state, hash:location.hash});
   this.replaceState(state, '', href);
  }
 };
 const session = {id:'saved-a',mode:'practice',ids,index:0,
  drafts:{[ids[1]]:[3]},optionOrders:{[ids[1]]:[3,2,1,0]}};
 const context = {
  URLSearchParams, view:'home', subject:'DGT302', knowledgeSubject:'', knowledgeQuery:'',
  studySelectedDay:null, briefSubject:'DGT302', page:0, resultIndex:0, COURSE_KNOWLEDGE:{DGT302:{}},
  SUBJECTS:{DGT302:{}, COS201:{}}, BY_ID:new Map(ids.map(id=>[id,{id,subject:'DGT302'}])),
  STUDY_BRIEFS:{DGT302:[{id:'roc'}]}, studyRelatedIds:()=>ids,
  STUDY_NEW:{}, STUDY_EXAMS:[], S:{session:{...session,id:'current'}, sessions:[session], history:[],lastSubject:'DGT302'},
  document:{addEventListener(name,handler){events[name]=handler}},
  window:{history,location,scrollY:0,scrollTo({top}){this.scrollY=top},addEventListener(name,handler){events[name]=handler}},
  $:id=>id==='app'?page:id==='modal'?{close(){}}:['knowledge-topic-roc','brief-card-roc'].includes(id)?{focus(){},scrollIntoView(){context.window.scrollY=650}}:null,
  knowledgeCards:()=>[{id:'roc',ids}], render(){}, nextMotto(){}, focusCurrentQuestion(){},
  restoreSessionDraft(){context.draft=context.S.session.drafts[context.S.session.ids[context.S.session.index]]},
  persist(){context.saves++}, saves:0,
  newSession(qs,mode,extra){
   context.S.session={id:'new',mode,ids:qs,index:0,drafts:{},...extra};
   context.view='player';context.recordStudyRoute();
  }
 };
 vm.createContext(context);
 vm.runInContext(source,context);
 context.initStudyRouting();
 const click=(href,modifiers={})=>{
  const event={button:0,preventDefault(){this.defaultPrevented=true},stopPropagation(){},
   target:{closest:()=>({getAttribute:()=>href})},...modifiers};
  events.click(event);
  return event;
 };
 const pop=({state,hash})=>{history.replaceState(state,'',hash);events.popstate({state});};
 return {context,history,location,click,pop};
}

test('Both editions embed the same router and leave the browser History API available',()=>{
 for(const file of ['source/study.html','../IC_Study_Anime.html']){
  const html=fs.readFileSync(file,'utf8').replaceAll('\r\n','\n');
  assert.ok(html.includes(source));
  assert.doesNotMatch(html,/\bfunction history\(/);
 }
});

test('Topic links can open in a new tab and back/forward recover the original position',()=>{
 const f=fixture();
 const topic='#knowledge?subject=DGT302&topic=roc';
 f.context.window.scrollY=210;
 assert.ok(f.click(topic).defaultPrevented);
 assert.equal(f.context.view,'knowledge');
 assert.equal(f.context.window.scrollY,650);
 const opened={hash:f.location.hash,state:f.history.state};
 f.pop(f.history.entries[0]);
 assert.equal(f.context.view,'home');
 assert.equal(f.context.window.scrollY,210);
 f.pop(opened);
 assert.equal(f.context.view,'knowledge');
 assert.equal(f.context.window.scrollY,650);
 assert.equal(f.click('#practice',{ctrlKey:true}).defaultPrevented,undefined);
 assert.equal(f.location.hash,topic);
 assert.equal(f.context.saves,0);
});

test('Player links restore the requested session, exact draft and shuffled choices',()=>{
 const f=fixture('#player?session=saved-a&question='+ids[1]);
 assert.equal(f.context.S.session.id,'saved-a');
 assert.equal(f.context.S.session.index,1);
 assert.deepEqual([...f.context.draft],[3]);
 assert.deepEqual([...f.context.S.session.optionOrders[ids[1]]],[3,2,1,0]);
 f.click('#player?session=saved-a&question='+ids[0]);
 f.pop(f.history.entries[0]);
 assert.equal(f.context.S.session.index,1);
 assert.equal(f.context.S.sessions[0].index,0);
});

test('Opening a practice link replaces it with a reloadable saved session URL',()=>{
 const f=fixture('#topic-practice?subject=DGT302&topic=roc');
 assert.equal(f.context.view,'player');
 assert.equal(f.location.hash,'#player?session=new&question='+ids[0]);
 assert.equal(f.history.entries.length,0);
});

test('Practice started from a brief links back to the same subject and card',()=>{
 const f=fixture('#brief-practice?subject=DGT302&topic=roc');
 assert.equal(f.context.view,'player');
 const origin=f.context.S.session.briefOrigin;
 assert.equal(origin.subject,'DGT302');
 assert.equal(origin.card,'roc');
 f.click(f.context.studyRouteUrl('brief',origin));
 assert.equal(f.context.view,'brief');
 assert.equal(f.context.briefSubject,'DGT302');
 assert.equal(f.context.window.scrollY,650);
 f.pop(f.history.entries[0]);
 assert.equal(f.context.view,'player');
 assert.equal(f.context.S.session.briefOrigin.card,'roc');
});
