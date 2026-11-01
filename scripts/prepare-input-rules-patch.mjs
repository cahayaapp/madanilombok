// Prepare only; never connects to Firebase or deploys rules.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
export const WORKSPACE_INPUTS=['schedules','messages','writings','teacher_assessments','academic_followups','findings','observations','coaching','standards','targets','systemic','changes','deposits','finding_responses'];
export function prepareInputRulesPatch(live,local){
 const result=structuredClone(live),added=[];
 const target=result.rules.madani_app,source=local.rules.madani_app;
 for(const key of WORKSPACE_INPUTS){
  target.workspaces??={};target.workspaces.$yearId??={};
  if(!Object.hasOwn(target.workspaces.$yearId,key)){
   target.workspaces.$yearId[key]=structuredClone(source.workspaces.$yearId[key]);
   added.push(`workspaces/$yearId/${key}`);
  }
 }
 if(!Object.hasOwn(target,'health')){target.health=structuredClone(source.health);added.push('health');}
 return {rules:result,added};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const [liveFile,outputFile]=process.argv.slice(2);
 if(!liveFile||!outputFile)throw Error('Usage: node scripts/prepare-input-rules-patch.mjs LIVE_RULES OUTPUT_RULES');
 const live=JSON.parse(readFileSync(liveFile)),local=JSON.parse(readFileSync(new URL('../database.rules.json',import.meta.url)));
 const patch=prepareInputRulesPatch(live,local);
 writeFileSync(outputFile,JSON.stringify(patch.rules,null,2)+'\n');
 console.log(JSON.stringify({output:outputFile,added:patch.added},null,2));
}
