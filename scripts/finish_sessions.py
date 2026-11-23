from pathlib import Path
root=Path(__file__).resolve().parent.parent
for file in ['scripts/test_app.cjs','anime/test.cjs']:
 p=root/file;s=p.read_text(encoding='utf-8');marker='console.log(`${passed} checks passed.`);'
 assert marker in s
 s=s.replace(marker,(root/'scripts/session_tests.inc.cjs').read_text(encoding='utf-8')+'\n'+marker)
 p.write_text(s,encoding='utf-8')
for file in ['src/app.js','anime/app.js']:
 p=root/file;s=p.read_text(encoding='utf-8')
 s=s.replace("ids=h.ids.filter(id=>!same(h.answers[id],h.answerKeys?.[id]||answerKey(BY_ID.get(id))))", "ids=h.ids.filter(id=>h.answers[id]?.length&&!same(h.answers[id],h.answerKeys?.[id]||answerKey(BY_ID.get(id))))")
 p.write_text(s,encoding='utf-8')
