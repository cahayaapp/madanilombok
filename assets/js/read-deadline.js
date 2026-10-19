export async function withReadDeadline(task,ms=15000){
 let timer;
 try{return await Promise.race([Promise.resolve(task),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Data belum dapat dimuat dalam 15 detik. Periksa koneksi lalu coba lagi.')),ms);})]);}
 finally{clearTimeout(timer);}
}
