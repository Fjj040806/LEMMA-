export interface InkPoint{x:number;y:number;p:number}
export interface InkStroke{points:InkPoint[];erase:boolean}
export interface InkPage{version:1;strokes:InkStroke[];revision:number}
export const INK_WIDTH=1600,INK_HEIGHT=1000;
export function pointFromPointer(x:number,y:number,pressure:number,rect:{left:number;top:number;width:number;height:number}):InkPoint{return {x:Math.max(0,Math.min(INK_WIDTH,(x-rect.left)*INK_WIDTH/rect.width)),y:Math.max(0,Math.min(INK_HEIGHT,(y-rect.top)*INK_HEIGHT/rect.height)),p:pressure>0?Math.max(.1,Math.min(1,pressure)):.5};}
export function appendStroke(page:InkPage,stroke:InkStroke):InkPage{if(!stroke.points.length)return page;return {version:1,revision:page.revision+1,strokes:[...page.strokes,stroke]};}
export function undoStroke(page:InkPage):InkPage{return {version:1,revision:page.revision+1,strokes:page.strokes.slice(0,-1)};}
export function canApplyRecognition(requestRevision:number,currentRevision:number){return requestRevision===currentRevision;}
