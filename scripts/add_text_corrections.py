import json,sys
from pathlib import Path
sys.stdin.reconfigure(encoding='utf-8')
path=Path(__file__).resolve().parent.parent/'data/text-corrections.json'
data=json.loads(path.read_text(encoding='utf-8')) if path.exists() else {}
incoming=json.load(sys.stdin)
data.update(incoming)
path.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Reviewed corrections:',len(data))
