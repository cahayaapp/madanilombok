import test from 'node:test';
import assert from 'node:assert/strict';
import {userExportCsv} from '../assets/js/user-export.js';
test('user CSV includes linked staff, roles and statuses without credential fields',()=>{
 const csv=userExportCsv([{id:'u1',name:'Nama, "Satu"',email:'satu@example.test',staffId:'s1',roles:['admin'],role:'admin',password:'SECRET'}, {id:'u2',active:false},{id:'u3',accessRevoked:true}],[{id:'s1',name:'SDM Satu'}]);
 assert.ok(csv.startsWith('\uFEFF'));assert.ok(csv.includes('"Nama, ""Satu"""'));assert.ok(csv.includes('"SDM Satu"'));
 assert.ok(csv.includes('"Nonaktif"'));assert.ok(csv.includes('"Akses dicabut"'));assert.ok(!csv.includes('SECRET'));
});
test('CSV handles empty lists and neutralizes spreadsheet formulas',()=>{
 assert.equal(userExportCsv([]).split('\r\n').length,1);
 for(const name of ['=1+1','+SUM(1)','@SUM(1)','-1','  =1','\t=1'])assert.ok(userExportCsv([{name}]).includes('"\''+name+'"'));
});
