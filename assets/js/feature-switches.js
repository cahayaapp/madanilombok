// Switches can restrict an existing role grant, never expand one.
let switches={};
export const featureKey=feature=>feature.replaceAll('.','~');
export function protectedFeature(feature){return feature==='dashboard'||feature.startsWith('workspace.admin-')||feature.startsWith('finance.')||feature==='parent.finance'||['workspace.work-profile','workspace.work-guide','workspace.deposit-admin','workspace.parent-deposits'].includes(feature);}
export function setFeatureSwitches(value){switches=value&&typeof value==='object'?value:{};}
export function featureEnabled(feature,role){return protectedFeature(feature)||switches[role]?.[featureKey(feature)]!==false;}
export function menuSettings(role){return switches[role]?._menus||{};}
