import fs from 'node:fs';
import {nets as expected} from './row-circuit.mjs';
const b=JSON.parse(fs.readFileSync(new URL('./row-pcb-model.json',import.meta.url)));
const items=[];const errors=[];
const add=(o)=>{o.id=items.length;o.bounds=o.rect?[o.x-o.w/2,o.y-o.h/2,o.x+o.w/2,o.y+o.h/2]:[Math.min(o.a.x,o.c.x)-o.r,Math.min(o.a.y,o.c.y)-o.r,Math.max(o.a.x,o.c.x)+o.r,Math.max(o.a.y,o.c.y)+o.r];items.push(o);};
for(const p of b.pads){const o={name:`${p.ref}-${p.n}`,net:p.net??`NC:${p.ref}-${p.n}`,layers:p.layer===11?3:1<<(p.layer-1),pad:true};if(p.shape==='rect')add({...o,rect:true,x:p.x,y:p.y,w:p.w,h:p.h});else add({...o,a:p,c:p,r:p.w/2});if(p.drill&&Math.min(p.w,p.h)/2-p.drill/2<.1499)errors.push({type:'annular',pad:o.name});}
for(const [i,v]of b.vias.entries()){add({name:`via${i}`,net:v.net,layers:3,a:v,c:v,r:v.diameter/2});if((v.diameter-v.drill)/2<.1499)errors.push({type:'annular',via:i});}
for(const [i,t]of b.tracks.entries())for(let j=1;j<t.points.length;j++)add({name:`track${i}.${j}`,net:t.net,layers:1<<(t.layer-1),a:t.points[j-1],c:t.points[j],r:t.width/2});
const cross=(a,c,p)=>(c.x-a.x)*(p.y-a.y)-(c.y-a.y)*(p.x-a.x);
const pt=(p,a,c)=>{const dx=c.x-a.x,dy=c.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
function seg(a,c,d,e){const s1=cross(a,c,d),s2=cross(a,c,e),s3=cross(d,e,a),s4=cross(d,e,c);if(s1*s2<0&&s3*s4<0)return 0;return Math.min(pt(a,d,e),pt(c,d,e),pt(d,a,c),pt(e,a,c));}
const corners=r=>[{x:r.x-r.w/2,y:r.y-r.h/2},{x:r.x+r.w/2,y:r.y-r.h/2},{x:r.x+r.w/2,y:r.y+r.h/2},{x:r.x-r.w/2,y:r.y+r.h/2}];
function gap(a,c){if(a.rect&&c.rect)return Math.hypot(Math.max(0,Math.abs(a.x-c.x)-(a.w+c.w)/2),Math.max(0,Math.abs(a.y-c.y)-(a.h+c.h)/2));if(!a.rect&&!c.rect)return seg(a.a,a.c,c.a,c.c)-a.r-c.r;const r=a.rect?a:c,s=a.rect?c:a;if([s.a,s.c].some(p=>Math.abs(p.x-r.x)<=r.w/2&&Math.abs(p.y-r.y)<=r.h/2))return -s.r;const pts=corners(r);return Math.min(...pts.map((p,i)=>seg(s.a,s.c,p,pts[(i+1)%4])))-s.r;}
const parent=items.map((_,i)=>i);function root(i){while(parent[i]!==i){parent[i]=parent[parent[i]];i=parent[i];}return i;}
let minClear=Infinity;
for(let i=0;i<items.length;i++){
 const a=items[i],bb=a.bounds;
 if(Math.min(bb[0],bb[1],b.boardWidth-bb[2],b.boardHeight-bb[3])<.4999)errors.push({type:'edge',item:a.name});
 for(const h of b.holes){const dd=gap(a,{a:h,c:h,r:h.drill/2});if(dd<.9999)errors.push({type:'mounting-clearance',item:a.name,gap:dd});}
 for(let j=i+1;j<items.length;j++){const c=items[j],cb=c.bounds;if(!(a.layers&c.layers))continue;if(bb[0]>cb[2]+.22||cb[0]>bb[2]+.22||bb[1]>cb[3]+.22||cb[1]>bb[3]+.22)continue;const d=gap(a,c);
  if(a.net===c.net){if(d<.0001)parent[root(i)]=root(j);}else{minClear=Math.min(minClear,d);if(d<.1999)errors.push({type:'clearance',a:a.name,b:c.name,netA:a.net,netB:c.net,mm:+d.toFixed(5)});}
 }
}
for(const [net,pins]of Object.entries(expected)){const ii=pins.map(p=>items.findIndex(i=>i.pad&&i.name===p));if(ii.some(i=>i<0))errors.push({type:'missing-pad',net});else{const groups=[...new Set(ii.map(root))];if(groups.length>1)errors.push({type:'unconnected',net,groups:groups.map(g=>ii.filter(i=>root(i)===g).map(i=>items[i].name))});}}
const report={status:errors.length?'FAIL':'PASS',minimumCopperClearanceMm:minClear,components:b.components.length,pads:b.pads.length,nets:Object.keys(expected).length,tracks:b.tracks.length,vias:b.vias.length,errors};
fs.writeFileSync(new URL('./pcb-check-report.json',import.meta.url),JSON.stringify(report,null,2));console.log(JSON.stringify({...report,errors:errors.slice(0,25)},null,2));if(errors.length)process.exitCode=1;
