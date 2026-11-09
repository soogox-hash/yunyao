import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('.', import.meta.url)));
const port = Number(process.env.PORT || 4173);
const storeDir = resolve(root, '.preview-data');
const storeFile = resolve(storeDir, 'service-data.json');
const types = {'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.woff2':'font/woff2','.pdf':'application/pdf','.png':'image/png','.jpg':'image/jpeg'};
let serviceData = { accounts:{}, appeals:[] };
try { serviceData = {...serviceData, ...JSON.parse(await readFile(storeFile, 'utf8'))}; } catch {}
let writeQueue = Promise.resolve();
function persist(){writeQueue=writeQueue.then(async()=>{await mkdir(storeDir,{recursive:true});await writeFile(storeFile,JSON.stringify(serviceData,null,2),'utf8');});return writeQueue;}
function json(response,status,value){response.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(JSON.stringify(value));}
async function readBody(request,maxBytes=5_000_000){let text='',size=0;for await(const chunk of request){size+=chunk.length;if(size>maxBytes)throw new Error('request_too_large');text+=chunk;}return text?JSON.parse(text):{};}
function accountId(value){return /^\d{5}$/.test(String(value||''))||value==='88888'?String(value):null;}
function heading(a,b){const rad=Math.PI/180,y=Math.sin((b.longitude-a.longitude)*rad)*Math.cos(b.latitude*rad),x=Math.cos(a.latitude*rad)*Math.sin(b.latitude*rad)-Math.sin(a.latitude*rad)*Math.cos(b.latitude*rad)*Math.cos((b.longitude-a.longitude)*rad);return (Math.atan2(y,x)*180/Math.PI+360)%360;}
async function mapMatch(points){const key=process.env.AMAP_WEB_KEY;if(!key)throw new Error('amap_key_not_configured');if(!Array.isArray(points)||points.length<2)throw new Error('track_too_short');const matched=[];for(let offset=0;offset<points.length;offset+=499){const batch=points.slice(offset,offset+500);if(batch.length<2)continue;const base=Number(batch[0].timestamp)||Date.now(),body=batch.map((point,index)=>{const next=batch[index+1]||point,prev=batch[index-1]||point;return{x:Number(point.longitude),y:Number(point.latitude),ag:heading(prev,next),tm:index===0?Math.floor(base/1000):Math.max(1,Math.floor((Number(point.timestamp)-base)/1000)),sp:Number(point.speed)?Number(point.speed)*3.6:0};});const url=new URL('https://restapi.amap.com/v4/grasproad/driving');url.searchParams.set('key',key);const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(20000)});if(!response.ok)throw new Error('amap_http_'+response.status);const result=await response.json();const list=result?.data?.points||result?.data?.path||result?.points;if(!Array.isArray(list)||!list.length)throw new Error(result?.errmsg||result?.errdetail||'amap_match_failed');for(const point of list){const longitude=Number(point.x??point.longitude),latitude=Number(point.y??point.latitude);if(Number.isFinite(longitude)&&Number.isFinite(latitude))matched.push({longitude,latitude});}}return matched;}

createServer(async(request,response)=>{
  const url=new URL(request.url,'http://localhost'),pathname=decodeURIComponent(url.pathname);
  try{
    if(pathname==='/api/health'&&request.method==='GET')return json(response,200,{ok:true,mode:'local-preview',mapMatchConfigured:Boolean(process.env.AMAP_WEB_KEY),cloudDeployment:false});
    if(pathname==='/api/sync'&&request.method==='GET'){const id=accountId(url.searchParams.get('accountId'));if(!id)return json(response,400,{error:'invalid_account_id'});const stored=serviceData.accounts[id]||null;return json(response,200,{accountId:id,updatedAt:stored?.updatedAt||null,data:stored?.data||null,mode:'local-preview'});}
    if(pathname==='/api/sync'&&request.method==='PUT'){const body=await readBody(request),id=accountId(body.accountId);if(!id||!body.data||typeof body.data!=='object')return json(response,400,{error:'invalid_sync_payload'});serviceData.accounts[id]={data:body.data,updatedAt:new Date().toISOString()};await persist();return json(response,200,{ok:true,accountId:id,updatedAt:serviceData.accounts[id].updatedAt,mode:'local-preview'});}
    if(pathname==='/api/appeals'&&request.method==='GET'){const id=accountId(url.searchParams.get('accountId'));if(!id)return json(response,400,{error:'invalid_account_id'});return json(response,200,{appeals:serviceData.appeals.filter(item=>item.accountId===id)});}
    if(pathname==='/api/appeals'&&request.method==='POST'){const body=await readBody(request),id=accountId(body.accountId);if(!id||!body.rideId||!Array.isArray(body.track)||body.track.length<2||!String(body.reason||'').trim())return json(response,400,{error:'appeal_requires_account_record_reason_and_track'});if(serviceData.appeals.some(item=>item.accountId===id&&item.rideId===body.rideId))return json(response,409,{error:'appeal_already_submitted'});const appeal={id:'appeal-'+Date.now(),accountId:id,rideId:String(body.rideId),reason:String(body.reason).slice(0,500),note:String(body.note||'').slice(0,1000),track:body.track.slice(0,5000),distance:Number(body.distance)||0,submittedAt:new Date().toISOString(),status:'待人工复核'};serviceData.appeals.unshift(appeal);await persist();return json(response,201,{ok:true,appeal:{...appeal,track:undefined},mode:'local-preview'});}
    if(pathname==='/api/map-match'&&request.method==='POST'){const body=await readBody(request,2_000_000);try{return json(response,200,{ok:true,points:await mapMatch(body.points)});}catch(error){const status=error.message==='amap_key_not_configured'?503:422;return json(response,status,{error:error.message});}}
    if(request.method!=='GET'&&request.method!=='HEAD')return json(response,405,{error:'method_not_allowed'});
    const relative=pathname==='/'?'index.html':pathname.replace(/^\/+/,''),target=resolve(root,relative);
    if(target!==root&&!target.startsWith(root+sep)||relative.startsWith('.preview-data'))return response.writeHead(403).end('Forbidden');
    try{const data=await readFile(target);response.writeHead(200,{'Content-Type':types[extname(target)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});response.end(data);}catch{response.writeHead(404).end('Not found');}
  }catch(error){json(response,error.message==='request_too_large'?413:400,{error:error.message||'bad_request'});}
}).listen(port,'0.0.0.0',()=>console.log(`云遥骑行预览服务：http://0.0.0.0:${port}/`));
