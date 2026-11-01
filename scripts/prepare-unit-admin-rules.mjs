// Add the user-approved administrative authority to a rules snapshot, never to finance.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {ADMIN_ACCESS_ROLES} from '../assets/js/admin-access.js';
export const ADMIN_DATA_BRANCHES=['academic_years','units','students','staff','classes','dormitories','rooms','groups','subjects','programs','assignments','schedules','settings','seed_validation','reference'];
export function adminRoleExpression(snapshot){
 const direct=ADMIN_ACCESS_ROLES.flatMap(role=>[`${snapshot}.child('role').val() === '${role}'`,`${snapshot}.child('roleFlags/${role}').val() === true`,`${snapshot}.child('roles/${role}').val() === true`]);
 // Legacy role arrays are supported by login; current editors also write roleFlags.
 const arrays=Array.from({length:17},(_,i)=>ADMIN_ACCESS_ROLES.map(role=>`${snapshot}.child('roles/${i}').val() === '${role}'`).join(' || '));
 return '('+[...direct,...arrays].join(' || ')+')';
}
export function prepareUnitAdminRules(input){
 const result=structuredClone(input),root=result.rules.madani_app,changes=[];
 const actor="root.child('madani_app/users').child(auth.uid)";
 const enabled=`(auth != null && ${actor}.exists() && ${actor}.child('active').val() !== false && ${actor}.child('accessRevoked').val() !== true && ${adminRoleExpression(actor)})`;
 const add=(node,key,grant,path)=>{const previous=node[key];if(typeof previous==='string'&&previous.includes(grant))return;node[key]=previous===undefined?grant:key==='.validate'?`(${grant}) || (${String(previous)})`:`(${String(previous)}) || (${grant})`;changes.push(path+'/'+key);};
 for(const key of ADMIN_DATA_BRANCHES){root[key]??={};add(root[key],'.write',enabled,key);}
 root.academic??={};root.academic.quran_placements??={};add(root.academic.quran_placements,'.write',enabled,'academic/quran_placements');
 const users=root.users.$uid;
 add(users,'.write',`${enabled} && newData.exists() && (auth.uid !== $uid || (newData.child('active').val() !== false && newData.child('accessRevoked').val() !== true && ${adminRoleExpression('newData')}))`,'users/$uid');
 add(users,'.validate',enabled,'users/$uid');
 const validateChildren=(node,path)=>{for(const [key,value] of Object.entries(node)){if(key==='.validate'&&typeof value==='string'&&value.includes("roleFlags/admin"))add(node,key,enabled,path);else if(value&&typeof value==='object')validateChildren(value,path+'/'+key);}};
 for(const [key,value] of Object.entries(users))if(value&&typeof value==='object')validateChildren(value,'users/$uid/'+key);
 return {rules:result,changes};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('Usage: node scripts/prepare-unit-admin-rules.mjs INPUT OUTPUT');
 const result=prepareUnitAdminRules(JSON.parse(readFileSync(input)));
 writeFileSync(output,JSON.stringify(result.rules,null,2)+'\n');console.log(JSON.stringify(result.changes,null,2));
}
