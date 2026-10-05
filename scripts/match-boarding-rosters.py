"""Generate reviewable exact matches and suggestions; never apply fuzzy matches."""
import json,re,difflib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
seed=json.loads((root/'seed/master-data.json').read_text())
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
alias={}
def register(name,id):
 if name:alias.setdefault(norm(name),set()).add(id)
for id,s in seed['students'].items(): register(s['name'],id)
for a in seed['assignments']['rooms'].values():
 for id,x in a.items():register(x.get('sourceName'),id)
for year in seed['assignments']['groups'].values():
 for group in year.values():
  for id,x in group.items():register(x.get('sourceName'),id)
collections=[]
for f in ['boarding-2026-workbooks.json','boarding-2026-images.json']:collections+=json.loads((root/'seed/imports'/f).read_text())['collections']
review={};matched={}
for c in collections:
 if c.get('staffRoom'):continue
 for x in c['members']:
  n=x['name'];ids=alias.get(norm(n),set())
  if len(ids)==1:matched[n]=next(iter(ids));continue
  if n in review:continue
  ranked=sorted(seed['students'].items(),key=lambda kv:difflib.SequenceMatcher(None,norm(n),norm(kv[1]['name'])).ratio(),reverse=True)[:3]
  review[n]={'candidates':[{'studentId':id,'name':s['name']} for id,s in ranked]}
(root/'seed/imports/boarding-2026-match-review.json').write_text(json.dumps({'matched':matched,'unresolved':review},ensure_ascii=False,indent=2)+'\n')
for n,x in review.items():print(n,'=>',' / '.join(z['studentId']+' '+z['name'] for z in x['candidates'][:2]))
print('MATCHED',len(matched),'REVIEW',len(review))
