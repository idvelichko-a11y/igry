/* Жнива-ліга — ядро: поле, м'яч, машини, зіткнення, комп'ютерні гравці. Без графіки: працює і в браузері, і в node. */
(function(root){
"use strict";
const clamp=(v,a,b)=>v<a?a:v>b?b:v, hyp=Math.hypot;
/* поле: ворота на x=±FL; команда 0 (сині) захищає −x і б'є в +x */
const F={FL:60,FW:40,CH:13,GW:11,GH:7,GD:7,CEIL:26,BR:1.7,G:26,MB:.7};
/* машини: m — маса (умовні тонни), hl/hw/hh — півдовжина, півширина, висота, vmax м/с, acc м/с², turn рад/с, jump м/с, hit — сила удару */
const MACH=[
 {n:'Малюк',k:'малий трактор',sp:'dash',spn:'РИВОК',m:1.5,hl:1.55,hw:.9,hh:1.8,vmax:25.5,acc:18,turn:3,jump:11.8,hit:.86,imp:11,scd:4,
  d:'Найшвидший і найверткіший, стрибає найвище. Удар слабкий, і його легко відштовхнути.',wd:'Ривок: короткий кидок уперед.'},
 {n:'Універсал',k:'середній трактор',sp:'dash',spn:'РИВОК',m:3,hl:2.1,hw:1.15,hh:2.35,vmax:23.5,acc:14,turn:2.45,jump:10.2,hit:1,imp:7.5,scd:5,
  d:'Рівний у всьому: швидкість, удар, поворот.',wd:'Ривок слабший, ніж у Малюка.'},
 {n:'Силач',k:'великий трактор',sp:'ram',spn:'ТАРАН',m:6.5,hl:2.9,hw:1.5,hh:2.9,vmax:22,acc:11.5,turn:2,jump:8.6,hit:1.3,scd:8,
  d:'Найсильніший удар, розштовхує інших. Довго розганяється і широко розвертається.',wd:'Таран: 2 секунди його не зрушити, удар ще сильніший.'},
 {n:'Телескоп',k:'телескопічний навантажувач',sp:'boom',spn:'СТРІЛА',m:4,hl:2.4,hw:1.15,hh:2.1,vmax:21,acc:11.5,turn:2.15,jump:8.6,hit:1,scd:0,
  d:'Стріла піднімається й висувається: дістає високий м\'яч, підкидає його, відбиває як воротар.',wd:'Тримай кнопку — стріла йде вгору і вперед. З висунутою стрілою повертає гірше.'},
 {n:'Комбайн',k:'зернозбиральний комбайн',sp:'hdr',spn:'ЖАТКА',m:9,hl:3.2,hw:1.7,hh:3.3,vmax:19,acc:9.5,turn:1.7,jump:7.2,hit:1.15,scd:0,hw2:4.3,
  d:'Широка жатка закриває півворіт і штовхає м\'яч. Найповільніший і неповороткий.',wd:'Тримай кнопку — жатка піднімається й відбиває високі м\'ячі, а низькі проходять під нею.'},
 {n:'Гусень',k:'гусеничний трактор',sp:'lock',spn:'УПОР',trk:true,m:7.5,hl:2.3,hw:1.45,hh:2.5,vmax:19,acc:15,turn:2.6,jump:6.8,hit:1.15,scd:0,
  d:'Розвертається на місці, як танк, і не ковзає. Важкий: його важко зрушити. Повільний, майже не стрибає, турбо дає менше.',wd:'Упор: тримай кнопку — гусениці стоять намертво, його не зрушити, а м\'яч відскакує як від стіни. Корпус можна повертати.'}
];
const KO=[[-24,0],[-37,-14],[-37,14]];
const PADS=[[-46,-27,1],[46,-27,1],[-46,27,1],[46,27,1],[0,-34,1],[0,34,1],[-22,-12,0],[22,-12,0],[-22,12,0],[22,12,0],[-38,0,0],[38,0,0],[0,-16,0],[0,16,0]];

function newCar(id,ch,team){ return {id:id,ch:clamp(ch|0,0,MACH.length-1),team:team?1:0,local:true,bot:false,x:0,y:0,z:0,h:0,vx:0,vy:0,vz:0,w:0,st:0,boost:34,boosting:false,
  ext:0,extV:0,scd:0,dashT:0,ramT:0,jcd:0,wk:0,drift:0,air:false,pit:0,flipT:0,flipUsed:false,jPrev:false,airT:0,demoT:0,tip:null,tv:[0,0,0],inp:{thr:0,steer:0,jump:false,boost:false,spec:false},specPrev:false,bs:null,rp:null,goals:0,touchT:0}; }
function newBall(){ return {x:0,y:F.BR,z:0,vx:0,vy:0,vz:0,touch:-1,team:-1,spin:0}; }
function newState(){ return {cars:[],ball:newBall(),pads:PADS.map(()=>0),ev:[],t:0,frozen:false}; }
function kickoff(S){ const cnt=[0,0]; for(const c of S.cars){ const k=KO[cnt[c.team]++%3], s=c.team?-1:1; if(c.local){ c.x=k[0]*s; c.z=k[1]*s+(c.bot?(Math.random()-.5)*3:0); c.y=0; c.h=c.team?Math.PI:0; c.vx=c.vy=c.vz=c.w=c.st=c.wk=0; c.ext=c.extV=0; c.dashT=c.ramT=0; c.scd=0; c.boost=34; c.tip=null; c.pit=0; c.flipT=0; c.flipUsed=false; c.demoT=0; } }
  const b=S.ball; b.x=0; b.y=F.BR; b.z=0; b.vx=b.vy=b.vz=0; b.touch=-1; b.team=-1; for(let i=0;i<S.pads.length;i++) S.pads[i]=0; }
function effMass(c){ return MACH[c.ch].m*(c.ramT>0?6:1)*(c.lock?400:1); }
/* стріла навантажувача: шарнір ззаду на даху, кінець із вилами */
function boomGeo(c){ const e=c.ext, ang=(4+56*e)*Math.PI/180, len=3.4+4.4*e, fx=Math.cos(c.h), fz=Math.sin(c.h), ca=Math.cos(ang), sa=Math.sin(ang), px=c.x-fx*1.1, py=c.y+2.25, pz=c.z-fz*1.1;
  return {px:px,py:py,pz:pz,tx:px+fx*ca*len,ty:py+sa*len,tz:pz+fz*ca*len,ang:ang,len:len}; }
function hdrY(c){ return c.y+.15+c.ext*2.7; }

function stepCar(c,dt,S){ const M=MACH[c.ch], inp=c.inp, frozen=S.frozen; if(c.demoT>0){ c.demoT-=dt; c.vx=c.vy=c.vz=c.w=0; if(c.demoT<=0){ const s=c.team?1:-1; c.x=s*(F.FL-9); c.z=(c.id%3-1)*6; c.y=0; c.h=c.team?Math.PI:0; c.pit=0; c.flipT=0; c.wk=0; c.boost=Math.max(c.boost,34); c.tip=null; S.ev.push({t:'respawn',id:c.id}); } return; }
  let thr=frozen?0:clamp(inp.thr,-1,1); const thrRaw=thr; const steer=frozen?0:clamp(inp.steer,-1,1);
  if(c.scd>0) c.scd-=dt; if(c.dashT>0) c.dashT-=dt; if(c.ramT>0) c.ramT-=dt; if(c.jcd>0) c.jcd-=dt;
  c.st+=clamp(steer-c.st,-7*dt,7*dt);
  const fx=Math.cos(c.h), fz=Math.sin(c.h); let vf=c.vx*fx+c.vz*fz, vl=-c.vx*fz+c.vz*fx; const ground=c.y<=.001;
  /* особлива кнопка */
  const sp=!frozen&&inp.spec, edge=sp&&!c.specPrev; c.specPrev=!!inp.spec;
  if(M.sp==='dash'&&edge&&c.scd<=0){ c.scd=M.scd; c.dashT=.55; vf=Math.max(vf,0)+M.imp; S.ev.push({t:'dash',id:c.id}); }
  if(M.sp==='ram'&&edge&&c.scd<=0){ c.scd=M.scd; c.ramT=2; vf+=3; S.ev.push({t:'ram',id:c.id}); }
  c.lock=M.sp==='lock'&&sp&&c.y<=.001; if(M.sp==='lock'&&edge) S.ev.push({t:'lock',id:c.id});
  if(M.sp==='boom'||M.sp==='hdr'){ const e0=c.ext, up=M.sp==='boom'?3.1:3.2, dn=M.sp==='boom'?1.9:2.6; c.ext=clamp(c.ext+(sp?up:-dn)*dt,0,1); c.extV=(c.ext-e0)/dt; if(edge) S.ev.push({t:'arm',id:c.id}); }
  c.boosting=!frozen&&inp.boost&&c.boost>0; if(c.boosting){ c.boost=Math.max(0,c.boost-27*dt); if(thr<=0) thr=1; }
  const vmax=M.vmax*(c.boosting?(M.trk?1.2:1.36):1)*(c.dashT>0?1.3:1)*(c.ramT>0?1.08:1);
  if(ground){ let a;
    if(c.lock){ thr=0; vf*=Math.exp(-14*dt); vl*=Math.exp(-14*dt); }
    if(thr>0) a=M.acc*(c.boosting?(M.trk?1.4:1.75):1)*thr*Math.max(0,1-vf/vmax)+(vf<0?20:0);
    else if(thr<0) a=vf>1?-26*-thr:M.acc*.75*thr*Math.max(0,1+vf/(M.vmax*.42));
    else a=-vf*.9-Math.sign(vf)*Math.min(Math.abs(vf),1.2);
    if(vf>vmax) a-=(vf-vmax)*2.2;
    vf+=a*dt;
    const sf=Math.min(1,Math.abs(vf)/M.vmax), slide=Math.abs(c.st)*sf, grip=M.trk?15:10.5-7.2*slide*slide-(c.wk?3:0); vl*=Math.exp(-grip*dt); c.drift=Math.abs(vl);
    const bk=M.sp==='boom'?1-.45*c.ext:1; c.w=M.trk?c.st*M.turn*(c.lock?.6:1)*(vf<-1.5?-1:1):c.st*M.turn*clamp(vf/7,-1,1)*(1-.4*sf)*bk;
    c.pit*=Math.exp(-14*dt); c.airT=0; c.flipUsed=false;
  } else { c.w=c.st*1.3; c.airT+=dt; c.drift=0;
    if(c.flipT>0){ c.flipT-=dt; } else c.pit=clamp(c.pit-thrRaw*2.3*dt,-1.1,1.35);
    if(c.boosting){ const A=M.trk?22:29; vf+=A*Math.cos(c.pit)*dt; c.vy+=A*Math.sin(c.pit)*dt; if(c.y>15&&c.vy>0) c.vy*=Math.exp(-4*dt); if(vf>vmax*1.15) vf-=(vf-vmax*1.15)*3*dt; } }
  { const jp=!frozen&&inp.jump, je=jp&&!c.jPrev; c.jPrev=!!jp; if(je&&!ground&&!c.flipUsed&&c.airT>.08&&c.airT<1.5){ c.flipUsed=true; c.flipT=.5; c.pit=0; c.vy=Math.max(c.vy,0)+3.2; vf+=7.5; S.ev.push({t:'flip',id:c.id}); } }
  if(c.wk){ c.w+=c.wk; c.wk*=Math.exp(-3*dt); if(Math.abs(c.wk)<.05) c.wk=0; }
  c.vx=fx*vf-fz*vl; c.vz=fz*vf+fx*vl; c.h+=c.w*dt;
  if(!frozen&&inp.jump&&ground&&c.jcd<=0){ c.vy=M.jump; c.jcd=.3; c.y=.002; S.ev.push({t:'jump',id:c.id}); }
  if(c.y>0||c.vy>0){ c.vy-=F.G*dt; c.y+=c.vy*dt; if(c.y<=0){ if(c.vy<-7) S.ev.push({t:'land',id:c.id,v:-c.vy}); if(Math.abs(c.pit)>.85){ c.vx*=.55; c.vz*=.55; c.wk=(c.pit>0?1:-1)*1.5; } c.y=0; c.vy=0; c.flipT=0; } }
  c.air=c.y>.05;
  c.x+=c.vx*dt; c.z+=c.vz*dt; carWalls(c,M); updParts(c,dt); }
/* швидкість кінця стріли — потрібна, щоб м'яч «підкидало» */
function updParts(c,dt){ if(MACH[c.ch].sp!=='boom') return; const g=boomGeo(c); if(c.tip&&dt>0){ const k=1/dt; c.tv[0]=clamp((g.tx-c.tip[0])*k,-60,60); c.tv[1]=clamp((g.ty-c.tip[1])*k,-60,60); c.tv[2]=clamp((g.tz-c.tip[2])*k,-60,60); } c.tip=[g.tx,g.ty,g.tz]; }
function carWalls(c,M){ const fx=Math.cos(c.h), fz=Math.sin(c.h), pr=[[M.hl,M.hw],[M.hl,-M.hw],[-M.hl,M.hw],[-M.hl,-M.hw]]; if(M.hw2){ pr.push([M.hl+1.7,M.hw2],[M.hl+1.7,-M.hw2]); }
  const inMouth=Math.abs(c.z)<F.GW-.2, lim=F.FL+F.FW-F.CH, s2=Math.SQRT1_2;
  for(const q of pr){ const px=c.x+fx*q[0]-fz*q[1], pz=c.z+fz*q[0]+fx*q[1]; let nx=0, nz=0, pen=0;
    if(Math.abs(pz)>F.FW){ nz=-Math.sign(pz); pen=Math.abs(pz)-F.FW; }
    else if(Math.abs(px)>F.FL){ if(inMouth){ if(Math.abs(px)>F.FL+F.GD){ nx=-Math.sign(px); pen=Math.abs(px)-F.FL-F.GD; } else if(Math.abs(pz)>F.GW){ nz=-Math.sign(pz); pen=Math.abs(pz)-F.GW; } } else { nx=-Math.sign(px); pen=Math.abs(px)-F.FL; } }
    else { const d=Math.abs(px)+Math.abs(pz)-lim; if(d>0){ nx=-Math.sign(px)*s2; nz=-Math.sign(pz)*s2; pen=d*s2; } }
    if(pen>0){ c.x+=nx*pen; c.z+=nz*pen; const vn=c.vx*nx+c.vz*nz; if(vn<0){ c.vx-=nx*vn*1.25; c.vz-=nz*vn*1.25; } } } }

function stepBall(b,dt,S){ const r=F.BR; b.vy-=F.G*dt; const dr=Math.exp(-.12*dt); b.vx*=dr; b.vz*=dr; b.x+=b.vx*dt; b.y+=b.vy*dt; b.z+=b.vz*dt;
  const sp=hyp(b.vx,b.vy,b.vz); if(sp>70){ const k=70/sp; b.vx*=k; b.vy*=k; b.vz*=k; }
  if(b.y<r){ b.y=r; if(b.vy<0){ if(b.vy<-5) S.ev.push({t:'bounce',v:-b.vy,x:b.x,y:0,z:b.z}); b.vy=-b.vy*.62; if(b.vy<1.6) b.vy=0; } const fr=Math.exp(-.55*dt); b.vx*=fr; b.vz*=fr; }
  if(b.y>F.CEIL-r){ b.y=F.CEIL-r; if(b.vy>0) b.vy=-b.vy*.6; }
  const wall=(nx,nz,pen,e)=>{ b.x+=nx*pen; b.z+=nz*pen; const vn=b.vx*nx+b.vz*nz; if(vn<0){ b.vx-=nx*vn*(1+e); b.vz-=nz*vn*(1+e); if(vn<-6) S.ev.push({t:'wall',v:-vn,x:b.x-nx*r,y:b.y,z:b.z-nz*r}); } };
  if(Math.abs(b.z)>F.FW-r&&Math.abs(b.x)<=F.FL) wall(0,-Math.sign(b.z),Math.abs(b.z)-(F.FW-r),.74);
  const ax=Math.abs(b.x), sx=Math.sign(b.x)||1;
  if(ax>F.FL-r){ const inMouth=Math.abs(b.z)<F.GW&&b.y<F.GH;
    if(!inMouth&&ax<=F.FL+.3) wall(-sx,0,ax-(F.FL-r),.74);
    else { /* стійки й поперечина */
      for(const z0 of [-F.GW,F.GW]){ const dx=ax-F.FL, dz=b.z-z0, d=hyp(dx,dz); if(d<r&&d>1e-4&&b.y<F.GH+r*.5){ const nx=dx/d*sx, nz=dz/d, pen=r-d; wall(nx,nz,pen,.6); } }
      { const dx=ax-F.FL, dy=b.y-F.GH, d=hyp(dx,dy); if(d<r&&d>1e-4&&Math.abs(b.z)<F.GW){ const nx=dx/d*sx, ny=dy/d, pen=r-d; b.x+=nx*pen; b.y+=ny*pen; const vn=b.vx*nx+b.vy*ny; if(vn<0){ b.vx-=nx*vn*1.6; b.vy-=ny*vn*1.6; S.ev.push({t:'wall',v:-vn,x:b.x,y:b.y,z:b.z}); } } }
      if(Math.abs(b.x)>F.FL){ /* усередині воріт — сітка гасить */
        if(Math.abs(b.z)>F.GW-r){ b.z=Math.sign(b.z)*(F.GW-r); b.vz*=-.3; }
        if(b.y>F.GH-r){ b.y=F.GH-r; if(b.vy>0) b.vy*=-.3; }
        if(Math.abs(b.x)>F.FL+F.GD-r){ b.x=sx*(F.FL+F.GD-r); b.vx*=-.25; } } } }
  { const lim=F.FL+F.FW-F.CH, d=(Math.abs(b.x)+Math.abs(b.z)-lim)*Math.SQRT1_2+r; if(d>0&&Math.abs(b.x)<=F.FL) wall(-(Math.sign(b.x)||1)*Math.SQRT1_2,-(Math.sign(b.z)||1)*Math.SQRT1_2,d,.74); }
  b.spin+=hyp(b.vx,b.vz)*dt/r; }
/* гол: м'яч цілком за лінією. Повертає команду, що забила, або −1 */
function goalOf(b){ if(Math.abs(b.x)>F.FL+F.BR*.55&&Math.abs(b.z)<F.GW&&b.y<F.GH) return b.x>0?0:1; return -1; }

function impact(b,c,S,nx,ny,nz,pen,cvx,cvy,cvz,power,mEff,lift){ if(lift&&ny<.4&&b.y<F.BR+1.6){ ny+=.24; const l=hyp(nx,ny,nz); nx/=l; ny/=l; nz/=l; }
  b.x+=nx*pen; b.y+=ny*pen; b.z+=nz*pen; const vn=(b.vx-cvx)*nx+(b.vy-cvy)*ny+(b.vz-cvz)*nz; if(vn>=0) return;
  const k=mEff/(mEff+F.MB), close=-vn, again=S.t-(b.lastHit||-9)<.12&&b.touch!==c.id; let j=again?close*k*.85:(1+(c.lock?.72:.42))*close*k; if(close>4&&!again&&!c.lock) j+=Math.min(9,close*.2)*power; if(!again) j*=(.75+.25*power); b.lastHit=S.t;
  b.vx+=nx*j; b.vy+=ny*j; b.vz+=nz*j; if(b.vy>21) b.vy=21; b.touch=c.id; b.team=c.team; c.touchT=S.t;
  if(c.local&&c.ramT<=0&&!c.lock){ const kc=j*F.MB/mEff*.5; c.vx-=nx*kc; c.vz-=nz*kc; }
  if(close>3) S.ev.push({t:'hit',id:c.id,v:close,j:j,x:b.x-nx*F.BR,y:b.y-ny*F.BR,z:b.z-nz*F.BR}); }
function sphHit(b,c,S,sx,sy,sz,sr,vx,vy,vz,power,mEff){ const dx=b.x-sx, dy=b.y-sy, dz=b.z-sz, d=hyp(dx,dy,dz), R=F.BR+sr; if(d>=R||d<1e-4) return false; impact(b,c,S,dx/d,dy/d,dz/d,R-d,vx,vy,vz,power,mEff,false); return true; }
function boxHit(b,c,S,cx,cl,hl,hwz,y0,y1,vyAdd,power,mEff){ /* коробка в осях машини: центр уздовж cx, півдовжина cl */
  const fx=Math.cos(c.h), fz=Math.sin(c.h), dx=b.x-c.x, dz=b.z-c.z, lx=dx*fx+dz*fz-cx, lz=-dx*fz+dz*fx, qx=clamp(lx,-cl,cl), qz=clamp(lz,-hwz,hwz), qy=clamp(b.y,y0,y1);
  let ex=lx-qx, ey=b.y-qy, ez=lz-qz, d=hyp(ex,ey,ez); if(d>=F.BR) return false;
  if(d<1e-4){ ex=lx; ey=b.y-(y0+y1)/2+.5; ez=lz; d=hyp(ex,ey,ez)||1; }
  const nlx=ex/d, nly=ey/d, nlz=ez/d, nx=nlx*fx-nlz*fz, nz=nlx*fz+nlz*fx, px=(qx+cx)*fx-qz*fz, pz=(qx+cx)*fz+qz*fx;
  impact(b,c,S,nx,nly,nz,F.BR-d,c.vx-c.w*pz,c.vy+vyAdd,c.vz+c.w*px,power,mEff,true); return true; }
function ballVsCar(b,c,S){ if(c.demoT>0) return; const M=MACH[c.ch], mE=effMass(c), pw=M.hit*(c.ramT>0?1.35:1)*(c.dashT>0?1.12:1)*(c.flipT>0?1.3:1); if(hyp(b.x-c.x,b.z-c.z)>F.BR+M.hl+9) return;
  boxHit(b,c,S,0,M.hl,M.hl,M.hw,c.y+.35,c.y+M.hh,0,pw,mE);
  if(M.sp==='hdr'){ const y0=hdrY(c); boxHit(b,c,S,M.hl+.9,.9,.9,M.hw2,y0,y0+1.3,c.extV*2.7,pw*1.05,mE); }
  if(M.sp==='boom'&&c.tip){ const g=boomGeo(c), tv=c.tv; if(!sphHit(b,c,S,g.tx,g.ty,g.tz,1.05,tv[0],tv[1],tv[2],pw*1.2,mE*.7)){
      const ax=g.tx-g.px, ay=g.ty-g.py, az=g.tz-g.pz, L2=ax*ax+ay*ay+az*az, t=clamp(((b.x-g.px)*ax+(b.y-g.py)*ay+(b.z-g.pz)*az)/L2,0,1);
      sphHit(b,c,S,g.px+ax*t,g.py+ay*t,g.pz+az*t,.45,c.vx+(tv[0]-c.vx)*t,c.vy+(tv[1]-c.vy)*t,c.vz+(tv[2]-c.vz)*t,pw,mE*.7); } } }
/* кола для зіткнень машин між собою */
function circles(c,out){ const M=MACH[c.ch], fx=Math.cos(c.h), fz=Math.sin(c.h); out.length=0; const n=M.hl/M.hw>1.5?3:2; for(let i=0;i<n;i++){ const o=n===1?0:-(M.hl-M.hw)+i*(2*(M.hl-M.hw))/(n-1); out.push([c.x+fx*o,c.z+fz*o,M.hw]); }
  if(M.hw2&&c.ext<.55){ for(let i=-2;i<=2;i++){ const lx=M.hl+.9, lz=i*M.hw2/2.4; out.push([c.x+fx*lx-fz*lz,c.z+fz*lx+fx*lz,.95]); } } return out; }
const cA=[], cB=[];
function carVsCar(a,b,S){ if(!a.local||a.demoT>0||b.demoT>0) return; const MA=MACH[a.ch], MBm=MACH[b.ch]; if(hyp(a.x-b.x,a.z-b.z)>MA.hl+MBm.hl+6) return; if(a.y>b.y+MBm.hh-.3||b.y>a.y+MA.hh-.3) return;
  circles(a,cA); circles(b,cB); const ma=effMass(a), mb=effMass(b), share=mb/(ma+mb);
  for(const p of cA) for(const q of cB){ const dx=p[0]-q[0], dz=p[1]-q[1], d=hyp(dx,dz), R=p[2]+q[2]; if(d>=R||d<1e-4) continue; const nx=dx/d, nz=dz/d, pen=(R-d)*share; a.x+=nx*pen; a.z+=nz*pen; p[0]+=nx*pen; p[1]+=nz*pen;
      const vn=(a.vx-b.vx)*nx+(a.vz-b.vz)*nz; if(vn<0){ const k=-vn*1.3*share; a.vx+=nx*k; a.vz+=nz*k; if(-vn>24&&share>.62&&a.ramT<=0&&!a.lock){ a.demoT=2.6; S.ev.push({t:'demo',id:a.id,by:b.id,x:a.x,y:a.y+1,z:a.z}); return; } if(-vn>8&&share>.5&&a.ramT<=0&&!a.lock){ if(a.y<=.01){ a.vy=Math.min(9,-vn*.33*share*1.6); a.y=.002; } a.wk=(Math.random()<.5?-1:1)*Math.min(5,-vn*.22); S.ev.push({t:'bump',id:a.id,by:b.id,v:-vn,x:(p[0]+q[0])/2,y:a.y+1,z:(p[1]+q[1])/2}); } else if(-vn>5) S.ev.push({t:'clang',id:a.id,v:-vn,x:(p[0]+q[0])/2,y:a.y+1,z:(p[1]+q[1])/2}); } } }
/* заправки: рахує господар */
function padStep(S,dt){ for(let i=0;i<PADS.length;i++){ if(S.pads[i]>0){ S.pads[i]-=dt; continue; } const p=PADS[i]; for(const c of S.cars){ if(c.demoT>0||(c.boost>=100&&c.local)) continue; if(c.y<1.2&&hyp(c.x-p[0],c.z-p[1])<(p[2]?3.2:2.4)){ S.pads[i]=p[2]?10:5; S.ev.push({t:'pad',i:i,id:c.id}); break; } } } }
function padGive(c,i){ c.boost=PADS[i][2]?100:Math.min(100,c.boost+28); }

/* ---------- комп'ютерні гравці ---------- */
function botInit(c,skill){ c.bot=true; c.bs={t:Math.random()*.2,skill:skill,lead:skill,bst:skill,thr:skill,tx:0,tz:0,stuck:0,rev:0,role:'att',nz:0,jt:0,spec:false,boost:false}; }
function botThink(c,S,dt){ const bs=c.bs, M=MACH[c.ch], b=S.ball, inp=c.inp, sgn=c.team?-1:1, egx=sgn*F.FL, ogx=-sgn*F.FL;
  bs.t-=dt; const fx=Math.cos(c.h), fz=Math.sin(c.h), vf=c.vx*fx+c.vz*fz;
  if(bs.t<=0){ const tick=.34-.26*bs.skill; bs.t=tick; bs.nz=(Math.random()-.5)*(1-bs.skill)*9;
    /* роль: найближчий до м'яча в команді атакує */
    let near=c, nd=1e9; for(const o of S.cars){ if(o.team!==c.team) continue; const dd=hyp(o.x-b.x,o.z-b.z)/MACH[o.ch].vmax+(o.bot?0:.25)+(sgn*(o.x-b.x)>2?.9:0); if(dd<nd){ nd=dd; near=o; } } bs.role=near===c?'att':'def';
    const d=hyp(b.x-c.x,b.z-c.z), tt=clamp(d/Math.max(8,Math.abs(vf)+6),0,1.6)*bs.lead; let px=clamp(b.x+b.vx*tt,-F.FL+2,F.FL-2), pz=clamp(b.z+b.vz*tt,-F.FW+2,F.FW-2);
    if(bs.role==='att'){ let gx=egx-px, gz=(clamp(pz,-F.GW*.6,F.GW*.6)*.5+bs.nz)-pz; const gl=hyp(gx,gz)||1; gx/=gl; gz/=gl; const bx=px-c.x, bz=pz-c.z, bl=hyp(bx,bz)||1, al=(bx*gx+bz*gz)/bl;
      const reach=F.BR+M.hl+(M.sp==='boom'?1.5:M.sp==='hdr'?1.5:.4);
      if(al>.55||bl<reach+1.5&&al>.1){ bs.tx=px+gx*2; bs.tz=pz+gz*2; bs.go=true; }
      else { /* заїхати за м'яч, обминаючи його збоку */ let ax=px-gx*(reach+5), az=pz-gz*(reach+5); if(al<-.2&&bl<16){ const side=((-gz)*(c.x-px)+gx*(c.z-pz))>0?1:-1; ax+=-gz*side*8; az+=gx*side*8; } bs.tx=clamp(ax,-F.FL+3,F.FL-3); bs.tz=clamp(az,-F.FW+3,F.FW-3); bs.go=false; } }
    else { const k=.32; bs.tx=ogx+(px-ogx)*k; bs.tz=pz*.55; bs.go=false; if(Math.abs(px-ogx)<28&&hyp(px-c.x,pz-c.z)<18){ bs.tx=px; bs.tz=pz; bs.go=true; } }
    if(Math.abs(vf)<1.2&&Math.abs(inp.thr)>.5&&!S.frozen){ bs.stuck+=tick; if(bs.stuck>1.3){ bs.rev=.9; bs.stuck=0; } } else bs.stuck=0; }
  let dx=bs.tx-c.x, dz=bs.tz-c.z; const dist=hyp(dx,dz); let da=Math.atan2(dz,dx)-c.h; da=Math.atan2(Math.sin(da),Math.cos(da));
  inp.steer=clamp(da*2.4,-1,1); inp.thr=bs.thr*.25+.75; inp.boost=false; inp.jump=false;
  if(Math.abs(da)>1.2) inp.thr*=.55; if(Math.abs(da)>2.2&&dist<14){ inp.thr=-1; inp.steer=-inp.steer; }
  if(!bs.go&&dist<4){ inp.thr=vf>3?-.6:0; let fa=Math.atan2(b.z-c.z,b.x-c.x)-c.h; fa=Math.atan2(Math.sin(fa),Math.cos(fa)); inp.steer=clamp(fa*2,-1,1); if(Math.abs(fa)>.4&&Math.abs(vf)<2) inp.thr=.35; }
  if(bs.rev>0){ bs.rev-=dt; inp.thr=-1; inp.steer=-inp.steer; }
  const bx=b.x-c.x, bz=b.z-c.z, bd=hyp(bx,bz); let ba=Math.atan2(bz,bx)-c.h; ba=Math.atan2(Math.sin(ba),Math.cos(ba));
  if(bs.go&&Math.abs(da)<.22&&dist>22&&c.boost>15&&bs.bst>.5) inp.boost=true; if(bs.go&&bd<14&&Math.abs(ba)<.3&&c.boost>5&&bs.bst>.6) inp.boost=true;
  if(bs.fl&&S.t>=bs.fl){ bs.fl=0; if(c.air&&Math.abs(ba)<.5&&bd<11) inp.jump=true; }
  if(bs.jt>0) bs.jt-=dt; if(bs.go&&bs.jt<=0&&!c.air&&bd>6&&bd<12&&Math.abs(ba)<.14&&b.y<4&&vf>9&&Math.random()<bs.skill*.035){ inp.jump=true; bs.jt=1.2; bs.fl=S.t+.2; }
  if(bd<M.hl+F.BR+2.2&&Math.abs(ba)<.6&&b.y>M.hh+.8&&b.y<M.hh+4.2&&bs.jt<=0&&Math.random()<bs.skill){ inp.jump=true; bs.jt=.8; }
  let spec=false;
  if(M.sp==='dash') spec=bs.go&&bd>7&&bd<17&&Math.abs(ba)<.16&&c.scd<=0&&Math.random()<bs.skill*.2;
  else if(M.sp==='ram'){ if(c.scd<=0&&bs.go&&bd<11&&Math.abs(ba)<.3) for(const o of S.cars) if(o.team!==c.team&&hyp(o.x-c.x,o.z-c.z)<9){ spec=Math.random()<bs.skill*.3; break; } }
  else if(M.sp==='boom'){ const hold=bd<9.2&&bd>2.2&&Math.abs(ba)<.42&&(b.y>2.3||bd<7.4&&bs.go&&Math.abs(da)<.5)||(bs.role==='def'&&bd<11&&b.y>3&&Math.abs(ba)<.6); spec=hold; }
  else if(M.sp==='lock'){ const toMe=(b.vx*(c.x-b.x)+b.vz*(c.z-b.z))/(bd||1); spec=bs.role==='def'&&bd<13&&toMe>9&&Math.abs(vf)<6; }
  else if(M.sp==='hdr'){ spec=bd<12&&Math.abs(ba)<.9&&b.y>2.6&&b.y<6.2; }
  inp.spec=spec; }

const api={F:F,MACH:MACH,PADS:PADS,KO:KO,clamp:clamp,newCar:newCar,newBall:newBall,newState:newState,kickoff:kickoff,stepCar:stepCar,updParts:updParts,stepBall:stepBall,goalOf:goalOf,ballVsCar:ballVsCar,carVsCar:carVsCar,padStep:padStep,padGive:padGive,botInit:botInit,botThink:botThink,boomGeo:boomGeo,hdrY:hdrY,effMass:effMass};
if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.ZL=api;
})(typeof window!=='undefined'?window:globalThis);
