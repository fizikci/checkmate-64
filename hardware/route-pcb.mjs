import fs from 'node:fs';
import board from './pcb-layout.mjs';
const STEP=.2, CLEAR=.21, NX=Math.floor(board.boardWidth/STEP)+1, NY=Math.floor(board.boardHeight/STEP)+1, SZ=NX*NY;
const key=(x,y,z=0)=>z*SZ+y*NX+x;
const point=k=>({x:(k%NX)*STEP,y:(Math.floor(k/NX)%NY)*STEP,z:Math.floor(k/SZ)});
function raster(block,x0,y0,x1,y1,test){
 for(let y=Math.max(0,Math.floor(y0/STEP));y<=Math.min(NY-1,Math.ceil(y1/STEP));y++)for(let x=Math.max(0,Math.floor(x0/STEP));x<=Math.min(NX-1,Math.ceil(x1/STEP));x++)if(test(x*STEP,y*STEP))block[y*NX+x]=1;
}
const dist=(x,y,a,b)=>{let dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);};
function blocks(net,radius){
 const b=[new Uint8Array(SZ),new Uint8Array(SZ)];
 const circle=(z,x,y,r)=>raster(b[z],x-r,y-r,x+r,y+r,(X,Y)=>Math.hypot(X-x,Y-y)<=r);
 for(let z=0;z<2;z++){
  for(let y=0;y<NY;y++)for(let x=0;x<NX;x++)if(Math.min(x*STEP,y*STEP,board.boardWidth-x*STEP,board.boardHeight-y*STEP)<.5+radius)b[z][y*NX+x]=1;
  for(const h of board.holes)circle(z,h.x,h.y,h.keepout+radius);
 }
 for(const p of board.pads){if(p.net===net)continue; const r=radius+CLEAR;for(const z of p.layer===11?[0,1]:[p.layer-1]){
  if(p.shape==='circle')circle(z,p.x,p.y,p.w/2+r);
  else raster(b[z],p.x-p.w/2-r,p.y-p.h/2-r,p.x+p.w/2+r,p.y+p.h/2+r,(X,Y)=>Math.hypot(Math.max(0,Math.abs(X-p.x)-p.w/2),Math.max(0,Math.abs(Y-p.y)-p.h/2))<=r);
 }}
 for(const v of board.vias)if(v.net!==net)for(let z=0;z<2;z++)circle(z,v.x,v.y,v.diameter/2+radius+CLEAR);
 for(const tr of board.tracks){if(tr.net===net)continue;const r=tr.width/2+radius+CLEAR;for(let i=1;i<tr.points.length;i++){const a=tr.points[i-1],c=tr.points[i];raster(b[tr.layer-1],Math.min(a.x,c.x)-r,Math.min(a.y,c.y)-r,Math.max(a.x,c.x)+r,Math.max(a.y,c.y)+r,(x,y)=>dist(x,y,a,c)<=r);}}
 return b;
}
class Heap{constructor(){this.a=[];}push(k,f){const a=this.a;let i=a.length;a.push({k,f});while(i){let j=(i-1)>>1;if(a[j].f<=f)break;a[i]=a[j];i=j;}a[i]={k,f};}pop(){const a=this.a,top=a[0],last=a.pop();if(a.length){let i=0;while(2*i+1<a.length){let j=2*i+1;if(j+1<a.length&&a[j+1].f<a[j].f)j++;if(a[j].f>=last.f)break;a[i]=a[j];i=j;}a[i]=last;}return top;}get length(){return this.a.length;}}
function search(src,dst,b,vb){
 const sx=Math.round(src.x/STEP),sy=Math.round(src.y/STEP),tx=Math.round(dst.x/STEP),ty=Math.round(dst.y/STEP);
 const score=new Float32Array(SZ*2);score.fill(Infinity);const prev=new Int32Array(SZ*2);prev.fill(-1);const closed=new Uint8Array(SZ*2);const heap=new Heap();
 const heuristic=(x,y)=>Math.abs(x-tx)+Math.abs(y-ty);
 for(const z of src.layer===11?[0,1]:[src.layer-1]){if(b[z][key(sx,sy)])continue;let k=key(sx,sy,z);score[k]=0;heap.push(k,heuristic(sx,sy));}
 let steps=0;
 while(heap.length){const {k}=heap.pop();if(closed[k])continue;closed[k]=1;const z=Math.floor(k/SZ),local=k%SZ,x=local%NX,y=Math.floor(local/NX);
  if(x===tx&&y===ty&&(dst.layer===11||z===dst.layer-1)){const path=[];for(let c=k;c!==-1;c=prev[c])path.push(point(c));return path.reverse();}
  if(++steps>1800000)break;
  const moves=[[x-1,y,z,z===0?1:5],[x+1,y,z,z===0?1:5],[x,y-1,z,z===1?1:5],[x,y+1,z,z===1?1:5]];
  if(!vb[0][local]&&!vb[1][local])moves.push([x,y,1-z,12]);
  for(const [xx,yy,zz,cost]of moves){if(xx<0||yy<0||xx>=NX||yy>=NY)continue;const ll=key(xx,yy),kk=ll+zz*SZ;if(b[zz][ll]||closed[kk])continue;const ns=score[k]+cost;if(ns<score[kk]){score[kk]=ns;prev[kk]=k;heap.push(kk,ns+heuristic(xx,yy));}}
 }
 return null;
}
function commit(path,src,dst,net,width){
 let z=path[0].z,pts=[{x:src.x,y:src.y}];
 const flush=()=>{if(pts.length<2)return;const clean=[];for(const p of pts){if(clean.length&&Math.hypot(p.x-clean.at(-1).x,p.y-clean.at(-1).y)<1e-6)continue;if(clean.length>1){let a=clean.at(-2),b=clean.at(-1);if(Math.abs((b.x-a.x)*(p.y-b.y)-(b.y-a.y)*(p.x-b.x))<1e-8)clean.pop();}clean.push({x:+p.x.toFixed(4),y:+p.y.toFixed(4)});}if(clean.length>1)board.tracks.push({net,width,layer:z+1,points:clean});};
 for(const p of path){if(p.z!==z){flush();if(!board.vias.some(v=>v.net===net&&Math.hypot(v.x-p.x,v.y-p.y)<.01))board.vias.push({net,x:+p.x.toFixed(4),y:+p.y.toFixed(4),diameter:.65,drill:.3});pts=[p];z=p.z;}else pts.push(p);}
 pts.push(dst);flush();
}
// Escape fine-pitch packages before wider supply traces enter the router.
const routingPads=board.pads.map(p=>({...p}));
for(const [cap,ic] of [['C10','U10'],['C11','U11']])for(const [cp,ip]of [[1,1],[2,16]]){
 const a=board.pads.find(p=>p.ref===cap&&p.n===cp),c=board.pads.find(p=>p.ref===ic&&p.n===ip);
 board.tracks.push({net:a.net,width:.25,layer:1,points:[{x:a.x,y:a.y},{x:c.x,y:c.y}]});
}
for(const [cp,ip]of [[1,16],[2,15]]){
 const a=board.pads.find(p=>p.ref==='C9'&&p.n===cp),c=board.pads.find(p=>p.ref==='U9'&&p.n===ip);
 board.tracks.push({net:a.net,width:.4,layer:2,points:[{x:a.x,y:a.y},{x:c.x,y:a.y},{x:c.x,y:c.y}]});
}
for(const ref of ['U10','U11']){
 const c=board.components.find(c=>c.ref===ref);
 for(const p of board.pads.filter(p=>p.ref===ref)){
  const i=p.n<=8?p.n-1:16-p.n,side=p.n<=8?1:-1;
  const end={x:c.x-7+i*2,y:c.y+side*7};
  board.tracks.push({net:p.net,width:.2,layer:1,points:[{x:p.x,y:p.y},{x:p.x,y:c.y+side*4.1},end]});
  board.vias.push({...end,net:p.net,diameter:.65,drill:.3});
  Object.assign(routingPads.find(q=>q.ref===ref&&q.n===p.n),end,{layer:11});
 }
}
const groups=Object.entries(Object.groupBy(routingPads.filter(p=>p.net!==null),p=>p.net));
const span=p=>Math.max(...p.map(p=>p.x))-Math.min(...p.map(p=>p.x))+Math.max(...p.map(p=>p.y))-Math.min(...p.map(p=>p.y));
groups.sort(([a,p],[b,q])=>{const pri=n=>n==='+5V'?-3:n==='GND'?-2:0;return pri(a)-pri(b)||span(p)-span(q);});
const failures=[];
for(const [net,pads]of groups){const width=net==='+5V'||net==='GND'?1.2:.25;const b=blocks(net,width/2),vb=blocks(net,.65/2);const tree=[pads[0]],todo=pads.slice(1);let count=0;
 while(todo.length){let best;for(let i=0;i<todo.length;i++)for(const p of tree){let d=Math.abs(p.x-todo[i].x)+Math.abs(p.y-todo[i].y);if(!best||d<best.d)best={i,p,d};}
  const src=todo.splice(best.i,1)[0],dst=best.p,path=search(src,dst,b,vb);
  if(!path){failures.push(`${net}: ${src.ref}-${src.n} to ${dst.ref}-${dst.n}`);console.log('blocked',JSON.stringify([src,dst].map(p=>({ref:p.ref,n:p.n,x:p.x,y:p.y,b:b.map(bb=>bb[key(Math.round(p.x/STEP),Math.round(p.y/STEP))])}))));}else{commit(path,src,dst,net,width);count++;}tree.push(src);
 }
 console.log(`${net}: ${count}/${pads.length-1}`);
}
board.routingFailures=failures;
fs.writeFileSync(new URL('./row-pcb-model.json',import.meta.url),JSON.stringify(board,null,2));
console.log(JSON.stringify({tracks:board.tracks.length,vias:board.vias.length,failures}));

