import re
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
for name in ['src/app.js','anime/app.js','anime/home.js']:
 p=ROOT/name;s=p.read_text(encoding='utf-8')
 s,n=re.subn(r'<section class="panel daily">.*?</section>',lambda m:'${studyDailyHomeCard()}',s,flags=re.S)
 assert n==1,(name,n)
 p.write_text(s,encoding='utf-8')
print('Homepage target now matches the real timeline, not the former 20-question goal.')
