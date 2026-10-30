import {useLocale,localizeTree} from '../i18n';
import type {Attempt} from '../domain/types';import {getNode} from '../domain/engine';
export function AnswerForm({a,onChange,onSubmit,busy}:{a:Attempt;onChange:(key:string,v:string)=>void;onSubmit:()=>void;busy:boolean}){
 const whole=a.guidance==='independent'||a.state==='synthesis'||a.state==='independent_check'||a.state==='attempting';const node=whole?'answer':getNode(a)?.id;
 const pair=node==='setup'?['u','dv']:node==='calculus'?['du','v']:node==='relation'?['uv','integrand']:[];
 const labels:Record<string,string>={u:'u =',dv:'dv =（函数部分）',du:'du =（导数部分）',v:'v =',uv:'u · v =',integrand:'v · du =（函数部分）',answer:'你的完整原函数'};
 const fields=pair.length?(a.split?[pair[a.splitIndex]]:pair):node==='verify'?[]:['answer'];
 const {locale}=useLocale();return localizeTree(<form className="answer-form" onSubmit={e=>{e.preventDefault();onSubmit();}}>
 {fields.map(key=><label key={key}>{labels[key]}<input autoComplete="off" spellCheck={false} value={a.draft[key]||''} onChange={e=>onChange(key,e.target.value)} placeholder={key==='answer'?'例如：e^x*(x-1)+C':'使用 x、e^x、sin(x)、ln(x) 等'} maxLength={300}/></label>)}
 {(node==='verify'||whole&&a.state!=='independent_check')&&<div className="verification"><label>你会怎样验证？<select aria-label="你会怎样验证？" value={a.draft.verify||''} onChange={e=>onChange('verify',e.target.value)}><option value="">选择验证方式</option><option value="differentiate">对原函数求导，与被积函数比较</option><option value="appearance">看表达式是否相似</option></select></label><label>为什么这样选 u？<select aria-label="为什么这样选 u？" value={a.draft.reason||''} onChange={e=>onChange('reason',e.target.value)}><option value="">连接你的选择与目标</option><option value="simplify">它求导后更简单，使剩余积分更容易</option><option value="first">因为它写在最前面</option></select></label></div>}
 <label className="notes-label">{whole?'你的解题过程':'思路便签'} <span>可选 · 保存但不自动评判自由文字</span><textarea value={a.draft.notes||''} onChange={e=>onChange('notes',e.target.value)} placeholder={whole?'把你的拆法、计算过程或暂时的想法留在这里。':'我注意到……所以我准备……'} maxLength={1000} rows={3}/></label>
 <div className="form-footer"><span>↵ 提交 · 支持键盘操作</span><button className="primary" type="submit" disabled={busy}>{busy?'正在检查…':a.split&&a.splitIndex===0?'保存这个量，继续下一个':a.state==='independent_check'?'整题提交，查看结果':whole?'提交完整解法':'提交这一步'} <b>→</b></button></div>
 </form>,locale);
}
