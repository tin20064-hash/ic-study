import json,shutil,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
items=json.loads(Path(sys.argv[1]).read_text(encoding='utf-8'))
originals=ROOT/'anime/wallpaper-originals';originals.mkdir(parents=True,exist_ok=True)
assets=ROOT/'ic-study-online/public/assets/wallpapers';assets.mkdir(parents=True,exist_ok=True)
for item in items:
 source=Path(item['path']);shutil.copy2(source,originals/(item['id']+'.png'))
 with Image.open(source) as image:
  image.save(assets/(item['id']+'.webp'),'WEBP',lossless=True,method=6)
  image.thumbnail((520,300));image.save(assets/(item['id']+'-thumb.webp'),'WEBP',quality=88,method=6)
 print(item['id'],Image.open(source).size,(assets/(item['id']+'.webp')).stat().st_size)
