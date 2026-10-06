"""Read the two approved DOCX sources; update local seed and an incremental package."""
import hashlib,json,re
from pathlib import Path
from docx import Document
root=Path(__file__).resolve().parents[1]
seedpath=root/'seed/master-data.json'
seed=json.loads(seedpath.read_text())
year='TA-2026-2027-GANJIL'; update='daily-2026-docx'; changes={}; expected={}; sources={}
def change(path,value):
    changes[path]=value
    node=seed
    parts=path.split('/')
    for part in parts[:-1]: node=node.setdefault(part,{})
    node[parts[-1]]=value
legacy=['roundown kegiatan harian ASPURA 2025.pdf','Jadwal_Harian_Santriwi Umum.xlsx','Kegiatan Harian Santriwati GEMA.xlsx']
for sid,s in list(seed['schedules']['daily'].items()):
    if s.get('source') in legacy and s.get('academicYearId')==year:
        for base in ['schedules/daily/'+sid,'programs/'+s['programId']]:
            expected[base]={'source':s['source']}
            change(base+'/status','inactive');change(base+'/supersededBy',update)
for audience in ['umum','GEMA']:
    path=Path('/Users/haimac/Downloads')/f'kegiatan santriwan santriwati {audience} 2026.docx'
    rows=[[c.text.strip() for c in r.cells] for r in Document(path).tables[0].rows]
    sources[audience]={'file':path.name,'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'rows':rows}
    count=0
    for rownum,row in enumerate(rows):
        times=re.findall(r'\d{2}\.\d{2}',row[1])
        if len(times)!=2: continue
        count+=1; start,end=[v.replace('.',':') for v in times]
        scope='boarding_gema' if audience=='GEMA' else 'boarding_general'
        suffix=f'{audience.upper()}-{count:02d}'; pid='PRG-2026-'+suffix; sid='DS-2026-'+suffix
        notes=re.sub('mufrodat','Bahasa Arab',row[4],flags=re.I) if start=='05:40' else row[4]
        detail=re.sub('mufrodat','Bahasa Arab',row[2],flags=re.I) if start=='05:40' else row[2]; name=detail.split(',')[0].strip()
        label='Asrama GEMA' if audience=='GEMA' else 'Asrama Umum'
        common={'status':'active','source':path.name,'sourceRow':rownum+1,'importId':update,'genderScope':'mixed'}
        change('programs/'+pid,{**common,'name':f'{label} {start} · {name}','detail':detail,'description':detail,'defaultPic':row[3],'notes':notes,'category':'Program 24 Jam','sourceCategory':'program_24_jam','defaultScope':scope})
        change('schedules/daily/'+sid,{**common,'programId':pid,'academicYearId':year,'day':'Setiap Hari','startTime':start,'endTime':end,'endsNextDay':end<start,'order':count,'participantScope':scope,'audience':label,'notes':notes})
report={'academicYearId':year,'general':14,'gema':17,'retired':50,'dayBasis':'Jadwal harian; dokumen tidak merinci pengecualian akhir pekan.'}
(root/'seed/imports/daily-2026-source.json').write_text(json.dumps(sources,ensure_ascii=False,indent=2)+'\n')
(root/'seed/imports/daily-2026-update.json').write_text(json.dumps({'id':update,'report':report,'expected':expected,'changes':changes},ensure_ascii=False,indent=2)+'\n')
seedpath.write_text(json.dumps(seed,ensure_ascii=False,indent=2)+'\n')
print(report)
