import test from 'node:test';
import assert from 'node:assert/strict';
import {naqibProgramKind,NAQIB_PROGRAM_KINDS} from '../assets/js/naqib-program-policy.js';
test('Naqib attendance includes only the requested kinds and confirmed Monday/Saturday replacements',()=>{
 for(const kind of NAQIB_PROGRAM_KINDS)assert.equal(naqibProgramKind({naqibProgramKind:kind}),kind);
 for(const name of ['Bahasa Arab','Tahfiz','Mandi','Sekolah','Qobliyah subuh','Bangun tidur','Sholat duha','Senam','Apel Pagi'])assert.equal(naqibProgramKind({}, {name}),null,name);
 assert.equal(naqibProgramKind({}, {name:'Asrama Umum 15:30 · Sholat asar'}),'ashar');
 assert.equal(naqibProgramKind({}, {name:'Asrama GEMA 12:00 · Sholat zuhur'}),'zuhur');
 assert.equal(naqibProgramKind({}, {name:'Asrama Umum 18:00 · Sholat magrib'}),'magrib');
 assert.equal(naqibProgramKind({naqibAttendance:false,naqibProgramKind:'subuh'}),null);
 assert.equal(naqibProgramKind({naqibProgramKind:'subuh'},{status:'inactive'}),null);
});

test('GEMA programs cannot be registered for Naqib even with a legacy Naqib role or prayer name',()=>{
 for(const attendanceRole of ['naqib','pembina_gema','mentor_tahsin_tahfiz','guru_mapel'])assert.equal(naqibProgramKind({participantScope:'boarding_gema',attendanceRole,naqibProgramKind:'senam'},{name:'Sholat zuhur'}),null);
});
