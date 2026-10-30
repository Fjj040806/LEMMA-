import type {Attempt,Guidance,HelpType,Store} from './types';
import {byId,items} from '../content/items';import {grade} from './grading';
export const uid=():string=>{if(globalThis.crypto?.randomUUID)return globalThis.crypto.randomUUID();const b=new Uint8Array(16);globalThis.crypto.getRandomValues(b);b[6]=(b[6]&15)|64;b[8]=(b[8]&63)|128;const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};const now=()=>new Date().toISOString();
export function emptyStore():Store{return {schemaVersion:1,sessions:[],attempts:[],learningPlans:{},itemExposure:{},assessmentResults:[],exampleViewed:false};}
export function expose(s:Store,id:string,reason:string){s.itemExposure[id]=[...new Set([...(s.itemExposure[id]||[]),reason])];}
export function help(a:Attempt,type:HelpType,nodeId:string,level=0,contentId=type+':'+nodeId+':'+level){if(a.assistanceEvents.some(e=>e.contentId===contentId&&e.assistanceType===type))return;a.assistanceEvents.push({eventId:uid(),attemptId:a.id,itemId:a.itemId,nodeId,assistanceType:type,hintLevel:level,contentId,timestamp:now()});}
export function start(s:Store,itemId:string,guidance:Guidance,mode:'demo'|'ai'='demo'):Attempt{
 const item=byId(itemId);if(item.split==='check'&&s.itemExposure[itemId]?.length)throw Error('这道题已经展示过，不能作为未见题重新检验。');
 const a:Attempt={id:uid(),itemId,mode,state:item.split==='check'?'independent_check':guidance==='independent'?'attempting':'awaiting_step',guidance,initialGuidance:guidance,nodeIndex:0,split:false,splitIndex:0,draft:{},submittedSteps:[],nodeProgress:[],planAdjustments:[],assistanceEvents:[],createdAt:now(),feedback:'',hintLevel:0};
 if(guidance!=='independent')help(a,'path_revealed','setup');if(s.exampleViewed&&item.split!=='check')help(a,'worked_example_viewed','example',4,'prior-example');s.attempts.push(a);s.activeId=a.id;s.sessions.push({id:a.id,timestamp:now()});s.learningPlans[a.id]=item.solutionStructure;expose(s,itemId,'attempt');return a;
}
export function availableCheck(s:Store){return items.find(i=>i.split==='check'&&!s.itemExposure[i.id]?.length);}
export function finish(s:Store,a:Attempt,passed:boolean){if(a.outcome)return;const assisted=a.assistanceEvents.length>0;a.outcome=passed?(assisted?(a.assistanceEvents.some(e=>e.assistanceType==='solution_viewed'||e.assistanceType==='worked_example_viewed')?'assisted_complete':'guided_complete'):'independent_pass'):(byId(a.itemId).split==='check'?'independent_not_yet':'unscored');a.state='completed';a.completedAt=now();s.assessmentResults.push({attemptId:a.id,outcome:a.outcome,timestamp:now()});}
export function getNode(a:Attempt){return byId(a.itemId).solutionStructure.nodes[a.nodeIndex];}
export function submit(s:Store,a:Attempt,submissionId:string=uid()){
 if(a.outcome||a.submittedSteps.some(x=>x.id===submissionId))return;
 const item=byId(a.itemId);const whole=a.guidance==='reduced'||a.guidance==='independent'||a.state==='synthesis'||a.state==='independent_check'||a.state==='attempting';const node=whole?'answer':getNode(a).id;
 const g=grade(item,node,a.draft,submissionId);a.submittedSteps.push({id:submissionId,nodeId:node,values:{...a.draft},grade:g,timestamp:now()});a.feedback=g.shortReason;
 if(a.state==='independent_check'){finish(s,a,g.status==='correct');return;}
 if(g.status!=='correct'){a.state=g.needsReview?'needs_review':a.state;return;}
 if(whole){if(a.state==='synthesis'||a.draft.verify==='differentiate'){if(grade(item,'verify',a.draft).status!=='correct'){a.feedback='原函数已确认。再选择验证方式和关键选择的理由，连接完整解法。';a.state='synthesis';return;}finish(s,a,true);return;}a.state='synthesis';return;}
 if(!a.nodeProgress.includes(node))a.nodeProgress.push(node);a.nodeIndex++;a.split=false;a.splitIndex=0;a.hintLevel=0;a.seenHint=undefined;a.draft={};a.state=a.nodeIndex>=item.solutionStructure.nodes.length?'synthesis':'awaiting_step';
}
export function split(a:Attempt){if(a.guidance==='independent')return;const node=getNode(a);if(!node?.subdivisionOptions.length)return;a.guidance='guided';help(a,'substep_revealed',node.id,2);a.split=true;a.planAdjustments.push({reason:'学生明确请求更小的任务',action:'split_step',timestamp:now()});}
export function reduce(a:Attempt){a.guidance=a.guidance==='guided'?'reduced':'independent';a.split=false;a.planAdjustments.push({reason:'学生主动要求独立继续；此前帮助保持记录',action:a.guidance==='reduced'?'merge_steps':'hide_path',timestamp:now()});a.feedback='接下来由你组织。之前获得的帮助仍会保留在本次记录中。';}
export function requestHelp(a:Attempt){if(a.state==='independent_check'||a.guidance==='independent'){help(a,'path_revealed','setup');a.guidance='guided';a.state='awaiting_step';a.nodeIndex=0;a.feedback='已退出无提示检验，当前尝试转为引导式学习。已有作答和帮助记录保留。';}}
