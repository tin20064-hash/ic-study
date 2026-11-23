import base64,hashlib,re
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
DIR=ROOT/'anime'
old=ROOT/'OnTap_4Mon.html'
before=hashlib.sha256(old.read_bytes()).hexdigest()
# Both editions now use the updated text question bank, as requested.
original=old.read_text(encoding='utf-8')
bank=re.search(r'<script id="question-bank" type="application/json">(.*?)</script>',original,re.S)[1]
asset=DIR/'assets/sakura-study.webp'
with Image.open(DIR/'assets/sakura-study.png') as im:im.save(asset,format='WEBP',quality=91,method=6)
art='data:image/webp;base64,'+base64.b64encode(asset.read_bytes()).decode()
css=(DIR/'base.css').read_text(encoding='utf-8')+'\n'+(ROOT/'src/study.css').read_text(encoding='utf-8')+'\n'+(DIR/'pastel.css').read_text(encoding='utf-8')+'\n'+(DIR/'study-pastel.css').read_text(encoding='utf-8')+'\n'+(ROOT/'src/sessions.css').read_text(encoding='utf-8')+'\n'+(DIR/'themes.css').read_text(encoding='utf-8')
js=(ROOT/'src/study.js').read_text(encoding='utf-8')+'\n'+(DIR/'sessions.js').read_text(encoding='utf-8')+'\n'+(DIR/'app.js').read_text(encoding='utf-8')
home=(DIR/'home.js').read_text(encoding='utf-8')
js=re.sub(r'function home\(\)\{.*?(?=function subjectSelect\()',lambda m:home+'\n',js,flags=re.S)
theme=(DIR/'appearance.js').read_text(encoding='utf-8')
html=(DIR/'index.html').read_text(encoding='utf-8').replace('/*__STYLE__*/',css).replace('/*__BANK__*/',bank).replace('/*__APP__*/',js).replace('/*__LOOK__*/',theme).replace('/*__ANIME_ART__*/',art)
out=ROOT/'OnTap_4Mon_Anime.html';out.write_text(html,encoding='utf-8')
assert hashlib.sha256(old.read_bytes()).hexdigest()==before
print('Saved',out.name,round(out.stat().st_size/1024/1024,1),'MB')
print('Original HTML unchanged. SHA256:',before)
