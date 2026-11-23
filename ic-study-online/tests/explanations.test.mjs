import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script[^>]*id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const explanations=JSON.parse(html.match(/<script id="short-explanations"[^>]*>([\s\S]*?)<\/script>/)[1]);
const helpers=html.slice(html.indexOf('function shortExplanation(q)'),html.indexOf('function player()'));
const player=html.slice(html.indexOf('function player()'),html.indexOf('\nfunction ',html.indexOf('function player()')+10));

function render(mode='practice',answer,flipped=false,marked=false,examMarked=false){
 const q=bank[0];
 const context={SHORT_EXPLANATIONS:explanations,S:{overrides:{},bookmarks:marked?{[q.id]:true}:{},notes:{},session:{mode,ids:[q.id],index:0,answers:answer?{[q.id]:answer}:{},examMarks:examMarked?{[q.id]:true}:{},deadline:Date.now()+1000}},
  currentQ:()=>q,currentAnswer:()=>answer,correct:(_,a)=>JSON.stringify(a)===JSON.stringify(q.answer),same:(a,b)=>JSON.stringify(a)===JSON.stringify(b),answerKey:x=>x.answer,
  esc:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'),keys:a=>a.map(i=>'ABCD'[i]).join(', '),
  header:()=>'',btn:()=>'',studyBuddyWidget:()=>'',timeText:()=>'',showSource:false,draft:[],flipped,BY_ID:new Map(bank.map(q=>[q.id,q])),SUBJECTS:{DGT302:{name:'DSP'}},source:()=>{throw Error('Unexpected default image');}};
 vm.createContext(context);vm.runInContext(['choiceLabel','studySaved','studyNote'].map(n=>html.split('\n').find(line=>line.startsWith('function '+n+'('))).join('\n')+'\n'+helpers+player,context);
 return vm.runInContext('player()',context);
}

test('Every question has a concise Vietnamese reason and a keyword tip, matching the embedded artifact',()=>{
 assert.equal(bank.length,959);
 assert.deepEqual(Object.keys(explanations).sort(),bank.map(q=>q.id).sort());
 assert.deepEqual(explanations,JSON.parse(fs.readFileSync('source/short-explanations.json','utf8')));
 for(const q of bank){const e=explanations[q.id];assert.ok(e.reason.length>20&&e.reason.length<500,q.id);assert.ok(e.tip.length>5&&e.tip.length<240,q.id);assert.ok(!/\\u003c|�/.test(e.reason+e.tip),q.id);}
});
test('Practice reveals copyable text only after checking; source image is opt-in',()=>{
 assert.ok(!render().includes('quick-explanation'));
 for(const answer of [[0],[1]]){const out=render('practice',answer);assert.ok(out.includes('Vì sao đúng'));assert.ok(out.includes('Mẹo chọn nhanh'));assert.ok(out.includes(explanations[bank[0].id].reason));assert.ok(out.includes('copy-explanation'));assert.ok(out.includes('Đối chiếu ảnh nguồn'));assert.ok(!out.includes('<img'));}
});
test('Exam answers remain hidden until submission and flash cards until flipped',()=>{
 assert.ok(!render('exam',[1]).includes('quick-explanation'));
 assert.ok(!render('flash',undefined,false).includes('quick-explanation'));
 assert.ok(render('flash',undefined,true).includes('Vì sao đúng'));
});
test('Question navigation shows practice grading and hides it during an exam',()=>{
 assert.match(render(),/class="qnumber current"[^>]+title="Chưa làm"/);
 const key=bank[0].answer, wrong=[bank[0].options.findIndex((_,i)=>!key.includes(i))];
 assert.match(render('practice',key),/class="qnumber current done"[^>]+title="Đúng"/);
 assert.match(render('practice',wrong),/class="qnumber current done wrong"[^>]+title="Sai"/);
 assert.match(render('practice',wrong,false,true),/class="qnumber current done wrong flagged"[^>]+title="Sai · Đã đánh dấu"/);
 assert.match(render('practice',wrong),/<i class="done wrong"><\/i> Sai/);
 assert.match(render('exam',undefined,false,true),/class="qnumber current"[^>]+title="Chưa làm"/);
 const markedAnswer=render('exam',wrong,false,false,true);
 assert.match(markedAnswer,/class="qnumber current done exam-marked"[^>]+title="Đã chọn đáp án · Đánh dấu xem lại"[^>]+aria-current="true"/);
 assert.match(markedAnswer,/<i class="done"><\/i> Đã chọn/);
 assert.doesNotMatch(markedAnswer,/class="flagged"/);
});
test('Reviewed source errors carry corrected keys and explanations',()=>{
 for(const id of ['DGT302-510','DGT302-519','DGT302-521','DGT302-529','COS201-941','ICI211-334','ICI211-350','ICI211-405','ICI211-407','ICI211-440','ICI211-450'])assert.equal(explanations[id].sourceConflict,true,id);
 assert.ok(explanations['ICI211-334'].reason.includes('138 ps'));
 assert.match(explanations['ICI211-350'].reason,/0[,.]10?\s*V/);
 assert.ok(explanations['COS201-941'].reason.includes('quá lớn'));
 assert.ok(html.includes('${shortExplanation(q)}'));
 assert.deepEqual(bank.find(q=>q.id==='DGT302-529').answer,[2]);
 assert.ok(explanations['DGT302-529'].verified);
 assert.ok(!html.includes('khóa chấm chưa được tự đổi'));
});
