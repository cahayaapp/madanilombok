import {MENU_GROUPS,featuresForRoles} from './permissions.js';
import {visibleRoleMenu} from './role-workspace-catalog.js';
import {ROLE_EXPERIENCE} from './role-experience.js';
import {menuSettings} from './feature-switches.js';
export function roleMenuItems(role){
 const grants=featuresForRoles([role]);
 const items=visibleRoleMenu(role,MENU_GROUPS.flatMap(g=>g.items)).filter(i=>grants.has(i.feature||'dashboard'));
 if(grants.has('academic.quran'))items.push({id:'quran-ziyadah',label:'Ziyadah',feature:'academic.quran'},{id:'quran-murojaah',label:'Muroja’ah',feature:'academic.quran'});
 return [...new Map(items.map(i=>[i.id,i])).values()];
}
export function defaultQuick(role){return role==='mentor_tahsin_tahfiz'?['quran-ziyadah','quran-murojaah','teacher-attendance','student-attendance']:ROLE_EXPERIENCE[role]?.quick||[];}
export function menuSelection(role,section,fallback){
 const saved=menuSettings(role)?.[section];
 return Array.isArray(saved)?saved:saved&&typeof saved==='object'?Object.keys(saved).filter(k=>saved[k]===true):fallback;
}
export function menuVisible(role,section,id){const selected=menuSelection(role,section,null);return selected===null||selected.includes(id);}
export function configuredBottom(role,defaults,canRoute){
 const config=menuSettings(role)?.bottom;
 if(!config)return defaults;
 return {...defaults,...Object.fromEntries(['schedule','messages','profile'].map(slot=>[slot,canRoute(config[slot])?config[slot]:null])),home:'dashboard'};
}
