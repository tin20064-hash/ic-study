import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const papers=JSON.parse(fs.readFileSync('source/past-exams.json','utf8'));
const questions=new Map(papers.flatMap(p=>p.pages.map(q=>[q.id,q])));
const initialRepairs=['ici211-su26-fe-039','cos201-fa26-fe-030','cos201-su26-fe-031','cos201-su26-fe-034','dgt302-fa26-fe-016','dgt302-fa26-fe-026','dgt302-fa26-fe-029','dgt302-fa26-fe-042','dgt302-su26-fe-037'];
const corrected=initialRepairs.map(id=>questions.get(id));
const plain=value=>JSON.parse(JSON.stringify(value));
const esc=text=>String(text).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
function runtime(){
 const context=vm.createContext({document:{getElementById:()=>({textContent:JSON.stringify(papers)}),addEventListener(){}},esc,choiceLabel:i=>'ABCDE'[i]});
 vm.runInContext(fs.readFileSync('source/past-exams.js','utf8')+'\n'+fs.readFileSync('account/progress-merge.js','utf8'),context);
 return context;
}
const permutations=values=>values.length?values.flatMap((value,i)=>permutations(values.filter((_,j)=>j!==i)).map(rest=>[value,...rest])):[[]];

test('All nine source-issue questions now have a single gradeable answer, original wording and correction notes',()=>{
 assert.equal(corrected.length,9);
 assert.equal([...questions.values()].filter(q=>!q.answer.length).length,0);
 const c=runtime();
 for(const q of corrected){
  assert.equal(q.questionRevision,1,q.id);assert.equal(q.answer.length,1,q.id);
  assert.equal(q.options.length,4,q.id);assert.equal(q.sourceCorrection.options.length,4,q.id);
  assert.ok(q.sourceCorrection.note.length>30,q.id);
  for(const order of permutations([0,1,2,3]))for(const choice of [0,1,2,3]){
   const response={value:[choice],checked:true,at:200,questionRevision:1};
   assert.equal(c.pastExamCorrect(q,response),q.answer.includes(choice),q.id);
   const feedback=c.pastExamFeedback(q,response,order);
   assert.ok(feedback.includes(q.answer.includes(choice)?'✓ Trả lời đúng':'× Trả lời chưa đúng'),q.id);
   assert.match(feedback,/Đã hiệu chỉnh/);
   assert.doesNotMatch(feedback,/không chấm đúng\/sai|Đề gốc có vấn đề/);
  }
 }
});

test('Independent numerical checks validate prewarping, old-rate decimation edges and the Wiener equality case',()=>{
 const prewarp=questions.get('dgt302-fa26-fe-026');
 const selected=prewarp.options[prewarp.answer[0]];
 const angle=Number(selected.match(/tan\(([\d.]+)\)/)[1]);
 assert.ok(Math.abs(Math.tan(angle)-(2/2)*Math.tan(.2/2))<1e-12);
 assert.doesNotMatch(selected,/π/);
 const decimation=questions.get('dgt302-fa26-fe-042');
 const coefficients=[...decimation.options[decimation.answer[0]].matchAll(/([\d.]+)π/g)].map(m=>Number(m[1]));
 assert.deepEqual(coefficients,[2*800/10000,2*(2000/2)/10000]);
 // Orthogonal present/future observations: the causal subspace is smaller.
 const present=[1,-1,1,-1],future=[1,1,-1,-1];
 const mse=(target,bases)=>{
  const weights=bases.map(b=>b.reduce((sum,x,i)=>sum+x*target[i],0)/b.reduce((sum,x)=>sum+x*x,0));
  return target.reduce((sum,y,i)=>sum+(y-bases.reduce((total,b,j)=>total+weights[j]*b[i],0))**2,0)/target.length;
 };
 const target=present.map((v,i)=>v+future[i]);
 assert.ok(mse(target,[present])>mse(target,[present,future]));
 assert.equal(mse(present,[present]),mse(present,[present,future]));
 const wiener=questions.get('dgt302-fa26-fe-016');
 assert.equal(wiener.options[wiener.answer[0]],'E_min^c ≥ E_min^nc');
 const radix=questions.get('dgt302-su26-fe-037');
 assert.match(radix.options[radix.answer[0]],/2\^v/);
 assert.ok(Number.isInteger(Math.log2(8))&&!Number.isInteger(Math.log(8)/Math.log(4)));
});

test('Old attempts on changed questions become editable drafts without clearing choices, positions or other answers',()=>{
 const c=runtime(),id='dgt302-fa26-fe';
 const before={[id]:{index:15,updated:500,reviewed:{0:120,15:150},answers:{0:{value:[0],checked:true,at:120},15:{value:[1],checked:true,at:150}},optionOrders:{0:[3,2,1,0],15:[2,0,3,1]}}};
 const normalized=plain(c.normalizePastExamStudy(before));
 assert.equal(normalized[id].index,15);
 assert.deepEqual(normalized[id].answers[0],before[id].answers[0]);
 assert.deepEqual(normalized[id].answers[15],{value:[1],checked:false,at:150,questionRevision:0});
 assert.deepEqual(normalized[id].optionOrders,before[id].optionOrders);
 const q=questions.get('dgt302-fa26-fe-016');
 assert.equal(c.pastExamCorrect(q,before[id].answers[15]),null);
 assert.doesNotMatch(c.pastExamFeedback(q,before[id].answers[15],[0,1,2,3]),/Trả lời đúng|Trả lời chưa đúng/);
 vm.runInContext(`var S={pastExamStudy:${JSON.stringify(normalized)}},persist=()=>{},render=()=>{};pastExamId=${JSON.stringify(id)};pastExamIndex=15;`,c);
 c.pastExamCheck();
 const saved=plain(vm.runInContext('S.pastExamStudy',c));
 assert.equal(saved[id].answers[15].questionRevision,1);
 assert.equal(c.pastExamCorrect(q,saved[id].answers[15]),true);
 assert.deepEqual(plain(c.normalizePastExamStudy(saved)),saved);
 assert.deepEqual(saved[id].answers[0],before[id].answers[0]);
 // A later timestamp from an old app cannot replace a checked corrected revision.
 const stale=structuredClone(before);stale[id].answers[15].at=Date.now()+10000;
 assert.deepEqual(plain(c.icMergePastExamStudy(saved,stale))[id].answers[15],saved[id].answers[15]);
 assert.deepEqual(plain(c.icMergePastExamStudy(stale,saved))[id].answers[15],saved[id].answers[15]);
});
