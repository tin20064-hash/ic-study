import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const html=fs.readFileSync('source/study.html','utf8'),offline=fs.readFileSync('../IC_Study_Anime.html','utf8');
const bank=JSON.parse(html.match(/<script id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const papers=read('source/past-exams.json'),questions=[...bank,...papers.flatMap(p=>p.pages)];
const bindings=read('source/detailed-explanation-bindings.json'),data=read('source/teaching-explanations.json');
const lessons=Object.fromEntries(read('source/detailed-explanation-lessons.json').map(x=>[x.id,{mechanism:x.mechanism,comparisons:x.comparisons}]));
const escape=x=>String(x).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const context=vm.createContext({document:{getElementById:id=>({textContent:JSON.stringify(id==='explanation-lessons'?lessons:data)})},esc:escape});
vm.runInContext(fs.readFileSync('source/teaching-explanations.js','utf8'),context);

test('Every question has an explicit fingerprinted explanation binding, with no runtime topic guessing',()=>{
 assert.equal(questions.length,1559);assert.equal(Object.keys(bindings).length,1559);
 for(const q of questions){
  const binding=bindings[q.id];
  assert.equal(binding.fingerprint,createHash('sha256').update(JSON.stringify([q.question,q.options,q.answer])).digest('hex'),q.id);
  assert.equal(data[q.id].detailLesson,binding.lesson,q.id);
  const lesson=lessons[binding.lesson];assert.ok(lesson,q.id);
  assert.ok(lesson.mechanism.length>=120,q.id);
  assert.ok(lesson.mechanism.length+lesson.comparisons.map(x=>x.explanation).join(' ').length>=450,q.id);
  assert.ok(lesson.comparisons.length>=3,q.id);
  assert.ok(lesson.comparisons.every(x=>x.concept.length>0&&x.explanation.length>=10),q.id);
 }
 const module=fs.readFileSync('source/teaching-explanations.js','utf8');
 assert.doesNotMatch(module,/new RegExp|\.match\(|\.test\(|\.search\(/);
});

test('Shared comparison content embeds once in each Anime edition, and copying includes all rendered distinctions',()=>{
 for(const doc of [html,offline])assert.deepEqual(JSON.parse(doc.match(/<script id="explanation-lessons"[^>]*>([\s\S]*?)<\/script>/)[1]),lessons);
 for(const id of ['ICI211-250','ICI211-251','COS201-806','LOS201-119']){
  const lesson=lessons[data[id].detailLesson],rendered=context.renderTeachingExplanation(id),copied=context.teachingExplanationText(id);
  assert.match(rendered,/Phân biệt các lựa chọn và trường hợp áp dụng/);
  for(const item of lesson.comparisons){
   assert.ok(rendered.includes(escape(item.concept)),id);assert.ok(rendered.includes(escape(item.explanation)),id);
   assert.ok(copied.includes(item.explanation),id);
  }
 }
});

test('Similar words and abbreviations do not send a question to an unrelated mechanism',()=>{
 const expected={
  'ICI211-329':'ici-memory-size','ICI211-356':'ici-dvfs','ICI211-306':'ici-elmore',
  'DGT302-545':'dgt-multirate','DGT302-643':'dgt-digital-advantages','DGT302-647':'dgt-hardware-mac',
  'DGT302-559':'dgt-delta-modulation','DGT302-584':'dgt-cutoff-derivation',
  'DGT302-797':'dgt-scipy','DGT302-535':'dgt-geometric-dtft',
  'dgt302-fa26-fe-004':'dgt-time-reversal','dgt302-fa26-fe-008':'dgt-signal-types',
  'cos201-fa26-fe-048':'cos-digital-modulation','cos201-su26-fe-022':'cos-pll-coherent',
  'LOS201-84':'los-device-driver','LOS201-119':'los-standards'
 };
 for(const [id,lesson]of Object.entries(expected))assert.equal(bindings[id].lesson,lesson,id);
 assert.match(lessons['ici-sdff'].mechanism,/Semi-Dynamic/);
 assert.match(lessons['ici-delay-names'].comparisons.map(x=>x.explanation).join(' '),/10→90%/);
 assert.match(lessons['dgt-delta-modulation'].comparisons[0].explanation,/\|dx\/dt\|/);
 assert.match(lessons['dgt-cutoff-derivation'].mechanism,/4a−1−a²/);
});

test('A rich Word-reference mechanism is not repeated before the comparisons',()=>{
 const id='ICI211-251',lesson=lessons[data[id].detailLesson];
 assert.ok(data[id].source.kind==='word-reference');
 assert.ok(!context.renderTeachingExplanation(id).includes(escape(lesson.mechanism)));
 assert.ok(!context.teachingExplanationText(id).includes(lesson.mechanism));
 assert.ok(context.teachingExplanationText(id).includes(lesson.comparisons[0].explanation));
});

test('Comparison terms never depend on shuffled letters and escape HTML instead of executing it',()=>{
 for(const lesson of Object.values(lessons)){
  assert.doesNotMatch(lesson.mechanism+' '+lesson.comparisons.map(x=>x.explanation).join(' '),/(?:đáp án|lựa chọn|phương án)\s+[A-E](?![\p{L}\p{N}])/iu);
 }
 vm.runInContext(`TEACHING_EXPLANATIONS.fixture={paragraphs:['A long enough fixture explanation.'],detailLesson:'fixture'};TEACHING_LESSONS.fixture={mechanism:'<script>bad()</script>',comparisons:[{concept:'<img src=x>',explanation:'<b>safe text</b>'}]};`,context);
 const rendered=context.renderTeachingExplanation('fixture');
 assert.ok(rendered.includes('&lt;script&gt;'));
 assert.doesNotMatch(rendered,/<script>|<img src=x>|<b>safe text/);
});
