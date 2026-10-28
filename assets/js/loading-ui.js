import {escapeHtml} from './utils.js';
export const loadingDots=()=>'<span class="data-loading-dots" aria-hidden="true"><i></i><i></i><i></i></span>';
export function loading(message='Memuat data…',className='loading-card'){
 return `<div class="${className}" role="status" aria-live="polite">${loadingDots()}<span>${escapeHtml(message)}</span></div>`;
}
