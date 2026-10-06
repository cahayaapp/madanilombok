"""Apply verified roster matches locally; leave unresolved identities in the review queue."""
import json,re,copy
from pathlib import Path
root=Path(__file__).resolve().parents[1];folder=root/'seed/imports';year='TA-2026-2027-GANJIL';update='boarding-rosters-2026'
read=lambda p:json.loads(p.read_text())
seed=read(root/'seed/master-data.json');review=read(folder/'boarding-2026-match-review.json');sources=[read(folder/f) for f in ['boarding-2026-workbooks.json','boarding-2026-images.json']]
confirmation=read(folder/'boarding-2026-confirmations.json') if (folder/'boarding-2026-confirmations.json').exists() else {'aliases':{}}
def norm(s):return re.sub(r'[^a-z0-9]','',s.lower())
lookup={norm(n):id for n,id in review['matched'].items()};lookup.update({norm(n):id for n,id in confirmation['aliases'].items()})
previous=read(folder/'boarding-2026-update.json') if (folder/'boarding-2026-update.json').exists() else {}
changes={};expected={};pending=[];duplicates=[];counts={}
def put(path,value):
 node=seed;parts=path.split('/')
 for part in parts[:-1]:node=node.setdefault(part,{})
 old=node.get(parts[-1]);expected[path]=previous.get('expected',{}).get(path,copy.deepcopy(old));node[parts[-1]]=value;changes[path]=value
roomids={'rooms-P-3':'ROOM-PTRI-M1','rooms-P-4':'ROOM-PTRI-M2','rooms-P-5':'ROOM-PTRI-M3','rooms-P-6':'ROOM-PTRI-P1','rooms-P-7':'ROOM-PTRI-P2','rooms-P-8':'ROOM-PTRI-GEMA','rooms-L-c2':'ROOM-PTR-C2','rooms-L-c3':'ROOM-PTR-C3','rooms-L-gema':'ROOM-PTR-GEMA'}
staff={'Fahri Gontor':['AMD-SDM-0023'],'Usth Ida Fitriana':['AMD-SDM-0036'],'Muhammad Tuzri':['AMD-SDM-0054'],'Muhasim':['AMD-SDM-0055'],'Bintang':['AMD-SDM-0013'],'Usth. Fathul Uyun':['AMD-SDM-0024'],'Ust. Fathul Uyun':['AMD-SDM-0024'],'Usth Yanti':['AMD-SDM-0082'],'Usth. Hikmah':['AMD-SDM-0030'],'Muammar':['AMD-SDM-0052'],'Usth Fathul U.':['AMD-SDM-0024'],'Usth Nuril A.':['AMD-SDM-0062']}
for source in sources:
 for c in source['collections']:
  key=c['key'];kind=c['kind'];records={}
  if c.get('staffRoom'):
   put('reference/boardingRosterStaffRooms/'+year+'/'+roomids[key],c);continue
  for m in c['members']:
   sid=None if norm(m['name']) in {norm(n) for n in confirmation.get('skipNames',[])} else lookup.get(norm(m['name']))
   if not sid:pending.append({'collection':key,**m});continue
   if sid not in seed['students']:raise ValueError('Unknown student '+sid)
   if sid in records:duplicates.append({'collection':key,'studentId':sid,**m});continue
   records[sid]={'studentId':sid,'academicYearId':year,'source':c['source'],'sourceName':m['name'],'sourceCell':m.get('cell',''),'sourcePosition':m.get('position',0),'status':'active','importId':update,'roomLeader':m.get('roomLeader',False)}
  counts[key]={'sourceRows':len(c['members']),'linked':len(records)}
  if kind=='rooms':
   rid=roomids[key]
   for sid,r in records.items():put(f'assignments/rooms/{year}/{sid}',{**r,'roomId':rid})
   if key=='rooms-L-gema':put(f'rooms/{rid}/building','Cairo')
  else:
   gid='GRP-2026-'+key
   name=c['name']
   if key.startswith('quran-P-') and int(key.split('-')[-1])>=8:name+=' — '+c['mentor']
   typ='Bahasa Arab' if kind=='arabic' else 'Tahsin' if 'tahsin' in name.lower() else 'Halaqah Al-Qur\'an'
   group={'name':name,'gender':c['gender'],'programType':'arabic' if kind=='arabic' else 'quran','type':typ,'unitId':'UNIT-PONDOK','mentorName':c['mentor'],'mentorStaffIds':staff.get(c['mentor'],[]),'status':'active','source':c['source'],'importId':update,'rosterStatus':'needs_review' if len(records)<len(c['members']) else 'linked','sourceMemberCount':len(c['members'])}
   if group['mentorStaffIds']:group['mentorStaffId']=group['mentorStaffIds'][0]
   if kind=='arabic':group.update({'timeLabel':'Ba’da Subuh','startTime':'05:40','endTime':'06:10','scheduleBasis':'Jadwal 24 jam DOCX 2026, Bahasa Arab','category':'Bahasa Arab Pagi'})
   group.update({k:seed.get('groups',{}).get(gid,{}).get(k) for k in ['teachingEnabled','subjectId','dailyScheduleId'] if k in seed.get('groups',{}).get(gid,{})})
   put('groups/'+gid,group)
   for sid,r in records.items():put(f'assignments/groups/{year}/{gid}/{sid}',{**r,'groupId':gid})
# Preserve old group membership history; active groups are replaced by the new source.
for gid,g in list(seed['groups'].items()):
 if gid.startswith('HLQ-'):
  put('groups/'+gid+'/status','inactive');put('groups/'+gid+'/supersededBy',update)
weekly=[('Malam Jumat','Yasinan, Al-Waqiah, Al-Mulk dan Sholawatan','all_boarding','mixed'),('Hari Jumat Bakda Subuh','Membaca Surah Al-Kahfi','all_boarding','mixed'),('Malam Sabtu','Muhadhoroh bagi anak umum','boarding_general','mixed'),('Pagi Sabtu','Kajian GEMA bersama TGH. Sahabudin, Lc., M.Sy','boarding_gema','mixed'),('Sore Sabtu','Pramuka','all_boarding','mixed'),('Malam Ahad','Pengajian Fiqh di Putra bersama Ustadz Bahtiar','all_boarding','L'),('Pagi Ahad','Olahraga: senam, futsal, renang, gotong royong bersih-bersih','all_boarding','mixed'),('Sore Ahad','Wushu','all_boarding','mixed'),('Minggu kedua setiap bulan','Pengajian umum santri, guru dan wali santri','all_students','mixed'),('Siang Senin dan Selasa','Belajar Bahasa Arab Durusulugoh bersama Ustadz Bahtiar Ahadi, Lc., MA','boarding_gema','mixed'),("Jumat Siang","Belajar Nahwu bersama Kyai Anwar Syafi’i, Lc",'boarding_gema','mixed')]
for i,(time,name,scope,gender) in enumerate(weekly,1):
 put(f'schedules/recurring/REC-2026-{i:02d}',{'name':name,'timeLabel':time,'frequency':'monthly' if i==9 else 'weekly','participantScope':scope,'genderScope':gender,'academicYearId':year,'status':'active','source':sources[1]['weeklyReference']['source'],'sourcePeriod':'Oktober 2025','confirmedCurrentPeriod':'Konfirmasi pengguna: berlaku 2026/2027','importId':update,'order':i})
report={'academicYearId':year,'counts':counts,'pending':pending,'duplicates':duplicates,'recurring':len(weekly),'groupCount':sum(1 for x in changes if x.startswith('groups/GRP-') and x.count('/')==1)}
put('reference/boardingRosterReview/'+year,report)
(folder/'boarding-2026-update.json').write_text(json.dumps({'id':update,'report':report,'changes':changes,'expected':expected},ensure_ascii=False,indent=2)+'\n')
(root/'seed/master-data.json').write_text(json.dumps(seed,ensure_ascii=False,indent=2)+'\n')
print('Groups:',report['groupCount'],'Pending occurrences:',len(pending),'Duplicates:',len(duplicates))
