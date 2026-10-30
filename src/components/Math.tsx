import katex from 'katex';import 'katex/dist/katex.min.css';
export function MathText({tex,block=false}:{tex:string;block?:boolean}){return <span className={block?'math block':'math'} role="math" aria-label={tex} dangerouslySetInnerHTML={{__html:katex.renderToString(tex,{throwOnError:false,displayMode:block,trust:false,strict:'ignore',output:'htmlAndMathml'})}}/>;}
