import 'dotenv/config';import release from '../release.json';
import express from 'express';import {tutor} from './tutor/router';import {randomBytes} from 'node:crypto';
import {z} from 'zod';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {createTeachingPlan,evaluateCurrentStep,generateFeedback,proposeAdjustment} from './ai';
import {emptyStore,start,getNode,requestHelp,submit,reduce,split} from '../src/domain/engine';
import {byId} from '../src/content/items';
const app=express();app.disable('x-powered-by');app.use(express.json({limit:'10mb'}));
app.use((_q,r,n)=>{r.setHeader('X-Content-Type-Options','nosniff');r.setHeader('Referrer-Policy','same-origin');n();});
const db=emptyStore(),sessions=new Map<string,{token:string;calls:number;created:number;plan:unknown;locale:string;cache:Map<string,unknown>}>();
const rates=new Map<string,{at:number;n:number}>();
app.use('/api', (req,res,next)=>{const key=req.ip||'local',t=Date.now(),r=rates.get(key);if(!r||t-r.at>60000)rates.set(key,{at:t,n:1});else if(++r.n>50){res.status(429).json({error:'请求太频繁，请稍后再试。'});return;}if(rates.size>10000)rates.clear();const origin=req.get('origin');if(origin&&new URL(origin).host!==req.get('host')){res.status(403).json({error:'不允许跨站请求'});return;}next();});
app.use('/api/tutor',tutor);
app.get('/api/version',(_q,r)=>r.set('Cache-Control','no-store').json(release));
app.get('/api/config',(_q,r)=>r.json({available:!!process.env.OPENAI_API_KEY}));
app.post('/api/attempts',async(req,res)=>{try{const body=z.object({itemId:z.string().max(40),guidance:z.enum(['guided','reduced','independent']),locale:z.enum(['zh-CN','zh-TW','en','fr','es','ja','ru']).default('zh-CN')}).parse(req.body);byId(body.itemId);if(!process.env.OPENAI_API_KEY){res.status(503).json({error:'未配置 API 密钥，已保留输入；可继续演示模式。'});return;}if(db.attempts.length>=1000){res.status(429).json({error:'本机服务会话容量已满，请重启服务。'});return;}const a=start(db,body.itemId,body.guidance,'ai');let plan:unknown=byId(body.itemId).solutionStructure,fallback=false;if(body.guidance!=='independent')try{plan=await createTeachingPlan(body.itemId);}catch{fallback=true;}const token=randomBytes(24).toString('hex');sessions.set(a.id,{token,calls:1,created:Date.now(),plan,locale:body.locale,cache:new Map()});res.json({id:a.id,token,fallback,current:body.guidance==='independent'?null:{id:getNode(a).id,goal:getNode(a).goal,studentTask:getNode(a).studentTask}});}catch{res.status(400).json({error:'请求无效或检验题已曝光。'});}});
const input=z.object({locale:z.enum(['zh-CN','zh-TW','en','fr','es','ja','ru']).optional(),requestId:z.string().uuid(),values:z.record(z.string().max(30),z.string().max(1000)).refine(v=>Object.keys(v).length<=15),action:z.enum(['evaluate','feedback','adjust','reduce','split','exit_check'])});
app.post('/api/attempts/:id',async(req,res)=>{try{const s=sessions.get(req.params.id),a=db.attempts.find(a=>a.id===req.params.id);if(!s||!a||req.get('authorization')!==`Bearer ${s.token}`||Date.now()-s.created>86400000){res.status(401).json({error:'服务端会话失效，输入已保留。请使用演示模式继续。'});return;}const b=input.parse(req.body);if(b.locale)s.locale=b.locale;if(s.cache.has(b.requestId)){res.json(s.cache.get(b.requestId));return;}if(s.calls++>=Number(process.env.AI_SESSION_LIMIT||24)){res.status(429).json({error:'本次 AI 调用额度已用完，可继续演示模式。'});return;}
 if(b.action==='exit_check'){requestHelp(a);const result={ok:true};s.cache.set(b.requestId,result);res.json(result);return;}
 const independent=a.state==='independent_check'||a.guidance==='independent';if(independent&&b.action!=='evaluate'){res.status(403).json({error:'独立作答阶段不开放提示、计划或反馈接口。'});return;}
 if(b.action==='reduce'){reduce(a);const r={ok:true};s.cache.set(b.requestId,r);res.json(r);return;}
 if(b.action==='split'){split(a);const r={ok:true};s.cache.set(b.requestId,r);res.json(r);return;}
 const node=independent||a.guidance==='reduced'||a.state==='synthesis'?'answer':getNode(a)?.id||'answer';a.draft=b.values;
 if(b.action==='adjust'){let r;try{r=await proposeAdjustment(a,node,b.values.request||'split',s.locale);}catch{r={fallback:true,studentMessage:'AI 调整建议暂不可用，使用已审核的规则拆解。'};}s.cache.set(b.requestId,r);res.json(r);return;}
 const g=evaluateCurrentStep(a.itemId,node,b.values);let feedback:unknown=null,fallback=false;
 // No real-time feedback for independent checks: one final submit completes server attempt.
 if(!independent)try{feedback=await generateFeedback(a,node,b.values,g,s.locale);}catch{fallback=true;}
 if(b.action==='evaluate')submit(db,a,b.requestId);const result={grade:g,feedback,fallback,state:a.state,outcome:a.outcome,current:a.guidance==='independent'||a.state==='completed'||a.state==='synthesis'?null:{id:getNode(a)?.id,goal:getNode(a)?.goal,studentTask:getNode(a)?.studentTask}};s.cache.set(b.requestId,result);res.json(result);
 }catch{res.status(400).json({error:'请求格式无效；原始作答仍保留。'});}});
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
if(process.env.NODE_ENV==='production'){app.use(express.static(path.join(root,'dist'),{maxAge:0,setHeaders:r=>r.setHeader('Cache-Control','no-store')}));app.get('/{*path}',(_q,r)=>r.sendFile(path.join(root,'dist/index.html')));}else{const {createServer}=await import('vite');const vite=await createServer({root,server:{middlewareMode:true},appType:'spa'});app.use(vite.middlewares);}
app.use((err:unknown,_q:express.Request,r:express.Response,_n:express.NextFunction)=>r.status(400).json({error:'请求无法读取。'}));
const portIndex=process.argv.indexOf('--port');const port=Number(process.env.PORT||(portIndex>=0?process.argv[portIndex+1]:3000));
app.listen(port,'0.0.0.0',()=>console.log('LEMMA ready on port '+port));
