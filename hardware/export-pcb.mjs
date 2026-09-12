import fs from 'node:fs';
const b=JSON.parse(fs.readFileSync(new URL('./row-pcb-model.json',import.meta.url)));
const dir=new URL('./fabrication/',import.meta.url);fs.mkdirSync(dir,{recursive:true});
const F={
 A:['01110','10001','10001','11111','10001','10001','10001'],B:['11110','10001','10001','11110','10001','10001','11110'],C:['01111','10000','10000','10000','10000','10000','01111'],D:['11110','10001','10001','10001','10001','10001','11110'],E:['11111','10000','10000','11110','10000','10000','11111'],F:['11111','10000','10000','11110','10000','10000','10000'],G:['01111','10000','10000','10111','10001','10001','01111'],H:['10001','10001','10001','11111','10001','10001','10001'],I:['11111','00100','00100','00100','00100','00100','11111'],J:['00111','00010','00010','00010','10010','10010','01100'],K:['10001','10010','10100','11000','10100','10010','10001'],L:['10000','10000','10000','10000','10000','10000','11111'],M:['10001','11011','10101','10101','10001','10001','10001'],N:['10001','11001','10101','10011','10001','10001','10001'],O:['01110','10001','10001','10001','10001','10001','01110'],P:['11110','10001','10001','11110','10000','10000','10000'],Q:['01110','10001','10001','10001','10101','10010','01101'],R:['11110','10001','10001','11110','10100','10010','10001'],S:['01111','10000','10000','01110','00001','00001','11110'],T:['11111','00100','00100','00100','00100','00100','00100'],U:['10001','10001','10001','10001','10001','10001','01110'],V:['10001','10001','10001','10001','10001','01010','00100'],W:['10001','10001','10001','10101','10101','10101','01010'],X:['10001','10001','01010','00100','01010','10001','10001'],Y:['10001','10001','01010','00100','00100','00100','00100'],Z:['11111','00001','00010','00100','01000','10000','11111'],
 '0':['01110','10001','10011','10101','11001','10001','01110'],'1':['00100','01100','00100','00100','00100','00100','01110'],'2':['01110','10001','00001','00010','00100','01000','11111'],'3':['11110','00001','00001','01110','00001','00001','11110'],'4':['00010','00110','01010','10010','11111','00010','00010'],'5':['11111','10000','10000','11110','00001','00001','11110'],'6':['01110','10000','10000','11110','10001','10001','01110'],'7':['11111','00001','00010','00100','01000','01000','01000'],'8':['01110','10001','10001','01110','10001','10001','01110'],'9':['01110','10001','10001','01111','00001','00001','01110'], '-':['00000','00000','00000','11111','00000','00000','00000'],'+':['00000','00100','00100','11111','00100','00100','00000'],'.':['00000','00000','00000','00000','00000','00100','00100'],'/':['00001','00001','00010','00100','01000','10000','10000']};
function letters(s,x,y,h=1.2){const unit=h/7,lines=[];for(const [i,ch]of [...s.toUpperCase()].entries())for(const [j,row]of (F[ch]??[]).entries()){for(const m of row.matchAll(/1+/g)){lines.push([{x:x+(i*6+m.index)*unit,y:y-h+j*unit},{x:x+(i*6+m.index+m[0].length-1)*unit+.02,y:y-h+j*unit}]);}}return lines;}
let id=100000;const g=()=>`gge${++id}`,u=x=>+(x/.254).toFixed(5);const silk=[];
function silkLine(points,width=.15){silk.push({points,width});return `TRACK~${u(width)}~3~~${points.map(p=>`${u(p.x)} ${u(p.y)}`).join(' ')}~${g()}~0`;}
function text(s,x,y,type='L',show=true){const lines=letters(s,x,y),path=lines.map(([a,c])=>`M ${u(a.x)} ${u(a.y)} L ${u(c.x)} ${u(c.y)}`).join(' ');if(show)for(const points of lines)silk.push({points,width:.15});return `TEXT~${type}~${u(x)}~${u(y)}~${u(.15)}~0~~3~~${u(1.2)}~${s}~${path}~${show?'':'none'}~${g()}~0`;}
const shapes=[];
for(const c of b.components){const sub=[];let xx=c.x-c.body.w/2,yy=c.y-c.body.h/2;
 sub.push(silkLine([{x:xx,y:yy},{x:xx+c.body.w,y:yy},{x:xx+c.body.w,y:yy+c.body.h},{x:xx,y:yy+c.body.h},{x:xx,y:yy}]));
 let tx=xx,ty=yy-1;
 if(c.ref.startsWith('R'))ty=c.y+3.3;
 if(c.ref.startsWith('C'))ty=c.y+3.7;
 if(c.ref==='C9')ty=c.y-3.1;
 if(['C10','C11'].includes(c.ref)){tx=c.x-4;ty=c.y+.6;}
 if(/^U[1-8]$/.test(c.ref)){tx=c.x+4;ty=c.y+.6;}
 if(['U9','U10','U11'].includes(c.ref)){tx=c.x+c.body.w/2+1.7;ty=c.y+.6;sub.push(silkLine([{x:xx,y:c.y-1},{x:xx+1,y:c.y},{x:xx,y:c.y+1}]));}
 sub.push(text(c.ref,tx,ty,'P'));
 sub.push(text(c.value,tx,ty+1.6,'N',false));
 for(const p of b.pads.filter(p=>p.ref===c.ref)){
  const rect=p.shape==='rect',pts=rect?`${u(p.x-p.w/2)} ${u(p.y-p.h/2)} ${u(p.x+p.w/2)} ${u(p.y-p.h/2)} ${u(p.x+p.w/2)} ${u(p.y+p.h/2)} ${u(p.x-p.w/2)} ${u(p.y+p.h/2)}`:'';
  sub.push(`PAD~${rect?'RECT':'ELLIPSE'}~${u(p.x)}~${u(p.y)}~${u(p.w)}~${u(p.h)}~${p.layer}~${p.net??''}~${p.n}~${u(p.drill/2)}~${pts}~0~${g()}~0~~Y~0`);
 }
 if(c.ref.startsWith('D')){sub.push(text(c.value,c.x-2,c.y+4.4));sub.push(text('K',c.x-1.6,c.y+2.3),text('A',c.x+1,c.y+2.3));}
 if(c.ref==='C12')sub.push(text('+',c.x-4,c.y));
 if(/^U[1-8]$/.test(c.ref)){
  sub.push(silkLine([{x:c.x-2,y:c.y},{x:c.x+2,y:c.y}]));sub.push(silkLine([{x:c.x,y:c.y-2},{x:c.x,y:c.y+2}]));
  sub.push(text('FACE UP',c.x-3.6,c.y-4));
  sub.push(text('V',c.x-2.9,c.y+8.8),text('G',c.x-.3,c.y+8.8),text('O',c.x+2.2,c.y+8.8));
 }
 if(['U9','U10','U11'].includes(c.ref)){const pin=b.pads.find(p=>p.ref===c.ref&&p.n===1);sub.push(text('1',pin.x-1.7,pin.y+2.2));}
 shapes.push(`LIB~${u(c.x)}~${u(c.y)}~package\`${c.pkg}\`pre\`${c.ref}\`name\`${c.value}\`~0~~${g()}~1~~~0~#@$${sub.join('#@$')}`);
}
for(let i=0;i<8;i++){shapes.push(text(`CH${i}`,i*50.8+31,4));}
shapes.push(text('CHECKMATE ROW A - 5V',172,2.5),text('IN',3,32),text('OUT',398,32));
for(const t of b.tracks)shapes.push(`TRACK~${u(t.width)}~${t.layer}~${t.net}~${t.points.map(p=>`${u(p.x)} ${u(p.y)}`).join(' ')}~${g()}~0`);
for(const v of b.vias)shapes.push(`VIA~${u(v.x)}~${u(v.y)}~${u(v.diameter)}~${v.net}~${u(v.drill/2)}~${g()}~0`);
// EasyEDA 6.5.57 stores the NPTH radius, despite the older format guide's wording.
for(const h of b.holes)shapes.push(`HOLE~${u(h.x)}~${u(h.y)}~${u(h.drill/2)}~${g()}~0`);
shapes.push(`TRACK~${u(.05)}~10~~0 0 ${u(b.boardWidth)} 0 ${u(b.boardWidth)} ${u(b.boardHeight)} 0 ${u(b.boardHeight)} 0 0~${g()}~0`);
const doc={head:{docType:'3',editorVersion:'6.5.57',newgId:true,c_para:{'PCB Thickness':'1.6mm'},x:0,y:0,hasIdFlag:true},canvas:'CA~2000~1000~#000000~yes~#FFFFFF~1~1000~1000~line~0.5~mm~1~45~~0.5~0~0~0~yes',shape:shapes,layers:['1~TopLayer~#FF0000~true~true~true~','2~BottomLayer~#0000FF~true~false~true~','3~TopSilkLayer~#FFCC00~true~false~true~','4~BottomSilkLayer~#66CC33~true~false~true~','5~TopPasteMaskLayer~#808080~false~false~true~','6~BottomPasteMaskLayer~#800000~false~false~true~','7~TopSolderMaskLayer~#800080~false~false~true~0.19685','8~BottomSolderMaskLayer~#AA00FF~false~false~true~0.19685','9~Ratlines~#6464FF~true~false~true~','10~BoardOutLine~#FF00FF~true~false~true~','11~Multi-Layer~#C0C0C0~true~false~true~','12~Document~#FFFFFF~true~false~true~'],preference:{hideFootprints:'',hideNets:''},DRCRULE:{Default:{trackWidth:u(.2),clearance:u(.2),viaHoleDiameter:u(.65),viaHoleD:u(.3)},isRealtime:false,isDrcOnRoutingOrPlaceVia:false,checkObjectToCopperarea:true,showDRCRangeLine:true},netColors:{}};
fs.writeFileSync(new URL('./row-pcb-easyeda.json',import.meta.url),JSON.stringify(doc));
// RS-274X output, mm, 4.6 coordinates. All layers use the same top-view coordinates.
// Flip screen Y to the Gerber Cartesian convention; never mirror the bottom copper.
function gerber(objects){const apertures=new Map(),defs=[],draw=[];let code=10,last=null;
 const ap=(shape,w,h)=>{const key=`${shape}:${w.toFixed(4)}:${(h??w).toFixed(4)}`;if(!apertures.has(key)){apertures.set(key,code);defs.push(`%ADD${code++}${shape},${w.toFixed(4)}${shape==='R'?'X'+h.toFixed(4):''}*%`);}const c=apertures.get(key);if(c!==last){draw.push(`D${c}*`);last=c;}};
 const xy=p=>`X${Math.round(p.x*1e6)}Y${Math.round((b.boardHeight-p.y)*1e6)}`;
 for(const o of objects){if(o.points){ap('C',o.width);draw.push(`${xy(o.points[0])}D02*`);for(const p of o.points.slice(1))draw.push(`${xy(p)}D01*`);}else{ap(o.shape==='rect'?'R':'C',o.w,o.h);draw.push(`${xy(o)}D03*`);}}
 return ['G04 CHECKMATE ROW REV A*','%FSLAX46Y46*%','%MOMM*%','%LPD*%','G01*',...defs,...draw,'M02*',''].join('\n');
}
const save=(name,objects)=>fs.writeFileSync(new URL(name,dir),gerber(objects));
for(const layer of [1,2])save(layer===1?'row.GTL':'row.GBL',[...b.pads.filter(p=>p.layer===11||p.layer===layer),...b.vias.map(v=>({...v,w:v.diameter,h:v.diameter,shape:'circle'})),...b.tracks.filter(t=>t.layer===layer)]);
for(const layer of [1,2])save(layer===1?'row.GTS':'row.GBS',b.pads.filter(p=>p.layer===11||p.layer===layer).map(p=>({...p,w:p.w+.1,h:p.h+.1})));
const pointDist=(p,a,c)=>{const dx=c.x-a.x,dy=c.y-a.y,t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(p.x-a.x-t*dx,p.y-a.y-t*dy);};
// Clip silkscreen where it would cover an exposed solder pad. Break body outlines
// into edges so one crossing does not remove the rest of the component outline.
const fabSilk=[];for(const s of silk)for(let i=1;i<s.points.length;i++){
 const a=s.points[i-1],c=s.points[i];let blocked=false;
 for(const p of b.pads){if(p.layer===2)continue;const margin=.05+.1+s.width/2;
  if(p.shape==='circle'){if(pointDist(p,a,c)<p.w/2+margin){blocked=true;break;}}
  else {const steps=Math.max(1,Math.ceil(Math.hypot(c.x-a.x,c.y-a.y)/.05));for(let j=0;j<=steps;j++){const x=a.x+(c.x-a.x)*j/steps,y=a.y+(c.y-a.y)*j/steps;if(Math.hypot(Math.max(0,Math.abs(x-p.x)-p.w/2),Math.max(0,Math.abs(y-p.y)-p.h/2))<margin+.03){blocked=true;break;}}if(blocked)break;}
 }
 if(!blocked)fabSilk.push({width:s.width,points:[a,c]});
}
save('row.GTP',b.pads.filter(p=>p.layer===1&&p.drill===0));save('row.GTO',fabSilk);save('row.GBO',[]);
save('row.GKO',[{width:.05,points:[{x:0,y:0},{x:b.boardWidth,y:0},{x:b.boardWidth,y:b.boardHeight},{x:0,y:b.boardHeight},{x:0,y:0}]}]);
function drill(holes){const groups=Object.groupBy(holes,h=>h.drill.toFixed(3));const keys=Object.keys(groups);const out=['M48','; CHECKMATE ROW REV A - METRIC 3:3','METRIC,TZ',...keys.map((d,i)=>`T${i+1}C${d}`),'%','G90','G05'];keys.forEach((d,i)=>{out.push(`T${i+1}`);for(const h of groups[d])out.push(`X${h.x.toFixed(3)}Y${(b.boardHeight-h.y).toFixed(3)}`);});out.push('M30','');return out.join('\n');}
fs.writeFileSync(new URL('row-PTH.DRL',dir),drill([...b.pads.filter(p=>p.drill>0),...b.vias]));fs.writeFileSync(new URL('row-NPTH.DRL',dir),drill(b.holes));
// Actual-size review image from the same physical geometry, before PCB-editor checks.
const svg=[`<svg xmlns="http://www.w3.org/2000/svg" width="406.4mm" height="50.8mm" viewBox="0 0 406.4 50.8"><rect width="406.4" height="50.8" fill="#173d35"/>`];
for(const layer of [2,1])for(const t of b.tracks.filter(t=>t.layer===layer))svg.push(`<polyline points="${t.points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="${layer===1?'#df7154':'#507dc5'}" stroke-width="${t.width}" stroke-linecap="round" stroke-linejoin="round" opacity=".8"/>`);
for(const p of [...b.pads,...b.vias.map(v=>({...v,w:v.diameter,h:v.diameter,shape:'circle'}))]){if(p.shape==='rect')svg.push(`<rect x="${p.x-p.w/2}" y="${p.y-p.h/2}" width="${p.w}" height="${p.h}" fill="#d9bc70"/>`);else svg.push(`<circle cx="${p.x}" cy="${p.y}" r="${p.w/2}" fill="#d9bc70"/>`);if(p.drill)svg.push(`<circle cx="${p.x}" cy="${p.y}" r="${p.drill/2}" fill="#111"/>`);}
for(const s of fabSilk)svg.push(`<polyline points="${s.points.map(p=>`${p.x},${p.y}`).join(' ')}" fill="none" stroke="white" stroke-width="${s.width}" stroke-linecap="round"/>`);
for(const h of b.holes)svg.push(`<circle cx="${h.x}" cy="${h.y}" r="${h.drill/2}" fill="white"/>`);
svg.push('</svg>');fs.writeFileSync(new URL('./row-pcb-preview.svg',import.meta.url),svg.join('\n'));
fs.writeFileSync(new URL('./row-bom.csv',import.meta.url),'Reference,Value,Footprint,Quantity\n'+b.components.map(c=>`${c.ref},${c.value},${c.pkg},1`).join('\n'));
console.log(JSON.stringify({easyedaObjects:shapes.length,gerberFiles:10,silkSegments:silk.length}));
