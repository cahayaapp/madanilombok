import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {webcrypto} from 'node:crypto';
const require=createRequire(import.meta.url),{JSDOM}=require(process.env.MADANI_JSDOM_MODULE||'jsdom');
const dom=new JSDOM('<main id="host"><div id="mount"></div></main>',{url:'http://127.0.0.1:4179/app/'}),win=dom.window;
const context=vm.createContext({console,document:win.document,window:win,sessionStorage:win.sessionStorage,FormData:win.FormData,Event:win.Event,crypto:webcrypto,Intl,Date,URL,Blob,structuredClone,setTimeout,clearTimeout,confirm:()=>true,prompt:()=> '483729'});
const cache=new Map(),repo=new vm.SyntheticModule(['getNode','listNode','getCurrentAcademicYearId'],function(){for(const n of ['getNode','listNode','getCurrentAcademicYearId'])this.setExport(n,async()=>null);},{context});
function module(url){if(url.endsWith('/repository.js'))return repo;if(!cache.has(url))cache.set(url,new vm.SourceTextModule(readFileSync(fileURLToPath(url),'utf8'),{identifier:url,context}));return cache.get(url);}
const ui=module(new URL('../assets/js/minimart/ui.js',import.meta.url).href);await ui.link((s,p)=>module(new URL(s,p.identifier).href));await ui.evaluate();
const model=module(new URL('../assets/js/minimart/model.js',import.meta.url).href);
const baseState=()=>({uid:'cashier',yearId:'2026',businessDate:'2026-11-01',supervisor:false,units:[{id:'PUTRA',name:'Putra'}],products:[{id:'p',name:'Buku',sku:'B1',barcode:'123',price:17000,cost:10000,stock:2,minStock:1,active:true}],students:[{id:'s',name:'Santri Test',nis:'1'}],wallet:{studentId:'s',spending:100000,pinConfigured:true},sales:[],refunds:[],movements:[],shifts:[],shift:{id:'shift',status:'open',openingCash:0,salesCash:0,refundCash:0,cashIn:0,cashOut:0}});
const el=s=>win.document.querySelector(s),tick=()=>new Promise(r=>setTimeout(r,0));
async function setup(renderer='renderPOS',opts={}){
 win.sessionStorage.clear();win.document.querySelector('#host').innerHTML='<div id="mount"></div>';
 let state=baseState(),calls=[];const ctx={root:el('#mount'),session:{user:{uid:'cashier'},profile:{financeUnit:'PUTRA',name:'Kasir'},activeRole:'minimart'},navigate:()=>{},minimartAPI:{state:async()=>structuredClone(state),execute:async op=>{calls.push(structuredClone(op));if(opts.execute)return opts.execute(op,state);return {id:op.id,reference:'MM-'+op.id,createdAt:Date.now(),cashierUid:'cashier',studentId:op.studentId,items:[{name:'Buku',qty:1,subtotal:17000}],total:17000,discount:0,walletAmount:0,cashAmount:17000,change:3000};}}};
 ctx.rerender=async()=>{const next=win.document.createElement('div');win.document.querySelector('#host').replaceChildren(next);ctx.root=next;await ui.namespace[renderer](ctx);};
 await ui.namespace[renderer](ctx);return {ctx,state,calls};
}
function change(selector,value){const target=el(selector);target.value=value;target.dispatchEvent(new win.Event('input',{bubbles:true}));target.dispatchEvent(new win.Event('change',{bubbles:true}));}
async function cashCart(){el('[data-product=p]').click();change('[name=cashReceived]','20000');}
test('POS cash flow shows total/change, clears cart and renders receipt after root replacement',async()=>{
 const {calls}=await setup();await cashCart();assert.match(el('#mmTotal').textContent,/17.000/);assert.match(el('#mmChange').textContent,/3.000/);
 const form=el('#mmCheckout');await form.onsubmit({preventDefault(){}});assert.equal(calls.length,1);assert.equal(calls[0].method,'CASH');assert.match(el('#mmReceipt').textContent,/MM-/);assert.match(el('#mmCart').textContent,/kosong/);assert.equal(win.sessionStorage.length,0);
});
test('scanner input uses exact barcode; quantity cannot exceed available stock',async()=>{
 await setup();const search=el('#mmSearch');search.value='123';search.dispatchEvent(new win.KeyboardEvent('keydown',{key:'Enter',bubbles:true}));assert.equal(el('[data-qty]').value,'1');change('[data-qty]','3');assert.equal(el('[data-qty]').value,'1');assert.match(el('#mmNotice').textContent,/stok tidak cukup/);
});
test('wallet requires identity confirmation and loaded balance; PIN never persisted',async()=>{
 let captured;await setup('renderPOS',{execute:async op=>{captured=win.sessionStorage.getItem('madani-minimart-pending:cashier');throw Error('Network lost');}});
 el('[data-product=p]').click();change('#mmMethod','WALLET');assert.equal(el('#mmPay').disabled,true);change('#mmStudent','s');await tick();assert.equal(el('#mmPay').disabled,true);el('#mmConfirmStudent').checked=true;change('[name=pin]','483729');assert.equal(el('#mmPay').disabled,false);
 await el('#mmCheckout').onsubmit({preventDefault(){}});assert.ok(captured);assert.ok(!captured.includes('483729'));assert.ok(!Object.hasOwn(JSON.parse(captured),'pin'));assert.ok(el('#mmResume'));assert.equal(el('#mmPay').disabled,true);
});
test('lost response + reload resumes original ID, clears pending, returns original receipt',async()=>{
 let commits=0,saved;const {ctx,calls}=await setup('renderPOS',{execute:async op=>{if(!saved){commits++;saved={id:op.id,reference:'MM-'+op.id,createdAt:Date.now(),cashierUid:'cashier',items:[{name:'Buku',qty:1,subtotal:17000}],total:17000,cashAmount:17000,walletAmount:0,change:3000};throw Error('response lost');}assert.equal(op.id,saved.id);return saved;}});
 await cashCart();await el('#mmCheckout').onsubmit({preventDefault(){}});await ctx.rerender();assert.ok(el('#mmResume'));
 await el('#mmResume').onclick({target:el('#mmResume')});assert.equal(commits,1);assert.equal(calls.length,2);assert.equal(win.sessionStorage.length,0);assert.match(el('#mmReceipt').textContent,/MM-/);
});
test('definitive rejection keeps cart, unlocks payment and clears pending ID',async()=>{
 await setup('renderPOS',{execute:async()=>{const err=Error('Stok berubah');err.definitive=true;throw err;}});await cashCart();await el('#mmCheckout').onsubmit({preventDefault(){}});assert.equal(win.sessionStorage.length,0);assert.equal(el('#mmPay').disabled,false);assert.ok(el('[data-qty]'));assert.match(el('#mmNotice').textContent,/Stok berubah/);
});
test('product, inventory, history, report and shift screens render permitted operations',async()=>{
 for(const renderer of ['renderProducts','renderInventory','renderHistory','renderReports','renderShift']){await setup(renderer);assert.ok(el('#mmWorkspace').textContent.trim());assert.equal(el('#mmAdjust'),null);}
});
test('reports separate cash, wallet, discounts and gross profit; refunds counted on event date',()=>{
 const state=baseState();state.sales=[{date:'2026-11-01',total:24000,discount:1000,cashAmount:14000,walletAmount:10000,items:[{productId:'p',name:'Buku',qty:1,cost:10000,subtotal:25000}],status:'void'}];state.refunds=[{createdAt:Date.parse('2026-11-02T04:00:00Z'),cashRefund:14000,walletRefund:10000,returnedCost:10000}];
 const first=model.namespace.report(state,'2026-11-01','2026-11-01');assert.equal(first.revenue,24000);assert.equal(first.cash,14000);assert.equal(first.wallet,10000);assert.equal(first.profit,14000);
 const whole=model.namespace.report(state,'2026-11-01','2026-11-02');assert.equal(whole.net,0);assert.equal(whole.cash,0);assert.equal(whole.profit,0);
 assert.match(model.namespace.csv([['=1+2','normal']]),/"'=1\+2"/);
});
test('auth/network denial preserves pending operation until original outcome can be recovered',async()=>{
 await setup('renderPOS',{execute:async()=>{const error=Error('Login diperlukan');error.definitive=false;throw error;}});await cashCart();await el('#mmCheckout').onsubmit({preventDefault(){}});assert.ok(win.sessionStorage.getItem('madani-minimart-pending:cashier'));assert.ok(el('#mmResume'));assert.equal(el('#mmPay').disabled,true);
});

test('minimart home opens dedicated POS and category filter preserves cart',async()=>{
 await setup('renderMinimartHome');assert.ok(el('#mmCheckout'));assert.equal(el('.premium-home'),null);assert.equal(win.document.querySelectorAll('[data-mm-route]').length,6);
 el('[data-category="Lainnya"]').click();assert.equal(el('[data-category="Lainnya"]').getAttribute('aria-pressed'),'true');el('[data-product=p]').click();change('#mmSearch','missing');assert.equal(el('[data-product=p]'),null);assert.equal(el('#mmItemCount').textContent,'1 item');
});

test('legacy sales without cost never present unknown gross profit as profit',()=>{const state=baseState();state.sales=[{date:'2026-11-01',total:17000,walletAmount:17000,costUnknown:true,items:[{productId:'p',name:'Buku',qty:1,subtotal:17000,cost:0}]}];const r=model.namespace.report(state,'2026-11-01','2026-11-01');assert.equal(r.revenue,17000);assert.equal(r.profit,null);});
