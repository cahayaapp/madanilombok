import test from 'node:test';
import assert from 'node:assert/strict';
import {COACHING_MENU_ROLES,visibleRoleMenu} from '../assets/js/role-workspace-catalog.js';
import {roleMenuItems,menuVisible} from '../assets/js/menu-layout.js';
import {canAccess} from '../assets/js/permissions.js';
test('all five leadership roles expose the existing coaching workflow in sidebar and catalog',()=>{
 for(const role of COACHING_MENU_ROLES){assert.ok(canAccess('workspace.management-coaching',[role]));assert.ok(roleMenuItems(role).some(i=>i.id==='management-coaching'));assert.equal(menuVisible(role,'sidebar','management-coaching'),true);}
});
test('director menus exclude finance and minimart without removing operational permissions',()=>{
 for(const role of ['director','deputy_director']){
  assert.equal(roleMenuItems(role).some(i=>/^(finance-|minimart-)/.test(i.id)),false);
  for(const id of ['finance-dashboard','finance-bills','minimart-pos','minimart-reports','cashier']){assert.equal(visibleRoleMenu(role,[{id}]).length,0);assert.equal(menuVisible(role,'sidebar',id),false);}
  assert.equal(canAccess('finance.dashboard',[role]),true);
 }
 assert.ok(roleMenuItems('bendahara').some(i=>i.id==='finance-dashboard'));assert.ok(roleMenuItems('minimart').some(i=>i.id==='minimart-pos'));
});
