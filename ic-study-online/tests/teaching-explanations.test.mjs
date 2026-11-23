import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');
const data=JSON.parse(fs.readFileSync('source/teaching-explanations.json','utf8'));
const lessons=Object.fromEntries(JSON.parse(fs.readFileSync('source/detailed-explanation-lessons.json','utf8')).map(x=>[x.id,{mechanism:x.mechanism,comparisons:x.comparisons}]));
const bank=JSON.parse(html.match(/<script id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const papers=JSON.parse(fs.readFileSync('source/past-exams.json','utf8'));
const short=JSON.parse(fs.readFileSync('source/short-explanations.json','utf8'));
const module=fs.readFileSync('source/teaching-explanations.js','utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');

function playerContext(mode,answer,flipped=false){
 const q=bank.find(q=>q.id==='ICI211-250');
 const context={SHORT_EXPLANATIONS:short,S:{overrides:{},bookmarks:{},notes:{},session:{mode,ids:[q.id],index:0,answers:answer?{[q.id]:answer}:{},examMarks:{},deadline:Date.now()+1000}},
  currentQ:()=>q,currentAnswer:()=>answer,correct:(_,a)=>JSON.stringify(a)===JSON.stringify(q.answer),same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),answerKey:q=>q.answer,
  esc,header:()=>'',btn:()=>'',studyBuddyWidget:()=>'',timeText:()=>'',showSource:false,draft:[],flipped,BY_ID:new Map(bank.map(q=>[q.id,q])),SUBJECTS:{ICI211:{name:'IC Design'}},
  document:{getElementById:id=>({textContent:JSON.stringify(id==='explanation-lessons'?lessons:data)})},view:'player',window:{isSecureContext:true},navigator:{clipboard:{writeText:text=>{context.copied=text}}},toast(){}};
 vm.createContext(context);
 const helpers=html.slice(html.indexOf('function shortExplanation(q)'),html.indexOf('function player()'));
 const player=html.slice(html.indexOf('function player()'),html.indexOf('\nfunction ',html.indexOf('function player()')+10));
 vm.runInContext(module+'\n'+['choiceLabel','studySaved','studyNote'].map(n=>html.split('\n').find(line=>line.startsWith('function '+n+'('))).join('\n')+'\n'+helpers+player,context);
 return context;
}

test('Teaching explanations cover both banks and embed identically in online and Anime HTML',()=>{
 const ids=[...bank.map(q=>q.id),...papers.flatMap(p=>p.pages.map(q=>q.id))];
 assert.equal(ids.length,1559);
 assert.deepEqual(Object.keys(data).sort(),ids.sort());
 for(const document of [html,offline]){
  assert.deepEqual(JSON.parse(document.match(/<script id="teaching-explanations"[^>]*>([\s\S]*?)<\/script>/)[1]),data);
  assert.ok(document.includes(module.trim()));
 }
 for(const [id,x] of Object.entries(data)){
  assert.ok(x.paragraphs.length>0&&x.paragraphs.every(p=>typeof p==='string'&&p.length>15),id);
  assert.ok(!/�|(?:đáp án|lựa chọn|phương án)\s+[A-E](?![\p{L}\p{N}])/iu.test(x.paragraphs.join(' ')+x.understand),id);
 }
});

test('Word-style explanations teach the mechanism, distinguish similar concepts and fill the five missing reasons',()=>{
 assert.equal(Object.values(data).filter(x=>x.source.kind==='word-reference').length,266);
 assert.match(data['ICI211-250'].paragraphs.join(' '),/phân cực thân/);
 assert.match(data['ICI211-251'].paragraphs.join(' '),/50%/);
 assert.match(data['ICI211-259'].paragraphs.join(' '),/nMOS.*pMOS/);
 assert.doesNotMatch(data['ICI211-259'].paragraphs.join(' '),/Đáp án B/);
 for(const n of [290,295,296,297,299])assert.ok(data['ICI211-'+n].paragraphs[0].length>120,n);
 assert.match(data['ICI211-296'].paragraphs[0],/race-through/);
 assert.match(data['ICI211-299'].paragraphs[0],/cổng đọc riêng/);
 assert.notEqual(data['ICI211-492'].source.kind,'word-reference');
 assert.match(data['DGT302-529'].paragraphs.join(' '),/h₁\[n\] \+ h₂\[n\]/);
 assert.match(data['LOS201-119'].paragraphs.join(' '),/SUSv3|curses/i);
});

test('Practice, flash cards and copying use the new explanation; exams still conceal it',async()=>{
 for(const [mode,answer,flipped,revealed] of [['practice',undefined,false,false],['practice',[0],false,true],['exam',[0],false,false],['flash',undefined,false,false],['flash',undefined,true,true]]){
  const context=playerContext(mode,answer,flipped), rendered=vm.runInContext('player()',context);
  assert.equal(rendered.includes('teaching-explanation'),revealed,mode);
  assert.equal(rendered.includes(esc(data['ICI211-250'].paragraphs[0])),revealed,mode);
  if(revealed){assert.match(rendered,/Hiểu nhanh \/ mẹo nhớ/);assert.ok(!rendered.includes('✦ Mẹo chọn nhanh'));}
 }
 const context=playerContext('practice',[0]);
 await context.copyExplanation('ICI211-250');
 assert.ok(context.copied.includes(data['ICI211-250'].paragraphs[0]));
 assert.ok(context.copied.includes(data['ICI211-250'].understand));
});

test('Past-paper feedback uses teaching text while preserving ungraded source warnings and alternative keys',()=>{
 const context=vm.createContext({document:{getElementById:id=>({textContent:JSON.stringify(id==='past-exams'?papers:id==='explanation-lessons'?lessons:data)}),addEventListener(){}},esc,choiceLabel:i=>'ABCDE'[i]});
 vm.runInContext(module+'\n'+fs.readFileSync('source/past-exams.js','utf8'),context);
 const q=papers.flatMap(p=>p.pages).find(q=>data[q.id].source.kind==='word-reference');
 assert.ok(q);
 const output=context.pastExamFeedback(q,{value:q.answer,checked:true},q.options.map((_,i)=>i));
 assert.ok(output.includes(esc(data[q.id].paragraphs[0])));
 const incomplete={...papers[0].pages[0],answer:[],caveat:'Đáp án nguồn chưa đủ để chấm câu này.'};
 const warning=context.pastExamFeedback(incomplete,{value:[0],checked:true},[0,1,2,3]);
 assert.match(warning,/không chấm đúng\/sai/);
 assert.ok(warning.includes(esc(incomplete.caveat)));
 const qmf=papers.find(p=>p.id==='dgt302-su26-fe').pages[23];
 assert.equal(context.pastExamCorrect(qmf,{value:[0],checked:true}),true);
 assert.equal(context.pastExamCorrect(qmf,{value:[3],checked:true}),true);
});
