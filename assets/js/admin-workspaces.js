export const ADMIN_WORKSPACES={
 students:{title:'Data Santri',description:'Identitas, status, dan data wali santri.',items:[['students','Data Santri']]},
 staff:{title:'Data SDM',description:'Identitas dan penugasan personil pesantren.',items:[['staff','Data SDM']]},
 school:{title:'Data Sekolah',description:'Jenjang, kelas, wali kelas, dan peserta kelas.',items:[['units','Jenjang / Unit'],['classes','Kelas & Wali Kelas'],['class-placements','Peserta Kelas'],['academic-years','Tahun Ajaran']]},
 boarding:{title:'Data Asrama',description:'Kamar serta halaqah Bahasa Arab dan Al-Qur’an beserta anggotanya.',items:[['dormitories','Gedung Asrama'],['rooms','Kamar'],['room-placements','Penghuni Kamar'],['groups','Halaqah & Pembina'],['group-placements','Peserta Halaqah']]},
 lessons:{title:'Jadwal Pelajaran',description:'Atur pembelajaran formal, Al-Qur’an, dan Bahasa Arab pagi.',items:[['academic-schedules','Formal'],['quran-schedules','Al-Qur’an'],['arabic-schedules','Bahasa Arab'],['subjects','Mata Pelajaran'],['attendance-locations','Lokasi Presensi']]},
 programs:{title:'Jadwal Program Keasramaan',description:'Waktu kegiatan, kewajiban presensi dan laporan pelaksanaan.',items:[['daily-schedules','Jadwal 24 Jam'],['programs','Nama & Kategori Program']]},
 features:{title:'Manajemen Fitur',description:'Aktifkan atau nonaktifkan fitur yang tersedia per role.',items:[['features','Manajemen Fitur']]},
 users:{title:'Manajemen User',description:'Buat akun, kelola role dan penugasan, serta nonaktifkan akses.',href:'./accounts.html'}
};
export function workspaceFor(section){return Object.entries(ADMIN_WORKSPACES).find(([key,w])=>w.items?.some(([id])=>id===section))?.[0];}
export function normalizeAdminRecord(section,data,previous={}){
 const result={...data};
 if(section==='academic-schedules'&&previous.staffId)result.staffId=data.teacherStaffId;
 if(section==='groups'){
 result.programType=data.type==='Bahasa Arab'?'arabic':['Tahsin','Tahfiz','GEMA',"Halaqah Al-Qur'an"].includes(data.type)?'quran':previous.programType||'other';
 result.mentorStaffIds=[...new Set([data.mentorStaffId,...(data.mentorStaffIds||[])].filter(Boolean))];
 }
 if(['daily-schedules','quran-schedules','arabic-schedules','academic-schedules'].includes(section)){
 if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.startTime)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(data.endTime)||data.startTime===data.endTime)throw Error('Isi jam mulai dan selesai yang berbeda.');
 }
 if(['quran-schedules','arabic-schedules'].includes(section)){
 result.attendanceRole=section==='quran-schedules'?'mentor_tahsin_tahfiz':'guru_mapel';
 if(data.targetId){result.participantScope='group';result.teachingSchedule=true;}
 else if(!previous.id)throw Error('Pilih halaqah untuk jadwal baru.');
 }
 return result;
}

// Shared portal destinations keep the Admin home aligned with its data workspaces.
export const ADMIN_HOME_ROUTES = {
 'admin-students': {workspace:'students', href:'../admin/index.html#students'},
 'admin-staff': {workspace:'staff', href:'../admin/index.html#staff'},
 'admin-school': {workspace:'school', href:'../admin/index.html#units'},
 'admin-boarding': {workspace:'boarding', href:'../admin/index.html#rooms'},
 'admin-lessons': {workspace:'lessons', href:'../admin/index.html#academic-schedules'},
 'admin-programs': {workspace:'programs', href:'../admin/index.html#daily-schedules'},
 'admin-features': {workspace:'features', href:'../admin/index.html#features'},
 'admin-accounts': {workspace:'users', href:'../admin/accounts.html'}
};
