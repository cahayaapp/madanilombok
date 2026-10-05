import json
from pathlib import Path
root=Path(__file__).resolve().parents[1];p=root/'seed/master-data.json';d=json.loads(p.read_text());links=[];pending=[]
for gid,g in d['groups'].items():
 if not gid.startswith('GRP-2026-'):continue
 ids=list(dict.fromkeys(g.get('mentorStaffIds',[])+([g['mentorStaffId']] if g.get('mentorStaffId') else [])))
 if not ids:pending.append({'groupId':gid,'name':g['name'],'sourceMentorName':g.get('mentorName','')});continue
 source=g.get('sourceMentorName',g['mentorName']);g['sourceMentorName']=source;g['mentorName']=' & '.join(d['staff'][id]['name'] for id in ids)
 role='guru_mapel' if g['programType']=='arabic' else 'mentor_tahsin_tahfiz'
 links.append({'groupId':gid,'staffIds':ids,'staffNames':{id:d['staff'][id]['name'] for id in ids},'sourceMentorName':source,'role':role})
 for id in ids:
  s=d['staff'][id];s['appRoles']=list(dict.fromkeys(s.get('appRoles',[])+[role]));scope=s.setdefault('roleScopes',{}).setdefault(role,{});scope['groupIds']=list(dict.fromkeys(scope.get('groupIds',[])+[gid]))
(root/'seed/imports/group-teacher-links-2026.json').write_text(json.dumps({'id':'group-teacher-links-2026-v1','links':links,'pending':pending},ensure_ascii=False,indent=2)+'\n');p.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');print('Linked groups:',len(links),'Pending:',len(pending))
