import fs from 'node:fs';

// Every non-Word explanation comes from this exact question's reviewed text.
// Do not append subject/keyword templates: sharing a topic does not mean that
// two questions ask for the same mechanism or the same shortcut.
const read=path=>JSON.parse(fs.readFileSync(path,'utf8'));
const html=fs.readFileSync('source/study.html','utf8');
const bank=JSON.parse(html.match(/<script id="question-bank"[^>]*>([\s\S]*?)<\/script>/)[1]);
const short=read('source/short-explanations.json');
const papers=read('source/past-exams.json');
const conciseIds=new Set([...bank.filter(q=>q.subject==='DGT302').map(q=>q.id),...papers.filter(p=>p.subject==='DGT302').flatMap(p=>p.pages.map(q=>q.id))]);
const existing=read('source/teaching-explanations.json');
const overrides=read('source/teaching-explanation-overrides.json');
const output={};
for(const question of [...bank,...papers.flatMap(paper=>paper.pages)]){
 const id=question.id,previous=existing[id];
 if(previous?.source.kind==='word-reference'){
  output[id]=previous;
 }else{
  const reviewed=short[id]||question;
  const reason=reviewed.reason.replace('lựa chọn D cũ','cách gọi “hệ số Fourier” trong đề gốc');
  output[id]={paragraphs:[reason],understand:reviewed.tip||'',source:{kind:'reviewed-explanation',basis:'exact-question'}};
 }
 if(overrides[id]){
  output[id]={...overrides[id],source:{kind:'question-explanation',basis:'exact-question'}};
 }
 if(conciseIds.has(id))output[id].presentation='concise';
}
for(const id of Object.keys(overrides))if(!output[id])throw Error('Unknown question '+id);
fs.writeFileSync('source/teaching-explanations.json',JSON.stringify(output,null,2)+'\n');
console.log(`Refined ${Object.keys(output).length} question explanations without topic templates.`);
await import('./enrich-teaching-explanations.mjs');
