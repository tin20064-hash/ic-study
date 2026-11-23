import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const teaching=read('source/teaching-explanations.json');
const short=read('source/short-explanations.json');
const papers=read('source/past-exams.json');
const overrides=read('source/teaching-explanation-overrides.json');
const pastById=new Map(papers.flatMap(paper=>paper.pages.map(q=>[q.id,q])));

test('Every explanation is bound to its own reviewed question, with no topic-template paragraphs or inferred tips',()=>{
 for(const [id,explanation]of Object.entries(teaching)){
  if(explanation.source.kind==='word-reference')continue;
  const exact=overrides[id]||short[id]||pastById.get(id);
  assert.ok(exact,id);
  const paragraphs=exact.paragraphs||[exact.reason.replace('lựa chọn D cũ','cách gọi “hệ số Fourier” trong đề gốc')];
  assert.deepEqual(explanation.paragraphs,paragraphs,id);
  assert.equal(explanation.understand,exact.understand??exact.tip??'',id);
  assert.equal(explanation.source.basis,'exact-question',id);
  assert.notEqual(explanation.source.kind,'concept-explanation',id);
 }
});

test('The reported ROC/poles question explains divergence and zeros without unrelated DTFT or sequence-shift advice',()=>{
 const question=pastById.get('dgt302-fa26-fe-005');
 assert.equal(question.options[question.answer[0]],'The ROC cannot contain any poles');
 const explanation=teaching[question.id];
 assert.equal(explanation.paragraphs.length,1);
 assert.match(explanation.paragraphs[0],/hội tụ.*cực.*không.*hữu hạn.*không thể/s);
 assert.match(explanation.paragraphs[0],/Zero vẫn có thể/);
 assert.match(explanation.understand,/poles.*zeros/);
 assert.doesNotMatch(explanation.paragraphs.join(' ')+explanation.understand,/DTFT|dịch dãy|nhân n|mốc bắt đầu/i);
 // The three nearby ROC questions need three different decisions, not one cue.
 assert.match(teaching['dgt302-su26-fe-001'].understand,/ổn định.*vòng đơn vị/);
 assert.match(teaching['dgt302-su26-fe-005'].understand,/Cộng hai dãy.*giao/);
 assert.match(teaching['dgt302-su26-fe-re-005'].understand,/0,5.*2.*1/);
});

test('Questions without an exact reviewed tip omit the memory box in both rendering and copied text',()=>{
 const question=pastById.get('dgt302-fa26-fe-002');
 assert.match(question.reason,/DTFT/);
 assert.equal(teaching[question.id].understand,'');
 const context=vm.createContext({document:{getElementById:()=>({textContent:JSON.stringify(teaching)})},esc:String});
 vm.runInContext(fs.readFileSync('source/teaching-explanations.js','utf8'),context);
 const rendered=context.renderTeachingExplanation(question.id),copied=context.teachingExplanationText(question.id);
 assert.ok(rendered.includes(question.reason));
 assert.ok(copied.includes(question.reason));
 assert.doesNotMatch(rendered+copied,/teaching-memory|Hiểu nhanh|hệ số tối ưu|dữ liệu tương lai/i);
});
