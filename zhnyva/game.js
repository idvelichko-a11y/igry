/* Жнива-ліга — гра: матч, керування, кімнати для друзів, меню, звук. */
(function(){
"use strict";
const VER=(()=>{ try{ const m=/game\.js\?v=(\d+)/.exec(document.currentScript.src); return m?+m[1]:0; }catch(e){ return 0; } })();
(async()=>{ try{ const t=await (await fetch(location.pathname+'?fresh='+Date.now(),{cache:'no-store'})).text(), m=/game\.js\?v=(\d+)/.exec(t), nv=m?+m[1]:0; let done=''; try{ done=sessionStorage.getItem('pz_zh_upd')||''; }catch(e){}
  if(nv>VER&&done!==String(nv)){ try{ sessionStorage.setItem('pz_zh_upd',String(nv)); }catch(e){} location.reload(); } }catch(e){} })();
const Z=window.ZL, V=window.ZV, F=Z.F, MACH=Z.MACH, clamp=Z.clamp, $=id=>document.getElementById(id);
const coarse=V.coarse; if(coarse) document.body.classList.add('touch');
const Q=new URLSearchParams(location.search), isLoc=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
const cv=$('c'), glOK=V.init(cv), hex=c=>'#'+c.toString(16).padStart(6,'0');
const TEAMN=['Сині','Помаранчеві'], TEAMC=V.TEAMC, BOTN=['Колос','Вітер','Грім','Жайвір','Степ','Зірка','Обрій','Лан'], SKILLS=[{n:'Новачок',s:.38},{n:'Майстер',s:.68},{n:'Чемпіон',s:.96}], LENS=[180,300];
const clean=v=>String(v==null?'':v).replace(/[<>&"'`]/g,'').trim().slice(0,12);
let myCh=1, mySize=1, mySkill=1, myLen=0, myName=''; try{ const a=JSON.parse(localStorage.getItem('pz_zh')||'{}'); myName=clean(a.name); if(a.ch>=0&&a.ch<MACH.length) myCh=a.ch; if(a.size>=1&&a.size<=3) mySize=a.size; if(a.skill>=0&&a.skill<3) mySkill=a.skill; if(a.len>=0&&a.len<2) myLen=a.len; if(a.cam===1) V.camMode=1; }catch(e){}
function save(){ try{ localStorage.setItem('pz_zh',JSON.stringify({ch:myCh,size:mySize,skill:mySkill,len:myLen,cam:V.camMode,name:myName})); }catch(e){} }

/* ---------- стан ---------- */
const G={mode:'menu',kind:'solo',host:true,myId:0,phase:'count',phT:0,clock:180,len:180,sc:[0,0],ot:false,msg:'',msgT:0,big:'',bigS:'',bigT:0,slow:0,res:'',resS:'',skill:.68,rtt:0,noFix:0,bt:null,hitT:0,netMsg:'',cfg:null,scorers:[]};
let S=Z.newState(), me=null, fps=60; const REC=[]; let recT=0;
function recPush(){ const b=S.ball; REC.push({b:[b.x,b.y,b.z],c:S.cars.map(c=>[c.x,c.y,c.z,c.h,c.pit,c.ext,c.flipT,c.boosting?1:0,c.demoT>0?1:0,c.st,c.ramT>0?1:0])}); if(REC.length>130) REC.shift(); }
function repApply(u){ const n=G.rp.length, f=clamp(u,0,1)*(n-1), i=Math.min(n-2,Math.floor(f)), k=f-i, A=G.rp[i], B=G.rp[i+1], L=(a,b)=>a+(b-a)*k, b=S.ball; b.vx=(B.b[0]-A.b[0])*30; b.vy=(B.b[1]-A.b[1])*30; b.vz=(B.b[2]-A.b[2])*30; b.x=L(A.b[0],B.b[0]); b.y=L(A.b[1],B.b[1]); b.z=L(A.b[2],B.b[2]);
  for(let j=0;j<S.cars.length&&j<A.c.length&&j<B.c.length;j++){ const c=S.cars[j], p=A.c[j], q=B.c[j]; let dh=q[3]-p[3]; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); c.vx=(q[0]-p[0])*30; c.vy=(q[1]-p[1])*30; c.vz=(q[2]-p[2])*30; c.x=L(p[0],q[0]); c.y=L(p[1],q[1]); c.z=L(p[2],q[2]); c.h=p[3]+dh*k; c.w=dh*30; c.pit=L(p[4],q[4]); c.ext=L(p[5],q[5]); c.flipT=p[6]; c.boosting=!!p[7]; c.demoT=p[8]?.2:0; c.st=p[9]; c.ramT=p[10]?.2:0; c.air=c.y>.1; c.drift=0; }
  V.camFix=[clamp(b.x*.55+(b.x>0?16:-16),-F.FL+6,F.FL-6),9+b.y*.3,b.z+(b.z>0?-1:1)*26,b.x,Math.max(1.5,b.y*.8),b.z]; }
const I={sx:0,sy:0,jump:false,boost:false,spec:false}, key={};
function say(s,t){ G.msg=s; G.msgT=t||2.5; }
function big(s,sub,t){ G.big=s; G.bigS=sub||''; G.bigT=t||1.5; }
function auth(){ return G.kind!=='net'||G.host; }
function label(c){ return c===me?'Ти':c.bot?BOTN[(c.id-6)%BOTN.length]:(c.name||'Гравець '+(c.id+1)); }
/* cfg: {kind:'solo'|'net'|'free', myId, len, skill, players:[{id,ch,team,bot}]} */
function start(cfg){ for(const c of S.cars) V.carRemove(c.mesh); S=Z.newState(); REC.length=0; G.rp=null; V.camFix=null; G.cfg=cfg; G.kind=cfg.kind; G.myId=cfg.myId|0; G.host=G.kind!=='net'||G.myId===0; G.len=cfg.kind==='free'?0:clamp(+cfg.len||180,60,900); G.clock=G.len; G.sc=[0,0]; G.ot=false; G.res=''; G.scorers=[]; G.skill=clamp(+cfg.skill||.68,.2,1); G.slow=0; G.bt=null;
  for(const pl of cfg.players){ const c=Z.newCar(pl.id|0,pl.ch|0,pl.team?1:0); c.bot=!!pl.bot; c.name=clean(pl.name); c.local=c.id===G.myId||(c.bot&&G.host); if(c.bot) Z.botInit(c,G.skill); c.mesh=V.carMesh(c.ch,c.team); S.cars.push(c); }
  me=S.cars.find(c=>c.id===G.myId)||null; G.mode='play'; setKick(); V.camReset(); V.skidClear(); if(me) V.camH=me.h; if(coarse){ autoBig=true; setBig(true,true); } ui();
  say(G.kind==='free'?'Тренування: забивай у помаранчеві ворота. R — м\'яч до себе':'Забий м\'яч у ворота суперника. Ти — '+(me&&me.team?'помаранчеві, б\'єш у сині ворота':'сині, б\'єш у помаранчеві ворота'),4.5); }
function setKick(){ REC.length=0; G.rp=null; V.camFix=null; for(const c of S.cars){ if(!c.local){ c.demoT=0; c.flipT=0; } } Z.kickoff(S); G.phase=G.kind==='free'?'play':'count'; G.phT=3; S.frozen=G.phase==='count'; G.cnt=4; if(me){ V.camH=me.h; } }
function soloCfg(){ const pl=[{id:0,ch:myCh,team:0}]; let id=6; const rc=()=>Math.floor(Math.random()*MACH.length); for(let i=1;i<mySize;i++) pl.push({id:id++,ch:rc(),team:0,bot:true}); for(let i=0;i<mySize;i++) pl.push({id:id++,ch:rc(),team:1,bot:true}); return {kind:'solo',myId:0,len:LENS[myLen],skill:SKILLS[mySkill].s,players:pl}; }

/* ---------- гол, кінець матчу ---------- */
function goalFx(team,by,x,y,z){ G.phase='goal'; G.rp=(G.kind!=='free'&&REC.length>=50)?REC.slice():null; G.phT=G.rp?6.6:3.6; G.slow=1.15; const c=S.cars.find(q=>q.id===by), own=c&&c.team!==team; if(c&&!own) c.goals++;
  S.ev.push({t:'goal',team:team,x:x,y:y,z:z}); big('ГОЛ!',(c?(own?'Автогол: ':'')+label(c)+' · ':'')+TEAMN[team]+' забили',3.2); G.hitT=.5;
  for(const q of S.cars){ if(!q.local) continue; const dx=q.x-x, dz=q.z-z, d=Math.hypot(dx,dz)||1; if(d<34){ const k=(1-d/34); q.vx+=dx/d*30*k; q.vz+=dz/d*30*k; q.vy=5+9*k; q.y=Math.max(q.y,.002); q.wk=(Math.random()-.5)*8*k; } }
  const b=S.ball; b.vx*=.2; b.vz*=.2; snd.goal(me&&me.team===team); }
function hostGoal(team){ const b=S.ball; G.sc[team]++; const by=b.touch; G.scorers.push({team:team,by:by,t:G.len-G.clock}); send({t:'goal',team:team,by:by,sc:G.sc,p:[r2(b.x),r2(b.y),r2(b.z)]}); goalFx(team,by,b.x,b.y,b.z); }
function finish(w){ G.rp=null; V.camFix=null; G.phase='over'; G.phT=3.2; if(w>=0) for(let i=0;i<7;i++) setTimeout(()=>{ if(G.mode==='play') S.ev.push({t:'goal',team:w,x:(Math.random()-.5)*70,y:9+Math.random()*9,z:(Math.random()-.5)*46,fw:1}); },i*380); G.win=me?w===me.team:false; big(w<0?'Нічия':G.win?'Перемога!':'Поразка',TEAMN[0]+' '+G.sc[0]+' : '+G.sc[1]+' '+TEAMN[1],3.2); snd.end(G.win); }
function hostOver(){ const w=G.sc[0]>G.sc[1]?0:1; send({t:'over',w:w,sc:G.sc}); finish(w); }
function afterOver(){ G.res=(G.win?'Перемога! ':'Поразка. ')+TEAMN[0]+' '+G.sc[0]+' : '+G.sc[1]+' '+TEAMN[1]; const best=S.cars.slice().sort((a,b)=>b.goals-a.goals)[0]; G.resS=best&&best.goals?'Найбільше забив: '+label(best)+' ('+MACH[best.ch].n+') — '+best.goals:'';
  if(G.kind==='net'){ G.mode='room'; if(isHost){ R.playing=false; roomCast(); } } else G.mode='end'; for(const c of S.cars) V.carRemove(c.mesh); S.cars.length=0; me=null; ui(); }

/* ---------- крок гри ---------- */
const r2=v=>Math.round(v*100)/100;
function remoteStep(c,dt){ const r=c.rp; if(!r) return; r.age+=dt; const a=Math.min(r.age,.25), k=Math.min(1,dt*14), wasAir=c.air; c.x+=(r.p[0]+r.v[0]*a-c.x)*k; c.y+=(Math.max(0,r.p[1]+r.v[1]*a)-c.y)*k; c.z+=(r.p[2]+r.v[2]*a-c.z)*k; let dh=r.h+r.w*a-c.h; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); c.h+=dh*k;
  c.vx=r.v[0]; c.vy=r.v[1]; c.vz=r.v[2]; c.w=r.w; c.st=r.st; const e0=c.ext; c.ext+=(r.e-c.ext)*Math.min(1,dt*20); c.extV=dt>0?(c.ext-e0)/dt:0; c.boosting=!!(r.f&1); c.ramT=r.f&2?.2:0; c.dashT=r.f&4?.2:0; c.air=c.y>.15; c.boost=r.b; c.inp.thr=r.f&8?1:0; c.drift=r.f&16?4:0; c.pit+=(r.pt-c.pit)*k; if(r.f&32){ if(!c._fl){ c._fl=true; c.flipT=.5; S.ev.push({t:'flip',id:c.id}); } } else c._fl=false; if(c.flipT>0) c.flipT-=dt;
  { const d=!!(r.f&64); if(d&&!(c.demoT>0)) S.ev.push({t:'demo',id:c.id,by:-1,x:c.x,y:c.y+1,z:c.z}); if(!d&&c.demoT>0) S.ev.push({t:'respawn',id:c.id}); c.demoT=d?.3:0; }
  if(wasAir&&!c.air) S.ev.push({t:'land',id:c.id,v:9}); Z.updParts(c,dt); }
function step(dt){ S.t+=dt; const au=auth();
  if(G.phase==='goal'&&G.rp&&G.phT<4.4){ if(!G.repOn){ G.repOn=true; say('Повтор голу',4); S.ev.length=0; } G.phT-=dt; repApply(1-G.phT/4.4); if(G.phT<=0&&au){ G.repOn=false; if(G.kind!=='free'&&(G.ot||G.clock<=0)) hostOver(); else { send({t:'ko'}); setKick(); } } if(G.msgT>0) G.msgT-=dt; return; } G.repOn=false;
  if(G.phase==='play'){ recT+=dt; if(recT>=1/30){ recT=0; recPush(); } }
  if(me){ me.inp.steer=clamp(I.sx+((key.d?1:0)-(key.a?1:0)),-1,1); me.inp.thr=clamp(I.sy+((key.w?1:0)-(key.s?1:0)),-1,1); me.inp.jump=I.jump||!!key.jump; me.inp.boost=I.boost||!!key.boost; me.inp.spec=I.spec||!!key.spec; if(G.autoMe&&me.bs) Z.botThink(me,S,dt); }
  S.frozen=G.phase==='count'||G.phase==='over';
  for(const c of S.cars){ if(c.local){ if(c.bot&&c.bs) Z.botThink(c,S,dt); Z.stepCar(c,dt,S); } else remoteStep(c,dt); }
  for(const a of S.cars) if(a.local) for(const b of S.cars) if(a!==b) Z.carVsCar(a,b,S);
  const b=S.ball; if(G.phase!=='count'){ Z.stepBall(b,dt,S); if(G.phase==='play') for(const c of S.cars) Z.ballVsCar(b,c,S); }
  if(!au&&G.bt){ const t=G.bt; t.age+=dt; if(G.noFix>0) G.noFix-=dt; else if(t.age<.5){ const a=t.age, tx=t.p[0]+t.v[0]*a, ty=Math.max(F.BR,t.p[1]+t.v[1]*a-.5*F.G*a*a*(t.p[1]>F.BR+.2?1:0)), tz=t.p[2]+t.v[2]*a, ex=tx-b.x, ey=ty-b.y, ez=tz-b.z, er=Math.hypot(ex,ey,ez);
      if(er>8||G.phase==='count'){ b.x=tx; b.y=ty; b.z=tz; b.vx=t.v[0]; b.vy=t.v[1]; b.vz=t.v[2]; } else { const k=Math.min(1,dt*7), kv=Math.min(1,dt*9); b.x+=ex*k; b.y+=ey*k; b.z+=ez*k; b.vx+=(t.v[0]-b.vx)*kv; b.vy+=(t.v[1]-F.G*a*(t.p[1]>F.BR+.2?1:0)-b.vy)*kv; b.vz+=(t.v[2]-b.vz)*kv; } } }
  if(au){ if(G.phase==='play'){ Z.padStep(S,dt); if(Math.hypot(b.vx,b.vy,b.vz)<1.2&&(Math.abs(b.x)>6||Math.abs(b.z)>6)){ G.still=(G.still||0)+dt; if(G.still>5){ G.still=0; const l=Math.hypot(b.x,b.z)||1; b.vx=-b.x/l*11; b.vz=-b.z/l*11; b.vy=15; say('М\'яч застряг — суддя підкинув його',2.2); S.ev.push({t:'bounce',v:14,x:b.x,y:0,z:b.z}); } } else G.still=0; if(G.kind!=='free'){ if(!G.ot){ G.clock-=dt; if(G.clock<=0){ G.clock=0; if(G.sc[0]===G.sc[1]){ G.ot=true; big('Золотий гол','хто заб\'є — той переміг',2.5); send({t:'ot'}); } else hostOver(); } } }
      const g=Z.goalOf(b); if(g>=0&&G.phase==='play'){ if(G.kind==='free'){ G.sc[g]++; goalFx(g,b.touch,b.x,b.y,b.z); G.phT=1.8; } else hostGoal(g); } } }
  else for(let i=0;i<S.pads.length;i++) if(S.pads[i]>0) S.pads[i]-=dt;
  /* фази */
  if(G.phase==='count'){ G.phT-=dt; const n=Math.ceil(G.phT); if(n!==G.cnt&&n>0){ G.cnt=n; big(String(n),'',.9); snd.beep(440,0,.12,'square',.12); } if(G.phT<=0){ G.phase='play'; S.frozen=false; big('Вперед!','',.8); snd.beep(880,0,.3,'square',.14); if(me&&!G.hinted){ G.hinted=true; say(coarse?'Лівий палець — кермо і газ. Праворуч: турбо, стрибок, '+MACH[me.ch].spn.toLowerCase():'W S A D — їзда · пробіл — стрибок (двічі — сальто) · Shift — турбо · F — '+MACH[me.ch].spn.toLowerCase()+' · C — камера',7); } } }
  else if(G.phase==='goal'){ G.phT-=dt; if(G.phT<=0&&au){ if(G.kind!=='free'&&(G.ot||G.clock<=0)) hostOver(); else { send({t:'ko'}); setKick(); } } }
  else if(G.phase==='over'){ G.phT-=dt; if(G.phT<=0) afterOver(); }
  /* події: ефекти, звук, заправки */
  for(const e of S.ev){ if(e.t==='pad'){ const c=S.cars.find(q=>q.id===e.id); if(c&&c.local) Z.padGive(c,e.i); if(au&&G.kind==='net') send({t:'pad',i:e.i,id:e.id}); if(c===me) snd.beep(990,0,.1,'triangle',.12); }
    if(e.t==='demo'&&me){ const c=S.cars.find(q=>q.id===e.id); if(c===me){ big('Розбили!','повернешся за мить',1.6); G.hitT=.5; } else if(c&&c.team!==me.team&&(e.by===me.id||(e.by<0&&Math.hypot(c.x-me.x,c.z-me.z)<10))) say('Ти розбив суперника: '+label(c)+'!',2.5); else if(c) say(label(c)+' розбито',1.8); }
    if(e.t==='hit'&&me&&e.id===me.id&&!au) G.noFix=clamp(G.rtt/1000+.07,.09,.3);
    V.fx(e,S,me); snd.ev(e); } S.ev.length=0;
  if(G.msgT>0) G.msgT-=dt; }

/* ---------- мережа ---------- */
const PFX='pz-zhnyva-'; let peer=null, hostConn=null, conns={}, code='', netState='', joinTO=null, sendT=0, ballT=0, isHost=false, myId=0, inRoom=false, lastHost=0, lag=isLoc?(+Q.get('lag')||0):0;
const invite=(Q.get('g')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
const R={P:[],len:0,skill:1,playing:false}, BC={s:1};
function peerOpts(){ const s=Q.get('srv'); if(s&&isLoc){ const a=s.split(':'); return {host:a[0],port:+a[1],path:'/',secure:false,debug:1}; } return {debug:1}; }
function mkCode(){ const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s; }
function rawSend(c,m){ if(c&&c.open){ try{c.send(m);}catch(e){} } }
function send(m,to){ if(!inRoom) return; if(isHost){ m.from=0; if(to==null){ for(const k in conns) rawSend(conns[k],m); } else if(to!==0) rawSend(conns[to],m); } else { if(to!=null) m.to=to; rawSend(hostConn,m); } }
function hostRecv(k,m){ if(!m||typeof m!=='object') return; m.from=k; if(BC[m.t]){ for(const j in conns) if(+j!==k) rawSend(conns[j],m); } onMsg(m); }
function netClose(){ clearTimeout(joinTO); const cs=conns; conns={}; for(const k in cs){ try{cs[k].close();}catch(e){} } const hc=hostConn; hostConn=null; if(hc){ try{hc.close();}catch(e){} } const p=peer; peer=null; if(p){ try{p.destroy();}catch(e){} } inRoom=false; isHost=false; netState=''; R.P=[]; R.playing=false; }
function netFail(msg){ netClose(); for(const c of S.cars) V.carRemove(c.mesh); S.cars.length=0; me=null; G.mode='room'; netState='err'; G.netMsg=msg; ui(); }
function roomCast(){ send({t:'room',R:{P:R.P,len:R.len,skill:R.skill,playing:R.playing}}); if(G.mode==='room') ui(); }
function teamFix(){ for(let t=0;t<2;t++){ let l=R.P.filter(q=>q.team===t); while(l.length>3){ const b=l.find(q=>q.bot); if(!b) break; R.P.splice(R.P.indexOf(b),1); l=R.P.filter(q=>q.team===t); } } }
function botOk(t){ return !R.playing&&R.P.filter(q=>q.team===t).length<3; }
function botAdd(t){ if(!isHost||!botOk(t)) return; const used=R.P.map(q=>q.id); let id=6; while(used.includes(id)) id++; R.P.push({id:id,ch:Math.floor(Math.random()*MACH.length),team:t,bot:true}); roomCast(); }
function botDel(id){ if(!isHost||R.playing) return; R.P=R.P.filter(q=>!(q.bot&&q.id===id)); roomCast(); }
function botCyc(id){ const pl=R.P.find(q=>q.bot&&q.id===id); if(!isHost||!pl||R.playing) return; pl.ch=(pl.ch+1)%MACH.length; roomCast(); }
function roomPick(id,ch,team,name){ const pl=R.P.find(q=>q.id===id); if(!pl||R.playing) return; if(name!=null) pl.name=clean(name); if(team!=null){ const nt=team?1:0; if(nt!==pl.team&&R.P.filter(q=>!q.bot&&q.team===nt).length<3){ pl.team=nt; R.P.splice(R.P.indexOf(pl),1); R.P.push(pl); teamFix(); } } if(ch!=null) pl.ch=clamp(ch|0,0,MACH.length-1); roomCast(); }
function canStart(){ if(!R.P.some(q=>q.team===0)||!R.P.some(q=>q.team===1)) return 'У кожній команді має бути хоч один гравець: друг або комп\'ютер.'; return ''; }
function hostStartMatch(){ if(!isHost||R.playing||canStart()) return; const cfg={len:LENS[R.len],skill:SKILLS[R.skill].s,players:R.P.map(q=>({id:q.id,ch:q.ch,team:q.team,bot:!!q.bot,name:q.name||''}))}; R.playing=true; roomCast(); send({t:'go',cfg:cfg}); start(Object.assign({kind:'net',myId:0},cfg)); }
function admit(c,m){ const used=R.P.map(q=>q.id), h0=R.P.filter(q=>!q.bot&&q.team===0).length, h1=R.P.filter(q=>!q.bot&&q.team===1).length; let id=-1; for(let i=1;i<6;i++) if(!used.includes(i)){ id=i; break; } if(id<0||(h0>=3&&h1>=3)){ rawSend(c,{t:'full',from:0}); setTimeout(()=>{ try{c.close();}catch(e){} },400); return; }
  c._pid=id; conns[id]=c; const n0=R.P.filter(q=>q.team===0).length, n1=R.P.filter(q=>q.team===1).length; R.P.push({id:id,ch:clamp(m.ch|0,0,MACH.length-1),team:h0>=3?1:h1>=3?0:(n1<n0?1:0),name:clean(m.name)}); teamFix(); rawSend(c,{t:'you',id:id,from:0}); roomCast(); }
function playerLeft(id){ const c=S.cars.find(q=>q.id===id); if(!c||c===me) return; V.carRemove(c.mesh); S.cars.splice(S.cars.indexOf(c),1); if(G.mode==='play') say(label(c)+' вийшов',2.5); }
function drop(id){ delete conns[id]; R.P=R.P.filter(q=>q.id!==id); if(G.kind==='net'&&G.mode==='play'){ send({t:'left',id:id}); playerLeft(id); } roomCast(); }
function hostGame(){ netClose(); G.res=''; if(typeof Peer==='undefined'){ netFail('Не завантажилась бібліотека зв\'язку. Онови сторінку.'); return; } code=mkCode(); isHost=true; myId=0; inRoom=true; R.P=[{id:0,ch:myCh,team:0,name:myName}]; R.len=myLen; R.skill=mySkill; R.playing=false; G.mode='room'; netState='open'; ui();
  const p=new Peer(PFX+code,peerOpts()); peer=p; p.on('open',()=>{ if(peer!==p) return; netState='ok'; ui(); });
  p.on('connection',c=>{ c.on('data',m=>{ if(peer!==p) return; c._t=performance.now(); if(c._pid==null){ if(m&&m.t==='hello') admit(c,m); return; } if(lag) setTimeout(()=>hostRecv(c._pid,m),lag); else hostRecv(c._pid,m); }); const gone=()=>{ if(c._pid!=null&&conns[c._pid]===c) drop(c._pid); }; c.on('close',gone); c.on('error',gone); });
  p.on('error',e=>{ if(peer!==p) return; if(e&&e.type==='unavailable-id') hostGame(); else if(netState==='open') netFail('Немає зв\'язку із сервером знайомства ('+(e&&e.type||'помилка')+'). Перевір інтернет і спробуй ще раз.'); });
  p.on('disconnected',()=>{ try{ if(peer===p&&!p.destroyed) p.reconnect(); }catch(e){} }); }
function joinGame(c){ netClose(); G.res=''; if(typeof Peer==='undefined'){ netFail('Не завантажилась бібліотека зв\'язку. Онови сторінку.'); return; } code=c; isHost=false; G.mode='room'; netState='join'; ui();
  const p=new Peer(undefined,peerOpts()); peer=p; p.on('open',()=>{ if(peer!==p) return; const cn=p.connect(PFX+code,{serialization:'json'}); hostConn=cn;
    cn.on('open',()=>{ if(hostConn!==cn) return; clearTimeout(joinTO); inRoom=true; lastHost=performance.now(); rawSend(cn,{t:'hello',ch:myCh,name:myName}); }); cn.on('data',m=>{ if(hostConn!==cn) return; lastHost=performance.now(); if(lag) setTimeout(()=>onMsg(m),lag); else onMsg(m); });
    const gone=()=>{ if(hostConn!==cn) return; netFail('Кімнату закрито або зв\'язок обірвався.'); }; cn.on('close',gone); cn.on('error',gone);
    joinTO=setTimeout(()=>{ if(netState==='join') netFail('Не вдалося з\'єднатися. Можливо, кімнату вже закрито або мережа не пропускає пряме з\'єднання.'); },15000); });
  p.on('error',e=>{ if(peer!==p||netState!=='join') return; netFail(e&&e.type==='peer-unavailable'?'Кімнату '+code+' не знайдено. Попроси господаря створити нову й надіслати посилання.':'Немає зв\'язку ('+(e&&e.type||'помилка')+'). Перевір інтернет і спробуй ще раз.'); }); }
function onMsg(m){ if(!m||typeof m!=='object') return; const from=m.from|0, cc=v=>clamp(v|0,0,MACH.length-1), cOf=id=>S.cars.find(q=>q.id===id), play=G.kind==='net'&&G.mode==='play', num=v=>+v||0;
  switch(m.t){
   case 'you': if(!isHost) myId=m.id|0; break;
   case 'full': if(!isHost) netFail('У кімнаті вже немає місця. Спробуй пізніше.'); break;
   case 'room': if(!isHost&&m.R&&Array.isArray(m.R.P)){ R.P=m.R.P.slice(0,9).map(q=>({id:q.id|0,ch:cc(q.ch),team:q.team?1:0,bot:!!q.bot,name:clean(q.name)})); R.len=clamp(m.R.len|0,0,1); R.skill=clamp(m.R.skill|0,0,2); R.playing=!!m.R.playing; if(netState==='join') netState='ok'; if(G.mode==='room') ui(); } break;
   case 'pick': if(isHost) roomPick(from,m.ch,m.team,m.name); break;
   case 'go': if(!isHost&&m.cfg&&Array.isArray(m.cfg.players)&&m.cfg.players.some(q=>(q.id|0)===myId)) start({kind:'net',myId:myId,len:num(m.cfg.len),skill:num(m.cfg.skill),players:m.cfg.players.slice(0,9).map(q=>({id:q.id|0,ch:cc(q.ch),team:q.team?1:0,bot:!!q.bot,name:clean(q.name)}))}); break;
   case 's': { const c=cOf(from===0&&m.id!=null?(m.id|0):from); if(play&&c&&!c.local&&Array.isArray(m.p)&&Array.isArray(m.v)){ const first=!c.rp; c.rp={p:m.p.map(num),v:m.v.map(num),h:num(m.h),w:num(m.w),st:clamp(num(m.st),-1,1),e:clamp(num(m.e),0,1),pt:clamp(num(m.pt),-1.4,1.4),f:m.f|0,b:clamp(num(m.b),0,100),age:0}; if(first){ c.x=c.rp.p[0]; c.y=c.rp.p[1]; c.z=c.rp.p[2]; c.h=c.rp.h; } } break; }
   case 'b': if(play&&!G.host&&from===0&&Array.isArray(m.p)&&Array.isArray(m.v)){ G.bt={p:m.p.map(num),v:m.v.map(num),age:clamp(G.rtt/2000,0,.15)}; S.ball.touch=m.tc|0; S.ball.team=m.tm==null?-1:(m.tm|0); if(m.c!=null) G.clock=num(m.c); } break;
   case 'goal': if(play&&!G.host&&Array.isArray(m.sc)&&Array.isArray(m.p)){ G.sc=[m.sc[0]|0,m.sc[1]|0]; goalFx(m.team?1:0,m.by|0,num(m.p[0]),num(m.p[1]),num(m.p[2])); } break;
   case 'ko': if(play&&!G.host) setKick(); break;
   case 'ot': if(play&&!G.host){ G.ot=true; big('Золотий гол','хто заб\'є — той переміг',2.5); } break;
   case 'over': if(play&&!G.host){ if(Array.isArray(m.sc)) G.sc=[m.sc[0]|0,m.sc[1]|0]; finish(m.w|0); } break;
   case 'pad': if(play&&!G.host){ const i=clamp(m.i|0,0,Z.PADS.length-1); S.pads[i]=Z.PADS[i][2]?10:5; const c=cOf(m.id|0); if(c&&c.local) Z.padGive(c,i); S.ev.push({t:'pad',i:i,id:-1}); if(c===me) snd.beep(990,0,.1,'triangle',.12); } break;
   case 'left': if(!isHost) playerLeft(m.id|0); break;
   case 'pi': if(isHost) send({t:'po',ts:m.ts},from); break; case 'po': G.rtt=Math.round(performance.now()-m.ts); break; } }
setInterval(()=>{ if(!inRoom) return; const now=performance.now(); if(isHost){ for(const k in conns){ const c=conns[k]; if(c._t&&now-c._t>20000){ try{c.close();}catch(e){} if(conns[k]===c) drop(+k); } } } else { send({t:'pi',ts:now},0); if(lastHost&&now-lastHost>20000) netFail('Зв\'язок із кімнатою обірвався. Зайди ще раз за тим самим посиланням.'); } },2000);
function netFrame(dt){ if(G.kind!=='net'||!inRoom||G.mode!=='play') return; sendT+=dt; ballT+=dt;
  if(sendT>=1/(S.cars.length>4?15:20)){ sendT=0; const mk=q=>({t:'s',id:q.id,p:[r2(q.x),r2(q.y),r2(q.z)],v:[r2(q.vx),r2(q.vy),r2(q.vz)],h:Math.round(q.h*1000)/1000,w:r2(q.w),st:r2(q.st),e:r2(q.ext),f:(q.boosting?1:0)|(q.ramT>0?2:0)|(q.dashT>0?4:0)|(Math.abs(q.inp.thr)>.5?8:0)|(q.drift>2.5?16:0)|(q.flipT>0?32:0)|(q.demoT>0?64:0),pt:r2(q.pit),b:Math.round(q.boost)}); for(const q of S.cars) if(q.local) send(mk(q)); }
  if(isHost&&ballT>=1/20){ ballT=0; const b=S.ball; send({t:'b',p:[r2(b.x),r2(b.y),r2(b.z)],v:[r2(b.vx),r2(b.vy),r2(b.vz)],tc:b.touch,tm:b.team,c:Math.round(G.clock*10)/10}); } }

/* ---------- індикатори ---------- */
const tags=[], pj={x:0,y:0,z:0}; (function(){ const stg=$('stage'); for(let i=0;i<5;i++){ const e=document.createElement('div'); e.className='tg'; e.hidden=true; stg.appendChild(e); tags.push(e); } })();
function fmtT(t){ t=Math.max(0,Math.ceil(t)); return Math.floor(t/60)+':'+String(t%60).padStart(2,'0'); }
let hudN=0;
function hud(){ hudN++; const play=G.mode==='play';
  if(hudN%4===0){ const myT=me?me.team:0; $('hTop').innerHTML='<span class="b">'+(myT===0?'<small>ТИ</small>':'')+G.sc[0]+'</span><span class="t">'+(G.kind==='free'?'∞':G.ot?'<small>ЗОЛОТИЙ ГОЛ</small>':fmtT(G.clock))+'</span><span class="o">'+G.sc[1]+(myT===1?'<small>ТИ</small>':'')+'</span>';
    if(me){ const M=MACH[me.ch]; let sp=''; if(M.sp==='dash'||M.sp==='ram') sp=M.spn+': '+(me.ramT>0?'діє '+me.ramT.toFixed(1)+' с':me.scd>0?'через '+me.scd.toFixed(1)+' с':'готово'); else sp=M.spn+': '+Math.round(me.ext*100)+'%';
      $('hL').innerHTML='<b>'+M.n+'</b> · '+Math.round(Math.hypot(me.vx,me.vz)*3.6)+' км/год<div class="bar"><i style="width:'+me.boost.toFixed(0)+'%"></i></div>Турбо '+Math.round(me.boost)+'%<br>'+sp+'<br><span style="opacity:.6">'+fps.toFixed(0)+' кадрів/с'+(G.kind==='net'&&G.rtt?' · зв\'язок '+G.rtt+' мс':'')+'</span>';
      $('bSpec').classList.toggle('cd',me.scd>0); $('bBoost').classList.toggle('cd',me.boost<=0); } }
  $('hMsg').textContent=G.msgT>0?G.msg:''; const hb=$('hBig'); if(G.bigT>0){ hb.innerHTML=G.big+(G.bigS?'<small>'+G.bigS+'</small>':''); hb.style.opacity=Math.min(1,G.bigT*3).toFixed(2); } else if(hb.innerHTML) hb.innerHTML='';
  $('hit').style.opacity=G.hitT>0?(G.hitT/.5*.7).toFixed(2):0;
  let ti=0; if(play&&me){ for(const c of S.cars){ if(c===me) continue; const el=tags[ti++]; if(!el) break; V.project(c.x,c.y+MACH[c.ch].hh+1.2,c.z,pj); if(pj.z>1||Math.abs(pj.x)>1||Math.abs(pj.y)>1){ el.hidden=true; continue; } el.hidden=false; el.style.left=((pj.x+1)/2*100)+'%'; el.style.top=((1-pj.y)/2*100)+'%'; el.style.color=hex(TEAMC[c.team]); el.textContent=label(c); }
    const b=S.ball, ar=$('bArr'); V.project(b.x,b.y,b.z,pj); if(pj.z<1&&Math.abs(pj.x)<.94&&Math.abs(pj.y)<.9) ar.hidden=true; else { let x=pj.x, y=pj.y; if(pj.z>1){ x=-x; y=-y; } const ml=Math.max(Math.abs(x),Math.abs(y))||1; x=x/ml*.88; y=y/ml*.8; ar.hidden=false; ar.style.left=((x+1)/2*100)+'%'; ar.style.top=((1-y)/2*100)+'%'; ar.style.transform='rotate('+(Math.atan2(x,y)*180/Math.PI)+'deg)'; } }
  else $('bArr').hidden=true; for(;ti<tags.length;ti++) tags[ti].hidden=true; }

/* ---------- меню ---------- */
const ov=$('ov'), card=$('card'); let autoBig=false;
function ui(){ const play=G.mode==='play'; if(autoBig&&!play) setBig(false); document.body.classList.toggle('m',!play); ov.hidden=play; $('bMenu').hidden=G.mode==='menu'; $('bMenu').textContent=inRoom||G.mode==='room'?'Вийти з кімнати':'Меню'; $('hTop').hidden=$('hL').hidden=!play; $('bCam').hidden=!play; $('bCam').textContent='Камера: '+(V.camMode?'м\'яч':'машина');
  for(const id of ['bBoost','bJump','bSpec']) $(id).hidden=!play; if(play&&me) $('bSpec').textContent=MACH[me.ch].spn; if(!play){ for(const e of tags) e.hidden=true; $('bArr').hidden=true; $('hBig').innerHTML=''; G.bigT=0; }
  if(play){ setTimeout(V.resize,30); return; }
  const bar=(l,v)=>'<span>'+l+'</span><i style="--w:'+Math.round(clamp(v,.08,1)*100)+'%"></i>', opts=(arr,cur,attr)=>'<div class="rules">'+arr.map((n,i)=>'<button data-'+attr+'="'+i+'" class="'+(i===cur?'on':'')+'">'+n+'</button>').join('')+'</div>';
  if(G.mode==='menu'){ const M=MACH[myCh];
    card.innerHTML=(glOK?'':'<p>Цей пристрій не показує 3D у цьому вікні.</p>')+'<span class="k">Футбол на сільгосптехніці · версія '+VER+'</span><h3>Обери машину</h3><div class="chars">'+MACH.map((p,i)=>'<button data-ch="'+i+'" class="'+(i===myCh?'on':'')+'"><b>'+p.n+'</b><em>'+p.k+'</em><div class="stats">'+bar('Швидкість',p.vmax/26)+bar('Розгін',p.acc/18)+bar('Поворот',p.turn/3)+bar('Удар',p.hit/1.3)+bar('Вага',p.m/9)+'</div></button>').join('')+'</div>'+
      '<p class="rd"><b style="color:#fff">'+M.n+'.</b> '+M.d+' '+M.wd+'</p><input class="name" id="mName" maxlength="12" placeholder="твоє ім\'я для друзів" value="'+myName+'"><p class="rl">Проти комп\'ютера</p>'+opts(['1 на 1','2 на 2','3 на 3'],mySize-1,'size')+opts(SKILLS.map(s=>s.n),mySkill,'skill')+opts(['3 хвилини','5 хвилин'],myLen,'len')+
      '<div class="btns"><button id="mBot">Грати проти комп\'ютера</button><button class="sec" id="mHost">Кімната для друзів (до 6)</button><button class="sec" id="mFree">Тренування</button></div><p class="rd">У кімнату друзі заходять за одним посиланням; машину й команду кожен обирає вже там. Вільні місця можна зайняти комп\'ютерами.</p>';
    card.querySelectorAll('button[data-ch]').forEach(b=>b.onclick=()=>{ myCh=+b.dataset.ch; save(); ui(); });
    card.querySelectorAll('button[data-size]').forEach(b=>b.onclick=()=>{ mySize=+b.dataset.size+1; save(); ui(); }); card.querySelectorAll('button[data-skill]').forEach(b=>b.onclick=()=>{ mySkill=+b.dataset.skill; save(); ui(); }); card.querySelectorAll('button[data-len]').forEach(b=>b.onclick=()=>{ myLen=+b.dataset.len; save(); ui(); });
    $('mName').onchange=()=>{ myName=clean($('mName').value); save(); };
    $('mBot').onclick=()=>{ audioInit(); start(soloCfg()); }; $('mHost').onclick=()=>{ audioInit(); hostGame(); }; $('mFree').onclick=()=>{ audioInit(); start({kind:'free',myId:0,players:[{id:0,ch:myCh,team:0}]}); };
    if(!glOK) card.querySelectorAll('.btns button').forEach(b=>b.disabled=true); }
  else if(G.mode==='end'){ card.innerHTML='<span class="k">Матч завершено</span><h3>'+(G.win?'Перемога!':'Поразка')+'</h3><p class="code">'+G.res.replace(/^(Перемога! |Поразка\. )/,'')+'</p>'+(G.resS?'<p>'+G.resS+'</p>':'')+'<div class="btns"><button id="oAgain">Ще раз</button><button class="sec" id="oMenu">У меню</button></div>';
    $('oAgain').onclick=()=>start(soloCfg()); $('oMenu').onclick=()=>{ G.mode='menu'; ui(); }; }
  else if(G.mode==='room'){ const url=location.origin+location.pathname+'?g='+code;
    if(netState==='err'){ card.innerHTML='<h3>Не вийшло</h3><p>'+G.netMsg+'</p><div class="btns"><button id="lBack">У меню</button></div>'; }
    else if(netState==='join'||netState==='open'){ card.innerHTML='<span class="k">Кімната '+code+'</span><h3>'+(netState==='join'?'Заходимо в кімнату…':'Створюємо кімнату…')+'</h3><p>Це займає кілька секунд.</p><div class="btns"><button class="sec" id="lBack">Назад</button></div>'; }
    else { const meP=R.P.find(q=>q.id===myId)||{ch:myCh,team:0}, why=canStart();
      let h='<span class="k">Кімната '+code+' · людей: '+R.P.filter(q=>!q.bot).length+' / 6</span>'+(G.res?'<h3>'+G.res+'</h3>'+(G.resS?'<p>'+G.resS+'</p>':''):'<h3>'+(isHost?'Збери друзів і тисни «Старт»':'Ти в кімнаті')+'</h3>');
      for(let t=0;t<2;t++){ h+='<p class="rl" style="color:'+hex(TEAMC[t])+'!important">'+TEAMN[t]+'</p><div class="plist">'+(R.P.filter(q=>q.team===t).map(q=>'<div><i style="background:'+hex(TEAMC[t])+'"></i><b>'+(q.bot?'Комп\'ютер «'+BOTN[(q.id-6)%BOTN.length]+'»':(q.name||'Гравець '+(q.id+1))+(q.id===myId?' — ти':'')+(q.id===0?' · господар':''))+'</b><span>'+MACH[q.ch].n+'</span>'+(q.bot&&isHost&&!R.playing?'<button class="mini" data-rcyc="'+q.id+'" title="інша машина">↻</button><button class="mini" data-rdel="'+q.id+'" title="прибрати">✕</button>':'')+'</div>').join('')||'<div style="opacity:.6">поки нікого</div>')+'</div>'; }
      if(R.playing) h+='<p>Зараз іде матч. Наступний почнеться, щойно цей закінчиться.</p>';
      else { h+='<p class="rl">Твоє ім\'я</p><input class="name" id="rName" maxlength="12" placeholder="як тебе підписати" value="'+myName+'">'; h+='<p class="rl">Твоя машина</p><div class="rules">'+MACH.map((p,i)=>'<button data-rch="'+i+'" class="'+(i===meP.ch?'on':'')+'">'+p.n+'</button>').join('')+'</div>';
        h+='<p class="rl">Твоя команда</p><div class="rules">'+TEAMN.map((n,i)=>'<button data-rteam="'+i+'" class="'+(i===meP.team?'on':'')+'"'+(i===meP.team?' style="background:'+hex(TEAMC[i])+';border-color:'+hex(TEAMC[i])+';color:#fff"':'')+'>'+n+'</button>').join('')+'</div>';
        if(isHost){ h+='<p class="rl">Комп\'ютери</p><div class="rules">'+TEAMN.map((n,i)=>'<button data-rbot="'+i+'"'+(botOk(i)?'':' disabled')+'>+ до «'+n+'»</button>').join('')+'</div>'+'<p class="rl">Матч</p>'+opts(['3 хвилини','5 хвилин'],R.len,'rlen')+opts(SKILLS.map(s=>'Комп\'ютери: '+s.n),R.skill,'rskill'); }
        else h+='<p>Матч: '+(R.len?'5 хвилин':'3 хвилини')+' · комп\'ютери: '+SKILLS[R.skill].n+'</p>'; }
      h+='<p class="rl">Посилання для друзів</p><div class="link" id="lUrl">'+url+'</div><div class="btns">'+(isHost&&!R.playing?'<button id="rStart"'+(why?' disabled':'')+'>Старт</button>':'')+'<button class="sec" id="lCopy">Скопіювати посилання</button>'+(navigator.share?'<button class="sec" id="lShare">Надіслати</button>':'')+'<button class="sec" id="lBack">Вийти</button></div>'+(isHost&&why&&!R.playing?'<p>'+why+'</p>':'')+(!isHost&&!R.playing?'<p>Чекаємо, поки господар натисне «Старт».</p>':'');
      card.innerHTML=h;
      card.querySelectorAll('button[data-rch]').forEach(b=>b.onclick=()=>{ audioInit(); myCh=+b.dataset.rch; save(); if(isHost) roomPick(0,myCh,null); else send({t:'pick',ch:myCh},0); });
      card.querySelectorAll('button[data-rteam]').forEach(b=>b.onclick=()=>{ audioInit(); if(isHost) roomPick(0,null,+b.dataset.rteam); else send({t:'pick',team:+b.dataset.rteam},0); });
      card.querySelectorAll('button[data-rbot]').forEach(b=>b.onclick=()=>botAdd(+b.dataset.rbot)); card.querySelectorAll('button[data-rdel]').forEach(b=>b.onclick=()=>botDel(+b.dataset.rdel)); card.querySelectorAll('button[data-rcyc]').forEach(b=>b.onclick=()=>botCyc(+b.dataset.rcyc));
      card.querySelectorAll('button[data-rlen]').forEach(b=>b.onclick=()=>{ R.len=+b.dataset.rlen; roomCast(); }); card.querySelectorAll('button[data-rskill]').forEach(b=>b.onclick=()=>{ R.skill=+b.dataset.rskill; roomCast(); });
      if($('rName')) $('rName').onchange=()=>{ myName=clean($('rName').value); save(); if(isHost) roomPick(0,null,null,myName); else send({t:'pick',name:myName},0); };
      if($('rStart')) $('rStart').onclick=()=>{ audioInit(); hostStartMatch(); };
      $('lCopy').onclick=()=>{ const done=()=>{ $('lCopy').textContent='Скопійовано'; }; try{ navigator.clipboard.writeText(url).then(done,()=>{}); }catch(e){} };
      if($('lShare')) $('lShare').onclick=()=>{ try{ navigator.share({title:'Жнива-ліга',text:'Заходь у мою кімнату',url:url}).catch(()=>{}); }catch(e){} }; }
    if($('lBack')) $('lBack').onclick=()=>{ netClose(); G.mode='menu'; G.res=''; ui(); }; }
  setTimeout(V.resize,30); }

/* ---------- звук ---------- */
let AC=null, master=null, sndOn=true, eng=null, nz=null;
function audioInit(){ if(AC){ if(AC.state==='suspended') AC.resume(); return; } try{ AC=new (window.AudioContext||window.webkitAudioContext)(); }catch(e){ AC=null; return; }
  master=AC.createGain(); master.gain.value=sndOn?.9:0; master.connect(AC.destination);
  const o1=AC.createOscillator(), o2=AC.createOscillator(), lp=AC.createBiquadFilter(), g=AC.createGain(); o1.type='sawtooth'; o2.type='square'; lp.type='lowpass'; lp.frequency.value=520; g.gain.value=0; o1.connect(lp); o2.connect(lp); lp.connect(g); g.connect(master); o1.start(); o2.start(); eng={o1:o1,o2:o2,g:g,lp:lp};
  const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate), d=buf.getChannelData(0); for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1; const ns=AC.createBufferSource(); ns.buffer=buf; ns.loop=true;
  const bp=AC.createBiquadFilter(); bp.type='bandpass'; bp.frequency.value=900; bp.Q.value=.6; const gB=AC.createGain(); gB.gain.value=0; ns.connect(bp); bp.connect(gB); gB.connect(master);
  const cp=AC.createBiquadFilter(); cp.type='bandpass'; cp.frequency.value=1400; cp.Q.value=.4; const gC=AC.createGain(); gC.gain.value=0; ns.connect(cp); cp.connect(gC); gC.connect(master); ns.start(); nz={gB:gB,gC:gC,ns:ns}; }
const snd={
  beep(f,delay,dur,type,vol,f2){ if(!AC||!sndOn) return; const t=AC.currentTime+delay, o=AC.createOscillator(), g=AC.createGain(); o.type=type; o.frequency.setValueAtTime(f,t); if(f2) o.frequency.exponentialRampToValueAtTime(f2,t+dur); g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.012); g.gain.exponentialRampToValueAtTime(.0008,t+dur); o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.05); },
  noise(dur,vol,f){ if(!AC||!sndOn) return; const t=AC.currentTime, s=AC.createBufferSource(), g=AC.createGain(), fl=AC.createBiquadFilter(); s.buffer=nz.ns.buffer; fl.type='lowpass'; fl.frequency.value=f||1200; g.gain.setValueAtTime(vol,t); g.gain.exponentialRampToValueAtTime(.0008,t+dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(t,Math.random()); s.stop(t+dur+.05); },
  ev(e){ if(!AC||!me&&G.mode!=='play') return; const d=me?Math.hypot((e.x!=null?e.x:me.x)-me.x,(e.z!=null?e.z:me.z)-me.z):40, k=clamp(1-d/90,0,1); if(k<=0) return; const c=e.id!=null?S.cars.find(q=>q.id===e.id):null, mine=c===me;
    if(e.t==='hit'){ const v=clamp(e.v/22,.15,1.2); snd.beep(150+60*v,0,.16+.1*v,'sine',.3*v*k,50); snd.noise(.08+.06*v,.16*v*k,2200); }
    else if(e.t==='bounce'){ snd.beep(95,0,.14,'sine',.16*k*clamp(e.v/18,.2,1),45); }
    else if(e.t==='wall'){ snd.noise(.12,.1*k*clamp(e.v/18,.2,1),900); }
    else if(e.t==='bump'){ snd.beep(240,0,.18,'square',.14*k,90); snd.noise(.2,.2*k,3000); }
    else if(e.t==='clang'){ snd.beep(310,0,.08,'square',.06*k,160); }
    else if(e.t==='land'&&c){ const kk=clamp(1-Math.hypot(c.x-(me?me.x:0),c.z-(me?me.z:0))/60,0,1); snd.beep(70,0,.14,'sine',.2*kk,35); snd.noise(.1,.08*kk,500); }
    else if(e.t==='jump'&&mine){ snd.beep(260,0,.12,'triangle',.1,520); }
    else if(e.t==='dash'&&c){ snd.noise(.35,mine?.22:.1,1800); snd.beep(180,0,.3,'sawtooth',mine?.1:.04,420); }
    else if(e.t==='ram'&&c){ snd.beep(110,0,.5,'sawtooth',mine?.16:.07,70); snd.beep(220,.05,.4,'square',mine?.08:.03,140); }
    else if(e.t==='flip'&&c){ snd.noise(.25,mine?.14:.06,2400); if(mine) snd.beep(330,0,.2,'triangle',.08,660); }
    else if(e.t==='demo'){ snd.noise(.7,.4*k,900); snd.beep(90,0,.6,'sawtooth',.25*k,30); snd.beep(60,.05,.7,'square',.15*k,25); }
    else if(e.t==='respawn'&&mine){ snd.beep(440,0,.15,'triangle',.1,880); }
    else if(e.t==='arm'&&mine){ snd.beep(320,0,.18,'triangle',.07,640); } },
  goal(ours){ if(!AC) return; for(const f of [220,277,330]){ snd.beep(f,0,1.1,'sawtooth',.11); snd.beep(f*1.005,.02,1.1,'square',.05); } snd.noise(.6,.3,700); const t=AC.currentTime; nz.gC.gain.cancelScheduledValues(t); nz.gC.gain.setValueAtTime(.03,t); nz.gC.gain.linearRampToValueAtTime(.2,t+.35); nz.gC.gain.linearRampToValueAtTime(.03,t+3.4); if(ours) [523,659,784,1047].forEach((f,i)=>snd.beep(f,.5+i*.11,.25,'triangle',.13)); },
  end(win){ if(!AC) return; (win?[523,659,784,1047,1319]:[392,330,262]).forEach((f,i)=>snd.beep(f,i*.16,.35,'triangle',.15)); },
  frame(){ if(!AC) return; const t=AC.currentTime, play=G.mode==='play'&&me; if(!play){ eng.g.gain.setTargetAtTime(0,t,.1); nz.gB.gain.setTargetAtTime(0,t,.1); nz.gC.gain.setTargetAtTime(0,t,.5); return; }
    const M=MACH[me.ch], sp=Math.hypot(me.vx,me.vz), base=62-M.m*3.2, f=base+sp*3.1+(Math.abs(me.inp.thr)>.3?10:0)+(me.boosting?22:0); eng.o1.frequency.setTargetAtTime(f,t,.06); eng.o2.frequency.setTargetAtTime(f*.502,t,.06); eng.lp.frequency.setTargetAtTime(380+sp*26,t,.1); eng.g.gain.setTargetAtTime(.035+.03*Math.abs(me.inp.thr)+(me.boosting?.03:0),t,.08);
    nz.gB.gain.setTargetAtTime(me.boosting?.14:me.drift>3&&!me.air?.05:0,t,.05); if(G.phase!=='goal') nz.gC.gain.setTargetAtTime(.022,t,.6); } };

/* ---------- керування ---------- */
let st=null; const SR=60;
function loc(e){ const r=$('stage').getBoundingClientRect(), rot=document.body.classList.contains('rot'); return rot?{x:e.clientY-r.top,y:r.right-e.clientX,w:r.height,h:r.width}:{x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}; }
cv.addEventListener('pointerdown',e=>{ if(G.mode!=='play') return; e.preventDefault(); audioInit(); if(e.pointerType==='mouse') return; const l=loc(e); if(st||l.x>l.w*.6) return; st={id:e.pointerId,x:l.x,y:l.y}; document.body.classList.add('used'); const el=$('sL'); el.hidden=false; el.style.left=l.x+'px'; el.style.top=l.y+'px'; el.firstChild.style.transform=''; try{cv.setPointerCapture(e.pointerId);}catch(_){ } });
cv.addEventListener('pointermove',e=>{ if(!st||st.id!==e.pointerId) return; const l=loc(e); let dx=(l.x-st.x)/SR, dy=(l.y-st.y)/SR; const m=Math.hypot(dx,dy); if(m>1){ dx/=m; dy/=m; } $('sL').firstChild.style.transform='translate('+dx*SR*.6+'px,'+dy*SR*.6+'px)'; const dz=v=>Math.abs(v)<.14?0:(v-Math.sign(v)*.14)/.86; I.sx=dz(dx); const ty=dz(-dy); I.sy=ty>0?Math.min(1,ty*1.6):Math.max(-1,ty*1.6); });
const pUp=e=>{ if(st&&st.id===e.pointerId){ st=null; $('sL').hidden=true; I.sx=I.sy=0; } }; cv.addEventListener('pointerup',pUp); cv.addEventListener('pointercancel',pUp); cv.addEventListener('contextmenu',e=>e.preventDefault());
function holdBtn(id,k){ const el=$(id), dn=e=>{ e.preventDefault(); audioInit(); I[k]=true; try{el.setPointerCapture(e.pointerId);}catch(_){ } }, up=()=>{ I[k]=false; }; el.addEventListener('pointerdown',dn); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('lostpointercapture',up); el.addEventListener('contextmenu',e=>e.preventDefault()); }
holdBtn('bBoost','boost'); holdBtn('bJump','jump'); holdBtn('bSpec','spec');
function camToggle(){ V.camMode=V.camMode?0:1; save(); $('bCam').textContent='Камера: '+(V.camMode?'м\'яч':'машина'); say(V.camMode?'Камера стежить за м\'ячем':'Камера за машиною',1.5); }
$('bCam').onclick=()=>{ audioInit(); camToggle(); };
const KM={KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',ArrowUp:'w',ArrowDown:'s',ArrowLeft:'a',ArrowRight:'d',Space:'jump',ShiftLeft:'boost',ShiftRight:'boost',KeyF:'spec',KeyE:'spec',KeyQ:'spec'};
window.addEventListener('keydown',e=>{ if(G.mode!=='play') return; const k=KM[e.code]; if(k){ key[k]=true; e.preventDefault(); audioInit(); } else if(e.code==='KeyC'&&!e.repeat) camToggle(); else if(e.code==='KeyR'&&G.kind==='free'&&me){ const b=S.ball; b.x=clamp(me.x+Math.cos(me.h)*9,-F.FL+3,F.FL-3); b.z=clamp(me.z+Math.sin(me.h)*9,-F.FW+3,F.FW-3); b.y=F.BR; b.vx=b.vy=b.vz=0; } });
window.addEventListener('keyup',e=>{ const k=KM[e.code]; if(k) key[k]=false; }); window.addEventListener('blur',()=>{ for(const k in key) key[k]=false; I.jump=I.boost=I.spec=false; });
$('bMenu').onclick=()=>{ netClose(); for(const c of S.cars) V.carRemove(c.mesh); S.cars.length=0; me=null; G.mode='menu'; G.res=''; ui(); };
$('bSnd').onclick=()=>{ sndOn=!sndOn; audioInit(); if(master) master.gain.value=sndOn?.9:0; $('bSnd').textContent='Звук: '+(sndOn?'увімк.':'вимк.'); $('bSnd').setAttribute('aria-pressed',sndOn?'true':'false'); };
function layoutBig(){ const b=document.body, bg=b.classList.contains('big'); b.classList.toggle('rot',bg&&coarse&&window.innerHeight>window.innerWidth*1.12); V.resize(); setTimeout(V.resize,90); setTimeout(V.resize,400); }
function tryFs(){ const el=document.documentElement; try{ const r=el.requestFullscreen||el.webkitRequestFullscreen; if(r){ const pr=r.call(el,{navigationUI:'hide'}); if(pr&&pr.then) pr.then(()=>{ try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} }).catch(()=>{}); } }catch(e){} }
function setBig(v,fs){ document.body.classList.toggle('big',v); $('bExit').hidden=!v; if(v){ if(fs) tryFs(); } else { autoBig=false; try{ if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(e){} } layoutBig(); }
$('bBig').onclick=()=>{ audioInit(); setBig(true,true); }; $('bExit').onclick=()=>setBig(false);
document.addEventListener('fullscreenchange',layoutBig); window.addEventListener('resize',layoutBig); window.addEventListener('pagehide',()=>netClose());

/* ---------- цикл ---------- */
let last=0;
function frame(ts){ const dt=Math.min(.1,(ts-last)/1000||0); last=ts; if(dt>0) fps+=(1/dt-fps)*.05; let sdt=0;
  if(G.mode==='play'&&(!document.hidden||G.kind==='net')){ let k=1; if(G.slow>0){ G.slow-=dt; k=.3+.7*clamp(1-G.slow/1.15,0,1); } sdt=dt*k; let r=sdt; while(r>1e-5&&G.mode==='play'){ const s=Math.min(r,1/120); step(s); r-=s; } netFrame(dt); if(G.bigT>0) G.bigT-=dt; if(G.hitT>0) G.hitT-=dt; }
  else netFrame(dt);
  if(glOK){ V.frame(S,G.mode==='play'?me:null,sdt,dt,G.phase); if(G.mode==='play') hud(); V.render(); } snd.frame(); requestAnimationFrame(frame); }
new ResizeObserver(V.resize).observe(cv); V.resize(); ui(); if(invite&&glOK) joinGame(invite); requestAnimationFrame(frame);
if(isLoc) window.__z={get me(){return me;},get S(){return S;},G:G,I:I,R:R,V:V,Z:Z,key:key,step:step,start:start,soloCfg:soloCfg,hud:hud,net:()=>({room:inRoom,host:isHost,id:myId,code:code,st:netState,msg:G.netMsg,n:R.P.length})};
})();
