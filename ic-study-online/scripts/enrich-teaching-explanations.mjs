import fs from 'node:fs';
import {createHash} from 'node:crypto';

// Bindings are explicit reviewed records. Never infer a lesson from runtime
// keywords: e.g. ROC is not the substring in "processing", nor DDR in "address".
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const questions=[...bank,...read('source/past-exams.json').flatMap(p=>p.pages)];
const lessons=new Map(read('source/detailed-explanation-lessons.json').map(l=>[l.id,l]));
const bindings=read('source/detailed-explanation-bindings.json');
const explanations=read('source/teaching-explanations.json');
for(const q of questions){
 const binding=bindings[q.id],lesson=lessons.get(binding?.lesson);
 const fingerprint=createHash('sha256').update(JSON.stringify([q.question,q.options,q.answer])).digest('hex');
 if(!lesson||binding.fingerprint!==fingerprint)throw Error(`Detailed explanation requires review after question changed: ${q.id}`);
 if(!explanations[q.id])throw Error('Missing explanation '+q.id);
 explanations[q.id].detailLesson=lesson.id;
}
if(Object.keys(bindings).length!==questions.length)throw Error('Unexpected detailed-explanation bindings');
fs.writeFileSync('source/teaching-explanations.json',JSON.stringify(explanations,null,2)+'\n');
console.log(`Attached reviewed mechanisms and comparisons to ${questions.length} questions.`);
