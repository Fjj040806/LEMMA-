import type {Grade,Item} from './types';
// A bounded, authored grammar: no evaluation, arbitrary symbols or numeric sampling.
export function normalize(s:string):string {return s.trim().toLowerCase().replace(/−/g,'-').replace(/×|·/g,'*').replace(/\s/g,'').replace(/exp\(x\)/g,'e^x').replace(/e\^\(x\)/g,'e^x').replace(/\*/g,'');}
const finite=/^[0-9xcelnosipratg()+\-*/^.\s−×·]*$/i;
export function exact(s:string,forms:string[]):boolean{return forms.some(f=>normalize(f)===normalize(s));}
export function grade(item:Item,node:string,v:Record<string,string>,evidenceId='submission'):Grade{
 const result=(status:Grade['status'],reason:string,criteria:{criterion:string;passed:boolean}[]=[]):Grade=>({status,shortReason:reason,criterionResults:criteria,evidenceRefs:[evidenceId],needsReview:status==='unknown'});
 if(node==='verify'){
 const ok=v.verify==='differentiate'&&v.reason==='simplify';return result(ok?'correct':'incorrect',ok?'你连接了关键选择与求导验证。':'原函数可以通过求导检查；选择 u 时考虑求导后的简化。',[{criterion:'验证方法与选择理由',passed:ok}]);}
 const keys=node==='setup'?['u','dv']:node==='calculus'?['du','v']:node==='relation'?['uv','integrand']:['answer'];
 if(keys.some(k=>!(v[k]||'').trim()))return result('incorrect','先填写当前需要的内容；已有过程会保留。');
 if(keys.some(k=>v[k].length>300||!finite.test(v[k])))return result('unknown','这个表达方式超出演示评分范围。过程已保留，可以修正格式或留待复核。');
 if(node==='setup'&&item.id==='xe'&&exact(v.u,['e^x'])&&exact(v.dv,['x']))return result('unknown','这个选择在数学上有效，但会产生更复杂的积分。演示引擎不能可靠接续这条替代路径，已保留你的过程供复核。');
 if(node==='answer'){
 const n=v.answer.trim();const hasC=/\+\s*c\s*$/i.test(n);const base=n.replace(/\+\s*c\s*$/i,'');
 const good=exact(base,item.acceptedForms as string[]);
 if(good&&!hasC)return result('incorrect','主要计算正确。补上不定积分的积分常数 +C，就完整了。',[{criterion:'原函数',passed:true},{criterion:'积分常数',passed:false}]);
 if(good)return result('correct','原函数和积分常数都符合已审核形式。',[{criterion:'原函数',passed:true},{criterion:'积分常数',passed:true}]);
 for(const [bad,msg] of Object.entries(item.commonErrors))if(exact(base,[bad]))return result('incorrect',msg);
 return result('unknown','暂时无法确认这是不是等价表达式。这里只审核有限形式，不将不认识的写法判错。');
 }
 const forms=node==='setup'?[item.fields.u,item.fields.dv]:node==='calculus'?[item.fields.du,item.fields.v]:[[item.fields.relation[0]],[item.fields.relation[1]]];
 const criteria=keys.map((k,i)=>({criterion:k,passed:exact(v[k],forms[i])}));
 if(criteria.every(c=>c.passed))return result('correct','这一步的证据已经齐了，可以把它连接到下一步。',criteria);
 // Recognized local sign slips are errors; arbitrary alternatives remain unknown.
 const signSlip=criteria.some((c,i)=>!c.passed&&exact('-'+v[keys[i]],forms[i]));
 return result(signSlip?'incorrect':'unknown',signSlip?'保留正确部分，检查未通过项的符号。':'有些填写不在预设等价形式内。先核对输入格式，或保留为待复核。',criteria);
}
