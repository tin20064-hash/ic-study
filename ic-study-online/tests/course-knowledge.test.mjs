import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const parse=(text,id)=>JSON.parse(text.match(new RegExp('<script id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const knowledge=parse(html,'course-knowledge');
const bank=new Map(parse(html,'question-bank').map(q=>[q.id,q]));
const aliases=new Set(parse(html,'duplicate-groups').flatMap(group=>group.ids.slice(1)));
const listeners={};
const calls=[];
const elements={};
const ctx={
 document:{
  getElementById:()=>({textContent:JSON.stringify(knowledge)}),
  addEventListener:(event,fn)=>{listeners[event]=fn}
 },
 $:id=>elements[id], esc:value=>String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;'),
 icon:()=>'', header:()=>'', btn:(text,act,extra)=>`<button data-act="${act}" ${extra}>${text}</button>`,
 S:{lastSubject:'DGT302'},
 newSession:(ids,mode)=>calls.push({ids:[...ids],mode,subject:ctx.subject}),
 setView:view=>calls.push(view), studyCopyText:(text,label)=>calls.push({text,label})
};
vm.createContext(ctx);
vm.runInContext(html.slice(html.indexOf('const STUDY_BRIEFS='),html.indexOf('function studyToday('))+html.slice(html.indexOf('const COURSE_KNOWLEDGE='),html.indexOf('function studyRelatedIds(')),ctx);
ctx.STUDY_EXAMS=Object.keys(knowledge).map(subject=>({subject,name:subject}));

test('Both editions include 18 complete topics per subject with canonical practice questions',()=>{
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');
 assert.deepEqual(parse(offline,'course-knowledge'),knowledge);
 assert.deepEqual(JSON.parse(fs.readFileSync('source/course-knowledge.json','utf8')),knowledge);
 assert.deepEqual(Object.keys(knowledge).sort(),['COS201','DGT302','ICI211','LOS201']);
 for(const code of Object.keys(knowledge)){
  const cards=ctx.knowledgeCards(code);
  assert.equal(cards.length,18,code);
  assert.equal(new Set(cards.map(card=>card.id)).size,18,code);
  for(const card of cards){
   for(const key of ['title','formula','note','tip','example'])assert.ok(card[key].trim(),card.id+': '+key);
   assert.ok(card.ids.length>=2,card.id);
   assert.equal(new Set(card.ids).size,card.ids.length,card.id);
   for(const id of card.ids){assert.equal(bank.get(id)?.subject,code,id);assert.ok(!aliases.has(id),id);}
  }
 }
});

test('Topic search handles Vietnamese accents and all subjects offer topic practice',()=>{
 for(const id of ['knowledge-count','knowledge-index','knowledge-topics'])elements[id]={};
 listeners.input({target:{id:'knowledge-search',dataset:{subject:'DGT302'},value:'bien doi z'}});
 assert.match(elements['knowledge-topics'].innerHTML,/knowledge-topic-roc/);
 assert.doesNotMatch(elements['knowledge-topics'].innerHTML,/knowledge-topic-sampling/);
 const click=dataset=>listeners.click({target:{closest:()=>({dataset})}});
 const quiz={act:'knowledge-quiz',subject:'DGT302',card:'roc'};
 for(const code of Object.keys(knowledge))assert.match(ctx.knowledgePage(),new RegExp(`data-subject="${code}" aria-pressed="(?:true|false)">`));
 click(quiz);
 assert.deepEqual(calls[0],{ids:knowledge.DGT302.core.roc.ids,mode:'practice',subject:'DGT302'});
 click({act:'knowledge-copy',subject:'COS201'});
 assert.match(calls[1].text,/COS201.*\n\n[\s\S]*Mẹo làm nhanh\.[\s\S]*Ví dụ\./);
 assert.match(calls[1].text,/I\(X;Y\)/);
});

test('Admin supplemental practice contains exactly the LOS and ICI questions outside final-day card quizzes',()=>{
 const BANK=[...bank.values()];
 const calls=[];
 let click;
 const context=vm.createContext({BANK,ICDuplicates:{questions:pool=>pool.filter(q=>!aliases.has(q.id))},
  document:{addEventListener:(type,handler)=>{assert.equal(type,'click');click=handler}},
  btn:label=>label,subject:null,newSession:(ids,mode,extra)=>calls.push({ids:[...ids],mode,origin:extra.briefOrigin.subject})});
 const briefDefinitions=html.slice(html.indexOf('const STUDY_BRIEFS='),html.indexOf('const STUDY_REFS='));
 const related=html.match(/function studyRelatedIds\([^\n]+/)[0];
 vm.runInContext(briefDefinitions+'\n'+related+'\n'+fs.readFileSync('source/admin-brief-extra.js','utf8'),context);
 for(const code of ['LOS201','ICI211']){
  const covered=new Set(vm.runInContext(`STUDY_BRIEFS['${code}'].flatMap(card=>studyRelatedIds('${code}',card))`,context));
  const missing=BANK.filter(q=>q.subject===code&&!aliases.has(q.id)&&!covered.has(q.id)).map(q=>q.id);
  assert.ok(missing.length>0);
  assert.deepEqual([...context.adminBriefExtraIds(code)],missing);
  assert.match(context.renderAdminBriefExtra(code),new RegExp(`Luyện ${missing.length} câu`));
  click({target:{closest:()=>({dataset:{subject:code}})}});
  assert.deepEqual(calls.at(-1),{ids:missing,mode:'practice',origin:code});
 }
 for(const code of ['DGT302','COS201','constructor']){
  assert.equal(context.renderAdminBriefExtra(code),'');
  click({target:{closest:()=>({dataset:{subject:code}})}});
 }
 assert.equal(calls.length,2);
});
