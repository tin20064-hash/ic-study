import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const parse=(text,id)=>JSON.parse(text.match(new RegExp('<script[^>]*id="'+id+'"[^>]*>([\\s\\S]*?)</script>'))[1]);
const bank=parse(html,'question-bank'),by=new Map(bank.map(q=>[q.id,q])),exp=parse(html,'short-explanations');
const review=JSON.parse(fs.readFileSync('source/tip-review.json','utf8'));
const audit=JSON.parse(fs.readFileSync('source/answer-audit.json','utf8'));
const backup=fs.readFileSync('../backups/before-tip-review-2026-11-10/online-source.html','utf8');
const before=parse(backup,'short-explanations');
const selected=id=>by.get(id).answer.map(i=>by.get(id).options[i]);

test('Learning review reads every original ID and all 753 active questions',()=>{
 const ledger=review.subjects.flatMap(s=>s.ledger);
 assert.equal(review.reviewedCount,959);assert.equal(review.activeCount,753);assert.equal(ledger.length,959);
 assert.deepEqual(ledger.map(q=>q.id).sort(),bank.map(q=>q.id).sort());assert.equal(new Set(ledger.map(q=>q.id)).size,959);
 for(const r of review.subjects)assert.equal(r.reviewedCount,r.ledger.length);
 assert.equal(review.changedCount,review.changes.length);assert.ok(review.changes.every(c=>c.whyVi.length>10));
});

test('Reviewed text binds to the exact question ID across both anime artifacts and authoring data',()=>{
 const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');assert.deepEqual(parse(offline,'short-explanations'),exp);
 assert.deepEqual(JSON.parse(fs.readFileSync('source/short-explanations.json','utf8')),exp);
 const rows=new Map(fs.readFileSync('../data/short-explanations.tsv','utf8').trim().split(/\r?\n/).map(s=>{const [id,reason,tip]=s.split('\t');return [id,{reason,tip}]}));
 for(const q of bank)assert.deepEqual(rows.get(q.id),{reason:exp[q.id].reason,tip:exp[q.id].tip},q.id);
 for(const c of review.changes){assert.deepEqual(c.before,{reason:before[c.id].reason,tip:before[c.id].tip},c.id);assert.deepEqual(c.after,{reason:exp[c.id].reason,tip:exp[c.id].tip},c.id);assert.equal(exp[c.id].tipReviewedAt,'2026-11-10');}
});

test('Study content matches the reviewed bank, with only documented later wording edits',()=>{
 const expectedBank=parse(backup,'question-bank');
 for(const q of expectedBank){
  const entry=audit[q.id];
  if(entry?.wordingReview){
   assert.equal(q.question,entry.wordingReview.previousQuestion,q.id);
   q.question=entry.imageReview?.before.question??entry.changes.question;
  }
  if(entry?.imageReview){
   for(const [field,value] of Object.entries(entry.imageReview.after)){
    assert.ok(['question','options'].includes(field),q.id);
    assert.deepEqual(q[field],entry.imageReview.before[field],q.id);
    if(field==='options')assert.equal(value.length,q.options.length,q.id);
    q[field]=value;
   }
  }
 }
 assert.deepEqual(bank,expectedBank);
 for(const id of ['duplicate-groups','keyword-cards'])assert.deepEqual(parse(html,id),parse(backup,id),id);
 for(const [start,end] of [['function persist()','function toast('],['function saveActiveSession()','function '],['function newSession(','let pendingSession']]){
  const get=text=>{
   const i=text.indexOf(start);
   assert.ok(i>=0,start);
   const j=text.indexOf('\n'+end,i+start.length);
   assert.ok(j>i,end);
   return text.slice(i,j).trim().replace(/\r\n/g,'\n');
  };
  const original=get(backup).replace('ids=studyRestrictIds(ids);','').replace('if(studyFocus())subject=studyFocus();','');
  assert.equal(get(html).replace('ids=studyVisibleIds(ids);subject=studyScopeSubject(subject);',''),original,start);
 }
 assert.deepEqual(parse(fs.readFileSync('../IC_Study_Anime.html','utf8'),'question-bank').map(({questionImage,noteImage,...q})=>q),bank.map(({questionImage,noteImage,...q})=>q));
});

test('Shortcuts stay concise and independent of shuffled choice positions',()=>{
 for(const q of bank){const e=exp[q.id];assert.ok(e.tip.length>5&&e.tip.length<240,q.id);assert.ok(e.reason.length>20&&e.reason.length<500,q.id);
  assert.ok(!/\b(?:chọn|đáp án|option)\s+[A-E](?:\s|[,.!;:]|$)/i.test(e.tip),q.id);assert.ok(!/�|\\u003c/.test(e.tip),q.id);}
 const start=html.indexOf('function shortExplanation(q)'),end=html.indexOf('function player()',start),code=html.slice(start,end);
 const c={SHORT_EXPLANATIONS:exp,S:{overrides:{}},same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),esc:String};vm.createContext(c);vm.runInContext(code,c);
 for(const id of ['ICI211-301','ICI211-393','LOS201-27','DGT302-580'])assert.ok(c.shortExplanation(by.get(id)).includes(exp[id].tip),id);
});

test('Numerical tips use the actual data and units rather than an unrelated keyword',()=>{
 const margins=[.65-.1,1.8-1.05];assert.ok(Math.abs(Math.min(...margins)-.55)<1e-12);assert.match(selected('ICI211-301')[0],/0\.55/);
 assert.match(exp['ICI211-301'].tip,/0,55/);assert.match(exp['ICI211-301'].tip,/0,75/);
 assert.equal(.2*20*500,2000);assert.match(exp['ICI211-393'].tip,/2000 nW = 2 μW/);
 assert.equal(64*1024*8,524288);assert.match(exp['ICI211-451'].tip,/524.288/);
 assert.match(exp['ICI211-465'].tip,/drawn from supply/);assert.match(exp['ICI211-465'].tip,/40 fJ/);
 assert.match(exp['ICI211-406'].tip,/NAND/);assert.ok(!exp['ICI211-406'].tip.includes('static CMOS N-input gate'));
});

test('Exact cues cover multi-answer requests and distinguish related concepts',()=>{
 for(const id of ['LOS201-27','LOS201-57','LOS201-87','LOS201-93','LOS201-95'])assert.equal(by.get(id).answer.length,2,id);
 assert.match(exp['LOS201-27'].tip,/nạp module/);assert.match(exp['LOS201-27'].tip,/biên dịch/);
 assert.match(exp['LOS201-95'].tip,/vmlinux/);assert.match(exp['LOS201-95'].tip,/built-in\.o/);
 assert.match(exp['LOS201-90'].tip,/GDB/);assert.match(exp['LOS201-90'].tip,/dòng nguồn/);
 assert.match(exp['ICI211-414'].tip,/CLK HIGH/);assert.match(exp['ICI211-425'].tip,/VDD−VT/);
 assert.match(exp['ICI211-442'].tip,/vận tốc/);assert.match(exp['ICI211-442'].tip,/tuyến tính/);
 assert.match(exp['DGT302-633'].tip,/2Fmax/);assert.match(exp['DGT302-633'].tip,/Fs\/2/);
 assert.deepEqual(by.get('DGT302-580').answer,[3]);assert.match(exp['DGT302-580'].reason,/ω\/2/);
});
