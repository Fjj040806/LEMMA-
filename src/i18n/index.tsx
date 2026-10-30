import {createContext,useContext,useEffect,useState,isValidElement,cloneElement,type ReactNode,type ReactElement} from 'react';
import rows from './messages.json';
export const languages=[{code:'zh-CN',name:'简体中文'},{code:'en',name:'English'},{code:'zh-TW',name:'繁體中文'},{code:'fr',name:'Français'},{code:'es',name:'Español'},{code:'ja',name:'日本語'},{code:'ru',name:'Русский'}] as const;
export type Locale=typeof languages[number]['code'];
const index:Record<Locale,number>={'zh-CN':0,'zh-TW':1,en:2,fr:3,es:4,ja:5,ru:6};
const dictionaries=Object.fromEntries(languages.map(l=>[l.code,new Map(rows.map(row=>[row[0],row[index[l.code]]]))])) as Record<Locale,Map<string,string>>;
const sourceKeys=[...new Set(rows.map(r=>r[0]))].sort((a,b)=>b.length-a.length);
// Single-pass replacements prevent translated text from being translated again.
const escaped=sourceKeys.filter(s=>s.length>1).map(s=>s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'));
const pattern=new RegExp(escaped.join('|'),'gu');
export function translate(text:string,locale:Locale):string{
 if(locale==='zh-CN')return text;
 const dict=dictionaries[locale],exact=dict.get(text);if(exact!==undefined)return exact;
 const trimmed=text.trim(),value=dict.get(trimmed);if(value!==undefined)return text.slice(0,text.indexOf(trimmed))+value+text.slice(text.indexOf(trimmed)+trimmed.length);
 return text.replace(pattern,k=>dict.get(k)||k);
}
export function readLocale(storage?:Pick<Storage,'getItem'>):Locale{try{const code=storage?.getItem('lemma.locale');return languages.some(l=>l.code===code)?code as Locale:'zh-CN';}catch{return 'zh-CN';}}
const Context=createContext<{locale:Locale;setLocale:(v:Locale)=>void}>({locale:'zh-CN',setLocale:()=>{}});
export function LanguageProvider({children}:{children:ReactNode}){const [locale,setLanguage]=useState<Locale>(()=>readLocale(typeof localStorage==='undefined'?undefined:localStorage));
 function setLocale(v:Locale){setLanguage(v);try{localStorage.setItem('lemma.locale',v);}catch{/* Switching remains available if persistence is blocked. */}}
 useEffect(()=>{document.documentElement.lang=locale;document.title='LEMMA · '+translate('一步步，解开。',locale);},[locale]);
 return <Context.Provider value={{locale,setLocale}}>{children}</Context.Provider>;
}
export const useLocale=()=>useContext(Context);
/** Localize presentation text only. Never transform student evidence, math, or input values. */
export function localizeTree(node:ReactNode,locale:Locale):ReactNode{
 if(typeof node==='string')return translate(node,locale);
 if(Array.isArray(node))return node.map((n,i)=>{const result=localizeTree(n,locale);return isValidElement(result)&&result.key===null?cloneElement(result,{key:'localized-'+i}):result;});
 if(!isValidElement(node))return node;
 const el=node as ReactElement<Record<string,unknown>>,p=el.props;
 if(p['data-i18n-skip']||el.type==='pre')return node;
 const next:Record<string,unknown>={};
 for(const k of ['placeholder','aria-label','title'])if(typeof p[k]==='string')next[k]=translate(p[k] as string,locale);
 if(p.children!==undefined)next.children=localizeTree(p.children as ReactNode,locale);
 return cloneElement(el,next);
}
