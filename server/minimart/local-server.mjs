import http from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import {resolve, extname, sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getDatabase} from 'firebase-admin/database';
import {assertEmulatorEnvironment, createEmulatorMinimartService} from './firebase-service.mjs';
assertEmulatorEnvironment(process.env);
const app = initializeApp({projectId:process.env.GCLOUD_PROJECT,databaseURL:`https://${process.env.GCLOUD_PROJECT}-default-rtdb.firebaseio.com`});
const execute = createEmulatorMinimartService({auth:getAuth(app),db:getDatabase(app)});
const root = resolve(fileURLToPath(new URL('../../',import.meta.url)));
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json','.woff2':'font/woff2'};
const send=(res,status,value)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(value));};
const server=http.createServer(async(req,res)=>{
 try {
  if (!['127.0.0.1:4179','localhost:4179'].includes(req.headers.host)) return send(res,403,{error:'Origin ditolak.'});
  const url=new URL(req.url,'http://127.0.0.1:4179');
  if(url.pathname.startsWith('/api/minimart/')){
   if(req.method!=='POST')return send(res,405,{error:'Gunakan POST.'});
   if(req.headers.origin && !['http://127.0.0.1:4179','http://localhost:4179'].includes(req.headers.origin))return send(res,403,{error:'Origin ditolak.'});
   let raw=''; for await(const chunk of req){raw+=chunk; if(Buffer.byteLength(raw)>65536)return send(res,413,{error:'Permintaan terlalu besar.'});}
   const body=JSON.parse(raw || '{}'),idToken=req.headers.authorization?.replace(/^Bearer /,'');
   if(url.pathname.endsWith('/parent'))return send(res,200,await execute.parent({idToken,studentId:body.studentId}));
   if(url.pathname.endsWith('/state'))return send(res,200,await execute.state({idToken,unitId:body.unitId,studentId:body.studentId}));
   if(url.pathname.endsWith('/execute'))return send(res,200,await execute({idToken,operation:body.operation}));
   return send(res,404,{error:'Endpoint tidak tersedia.'});
  }
  if(req.method!=='GET'&&req.method!=='HEAD')return send(res,405,{error:'Metode tidak tersedia.'});
  let path=decodeURIComponent(url.pathname); if(path.endsWith('/'))path+='index.html';
  if(!/^\/(index\.html|manifest\.(json|webmanifest)|app\/|assets\/|config\/firebase-config\.js)/.test(path) || path.includes('..') || path.includes('/.'))return send(res,404,{error:'Tidak ditemukan.'});
  const file=await realpath(resolve(root,`.${path}`));
  if(!file.startsWith(root+sep))return send(res,404,{error:'Tidak ditemukan.'});
  const data=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});res.end(req.method==='HEAD'?undefined:data);
 }catch(error){
  // Never log requests, PINs or Auth tokens. Domain failures are definitive;
  // transport/server failures remain retryable with the same operation ID.
  const internal=/ECONN|ETIMEDOUT|ENOTFOUND|disconnect|network/i.test(error.message);
  send(res,internal?503:400,{error:internal?'Backend belum tersedia. Ulangi dengan ID yang sama.':error.message});
 }
});
server.requestTimeout=25000;
server.listen(4179,'127.0.0.1',()=>console.log('Madani Minimart lokal: http://127.0.0.1:4179'));
const stop=()=>server.close(()=>process.exit(0));process.on('SIGTERM',stop);process.on('SIGINT',stop);
setTimeout(stop,2*60*60*1000).unref();
