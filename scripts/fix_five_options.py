"""Recover fifth choices verified against original OCR; remove four-choice assumptions."""
import json,re,shutil
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
backup=ROOT/'backups/before-five-options-2026-11-08';backup.mkdir(parents=True,exist_ok=True)
affected=['COS201-'+str(n) for n in [809,818,820,828,830,839,840,844,846]]
data_path=ROOT/'data/questions.json';questions=json.loads(data_path.read_text(encoding='utf-8'))
corrections_path=ROOT/'data/text-corrections.json';corrections=json.loads(corrections_path.read_text(encoding='utf-8'))
def repair(q):
 if q['id'] not in affected:return
 if len(q['options'])==5:return
 assert len(q['options'])==4,q['id']
 parts=re.split(r'\s+E\.\s+',q['options'][3]);assert len(parts)==2 and all(parts),q['id']
 q['options']=q['options'][:3]+parts
for q in questions:
 repair(q)
 if q['id'] in affected:corrections.setdefault(q['id'],{}).update({'options':q['options']})
for path in [data_path,corrections_path]:
 if not (backup/path.name).exists():shutil.copy2(path,backup/path.name)
data_path.write_text(json.dumps(questions,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
corrections_path.write_text(json.dumps(corrections,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
helpers="""function choiceLabel(i){return String.fromCharCode(65+i)}
function validChoices(id,a,allowEmpty=true){const n=BY_ID.get(id)?.options.length;return Number.isInteger(n)&&Array.isArray(a)&&(allowEmpty||a.length>0)&&a.length<=n&&a.every(i=>Number.isInteger(i)&&i>=0&&i<n)}
"""
for path,name in [(ROOT/'IC_Study_Anime.html','offline.html'),(ROOT/'ic-study-online/source/study.html','online-source.html')]:
 text=path.read_text(encoding='utf-8')
 if not (backup/name).exists():shutil.copy2(path,backup/name)
 bank_match=re.search(r'(<script[^>]*id="question-bank"[^>]*>)(.*?)(</script>)',text,re.S)
 bank=json.loads(bank_match[2]);before={q['id']:q['answer'][:] for q in bank}
 for q in bank:repair(q)
 bank_json=json.dumps(bank,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c')
 text=text[:bank_match.start(2)]+bank_json+text[bank_match.end(2):]
 if 'function validChoices(' not in text:text=text.replace('function normalizeSavedSession(s){',helpers+'function normalizeSavedSession(s){',1)
 text=text.replace("Array.isArray(a)&&a.length<=4&&a.every(n=>Number.isInteger(n)&&n>=0&&n<4)","validChoices(id,a)")
 text=text.replace("Array.isArray(r.value)&&r.value.every(n=>Number.isInteger(n)&&n>=0&&n<4)","validChoices(id,r.value,false)")
 text=text.replace("Array.isArray(a)&&a.length&&a.length<=4&&a.every(n=>Number.isInteger(n)&&n>=0&&n<4)","validChoices(id,a,false)")
 text=text.replace("Array.isArray(a)&&a.every(n=>Number.isInteger(n)&&n>=0&&n<4)","validChoices(id,a)")
 text=text.replace("Array.isArray(k)&&k.length&&k.every(n=>Number.isInteger(n)&&n>=0&&n<4)","validChoices(id,k,false)")
 text=text.replace("'ABCD'[i]","choiceLabel(i)")
 text=text.replace("${[0,1,2,3].map(i=>", "${q.options.map((_,i)=>")
 text=text.replace("const s=S.session,q=currentQ();if(s.mode==='exam'&&Date.now()>=s.deadline)","const s=S.session,q=currentQ();if(!Number.isInteger(i)||i<0||i>=q.options.length)return;if(s.mode==='exam'&&Date.now()>=s.deadline)")
 text=text.replace("/^[1-4]$/.test(e.key)&&s.mode!=='flash'", "/^[1-9]$/.test(e.key)&&Number(e.key)<=currentQ().options.length&&s.mode!=='flash'")
 text=text.replace('<kbd>1</kbd>–<kbd>4</kbd> Chọn đáp án','<kbd>1</kbd>–<kbd>${Math.min(q.options.length,9)}</kbd> Chọn đáp án')
 text=text.replace('<kbd>1</kbd>–<kbd>4</kbd> Chọn A–D','<kbd>1</kbd>–<kbd>9</kbd> Chọn đáp án theo số lựa chọn đang hiển thị')
 text=text.replace('q.options.length!==4?q.id:null','q.imageOnly?q.id:null')
 assert all(before[q['id']]==q['answer'] for q in bank),'Answer keys changed'
 assert "'ABCD'" not in text and 'n<4' not in text and '[1-4]' not in text
 path.write_text(text,encoding='utf-8')
print('Recovered 9 fifth choices; frontend labels/selection/copy/import/shortcuts now use actual option counts. Existing answer keys preserved.')
