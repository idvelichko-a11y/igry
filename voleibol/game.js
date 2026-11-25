/* Агроволейбол: 1 на 1 і 2 на 2 — комп'ютер, на одній клавіатурі, кімната до 4 людей за одним посиланням */
(function(){
"use strict";
const $=id=>document.getElementById(id), TAU=Math.PI*2, clamp=(v,a,b)=>v<a?a:v>b?b:v;
const VER=(()=>{ try{ const m=/game\.js\?v=(\d+)/.exec(document.currentScript.src); return m?+m[1]:0; }catch(e){ return 0; } })();
(async()=>{ try{ const t=await (await fetch(location.pathname+'?fresh='+Date.now(),{cache:'no-store'})).text(), m=/game\.js\?v=(\d+)/.exec(t), nv=m?+m[1]:0; let done=''; try{ done=sessionStorage.getItem('pz_vol_upd')||''; }catch(e){}
  if(nv>VER&&done!==String(nv)){ try{ sessionStorage.setItem('pz_vol_upd',String(nv)); }catch(e){} location.reload(); } }catch(e){} })();
const cv=$('c'); let ctx=cv.getContext('2d');
let BOTE=8; const RB=3.2, NH=12, NR=.7, GB=55, GP=115, VB=43, WIN=11;
const HOMES={1:[[25],[75]],2:[[14,36],[86,64]]};   /* [бік][номер у команді]: 0 — задній, 1 — передній */
const CH=[
 {id:'corn', n:'Кукурудза', H:16, rh:3, rs:3, sp:20, jv:40, pw:1.06, fw:.25, cannon:1, st:[5,2,3,3], sk:'Удар у стрибку', d:'Найвища: дістає м\'яч над сіткою. У стрибку б\'є потужніше. Повільна.'},
 {id:'wheat', n:'Пшениця', H:10, rh:3.2, rs:1.6, sp:35, jv:48, pw:1, fw:.3, dbl:1, st:[2,5,5,2], sk:'Подвійний стрибок', d:'Найшвидша і вміє стрибнути ще раз у повітрі. Маленька, удар слабший.'},
 {id:'sun', n:'Соняшник', H:12.5, rh:4.8, rs:1.4, sp:27, jv:36, pw:1.2, fw:.45, st:[3,3,2,5], sk:'Найсильніший удар', d:'Б\'є найсильніше і широкою головою легко дістає м\'яч. Стрибає низько.'},
];
const STN=['Зріст','Швидкість','Стрибок','Удар'];

/* ---------- стан ---------- */
const G={mode:'menu',kind:'bot',fmt:1,myId:0,flip:false,P:[],ball:{x:25,y:20,vx:0,vy:0,rot:0},bd:{x:25,y:20},score:[0,0],phase:'serve',pT:0,srvId:0,sIdx:[0,0],touch:0,lastSide:-1,
  owner:0,epoch:0,decl:false,t:0,serveY:20,banner:'',bT:0,rtt:0,over:false,puffs:[],res:'',hoT:0,ballSide:0};
let myCh=0; try{const v=+localStorage.getItem('pz_vol_ch'); if(v>=0&&v<3) myCh=v;}catch(e){}
let myFmt=1; try{const v=+localStorage.getItem('pz_vol_fmt'); if(v===2) myFmt=2;}catch(e){}
const key={}, tin={l:false,r:false}, tin2={l:false,r:false}, jq=[false,false];
const coarse=(()=>{try{return matchMedia('(pointer:coarse)').matches;}catch(e){return false;}})(); if(coarse) document.body.classList.add('touch');
let autoBig=false, fsTried=false, wl=null;
function mkP(pl,k){ const side=pl.team?1:0, hx=HOMES[G.fmt][side][k]; return {id:pl.id|0,side:side,k:k,home:hx,ch:clamp(pl.ch|0,0,2),bot:!!pl.bot,local:false,ctl:0,x:hx,y:0,vx:0,vy:0,gr:true,jn:0,cd:0,sq:0,rp:null}; }
function byId(id){ return G.P.find(p=>p.id===id); }
function devOf(p){ return p.bot?0:p.id; }
function team(side){ return G.P.filter(p=>p.side===side).sort((a,b)=>a.k-b.k); }
const meP=()=>byId(G.myId)||G.P[0]||{side:0,id:-1};

/* ---------- фізика ---------- */
function updP(p,dt,dir,jp){ const c=CH[p.ch]; p.vx+=(dir*c.sp-p.vx)*Math.min(1,dt*16);
  if(jp){ if(p.gr){p.vy=c.jv;p.gr=false;p.jn=1;beep(300,0,.08,'sine',.07);} else if(c.dbl&&p.jn<2){p.vy=c.jv*.85;p.jn=2;G.puffs.push({x:p.x,y:p.y,t:0});beep(420,0,.08,'sine',.07);} }
  p.vy-=GP*dt; p.x+=p.vx*dt; p.y+=p.vy*dt;
  if(p.y<=0){ if(!p.gr&&p.vy<-25)p.sq=.16; p.y=0;p.vy=0;p.gr=true;p.jn=0; }
  const w=Math.max(c.rh,c.rs); p.x=clamp(p.x,p.side?50+NR+w:w,p.side?100-w:50-NR-w); if(p.cd>0)p.cd-=dt; if(p.sq>0)p.sq-=dt; }
function ballFree(b,dt){ b.vy-=GB*dt; b.x+=b.vx*dt; b.y+=b.vy*dt; b.rot+=b.vx*dt*.22;
  if(b.x<RB){b.x=RB;b.vx=Math.abs(b.vx)*.85;} if(b.x>100-RB){b.x=100-RB;b.vx=-Math.abs(b.vx)*.85;}
  const cy=clamp(b.y,0,NH), dx=b.x-50, dy=b.y-cy, d=Math.hypot(dx,dy), R=RB+NR;
  if(d<R){ let nx,ny; if(d>1e-4){nx=dx/d;ny=dy/d;} else {nx=b.vx>0?-1:1;ny=0;} b.x=50+nx*R; b.y=cy+ny*R; const vn=b.vx*nx+b.vy*ny; if(vn<0){b.vx-=1.7*vn*nx;b.vy-=1.7*vn*ny;} return true; }
  return false; }
function hitP(b,p){ const c=CH[p.ch], cx=p.x; let cy=p.y+c.H-c.rh, r=c.rh, dx=b.x-cx, dy=b.y-cy, d=Math.hypot(dx,dy);
  if(d>=RB+r){ cy=clamp(b.y,p.y+c.rs,Math.max(p.y+c.rs,p.y+c.H-c.rh)); r=c.rs; dx=b.x-cx; dy=b.y-cy; d=Math.hypot(dx,dy); if(d>=RB+r) return false; }
  let nx=d>1e-4?dx/d:0, ny=d>1e-4?dy/d:1; b.x=cx+nx*(RB+r+.02); b.y=cy+ny*(RB+r+.02);
  if(p.cd>0) return false;
  const spike=!p.gr&&Math.abs(p.x-50)<15&&b.y>NH+1.5; if(spike){ const s=p.side?-1:1; nx=s*.93; ny=-.36; }
  else { const f=c.fw, s=p.side?-1:1; nx+=s*f; ny+=f*.5; const l=Math.hypot(nx,ny)||1; nx/=l; ny/=l; }
  const sp=VB*c.pw*((c.cannon&&!p.gr)?1.2:1)*(spike?1.12:1); if(spike){ G.spikeT=.5; } b.vx=nx*sp+p.vx*.25; b.vy=ny*sp+Math.max(0,p.vy)*.2; p.cd=.2; return true; }
function isOver(){const a=G.score[0],b=G.score[1]; return (a>=WIN||b>=WIN)&&(Math.abs(a-b)>=2||a>=15||b>=15);}
function say(s,t){G.banner=s;G.bT=t||1.4;}
function mySide(){ return G.kind==='local'?0:meP().side; }
function nameP(p){ if(G.kind==='local') return p.side===0?'Лівий':'Правий'; if(p.id===G.myId) return 'Ти'; if(p.bot) return 'Комп\'ютер'; return 'Гравець '+(p.id+1); }
function sideName(s){ if(G.kind==='local') return s===0?'Лівий':'Правий'; const t=team(s), mine=s===mySide(); if(G.fmt===1) return nameP(t[0]); return mine?'Твоя команда':'Суперники'; }
function point(w,why){ lastWin=w; G.score[w]++; G.phase='point'; G.pT=1.5; G.over=isOver(); G.decl=true;
  const prev=byId(G.srvId), served=prev?prev.side:-1; if(served!==w){ const n=team(w).length; if(n) G.sIdx[w]=(G.sIdx[w]+1)%n; }
  if(G.kind==='net'){ G.epoch++; send({t:'pt',e:G.epoch,sc:G.score,w:w,why:why}); }
  pointFx(w); }
function pointFx(w){ const mine=G.kind!=='local'&&w===mySide(); say(G.kind==='local'?'Очко: '+sideName(w).toLowerCase():mine?(G.fmt===1?'Очко тобі!':'Очко твоїй команді!'):'Очко суперника',1.4);
  beep(880,0,.12,'square',.07); beep(mine||G.kind==='local'?1175:660,.13,.2,'square',.07); }
function serverOf(side){ const t=team(side); return t.length?t[(G.sIdx[side]||0)%t.length]:null; }
function startServe(id){ const sp=byId(id)||G.P[0]; G.phase='serve'; G.srvT=0; G.srvId=sp.id; G.owner=devOf(sp); G.touch=0; G.lastSide=-1; G.decl=false; G.hoT=0;
  const b=G.ball; b.x=sp.home; G.serveY=CH[sp.ch].H+6.5; b.y=G.serveY; b.vx=b.vy=0; G.ballSide=sp.side;
  for(const p of G.P) if(p.local){p.x=p.home;p.y=0;p.vx=p.vy=0;p.gr=true;p.jn=0;}
  say('Подає: '+nameP(sp).toLowerCase(),1.1); }
function ballAuth(dt,cols){ const b=G.ball;
  if(G.phase==='serve'){ b.vx=b.vy=0; b.y=G.serveY+Math.sin(G.t*4)*.4; G.srvT+=dt; if(G.srvT>7){ G.phase='rally'; G.lastSide=-1; } }
  else if(ballFree(b,dt)) tick(170,.04);
  for(const p of cols){ if(hitP(b,p)){ beep(190+CH[p.ch].pw*90,0,.09,'triangle',.16);
      if(G.phase==='serve') G.phase='rally';
      if(G.phase==='rally'){ if(G.lastSide===p.side) G.touch++; else {G.lastSide=p.side;G.touch=1;} } } }
  const s=Math.hypot(b.vx,b.vy); if(s>82){b.vx*=82/s;b.vy*=82/s;}
  if(b.y<=RB){ b.y=RB; if(G.phase==='rally'){ tick(90,.12); point(b.x<50?1:0,'land'); b.vy=Math.abs(b.vy)*.5; b.vx*=.7; return; } b.vy=Math.abs(b.vy)*.55; b.vx*=.8; } }
let tickCd=0; function tick(f,v){ if(tickCd>0)return; tickCd=.08; beep(f,0,.06,'sine',v); }

/* ---------- комп'ютер ---------- */
function landX(c){ const b=G.ball, f={x:b.x,y:b.y,vx:b.vx,vy:b.vy,rot:0}, hy=c.H+RB*.5; if(G.phase!=='rally') return null; for(let i=0;i<150;i++){ ballFree(f,.02); if(f.y<=hy&&f.vy<0) return f.x; } return null; }
function botStep(p,dt){ const bot=p.bot2||(p.bot2={t:Math.random()*.2,tx:p.home,st:0,err:0}); const b=G.ball, c=CH[p.ch], s=p.side?1:-1; bot.t-=dt; let jump=false;
  if(bot.t<=0){ bot.t=.2; bot.err=(Math.random()-.5)*BOTE*(G.fmt===2?1.6:1)+(Math.random()<.1?(Math.random()-.5)*16:0);
    if(G.phase==='serve'&&G.srvId===p.id){ bot.st+=.1; bot.tx=b.x+s*1.5; }
    else { bot.st=0; const land=landX(c);
      if(land!==null&&((land>50)===(p.side===1))){ const mates=team(p.side), split=mates.length>1?(mates[0].home+mates[1].home)/2:null;
        let resp=p; if(mates.length>1){ let best=1e9; for(const q of mates){ const inZone=split===null||((Math.abs(land-50)<Math.abs(split-50))===(q.k===1)); const sc=Math.abs(q.x-land)+(inZone?0:9); if(sc<best){ best=sc; resp=q; } } }
        if(resp===p){ const dn=Math.abs(land-50), th=dn<10?.05:dn<25?.3:.5; bot.tx=land+s*(RB+c.rh)*Math.sin(th)+bot.err; } else bot.tx=p.home; }
      else bot.tx=p.home+s*(G.fmt===1?3:1); } }
  const dx=bot.tx-p.x, dir=Math.abs(dx)<.7?0:Math.sign(dx);
  if(G.phase==='serve'&&G.srvId===p.id){ if(bot.st>.9&&Math.abs(dx)<1) jump=true; }
  else if(G.phase==='rally'&&((b.x>50)===(p.side===1))){ const top=p.y+c.H, gap=b.y-RB-top; if(Math.abs(b.x-p.x)<5.5&&b.vy<0&&gap>1.5&&gap<c.jv*c.jv/(2*GP)*.9&&Math.random()<.5) jump=true; }
  updP(p,dt,dir,jump&&(p.gr||(c.dbl&&p.jn<2&&p.vy<0&&Math.random()<.2))); }

/* ---------- крок гри ---------- */
function dirOf(p){ if(G.kind==='local') return p.side===0?(((key.d||tin.r)?1:0)-((key.a||tin.l)?1:0)):(((key.right||tin2.r)?1:0)-((key.left||tin2.l)?1:0));
  const d=((key.right||key.d||tin.r)?1:0)-((key.left||key.a||tin.l)?1:0); return G.flip?-d:d; }
function handoff(){ const b=G.ball; if(G.phase!=='rally'||G.hoT>0) return; const side=b.x<50?0:1;
  let best=null, bd=1e9, mine=1e9; for(const p of G.P){ if(p.side!==side) continue; const d=Math.abs(p.x-b.x); if(d<bd){ bd=d; best=p; } if(devOf(p)===G.myId&&d<mine) mine=d; }
  if(!best) return; const dev=devOf(best); if(dev===G.myId) return;
  const crossed=side!==G.ballSide&&Math.abs(b.x-50)>1;
  if(crossed||mine-bd>4){ G.epoch++; G.owner=dev; G.hoT=.25; send({t:'ho',e:G.epoch,to:dev,b:pk(b),ls:G.lastSide,tc:G.touch}); } }
function step(dt){ G.t+=dt; if(tickCd>0)tickCd-=dt; if(G.hoT>0) G.hoT-=dt;
  for(const p of G.P){ if(!p.local){ const r=p.rp; if(r){ r.age+=dt; const a=Math.min(r.age,.12), k=Math.min(1,dt*22); p.x+=(r.x+r.vx*a-p.x)*k; p.y+=(Math.max(0,r.y+r.vy*a)-p.y)*k; p.vx=r.vx; p.vy=r.vy; p.gr=r.y<=.01; } continue; }
    if(p.bot||(G.auto&&p.id===G.myId)) botStep(p,dt); else updP(p,dt,dirOf(p),jq[G.kind==='local'?p.side:0]); }
  jq[0]=jq[1]=false;
  if(G.kind==='net'){ if(G.owner===G.myId){ ballAuth(dt,G.P.filter(p=>p.local)); handoff(); }
    else { const b=G.ball; if(G.phase!=='serve'){ ballFree(b,dt); if(b.y<=RB){b.y=RB;b.vy=Math.abs(b.vy)*.5;b.vx*=.8;} } } }
  else ballAuth(dt,G.P);
  if(Math.abs(G.ball.x-50)>1) G.ballSide=G.ball.x<50?0:1;
  const k=G.kind==='net'&&G.owner!==G.myId?Math.min(1,dt*16):1; G.bd.x+=(G.ball.x-G.bd.x)*k; G.bd.y+=(G.ball.y-G.bd.y)*k;
  if(G.phase==='point'){ G.pT-=dt; if(G.pT<=0){ if(G.over){ endMatch(); } else if(G.kind!=='net'){ startServe(serverOf(lastWin).id); }
      else if(G.decl||(isHost&&G.pT<-3)){ G.decl=false; const sp=serverOf(lastWin); G.epoch++; send({t:'sv',e:G.epoch,srv:sp.id,si:G.sIdx}); startServe(sp.id); } } }
  for(const f of G.puffs) f.t+=dt; if(G.puffs.length&&G.puffs[0].t>.4) G.puffs.shift();
  if(G.bT>0) G.bT-=dt; }
let lastWin=0;
/* cfg: {kind, fmt:1|2, myId, players:[{id,ch,team,bot}]} */
function startMatch(cfg){ G.kind=cfg.kind; G.fmt=cfg.fmt===2?2:1; G.myId=cfg.myId|0; const cnt=[0,0]; G.P=[];
  for(const pl of cfg.players){ const sd=pl.team?1:0; if(cnt[sd]>=G.fmt) continue; const p=mkP(pl,cnt[sd]++); p.local=G.kind!=='net'||p.id===G.myId||(p.bot&&isHost); G.P.push(p); }
  G.flip=G.kind!=='local'&&meP().side===1; G.score=[0,0]; G.over=false; G.epoch=1; G.puffs=[]; G.sIdx=[0,0]; G.res=''; lastWin=0; G.ballSide=0;
  G.mode='play'; fsTried=false; if(coarse){ autoBig=true; setBig(true,true); } wake(); startServe(serverOf(0).id); G.bd.x=G.ball.x; G.bd.y=G.ball.y; ui(); }
function endMatch(){ const w=G.score[0]>G.score[1]?0:1, mine=G.kind==='local'||w===mySide(); if(mine) [523,659,784,1047].forEach((f,i)=>beep(f,i*.14,.2,'triangle',.14)); else beep(160,0,.5,'sawtooth',.08);
  const L=G.flip?1:0; G.res=(G.kind==='local'?'Переміг '+sideName(w).toLowerCase():(mine?'Перемога!':'Поразка'))+' · '+G.score[L]+' : '+G.score[1-L];
  if(G.kind==='net'){ G.mode='room'; if(isHost){ R.playing=false; roomCast(); } } else G.mode='over'; ui(); }

/* ---------- мережа: кімната до 4 людей; усе йде через господаря ---------- */
const PFX='pz-agrovol-'; let peer=null, hostConn=null, conns={}, code='', lag=0, sendT=0, joinTO=null, netState='', isHost=false, inRoom=false, lastHost=0;
const Q=new URLSearchParams(location.search), isLoc=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
if(isLoc&&Q.get('lag')) lag=+Q.get('lag')||0;
const R={P:[],fmt:1,playing:false};
function peerOpts(){ const s=Q.get('srv'); if(s&&isLoc){const a=s.split(':'); return {host:a[0],port:+a[1],path:'/',secure:false,debug:1};} return {debug:1}; }
function mkCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s;}
function pk(b){return [Math.round(b.x*100)/100,Math.round(b.y*100)/100,Math.round(b.vx*100)/100,Math.round(b.vy*100)/100];}
function rawSend(c,m){ if(c&&c.open){ try{c.send(m);}catch(e){} } }
function send(m,to){ if(!inRoom) return; if(isHost){ m.from=0; if(to==null){ for(const k in conns) rawSend(conns[k],m); } else if(to!==0) rawSend(conns[to],m); } else { if(to!=null) m.to=to; rawSend(hostConn,m); } }
const PRIV={pick:1,hello:1,pi:1};
function hostRecv(k,m){ if(!m||typeof m!=='object') return; m.from=k; if(m.to!=null&&(m.to|0)!==0){ rawSend(conns[m.to|0],m); return; } if(!PRIV[m.t]) for(const j in conns) if(+j!==k) rawSend(conns[j],m); onMsg(m); }
function netClose(){ clearTimeout(joinTO); const cs=conns; conns={}; for(const k in cs){ try{cs[k].close();}catch(e){} } const hc=hostConn; hostConn=null; try{ if(hc) hc.close(); }catch(e){} const p=peer; peer=null; try{ if(p) p.destroy(); }catch(e){} inRoom=false; isHost=false; R.P=[]; R.playing=false; }
function netFail(msg){ netClose(); G.mode='room'; netState='err'; G.netMsg=msg; ui(); }
function roomCast(){ send({t:'room',R:{P:R.P,fmt:R.fmt,playing:R.playing}}); if(G.mode==='room') ui(); }
function canStart(){ const n=[0,1].map(t=>R.P.filter(q=>q.team===t).length); if(n[0]>R.fmt||n[1]>R.fmt) return 'У форматі '+R.fmt+' на '+R.fmt+' у команді щонайбільше '+R.fmt+(R.fmt===1?' гравець':' гравці')+'. Перейди в іншу команду або обери 2 на 2.'; return ''; }
function hostStartMatch(){ if(!isHost||R.playing||canStart()) return; const pl=R.P.map(q=>({id:q.id,ch:q.ch,team:q.team})); let bid=6; for(let t=0;t<2;t++) for(let n=R.P.filter(q=>q.team===t).length;n<R.fmt;n++) pl.push({id:bid++,ch:Math.floor(Math.random()*3),team:t,bot:true});
  pl.sort((a,b)=>a.team-b.team||(a.bot?1:0)-(b.bot?1:0)||a.id-b.id); const cfg={fmt:R.fmt,players:pl}; R.playing=true; send({t:'go',cfg:cfg}); send({t:'room',R:{P:R.P,fmt:R.fmt,playing:true}}); startMatch(Object.assign({kind:'net',myId:0},cfg)); }
function admit(c,m){ const used=R.P.map(q=>q.id); let id=-1; for(let i=1;i<4;i++) if(!used.includes(i)){ id=i; break; } if(id<0){ rawSend(c,{t:'full',from:0}); setTimeout(()=>{ try{c.close();}catch(e){} },400); return; }
  c._pid=id; conns[id]=c; const n0=R.P.filter(q=>q.team===0).length, n1=R.P.filter(q=>q.team===1).length; R.P.push({id:id,ch:clamp(m.ch|0,0,2),team:n1<n0?1:n0<n1?0:1}); rawSend(c,{t:'you',id:id,from:0}); roomCast(); }
function playerLeft(id){ const p=byId(id); if(!p||p.id===G.myId) return; p.bot=true; p.local=isHost; p.rp=null; if(G.owner===id&&isHost){ G.epoch++; G.owner=0; send({t:'ho',e:G.epoch,to:0,b:pk(G.ball),ls:G.lastSide,tc:G.touch}); } if(G.mode==='play') say('Гравець '+(id+1)+' вийшов — грає комп\'ютер',2.5); }
function drop(id){ delete conns[id]; R.P=R.P.filter(q=>q.id!==id); if(G.kind==='net'&&G.mode==='play'){ send({t:'left',id:id}); playerLeft(id); } roomCast(); }
function hostGame(){ netClose(); G.res=''; if(typeof Peer==='undefined'){ netFail('Не завантажилась бібліотека зв\'язку. Онови сторінку.'); return; } code=mkCode(); isHost=true; G.myId=0; inRoom=true; R.P=[{id:0,ch:myCh,team:0}]; R.fmt=myFmt; R.playing=false; G.mode='room'; netState='open'; ui();
  const p=new Peer(PFX+code,peerOpts()); peer=p; p.on('open',()=>{ if(peer!==p) return; netState='ok'; ui(); });
  p.on('connection',c=>{ c.on('data',m=>{ if(peer!==p) return; c._t=performance.now(); if(c._pid==null){ if(m&&m.t==='hello') admit(c,m); return; } if(lag) setTimeout(()=>hostRecv(c._pid,m),lag); else hostRecv(c._pid,m); }); const gone=()=>{ if(c._pid!=null&&conns[c._pid]===c) drop(c._pid); }; c.on('close',gone); c.on('error',gone); });
  p.on('error',e=>{ if(peer!==p) return; if(e&&e.type==='unavailable-id') hostGame(); else if(netState==='open') netFail('Немає зв\'язку із сервером знайомства ('+(e&&e.type||'помилка')+'). Перевір інтернет і спробуй ще раз.'); });
  p.on('disconnected',()=>{ try{ if(peer===p&&!p.destroyed) p.reconnect(); }catch(e){} }); }
function joinGame(c){ netClose(); G.res=''; if(typeof Peer==='undefined'){ netFail('Не завантажилась бібліотека зв\'язку. Онови сторінку.'); return; } code=c; isHost=false; G.mode='room'; netState='join'; ui();
  const p=new Peer(undefined,peerOpts()); peer=p; p.on('open',()=>{ if(peer!==p) return; const cn=p.connect(PFX+code,{serialization:'json'}); hostConn=cn;
    cn.on('open',()=>{ if(hostConn!==cn) return; clearTimeout(joinTO); inRoom=true; lastHost=performance.now(); rawSend(cn,{t:'hello',ch:myCh}); }); cn.on('data',m=>{ if(hostConn!==cn) return; lastHost=performance.now(); if(lag) setTimeout(()=>onMsg(m),lag); else onMsg(m); });
    const gone=()=>{ if(hostConn!==cn) return; netFail('Кімнату закрито або зв\'язок обірвався.'); }; cn.on('close',gone); cn.on('error',gone);
    joinTO=setTimeout(()=>{ if(netState==='join') netFail('Не вдалося з\'єднатися. Можливо, кімнату вже закрито або мережа не пропускає пряме з\'єднання.'); },15000); });
  p.on('error',e=>{ if(peer!==p||netState!=='join') return; netFail(e&&e.type==='peer-unavailable'?'Кімнату '+code+' не знайдено. Попроси господаря створити нову й надіслати посилання.':'Немає зв\'язку ('+(e&&e.type||'помилка')+'). Перевір інтернет і спробуй ще раз.'); }); }
setInterval(()=>{ if(!inRoom) return; const now=performance.now(); if(isHost){ for(const k in conns){ const c=conns[k]; if(c._t&&now-c._t>20000){ try{c.close();}catch(e){} if(conns[k]===c) drop(+k); } } } else { send({t:'pi',ts:now},0); if(lastHost&&now-lastHost>20000) netFail('Зв\'язок із кімнатою обірвався. Зайди ще раз за тим самим посиланням.'); } },2000);
function onMsg(m){ if(!m||typeof m!=='object') return; const from=m.from|0, play=G.kind==='net'&&G.mode==='play';
  switch(m.t){
   case 'you': if(!isHost) G.myId=m.id|0; break;
   case 'full': if(!isHost) netFail('У кімнаті вже четверо. Спробуй пізніше.'); break;
   case 'room': if(!isHost&&m.R&&Array.isArray(m.R.P)){ R.P=m.R.P.slice(0,4).map(q=>({id:q.id|0,ch:clamp(q.ch|0,0,2),team:q.team?1:0})); R.fmt=m.R.fmt===2?2:1; R.playing=!!m.R.playing; if(netState==='join') netState='ok'; if(G.mode==='room') ui(); } break;
   case 'pick': if(isHost&&!R.playing){ const pl=R.P.find(q=>q.id===from); if(pl){ if(m.ch!=null) pl.ch=clamp(m.ch|0,0,2); if(m.team!=null) pl.team=m.team?1:0; roomCast(); } } break;
   case 'go': if(!isHost&&m.cfg&&Array.isArray(m.cfg.players)&&m.cfg.players.some(q=>(q.id|0)===G.myId)) startMatch({kind:'net',myId:G.myId,fmt:m.cfg.fmt,players:m.cfg.players.slice(0,8).map(q=>({id:q.id|0,ch:clamp(q.ch|0,0,2),team:q.team?1:0,bot:!!q.bot}))}); break;
   case 's': { if(!play||!Array.isArray(m.p)) break; const p=byId(m.id|0); if(p&&!p.local) p.rp={x:+m.p[0],y:+m.p[1],vx:+m.p[2],vy:+m.p[3],age:0}; break; }
   case 'b': if(play&&m.e===G.epoch&&G.owner!==G.myId&&Array.isArray(m.b)){ const b=G.ball; b.x=+m.b[0];b.y=+m.b[1];b.vx=+m.b[2];b.vy=+m.b[3]; b.rot+=.05; const ph=['serve','rally','point'][m.ph]; if(ph&&!(G.phase==='point'&&ph!=='point')) G.phase=ph; G.touch=m.tc|0; G.lastSide=m.ls; } break;
   case 'ho': if(play&&m.e>G.epoch){ G.epoch=m.e; G.owner=m.to|0; const b=G.ball; b.x=+m.b[0];b.y=+m.b[1];b.vx=+m.b[2];b.vy=+m.b[3]; G.touch=m.tc|0; G.lastSide=m.ls==null?-1:m.ls; G.phase='rally'; G.hoT=.25; G.ballSide=b.x<50?0:1; } break;
   case 'pt': if(play&&m.e>G.epoch&&Array.isArray(m.sc)){ G.epoch=m.e; G.score=[m.sc[0]|0,m.sc[1]|0]; G.phase='point'; G.pT=1.5; lastWin=m.w?1:0; G.decl=false; G.owner=-1; G.over=isOver(); pointFx(lastWin); } break;
   case 'sv': if(play&&m.e>G.epoch){ G.epoch=m.e; if(Array.isArray(m.si)) G.sIdx=[m.si[0]|0,m.si[1]|0]; startServe(m.srv|0); } break;
   case 'left': if(!isHost) playerLeft(m.id|0); break;
   case 'pi': if(isHost) send({t:'po',ts:m.ts},from); break;
   case 'po': G.rtt=Math.round(performance.now()-m.ts); break;
  } }
function netFrame(dt){ if(G.kind!=='net'||!inRoom||G.mode!=='play') return; sendT+=dt; if(sendT<1/30) return; sendT=0; const r=v=>Math.round(v*100)/100;
  for(const p of G.P) if(p.local) send({t:'s',id:p.id,p:[r(p.x),r(p.y),Math.round(p.vx*10)/10,Math.round(p.vy*10)/10]});
  if(G.owner===G.myId) send({t:'b',e:G.epoch,b:pk(G.ball),ph:G.phase==='serve'?0:G.phase==='rally'?1:2,tc:G.touch,ls:G.lastSide}); }

/* ---------- звук ---------- */
let AC=null, master=null, sndOn=true;
function audioInit(){ if(AC){ if(AC.state==='suspended') AC.resume(); return; } try{AC=new (window.AudioContext||window.webkitAudioContext)(); master=AC.createGain(); master.gain.value=sndOn?.9:0; master.connect(AC.destination);}catch(e){AC=null;} }
function beep(f,delay,dur,type,vol){ if(!AC||!sndOn)return; const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); o.frequency.exponentialRampToValueAtTime(Math.max(40,f*.7),t+dur);
  g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.012); g.gain.exponentialRampToValueAtTime(.0008,t+dur); o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.05); }

/* ---------- малювання ---------- */
let W=0,H=0,u=1,HU=56,GYs=47,dpr=1;
function resize(){ const cw=cv.clientWidth, chh=cv.clientHeight; if(cw<2||chh<2)return; dpr=Math.min(2,window.devicePixelRatio||1); W=Math.round(cw*dpr); H=Math.round(chh*dpr); if(cv.width!==W||cv.height!==H){cv.width=W; cv.height=H;} u=W/100; HU=H/u;
  const res=(coarse&&document.body.classList.contains('big'))?86*dpr/u:0; GYs=HU-Math.max(Math.min(8,HU*.16),res); }
const sx=x=>G.flip?100-x:x;
function poly(p,fill,stroke,lw){ctx.beginPath();ctx.moveTo(p[0],p[1]);for(let i=2;i<p.length;i+=2)ctx.lineTo(p[i],p[i+1]);ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=lw||.15;ctx.stroke();}}
function rect(x,y,w,h,f){ctx.fillStyle=f;ctx.fillRect(x,y,w,h);}
function circ(x,y,r,f){ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.fillStyle=f;ctx.fill();}
function ell(x,y,rx,ry,f,rot){ctx.beginPath();ctx.ellipse(x,y,rx,ry,rot||0,0,TAU);ctx.fillStyle=f;ctx.fill();}
function line(x1,y1,x2,y2,c,lw){ctx.beginPath();ctx.moveTo(x1,y1);ctx.lineTo(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=lw;ctx.lineCap='round';ctx.stroke();}
function rr(x,y,w,h,r){ctx.beginPath();ctx.moveTo(x+r,y);ctx.arcTo(x+w,y,x+w,y+h,r);ctx.arcTo(x+w,y+h,x,y+h,r);ctx.arcTo(x,y+h,x,y,r);ctx.arcTo(x,y,x+w,y,r);ctx.closePath();}
function txt(s,x,y,size,col,align,weight,font){ ctx.save(); ctx.setTransform(1,0,0,1,0,0); ctx.font=(weight||600)+' '+(size*u)+'px '+(font||'Manrope, system-ui, sans-serif'); ctx.textAlign=align||'left'; ctx.textBaseline='middle'; ctx.fillStyle=col; ctx.fillText(s,x*u,y*u); const w=ctx.measureText(s).width/u; ctx.restore(); return w; }
function eyes(x,y,gap,r,lx,ly){ for(const s of [-1,1]){ circ(x+s*gap,y,r,'#fff'); circ(x+s*gap+lx*r*.42,y+ly*r*.42,r*.55,'#22292C'); } }
function smile(x,y,r,col){ ctx.beginPath(); ctx.arc(x,y,r,.15*Math.PI,.85*Math.PI); ctx.strokeStyle=col; ctx.lineWidth=.22; ctx.lineCap='round'; ctx.stroke(); }
/* персонаж малюється від ніг (0,0) угору, y від'ємний */
function drawChar(ch,lx,ly,t){ const c=ctx;
  if(ch===0){
    ell(-1.3,-.4,1.2,.6,'#5E7F3A'); ell(1.3,-.4,1.2,.6,'#5E7F3A');
    c.beginPath(); c.moveTo(-2.7,-2); c.quadraticCurveTo(-3.3,-10,-2.3,-14); c.quadraticCurveTo(0,-17.4,2.3,-14); c.quadraticCurveTo(3.3,-10,2.7,-2); c.quadraticCurveTo(0,-.6,-2.7,-2); c.fillStyle='#F2C230'; c.fill();
    c.save(); c.clip(); c.strokeStyle='rgba(180,120,10,.5)'; c.lineWidth=.14; for(let y=-15;y<-1;y+=1.25){c.beginPath();c.moveTo(-3.4,y);c.quadraticCurveTo(0,y+.7,3.4,y);c.stroke();} for(let x=-2.4;x<3;x+=1.2){c.beginPath();c.moveTo(x,-16);c.lineTo(x*1.15,-1);c.stroke();} c.restore();
    c.beginPath(); c.moveTo(0,-.4); c.quadraticCurveTo(-5.2,-3,-3.6,-9.5); c.quadraticCurveTo(-2.4,-5,0,-3.2); c.fillStyle='#6E9A40'; c.fill();
    c.beginPath(); c.moveTo(0,-.4); c.quadraticCurveTo(5.2,-3,3.6,-9.5); c.quadraticCurveTo(2.4,-5,0,-3.2); c.fillStyle='#5E8A36'; c.fill();
    for(let i=-2;i<=2;i++) line(i*.25,-15.8,i*.8+Math.sin(t*5+i)*.2,-17.6-(2-Math.abs(i))*.3,'#8A5A2B',.16);
    eyes(.4,-11.4,1.05,.85,lx,ly); smile(.4,-9.7,.8,'#7A4A12');
  } else if(ch===1){
    line(0,0,0,-4.4,'#B7A03E',.55); c.beginPath(); c.moveTo(0,-1.2); c.quadraticCurveTo(-2.6,-2,-2.4,-4.4); c.quadraticCurveTo(-1.2,-2.6,0,-2.2); c.fillStyle='#9DAA45'; c.fill();
    c.beginPath(); c.moveTo(0,-1.6); c.quadraticCurveTo(2.4,-2.2,2.2,-4.2); c.quadraticCurveTo(1.1,-2.8,0,-2.6); c.fillStyle='#8E9C3C'; c.fill();
    for(let i=-3;i<=3;i++) line(i*.5,-8.6,i*1.05+Math.sin(t*6+i)*.15,-10.9+Math.abs(i)*.25,'#D9B657',.13);
    ell(0,-6.8,2.9,3.3,'#E2B84A'); c.save(); c.beginPath(); c.ellipse(0,-6.8,2.9,3.3,0,0,TAU); c.clip(); c.strokeStyle='rgba(150,100,20,.55)'; c.lineWidth=.14;
    for(let y=-9.6;y<-3.2;y+=1.05){c.beginPath();c.moveTo(-2.6,y);c.lineTo(0,y+.9);c.lineTo(2.6,y);c.stroke();} c.restore();
    ell(-.8,-.2,.8,.4,'#8A7A2E'); ell(.8,-.2,.8,.4,'#8A7A2E');
    eyes(.3,-7.2,.85,.72,lx,ly); smile(.3,-5.8,.6,'#7A4A12');
  } else {
    line(0,0,0,-7,'#5E8A36',.9); c.beginPath(); c.moveTo(0,-2.2); c.quadraticCurveTo(-3.6,-2.6,-3.8,-5); c.quadraticCurveTo(-1.6,-4.6,0,-3.2); c.fillStyle='#6E9A40'; c.fill();
    c.beginPath(); c.moveTo(0,-3); c.quadraticCurveTo(3.4,-3.2,3.6,-5.6); c.quadraticCurveTo(1.6,-5.2,0,-4); c.fillStyle='#5E8A36'; c.fill();
    ell(-.9,-.2,.9,.45,'#4E7430'); ell(.9,-.2,.9,.45,'#4E7430');
    c.save(); c.translate(0,-7.7); for(let i=0;i<14;i++){ c.save(); c.rotate(i*TAU/14+Math.sin(t*2)*.04); c.beginPath(); c.ellipse(0,-3.75,.85,1.25,0,0,TAU); c.fillStyle=i%2?'#F4C21E':'#F7D040'; c.fill(); c.restore(); }
    c.restore(); circ(0,-7.7,3.05,'#6A4320'); circ(0,-7.7,2.6,'#7A4E26');
    eyes(.3,-8.2,1.05,.8,lx,ly); smile(.3,-6.6,.75,'#F4D58A');
  } }
function drawBall(x,y,rot){ ctx.save(); ctx.translate(x,y); ctx.beginPath(); ctx.arc(0,0,RB,0,TAU); ctx.fillStyle='#2F7D3B'; ctx.fill(); ctx.save(); ctx.clip(); ctx.rotate(rot);
  ctx.strokeStyle='#1C5227'; ctx.lineWidth=.55; for(let i=-2;i<=2;i++){ ctx.beginPath(); ctx.moveTo(i*1.45,-RB); ctx.quadraticCurveTo(i*2.3,0,i*1.45,RB); ctx.stroke(); } ctx.restore();
  ctx.beginPath(); ctx.arc(0,0,RB,0,TAU); ctx.strokeStyle='#184A22'; ctx.lineWidth=.2; ctx.stroke(); ell(-1.1,-1.3,.9,.5,'rgba(255,255,255,.35)',-.6); ctx.restore(); }
function draw(){ if(!W)return; ctx.setTransform(u,0,0,u,0,0); ctx.clearRect(0,0,100,HU);
  const HY=GYs-9, g=ctx.createLinearGradient(0,0,0,HY+2); g.addColorStop(0,'#5FA3D0'); g.addColorStop(.65,'#A9D3EA'); g.addColorStop(1,'#F3E3B8'); ctx.fillStyle=g; ctx.fillRect(0,0,100,HY+2);
  const sy=Math.max(8,HY-26); circ(84,sy,3.4,'#FFF2C2'); ell(84,sy,6.5,6.5,'rgba(255,242,194,.25)');
  for(let i=0;i<5;i++){const x=((i*27+G.t*(.8+i*.15)+i*i*5)%130)-15,y=Math.max(5,HY-30)+((i*7)%11),s=1+(i%3)*.35; ctx.fillStyle='rgba(255,255,255,.85)'; ctx.beginPath(); ctx.ellipse(x,y,5*s,1.5*s,0,0,TAU); ctx.ellipse(x-2.4*s,y-.9*s,2.6*s,1.4*s,0,0,TAU); ctx.ellipse(x+1.8*s,y-1.1*s,3*s,1.6*s,0,0,TAU); ctx.fill();}
  ctx.fillStyle='#8FB19A'; ctx.beginPath(); ctx.moveTo(0,HY+1); for(let x=0;x<=100;x+=2) ctx.lineTo(x,HY-2.2-Math.sin(x*.07)*1.6-Math.sin(x*.19+1)*.7); ctx.lineTo(100,HY+1); ctx.fill();
  ctx.fillStyle='#5E8A63'; ctx.beginPath(); ctx.moveTo(0,HY+1); for(let x=0;x<=100;x+=1) ctx.lineTo(x,HY-.5-Math.abs(Math.sin(x*.9))*.9-Math.sin(x*.13)*.5); ctx.lineTo(100,HY+1); ctx.fill();
  /* поле за майданчиком */
  const g2=ctx.createLinearGradient(0,HY,0,GYs); g2.addColorStop(0,'#D8B45C'); g2.addColorStop(1,'#C79B3F'); ctx.fillStyle=g2; ctx.fillRect(0,HY,100,GYs-HY);
  ctx.strokeStyle='rgba(160,115,35,.45)'; ctx.lineWidth=.14; for(let i=0;i<140;i++){const x=(i*7.31)%100, y=HY+.6+((i*3.7)%Math.max(1,(GYs-HY-3.4))); ctx.beginPath(); ctx.moveTo(x,y+1.3); ctx.lineTo(x+.2,y); ctx.stroke();}
  for(const bx of [9,91]){ circ(bx,HY+3.2,2.6,'#C9A04A'); ctx.beginPath(); ctx.arc(bx,HY+3.2,1.6,0,TAU); ctx.strokeStyle='#A67F2F'; ctx.lineWidth=.25; ctx.stroke(); circ(bx,HY+3.2,.5,'#A67F2F'); }
  /* майданчик у перспективі */
  poly([5,GYs-2.6, 95,GYs-2.6, 100,GYs+3.4, 100,HU, 0,HU, 0,GYs+3.4],'#B98F4A');
  poly([6,GYs-2.4, 94,GYs-2.4, 99.2,GYs+3, .8,GYs+3],'#D2A55B','#FFFFFF',.3);
  rect(0,GYs+3.4,100,HU-GYs,'#9A7436'); line(48.9,GYs+3,51.1,GYs-2.4,'rgba(255,255,255,.9)',.3);
  /* тіні */
  for(const p of G.P){ const c=CH[p.ch]; ell(sx(p.x),GYs+.4,Math.max(1.4,(Math.max(c.rh,c.rs)+.6)*(1-p.y/40)),.55,'rgba(0,0,0,.25)'); }
  const bx=sx(G.bd.x), by=GYs-G.bd.y; ell(bx,GYs+.4,Math.max(1,RB*(1-Math.min(.65,G.bd.y/70))),.5,'rgba(0,0,0,'+(.3-Math.min(.2,G.bd.y/200))+')');
  /* сітка: дальній стовп, полотно, ближній стовп */
  const fx=48.9, fy=GYs+3, kx=51.1, ky=GYs-2.4;
  rect(kx-.3,ky-NH,.6,NH,'#7A5226');
  poly([fx,fy-NH, kx,ky-NH, kx,ky, fx,fy],'rgba(255,255,255,.2)');
  ctx.strokeStyle='rgba(255,255,255,.55)'; ctx.lineWidth=.08; for(let i=1;i<10;i++){const yy=i*NH/10; ctx.beginPath(); ctx.moveTo(fx,fy-yy); ctx.lineTo(kx,ky-yy); ctx.stroke();} for(let i=1;i<4;i++){const xx=fx+(kx-fx)*i/4, y0=fy+(ky-fy)*i/4; ctx.beginPath(); ctx.moveTo(xx,y0); ctx.lineTo(xx,y0-NH); ctx.stroke();}
  line(fx,fy-NH,kx,ky-NH,'#FFFFFF',.5);
  /* гравці */
  const order=[...G.P].sort((a,b)=>a.y-b.y);
  for(const p of order){ const c=CH[p.ch], face=((p.side===0)!==G.flip)?1:-1, px=sx(p.x), py=GYs-p.y; let sqx=1,sqy=1; if(p.sq>0){const k=Math.sin(p.sq/.16*Math.PI)*.16; sqx=1+k; sqy=1-k;} else if(!p.gr){sqx=.95;sqy=1.05;}
    const dx=(bx-px)*face, dy=(by-(py-c.H*.7)), dl=Math.hypot(dx,dy)||1;
    ctx.save(); ctx.translate(px,py); ctx.rotate(clamp(p.vx*(G.flip?-1:1)*.006,-.18,.18)); ctx.scale(face*sqx,sqy); drawChar(p.ch,dx/dl,dy/dl,G.t); ctx.restore();
    if(G.fmt===2||G.kind==='net'){ const lb=G.kind==='local'?'':p.id===G.myId?'ти':p.bot?'комп.':'г'+(p.id+1); if(lb){ const fs=clamp(W*.0125,11*dpr,16*dpr)/u*.8, ly=py-c.H-(p.ch===0?4.2:2.4), w=txt(lb,-99,-99,fs,'#000','center',800); ctx.fillStyle=p.id===G.myId?'rgba(201,169,97,.95)':'rgba(14,26,31,.6)'; rr(px-w/2-.9,ly-fs*.75,w+1.8,fs*1.5,fs*.75); ctx.fill(); txt(lb,px,ly,fs,p.id===G.myId?'#1B2A30':'#fff','center',800); } } }
  for(const f of G.puffs){ ctx.globalAlpha=.5*(1-f.t/.4); circ(sx(f.x)-1.2-f.t*4,GYs-f.y+.4,1+f.t*3,'#fff'); circ(sx(f.x)+1.2+f.t*4,GYs-f.y+.4,1+f.t*3,'#fff'); ctx.globalAlpha=1; }
  rect(fx-.45,fy-NH-.4,.9,NH+.4,'#8A5A2B'); rect(fx-.6,fy-NH-.9,1.2,.7,'#F2F4F4');
  drawBall(bx,by,G.ball.rot*(G.flip?-1:1));
  if(by<-RB){ const iy=Math.max(5,clamp(W*.0125,11*dpr,16*dpr)/u*3.4); poly([bx-1.6,iy+2.4, bx+1.6,iy+2.4, bx,iy],'#2F7D3B','#fff',.2); }
  drawHUD(); }
function drawHUD(){ if(G.mode==='menu'||!G.P.length)return; const fs=clamp(W*.0125,11*dpr,16*dpr)/u, L=G.flip?1:0, R=1-L;
  const bw=fs*7.2, bh=fs*2.5; ctx.fillStyle='rgba(14,26,31,.62)'; rr(50-bw/2,1,bw,bh,fs*.6); ctx.fill();
  txt(G.score[L]+' : '+G.score[R],50,1+bh/2,fs*1.55,'#FFFFFF','center',700,'Unbounded, Manrope, sans-serif');
  const nm=s=>{ const t=team(s); return G.fmt===1&&t[0]?nameP(t[0])+' · '+CH[t[0].ch].n:sideName(s); };
  txt(nm(L),50-bw/2-1.2,1+bh*.5,fs,'#FFFFFF','right',800); txt(nm(R),50+bw/2+1.2,1+bh*.5,fs,'#FFFFFF','left',800);
  
  if(G.kind==='net'&&G.rtt) txt('зв\'язок '+G.rtt+' мс',99,HU-1.6,fs*.85,'rgba(255,255,255,.8)','right');
  if(G.bT>0&&G.banner&&G.mode==='play'){ const yy=Math.min(HU*.34,GYs-NH-12), w2=txt(G.banner,50,-50,fs*1.25,'#fff','center',800); ctx.globalAlpha=Math.min(1,G.bT*4); ctx.fillStyle='rgba(14,26,31,.72)'; rr(50-w2/2-1.6,yy-fs*1.1,w2+3.2,fs*2.2,fs*1.1); ctx.fill(); txt(G.banner,50,yy,fs*1.25,'#FFE7A8','center',800); ctx.globalAlpha=1; } }

/* ---------- інтерфейс ---------- */
const ov=$('ov'), card=$('card'), invite=(Q.get('g')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
function charPicker(sel){ let h='<div class="chars">'; CH.forEach((c,i)=>{ h+='<button data-ch="'+i+'" class="'+(i===sel?'on':'')+'" aria-pressed="'+(i===sel)+'"><canvas width="108" height="132" data-pc="'+i+'"></canvas><b>'+c.n+'</b><div class="stats">'+c.st.map((v,k)=>'<span>'+STN[k]+'</span><i style="--w:'+(v*20)+'%"></i>').join('')+'</div></button>'; });
  return h+'</div><p class="cdesc"><b>'+CH[sel].sk+'.</b> '+CH[sel].d+'</p>'; }
function paintPortraits(onPick){ card.querySelectorAll('canvas[data-pc]').forEach(c=>{ const o=ctx; ctx=c.getContext('2d'); ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,108,132); const k=132/19.5; ctx.setTransform(k,0,0,k,54,128); drawChar(+c.dataset.pc,.5,-.3,0); ctx=o; });
  card.querySelectorAll('button[data-ch]').forEach(b=>b.onclick=()=>{ myCh=+b.dataset.ch; try{localStorage.setItem('pz_vol_ch',myCh);}catch(e){} audioInit(); if(onPick) onPick(myCh); else ui(); }); }
function solo(fmt){ const pl=[{id:0,ch:myCh,team:0}], r=()=>Math.floor(Math.random()*3); if(fmt===2) pl.push({id:6,ch:r(),team:0,bot:true}); pl.push({id:7,ch:r(),team:1,bot:true}); if(fmt===2) pl.push({id:8,ch:r(),team:1,bot:true}); return {kind:'bot',fmt:fmt,myId:0,players:pl}; }
let lastCfg=null;
function go(cfg){ lastCfg=cfg; startMatch(cfg); }
function ui(){ const play=G.mode==='play'; if(autoBig&&!play) setBig(false); $('tc').classList.toggle('two',G.kind==='local'&&play); document.body.classList.toggle('m',!play); ov.hidden=play; setTimeout(resize,30); $('bMenu').hidden=G.mode==='menu'; $('bMenu').textContent=inRoom||G.mode==='room'?'Вийти з кімнати':'У меню';
  if(play) return;
  if(G.mode==='menu'){
    card.innerHTML='<span class="k">Поле зору · волейбол · версія '+VER+'</span><h3>Обери гравця</h3>'+charPicker(myCh)+'<div class="btns">'+
      '<button id="mHost">Кімната для друзів (до 4)</button><button class="sec" id="mBot1">1 на 1 з комп\'ютером</button><button class="sec" id="mBot2">2 на 2 з комп\'ютерами</button><button class="sec" id="mLoc">'+(coarse?'Удвох на одному телефоні':'Удвох на одній клавіатурі')+'</button></div>'+
      '<p class="cdesc">У кімнату друзі заходять за одним посиланням. Команду, гравця й формат (1 на 1 чи 2 на 2) обираєте всередині; вільні місця займе комп\'ютер.</p>';
    paintPortraits();
    $('mHost').onclick=()=>{audioInit(); hostGame();};
    $('mBot1').onclick=()=>{audioInit(); go(solo(1));}; $('mBot2').onclick=()=>{audioInit(); go(solo(2));};
    $('mLoc').onclick=()=>{audioInit(); go({kind:'local',fmt:1,myId:0,players:[{id:0,ch:myCh,team:0},{id:1,ch:(myCh+1+Math.floor(Math.random()*2))%3,team:1}]});};
  } else if(G.mode==='room'){ const url=location.origin+location.pathname+'?g='+code;
    if(netState==='err') card.innerHTML='<h3>Не вийшло</h3><p>'+G.netMsg+'</p><div class="btns"><button id="lBack">У меню</button></div>';
    else if(netState==='join'||netState==='open') card.innerHTML='<span class="k">Кімната '+code+'</span><h3>'+(netState==='join'?'Заходимо в кімнату…':'Створюємо кімнату…')+'</h3><p>Це займає кілька секунд.</p><div class="btns"><button class="sec" id="lBack">Назад</button></div>';
    else { const me=R.P.find(q=>q.id===G.myId)||{ch:myCh,team:0}, why=canStart(), TN=['Ліва','Права'];
      let h='<span class="k">Кімната '+code+' · людей: '+R.P.length+' / 4</span><h3>'+(G.res||(isHost?'Збери друзів і тисни «Старт»':'Ти в кімнаті'))+'</h3>';
      h+='<div class="teams">'+[0,1].map(t=>{ const ps=R.P.filter(q=>q.team===t); let s='<div class="tm"><b>'+TN[t]+' команда</b>'+ps.map(q=>'<span'+(q.id===G.myId?' class="me"':'')+'>'+(q.id===G.myId?'Ти':'Гравець '+(q.id+1))+(q.id===0?' (господар)':'')+' · '+CH[q.ch].n+'</span>').join(''); for(let n=ps.length;n<R.fmt;n++) s+='<span class="cpu">комп\'ютер</span>'; return s+'</div>'; }).join('')+'</div>';
      if(R.playing) h+='<p>Зараз іде матч. Наступний почнеться, щойно цей закінчиться.</p>';
      else { h+=charPicker(me.ch)+'<div class="seg"><span>Твоя команда:</span>'+TN.map((n,i)=>'<button data-rt="'+i+'" class="'+(me.team===i?'on':'')+'">'+n+'</button>').join('')+'</div>';
        h+=isHost?'<div class="seg"><span>Формат:</span>'+[1,2].map(f=>'<button data-rf="'+f+'" class="'+(R.fmt===f?'on':'')+'">'+f+' на '+f+'</button>').join('')+'</div>':'<p>Формат: '+R.fmt+' на '+R.fmt+'. Чекаємо, поки господар натисне «Старт».</p>'; }
      h+='<div class="link" id="lUrl">'+url+'</div><div class="btns">'+(isHost&&!R.playing?'<button id="rStart"'+(why?' disabled':'')+'>Старт</button>':'')+(navigator.share?'<button class="sec" id="lShare">Запросити</button>':'')+'<button class="sec" id="lCopy">Скопіювати посилання</button><button class="sec" id="lBack">Вийти</button></div>'+(isHost&&!R.playing&&why?'<p>'+why+'</p>':'');
      card.innerHTML=h; if(!R.playing) paintPortraits(ch=>{ if(isHost){ me.ch=ch; roomCast(); } else send({t:'pick',ch:ch},0); ui(); });
      card.querySelectorAll('button[data-rt]').forEach(b=>b.onclick=()=>{ const t=+b.dataset.rt; if(isHost){ me.team=t; roomCast(); } else send({t:'pick',team:t},0); });
      card.querySelectorAll('button[data-rf]').forEach(b=>b.onclick=()=>{ R.fmt=+b.dataset.rf; myFmt=R.fmt; try{localStorage.setItem('pz_vol_fmt',myFmt);}catch(e){} roomCast(); });
      const rs=$('rStart'); if(rs) rs.onclick=()=>{ audioInit(); hostStartMatch(); };
      const cp=$('lCopy'); cp.onclick=()=>{ const sel=()=>{ const r=document.createRange(); r.selectNodeContents($('lUrl')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent='Виділено — скопіюй'; }; try{ navigator.clipboard.writeText(url).then(()=>{cp.textContent='Скопійовано';},sel); }catch(e){ sel(); } };
      const sh=$('lShare'); if(sh) sh.onclick=()=>{ try{ navigator.share({title:'Агроволейбол',text:'Зіграймо у волейбол! Заходь:',url:url}).catch(()=>{}); }catch(e){} }; }
    $('lBack').onclick=()=>{ netClose(); G.mode='menu'; G.res=''; ui(); };
  } else if(G.mode==='over'){ const L=G.flip?1:0, tA=team(L).map(p=>CH[p.ch].n).join(' + '), tB=team(1-L).map(p=>CH[p.ch].n).join(' + ');
    card.innerHTML='<span class="k">'+tA+' проти: '+tB+'</span><h3>'+G.res.split(' · ')[0]+'</h3><p class="code">'+G.score[L]+' : '+G.score[1-L]+'</p><div class="btns"><button id="oAgain">Реванш</button><button class="sec" id="oMenu">Змінити гравця</button></div>';
    $('oAgain').onclick=()=>{ if(lastCfg) go(lastCfg); }; $('oMenu').onclick=()=>{ G.mode='menu'; ui(); }; } }
function hold(el,k){ const dn=e=>{e.preventDefault(); audioInit(); tin[k]=true; el.classList.add('on'); try{el.setPointerCapture(e.pointerId);}catch(_){}} , up=()=>{tin[k]=false; el.classList.remove('on');};
  el.addEventListener('pointerdown',dn); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('lostpointercapture',up); el.addEventListener('contextmenu',e=>e.preventDefault()); }
hold($('bL'),'l'); hold($('bR'),'r');
$('bJ').addEventListener('pointerdown',e=>{e.preventDefault(); audioInit(); jq[0]=true; $('bJ').classList.add('on'); setTimeout(()=>$('bJ').classList.remove('on'),120);}); $('bJ').addEventListener('contextmenu',e=>e.preventDefault());
cv.addEventListener('pointerdown',e=>{ if(G.mode!=='play')return; e.preventDefault(); audioInit(); });
const KM={ArrowLeft:'left',ArrowRight:'right',KeyA:'a',KeyD:'d'};
window.addEventListener('keydown',e=>{ if(G.mode!=='play')return; const k=KM[e.code]; if(k){key[k]=true;e.preventDefault();return;}
  if(e.repeat){ if(e.code==='ArrowUp'||e.code==='Space')e.preventDefault(); return; }
  if(e.code==='KeyW'){jq[0]=true;} else if(e.code==='ArrowUp'||e.code==='Space'){ jq[G.kind==='local'&&e.code==='ArrowUp'?1:0]=true; e.preventDefault(); } audioInit(); });
window.addEventListener('keyup',e=>{ const k=KM[e.code]; if(k) key[k]=false; });
window.addEventListener('blur',()=>{ for(const k in key) key[k]=false; tin.l=tin.r=tin2.l=tin2.r=false; });
$('bSnd').onclick=()=>{sndOn=!sndOn; audioInit(); if(master) master.gain.value=sndOn?.9:0; $('bSnd').textContent='Звук: '+(sndOn?'увімк.':'вимк.'); $('bSnd').setAttribute('aria-pressed',sndOn?'true':'false');};
$('bMenu').onclick=()=>{ netClose(); G.mode='menu'; G.res=''; ui(); };
function layoutBig(){ const b=document.body, big=b.classList.contains('big'); b.classList.toggle('rot',big&&coarse&&window.innerHeight>window.innerWidth*1.12); resize(); setTimeout(resize,90); setTimeout(resize,400); }
function tryFs(){ const el=document.documentElement; try{ const r=el.requestFullscreen||el.webkitRequestFullscreen; if(r){ const pr=r.call(el,{navigationUI:'hide'}); if(pr&&pr.then) pr.then(()=>{ try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} }).catch(()=>{}); } }catch(e){} }
function setBig(v,fs){ document.body.classList.toggle('big',v); $('bExit').hidden=!v;
  if(v){ if(fs) tryFs(); } else { autoBig=false; try{ if(screen.orientation&&screen.orientation.unlock) screen.orientation.unlock(); }catch(e){} try{ if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(e){} }
  layoutBig(); }
function wake(){ try{ if(navigator.wakeLock&&!wl) navigator.wakeLock.request('screen').then(l=>{wl=l; l.addEventListener('release',()=>{wl=null;});}).catch(()=>{}); }catch(e){} }
$('bBig').onclick=()=>{audioInit(); setBig(true,true);}; $('bExit').onclick=()=>setBig(false);
document.addEventListener('fullscreenchange',layoutBig); window.addEventListener('resize',layoutBig); window.addEventListener('orientationchange',layoutBig);
document.addEventListener('visibilitychange',()=>{ if(!document.hidden&&G.mode==='play') wake(); });
window.addEventListener('touchend',()=>{ if(G.mode==='play'&&coarse&&document.body.classList.contains('big')&&!document.fullscreenElement&&!fsTried){ fsTried=true; tryFs(); } },{passive:true});
document.querySelectorAll('#tc button').forEach(el=>{ const k=el.dataset.k, t=k[0], sd=+k[1];
  const dn=e=>{ e.preventDefault(); audioInit(); el.classList.add('on'); if(t==='j') jq[G.kind==='local'?sd:0]=true; else (sd?tin2:tin)[t]=true; try{el.setPointerCapture(e.pointerId);}catch(_){} };
  const up=()=>{ el.classList.remove('on'); if(t!=='j') (sd?tin2:tin)[t]=false; };
  el.addEventListener('pointerdown',dn); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('lostpointercapture',up); el.addEventListener('contextmenu',e=>e.preventDefault()); });
window.addEventListener('pagehide',()=>{ netClose(); });

/* ---------- цикл ---------- */
let last=0;
function frame(ts){ const dt=Math.min(.1,(ts-last)/1000||0); last=ts;
  if(G.mode==='play'){ let r=dt; while(r>1e-5&&G.mode==='play'){ const s=Math.min(r,1/120); step(s); r-=s; } netFrame(dt); }
  else G.t+=dt;
  try{ draw(); }catch(e){ if(isLoc) console.error(e); } requestAnimationFrame(frame); }
new ResizeObserver(resize).observe(cv); resize(); ui(); if(invite) joinGame(invite);
if(document.fonts&&document.fonts.ready) document.fonts.ready.then(()=>draw());
requestAnimationFrame(frame);
if(isLoc) window.__v={setE:v=>{BOTE=v;},G:G,CH:CH,R:R,step:step,startMatch:go,solo:solo,key:key,jq:jq,tin:tin,net:()=>({room:inRoom,host:isHost,id:G.myId,code:code,st:netState,msg:G.netMsg})};
})();
