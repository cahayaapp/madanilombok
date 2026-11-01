import test from 'node:test';import assert from 'node:assert/strict';
import {canAccess,ROLE_LABELS,MENU_GROUPS} from '../assets/js/permissions.js';
import {roleIds,applyUserDraft,validateUserDraft} from '../assets/js/user-access-model.js';
import {bottomRoutes} from '../assets/js/role-experience.js';
test('minimart has all six registered menus but no wallet mutation, billing or legacy cashier permission',()=>{
 assert.ok(ROLE_LABELS.minimart);for(const suffix of ['pos','products','inventory','history','reports','shift']){assert.ok(canAccess(`minimart.${suffix}`,['minimart']));assert.ok(MENU_GROUPS.flatMap(g=>g.items).some(i=>i.id===`minimart-${suffix}`));}
 for(const feature of ['finance.wallets','finance.payments','finance.bills','finance.cashier','workspace.teacher-case'])assert.equal(canAccess(feature,['minimart']),false);
 for(const role of ['guru_mapel','wali_santri','head_formal_school'])assert.equal(canAccess('minimart.pos',[role]),false);
 for(const role of ['admin','super_admin','director','deputy_director'])assert.equal(canAccess('minimart.reports',[role]),true);
 assert.equal(bottomRoutes('minimart',()=>true).schedule,'minimart-shift');
});
test('existing account gains scoped minimart role without dropping UID-linked profile fields or other roles',()=>{
 const draft={name:'Petugas',staffId:'',roles:['guru_mapel','minimart'],defaultRole:'minimart',roleScopes:{minimart:{financeUnit:'PUTRA'}},active:true};
 const original={email:'mart@madani.app',displayName:'Nama tetap',role:'guru_mapel',roles:['guru_mapel'],createdAt:123};
 const result=applyUserDraft(original,draft,{},'admin','existing-uid','event');assert.equal(result.email,original.email);assert.equal(result.createdAt,123);assert.deepEqual(result.roleScopes.minimart.cashierUnits,['PUTRA']);assert.deepEqual(roleIds(result).sort(),['guru_mapel','minimart']);assert.equal(result.password,undefined);
 assert.throws(()=>validateUserDraft({...draft,roleScopes:{minimart:{}}}),/unit kasir/);
});

test('cashier aliases minimart, treasury has no selling permission and no duplicate legacy menus',()=>{assert.equal(canAccess('minimart.pos',['kasir']),true);assert.equal(canAccess('finance.wallets',['kasir']),false);assert.equal(canAccess('finance.wallets',['bendahara']),true);assert.equal(canAccess('minimart.pos',['bendahara']),false);for(const id of ['cashier','finance-products'])assert.equal(MENU_GROUPS.flatMap(g=>g.items).some(i=>i.id===id),false);});
