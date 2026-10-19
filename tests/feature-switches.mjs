import test from 'node:test';
import assert from 'node:assert/strict';
import {setFeatureSwitches,featureKey} from '../assets/js/feature-switches.js';
import {canAccess} from '../assets/js/permissions.js';
test('feature switches restrict one role without expanding grants or deleting protected functions',()=>{
 try{
 setFeatureSwitches({naqib:{[featureKey('boarding.naqib.attendance')]:false,[featureKey('finance.cashier')]:true},guru_mapel:{[featureKey('academic.teacher_attendance')]:false},admin:{[featureKey('workspace.admin-features')]:false,[featureKey('finance.cashier')]:false}});
 assert.equal(canAccess('boarding.naqib.attendance',['naqib']),false);
 assert.equal(canAccess('academic.teacher_attendance',['guru_mapel']),false);
 assert.equal(canAccess('boarding.naqib.attendance',['admin']),true);
 assert.equal(canAccess('finance.cashier',['naqib']),false);
 assert.equal(canAccess('finance.cashier',['admin']),true);
 assert.equal(canAccess('workspace.admin-features',['admin']),true);
 assert.equal(canAccess('dashboard',['naqib']),true);
 setFeatureSwitches({naqib:{[featureKey('boarding.naqib.attendance')]:true}});
 assert.equal(canAccess('boarding.naqib.attendance',['naqib']),true);
 }finally{setFeatureSwitches({});}
});
