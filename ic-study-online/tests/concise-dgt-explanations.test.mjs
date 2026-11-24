import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const papers=read('source/past-exams.json');
const explanations=read('source/teaching-explanations.json');
const lessons=Object.fromEntries(read('source/detailed-explanation-lessons.json').map(x=>[x.id,x]));
const ids=[...bank.filter(q=>q.subject==='DGT302').map(q=>q.id),...papers.filter(p=>p.subject==='DGT302').flatMap(p=>p.pages.map(q=>q.id))];
const escape=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const context=vm.createContext({document:{getElementById:id=>({textContent:JSON.stringify(id==='explanation-lessons'?lessons:explanations)})},esc:escape});
vm.runInContext(fs.readFileSync('source/teaching-explanations.js','utf8'),context);

test('All 448 DGT question explanations use exact short text and never append a shared topic lesson',()=>{
 assert.equal(ids.length,448);
 for(const id of ids){
  const explanation=explanations[id],rendered=context.renderTeachingExplanation(id),copy=context.teachingExplanationText(id);
  assert.equal(explanation.presentation,'concise',id);
  assert.match(rendered,/Giải thích ngắn/);
  assert.doesNotMatch(rendered,/teaching-mechanism|teaching-comparisons/);
  assert.doesNotMatch(copy,/Phân biệt các lựa chọn và trường hợp áp dụng/);
  assert.ok(explanation.paragraphs.join(' ').length+(explanation.understand||'').length<650,id+' should remain a short reading');
  for(const text of explanation.paragraphs){assert.ok(rendered.includes(escape(text)),id);assert.ok(copy.includes(text),id);}
  if(explanation.understand){assert.match(rendered,/<h4>Mẹo nhớ<\/h4>/);assert.ok(copy.includes(explanation.understand),id);}
 }
});

test('The reported ROC-linearity question and its past-paper copy cannot show multiplication or spectrum-shift advice',()=>{
 for(const id of ['DGT302-533','dgt302-su26-fe-005']){
  const rendered=context.renderTeachingExplanation(id),copy=context.teachingExplanationText(id);
  assert.match(copy,/phần chung.*cả hai.*tổng.*hội tụ/);
  assert.match(copy,/ít nhất chứa phần giao/);
  assert.match(copy,/at least the intersection/);
  assert.doesNotMatch(rendered+copy,/Nhân n|Nhân cos|đạo hàm phổ|dịch sang|Levinson|Yule/i);
  assert.match(rendered,/<details class="teaching-choice-notes">/);
  assert.doesNotMatch(rendered,/<details[^>]*\bopen\b/);
  assert.match(copy,/Phần hợp.*chỉ một tín hiệu/);
 }
});

test('Unrelated shared lesson edits do not alter a concise DGT explanation or its copied text',()=>{
 const id='DGT302-533',before=context.renderTeachingExplanation(id),copy=context.teachingExplanationText(id);
 vm.runInContext("TEACHING_LESSONS['dgt-z-roc']={mechanism:'UNRELATED TEMPLATE',comparisons:[{concept:'Wrong topic',explanation:'Wrong advice'}]}",context);
 assert.equal(context.renderTeachingExplanation(id),before);
 assert.equal(context.teachingExplanationText(id),copy);
});

test('Optional choice notes escape content and stay collapsed while other subjects retain detailed explanations',()=>{
 vm.runInContext("TEACHING_EXPLANATIONS.fixture={presentation:'concise',paragraphs:['<img src=x>'],understand:'<script>bad()</script>',choiceNotes:['<b>note</b>']}",context);
 const output=context.renderTeachingExplanation('fixture');
 assert.ok(output.includes('&lt;img'));
 assert.ok(output.includes('&lt;script&gt;'));
 assert.ok(output.includes('&lt;b&gt;note'));
 assert.doesNotMatch(output,/<script>|<img|<b>/);
 assert.match(context.renderTeachingExplanation('ICI211-250'),/teaching-comparisons/);
});
