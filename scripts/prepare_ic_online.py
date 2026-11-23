"""Extract embedded images without changing the user-maintained app code or data."""
from pathlib import Path
import re,json,hashlib,base64,sys
root=Path(__file__).resolve().parent.parent
source=root/'IC_Study_Anime.html'
target=Path(sys.argv[1]).resolve()
source_bytes=source.read_bytes();original=source_bytes.decode('utf-8')
assets=target/'dist'/'assets';assets.mkdir(parents=True,exist_ok=True)
replacements={}
def extract(m):
 uri=m.group(0)
 if uri not in replacements:
  mime=m.group(1);raw=base64.b64decode(m.group(2),validate=True)
  extension={'jpeg':'jpg','svg+xml':'svg'}.get(mime,mime)
  name=hashlib.sha256(raw).hexdigest()[:24]+'.'+extension
  (assets/name).write_bytes(raw)
  replacements[uri]='./assets/'+name
 return replacements[uri]
html=re.sub(r'data:image/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)',extract,original)
(target/'dist'/'index.html').write_text(html,encoding='utf-8')
# Prove every change is an image URL substitution; preserve the user's full app.
reverse={v:k for k,v in replacements.items()}
restored=re.sub(r'\./assets/[a-f0-9]{24}\.[a-zA-Z0-9.+-]+',lambda m:reverse[m.group(0)],html)
assert restored==original,'Unexpected application change'
assert source.read_bytes()==source_bytes,'Source file changed'
bank=json.loads(re.search(r'<script[^>]*id=["\']question-bank["\'][^>]*>(.*?)</script>',html,re.S).group(1))
assert len(bank)==959
for q in bank:
 for field in ['questionImage','noteImage']:
  if q.get(field):assert (target/'dist'/q[field]).is_file(),q['id']
scripts=re.findall(r'<script(?![^>]*type=["\']application/json)[^>]*>(.*?)</script>',html,re.S)
check_dir=target/'.checks';check_dir.mkdir(exist_ok=True)
for i,script in enumerate(scripts):(check_dir/f'inline-{i}.js').write_text(script,encoding='utf-8')
report={'source':'IC_Study_Anime.html','source_sha256':hashlib.sha256(source_bytes).hexdigest(),'questions':len(bank),'assets':len(replacements),'index_bytes':len(html.encode('utf-8')),'max_asset_bytes':max(p.stat().st_size for p in assets.iterdir()),'transformation':'Embedded image URLs extracted; all other source preserved exactly.'}
(target/'source-provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
(target/'.gitignore').write_text('.checks/\n.sites-runtime/\n',encoding='utf-8')
(target/'README.md').write_text('IC Study online\n\nPrepared from the user-maintained IC_Study_Anime.html. Embedded images are extracted into dist/assets; the application is otherwise unchanged. Source provenance is recorded in source-provenance.json.\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
