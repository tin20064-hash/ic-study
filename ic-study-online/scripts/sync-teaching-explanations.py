from pathlib import Path
import json,re

payload=json.dumps(json.loads(Path('source/teaching-explanations.json').read_text(encoding='utf8')),ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c')
lessons={x['id']:{'mechanism':x['mechanism'],'comparisons':x['comparisons']} for x in json.loads(Path('source/detailed-explanation-lessons.json').read_text(encoding='utf8'))}
lesson_payload=json.dumps(lessons,ensure_ascii=False,separators=(',',':')).replace('<',r'\u003c')
module=Path('source/teaching-explanations.js').read_text(encoding='utf8').strip()
css=Path('source/teaching-explanations.css').read_text(encoding='utf8').strip()
for path in [Path('source/study.html'),Path('../IC_Study_Anime.html')]:
 text=path.read_text(encoding='utf8')
 lesson_tag='<script id="explanation-lessons" type="application/json">'+lesson_payload+'</script>'
 if 'id="explanation-lessons"' in text:
  text=re.sub(r'<script id="explanation-lessons" type="application/json">[\s\S]*?</script>',lambda m:lesson_tag,text)
 else:
  text=text.replace('<script id="teaching-explanations"',lesson_tag+'\n<script id="teaching-explanations"',1)
 data_tag='<script id="teaching-explanations" type="application/json">'+payload+'</script>'
 style_tag='<style id="teaching-explanations-styles">\n'+css+'\n</style>'
 module_tag='/* BEGIN TEACHING EXPLANATIONS */\n'+module+'\n/* END TEACHING EXPLANATIONS */\n'
 if 'id="teaching-explanations"' in text:
  text=re.sub(r'<script id="teaching-explanations" type="application/json">[\s\S]*?</script>',lambda m:data_tag,text)
  text=re.sub(r'<style id="teaching-explanations-styles">[\s\S]*?</style>',lambda m:style_tag,text)
  text=re.sub(r'/\* BEGIN TEACHING EXPLANATIONS \*/[\s\S]*?/\* END TEACHING EXPLANATIONS \*/\n',lambda m:module_tag,text)
 else:
  text=text.replace('<script id="past-exams"',data_tag+'\n<script id="past-exams"',1)
  text=text.replace('</head>',style_tag+'\n</head>',1)
  text=text.replace('const SHORT_EXPLANATIONS=',module_tag+'const SHORT_EXPLANATIONS=',1)
 old='<p class="explain-row"><strong class="explain-label">Vì sao đúng</strong>${esc(x.reason)}</p><p class="explain-row quick-tip"><strong class="explain-label">✦ Mẹo chọn nhanh</strong>${esc(x.tip)}</p>'
 new='${typeof renderTeachingExplanation===\'function\'&&typeof TEACHING_EXPLANATIONS!==\'undefined\'&&TEACHING_EXPLANATIONS[q.id]?renderTeachingExplanation(q.id):`'+old+'`}'
 if old in text and new not in text:
  assert text.count(old)==1
  text=text.replace(old,new,1)
 oldcopy="+'Vì sao đúng: '+x.reason+'\\nMẹo chọn nhanh: '+x.tip+"
 newcopy="+(typeof teachingExplanationText==='function'&&teachingExplanationText(id)||'Vì sao đúng: '+x.reason+'\\nMẹo chọn nhanh: '+x.tip)+"
 if oldcopy in text: text=text.replace(oldcopy,newcopy,1)
 assert text.count('/* BEGIN TEACHING EXPLANATIONS */')==1
 assert text.count('id="teaching-explanations"')==1
 path.write_text(text,encoding='utf8',newline='\n')
 print('Updated',path)
