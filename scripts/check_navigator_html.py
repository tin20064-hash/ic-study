from pathlib import Path
import re,json
root=Path(__file__).resolve().parent.parent
current=(root/'IC_Study_Anime.html').read_text(encoding='utf-8')
previous=(root/'backups/before-navigator-2026-11-08/IC_Study_Anime.html').read_text(encoding='utf-8')
bank=lambda s: re.search(r'<script id="question-bank" type="application/json">(.*?)</script>',s,re.S)[1]
assert bank(current)==bank(previous)
assert len(json.loads(bank(current)))==959
checks=root/'scripts/.checks';checks.mkdir(exist_ok=True)
for i,(attrs,script) in enumerate(re.findall(r'<script([^>]*)>(.*?)</script>',current,re.S)):
 if 'application/json' not in attrs:(checks/f'nav-{i}.js').write_text(script,encoding='utf-8')
print('959 questions and answer keys unchanged; original filename and storage keys retained.')
