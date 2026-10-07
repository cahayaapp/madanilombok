export function gemaLessonStudents(group,master){
 const ids=new Set();
 if(group.gemaAudience==='mutqin')for(const g of master.groups||[])if(g.gemaProgram&&g.status!=='inactive'&&/mutqin/i.test(g.name))for(const [id,a]of Object.entries(master.groupAssignments?.[g.id]||{}))if(a?.status!=='inactive')ids.add(id);
 return (master.students||[]).filter(s=>{const p=master.roomAssignments?.[s.id];return s.status!=='inactive'&&!s.mergedInto&&p?.status!=='inactive'&&['ROOM-PTR-GEMA','ROOM-PTRI-GEMA'].includes(p?.roomId)&&(group.gemaAudience==='all'||ids.has(s.id));}).sort((a,b)=>a.name.localeCompare(b.name));
}
export function quranLessonWindows(group,schedule,day,master){
 const minutes=t=>{const [h,m]=t.split(':').map(Number);return h*60+m;},time=n=>`${String(Math.floor(n/60)).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;
 let ranges=[[minutes(schedule.startTime),minutes(schedule.endTime)]];
 if(group.gemaProgram)for(const g of master.groups||[])if(g.programType==='lesson'&&g.status!=='inactive'&&(g.gemaAudience==='all'||g.gemaAudience==='mutqin'&&/mutqin/i.test(group.name)))for(const s of master.dailySchedules||[])if((g.dailyScheduleIds||[]).includes(s.id)&&s.status!=='inactive'&&s.academicYearId===schedule.academicYearId&&s.day===day){const a=minutes(s.startTime),b=minutes(s.endTime);ranges=ranges.flatMap(([x,y])=>b<=x||a>=y?[[x,y]]:[[x,Math.min(y,a)],[Math.max(x,b),y]].filter(([l,r])=>l<r));}
 return ranges.map(([a,b])=>({startTime:time(a),endTime:time(b)}));
}
