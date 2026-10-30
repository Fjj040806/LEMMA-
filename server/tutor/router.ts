import {Router} from 'express';import {randomUUID} from 'node:crypto';import {z} from 'zod';
import {attachmentSchema,localeSchema,levelSchema} from '../../src/math/contracts';
import {DEFAULT_MODEL,ServiceError,validateAttachment} from '../model';import {recognize,buildPlan,evaluate,splitTask} from './service';
import {assistance,createSession,getSession,inflight,persist,publicSession} from './store';import {demoPlan,demoSpecs,evaluateDemo} from './demos';
export const tutor=Router();
const budget=new Map<string,{day:string;calls:number}>();
function spend(ip:string){const day=new Date().toISOString().slice(0,10),b=budget.get(ip);if(!b||b.day!==day)budget.set(ip,{day,calls:1});else if(++b.calls>Number(process.env.AI_DAILY_LIMIT||120))throw new ServiceError('daily_limit','今日 AI 请求额度已用完，题目和笔迹仍可保留。',429);}
const handle=(fn:(q:any,r:any)=>Promise<void>)=>async(q:any,r:any)=>{try{await fn(q,r);}catch(e){if(e instanceof ServiceError){r.status(e.status).json({error:e.message,code:e.code});return;}r.status(422).json({error:'本次内容尚未通过校验，题目和草稿已保留。',code:'needs_review'});}};
tutor.get('/config',(_q,r)=>r.json({available:!!process.env.OPENAI_API_KEY,model:process.env.OPENAI_MODEL||DEFAULT_MODEL}));
tutor.get('/examples',(_q,r)=>r.json(demoSpecs.map(d=>({id:d.id,topic:d.topic,level:d.level,problem:d.problem}))));
tutor.post('/recognize',handle(async(q,r)=>{const b=z.object({attachment:attachmentSchema,locale:localeSchema,kind:z.enum(['problem','work']),revision:z.number().int().nonnegative()}).parse(q.body);validateAttachment(b.attachment);spend(q.ip||'local');r.json({recognition:await recognize(b.attachment,b.locale,b.kind),revision:b.revision});}));
tutor.post('/sessions',handle(async(q,r)=>{const b=z.object({problem:z.string().trim().min(2).max(14000),level:levelSchema,locale:localeSchema,guidance:z.enum(['guided','reduced','independent']).default('guided'),demoId:z.string().max(50).optional()}).parse(q.body);let plan,mode:'ai'|'demo';if(b.demoId){plan=demoPlan(b.demoId);mode='demo';}else{spend(q.ip||'local');plan=await buildPlan(b.problem,b.level,b.locale);mode='ai';}const {session,token}=createSession(plan,b.locale,b.guidance,mode);r.json({session:publicSession(session),token});}));
tutor.get('/sessions/:id',handle(async(q,r)=>{const s=getSession(q.params.id,(q.get('authorization')||'').replace(/^Bearer /,''));if(!s)throw new ServiceError('session_expired','学习会话无法恢复，笔迹仍保存在本机。',401);r.json({session:publicSession(s)});}));
tutor.post('/sessions/:id',handle(async(q,r)=>{
 const b=z.object({requestId:z.string().uuid(),action:z.enum(['submit','hint','split','reduce','exit_check','solution','similar','review']),text:z.string().max(14000).default(''),locale:localeSchema}).parse(q.body);
 const s=getSession(q.params.id,(q.get('authorization')||'').replace(/^Bearer /,''));if(!s)throw new ServiceError('session_expired','学习会话无法恢复，笔迹仍保存在本机。',401);
 if(s.derived?.[b.requestId]){const saved=s.derived[b.requestId];const child=getSession(saved.id,saved.token);if(child){r.json({session:publicSession(child),token:saved.token});return;}}
 if(s.cache[b.requestId]){r.json({session:s.cache[b.requestId]});return;}if(inflight.has(s.id))throw new ServiceError('busy','上一请求仍在处理，请稍等。',409);inflight.add(s.id);
 try{s.locale=b.locale;if(s.calls>=Number(process.env.AI_SESSION_LIMIT||40))throw new ServiceError('session_limit','本次学习调用额度已用完，请保留草稿后稍后继续。',429);
 if(s.state==='completed'&&!['similar','review'].includes(b.action)){r.json({session:publicSession(s)});return;}
 if(s.guidance==='independent'&&s.state!=='completed'&&!['submit','exit_check'].includes(b.action))throw new ServiceError('independent_locked','独立检验期间不开放路径、提示或讲解；可主动退出后获得帮助。',403);
 const nodeId=s.plan.nodes[s.index]?.id||'whole';
 if(b.action==='exit_check'){assistance(s,'path_revealed',nodeId);s.guidance='guided';s.state='active';s.unseen=false;}
 if(b.action==='reduce'){s.guidance=s.guidance==='guided'?'reduced':'independent';s.adjustments.push({action:'reduce',reason:'学生主动减少引导，原帮助记录保留',timestamp:new Date().toISOString()});}
 if(b.action==='hint'){const n=s.plan.nodes[s.index];if(!n)throw new ServiceError('no_current_task','请先提交完整解法，或查看完整讲解。',400);const count=s.help.filter(e=>e.type==='ai_hint'&&e.nodeId===nodeId).length;assistance(s,'ai_hint',nodeId);s.hint=n.hints[Math.min(count,n.hints.length-1)];}
 if(b.action==='solution'){assistance(s,'solution_viewed',nodeId);s.solution=s.plan.workedSolution;}
 if(b.action==='split'){if(s.mode==='demo')throw new ServiceError('demo_limit','此离线示例不支持 AI 细分，可使用局部提示；通用细分需配置 API。',422);spend(q.ip||'local');s.calls++;await splitTask(s);s.guidance='guided';}
 if(b.action==='submit'){
  if(!b.text.trim())throw new ServiceError('empty_submission','先写下一点过程，再提交这一步。',400);
  const whole=s.guidance!=='guided'||s.state==='synthesis'||s.index>=s.plan.nodes.length;if(s.mode==='ai'){spend(q.ip||'local');s.calls++;}
  const f=s.mode==='demo'?evaluateDemo(s,b.text,b.requestId,whole):await evaluate(s,b.text,b.requestId,whole);
  s.feedback=f;s.submissions.push({id:b.requestId,nodeId:whole?'whole':nodeId,text:b.text,feedback:f,timestamp:new Date().toISOString()});s.hint=undefined;
  if(whole){if(s.guidance==='independent'&&!s.help.length){s.state='completed';s.outcome=f.status==='correct'?'independent_pass':f.status==='unknown'?'unscored':'independent_not_yet';}else if(f.status==='correct'){s.state='completed';s.outcome='guided_complete';}else s.state=f.needsReview?'needs_review':'active';}
  else if(f.status==='correct'){if(!s.completedNodes.includes(nodeId))s.completedNodes.push(nodeId);s.index++;s.state=s.index>=s.plan.nodes.length?'synthesis':'active';}else s.state=f.needsReview?'needs_review':'active';
 }
 if(b.action==='review'){if(s.state!=='completed')throw new ServiceError('not_completed','先完成或提交当前题，再回看记录。',400);const {session,token}=createSession(structuredClone(s.plan),b.locale,'guided',s.mode,s.id);session.unseen=false;s.derived??={};s.derived[b.requestId]={id:session.id,token};persist();r.json({session:publicSession(session),token});return;}
 if(b.action==='similar'){
  if(s.state!=='completed')throw new ServiceError('not_completed','完成当前题后，再生成相似题用于独立检验。',400);
  if(s.mode==='demo')throw new ServiceError('api_not_configured','相似题生成需要连接 AI。当前题目和过程已保存。');spend(q.ip||'local');s.calls++;
  // New problem and private solution are checked before returning the problem only.
  const plan=await buildPlan(s.plan.problem,s.plan.level,b.locale,s.plan);const {session,token}=createSession(plan,b.locale,'independent','ai',s.id);s.derived??={};s.derived[b.requestId]={id:session.id,token};persist();r.json({session:publicSession(session),token});return;
 }
 const view=publicSession(s);s.cache[b.requestId]=view;if(Object.keys(s.cache).length>80)delete s.cache[Object.keys(s.cache)[0]];persist();r.json({session:view});
 }finally{inflight.delete(s.id);}
}));
