"""Authoring helper only: pip install opencc-python-reimplemented; python src/i18n/build_catalog.py"""
from pathlib import Path
import json
from opencc import OpenCC
folder=Path(__file__).parent
cc=OpenCC('s2t')
rows=[]
for line in (folder/'catalog.tsv').read_text().splitlines():
 if not line.strip(): continue
 v=line.split('\t')
 assert len(v)==6,(len(v),v[0])
 rows.append([v[0],cc.convert(v[0]),*v[1:]])
(folder/'messages.json').write_text(json.dumps(rows,ensure_ascii=False,indent=1)+'\n')
print(f'{len(rows)} authored entries, 7 locales')
