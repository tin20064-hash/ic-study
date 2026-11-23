from pathlib import Path
import re,json,hashlib
p=Path(__file__).resolve().parent.parent/'IC_Study_Anime.html'
s=p.read_text(encoding='utf-8')
images=re.findall(r'data:image/([a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)',s)
bank=re.search(r'<script[^>]*id=["\']question-bank["\'][^>]*>(.*?)</script>',s,re.S)
print(json.dumps({'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'title':re.search(r'<title>(.*?)</title>',s,re.S).group(1),'questions':len(json.loads(bank.group(1))) if bank else None,'embedded_images':len(images),'unique_embedded_images':len(set(images)),'max_image_bytes':max(len(b)*3//4 for _,b in images),'external_resources':re.findall(r'(?:src|href)=["\']((?:https?:|file:|[A-Za-z]:)[^"\']+)',s)[:20],'scripts':len(re.findall(r'<script(?:\s|>)',s))},ensure_ascii=False,indent=2))
