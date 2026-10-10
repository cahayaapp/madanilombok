import test from 'node:test';import assert from 'node:assert/strict';
import {validatePermit,permitDorm,permitTransition} from '../assets/js/student-permit-model.js';
const form={type:'Kontrol / Medical Check Up',startDate:'2026-10-08T08:00',endDate:'2026-10-08T12:00',reason:'Kontrol rutin',destination:'Klinik',pickup:'Ibu',relation:'Ibu',phone:'0800000000'};
test('permit category duration and same day medical control follow reference rules',()=>{assert.ok(validatePermit(form));assert.throws(()=>validatePermit({...form,endDate:'2026-10-09T07:00'}));assert.throws(()=>validatePermit({...form,type:'Pengantaran Haji / Umrah Keluarga Inti',endDate:'2026-10-10T07:00'}));assert.throws(()=>validatePermit({...form,pickup:''}));assert.throws(()=>validatePermit({...form,startDate:'2026-02-30T08:00'}));});
test('boarding placement routes approval and only matching dorm head can decide or record return',()=>{const master={rooms:[{id:'r',dormitoryId:'DORM-PUTRI'}],roomAssignments:{s:{roomId:'r'}}};assert.equal(permitDorm(master,'s'),'DORM-PUTRI');assert.throws(()=>permitDorm(master,'missing'));const r={...validatePermit(form),dormitoryId:'DORM-PUTRI',parentUid:'parent'},actor={uid:'head',role:'head_girls_dorm'};assert.throws(()=>permitTransition(r,{...actor,role:'head_boys_dorm'},'approved','OK'));const decision=permitTransition(r,actor,'approved','Dijemput ibu').value;assert.throws(()=>permitTransition({...r,decision},actor,'rejected','Ganti'));assert.throws(()=>permitTransition(r,actor,'returned','Kembali','2026-10-08T12:00'));const returned=permitTransition({...r,decision},actor,'returned','Sudah kembali','2026-10-08T13:00');assert.equal(returned.value.late,true);assert.throws(()=>permitTransition({...r,decision,returned:returned.value},actor,'returned','Ulang','2026-10-08T13:00'));});

test('server permit writes enforce guardian linkage and dorm head isolation',async()=>{
 const {readFileSync}=await import('node:fs');const rootRules=JSON.parse(readFileSync('database.rules.json','utf8')).rules.madani_app;
 assert.equal(rootRules.parent['.write'],undefined);
 const rule=rootRules.parent.permissions.$yearId.$studentId.$requestId;
 const snap=(v,parent)=>({val:()=>v??null,exists:()=>v!=null,isString:()=>typeof v==='string',child:p=>snap(String(p).split('/').reduce((o,k)=>o?.[k],v),v),parent:()=>snap(parent)});
 const run=(expr,role,current,next,parent,studentIds=['s'])=>Function('auth','root','data','newData','$yearId','$studentId',`return (${expr})`)({uid:'actor'},snap({madani_app:{users:{actor:{role,active:true,studentIds}},rooms:{r:{dormitoryId:'DORM-PUTRI'}},assignments:{rooms:{y:{s:{roomId:'r'}}}}}}),snap(current,parent),snap(next),'y','s');
 const request={studentIndex:'0',parentUid:'actor',dormitoryId:'DORM-PUTRI'};
 assert.equal(run(rule['.write'],'wali_santri',null,request),true);assert.equal(run(rule['.write'],'wali_santri',null,request,{},['other']),false);
 assert.equal(run(rule['.write'],'wali_santri',null,{...request,dormitoryId:'DORM-PUTRA'}),false);
 const parent={parentUid:'parent',dormitoryId:'DORM-PUTRI'};
 assert.equal(run(rule.decision['.write'],'head_girls_dorm',null,{},parent),true);assert.equal(run(rule.decision['.write'],'head_boys_dorm',null,{},parent),false);assert.equal(run(rule.decision['.write'],'head_girls_dorm',{}, {},parent),false);assert.equal(run(rule.returned['.write'],'head_girls_dorm',null,{},parent),false);
});
