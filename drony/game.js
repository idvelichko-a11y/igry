/* Дрони над фермою — етап 3: фізика польоту, зброя, дуель, гвинти, дроти й сітки, дощ */
(function(){
"use strict";
const $=id=>document.getElementById(id), clamp=(v,a,b)=>v<a?a:v>b?b:v, RAD=Math.PI/180, GR=9.81, RHO=1.2, R0=.42, WIN=3;
const coarse=(()=>{try{return matchMedia('(pointer:coarse)').matches;}catch(e){return false;}})(); if(coarse) document.body.classList.add('touch');
const Q=new URLSearchParams(location.search), isLoc=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
/* маса кг, тяга/вага, макс. нахил °, швидкість нахилу °/с, поворот °/с, лобовий опір м², підйом/спуск м/с, стеля м, зависання с, гучність */
const DR=[
 {n:'Шершень',w:'дріб',wd:'Дріб віялом: що ближче, то болючіше.',m:1.6,twr:2.6,tilt:35,rate:220,yaw:150,cda:.0715,vUp:6,vDn:5,ceil:60,hov:200,loud:.85,hz:150,pt:1,col:0xD2A63C,rng:30,cdn:.75,d:'Середній у всьому. Слухняний, добре тримає вітер.'},
 {n:'Павук',w:'сітка',wd:'Сітка обплутує: ворог падає, не стріляє і перегріває мотори.',m:.9,twr:2.4,tilt:40,rate:200,yaw:140,cda:.07,vUp:5,vDn:4.5,ceil:90,hov:240,loud:.35,hz:170,pt:.6,col:0x7FB069,rng:26,cdn:3.6,d:'Легкий і тихий, довго тримає заряд. Вітер зносить найсильніше, гвинти найніжніші.'},
 {n:'Оса',w:'таран',wd:'Спис: бий з розгону носом уперед. Ривок сам доводить на ціль, і в ривку в Осу не прицілитись.',m:1,twr:3.6,tilt:48,rate:360,yaw:220,cda:.0375,vUp:8,vDn:7,ceil:35,hov:130,loud:.6,hz:195,pt:.8,col:0xC9503A,rng:16,cdn:1.2,d:'Найшвидша і найверткіша. Низька стеля, заряд тане на очах.'},
 {n:'Джміль',w:'гармата',wd:'Рідкий потужний постріл із вибухом. Ближче 6 м снаряд не встигає звестися.',m:3.2,twr:1.9,tilt:18,rate:110,yaw:90,cda:.1,vUp:3.5,vDn:4,ceil:120,hov:170,loud:1,hz:95,pt:1.6,col:0x3F5F8A,rng:50,cdn:3,d:'Важкий і міцний: шкода по ньому на чверть менша. Розганяється довго, зате вітер йому байдужий і стеля найвища.'},
];
DR.forEach(p=>{ p.vmax=Math.sqrt(2*p.m*GR*Math.tan(p.tilt*RAD)/(RHO*p.cda)); });
let myCh=0; try{const v=+localStorage.getItem('pz_dr_ch'); if(v>=0&&v<4) myCh=v;}catch(e){}

/* ---------- сцена ---------- */
const cv=$('c'); let renderer=null, glOK=true;
try{ renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!coarse,powerPreference:'high-performance'}); }catch(e){ glOK=false; }
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xBFDDEB); scene.fog=new THREE.Fog(0xBFDDEB,160,560);
const cam=new THREE.PerspectiveCamera(70,16/9,.12,800);
scene.add(new THREE.HemisphereLight(0xdfeeff,0x55603f,.62)); const sun=new THREE.DirectionalLight(0xfff2d0,.5); sun.position.set(60,120,40); scene.add(sun);
const W=buildWorld(THREE); scene.add(W.mesh); W.extra.forEach(o=>scene.add(o)); const grainM=W.extra.filter(o=>o.userData.grain);
const RN=coarse?260:420, rainP=new Float32Array(RN*6), rainG=new THREE.BufferGeometry(); for(let i=0;i<RN;i++){ const x=(Math.random()-.5)*44, y=Math.random()*26-8, z=(Math.random()-.5)*44; rainP.set([x,y,z,x+.12,y-1.1,z],i*6); } rainG.setAttribute('position',new THREE.BufferAttribute(rainP,3));
const rainM=new THREE.LineSegments(rainG,new THREE.LineBasicMaterial({color:0xDCEBF5,transparent:true,opacity:.55})); rainM.frustumCulled=false; rainM.visible=false; scene.add(rainM); const SKY0=new THREE.Color(0xBFDDEB), SKY1=new THREE.Color(0x7F8E96); let wet=0;
W.pads.forEach(p=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,.08,20),new THREE.MeshBasicMaterial({color:0x35C6D8})); m.position.set(p.x,p.y+.05,p.z); scene.add(m); const r=new THREE.Mesh(new THREE.TorusGeometry(1.6,.07,6,24),new THREE.MeshBasicMaterial({color:0xffffff})); r.rotation.x=Math.PI/2; r.position.set(p.x,p.y+.12,p.z); scene.add(r); });
const markM=[]; W.marks.forEach(p=>{ const m=new THREE.Mesh(new THREE.TorusGeometry(.75,.11,8,20),new THREE.MeshBasicMaterial({color:0xFFD34D})); m.position.set(p[0],p[1],p[2]); m.visible=false; scene.add(m); markM.push(m); });
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,16),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false})); shadow.rotation.x=-Math.PI/2; scene.add(shadow);
const sock=new THREE.Mesh(new THREE.ConeGeometry(.45,2.4,8),new THREE.MeshBasicMaterial({color:0xF07030})); sock.geometry.rotateX(Math.PI/2); sock.position.set(-10,21.6,30); scene.add(sock);
function mkMesh(ch){ const p=DR[ch], g=new THREE.Group(), mat=new THREE.MeshLambertMaterial({color:p.col}), dk=new THREE.MeshLambertMaterial({color:0x22292C}), s=Math.cbrt(p.m/1.6); g.userData.props=[];
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.34*s,.12*s,.46*s),mat)); const nose=new THREE.Mesh(new THREE.BoxGeometry(.16*s,.08*s,.1*s),new THREE.MeshBasicMaterial({color:0xFF4030})); nose.position.set(0,0,-.26*s); g.add(nose);
  for(const [ax,az] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ const arm=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.5*s),dk); arm.position.set(ax*.2*s,0,az*.2*s); arm.rotation.y=ax*az*Math.PI/4; g.add(arm);
    const pr=new THREE.Mesh(new THREE.CylinderGeometry(.19*s,.19*s,.015,14),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35})); pr.position.set(ax*.36*s,.07,az*.36*s); g.add(pr);
    const bl=new THREE.Mesh(new THREE.BoxGeometry(.36*s,.012,.035),dk); bl.position.copy(pr.position); g.add(bl); g.userData.props.push(bl); }
  let b; if(ch===0){ b=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,.3,8),dk); b.rotation.x=Math.PI/2; b.position.set(0,-.08,-.3); }
  if(ch===1){ b=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.2),dk); b.position.set(0,-.1,-.12); }
  if(ch===2){ b=new THREE.Mesh(new THREE.ConeGeometry(.035,.75,6),new THREE.MeshLambertMaterial({color:0xC9CED2})); b.rotation.x=-Math.PI/2; b.position.set(0,0,-.6); }
  if(ch===3){ b=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.6,8),dk); b.rotation.x=Math.PI/2; b.position.set(0,-.12,-.3); }
  g.add(b); const web=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true})); web.visible=false; g.add(web); g.userData.web=web; return g; }

/* ---------- стан ---------- */
const SP=[[-70,.42,62,-.9],[76,.42,-70,2.3]], FREE=[0,.42,20,0];
function mkD(ch){ return {ch:ch,p:new THREE.Vector3(),v:new THREE.Vector3(),yaw:0,pitch:0,roll:0,batt:1,T:0,ground:true,spin:0,hp:100,cd:0,dcd:0,dash:0,tang:0,imm:0,lockT:0,dry:0,prop:100,snag:0,tgt:null,dead:false,lock:false,indoor:false,corn:false,mesh:null,
  inp:{mx:0,my:0,yaw:0,alt:0,fire:false,dash:false}}; }
let me=mkD(0), foe=null;
const G={mode:'menu',kind:'free',side:0,t:0,wa:.6,ws:3,wx:0,wz:0,hitT:0,hits:0,got:0,left:[],msg:'',msgT:0,chg:false,camYaw:0,score:[0,0],phase:'fight',phT:0,rain:0,rainIn:45,rainW:false,again:[false,false],rp:null,rtt:0,netMsg:'',auto:coarse,botSkill:.6};
const I={mx:0,my:0,yaw:0,alt:0,fire:false,dash:false}, key={}; const nearL=[]; const shots=[], fx=[];
function say(s,t){G.msg=s;G.msgT=t||2.5;}
function setMesh(d){ if(d.mesh) scene.remove(d.mesh); d.mesh=mkMesh(d.ch); scene.add(d.mesh); }
function spawn(d,sp){ d.p.set(sp[0],sp[1],sp[2]); d.v.set(0,0,0); d.yaw=sp[3]; d.pitch=d.roll=0; d.ground=true; d.hp=100; d.batt=1; d.cd=d.dcd=d.dash=d.tang=d.imm=d.lockT=d.snag=0; d.prop=100; d.dead=false; if(d.mesh) d.mesh.visible=true; }
function clearFx(){ for(const s of shots) scene.remove(s.m); shots.length=0; for(const f of fx) scene.remove(f.m); fx.length=0; }
function start(kind,side,chs){ G.kind=kind; G.side=side; clearFx(); me=mkD(chs[side]); setMesh(me); if(foe&&foe.mesh) scene.remove(foe.mesh); foe=null;
  if(kind!=='free'){ foe=mkD(chs[1-side]); setMesh(foe); me.tgt=foe; foe.tgt=me; }
  G.t=0; G.hits=0; G.got=0; G.rain=0; G.rainIn=35+Math.random()*25; G.rainW=false; G.score=[0,0]; G.again=[false,false]; G.rp=null; G.left=kind==='free'?W.marks.map((_,i)=>i):[]; markM.forEach(m=>m.visible=kind==='free');
  G.mode='play'; respawn(); if(coarse){ autoBig=true; setBig(true,true); } ui();
  say(kind==='free'?'Збери всі '+W.marks.length+' міток: вони в будівлях, на поверхах і в полі':'Знайди суперника і збий його. До '+WIN+' перемог',4.5); }
function respawn(){ if(G.kind==='free'){ spawn(me,FREE); } else { spawn(me,SP[G.side]); if(G.kind==='bot') spawn(foe,SP[1-G.side]); else if(foe){ foe.dead=false; foe.hp=100; foe.mesh.visible=true; } } G.camYaw=me.yaw; G.phase='fight'; clearFx(); }

/* ---------- фізика польоту ---------- */
function resolve(d,nx,ny,nz,pen){ d.p.x+=nx*pen; d.p.y+=ny*pen; d.p.z+=nz*pen; const vn=d.v.x*nx+d.v.y*ny+d.v.z*nz; if(vn<0){ if(-vn>3.2) bump(d,-vn); const k=1.2*vn; d.v.x-=k*nx; d.v.y-=k*ny; d.v.z-=k*nz; d.v.multiplyScalar(.985); } if(ny>.7) d.ground=true; }
function bump(d,sp){ if(d===me||G.kind==='bot') d.prop=Math.max(0,d.prop-Math.max(0,sp-2.5)*2.2/DR[d.ch].pt); if(d===me){ G.hits++; G.hitT=.35; beep(90+sp*4,0,.14,'sawtooth',.16); } const th=d.tang>0?3:7; if(G.kind!=='free'&&sp>th&&!d.dead&&(d===me||G.kind==='bot')) d.hp-=Math.min(40,(sp-th)*(d.tang>0?4:3.5)); }
function netHit(d){ if(d.tang<=0&&d.imm<=0){ d.tang=3.4; return true; } return false; }
function collide(d){ W.near(d.p.x,d.p.z,nearL); const cols=W.cols; for(let pass=0;pass<2;pass++) for(const idx of nearL){ const c=cols[idx], x=d.p.x,y=d.p.y,z=d.p.z;
    if(c.r){ if(y<c.y0-R0||y>c.y1+R0) continue; const dx=x-c.x, dz=z-c.z, dd=Math.hypot(dx,dz); if(dd>=c.r+R0) continue;
      if(y>=c.y0&&y<=c.y1){ if(dd>1e-6) resolve(d,dx/dd,0,dz/dd,c.r+R0-dd); } else if(dd<c.r){ if(y>c.y1) resolve(d,0,1,0,c.y1+R0-y); else resolve(d,0,-1,0,y-(c.y0-R0)); } continue; }
    const cx=clamp(x,c[0],c[3]), cy=clamp(y,c[1],c[4]), cz=clamp(z,c[2],c[5]), dx=x-cx, dy=y-cy, dz=z-cz, d2=dx*dx+dy*dy+dz*dz; if(d2>=R0*R0) continue;
    if(d2>1e-10){ const dd=Math.sqrt(d2); resolve(d,dx/dd,dy/dd,dz/dd,R0-dd); }
    else { const px=Math.min(x-c[0],c[3]-x), py=Math.min(y-c[1],c[4]-y), pz=Math.min(z-c[2],c[5]-z); if(px<=py&&px<=pz) resolve(d,x-c[0]<c[3]-x?-1:1,0,0,px+R0); else if(py<=pz) resolve(d,0,y-c[1]<c[4]-y?-1:1,0,py+R0); else resolve(d,0,0,z-c[2]<c[5]-z?-1:1,pz+R0); } } }
function segD(p,a,b){ const ax=b[0]-a[0], ay=b[1]-a[1], az=b[2]-a[2], t=clamp(((p.x-a[0])*ax+(p.y-a[1])*ay+(p.z-a[2])*az)/(ax*ax+ay*ay+az*az),0,1); return Math.hypot(p.x-a[0]-ax*t,p.y-a[1]-ay*t,p.z-a[2]-az*t); }
function hazards(d,dt){ if(d.snag>0) d.snag-=dt; const pt=DR[d.ch].pt, x=d.p.x, y=d.p.y, z=d.p.z;
  for(const h of W.haz){ if(h.t==='g'){ if(y>h.y0-.3&&y<h.y1+.3&&Math.hypot(x-h.x,z-h.z)<h.r+.35){ d.v.y-=30*dt; d.v.x*=1-2*dt; d.v.z*=1-2*dt; d.prop=Math.max(0,d.prop-30*dt/pt); if(d===me&&G.msgT<=.2) say('Зерно б\'є по гвинтах!',1); } continue; }
    if(d.snag>0) continue; const sp=d.v.length(); let hit=false;
    if(h.t==='n'){ if(x>h.x0-.35&&x<h.x1+.35&&y>h.y0-.35&&y<h.y1+.35&&z>h.z0-.35&&z<h.z1+.35){ hit=true; d.tang=Math.max(d.tang,2.6); d.prop=Math.max(0,d.prop-15/pt); d.v.multiplyScalar(.15); d.snag=3; if(d===me){ say('Заплутався в сітці!',2); beep(180,0,.3,'triangle',.16); } } }
    else if(Math.min(x,h.a[0],h.b[0])>=Math.min(h.a[0],h.b[0])-.6&&x<=Math.max(h.a[0],h.b[0])+.6&&segD(d.p,h.a,h.b)<.5){ hit=true; const w=h.t==='w'; d.tang=Math.max(d.tang,w?1.3:1); d.prop=Math.max(0,d.prop-(w?26:18)*clamp(.6+sp/10,.6,1.8)/pt); d.v.multiplyScalar(.25); d.snag=1.6; if(d===me){ say(w?'Зачепився за дріт!':'Зачепився за мотузку!',2); beep(900,0,.08,'square',.12); beep(140,.05,.25,'sawtooth',.14); } }
    if(hit&&d===me){ G.hits++; G.hitT=.3; } } }
function stepD(d,dt){ const p=DR[d.ch], inp=d.inp; let mx=inp.mx, my=inp.my, yw=inp.yaw, al=inp.alt;
  const zn=W.zoneAt(d.p.x,d.p.y,d.p.z); d.indoor=!!zn; const wetK=(G.rain>0&&!zn)?1:0, wetM=wetK*Math.sqrt(1.6/p.m), propK=.5+.5*d.prop/100;
  if(d.dead){ mx=my=yw=al=0; } else if(d.tang>0){ d.tang-=dt; if(d.tang<=0) d.imm=2.5; if(G.kind!=='free'&&(d===me||G.kind==='bot')) d.hp-=6*(d.ch===3?.75:1)*dt; mx=clamp(mx*.3+Math.sin(G.t*9+d.ch)*.8,-1,1); my=clamp(my*.3+Math.cos(G.t*7)*.8,-1,1); yw+=Math.sin(G.t*5)*.9; }
  if(d.imm>0) d.imm-=dt; if(d.dcd>0) d.dcd-=dt; if(d.dash>0) d.dash-=dt; if(inp.dash&&d.ch===2&&d.dcd<=0&&!d.dead&&d.batt>.05){ d.dash=.9; d.dcd=3; d.batt=Math.max(0,d.batt-.04); if(d===me) beep(520,0,.25,'sawtooth',.12); }
  d.yaw-=yw*p.yaw*RAD*(1-.15*wetK)*dt;
  if(d.dash>0&&d.tgt&&!d.tgt.dead&&!d.dead){ const tx=d.tgt.p.x-d.p.x, ty=d.tgt.p.y-d.p.y, tz=d.tgt.p.z-d.p.z, tl=Math.hypot(tx,ty,tz); let da=Math.atan2(-tx,-tz)-d.yaw; da=Math.atan2(Math.sin(da),Math.cos(da));
    if(tl<20&&tl>.3&&Math.abs(da)<.9){ d.yaw+=clamp(da,-2.2*dt,2.2*dt); d.v.x+=tx/tl*20*dt; d.v.y+=ty/tl*20*dt; d.v.z+=tz/tl*20*dt; } }
  const boost=d.dash>0?1.3:1, mt=p.tilt*RAD*boost*(1-.18*wetM), rr=p.rate*RAD*dt, sy=Math.sin(d.yaw), cy=Math.cos(d.yaw); let tp=my*mt, tr=mx*mt;
  if(Math.abs(mx)+Math.abs(my)<.05&&!d.ground&&!d.dead){ const vf=-d.v.x*sy-d.v.z*cy, vr=d.v.x*cy-d.v.z*sy; tp=clamp(-vf*.13,-mt*.85,mt*.85); tr=clamp(-vr*.13,-mt*.85,mt*.85); }
  if(d.prop<60&&!d.ground){ const wv=(60-d.prop)/60*.15; tp+=Math.sin(G.t*13+d.ch)*wv; tr+=Math.cos(G.t*11+d.ch)*wv; }
  if(d.dead){ d.pitch+=2.5*dt; d.roll+=3.3*dt; } else { d.pitch+=clamp(tp-d.pitch,-rr,rr); d.roll+=clamp(tr-d.roll,-rr,rr); }
  const sp=Math.sin(d.pitch), sr=Math.sin(d.roll); let ux=-sy*sp+cy*sr, uz=-cy*sp-sy*sr, uy=Math.cos(d.pitch)*Math.cos(d.roll); const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
  const sag=d.batt<=0?0:(d.batt<.15?.75+d.batt/.15*.25:1), ceilK=1-(1-1/p.twr)*Math.pow(clamp(d.p.y/p.ceil,0,1.25),2);
  let Tmax=d.batt<=0?p.m*GR*.88:p.m*GR*p.twr*ceilK*sag*propK*(1-.1*wetM)*(d.dash>0?1.35:1); if(d.tang>0) Tmax=Math.min(Tmax,p.m*GR*.5);
  const idle=d.ground&&al<=.05&&Math.abs(mx)+Math.abs(my)<.05;
  let T; if(d.dead) T=0; else if(idle) T=p.m*GR*.1; else { const vyC=al>0?al*p.vUp*(1-.3*wetM):al*p.vDn, ay=clamp((vyC-d.v.y)*4,-9,14); T=clamp(p.m*(GR+ay)/Math.max(.35,uy),p.m*GR*.1,Tmax); }
  d.T=T; const ge=d.p.y<1.3?1+.16*(1-d.p.y/1.3):1, a=T*ge/p.m;
  const wk=zn?0:clamp(d.p.y/6,.25,1), wx=G.wx*wk, wz=G.wz*wk;
  const rx=d.v.x-wx, ry=d.v.y, rz=d.v.z-wz, rs=Math.hypot(rx,ry,rz), k=.5*RHO*p.cda/p.m*(1+wetK*.25);
  d.v.x+=(ux*a-k*rs*rx)*dt; d.v.y+=(uy*a-GR-k*2.2*rs*ry)*dt; d.v.z+=(uz*a-k*rs*rz)*dt;
  d.corn=W.inCorn(d.p.x,d.p.y,d.p.z); if(d.corn){ const f=Math.max(0,1-2.6*dt); d.v.x*=f; d.v.z*=f; d.v.y*=Math.max(0,1-1.2*dt); }
  d.p.x+=d.v.x*dt; d.p.y+=d.v.y*dt; d.p.z+=d.v.z*dt; d.ground=false; collide(d); if(!d.dead&&(d===me||G.kind==='bot')) hazards(d,dt);
  if(d.p.y<R0){ if(d.v.y<-3.5) bump(d,-d.v.y); d.p.y=R0; if(d.v.y<0) d.v.y=0; d.ground=true; }
  if(d.ground){ const f=Math.max(0,1-((idle||d.dead)?10:2.5)*dt); d.v.x*=f; d.v.z*=f; }
  const L=W.LIM; if(Math.abs(d.p.x)>L) d.v.x-=Math.sign(d.p.x)*12*dt; if(Math.abs(d.p.z)>L) d.v.z-=Math.sign(d.p.z)*12*dt;
  if(!d.dead) d.batt=Math.max(0,d.batt-dt/p.hov*Math.pow(T/(p.m*GR),1.5)*(1+wetK*.2)*(d===foe&&G.kind==='bot'?.35:1));
  let chg=false; for(const pd of W.pads){ if(Math.hypot(d.p.x-pd.x,d.p.z-pd.z)<1.9&&d.p.y-pd.y<1.6&&d.p.y>=pd.y&&d.v.length()<1.5){ d.batt=Math.min(1,d.batt+dt/9); d.prop=Math.min(100,d.prop+10*dt); chg=true; } } if(d===me) G.chg=chg;
  if(d.cd>0) d.cd-=dt;
  if(G.kind!=='free'&&!d.dead&&d.batt<=0&&d.ground&&(d===me||G.kind==='bot')){ d.dry+=dt; if(d.dry>3){ d.hp=0; if(d===me) say('Заряд скінчився — раунд програно',3); } } else d.dry=0; }

/* ---------- зброя ---------- */
const tA=new THREE.Vector3(), tB=new THREE.Vector3();
function blocked(a,b){ const n=Math.ceil(a.distanceTo(b)/.6); for(let i=1;i<n;i++){ const f=i/n; if(W.inside(a.x+(b.x-a.x)*f,a.y+(b.y-a.y)*f,a.z+(b.z-a.z)*f,0)) return true; } return false; }
function aimOf(d,tg,out){ const p=DR[d.ch], fx0=-Math.sin(d.yaw), fz0=-Math.cos(d.yaw); out.set(fx0,-Math.sin(d.pitch)*.25,fz0).normalize(); d.lock=false; if(!tg||tg.dead||d.dead||tg.dash>0) return out;
  let lead=0; const dist=d.p.distanceTo(tg.p); if(d.ch===1) lead=dist/30; else if(d.ch===3) lead=dist/48;
  tA.copy(tg.p).addScaledVector(tg.v,lead*.9).sub(d.p); const hd=Math.hypot(tA.x,tA.z)||1e-6, dot=(tA.x*fx0+tA.z*fz0)/hd, el=Math.atan2(tA.y,hd);
  if(dist<p.rng*(G.rain>0?.75:1)&&dot>Math.cos((d.ch===2?40:17)*RAD)&&Math.abs(el)<55*RAD&&!blocked(d.p,tg.p)){ d.lock=true; if(d.ch===1||d.ch===3) tA.y+=.5*(d.ch===1?3:6)*lead*lead; out.copy(tA).normalize(); } return out; }
function line(a,b,colr,life){ const g=new THREE.BufferGeometry().setFromPoints([a.clone(),b.clone()]), m=new THREE.Line(g,new THREE.LineBasicMaterial({color:colr,transparent:true})); scene.add(m); fx.push({m:m,t:life,T:life}); }
function boom(p,r,colr){ const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshBasicMaterial({color:colr,transparent:true,opacity:.8})); m.position.copy(p); m.scale.setScalar(.3); scene.add(m); fx.push({m:m,t:.45,T:.45,grow:r}); }
function hurt(tg,dmg,kind){ if(!tg||tg.dead) return; if(tg.ch===3) dmg*=.75; if(tg===foe&&G.kind==='net'){ send({t:'hit',d:Math.round(dmg),k:kind}); } else { tg.hp-=dmg; if(kind==='net') netHit(tg); if(kind==='shot') tg.prop=Math.max(0,tg.prop-dmg*.35/DR[tg.ch].pt); }
  if(tg===me){ G.hitT=.35; beep(140,0,.18,'square',.14); if(kind==='net') say('Тебе обплутало сіткою!',2); } else { beep(880,0,.07,'square',.09); boom(tg.p,.9,0xFFD34D); } }
function fire(d,tg,ghost,dirIn){ const p=DR[d.ch]; if(d.dead||d.cd>0||d.ch===2||d.tang>0) return false; d.cd=p.cdn; const dir=dirIn||aimOf(d,tg,new THREE.Vector3()).clone(), o=d.p.clone().addScaledVector(dir,.5);
  if(d===me&&G.kind==='net'&&!ghost) send({t:'f',o:[+o.x.toFixed(2),+o.y.toFixed(2),+o.z.toFixed(2)],d:[+dir.x.toFixed(3),+dir.y.toFixed(3),+dir.z.toFixed(3)]});
  if(d.ch===0){ beep(210,0,.12,'sawtooth',d===me?.2:.1); beep(90,0,.16,'square',d===me?.14:.07);
    let sum=0; for(let i=0;i<8;i++){ const sd=dir.clone(); sd.x+=(Math.random()-.5)*.14; sd.y+=(Math.random()-.5)*.1; sd.z+=(Math.random()-.5)*.14; sd.normalize(); let end=p.rng;
      for(let s=1;s<p.rng;s+=1){ if(W.inside(o.x+sd.x*s,o.y+sd.y*s,o.z+sd.z*s,0)||o.y+sd.y*s<0){ end=s; break; } }
      if(!ghost&&tg&&!tg.dead){ tA.copy(tg.p).sub(o); const along=tA.dot(sd); if(along>0&&along<end){ tB.copy(o).addScaledVector(sd,along); if(tB.distanceTo(tg.p)<.7){ end=along; sum+=3.2*(1-along/p.rng*.65); } } }
      line(o,o.clone().addScaledVector(sd,end),0xFFE9A0,.09); } if(sum>0) hurt(tg,sum,'shot'); }
  else { const net=d.ch===1, m=new THREE.Mesh(net?new THREE.IcosahedronGeometry(1.3,1):new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:net?0xffffff:0x22292C,wireframe:net})); m.position.copy(o); scene.add(m);
    shots.push({m:m,p:o,v:dir.clone().multiplyScalar(net?30:48).addScaledVector(d.v,.3),g:net?3:6,net:net,own:d,tg:tg,ghost:ghost,o:o.clone(),life:net?1.6:2.2});
    if(net) beep(320,0,.22,'triangle',d===me?.14:.07); else { beep(70,0,.35,'sawtooth',d===me?.3:.16); beep(45,.02,.4,'square',d===me?.2:.1); d.v.addScaledVector(dir,-2.6); } }
  return true; }
function stepShots(dt){ for(let i=shots.length-1;i>=0;i--){ const s=shots[i]; s.life-=dt; s.v.y-=s.g*dt; s.p.addScaledVector(s.v,dt); s.m.position.copy(s.p); if(s.net) s.m.rotation.y+=6*dt;
    let done=s.life<=0, hitW=false; const tg=s.tg;
    if(!done&&tg&&!tg.dead&&s.p.distanceTo(tg.p)<(s.net?1.75:.95)){ done=true; const dud=!s.net&&s.p.distanceTo(s.o)<6; if(!s.ghost) hurt(tg,s.net?22:dud?22:36,s.net?'net':'shell'); if(!s.net) boom(s.p,dud?1:3,0xFF8A3D); }
    if(!done&&(W.inside(s.p.x,s.p.y,s.p.z,0)||s.p.y<.1)){ done=true; hitW=true; }
    if(done){ if(!s.net&&(hitW||s.life<=0)&&s.p.distanceTo(s.o)>=6){ boom(s.p,4.2,0xFF8A3D); beep(60,0,.4,'sawtooth',.18); if(!s.ghost&&tg&&!tg.dead){ const dd=s.p.distanceTo(tg.p); if(dd<4.5&&!blocked(s.p,tg.p)) hurt(tg,24*(1-dd/4.5),'shell'); } }
      scene.remove(s.m); shots.splice(i,1); } }
  for(let i=fx.length-1;i>=0;i--){ const f=fx[i]; f.t-=dt; f.m.material.opacity=Math.max(0,f.t/f.T); if(f.grow) f.m.scale.setScalar(.3+f.grow*(1-f.t/f.T)); if(f.t<=0){ scene.remove(f.m); fx.splice(i,1); } } }
function ramOf(a,b){ tA.copy(b.p).sub(a.p); const dist=tA.length(); if(dist>2.3||dist<1e-4) return 0; tA.multiplyScalar(1/dist); const fxx=-Math.sin(a.yaw), fzz=-Math.cos(a.yaw);
  const vr=(a.v.x-b.v.x)*tA.x+(a.v.y-b.v.y)*tA.y+(a.v.z-b.v.z)*tA.z, fdot=fxx*tA.x+fzz*tA.z, tip=Math.hypot(a.p.x+fxx*.85-b.p.x,a.p.y-b.p.y,a.p.z+fzz*.85-b.p.z);
  return (a.ch===2&&a.cd<=0&&a.tang<=0&&vr>4&&fdot>.3&&(tip<1.05||dist<1.15))?Math.min(70,vr*6*Math.sqrt(1.6/DR[b.ch].m)):0; }
function ramCheck(dt){ if(!foe||foe.dead||me.dead) return; const dmg=ramOf(me,foe); if(dmg>0){ me.cd=1.2; hurt(foe,dmg,'ram'); say('Таран!',1); }
  tA.copy(foe.p).sub(me.p); const dist=tA.length(); if(dist>1.15&&!dmg) return; if(dist<1e-4) return; tA.multiplyScalar(1/dist);
  const vr=(me.v.x-foe.v.x)*tA.x+(me.v.y-foe.v.y)*tA.y+(me.v.z-foe.v.z)*tA.z;
  if(vr>0){ if(!dmg&&vr>6&&me.cd<=0&&me.ch!==2){ me.cd=.8; hurt(foe,6,'bump'); } me.v.addScaledVector(tA,-vr*1.2); if(G.kind==='bot') foe.v.addScaledVector(tA,vr*.8); }
  if(dist<1.15) me.p.addScaledVector(tA,-(1.15-dist)); }
function botRam(){ if(G.kind!=='bot'||foe.dead||me.dead) return; const dmg=ramOf(foe,me); if(dmg>0){ foe.cd=1.2; hurt(me,dmg,'ram'); say('Тебе протаранили!',1.5); foe.v.multiplyScalar(-.4); } }

/* ---------- комп'ютер ---------- */
const botS=[{t:0,ty:20,err:0,sd:1,st:0,los:true,wall:false,stuck:0,esc:0},{t:0,ty:20,err:0,sd:-1,st:0,los:true,wall:false,stuck:0,esc:0}];
function botThink(d,tg,bs,dt){ const p=DR[d.ch], inp=d.inp; if(d.dead||tg.dead){ inp.mx=inp.my=inp.yaw=0; inp.alt=d.dead?0:.2; inp.fire=inp.dash=false; d.lockT=0; return; }
  tA.copy(tg.p).sub(d.p); const hd=Math.hypot(tA.x,tA.z), want=[7,15,0,28][d.ch]; bs.t-=dt; bs.st-=dt; if(bs.st<=0){ bs.st=2+Math.random()*3; bs.sd=-bs.sd; }
  if(bs.t<=0){ bs.t=.25; bs.err=(Math.random()-.5)*(1-G.botSkill)*.9; bs.ty=hd>45?Math.max(tg.p.y+4,24):Math.min(tg.p.y+[1,3,0,5][d.ch],Math.max(22,tg.p.y)); if(tg.indoor&&hd<40) bs.ty=Math.max(tg.p.y,d.ch===3?14:10);
    bs.los=!blocked(d.p,tg.p); if(!bs.los&&!(tg.indoor&&hd<14)) bs.ty=Math.max(bs.ty,27); const fx0=-Math.sin(d.yaw), fz0=-Math.cos(d.yaw); bs.wall=false; for(let q=2;q<=8;q+=2) if(W.inside(d.p.x+fx0*q,d.p.y,d.p.z+fz0*q,.5)){ bs.wall=true; break; }
    if(hd>want+6&&Math.hypot(d.v.x,d.v.z)<1.2){ bs.stuck+=.25; if(bs.stuck>1.2){ bs.esc=1.6; bs.sd=-bs.sd; bs.stuck=0; } } else bs.stuck=0; }
  if(bs.esc>0) bs.esc-=dt;
  let da=Math.atan2(-tA.x,-tA.z)+bs.err-d.yaw; da=Math.atan2(Math.sin(da),Math.cos(da)); inp.yaw=clamp(-da*2.2,-1,1);
  const fwd=Math.abs(da)<.9?clamp((hd-want)/8,-1,1):0; inp.my=fwd*(d.ch===2?1:.85); inp.mx=d.ch===2?(hd>11?Math.sin(G.t*2.6)*.75:0):(hd<want*2.2?bs.sd*[.8,.65,0,.4][d.ch]:Math.sin(G.t*.7+d.ch)*.3); inp.alt=clamp((Math.min(bs.ty,p.ceil*.9)-d.p.y)*.5,-1,1);
  if(bs.wall){ inp.alt=1; inp.my=Math.min(inp.my,.15); } if(bs.esc>0){ inp.mx=bs.sd; inp.my=-.5; inp.alt=1; }
  if(d.batt<.2) inp.my*=.4; inp.dash=d.ch===2&&hd<15&&Math.abs(da)<.3;
  aimOf(d,tg,tB); d.lockT=d.lock?d.lockT+dt:0; inp.fire=d.lockT>.25+(1-G.botSkill)*.7;
  if(inp.fire&&d.cd<=0&&d.ch!==2&&G.phase==='fight'){ const e=(1-G.botSkill)*.09; tB.x+=(Math.random()-.5)*e; tB.y+=(Math.random()-.5)*e; tB.z+=(Math.random()-.5)*e; fire(d,tg,false,tB.clone().normalize()); } }

/* ---------- крок гри ---------- */
function step(dt){ G.t+=dt;
  G.wa+=.02*dt*Math.sin(G.t*.11); G.ws=Math.max(0,3.2+2.2*Math.sin(G.t*.13)+1.6*Math.sin(G.t*.71+1)*Math.sin(G.t*.29)); G.wx=Math.cos(G.wa)*G.ws; G.wz=Math.sin(G.wa)*G.ws;
  if(G.kind!=='net'||G.side===0){ G.rainIn-=dt; if(!G.rainW&&G.rainIn<5&&G.rain<=0){ G.rainW=true; say('Насувається дощ',3); send({t:'rw'}); } if(G.rainIn<=0&&G.rain<=0){ G.rain=20; G.rainIn=75+Math.random()*45; G.rainW=false; send({t:'rain'}); say('Дощ: мотори тягнуть гірше, видно й чути менше',3.5); } }
  if(G.rain>0){ G.rain-=dt; if(G.rain<=0) say('Дощ минув',2.5); }
  const inp=me.inp; inp.mx=clamp(I.mx+((key.d?1:0)-(key.a?1:0)),-1,1); inp.my=clamp(I.my+((key.w?1:0)-(key.s?1:0)),-1,1); inp.yaw=clamp(I.yaw+((key.right?1:0)-(key.left?1:0)),-1,1); inp.alt=clamp(I.alt+((key.up?1:0)-(key.down?1:0)),-1,1); inp.dash=I.dash||!!key.dash||(G.auto&&me.ch===2&&me.lock&&G.phase==='fight');
  if(G.autoMe&&foe) botThink(me,foe,botS[0],dt);
  stepD(me,dt);
  if(foe){ if(G.kind==='bot'){ botThink(foe,me,botS[1],dt); stepD(foe,dt); botRam(); }
    else { const r=G.rp; if(r){ r.age+=dt; const a=Math.min(r.age,.15), k=Math.min(1,dt*18); foe.p.x+=(r.p[0]+r.v[0]*a-foe.p.x)*k; foe.p.y+=(r.p[1]+r.v[1]*a-foe.p.y)*k; foe.p.z+=(r.p[2]+r.v[2]*a-foe.p.z)*k; foe.v.set(r.v[0],r.v[1],r.v[2]); foe.yaw=r.a[0]; foe.pitch=r.a[1]; foe.roll=r.a[2]; foe.T=r.T; foe.hp=r.hp; foe.batt=r.b; foe.tang=r.tg; foe.dash=r.ds?.2:0; foe.prop=r.pr; } }
    ramCheck(dt); if(!G.autoMe){ const dir=aimOf(me,foe,tB); if((I.fire||key.fire||(G.auto&&me.lock))&&me.cd<=0&&G.phase==='fight') fire(me,foe,false,dir.clone()); } }
  stepShots(dt);
  if(G.kind==='free'){ for(let i=G.left.length-1;i>=0;i--){ const m=W.marks[G.left[i]]; if(Math.hypot(me.p.x-m[0],me.p.y-m[1],me.p.z-m[2])<1.5){ markM[G.left[i]].visible=false; G.left.splice(i,1); G.got++; beep(784,0,.12,'triangle',.16); beep(1047,.1,.18,'triangle',.16); say(G.left.length?'Мітка '+G.got+' з '+W.marks.length:'Усі мітки зібрано за '+fmtT(G.t)+'!',G.left.length?1.6:6); } } }
  else { /* раунди */
    if(G.phase==='fight'){ if(me.hp<=0&&!me.dead){ me.dead=true; G.score[1]++; G.phase='down'; G.phT=3.6; say('Тебе збито',3); if(G.kind==='net') send({t:'dead'}); beep(200,0,.6,'sawtooth',.2); }
      if(G.kind==='bot'&&foe.hp<=0&&!foe.dead){ foe.dead=true; G.score[0]++; G.phase='down'; G.phT=3.6; say('Суперника збито!',3); [523,659,784].forEach((f,i)=>beep(f,i*.12,.2,'triangle',.16)); } }
    else if(G.phase==='down'){ G.phT-=dt; if(G.phT<=0){ if((G.score[0]>=WIN||G.score[1]>=WIN)&&G.score[0]!==G.score[1]){ G.mode='over'; ui(); } else { respawn(); say('Раунд '+(G.score[0]+G.score[1]+1),2); } } } }
  if(G.hitT>0)G.hitT-=dt; if(G.msgT>0)G.msgT-=dt; }
function fmtT(t){ return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'); }

/* ---------- мережа ---------- */
const PFX='pz-drony-'; let peer=null, conn=null, code='', netState='', joinTO=null, sendT=0, pingT=0, lag=isLoc?(+Q.get('lag')||0):0;
const invite=(Q.get('g')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
function peerOpts(){ const s=Q.get('srv'); if(s&&isLoc){const a=s.split(':'); return {host:a[0],port:+a[1],path:'/',secure:false,debug:1};} return {debug:1}; }
function mkCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s;}
function send(m){ if(conn&&conn.open){ try{conn.send(m);}catch(e){} } }
function netClose(){ clearTimeout(joinTO); try{ if(conn) conn.close(); }catch(e){} try{ if(peer) peer.destroy(); }catch(e){} conn=null; peer=null; }
function netErr(msg){ netClose(); G.mode='lobby'; netState='err'; G.netMsg=msg; ui(); }
function hostGame(){ netClose(); if(typeof Peer==='undefined'){netErr('Не завантажилась бібліотека зв\'язку. Онови сторінку.');return;} code=mkCode(); G.mode='lobby'; netState='open'; G.side=0; ui();
  peer=new Peer(PFX+code,peerOpts()); peer.on('open',()=>{netState='wait'; ui();}); peer.on('connection',c=>{ if(conn&&conn.open){ try{c.close();}catch(e){} return; } bind(c); });
  peer.on('error',e=>{ if(e&&e.type==='unavailable-id') hostGame(); else if(G.mode==='lobby') netErr('Немає зв\'язку із сервером знайомства ('+(e&&e.type||'помилка')+'). Перевір інтернет і спробуй ще раз.'); });
  peer.on('disconnected',()=>{ try{ if(peer&&!peer.destroyed) peer.reconnect(); }catch(e){} }); }
function joinGame(c){ netClose(); if(typeof Peer==='undefined'){netErr('Не завантажилась бібліотека зв\'язку. Онови сторінку.');return;} code=c; G.mode='lobby'; netState='join'; G.side=1; ui();
  peer=new Peer(undefined,peerOpts()); peer.on('open',()=>{ bind(peer.connect(PFX+code,{serialization:'json'})); joinTO=setTimeout(()=>{ if(G.mode==='lobby') netErr('Не вдалося з\'єднатися. Можливо, гру вже закрито або мережа не пропускає пряме з\'єднання.'); },15000); });
  peer.on('error',e=>{ if(G.mode!=='lobby') return; netErr(e&&e.type==='peer-unavailable'?'Гру з кодом '+code+' не знайдено. Попроси суперника створити нову й надіслати посилання.':'Немає зв\'язку ('+(e&&e.type||'помилка')+'). Перевір інтернет і спробуй ще раз.'); }); }
function bind(c){ conn=c; c.on('open',()=>{ clearTimeout(joinTO); send({t:'hello',ch:myCh}); }); c.on('data',m=>{ if(lag) setTimeout(()=>onMsg(m),lag); else onMsg(m); });
  const gone=()=>{ if(conn!==c) return; conn=null; if(G.kind==='net'&&(G.mode==='play'||G.mode==='over')){ G.mode='lobby'; netState='err'; G.netMsg='Суперник вийшов із гри або зв\'язок обірвався.'; try{peer&&peer.destroy();}catch(e){} peer=null; ui(); } }; c.on('close',gone); c.on('error',gone); }
function onMsg(m){ if(!m||typeof m!=='object') return; const c4=v=>clamp(v|0,0,3);
  switch(m.t){
   case 'hello': if(G.side===0&&G.mode==='lobby'){ const chs=[myCh,c4(m.ch)]; send({t:'go',chs:chs}); start('net',0,chs); } break;
   case 'go': if(G.side===1&&(G.mode==='lobby'||G.mode==='over')){ start('net',1,[c4(m.chs[0]),c4(m.chs[1])]); } break;
   case 's': if(G.kind==='net'&&foe&&Array.isArray(m.p)&&Array.isArray(m.v)&&Array.isArray(m.a)){ const first=!G.rp; G.rp={p:m.p.map(Number),v:m.v.map(Number),a:m.a.map(Number),T:+m.T||0,hp:+m.hp||0,b:+m.b||0,tg:+m.tg||0,ds:m.ds?1:0,pr:m.pr==null?100:+m.pr,age:0}; if(first) foe.p.set(G.rp.p[0],G.rp.p[1],G.rp.p[2]); } break;
   case 'f': if(G.kind==='net'&&foe&&Array.isArray(m.o)&&Array.isArray(m.d)){ const sv=foe.p.clone(); foe.cd=0; foe.p.set(+m.o[0],+m.o[1],+m.o[2]); fire(foe,me,true,new THREE.Vector3(+m.d[0],+m.d[1],+m.d[2]).normalize()); foe.p.copy(sv); } break;
   case 'hit': if(G.kind==='net'&&!me.dead&&G.phase==='fight'){ me.hp-=clamp(+m.d||0,0,70); if(m.k==='net') netHit(me); if(m.k==='shot') me.prop=Math.max(0,me.prop-clamp(+m.d||0,0,70)*.35/DR[me.ch].pt); G.hitT=.35; beep(140,0,.18,'square',.14); if(m.k==='net') say('Тебе обплутало сіткою!',2); if(m.k==='ram') say('Тебе протаранили!',1.5); } break;
   case 'dead': if(G.kind==='net'&&foe&&!foe.dead&&G.mode==='play'){ foe.dead=true; G.score[0]++; if(G.phase==='fight'){ G.phase='down'; G.phT=3.6; } say('Суперника збито!',3); [523,659,784].forEach((f,i)=>beep(f,i*.12,.2,'triangle',.16)); } break;
   case 'ag': G.again[1]=true; if(G.side===0&&G.again[0]){ const chs=[me.ch,foe.ch]; send({t:'go',chs:chs}); start('net',0,chs); } else ui(); break;
   case 'rw': if(G.side===1) say('Насувається дощ',3); break;
   case 'rain': if(G.side===1){ G.rain=20; say('Дощ: мотори тягнуть гірше, видно й чути менше',3.5); } break;
   case 'pi': send({t:'po',ts:m.ts}); break; case 'po': G.rtt=Math.round(performance.now()-m.ts); break; } }
function netFrame(dt){ if(G.kind!=='net'||!conn) return; sendT+=dt; pingT+=dt; const r=v=>Math.round(v*100)/100;
  if(sendT>=1/25&&G.mode==='play'){ sendT=0; send({t:'s',p:[r(me.p.x),r(me.p.y),r(me.p.z)],v:[r(me.v.x),r(me.v.y),r(me.v.z)],a:[r(me.yaw),r(me.pitch),r(me.roll)],T:r(me.T),hp:Math.round(me.hp),b:r(me.batt),tg:r(Math.max(0,me.tang)),ds:me.dash>0?1:0,pr:Math.round(me.prop)}); }
  if(pingT>=2){ pingT=0; send({t:'pi',ts:performance.now()}); } }

/* ---------- камера, індикатори ---------- */
const tv=new THREE.Vector3(), pv=new THREE.Vector3();
function placeD(d){ const m=d.mesh; if(!m) return; m.position.copy(d.p); m.rotation.order='YXZ'; m.rotation.y=d.yaw; m.rotation.x=-d.pitch; m.rotation.z=-d.roll; d.spin+=d.dead?.1:.9+Math.sqrt(Math.max(0,d.T)/(DR[d.ch].m*GR))*1.6; const pr=m.userData.props; for(let i=0;i<pr.length;i++) pr[i].rotation.y=d.spin*(i%2?1:-1); m.userData.web.visible=d.tang>0; }
function place(){ const d=me; placeD(me); if(foe) placeD(foe);
  let dy=G.camYaw-d.yaw; G.camYaw-=dy*.12; const sy=Math.sin(G.camYaw), cy=Math.cos(G.camYaw), back=d.indoor?2.3:3.6, up=d.indoor?.7:1.35;
  let bx=d.p.x, by=d.p.y, bz=d.p.z; for(let i=1;i<=10;i++){ const f=i/10, x=d.p.x+sy*back*f, y=d.p.y+up*f, z=d.p.z+cy*back*f; if(W.inside(x,y,z,.18)||y<.2) break; bx=x; by=y; bz=z; }
  cam.position.lerp(tv.set(bx,by,bz),.35); cam.lookAt(d.p.x-sy*5,d.p.y+.35,d.p.z-cy*5);
  shadow.position.set(d.p.x,.03,d.p.z); shadow.material.opacity=clamp(.4-d.p.y*.008,.08,.4); shadow.scale.setScalar(1+d.p.y*.03);
  wet+=((G.rain>0?1:0)-wet)*.04; scene.background.copy(SKY0).lerp(SKY1,wet); scene.fog.color.copy(scene.background); scene.fog.near=160-110*wet; scene.fog.far=560-330*wet; rainM.visible=wet>.05&&!d.indoor;
  if(rainM.visible){ rainM.position.set(cam.position.x,cam.position.y,cam.position.z); rainM.material.opacity=.55*wet; for(let i=0;i<RN;i++){ let y=rainP[i*6+1]-.55; if(y<-8) y+=26; rainP[i*6+1]=y; rainP[i*6+4]=y-1.1; } rainG.attributes.position.needsUpdate=true; }
  for(const gm of grainM) gm.material.opacity=.62+.2*Math.sin(G.t*23+gm.position.x);
  sock.rotation.y=Math.atan2(G.wx,G.wz); sock.scale.set(1,1,.4+G.ws*.12); for(const m of markM) if(m.visible) m.rotation.y=G.t*2; }
function resize(){ const cw=cv.clientWidth, chh=cv.clientHeight; if(cw<2||chh<2||!renderer)return; renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,coarse?1.5:2)); renderer.setSize(cw,chh,false); cam.aspect=cw/chh; cam.updateProjectionMatrix(); }
const mapC=$('map'), mx2=mapC.getContext('2d'); let mapT=0, fps=60;
function arrow(d,fill,stroke){ mx2.save(); mx2.translate(75+clamp(d.p.x,-210,210)*150/430,75+clamp(d.p.z,-210,210)*150/430); mx2.rotate(-d.yaw); mx2.fillStyle=fill; mx2.strokeStyle=stroke; mx2.lineWidth=1.5; mx2.beginPath(); mx2.moveTo(0,-6); mx2.lineTo(4,5); mx2.lineTo(0,2.5); mx2.lineTo(-4,5); mx2.closePath(); mx2.fill(); mx2.stroke(); mx2.restore(); }
function drawMap(){ const s=150/430, o=75; mx2.clearRect(0,0,150,150); mx2.fillStyle='rgba(120,160,90,.55)'; mx2.fillRect(0,0,150,150); mx2.fillStyle='rgba(205,190,150,.8)'; mx2.fillRect(o-95*s,o-80*s,190*s,155*s);
  mx2.fillStyle='rgba(60,70,80,.9)'; for(const f of W.foot) mx2.fillRect(o+f[0]*s,o+f[1]*s,(f[2]-f[0])*s,(f[3]-f[1])*s);
  mx2.strokeStyle='rgba(30,35,38,.55)'; mx2.lineWidth=.7; mx2.beginPath(); for(const h of W.haz) if(h.t==='w'){ mx2.moveTo(o+h.a[0]*s,o+h.a[2]*s); mx2.lineTo(o+h.b[0]*s,o+h.b[2]*s); } mx2.stroke();
  mx2.fillStyle='#35C6D8'; for(const p of W.pads){ mx2.beginPath(); mx2.arc(o+p.x*s,o+p.z*s,2.6,0,7); mx2.fill(); }
  mx2.fillStyle='#FFD34D'; for(const i of G.left){ const m=W.marks[i]; mx2.beginPath(); mx2.arc(o+m[0]*s,o+m[2]*s,2,0,7); mx2.fill(); }
  if(foe&&!foe.dead) arrow(foe,'#FF4030','#fff'); arrow(me,'#fff','#1F4E5F'); }
function hud(){ const p=DR[me.ch], hs=Math.hypot(me.v.x,me.v.z), wr=Math.atan2(G.wx,G.wz)-Math.atan2(-Math.sin(me.yaw),-Math.cos(me.yaw)), ar=['↑','↗','→','↘','↓','↙','←','↖'][((Math.round(wr/(Math.PI/4))%8)+8)%8], duel=G.kind!=='free';
  $('hL').innerHTML='<b>'+p.n+'</b>'+(duel?' · здоров\'я '+Math.max(0,Math.round(me.hp)):' · мітки '+G.got+'/'+W.marks.length)+(duel?'<div class="bar"><i style="width:'+clamp(me.hp,0,100)+'%;background:#F0705A"></i></div>':'')+'<div class="bar"><i style="width:'+(me.batt*100).toFixed(0)+'%;background:'+(me.batt<.15?'#F0705A':G.chg?'#35C6D8':'#8FD08A')+'"></i></div>'+
    'Заряд '+Math.round(me.batt*100)+'%'+(G.chg?' · заряджається':'')+'<br><span'+(me.prop<40?' style="color:#FFB0A0"':'')+'>Гвинти '+Math.round(me.prop)+'%</span>'+(G.rain>0?' · дощ '+Math.ceil(G.rain)+' с':'')+'<br>'+(hs*3.6).toFixed(0)+' км/год · висота '+me.p.y.toFixed(0)+' м<br>Вітер '+ar+' '+G.ws.toFixed(0)+' м/с'+(me.indoor?' · під дахом':'')+'<br><span style="opacity:.6">'+fps.toFixed(0)+' кадрів/с'+(G.kind==='net'&&G.rtt?' · зв\'язок '+G.rtt+' мс':'')+'</span>';
  const hT=$('hT'), tag=$('tag'), aim=$('aim'); hT.hidden=!duel; aim.hidden=!duel; if(duel){ hT.innerHTML='Ти '+G.score[0]+' : '+G.score[1]+' '+(G.kind==='bot'?'комп\'ютер':'суперник')+'<div class="bar"><i style="width:'+clamp(foe.hp,0,100)+'%"></i></div>'+DR[foe.ch].n+(foe.tang>0?' · заплутався':'')+(foe.prop<40?' · гвинти побиті':'');
    aim.className=me.lock?'lock':''; pv.copy(foe.p); pv.y+=.6; pv.project(cam); const on=pv.z<1&&Math.abs(pv.x)<.96&&Math.abs(pv.y)<.94; tag.hidden=foe.dead;
    if(on){ tag.className=''; tag.style.left=((pv.x+1)/2*100)+'%'; tag.style.top=((1-pv.y)/2*100)+'%'; tag.textContent=Math.round(me.p.distanceTo(foe.p))+' м'; }
    else { let x=pv.x, y=pv.y; if(pv.z>1){x=-x;y=-y;} const mlen=Math.max(Math.abs(x),Math.abs(y))||1; x=x/mlen*.9; y=y/mlen*.86; tag.className='off'; tag.style.left=((x+1)/2*100)+'%'; tag.style.top=((1-y)/2*100+4)+'%'; tag.textContent='◆'; }
    $('bFire').classList.toggle('cd',me.cd>0); $('bDash').classList.toggle('cd',me.dcd>0); } else tag.hidden=true;
  let m=G.msgT>0?G.msg:''; if(!m){ if(me.batt<=0) m='Заряд скінчився'+(duel?'':'. Натисни «На старт»'); else if(me.batt<.15) m='Заряд на межі — шукай блакитну зарядку'; else if(me.prop<30) m='Гвинти побиті — на блакитній зарядці їх полагодять'; else if(Math.abs(me.p.x)>W.LIM||Math.abs(me.p.z)>W.LIM) m='Сигнал слабшає — вертайся'; else if(me.corn) m='У кукурудзі: стебла гальмують'; else if(me.p.y>p.ceil*.92) m='Стеля: вище мотори не тягнуть'; }
  $('hMsg').textContent=m; $('hit').style.opacity=G.hitT>0?(G.hitT/.35).toFixed(2):0; }

/* ---------- звук ---------- */
let AC=null, master=null, sndOn=true, o1=null,o2=null,gP=null,gW=null,o3=null,gF=null,gR=null;
function audioInit(){ if(AC){ if(AC.state==='suspended') AC.resume(); return; } try{AC=new (window.AudioContext||window.webkitAudioContext)();}catch(e){AC=null;return;}
  master=AC.createGain(); master.gain.value=sndOn?.9:0; master.connect(AC.destination);
  const mk=()=>{ const o=AC.createOscillator(), o2b=AC.createOscillator(), lp=AC.createBiquadFilter(), g=AC.createGain(); o.type='sawtooth'; o2b.type='square'; lp.type='lowpass'; lp.frequency.value=900; g.gain.value=0; o.connect(lp); o2b.connect(lp); lp.connect(g); g.connect(master); o.start(); o2b.start(); return [o,o2b,g]; };
  [o1,o2,gP]=mk(); let x; [o3,x,gF]=mk(); o3.x=x;
  const buf=AC.createBuffer(1,AC.sampleRate*2,AC.sampleRate), dd=buf.getChannelData(0); for(let i=0;i<dd.length;i++) dd[i]=Math.random()*2-1; const ns=AC.createBufferSource(); ns.buffer=buf; ns.loop=true; const bp=AC.createBiquadFilter(); bp.type='lowpass'; bp.frequency.value=500; gW=AC.createGain(); gW.gain.value=0; ns.connect(bp); bp.connect(gW); gW.connect(master); const hp=AC.createBiquadFilter(); hp.type='highpass'; hp.frequency.value=2500; gR=AC.createGain(); gR.gain.value=0; ns.connect(hp); hp.connect(gR); gR.connect(master); ns.start(); }
function beep(f,delay,dur,type,vol){ if(!AC||!sndOn)return; const t=AC.currentTime+delay,o=AC.createOscillator(),g=AC.createGain(); o.type=type; o.frequency.value=f; g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+.012); g.gain.exponentialRampToValueAtTime(.0008,t+dur); o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+.05); }
function audioFrame(){ if(!AC)return; gR.gain.setTargetAtTime(G.mode==='play'&&G.rain>0?(me.indoor?.05:.13):0,AC.currentTime,.3); const p=DR[me.ch], play=G.mode==='play', r=Math.sqrt(Math.max(.05,me.T/(p.m*GR))), t=AC.currentTime; o1.frequency.setTargetAtTime(p.hz*r,t,.05); o2.frequency.setTargetAtTime(p.hz*r*2.02,t,.05); gP.gain.setTargetAtTime(play&&!me.dead?.05*p.loud*(.5+r*.5):0,t,.08);
  gW.gain.setTargetAtTime(play?clamp(Math.hypot(me.v.x-G.wx,me.v.y,me.v.z-G.wz)/25,0,1)*.12:0,t,.1);
  if(foe){ const q=DR[foe.ch], dist=me.p.distanceTo(foe.p), rf=Math.sqrt(Math.max(.05,foe.T/(q.m*GR))); o3.frequency.setTargetAtTime(q.hz*rf*1.03,t,.05); o3.x.frequency.setTargetAtTime(q.hz*rf*2.05,t,.05); gF.gain.setTargetAtTime(play&&!foe.dead?.06*q.loud*clamp(1-dist/(40+q.loud*80),0,1)*(G.rain>0?.35:1):0,t,.1); } else gF.gain.setTargetAtTime(0,t,.1); }

/* ---------- інтерфейс ---------- */
const ov=$('ov'), card=$('card'); let autoBig=false;
function ui(){ const play=G.mode==='play'; if(autoBig&&(G.mode==='menu'||G.mode==='lobby')) setBig(false); document.body.classList.toggle('m',!play); ov.hidden=play; $('bHome').hidden=!play||G.kind!=='free'; $('bMenu').hidden=G.mode==='menu'; $('hL').hidden=$('map').hidden=!play;
  $('bFire').hidden=!play||G.kind==='free'||me.ch===2; $('bDash').hidden=!play||me.ch!==2; if(!play){ $('hT').hidden=$('aim').hidden=$('tag').hidden=true; }
  if(play){ setTimeout(resize,30); return; }
  const bar=(l,v)=>'<span>'+l+'</span><i style="--w:'+Math.round(clamp(v,.08,1)*100)+'%"></i>';
  if(G.mode==='menu'){
    card.innerHTML=(glOK?'':'<p>Цей пристрій не показує 3D у цьому вікні.</p>')+'<span class="k">'+(invite?'Тебе кличуть на дуель':'Дуель дронів над фермою')+'</span><h3>Обери дрон</h3><div class="chars">'+DR.map((p,i)=>'<button data-ch="'+i+'" class="'+(i===myCh?'on':'')+'"><b>'+p.n+'</b><em>'+p.w+'</em><div class="stats">'+bar('Швидкість',p.vmax/22)+bar('Маневр',p.rate/360)+bar('Стеля',p.ceil/120)+bar('Заряд',p.hov/240)+bar('Проти вітру',1-(p.cda/p.m)/.085)+bar('Тиша',1-p.loud*.9)+bar('Гвинти',p.pt/1.6)+'</div></button>').join('')+'</div><p>'+DR[myCh].d+' <b style="color:var(--star)">'+DR[myCh].wd+'</b></p><div class="btns">'+
      (invite?'<button id="mJoin">Приєднатися до дуелі</button>':'<button id="mHost">Дуель удвох онлайн</button>')+'<button class="sec" id="mBot">Проти комп\'ютера</button><button class="sec" id="mFree">Вільний політ</button></div>';
    card.querySelectorAll('button[data-ch]').forEach(b=>b.onclick=()=>{ myCh=+b.dataset.ch; try{localStorage.setItem('pz_dr_ch',myCh);}catch(e){} ui(); });
    const h=$('mHost'), j=$('mJoin'); if(h) h.onclick=()=>{audioInit(); hostGame();}; if(j) j.onclick=()=>{audioInit(); joinGame(invite);};
    $('mBot').onclick=()=>{ audioInit(); start('bot',0,[myCh,Math.floor(Math.random()*4)]); }; $('mFree').onclick=()=>{ audioInit(); start('free',0,[myCh,0]); };
    if(!glOK) card.querySelectorAll('.btns button').forEach(b=>b.disabled=true);
  } else if(G.mode==='lobby'){ const url=location.origin+location.pathname+'?g='+code, back='<button class="sec" id="lBack">Назад</button>';
    if(netState==='err') card.innerHTML='<h3>Не вийшло</h3><p>'+G.netMsg+'</p><div class="btns"><button id="lBack">Назад</button></div>';
    else if(netState==='join') card.innerHTML='<span class="k">Гра '+code+'</span><h3>Заходимо в гру…</h3><p>З\'єднуємо два телефони напряму. Це займає кілька секунд.</p><div class="btns">'+back+'</div>';
    else if(netState==='open') card.innerHTML='<h3>Створюємо гру…</h3><p>Зв\'язуємось із сервером знайомства.</p><div class="btns">'+back+'</div>';
    else { card.innerHTML='<span class="k">Гру створено · твій дрон: '+DR[myCh].n+'</span><h3>Надішли посилання супернику</h3><div class="link" id="lUrl">'+url+'</div><p>Коли він відкриє посилання й натисне «Приєднатися», дуель почнеться сама. Не закривай цю сторінку.</p><div class="btns">'+(navigator.share?'<button id="lShare">Поділитися</button>':'')+'<button '+(navigator.share?'class="sec" ':'')+'id="lCopy">Скопіювати посилання</button>'+back+'</div>';
      const cp=$('lCopy'); cp.onclick=()=>{ const sel=()=>{ const r=document.createRange(); r.selectNodeContents($('lUrl')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent='Виділено — скопіюй'; }; try{ navigator.clipboard.writeText(url).then(()=>{cp.textContent='Скопійовано';},sel); }catch(e){ sel(); } };
      const sh=$('lShare'); if(sh) sh.onclick=()=>{ try{ navigator.share({title:'Дрони над фермою',text:'Виходь на дуель дронів:',url:url}).catch(()=>{}); }catch(e){} }; }
    $('lBack').onclick=()=>{ netClose(); G.mode='menu'; ui(); };
  } else if(G.mode==='over'){ const win=G.score[0]>G.score[1], net=G.kind==='net';
    card.innerHTML='<span class="k">'+DR[me.ch].n+' проти: '+DR[foe.ch].n+'</span><h3>'+(win?'Перемога!':'Поразка')+'</h3><p class="code">'+G.score[0]+' : '+G.score[1]+'</p>'+(net&&G.again[1]&&!G.again[0]?'<p>Суперник хоче реванш.</p>':'')+(net&&G.again[0]?'<p>Чекаємо на суперника…</p>':'')+'<div class="btns"><button id="oAgain"'+(net&&G.again[0]?' disabled':'')+'>Реванш</button><button class="sec" id="oMenu">Змінити дрон</button></div>';
    $('oAgain').onclick=()=>{ if(net){ G.again[0]=true; send({t:'ag'}); if(G.side===0&&G.again[1]){ const chs=[me.ch,foe.ch]; send({t:'go',chs:chs}); start('net',0,chs); } else ui(); } else start(G.kind,0,[me.ch,foe.ch]); };
    $('oMenu').onclick=()=>{ netClose(); G.mode='menu'; ui(); }; }
  setTimeout(resize,30); }
/* джойстики */
const st={}, SR=55;
function loc(e){ const r=$('stage').getBoundingClientRect(), rot=document.body.classList.contains('rot'); return rot?{x:e.clientY-r.top,y:r.right-e.clientX,w:r.height,h:r.width}:{x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}; }
cv.addEventListener('pointerdown',e=>{ if(G.mode!=='play')return; e.preventDefault(); audioInit(); if(e.pointerType==='mouse'){ I.fire=true; return; } const l=loc(e), side=l.x<l.w/2?'L':'R'; if(st[side])return; st[side]={id:e.pointerId,x:l.x,y:l.y}; document.body.classList.add('used'); const el=$('s'+side); el.hidden=false; el.style.left=l.x+'px'; el.style.top=l.y+'px'; el.firstChild.style.transform=''; try{cv.setPointerCapture(e.pointerId);}catch(_){}} );
cv.addEventListener('pointermove',e=>{ for(const side of ['L','R']){ const s=st[side]; if(!s||s.id!==e.pointerId) continue; const l=loc(e); let dx=(l.x-s.x)/SR, dy=(l.y-s.y)/SR; const m=Math.hypot(dx,dy); if(m>1){dx/=m;dy/=m;} $('s'+side).firstChild.style.transform='translate('+dx*SR*.6+'px,'+dy*SR*.6+'px)';
    const dz=v=>Math.abs(v)<.12?0:(v-Math.sign(v)*.12)/.88; if(side==='L'){ I.mx=dz(dx); I.my=dz(-dy); } else { I.yaw=dz(dx); I.alt=dz(-dy); } } });
const pUp=e=>{ if(e.pointerType==='mouse') I.fire=false; for(const side of ['L','R']){ const s=st[side]; if(s&&s.id===e.pointerId){ st[side]=null; $('s'+side).hidden=true; if(side==='L'){I.mx=I.my=0;} else {I.yaw=I.alt=0;} } } };
cv.addEventListener('pointerup',pUp); cv.addEventListener('pointercancel',pUp); cv.addEventListener('contextmenu',e=>e.preventDefault());
function holdBtn(id,k){ const el=$(id), dn=e=>{e.preventDefault(); audioInit(); I[k]=true; try{el.setPointerCapture(e.pointerId);}catch(_){}} , up=()=>{I[k]=false;}; el.addEventListener('pointerdown',dn); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('lostpointercapture',up); el.addEventListener('contextmenu',e=>e.preventDefault()); }
holdBtn('bFire','fire'); holdBtn('bDash','dash');
const KM={KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down',KeyQ:'left',KeyE:'right',Space:'up',ShiftLeft:'down',ShiftRight:'down',KeyF:'fire',KeyC:'dash'};
window.addEventListener('keydown',e=>{ if(G.mode!=='play')return; const k=KM[e.code]; if(k){key[k]=true;e.preventDefault();audioInit();} else if(e.code==='KeyR'&&G.kind==='free'){ spawn(me,FREE); me.batt=1; } });
window.addEventListener('keyup',e=>{ const k=KM[e.code]; if(k) key[k]=false; }); window.addEventListener('blur',()=>{ for(const k in key) key[k]=false; I.fire=I.dash=false; });
$('bHome').onclick=()=>{ spawn(me,FREE); say('На старті, заряд повний',2); };
$('bMenu').onclick=()=>{ netClose(); G.mode='menu'; ui(); };
$('bSnd').onclick=()=>{sndOn=!sndOn; audioInit(); if(master) master.gain.value=sndOn?.9:0; $('bSnd').textContent='Звук: '+(sndOn?'увімк.':'вимк.'); $('bSnd').setAttribute('aria-pressed',sndOn?'true':'false');};
function layoutBig(){ const b=document.body, big=b.classList.contains('big'); b.classList.toggle('rot',big&&coarse&&window.innerHeight>window.innerWidth*1.12); resize(); setTimeout(resize,90); setTimeout(resize,400); }
function tryFs(){ const el=document.documentElement; try{ const r=el.requestFullscreen||el.webkitRequestFullscreen; if(r){ const pr=r.call(el,{navigationUI:'hide'}); if(pr&&pr.then) pr.then(()=>{ try{ if(screen.orientation&&screen.orientation.lock) screen.orientation.lock('landscape').catch(()=>{}); }catch(e){} }).catch(()=>{}); } }catch(e){} }
function setBig(v,fs){ document.body.classList.toggle('big',v); $('bExit').hidden=!v; if(v){ if(fs) tryFs(); } else { autoBig=false; try{ if(document.fullscreenElement&&document.exitFullscreen) document.exitFullscreen().catch(()=>{}); }catch(e){} } layoutBig(); }
$('bBig').onclick=()=>{audioInit(); setBig(true,true);}; $('bExit').onclick=()=>setBig(false);
document.addEventListener('fullscreenchange',layoutBig); window.addEventListener('resize',layoutBig); window.addEventListener('pagehide',()=>netClose());

/* ---------- цикл ---------- */
let last=0;
function frame(ts){ const dt=Math.min(.1,(ts-last)/1000||0); last=ts; if(dt>0) fps+=(1/dt-fps)*.05;
  if(G.mode==='play'&&(!document.hidden||G.kind==='net')){ let r=dt; while(r>1e-5&&G.mode==='play'){ const s=Math.min(r,1/120); step(s); r-=s; } if(G.mode==='play'){ place(); hud(); mapT+=dt; if(mapT>.12){mapT=0; drawMap();} } netFrame(dt); }
  else { G.t+=dt; if(G.mode==='menu'||G.mode==='lobby'){ cam.position.set(Math.sin(G.t*.08)*90,38,Math.cos(G.t*.08)*90+10); cam.lookAt(0,6,-10); } if(G.kind==='net'&&conn) netFrame(dt); }
  if(renderer) renderer.render(scene,cam); audioFrame(); requestAnimationFrame(frame); }
new ResizeObserver(resize).observe(cv); resize(); ui(); requestAnimationFrame(frame);
if(isLoc) window.__d={get me(){return me;},get foe(){return foe;},G:G,I:I,W:W,DR:DR,step:step,start:start,place:place,hud:hud,net:()=>({open:!!(conn&&conn.open),code:code,st:netState,msg:G.netMsg})};
})();
