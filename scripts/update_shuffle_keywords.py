"""Install canonical answer permutations and a separate keyword study deck."""
from pathlib import Path
import csv,json,re,shutil
ROOT=Path(__file__).resolve().parents[1];ONLINE=ROOT/'ic-study-online'
cards=[];counts={}
for row in csv.reader((ONLINE/'source/keyword-cards.tsv').read_text(encoding='utf-8').splitlines(),delimiter='\t'):
 assert len(row)==7,row
 course,prompt,*rest=row;counts[course]=counts.get(course,0)+1
 cards.append(dict(id=f'{course}-KW{counts[course]:02}',subject=course,prompt=prompt,options=rest[:4],answer=0,reason=rest[4]))
assert len(cards)==48
(ONLINE/'source/keyword-cards.json').write_text(json.dumps(cards,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
payload=json.dumps(cards,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
module=(ONLINE/'source/keyword-study.js').read_text(encoding='utf-8')
css='''.keyword-layout{max-width:930px;margin:0 auto}.keyword-controls{display:flex;gap:20px;align-items:center;justify-content:space-between;margin-bottom:20px;padding:20px}.keyword-controls .field{margin:0;min-width:230px}.keyword-controls p{margin:7px 0 0;font-size:12px}.keyword-card{padding-bottom:26px}.keyword-prompt-label{font-size:13px;font-weight:650;margin:25px 0 8px;color:var(--muted)}.keyword-prompt{font-size:29px;line-height:1.5;margin-bottom:26px}.keyword-reveal{display:flex;align-items:center;gap:15px;flex-wrap:wrap;margin-top:22px}.keyword-pair{border-left:3px solid var(--green);padding:12px 15px;background:var(--soft,var(--paper));border-radius:8px}.keyword-jumps{display:grid;grid-template-columns:repeat(auto-fill,minmax(38px,1fr));gap:7px;margin:20px 0}.keyword-footnote{font-size:12px;line-height:1.8;margin:20px 0}.shuffle-note{font-size:11px;color:var(--muted);margin-top:6px}@media(max-width:800px){.keyword-controls{flex-wrap:wrap;gap:12px}.keyword-controls .field{flex:1;min-width:180px}.keyword-controls .btn{width:100%}.keyword-prompt{font-size:24px}.keyword-card .question-bottom{margin-top:24px}}'''
keys=r'''function sessionKeys(q,a,orders=S.session?.optionOrders){const candidate=orders?.[q.id],order=Array.isArray(candidate)&&candidate.length===q.options.length&&new Set(candidate).size===q.options.length&&candidate.every(i=>Number.isInteger(i)&&i>=0&&i<q.options.length)?candidate:q.options.map((_,i)=>i);return a.map(i=>order.indexOf(i)).sort((a,b)=>a-b).map(choiceLabel).join(' + ')}
'''
create=r'''function createOptionOrders(ids,previous=S.session?.optionOrders){return Object.fromEntries(ids.map(id=>{const q=BY_ID.get(id),order=shuffle(q.options.map((_,i)=>i)),before=previous?.[id]||q.options.map((_,i)=>i);if(order.every((n,i)=>n===before[i]))order.push(order.shift());return[id,order]}))}
'''
for p in [ROOT/'IC_Study_Anime.html',ONLINE/'source/study.html']:
 s=p.read_text(encoding='utf-8');assert 'function createOptionOrders' not in s
 backup=ROOT/'backups/before-shuffle-keywords-2026-11-09';backup.mkdir(exist_ok=True,parents=True);dest=backup/('offline.html' if p.name=='IC_Study_Anime.html' else 'online-source.html')
 if not dest.exists():shutil.copy2(p,dest)
 s=s.replace('</head>','<style>\n/* IC_KEYWORD_STUDY */\n'+css+'\n</style>\n</head>',1)
 match=re.search(r'<script id="short-explanations"[^>]*>[\s\S]*?</script>',s);assert match
 s=s[:match.end()]+'\n<script id="keyword-cards" type="application/json">'+payload+'</script>'+s[match.end():]
 const="const SHORT_EXPLANATIONS=JSON.parse(document.getElementById('short-explanations').textContent);"
 s=s.replace(const,const+"\nconst KEYWORD_CARDS=JSON.parse(document.getElementById('keyword-cards').textContent);\nconst KEYWORD_BY_ID=new Map(KEYWORD_CARDS.map(c=>[c.id,c]));",1)
 s=s.replace('function initial(){',module+'\nfunction initial(){',1)
 s=s.replace("session:null,lastSubject:'DGT302'","session:null,keywordStudy:null,lastSubject:'DGT302'",1)
 s=s.replace(' normalizeSessionStore(out,data);'," normalizeSessionStore(out,data);\n if(typeof normalizeKeywordStudy==='function')out.keywordStudy=normalizeKeywordStudy(data.keywordStudy);",1)
 # Immutable display order belongs to a session; saved answers always remain canonical.
 anchor="mode:s.mode,ids,index:"
 assert anchor in s
 s=s.replace(anchor,"mode:s.mode,ids,optionOrders:Object.fromEntries(ids.map(id=>{const n=BY_ID.get(id).options.length,a=s.optionOrders?.[id];return[id,validChoices(id,a,false)&&a.length===n&&new Set(a).size===n?[...a]:Array.from({length:n},(_,i)=>i)]})),index:",1)
 s=s.replace('function newSession(ids,mode,extra={}){',create+'function newSession(ids,mode,extra={}){',1)
 s=s.replace('mode,ids,index:0,answers:{},drafts:{}','mode,ids,optionOrders:createOptionOrders(ids),index:0,answers:{},drafts:{}',1)
 s=s.replace('function explanation(q,a){',keys+'function explanation(q,a){',1)
 s=s.replace('${keys(answerKey(q))}', '${sessionKeys(q,answerKey(q))}')
 s=s.replace("keys(answerKey(q))+'\\n'","sessionKeys(q,answerKey(q))+'\\n'")
 s=s.replace('${esc(x.correctionNote)}','Theo thứ tự ảnh gốc: ${esc(x.correctionNote)}')
 s=s.replace('optionTexts=q.options,complete=',"optionOrder=s.optionOrders?.[q.id]||q.options.map((_,i)=>i),optionTexts=optionOrder.map(i=>q.options[i]),complete=",1)
 s=s.replace("q.options.map((o,i)=>`${choiceLabel(i)}. ${esc(o)}`)","optionTexts.map((o,i)=>`${choiceLabel(i)}. ${esc(o)}`)",1)
 s=s.replace('optionTexts.map((o,i)=>{let cls=', 'optionTexts.map((o,pos)=>{const i=optionOrder[pos];let cls=',1)
 s=s.replace("a.includes(i)?'×':choiceLabel(i)","a.includes(i)?'×':choiceLabel(pos)",1)
 # Only the interactive player letter changes; data-choice continues to hold canonical index.
 s=s.replace('aria-pressed="${draft.includes(i)}"><span class="letter">${choiceLabel(i)}','aria-pressed="${draft.includes(i)}"><span class="letter">${choiceLabel(pos)}',1)
 s=s.replace('selectChoice(Number(e.key)-1)','selectChoice(S.session.optionOrders?.[currentQ().id]?.[Number(e.key)-1]??Number(e.key)-1)',1)
 s=s.replace("q.options.map((o,i)=>choiceLabel(i)+'. '+o)","(S.session?.optionOrders?.[q.id]||q.options.map((_,i)=>i)).map((original,i)=>choiceLabel(i)+'. '+q.options[original])",1)
 s=s.replace('answers:{...s.answers},started:s.started','answers:{...s.answers},optionOrders:{...s.optionOrders},started:s.started',1)
 s=s.replace("a?.length?keys(a):'—'","a?.length?sessionKeys(q,a,h.optionOrders):'—'",1)
 s=s.replace('${keys(k)}</b>','${sessionKeys(q,k,h.optionOrders)}</b>',1)
 s=s.replace("q.options.map((_,i)=>`<label class=\"btn\"><input", "(S.session?.optionOrders?.[q.id]||q.options.map((_,i)=>i)).map((i,pos)=>`<label class=\"btn\"><input",1)
 s=s.replace('${choiceLabel(i)}</label>','${choiceLabel(pos)}. ${esc(q.options[i])}</label>',1)
 s=s.replace('Đáp án nguồn là <strong>${keys(q.answer)}</strong>.','Theo thứ tự ảnh gốc, đáp án là <strong>${keys(q.answer)}</strong>. Các lựa chọn bên dưới theo thứ tự phiên đang làm.',1)
 s=s.replace("function setView(v){","function setView(v){if(v!==view)keywordRevealed=false;",1)
 s=s.replace("['flash','cards','Thẻ ghi nhớ']","['keywords','star','Học keyword'],['flash','cards','Thẻ ghi nhớ']",1)
 s=s.replace("view==='player'?(studySessionAllowed", "view==='keywords'?keywordsPage():view==='player'?(studySessionAllowed",1)
 s=s.replace('Phản hồi sau mỗi câu</span>','Phản hồi sau mỗi câu</span>',1)
 s=s.replace('Câu hỏi và lựa chọn có thể sao chép và dịch.','Câu hỏi và lựa chọn có thể sao chép và dịch. Đáp án tự đảo ở phiên mới và giữ nguyên thứ tự trong phiên đã lưu.',1)
 p.write_text(s,encoding='utf-8')
print('Installed answer shuffling and 48 keyword cards into both anime artifacts.')
