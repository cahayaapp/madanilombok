export const stockStatus=p=>p.stock<=0?'Stok Habis':p.stock<=p.minStock?'Stok Menipis':'Stok Aman';
export function totals(items,products,discount=0){
 const subtotal=items.reduce((sum,i)=>sum+(products.find(p=>p.id===i.productId)?.price||0)*i.qty,0);
 return {subtotal,total:Math.max(0,subtotal-discount)};
}
export function report(state,from,to){
 const within=date=>date>=from&&date<=to;
 const sales=state.sales.filter(s=>within(s.date)),refunds=state.refunds.filter(r=>within(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Makassar',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(r.createdAt))));
 const sum=(rows,field)=>rows.reduce((n,r)=>n+(r[field]||0),0);
 const revenue=sum(sales,'total'),cash=sum(sales,'cashAmount'),wallet=sum(sales,'walletAmount'),refund=sum(refunds,'cashRefund')+sum(refunds,'walletRefund');
 const cost=sales.reduce((n,s)=>n+s.items.reduce((m,i)=>m+(i.cost||0)*i.qty,0),0)-sum(refunds,'returnedCost');
 const products={};for(const s of sales)for(const i of s.items){const p=products[i.productId]||={name:i.name,qty:0,sales:0};p.qty+=i.qty;p.sales+=i.subtotal;}
 const days={},months={};for(const s of sales){days[s.date]=(days[s.date]||0)+s.total;const month=s.date.slice(0,7);months[month]=(months[month]||0)+s.total;}
 return {sales,refunds,revenue,refund,net:revenue-refund,cash:cash-sum(refunds,'cashRefund'),wallet:wallet-sum(refunds,'walletRefund'),discount:sum(sales,'discount'),cost,profit:revenue-refund-cost,products:Object.values(products).sort((a,b)=>b.qty-a.qty),days,months};
}
export function csv(rows){return '\uFEFF'+rows.map(row=>row.map(value=>{let s=String(value??'');if(/^(\s*[=+@-]|[\t\r])/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}).join(',')).join('\r\n');}
