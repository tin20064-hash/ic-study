import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const code=fs.readFileSync('source/study-math.js','utf8');
const online=fs.readFileSync('source/study.html','utf8');
const offline=fs.readFileSync('../IC_Study_Anime.html','utf8');
const context=vm.createContext({});vm.runInContext(code,context);
const papers=JSON.parse(fs.readFileSync('source/past-exams.json','utf8'));
const question=papers.find(p=>p.id==='dgt302-su26-fe-re').pages[19];
const plain=value=>JSON.parse(JSON.stringify(value));

test('All four original forward-DFT choices retain their different limits, signs and normalization',()=>{
 const formulas=question.options.map(text=>context.renderStudyMath(text));
 assert.deepEqual(question.answer,[0]);
 for(let index=0;index<4;index++){
  const result=formulas[index];
  assert.match(result,/<math /);
  assert.match(result,/<munderover>/);
  assert.match(result,/<msup><mi>e<\/mi>/);
  assert.ok(result.includes(context.studyMathEscape(question.options[index])));
 }
 assert.match(formulas[0],/<mi>n<\/mi><mo>=<\/mo><mn>0<\/mn>/);
 assert.match(formulas[0],/<mi>N<\/mi><mo>−<\/mo><mn>1<\/mn>/);
 assert.match(formulas[0],/<mo>−<\/mo><mi>j<\/mi>/);
 assert.doesNotMatch(formulas[1],/<mo>−<\/mo><mi>j<\/mi>/);
 assert.match(formulas[2],/<mfrac><mn>1<\/mn><mi>N<\/mi><\/mfrac>/);
 assert.doesNotMatch(formulas[0],/<mfrac><mn>1<\/mn><mi>N<\/mi><\/mfrac>/);
 assert.match(formulas[3],/<mi>n<\/mi><mo>=<\/mo><mrow><mo>−<\/mo><mo>∞<\/mo>/);
 const sumLimits=formulas[3].match(/<munderover>(.*?)<\/munderover>/)[1];
 assert.ok(!sumLimits.includes('<mi>N</mi>'));
});

test('Fractions, powers, Parseval absolute values and ROC text preserve the source information',()=>{
 const first=context.renderStudyMath('100z⁻²/(1 - 10z⁻¹), ROC:');
 assert.match(first,/<mfrac>/);
 assert.match(first,/<msup><mi>z<\/mi><mrow><mo>−<\/mo><mn>2<\/mn>/);
 assert.match(first,/math-source-tail.*ROC:/);
 assert.ok(!first.includes('|z|'));
 const parseval=context.renderStudyMath('Σ[n=0..N-1]|x(n)|² = (1/N)·Σ[k=0..N-1]|X(k)|²');
 assert.equal((parseval.match(/<munderover>/g)||[]).length,2);
 assert.match(parseval,/<mfrac><mn>1<\/mn><mi>N<\/mi><\/mfrac>/);
 assert.match(parseval,/<msup><mrow><mo>\|<\/mo>/);
 assert.equal(context.renderStudyMath('W²').includes('<msup><mi>W</mi><mn>2</mn>'),true);
 const minimum=context.renderStudyMath('E_min^c < E_min^nc');
 assert.equal((minimum.match(/<msubsup>/g)||[]).length,2);
 const script=plain(context.studyMathTree('E_min^nc'));
 assert.equal(script.kind,'power');
 assert.equal(script.base.kind,'subscript');
 assert.equal(script.value.kind,'group');
 assert.equal(script.value.value.left.text,'n');
 assert.equal(script.value.value.right.text,'c');
});

test('Unsupported prose, malformed expressions, ambiguous denominators and HTML remain safely unchanged',()=>{
 for(const text of ['It reduces the cost from O(p³) to O(p²).','1/2π','X(k) = Σ[n=0..N-1 x(n)','1/(a+b','<img src=x onerror=alert(1)>','x(n)exp(-jω) <script>alert(1)</script>']){
  const result=context.renderStudyMath(text);
  assert.equal(result,context.studyMathEscape(text));
  assert.ok(!result.includes('<script')&&!result.includes('<img'));
 }
 const ordinary='The spectrum becomes a periodic repetition.';
 assert.equal(context.renderStudyMath(ordinary),ordinary);
});

test('Online and offline players use the same display-only renderer without changing source data',()=>{
 for(const html of [online,offline]){
  assert.ok(html.includes(code.trim()));
  assert.equal((html.match(/BEGIN STUDY MATH/g)||[]).length,1);
  assert.ok(html.includes("renderStudyMath(question.options[choice])"));
  assert.ok(html.includes("renderStudyMath(o):esc(o)"));
  assert.deepEqual(JSON.parse(html.match(/<script id="past-exams"[^>]*>([\s\S]*?)<\/script>/)[1]).find(p=>p.id==='dgt302-su26-fe-re').pages[19].options,question.options);
 }
 // Both the exponent written as exp(...) and legacy e^(...) have the same tree.
 assert.deepEqual(plain(context.studyMathTree('x(n)exp(-j2πkn/N)')).right.argument.value,
  plain(context.studyMathTree('x(n)e^(-j2πkn/N)')).right.value.value);
});
