// Circuit Karts relay server. Run: npm i ws && node server.js
const http=require('http'),fs=require('fs'),path=require('path'),crypto=require('crypto'),{WebSocketServer}=require('ws');
const KEY=process.env.OWNER_KEY||'',fails={};setInterval(()=>{for(const k in fails)delete fails[k]},6e5);
const okKey=k=>{if(!KEY||typeof k!='string')return false;const h=x=>crypto.createHash('sha256').update(x).digest();return crypto.timingSafeEqual(h(k),h(KEY))};
const modSrc=()=>{for(const f of['/etc/secrets/mod.js',path.join(__dirname,'mod.js')])try{return fs.readFileSync(f,'utf8')}catch(e){}return null};
const PORT=process.env.PORT||8080,srv=http.createServer((q,res)=>{const h='https://'+q.headers.host;if(q.url=='/owner'){const ip=String(q.headers['x-forwarded-for']||q.socket.remoteAddress).split(',')[0];if((fails[ip]||0)>=10){res.writeHead(429);return res.end()}if(okKey(q.headers['x-owner-key'])){const m=modSrc();res.writeHead(m?200:404,{'Content-Type':'application/javascript','Cache-Control':'no-store'});return res.end(m||'')}fails[ip]=(fails[ip]||0)+1;res.writeHead(403);return res.end()}if(q.url=='/robots.txt'){res.writeHead(200,{'Content-Type':'text/plain'});return res.end('User-agent: *\nAllow: /\nSitemap: '+h+'/sitemap.xml\n')}if(q.url=='/sitemap.xml'){res.writeHead(200,{'Content-Type':'application/xml'});return res.end('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>'+h+'/</loc></url></urlset>')}fs.readFile(path.join(__dirname,'index.html'),(e,d)=>{res.writeHead(e?404:200,{'Content-Type':'text/html'});res.end(e?'not found':d)})}),wss=new WebSocketServer({server:srv}),rooms={};let nid=1;
const send=(w,o)=>w.readyState==1&&w.send(JSON.stringify(o));
function info(r){const pl=[...r.m.values()].map(p=>({id:p.id,name:p.name,ci:p.ci,kc:p.kc}));for(const p of r.m.values())send(p.ws,{t:'room',code:r.code,id:p.id,host:r.host,players:pl})}
wss.on('connection',ws=>{const me={ws,id:nid++,room:null};
 ws.on('message',d=>{let m;try{m=JSON.parse(d)}catch{return}
  if(m.t=='auth'){me.owner=okKey(m.key);return}
  if(m.t=='create'||m.t=='join'){if(me.room)return;let r;
   if(m.t=='create'){let c;do{c=Math.random().toString(36).slice(2,6).toUpperCase()}while(rooms[c]);r=rooms[c]={code:c,host:me.id,m:new Map()}}
   else{r=rooms[m.code];if(!r)return send(ws,{t:'err',m:'Room not found'});if(r.m.size>=8)return send(ws,{t:'err',m:'Room full'})}
   Object.assign(me,{name:String(m.name||'Player').slice(0,12),ci:(m.ci|0)==10&&!me.owner?0:m.ci|0,kc:m.kc|0,room:r});r.m.set(me.id,me);info(r)}
  else if(me.room){const r=me.room;
   if(m.t=='start'&&r.host===me.id){for(const p of r.m.values())send(p.ws,m)}
   else if(m.t=='st'||m.t=='ev'){for(const p of r.m.values())if(p!==me)send(p.ws,m)}}});
 ws.on('close',()=>{const r=me.room;if(!r)return;r.m.delete(me.id);if(!r.m.size)delete rooms[r.code];else{if(r.host===me.id)r.host=[...r.m.keys()][0];info(r)}})});
srv.listen(PORT,()=>console.log('Circuit Karts on http://localhost:'+PORT));
