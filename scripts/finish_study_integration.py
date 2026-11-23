from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
for name in ['scripts/test_app.cjs','anime/test.cjs']:
 p=ROOT/name;s=p.read_text(encoding='utf-8');marker='console.log(`${passed} checks passed.`);'
 if "Timeline covers all 959" not in s:s=s.replace(marker,(ROOT/'scripts/study_tests.inc.cjs').read_text(encoding='utf-8')+'\n'+marker)
 p.write_text(s,encoding='utf-8')
for name in ['src/app.js','anime/app.js','anime/home.js']:
 p=ROOT/name;s=p.read_text(encoding='utf-8')
 target='data-act="course" data-subject="${code}">'
 if target in s:s=s.replace(target,'data-act="course" data-subject="${code}" ${studyFocus()&&studyFocus()!==code?\'disabled\':\'\'}>')
 p.write_text(s,encoding='utf-8')
p=ROOT/'src/study.js';s=p.read_text(encoding='utf-8').replace('ICI211:[]','ICI211:[[\'MIT OCW — CMOS inverter, noise margin và power\',\'https://ocw.mit.edu/courses/6-012-microelectronic-devices-and-circuits-fall-2005/resources/lec14/\']]');p.write_text(s,encoding='utf-8')
print('Study regression tests and focus controls ready.')
