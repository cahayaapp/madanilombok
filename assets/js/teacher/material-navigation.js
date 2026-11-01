// A route handoff must work even when browser storage is unavailable (file previews).
let pendingMode='target';
export function setMaterialMode(mode){pendingMode=['target','report','history'].includes(mode)?mode:'target';}
export function consumeMaterialMode(){const mode=pendingMode;pendingMode='target';return mode;}
