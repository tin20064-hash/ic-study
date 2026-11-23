"""Install curated duplicate groups; keep original question IDs for old work."""
import json
import re
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
SITE=ROOT/'ic-study-online'
SOURCE=SITE/'source'
reports=[json.loads((ROOT/f'data/duplicate-groups-{s}.json').read_text(encoding='utf-8')) for s in ('DGT302','COS201','ICI211','LOS201')]
groups=[g for r in reports for g in r['groups']]
text=(SOURCE/'study.html').read_text(encoding='utf-8')
bank=json.loads(re.search(r'<script[^>]*id="question-bank"[^>]*>([\s\S]*?)</script>',text)[1])
by={q['id']:q for q in bank};seen=set()
for g in groups:
    assert len(g['ids'])>=2 and len({by[id]['subject'] for id in g['ids']})==1
    for id in g['ids']:assert id not in seen,id;seen.add(id)
removed=sum(len(g['ids'])-1 for g in groups)
totals={s:sum(q['subject']==s for q in bank)-sum(len(g['ids'])-1 for g in groups if by[g['ids'][0]]['subject']==s) for s in ('DGT302','COS201','ICI211','LOS201')}
report={'reviewedAt':'2026-11-09','sourceCount':len(bank),'uniqueCount':len(bank)-removed,'removedDuplicates':removed,'totals':totals,
 'policy':'Same assessment task and same learning objective, including reordered options or reworded definitions. Different numeric data, conditions, mechanisms, and applications are retained. Original IDs/answers remain readable for old progress and exam history. New pools and study counts use one canonical record per group; latest checked result across aliases determines coverage and mistakes.',
 'groups':groups,'subjects':reports}
for p in (SOURCE/'duplicate-review.json',ROOT/'data/duplicate-review.json'):p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
tools=(SOURCE/'duplicate-questions.js').read_text(encoding='utf-8')
helpers='''function studyResponse(id){return typeof ICDuplicates==='object'?ICDuplicates.response(id,S)?.response:S.responses[id]}
function studyCorrect(id){return typeof ICDuplicates==='object'?!ICDuplicates.isWrong(id,S):!!S.responses[id]&&correct(BY_ID.get(id),S.responses[id].value)}
function studySaved(id){return typeof ICDuplicates==='object'?ICDuplicates.saved(id,S):!!S.bookmarks[id]}
function studyNote(id){return typeof ICDuplicates==='object'?ICDuplicates.note(id,S):S.notes[id]||''}
function studyMatches(id,term){const q=BY_ID.get(id);return typeof ICDuplicates==='object'?ICDuplicates.matches(id,term):`${q.question} ${q.options.join(' ')} ${id}`.toLowerCase().includes(term)}
function toggleStudySaved(id){if(typeof ICDuplicates==='object')ICDuplicates.toggleSaved(id,S);else if(S.bookmarks[id])delete S.bookmarks[id];else S.bookmarks[id]=true}
'''
pool="(typeof ICDuplicates==='object'?ICDuplicates.questions(BANK):BANK)"
backup=ROOT/'backups/before-duplicate-filter-2026-11-09';backup.mkdir(parents=True,exist_ok=True)
for path in (ROOT/'IC_Study_Anime.html',SOURCE/'study.html'):
    dest=backup/('offline.html' if path.name=='IC_Study_Anime.html' else 'online-source.html')
    if not dest.exists():shutil.copy2(path,dest)
    t=path.read_text(encoding='utf-8')
    assert 'const ICDuplicates=' not in t,'Already installed; update deliberately rather than applying twice'
    payload=json.dumps(groups,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
    t=t.replace('</head>','<script id="duplicate-groups" type="application/json">'+payload+'</script>\n</head>',1)
    t=t.replace('const BANK=JSON.parse',tools+'\n'+helpers+'\nconst BANK=JSON.parse',1)
    anchor='const BY_ID=new Map(BANK.map(q=>[q.id,q]));'
    t=t.replace(anchor,anchor+'\nconst ICDuplicates=createDuplicateIndex(BANK,JSON.parse(document.getElementById(\'duplicate-groups\').textContent));',1)
    # Select canonical records everywhere new work is offered, retaining raw BY_ID for old work.
    t=t.replace('BANK.filter(',pool+'.filter(')
    t=t.replace('${BANK.length}','${ICDuplicates.total}')
    t=t.replace('${finished}/959','${finished}/${ICDuplicates.total}')
    t=t.replace('959 câu · Học offline','${ICDuplicates.total} câu · Học offline')
    t=t.replace('959 mục câu hỏi được lấy từ 963 ảnh trong 4 thư mục. Đã bỏ 4 ảnh trống/trang ngăn cách; giữ thứ tự tài liệu; các lỗi đáp án đã xác định được hiệu chỉnh theo kiến thức.',f"Đã lọc còn {report['uniqueCount']} câu khác nhau từ 959 câu gốc; gộp {removed} bản trùng, kể cả câu đổi thứ tự đáp án hoặc cách diễn đạt. Tiến độ cũ được giữ.")
    t=t.replace('4 thư mục chứa 963 ảnh; ngân hàng gồm 959 câu sau khi bỏ 4 ảnh trống/ngăn cách.',f"Ngân hàng đã gộp {removed} bản trùng, còn {report['uniqueCount']} câu khác nhau. Những bài có số liệu hoặc điều kiện khác nhau vẫn được giữ.")
    # Read aggregate progress through the original question/choice that was actually answered.
    for old,new in [('!correct(BY_ID.get(id),S.responses[id].value)','!studyCorrect(id)'),('correct(q,S.responses[q.id].value)','studyCorrect(q.id)'),('S.responses[q.id]','studyResponse(q.id)'),('S.responses[id]','studyResponse(id)')]:
        # Only reads; submission paths keep original IDs and values.
        lines=t.splitlines(keepends=True)
        t=''.join(line if line.startswith(('function studyResponse(','function studyCorrect(','function submitAnswer(','function finishExam(')) else line.replace(old,new) for line in lines)
    t=t.replace('for(const q of arr)if(studyResponse(q.id))','for(const q of (typeof ICDuplicates===\'object\'?ICDuplicates.questions(arr):arr))if(studyResponse(q.id))')
    # Existing wrong caches are recomputed from the same unique groups on load.
    old="out.wrongIds=Object.keys(out.responses).filter(id=>out.responses[id].value?.length&&!same(out.responses[id].value,out.overrides[id]||BY_ID.get(id).answer));"
    new="out.wrongIds=typeof ICDuplicates==='object'?ICDuplicates.questions(BANK).filter(q=>ICDuplicates.response(q.id,out)&&ICDuplicates.isWrong(q.id,out)).map(q=>q.id):Object.keys(out.responses).filter(id=>out.responses[id].value?.length&&!same(out.responses[id].value,out.overrides[id]||BY_ID.get(id).answer));"
    assert old in t;t=t.replace(old,new,1)
    # Collapse resumable sessions while retaining all actual answers, drafts, order maps and current question.
    old="const ids=[...new Set(s.ids.filter(id=>BY_ID.has(id)))];if(!ids.length)return null;"
    new="const known=[...new Set([...(Array.isArray(s.sourceIds)?s.sourceIds:[]),...s.ids].filter(id=>BY_ID.has(id)))],merged=typeof ICDuplicates==='object'?ICDuplicates.session({...s,ids:s.ids.filter(id=>BY_ID.has(id)),sourceIds:known}):null;const ids=merged?.ids||[...new Set(s.ids.filter(id=>BY_ID.has(id)))];if(!ids.length)return null;"
    assert old in t;t=t.replace(old,new,1)
    t=t.replace('ids.includes(id)&&validChoices(id,a)','known.includes(id)&&validChoices(id,a)',1)
    t=t.replace("mode:s.mode,ids,optionOrders:","mode:s.mode,ids,...(merged?{sourceIds:merged.sourceIds,duplicateIds:merged.duplicateIds}:{}),optionOrders:",1)
    t=t.replace('index:Math.max(0,Math.min(ids.length-1,Number(s.index)||0)),answers:choices(s.answers)','index:merged?merged.index:Math.max(0,Math.min(ids.length-1,Number(s.index)||0)),answers:choices(s.answers)',1)
    # Hidden duplicate order maps are retained too, to make archived answers interpretable.
    t=t.replace('optionOrders:Object.fromEntries(ids.map(id=>{const n=BY_ID.get(id).options.length','optionOrders:Object.fromEntries(known.map(id=>{const n=BY_ID.get(id).options.length',1)
    t=t.replace('function newSession(ids,mode,extra={}){ids=studyRestrictIds(ids);',"function newSession(ids,mode,extra={}){ids=studyRestrictIds(ids);if(typeof ICDuplicates==='object')ids=ICDuplicates.ids(ids);")
    oldline=next(line for line in t.splitlines() if line.startswith('function unique('))
    t=t.replace(oldline,oldline.replace('const set=new Set();',"if(typeof ICDuplicates==='object')return ICDuplicates.questions(arr);const set=new Set();"),1)
    t=t.replace("BANK.map(({questionImage,noteImage,...q})=>q)",pool+".map(({questionImage,noteImage,...q})=>q)")
    t=t.replace("today=(S.daily[localDay()]||[]).length","today=ICDuplicates.ids(S.daily[localDay()]||[]).length")
    # Bookmarks, notes and search can still find every source variant in a group.
    t=t.replace('saved=ids.filter(id=>S.bookmarks[id])','saved=ids.filter(id=>studySaved(id))')
    t=t.replace('S.bookmarks[q.id]?','studySaved(q.id)?').replace(':S.bookmarks[q.id])',':studySaved(q.id))').replace('q=>S.bookmarks[q.id]','q=>studySaved(q.id)')
    t=t.replace("if(S.bookmarks[q.id])delete S.bookmarks[q.id];else S.bookmarks[q.id]=true;","toggleStudySaved(q.id);")
    t=t.replace("if(S.bookmarks[id])delete S.bookmarks[id];else S.bookmarks[id]=true;persist();render()","toggleStudySaved(id);persist();render()")
    t=t.replace("esc(S.notes[q.id]||'')","esc(studyNote(q.id))")
    t=t.replace("`${q.question} ${q.options.join(' ')} ${q.id}`.toLowerCase().includes(term)","studyMatches(q.id,term)")
    # Scale ordinal study ranges to the unique bank, preserving study-day boundaries and times.
    m=re.search(r'const STUDY_NEW=\{[\s\S]*?\n\};',t);assert m
    old=m[0]
    def chunk(m):
        s,a,b,start,end=m.groups();n=totals[s];raw=sum(q['subject']==s for q in bank)
        lo=round((int(a)-1)*n/raw)+1;hi=round(int(b)*n/raw)
        return f"['{s}',{lo},{hi},'{start}','{end}']"
    revised=re.sub(r"\['(DGT302|COS201|ICI211|LOS201)',(\d+),(\d+),'([^']+)','([^']+)'\]",chunk,old)
    t=t[:m.start()]+revised+t[m.end():]
    path.write_text(t,encoding='utf-8')

print(json.dumps({k:v for k,v in report.items() if k not in ('groups','subjects')},ensure_ascii=False))
