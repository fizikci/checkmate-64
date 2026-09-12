import {parts, dimensions} from './row-circuit.mjs';
export const board = {...dimensions, revision:'A-PRELIMINARY', components:[], pads:[], tracks:[], vias:[], holes:[], silk:[]};
const round=n=>Math.round(n*10000)/10000;
const get=ref=>parts.find(p=>p.ref===ref);
function component(ref,x,y,pkg,pads,body){
 const circuit=get(ref); if(!circuit)throw Error(ref);
 board.components.push({ref,value:circuit.value,x,y,pkg,body});
 for(const p of pads) board.pads.push({...p,x:round(x+p.x),y:round(y+p.y),ref,net:circuit.pins[p.n],layer:p.layer??11});
}
const th=(n,x,y,w=1.8,h=1.8,drill=.9)=>({n,x,y,w,h,drill,shape:n===1?'rect':'circle'});
function axial(ref,x,y){component(ref,x,y,'Axial_DIN0207_P10.16mm',[th(1,-5.08,0),th(2,5.08,0)],{w:6.5,h:2.5});}
function ceramic(ref,x,y){component(ref,x,y,'Ceramic_P5.08mm',[th(1,-2.54,0),th(2,2.54,0)],{w:6,h:3});}
for(let i=0;i<8;i++){
 const x=25.4+i*50.8;
 // Spread sensor leads to 2.54 mm. Body is laid flat, branded face toward the magnet.
 // Final lead bend and sensor height depend on the actual wooden board.
 component(`U${i+1}`,x,25.4,'A3144_formed_P2.54mm',[th(1,-2.54,6),th(2,0,6),th(3,2.54,6)],{w:6,h:5});
 ceramic(`C${i+1}`,x-2.54,36.4);
 axial(`R${i+1}`,x+10,30.5);
 for(let c=0;c<2;c++){
  const d=i+1+8*c,dx=x+(c?7:-7);
  component(`D${d}`,dx,10,'LED_D5.0mm_P2.54mm',[th(1,-1.27,0),th(2,1.27,0)],{w:5.8,h:5.8});
  axial(`R${d+8}`,dx,17);
 }
}
// DIP-16 rotated in the board plane: its long axis runs along the row.
const dp=[];for(let i=0;i<8;i++){dp.push(th(i+1,-8.89+i*2.54,3.81));dp.push(th(16-i,-8.89+i*2.54,-3.81));}
component('U9',203.2,39,'DIP16_W7.62mm',dp,{w:21,h:9.6});
for(let j=0;j<2;j++){
 const pads=[];for(let i=0;i<8;i++){
  pads.push({n:i+1,x:-2.275+i*.65,y:2.9,w:.45,h:1.5,drill:0,shape:'rect',layer:1});
  pads.push({n:16-i,x:-2.275+i*.65,y:-2.9,w:.45,h:1.5,drill:0,shape:'rect',layer:1});
 }
 component(`U${10+j}`,j?254:152.4,40,'TSSOP16_PW_4.4x5mm_P0.65mm',pads,{w:5,h:4.4});
}
ceramic('C9',196.85,32.5);
for(let j=0;j<2;j++)component(`C${10+j}`,j?248.6:147,40,'Ceramic_P5.08mm_Vertical',[th(1,0,2.54),th(2,0,-2.54)],{w:3,h:6});
component('C12',10,38,'Radial_D6.3mm_P2.5mm',[th(1,-1.25,0),th(2,1.25,0)],{w:6.3,h:6.3});
axial('R25',44,40);axial('R26',62,40);axial('R27',80,40);
for(let j=1;j<=2;j++){
 const pads=[];for(let i=0;i<5;i++){pads.push(th(2*i+1,-1.27,(i-2)*2.54,1.9,1.9,1));pads.push(th(2*i+2,1.27,(i-2)*2.54,1.9,1.9,1));}
 component(`J${j}`,j===1?6:400.4,22,'Header_2x05_P2.54mm',pads,{w:5.1,h:12.7});
}
// Preliminary M3 clearance locations: away from sensors and LED holes.
for(const x of [4,101.6,304.8,402.4])for(const y of [4,46.8])board.holes.push({x,y,drill:3.2,keepout:3.2});
if(board.components.length!==parts.length)throw Error('Missing component');
export default board;
