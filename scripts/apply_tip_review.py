"""Apply per-question learning-tip review, leaving keys, pools and user state intact."""
from pathlib import Path
import hashlib
import json
import re
import shutil

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'ic-study-online'
SOURCE=SITE/'source'
DATE='2026-11-10'
TARGETS=[ROOT/'IC_Study_Anime.html',SOURCE/'study.html']
def read(path):return json.loads(path.read_text(encoding='utf-8'))
def write(path,value):path.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
def parse(text,id):return json.loads(re.search(r'<script[^>]*id="'+id+r'"[^>]*>([\s\S]*?)</script>',text)[1])
html=TARGETS[1].read_text(encoding='utf-8')
bank=parse(html,'question-bank')
by={q['id']:q for q in bank}
explanations=parse(html,'short-explanations')
before=read(SOURCE/'short-explanations.json')
assert before==explanations
audit=read(SOURCE/'answer-audit.json')
duplicate_groups=parse(html,'duplicate-groups')
aliases={id for g in duplicate_groups for id in g['ids'][1:]}
reports=[read(ROOT/f'data/tip-review-{s}.json') for s in ('DGT302','COS201','ICI211','LOS201')]
review_ids=[row['id'] for report in reports for row in report['ledger']]
assert len(review_ids)==959 and set(review_ids)==set(by) and len(set(review_ids))==959
changes=[c for report in reports for c in report['changes']]
assert len({c['id'] for c in changes})==len(changes)
for report in reports:
    expected={q['id'] for q in bank if q['subject']==report['subject']}
    assert report['reviewedCount']==len(expected)
    assert {row['id'] for row in report['ledger']}==expected
    assert not report.get('hardKeyErrors'),report.get('hardKeyErrors')
    inputs=read(ROOT/f"data/tip-review-input-{report['subject']}.json")
    for q in inputs:
        assert all(q[k]==by[q['id']][k] for k in ('question','options','answer')),'Source changed: '+q['id']

def refs(items):
    from urllib.parse import urlparse
    return [{'title':urlparse(x).netloc.replace('www.','')+' · tài liệu đối chiếu','url':x} if isinstance(x,str) else x for x in items]

patches=[]
for change in changes:
    id=change['id'];e=explanations[id];tip=change['tip'].strip()
    assert 5<len(tip)<240 and '\t' not in tip and '\n' not in tip,(id,len(tip))
    assert not re.search(r'\b(?:chọn|đáp án|option)\s+[A-E](?:\s|[,.!;:]|$)',tip,re.I),'Positional hint: '+id
    reason=change.get('reason') or e['reason']
    assert 20<len(reason)<500 and '\t' not in reason and '\n' not in reason,id
    prior={k:e[k] for k in ('reason','tip')}
    e.update(tip=tip,reason=reason,tipReviewedAt=DATE)
    if change.get('references'):
        combined=e.get('references',[])+refs(change['references'])
        e['references']=list({r['url']:r for r in combined}.values())
    if id in audit:
        a=audit[id]
        a.setdefault('learningReviews',[]).append({'reviewedAt':DATE,'before':prior,'whyVi':change['whyVi']})
        a.update(tip=tip,reason=reason)
        if e.get('references'):a['references']=e['references']
    patches.append({'id':id,'before':prior,'after':{k:e[k] for k in ('reason','tip')},'whyVi':change['whyVi'],'active':id not in aliases,'references':e.get('references',[])})
report={'reviewedAt':DATE,'reviewedCount':959,'activeCount':len(bank)-len(aliases),'changedCount':len(patches),
        'activeChangedCount':sum(c['active'] for c in patches),'reasonChangedCount':sum(c['before']['reason']!=c['after']['reason'] for c in patches),
        'policy':'Read every stem, choices, reason and tip. Keep useful specific mnemonics; repair unrelated, circular, incomplete and overgeneralized tips. Numerical questions get a short calculation or unit method; tips refer to choice content, never shuffled labels. No grading key or question content changed.',
        'questionContentSha256':hashlib.sha256(json.dumps([{k:q[k] for k in ('id','question','options','answer')} for q in bank],ensure_ascii=False,sort_keys=True).encode()).hexdigest(),
        'changes':patches,'subjects':reports}

backup=ROOT/'backups/before-tip-review-2026-11-10';backup.mkdir(parents=True,exist_ok=True)
for path in TARGETS:
    dest=backup/('offline.html' if path==TARGETS[0] else 'online-source.html')
    if not dest.exists():shutil.copy2(path,dest)
    text=path.read_text(encoding='utf-8')
    old_bank=parse(text,'question-bank');old_groups=parse(text,'duplicate-groups');old_keywords=parse(text,'keyword-cards')
    payload=json.dumps(explanations,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    text=re.sub(r'(<script id="short-explanations"[^>]*>)[\s\S]*?(</script>)',lambda m:m[1]+payload+m[2],text,count=1)
    assert parse(text,'question-bank')==old_bank and parse(text,'duplicate-groups')==old_groups and parse(text,'keyword-cards')==old_keywords
    path.write_text(text,encoding='utf-8')
for name in ('short-explanations.json','answer-audit.json'):
    dest=backup/name
    if not dest.exists():shutil.copy2(SOURCE/name,dest)
write(SOURCE/'short-explanations.json',explanations)
write(SOURCE/'answer-audit.json',audit)
write(ROOT/'data/answer-audit.json',audit)
(ROOT/'data/short-explanations.tsv').write_text(''.join(id+'\t'+x['reason']+'\t'+x['tip']+'\n' for id,x in explanations.items()),encoding='utf-8')
write(SOURCE/'tip-review.json',report)
write(ROOT/'data/tip-review.json',report)
print(json.dumps({k:v for k,v in report.items() if k not in ('changes','subjects')},ensure_ascii=False))
