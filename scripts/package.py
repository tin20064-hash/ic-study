import json,re,io,base64,collections
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
bank=json.loads((ROOT/'data/questions.json').read_text(encoding='utf-8'))
ocr={}
for path in (ROOT/'data').glob('ocr-*.jsonl'):
    for line in path.read_text(encoding='utf-8').splitlines():
        d=json.loads(line)
        if 'file' in d:ocr[d['file']]=d
cache=ROOT/'data/image-cache';cache.mkdir(exist_ok=True)
def encode(im,box,dest):
    if not dest.exists():
        im.crop(box).save(dest,format='WEBP',quality=86,method=4)
    return 'data:image/webp;base64,'+base64.b64encode(dest.read_bytes()).decode()
for i,q in enumerate(bank):
    d=ocr[q['source']]
    lines=[l for l in d['lines'] if l['x']>=560 and 280<=l['y']<728 and not re.search(r'Ho.ng Ho.ng',l['text'],re.I)]
    notes=[l for l in d['lines'] if 290<=l['x']<1830 and 830<=l['y']<1008]
    bottom=min(745,max([l['y'] for l in lines]+[540])+38)
    note_top=max(830,min([l['y'] for l in notes]+[850])-5)
    note_bottom=min(1004,max([l['y'] for l in notes]+[900])+30)
    with Image.open(ROOT/q['source']) as im:
        q['questionImage']=encode(im,(595,290,1555,bottom),cache/f"{q['id']}-q.webp")
        q['noteImage']=encode(im,(299,note_top,1829,note_bottom),cache/f"{q['id']}-n.webp")
    assert q['question'] and len(q['options'])==4 and all(q['options']), q['id']
    q['imageOnly']=False
    del q['noteText']
    if not q['question']:q['question']='Câu hỏi trong ảnh nguồn '+q['id']
    if i%200==0:print('Packed',i,flush=True)
css=(ROOT/'src/styles.css').read_text(encoding='utf-8')+'\n'+(ROOT/'src/study.css').read_text(encoding='utf-8')+'\n'+(ROOT/'src/sessions.css').read_text(encoding='utf-8')
js=(ROOT/'src/study.js').read_text(encoding='utf-8')+'\n'+(ROOT/'src/sessions.js').read_text(encoding='utf-8')+'\n'+(ROOT/'src/app.js').read_text(encoding='utf-8')
template=(ROOT/'src/index.html').read_text(encoding='utf-8')
payload=json.dumps(bank,ensure_ascii=False,separators=(',',':')).replace('</','<\\/')
html=template.replace('/*__STYLE__*/',css).replace('/*__APP__*/',js).replace('/*__BANK__*/',payload)
out=ROOT/'OnTap_4Mon.html';out.write_text(html,encoding='utf-8')
print('Saved',out.name,round(out.stat().st_size/1024/1024,1),'MB')
print('Image mode',sum(q['imageOnly'] for q in bank))
print('Multiple answers',dict(collections.Counter(q['subject'] for q in bank if len(q['answer'])>1)))
