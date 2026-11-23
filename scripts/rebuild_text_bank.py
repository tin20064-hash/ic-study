import json,re,collections
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
old=json.loads((ROOT/'data/questions.json').read_text(encoding='utf-8'))
archive=ROOT/'data/questions-before-text.json'
if not archive.exists():archive.write_text(json.dumps(old,ensure_ascii=False,indent=2),encoding='utf-8')
old=json.loads(archive.read_text(encoding='utf-8'))
raw={}
for path in (ROOT/'data').glob('ocr-text-*.jsonl'):
 for l in path.read_text(encoding='utf-8').splitlines():
  d=json.loads(l);raw[d['id']]=d
def parse(d):
 groups=[]
 for line in sorted(d['lines'],key=lambda l:min(w['y'] for w in l['words'])):
  words=line['words'];y=min(w['y'] for w in words)
  match=next((g for g in groups if abs(g[0]-y)<=7),None)
  if match:match[1].extend(words)
  else:groups.append([y,list(words)])
 rows=[(y,' '.join(w['text'] for w in sorted(ws,key=lambda w:w['x']))) for y,ws in groups]
 q=[];opts=[];current=None
 for y,t in rows:
  m=re.match(r'^\(?([A-Za-z])[.):,]\s*(.*)$',t)
  if m and ord(m[1].upper())-65==len(opts):opts.append(m[2]);current=len(opts)-1
  elif current is not None:opts[current]+=' '+t
  else:q.append(t)
 return ' '.join(q),opts,rows
corrections_path=ROOT/'data/text-corrections.json'
corrections=json.loads(corrections_path.read_text(encoding='utf-8')) if corrections_path.exists() else {}
out=[];issues=[];changed=0
for q in old:
 title,opts,rows=parse(raw[q['id']])
 if 2<=len(opts)<=26 and all(opts) and title:
  if title!=q['question'] or opts!=q['options']:changed+=1
  q['question']=title;q['options']=opts
 if q['id'] in corrections:q.update(corrections[q['id']])
 q['imageOnly']=False
 if not 2<=len(q['options'])<=26 or not all(q['options']) or not q['question']:
  issues.append({'id':q['id'],'question':q['question'],'options':q['options'],'candidate':{'question':title,'options':opts},'rows':rows})
 out.append(q)
(ROOT/'data/questions.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'data/text-issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding='utf-8')
print('Improved text extraction:',changed,'; remaining incomplete:',len(issues))
for q in issues:print(q['id'],len(q['options']))
