import {z} from 'zod';
export const localeSchema=z.enum(['zh-CN','zh-TW','en','fr','es','ja','ru']);
export const levelSchema=z.enum(['high_school','university']);
export const attachmentSchema=z.object({kind:z.enum(['image','pdf']),name:z.string().min(1).max(120),data:z.string().max(8500000)});
export const recognitionSchema=z.object({text:z.string().max(14000),latex:z.string().max(14000),uncertainParts:z.array(z.string().max(200)).max(20),needsReview:z.boolean()});
export type Recognition=z.infer<typeof recognitionSchema>;
export const publicNodeSchema=z.object({id:z.string().regex(/^[a-z0-9_-]{1,50}$/),goal:z.string().min(1).max(250),task:z.string().min(1).max(700)});
export type PublicNode=z.infer<typeof publicNodeSchema>;
export const privateNodeSchema=publicNodeSchema.extend({dependencies:z.array(z.string().max(50)).max(12),expectedAnswer:z.string().min(1).max(2500),criteria:z.array(z.string().max(400)).min(1).max(8),hints:z.array(z.string().min(1).max(700)).min(1).max(3)});
export const privatePlanSchema=z.object({problem:z.string().min(1).max(14000),topic:z.string().min(1).max(100),level:levelSchema,finalGoal:z.string().min(1).max(500),nodes:z.array(privateNodeSchema).min(1).max(12),referenceAnswer:z.string().min(1).max(5000),workedSolution:z.string().min(1).max(14000),validationStatus:z.enum(['model_reviewed','needs_review'])});
export type PrivatePlan=z.infer<typeof privatePlanSchema>;
export function validateGeneralPlan(input:unknown):PrivatePlan{const p=privatePlanSchema.parse(input),seen=new Set<string>();for(const n of p.nodes){if(seen.has(n.id))throw Error('Duplicate node');if(n.dependencies.some(d=>!seen.has(d)))throw Error('Missing or forward dependency');seen.add(n.id);}if(p.nodes.slice(1).some(n=>!n.dependencies.length))throw Error('Disconnected task');return p;}
export const reviewSchema=z.object({approved:z.boolean(),issues:z.array(z.string().max(500)).max(12)});
export const feedbackSchema=z.object({status:z.enum(['correct','incorrect','unknown']),studentMessage:z.string().min(1).max(1200),evidenceRefs:z.array(z.string().max(80)).min(1).max(15),preservedParts:z.array(z.string().max(600)).max(8),recommendedAction:z.enum(['continue','clarify','split_step','switch_approach','request_synthesis','needs_review']),needsReview:z.boolean()});
export type GeneralFeedback=z.infer<typeof feedbackSchema>;
export interface GeneralHelp {id:string;type:'path_revealed'|'substep_revealed'|'ai_hint'|'solution_viewed';nodeId:string;timestamp:string}
export interface GeneralSubmission {id:string;nodeId:string;text:string;feedback:GeneralFeedback;timestamp:string}
export interface PublicSession {id:string;problem:string;topic:string;level:'high_school'|'university';mode:'ai'|'demo';guidance:'guided'|'reduced'|'independent';state:'active'|'synthesis'|'completed'|'needs_review';current:PublicNode|null;path:{id:string;goal:string;done:boolean}[];submissions:GeneralSubmission[];help:GeneralHelp[];adjustments:{action:string;reason:string;timestamp:string}[];completedNodes:string[];outcome:'guided_complete'|'independent_pass'|'independent_not_yet'|'unscored'|null;validationStatus:'authored_verified'|'model_reviewed'|'needs_review';hint?:string;solution?:string;feedback?:GeneralFeedback;parentId?:string;unseen:boolean}
export interface GeneralRecord {schemaVersion:1;localId:string;token?:string;session?:PublicSession;question:string;level:'high_school'|'university';draft:string;notes:string;inputMode:'ink'|'text';createdAt:string;updatedAt:string;recognition?:Recognition;inkPages?:Record<string,string>;attachment?:z.infer<typeof attachmentSchema>}
