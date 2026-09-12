"""Read fabrication files back independently and render copper/drill alignment."""
from pathlib import Path
import re, json
from PIL import Image, ImageDraw
base=Path(__file__).parent
model=json.loads((base/'row-pcb-model.json').read_text())
def read_layer(name):
    text=(base/'fabrication'/name).read_text()
    assert '%FSLAX46Y46*%' in text and '%MOMM*%' in text and text.rstrip().endswith('M02*')
    apertures={}; active=None; last=None; flashes=[]; segments=[]
    for line in text.splitlines():
        match=re.fullmatch(r'%ADD(\d+)([CR]),([\d.]+)(?:X([\d.]+))?\*%',line)
        if match:
            n,s,w,h=match.groups();apertures[int(n)]=(s,float(w),float(h or w));continue
        match=re.fullmatch(r'D(\d+)\*',line)
        if match: active=int(match[1]);assert active in apertures;continue
        match=re.fullmatch(r'X(-?\d+)Y(-?\d+)D0([123])\*',line)
        if match:
            x,y,op=match.groups();p=(int(x)/1e6,50.8-int(y)/1e6)
            if op=='3':flashes.append((p,apertures[active]))
            elif op=='1':assert last is not None;segments.append((last,p,apertures[active][1]))
            last=p
    return flashes,segments
def read_drill(name):
    text=(base/'fabrication'/name).read_text();assert 'METRIC,TZ' in text and text.rstrip().endswith('M30')
    tools={};active=None;holes=[]
    for line in text.splitlines():
        m=re.fullmatch(r'T(\d+)C([\d.]+)',line)
        if m:tools[int(m[1])]=float(m[2]);continue
        m=re.fullmatch(r'T(\d+)',line)
        if m:active=int(m[1]);continue
        m=re.fullmatch(r'X(-?[\d.]+)Y(-?[\d.]+)',line)
        if m:holes.append((float(m[1]),50.8-float(m[2]),tools[active]))
    return holes
top=read_layer('row.GTL');bottom=read_layer('row.GBL');mask=read_layer('row.GTS');silk=read_layer('row.GTO');outline=read_layer('row.GKO')
pth=read_drill('row-PTH.DRL');npth=read_drill('row-NPTH.DRL')
assert len(top[0])==len(model['pads'])+len(model['vias'])
assert len(bottom[0])==sum(p['layer']==11 for p in model['pads'])+len(model['vias'])
assert len(pth)==sum(p['drill']>0 for p in model['pads'])+len(model['vias'])
assert len(npth)==8 and all(abs(h[2]-3.2)<1e-6 for h in npth)
def rounded_holes(items):
    return sorted(tuple(round(v,3) for v in item) for item in items)
expected_pth=[(p['x'],p['y'],p['drill']) for p in model['pads'] if p['drill']>0]+[(v['x'],v['y'],v['drill']) for v in model['vias']]
assert rounded_holes(pth)==rounded_holes(expected_pth), 'Plated drill coordinates/diameters differ from pads'
assert rounded_holes(npth)==rounded_holes([(h['x'],h['y'],h['drill']) for h in model['holes']]), 'Mounting drill coordinates differ'
coords=[p for a,c,w in outline[1] for p in (a,c)]
assert min(p[0] for p in coords)==0 and max(p[0] for p in coords)==406.4
assert min(p[1] for p in coords)==0 and max(p[1] for p in coords)==50.8
scale=12
im=Image.new('RGB',(round(406.4*scale),round(50.8*scale)), '#173d35');draw=ImageDraw.Draw(im)
def point(p):return tuple(round(c*scale) for c in p)
def layer(data,color,flash_color=None):
    flashes,segments=data
    for a,c,w in segments:
        draw.line([point(a),point(c)],fill=color,width=max(1,round(w*scale)))
        for x,y in (a,c):
            r=w*scale/2;xx,yy=x*scale,y*scale;draw.ellipse((xx-r,yy-r,xx+r,yy+r),fill=color)
    for (x,y),(s,w,h) in flashes:
        box=((x-w/2)*scale,(y-h/2)*scale,(x+w/2)*scale,(y+h/2)*scale)
        (draw.rectangle if s=='R' else draw.ellipse)(box,fill=flash_color or color)
layer(bottom,'#4e7bb8','#d8b96d');layer(top,'#d06b4e','#d8b96d');layer(silk,'white')
for x,y,d in pth+npth:
    r=d/2;draw.ellipse(((x-r)*scale,(y-r)*scale,(x+r)*scale,(y+r)*scale),fill='#101916' if d<3 else 'white')
im.save(base/'row-gerber-preview.png')
im.crop((round(135*scale),round(27*scale),round(220*scale),round(50.8*scale))).save(base/'row-gerber-detail.png')
report={'status':'PASS','outline_mm':[406.4,50.8],'top_flashes':len(top[0]),'bottom_flashes':len(bottom[0]),'plated_holes':len(pth),'nonplated_holes':len(npth),'npth_diameter_mm':3.2,'format':'RS-274X mm 4.6; Excellon mm explicit decimal'}
(base/'gerber-check-report.json').write_text(json.dumps(report,indent=2));print(json.dumps(report))
