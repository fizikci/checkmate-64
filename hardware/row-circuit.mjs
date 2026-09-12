// Electrical pin map shared by the PCB generator and its connectivity checks.
// Physical packages are intentionally separate from this circuit definition.
export const parts = [];
const add = (ref, value, pins) => parts.push({ref, value, pins});
for (let i = 0; i < 8; i++) {
  const n = i + 1;
  add(`U${n}`, 'A3144', {1:'+5V', 2:'GND', 3:`HALL${i}`});
  add(`R${n}`, '10k', {1:'+5V', 2:`HALL${i}`});
  add(`C${n}`, '100nF', {1:'+5V', 2:'GND'});
  for (let color = 0; color < 2; color++) {
    const d = n + color * 8;
    const cathode = `${color ? 'GREEN' : 'RED'}${i}`;
    add(`R${d+8}`, '1k', {1:'+5V', 2:`ANODE${d}`});
    add(`D${d}`, color ? 'GREEN' : 'RED', {1:cathode, 2:`ANODE${d}`});
  }
}
const hp = {1:'HALL_LOAD_N',2:'HALL_CLK',7:null,8:'GND',9:'HALL_SER_OUT',10:'HALL_SER_IN',15:'GND',16:'+5V'};
[11,12,13,14,3,4,5,6].forEach((pin,i) => hp[pin] = `HALL${i}`);
add('U9','74HC165N',hp);
for (let color = 0; color < 2; color++) {
  const pins = {1:'+5V',2:color?'LED_LINK':'LED_SER_IN',7:'LED_CLEAR_N',8:'LED_OE_N',9:color?'LED_SER_OUT':'LED_LINK',10:'LED_LATCH',15:'LED_CLK',16:'GND'};
  [3,4,5,6,11,12,13,14].forEach((pin,i) => pins[pin] = `${color?'GREEN':'RED'}${i}`);
  add(`U${10+color}`,'TLC6C598',pins);
}
for (let i = 9; i <= 11; i++) add(`C${i}`,'100nF',{1:'+5V',2:'GND'});
add('C12','10uF',{1:'+5V',2:'GND'});
add('R25','10k',{1:'+5V',2:'LED_OE_N'});
add('R26','10k',{1:'LED_CLEAR_N',2:'GND'});
add('R27','100k',{1:'HALL_SER_IN',2:'GND'});
for (let i=1;i<=2;i++) add(`J${i}`,'ROW INTERFACE',{
  1:'+5V',2:'GND',3:'HALL_LOAD_N',4:'HALL_CLK',
  5:i===1?'HALL_SER_IN':'HALL_SER_OUT',6:'LED_CLK',7:'LED_LATCH',
  8:'LED_CLEAR_N',9:'LED_OE_N',10:i===1?'LED_SER_IN':'LED_SER_OUT'
});
export const nets = {};
for (const part of parts) for (const [pin,net] of Object.entries(part.pins)) {
  if (net !== null) (nets[net] ??= []).push(`${part.ref}-${pin}`);
}
export const dimensions = {squarePitch:50.8, boardWidth:406.4, boardHeight:50.8};
