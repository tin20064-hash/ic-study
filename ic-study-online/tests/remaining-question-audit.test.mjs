import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const papers=read('source/past-exams.json'),audit=read('source/remaining-question-audit.json');
const questions=new Map(papers.flatMap(p=>p.pages.map(q=>[q.id,q])));
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const c=vm.createContext({document:{getElementById:()=>({textContent:JSON.stringify(papers)}),addEventListener(){}},esc,choiceLabel:i=>'ABCDE'[i]});
vm.runInContext(fs.readFileSync('source/past-exams.js','utf8'),c);
const permutations=a=>a.length?a.flatMap((x,i)=>permutations(a.filter((_,j)=>j!==i)).map(b=>[x,...b])):[[]];

test('Reviewed corrections preserve source provenance, canonical keys and a gradeable answer after every shuffle',()=>{
 assert.equal(audit.coverage.pastQuestions,600);
 assert.equal(Object.keys(audit.records).length,86);
 const transcripts=read('source/past-exam-transcripts.json');
 for(const [id,r]of Object.entries(audit.records)){
  const q=questions.get(id);assert.ok(q,id);
  assert.deepEqual(q.answer,r.before.answer,id);
  assert.equal(q.questionRevision,1,id);
  assert.equal(q.options.length,r.before.options.length,id);
  assert.equal(q.sourceCorrection.note,r.note,id);
  if(r.kind==='transcription-restoration')assert.equal(transcripts[id].verification,'source-photo-reviewed');
  else assert.deepEqual(q.sourceCorrection.options,r.before.options,id);
  for(const order of permutations(q.options.map((_,i)=>i)))for(let choice=0;choice<q.options.length;choice++){
   const response={value:[choice],checked:true,questionRevision:1};
   const expected=(q.acceptedAnswers||[q.answer]).some(a=>a.length===1&&a[0]===choice);
   // Two-answer LOS questions must reject every incomplete single selection.
   assert.equal(c.pastExamCorrect(q,response),expected,id);
   const output=c.pastExamFeedback(q,response,order);
   assert.match(output,/Đã hiệu chỉnh/,id);
  }
 }
});

test('PLL accepts either equivalent single choice but never their combined selection',()=>{
 const q=questions.get('cos201-su26-fe-022');
 for(const value of [[1],[2]])assert.equal(c.pastExamCorrect(q,{value,checked:true,questionRevision:1}),true);
 for(const value of [[0],[3],[1,2],[]])assert.equal(c.pastExamCorrect(q,{value,checked:true,questionRevision:1}),false);
});

test('Independent counterexamples cover the assumptions behind revised DSP and coding questions',()=>{
 // A negative falling slope can overload delta modulation just like a positive one.
 const trackable=(slope,step,period)=>Math.abs(slope)<=step/period;
 assert.equal(trackable(-20,1,.1),false);assert.equal(trackable(10,1,.1),true);
 assert.match(questions.get('dgt302-su26-fe-re-009').options[0],/\|dx\(t\)\/dt\|/);
 // Truncation toward zero has either error sign; two's-complement dropped bits do not.
 for(const x of [-1.2,1.2])assert.ok(Math.floor(x)-x<=0);
 assert.ok(Math.trunc(-1.2)-(-1.2)>0&&Math.trunc(1.2)-1.2<0);
 // A first-order low-pass may never fall by 3 dB before Nyquist.
 const cosine=a=>(4*a-1-a*a)/(2*a);
 assert.ok(cosine(.1)<-1);assert.ok(cosine(.5)>-1&&cosine(.5)<1);
 const a=.5,w=Math.acos(cosine(a));
 assert.ok(Math.abs((1-a)**2/(1+a*a-2*a*Math.cos(w))-.5)<1e-12);
 // Count butterfly twiddle products, including trivial ones, not an optimized count.
 assert.equal(1024/2*Math.log2(1024),5120);
 assert.match(questions.get('dgt302-su26-fe-040').question,/including trivial/);
 // Three equiprobable symbols have an optimal Huffman tree with lengths 1,2,2.
 assert.equal(2**-1+2**-2+2**-2,1);
 assert.ok(!Number.isInteger(Math.log2(3)));
 assert.match(questions.get('cos201-su26-fe-re-031').question,/2\^k/);
 // A minimum-phase IIR can have a finite inverse: H=1/(1-.5 z^-1).
 for(const w of [0,.3,Math.PI]){
  const real=1-.5*Math.cos(w),imag=.5*Math.sin(w),den=real*real+imag*imag;
  assert.ok(Math.abs((real*real+imag*imag)/den-1)<1e-12);
 }
 assert.match(questions.get('dgt302-su26-fe-050').options[2],/FIR or IIR/);
});

test('Restored Linux code and paths survive escaping and changed attempts require rechecking without deleting selections',()=>{
 const maps=questions.get('los201-su26-fe-re-003');
 assert.match(maps.question,/\/proc\/<pid>\/maps/);
 assert.match(esc(maps.question),/\/proc\/&lt;pid&gt;\/maps/);
 const serial=questions.get('los201-su26-fe-re-014');
 assert.match(serial.options[0],/PL011.*console=ttyAMA0,115200/);
 assert.equal(questions.get('los201-su26-fe-025').options[1],'IMAGE_INSTALL');
 for(const [id]of Object.entries(audit.records)){
  const q=questions.get(id),old={value:[q.answer[0]],checked:true,at:123};
  const paper=papers.find(p=>p.pages.some(page=>page.id===id)),index=paper.pages.findIndex(page=>page.id===id);
  const normalized=c.normalizePastExamStudy({[paper.id]:{index,answers:{[index]:old},optionOrders:{[index]:[3,2,1,0]}}})[paper.id];
  assert.equal(normalized.answers[index].checked,false,id);
  assert.deepEqual(Array.from(normalized.answers[index].value),old.value,id);
  assert.equal(normalized.index,index,id);
  assert.deepEqual(Array.from(normalized.optionOrders[index]),[3,2,1,0],id);
  assert.equal(c.pastExamCorrect(q,old),null,id);
 }
});
