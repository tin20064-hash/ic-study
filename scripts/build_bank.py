import json,re,base64,io,collections,unicodedata
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent

def compact_image(im,box,quality=82):
    buf=io.BytesIO(); im.crop(box).save(buf,format='WEBP',quality=quality,method=4)
    return 'data:image/webp;base64,'+base64.b64encode(buf.getvalue()).decode()

def rows(lines):
    groups=[]
    for line in sorted(lines,key=lambda l:(l['y'],l['x'])):
        if groups and abs(groups[-1][0]-line['y'])<=7:
            groups[-1][1].append(line)
        else: groups.append([line['y'],[line]])
    return [(y,' '.join(l['text'] for l in sorted(ls,key=lambda l:l['x']))) for y,ls in groups]

bank=[];issues=[]
for subject in ['DGT302','COS201','ICI211','LOS201']:
    for line in (ROOT/'data'/f'ocr-{subject}.jsonl').read_text(encoding='utf-8').splitlines():
        d=json.loads(line)
        slide=rows([l for l in d['lines'] if l['x']>=560 and 275<=l['y']<728 and not re.search(r'(Ho.ng Ho.ng|LEARN TO KNOW|^F O R U$)',l['text'],re.I)])
        notes=rows([l for l in d['lines'] if 290<=l['x']<1830 and 830<=l['y']<1008])
        text='\n'.join(t for y,t in slide)
        # Only accept answer keys in the leading answer label, never a letter in the explanation.
        answer=None
        first=notes[0][1] if notes else ''
        m=re.search(r'^(?:Answer|D\S{1,3}p.*?n)\s*(?:SRC\s*)?:?\s*([A-D](?:[ ,&]*[A-D])*)\b',first,re.I)
        if m: answer=sorted(set(ord(c)-65 for c in m[1] if c in 'ABCD'))
        qparts=[];options=[];current=None
        for y,t in slide:
            match=re.match(r'^\(?([A-Da-d])[\.\):,]\s*(.*)$',t)
            if match:
                idx=ord(match[1].upper())-65
                if idx==len(options):
                    options.append(match[2]);current=idx
                else:
                    if current is None:qparts.append(t)
                    else:options[current]+=' '+t
            elif current is None:qparts.append(t)
            else:options[current]+=' '+t
        number=int(re.search(r'\d+',Path(d['file']).name)[0])
        if answer is None and not notes: continue
        q={'id':f'{subject}-{number}','subject':subject,'source':d['file'],'question':' '.join(qparts),'options':options,'answer':answer,'noteText':' '.join(t for y,t in notes)}
        q['imageOnly']=len(options)!=4 or not q['question']
        q['review']=q['id'] in ['DGT302-510','DGT302-519','DGT302-521','DGT302-529']
        if len(options)!=4 or not q['question'] or answer is None:
            issues.append({'id':q['id'],'question':q['question'],'options':options,'answer':answer,'notes':notes,'slide':slide})
        bank.append(q)
(ROOT/'data'/'questions.json').write_text(json.dumps(bank,ensure_ascii=False,indent=2),encoding='utf-8')
(ROOT/'data'/'issues.json').write_text(json.dumps(issues,ensure_ascii=False,indent=2),encoding='utf-8')
print('Questions:',dict(collections.Counter(q['subject'] for q in bank)))
print('Issues:',len(issues))
for q in issues: print(q['id'],'options',len(q['options']),'answer',q['answer'],q['question'][:65],str(q['notes'][:1]))
