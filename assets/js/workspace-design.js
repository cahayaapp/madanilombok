// Visual enhancement only: preserve existing form controls, handlers and role checks.
const reviewed=new Set(['quran','quran-ziyadah','quran-murojaah','teacher-leave','mentee-list','mentoring','mentoring-targets','mentoring-history','mentoring-guide','teacher-writing','teacher-self','naqib-duty','schedule']);
export function decorateWorkspace(ctx,route){
 if(['dashboard','parent-home'].includes(route)||reviewed.has(route)||ctx.root.matches('.guru-wali-premium,.counselor-workspace')||ctx.root.querySelector('.workflow-studio,.case-report-page,.writing-studio,.teacher-leave-page,.leave-review-page'))return;
 ctx.root.classList.add('workspace-refresh');
 ctx.root.dataset.workspaceFamily=route.startsWith('finance-')||route==='cashier'?'finance':route.startsWith('parent-')?'parent':route.startsWith('health-')?'health':route.startsWith('management-')?'leadership':'learning';
 const header=ctx.root.querySelector('.portal-section-head,.teacher-header,.workspace-page-head,.profile-page>header');
 if(!header)return;
 header.classList.add('workspace-refresh-hero');
 const existingBack=ctx.root.querySelector('.teacher-back,.naqib-home-back,[data-mentor-home],[data-workspace-home]');
 if(!existingBack){
  const back=document.createElement('button');back.type='button';back.className='workspace-home-link';back.dataset.workspaceHome='';back.textContent='← Beranda';back.onclick=()=>ctx.navigate('dashboard');header.before(back);
 }
}
