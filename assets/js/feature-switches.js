// Switches can restrict an existing role grant, never expand one.
let switches={};
export const featureKey=feature=>feature.replaceAll('.','~');
export function protectedFeature(feature){return feature==='dashboard'||feature.startsWith('workspace.admin-')||feature.startsWith('finance.')||feature==='parent.finance'||['workspace.work-profile','workspace.work-guide','workspace.deposit-admin','workspace.parent-deposits'].includes(feature);}
export function setFeatureSwitches(value){switches=value&&typeof value==='object'?value:{};}
export function featureEnabled(feature,role){return protectedFeature(feature)||switches[role]?.[featureKey(feature)]!==false;}
// Old saved placements list only routes that existed when the admin saved them.
// Upgrade counselor placements in memory; explicit feature-disable flags remain authoritative.
export function normalizeMenuSettings(role,config={}){
 if(role!=='konselor'||config.counselorVersion>=2)return config;
 const primary=['case-inbox','counseling-book','violation-evaluation','warning-letter'];
 const supporting=['work-profile','counselor-guide','education-calendar'];
 const hasNewRoutes=['quick','other','sidebar'].some(section=>{
  const value=config[section];return Array.isArray(value)?value.includes('counseling-book')||value.includes('violation-evaluation'):value&&['counseling-book','violation-evaluation'].some(id=>Object.hasOwn(value,id));
 });
 if(hasNewRoutes)return config;
 const selected=ids=>Object.fromEntries(ids.map(id=>[id,true]));
 return {...config,counselorVersion:2,quick:selected(primary),other:selected(supporting),sidebar:selected(['dashboard',...primary,...supporting])};
}
export function menuSettings(role){return normalizeMenuSettings(role,switches[role]?._menus||{});}
