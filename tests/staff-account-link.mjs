import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {staffAccountState,staffAccountCell,staffAccountAction,renderStaffAccountPrompt,assertStaffAccountAvailable} from '../assets/js/staff-account-link.js';
import {buildStaffAccountPlan} from '../assets/js/staff-account-plan.js';
const {JSDOM}=createRequire(import.meta.url)(process.env.MADANI_JSDOM_MODULE||'jsdom');
test('staff status follows exact ID and distinguishes missing, active, inactive, revoked, duplicates and failed reads',()=>{
 assert.equal(staffAccountState('s',null).key,'unknown');assert.equal(staffAccountState('s',[]).key,'none');
 assert.equal(staffAccountState('s',[{name:'Same name',staffId:'other'}]).key,'none');
 for(const [profile,key] of [[{},'active'],[{active:false},'inactive'],[{accessRevoked:true},'revoked']])assert.equal(staffAccountState('s',[{staffId:'s',...profile}]).key,key);
 assert.equal(staffAccountState('s',[{staffId:'s'},{staffId:'s'}]).key,'multiple');
 assert.match(staffAccountCell('s',[{staffId:'s',email:'<bad>'}]),/&lt;bad&gt;/);
 assert.match(staffAccountAction('s',[]),/Buat akun/);assert.match(staffAccountAction('s',null),/Periksa akun/);
});
test('saved SDM prompt offers optional account handoff and a working later action',()=>{
 const dom=new JSDOM('<form></form>'),form=dom.window.document.querySelector('form');let closed=false;
 renderStaffAccountPrompt(form,{id:'SDM new&1',name:'Nama <aman>'},()=>{closed=true;});
 assert.equal(form.querySelector('a').getAttribute('href'),'./accounts.html?staffId=SDM%20new%261');assert.equal(form.querySelector('h3').textContent,'Nama <aman>');form.querySelector('button').click();assert.equal(closed,true);
});
test('existing manual or revoked account is not offered again by bulk provisioning',()=>{
 const staff=[{id:'s',name:'Nama SDM',appRoles:['guru_mapel'],status:'active'}];
 const profiles=[{id:'user',staffId:'s',email:'custom@example.test',active:false,accessRevoked:true}];
 const [row]=buildStaffAccountPlan(staff,profiles);assert.equal(row.status,'existing');assert.equal(row.existingUid,'user');
 assert.throws(()=>assertStaffAccountAvailable('s',profiles),/sudah terhubung/);assert.doesNotThrow(()=>assertStaffAccountAvailable('s',profiles,'user'));
});
