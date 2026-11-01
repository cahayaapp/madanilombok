// Offline planner only. Input is a scoped finance snapshot, never the whole DB.
// Run while old finance writes are paused. This script never connects to Firebase.
import {readFileSync,writeFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {businessDate,dayNumber,key,money} from '../assets/js/finance-spark/protocol.js';
export function planSparkCutover(finance,now){
 if(!Number.isSafeInteger(now))throw Error('Waktu cutover wajib eksplisit.');
 if(Object.keys(finance.sparkOps||{}).length)throw Error('Protokol baru sudah digunakan; jangan ulang baseline.');
 const patch={},date=businessDate(now),day=dayNumber(now),periods=new Set(),spent={};
 for(const [id,w]of Object.entries(finance.wallets||{})){
  key(id);money(w.spending||0);
  if(w.pinHash&&!/^[a-f0-9]{64}$/.test(w.pinHash))throw Error(`Format PIN perlu diperiksa: ${id}`);
  patch[`wallets/${id}/pinConfigured`]=!!w.pinHash;
 }
 for(const [unit,products]of Object.entries(finance.products||{}))for(const[id,p]of Object.entries(products)){
  key(unit);key(id);money(p.stock);money(p.price);money(p.cost||0);
  if(p.expiryDate){const time=Date.parse(p.expiryDate);if(!/^\d{4}-\d{2}-\d{2}$/.test(p.expiryDate)||!Number.isFinite(time))throw Error(`Kedaluwarsa tidak valid: ${id}`);patch[`products/${unit}/${id}/expiryDay`]=dayNumber(time);}
 }
 for(const[year,students]of Object.entries(finance.bills||{}))for(const[id,bills]of Object.entries(students))for(const[billId,b]of Object.entries(bills)){
  if(b.typeId!=='SPP'&&!/spp/i.test(finance.billingTypes?.[b.typeId]?.name||''))continue;
  key(year);key(id);key(billId);if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(b.period||''))throw Error(`Periode SPP perlu diperiksa: ${billId}`);
  const path=`sparkBillPeriods/${year}/${id}/${b.period}`;
  if(periods.has(path))throw Error(`SPP lama sudah duplikat: ${year}/${id}/${b.period}`);
  periods.add(path);patch[path]=`legacy-${billId}`;
 }
 for(const branch of [finance.cashier_transactions,finance.minimart?.sales])for(const year of Object.values(branch||{}))for(const sale of Object.values(year||{})){
  const saleDate=sale.date||(Number.isSafeInteger(sale.createdAt)?businessDate(sale.createdAt):null);
  if(!saleDate)throw Error('Transaksi lama tanpa tanggal; baseline harus direkonsiliasi.');
  if(saleDate!==date||!sale.studentId)continue;
  key(sale.studentId);const amount=money(sale.walletAmount??(sale.method==='CASH'?0:sale.total));
  spent[sale.studentId]=money((spent[sale.studentId]||0)+amount);
 }
 // Conservative gross spending, including refunded sales: no extra daily allowance.
 for(const[id,total]of Object.entries(spent))patch[`sparkDaily/${id}/${day}`]={spent:total,lastOperationId:'cutover-baseline'};
 return {environment:'OFFLINE PLAN ONLY',date,patch,activationRequired:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
 const[input,output,time]=process.argv.slice(2);if(!input||!output||!time)throw Error('Gunakan INPUT_FINANCE OUTPUT_PLAN ISO_CUTOVER_TIME');
 const plan=planSparkCutover(JSON.parse(readFileSync(input)),Date.parse(time));
 writeFileSync(output,JSON.stringify(plan,null,2)+'\n',{mode:0o600,flag:'wx'});
}
