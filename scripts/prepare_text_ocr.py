import json
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parent.parent
bank=json.loads((ROOT/'data/questions.json').read_text(encoding='utf-8'))
dest=ROOT/'data/text-crops';dest.mkdir(exist_ok=True)
for q in bank:
    out=dest/(q['id']+'.png')
    if out.exists():continue
    with Image.open(ROOT/q['source']) as im:
        crop=im.crop((590,290,1555,735))
        crop.resize((1930,890),Image.Resampling.LANCZOS).save(out)
print('Prepared',len(bank),'text crops.')
