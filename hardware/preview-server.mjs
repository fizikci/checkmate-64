import http from 'node:http';
import fs from 'node:fs';
const base=new URL('./',import.meta.url);
const esc=s=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
http.createServer((req,res)=>{
 if(req.url==='/start'){res.setHeader('Content-Type','text/html');return res.end('<title>PCB review</title><a href="/">Open PCB review and source</a>');}
 if(req.url==='/row.svg'){res.setHeader('Content-Type','image/svg+xml');return res.end(fs.readFileSync(new URL('row-pcb-preview.svg',base)));}
 if(req.url!=='/'){res.writeHead(404);return res.end();}
 res.setHeader('Content-Type','text/html;charset=utf-8');res.setHeader('Cache-Control','no-store');
 res.end(`<html><head><title>Checkmate PCB fabrication review</title></head><body style="font-family:Arial;background:#eee"><h1>Checkmate row PCB — revision A</h1><p>406.4 × 50.8 mm. Two layers. Review before ordering.</p><img src="/row.svg" style="width:100%;background:white"><p>Scroll horizontally below to inspect the layout at larger scale.</p><div style="overflow:auto"><img src="/row.svg" style="width:3200px;max-width:none"></div><h2>Editable EasyEDA PCB source</h2><textarea id="pcb-source" style="width:98%;height:180px">${esc(fs.readFileSync(new URL('row-pcb-easyeda.json',base),'utf8'))}</textarea></body></html>`);
}).listen(Number(process.env.PCB_PREVIEW_PORT||8766),'127.0.0.1',()=>console.log('PCB preview ready'));
