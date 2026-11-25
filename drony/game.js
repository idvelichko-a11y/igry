/* Дрони над фермою — етап 9: п'ятий дрон «Овод» (вогнемет, підпал кукурудзи й сіна); кімната до 6 гравців, команди 3 на 3, комп'ютери в командах; політ, зброя, гвинти, дроти, дощ, режими, артефакти, шум, лабіринт, птахи, хмари, туман */
(function(){
"use strict";
const VER=(()=>{ try{ const m=/game\.js\?v=(\d+)/.exec(document.currentScript.src); return m?+m[1]:0; }catch(e){ return 0; } })();
(async()=>{ try{ const t=await (await fetch(location.pathname+'?fresh='+Date.now(),{cache:'no-store'})).text(), m=/game\.js\?v=(\d+)/.exec(t), nv=m?+m[1]:0; let done=''; try{ done=sessionStorage.getItem('pz_dr_upd')||''; }catch(e){}
  if(nv>VER&&done!==String(nv)){ try{ sessionStorage.setItem('pz_dr_upd',String(nv)); }catch(e){} location.reload(); } }catch(e){} })();
const $=id=>document.getElementById(id), clamp=(v,a,b)=>v<a?a:v>b?b:v, RAD=Math.PI/180, GR=9.81, RHO=1.2, R0=.42, WIN=3;
const coarse=(()=>{try{return matchMedia('(pointer:coarse)').matches;}catch(e){return false;}})(); if(coarse) document.body.classList.add('touch');
const Q=new URLSearchParams(location.search), isLoc=/^(localhost|127\.0\.0\.1)$/.test(location.hostname);
/* маса кг, тяга/вага, макс. нахил °, швидкість нахилу °/с, поворот °/с, лобовий опір м², підйом/спуск м/с, стеля м, зависання с, гучність */
const DR=[
 {n:'Шершень',w:'дріб',wd:'Дріб віялом: що ближче, то болючіше.',m:1.6,twr:2.6,tilt:35,rate:220,yaw:150,cda:.0715,vUp:6,vDn:5,ceil:60,hov:200,loud:.85,hz:150,pt:1,col:0xD2A63C,rng:30,cdn:.75,d:'Середній у всьому. Слухняний, добре тримає вітер.'},
 {n:'Павук',w:'сітка',wd:'Сітка обплутує: ворог падає, не стріляє і перегріває мотори.',m:.9,twr:2.4,tilt:40,rate:200,yaw:140,cda:.07,vUp:5,vDn:4.5,ceil:90,hov:240,loud:.35,hz:170,pt:.6,col:0x7FB069,rng:26,cdn:3.6,d:'Легкий і тихий, довго тримає заряд. Вітер зносить найсильніше, гвинти найніжніші.'},
 {n:'Оса',w:'таран',wd:'Гарпун чіпляє ворога до 25 м і підтягує тебе до нього. Ривок сам доводить на ціль із 35 м. Шкода — від удару списом.',m:1,twr:3.9,tilt:48,rate:432,yaw:264,cda:.026,vUp:9.6,vDn:8.4,ceil:35,hov:130,loud:.6,hz:195,pt:.8,col:0xC9503A,rng:25,cdn:1.2,d:'Найшвидша і найверткіша. Заряд тане на очах.'},
 {n:'Джміль',w:'гармата',wd:'Рідкий потужний постріл із вибухом. Ближче 6 м снаряд не встигає звестися.',m:3.2,twr:1.9,tilt:18,rate:110,yaw:90,cda:.1,vUp:3.5,vDn:4,ceil:120,hov:170,loud:1,hz:95,pt:1.6,col:0x3F5F8A,rng:50,cdn:3,d:'Важкий і міцний: шкода по ньому на чверть менша. Розганяється довго, зате вітер йому байдужий.'},
 {n:'Овод',w:'вогнемет',wd:'Струмінь полум\'я на 9 м палить здоров\'я і гвинти. Підпалює кукурудзу й сіно — вогонь іде полем за вітром і виганяє тих, хто сховався.',m:2.6,twr:2.2,tilt:33,rate:170,yaw:115,cda:.095,vUp:4.5,vDn:4.5,ceil:60,hov:190,loud:.9,hz:110,pt:1.3,col:0xB5541E,rng:9.5,cdn:.1,d:'Повільний і міцний: шкода по ньому на третину менша. Пального — на 4 секунди вогню, потім доливається саме.'},
];
DR.forEach(p=>{ p.vmax=Math.sqrt(2*p.m*GR*Math.tan(p.tilt*RAD)/(RHO*p.cda)); });
let myCh=0; try{const v=+localStorage.getItem('pz_dr_ch'); if(v>=0&&v<5) myCh=v;}catch(e){}

/* ---------- сцена ---------- */
const cv=$('c'); let renderer=null, glOK=true;
try{ renderer=new THREE.WebGLRenderer({canvas:cv,antialias:!coarse,powerPreference:'high-performance'}); }catch(e){ glOK=false; }
const scene=new THREE.Scene(); scene.background=new THREE.Color(0xBFDDEB); scene.fog=new THREE.Fog(0xBFDDEB,160,560);
const cam=new THREE.PerspectiveCamera(70,16/9,.12,800);
scene.add(new THREE.HemisphereLight(0xdfeeff,0x55603f,.62)); const sun=new THREE.DirectionalLight(0xfff2d0,.5); sun.position.set(60,120,40); scene.add(sun);
const W=buildWorld(THREE); scene.add(W.mesh);
const TOPY=Math.max(...W.cols.map(c=>c.r?c.y1:c[4]))+2;   /* стеля для всіх: найвища будівля + 2 м */ W.extra.forEach(o=>scene.add(o)); const grainM=W.extra.filter(o=>o.userData.grain);
const RN=coarse?260:420, rainP=new Float32Array(RN*6), rainG=new THREE.BufferGeometry(); for(let i=0;i<RN;i++){ const x=(Math.random()-.5)*44, y=Math.random()*26-8, z=(Math.random()-.5)*44; rainP.set([x,y,z,x+.12,y-1.1,z],i*6); } rainG.setAttribute('position',new THREE.BufferAttribute(rainP,3));
const rainM=new THREE.LineSegments(rainG,new THREE.LineBasicMaterial({color:0xDCEBF5,transparent:true,opacity:.55})); rainM.frustumCulled=false; rainM.visible=false; scene.add(rainM); const SKY0=new THREE.Color(0xBFDDEB), SKY1=new THREE.Color(0x7F8E96); let wet=0;
W.pads.forEach(p=>{ const m=new THREE.Mesh(new THREE.CylinderGeometry(1.6,1.6,.08,20),new THREE.MeshBasicMaterial({color:0x35C6D8})); m.position.set(p.x,p.y+.05,p.z); scene.add(m); const r=new THREE.Mesh(new THREE.TorusGeometry(1.6,.07,6,24),new THREE.MeshBasicMaterial({color:0xffffff})); r.rotation.x=Math.PI/2; r.position.set(p.x,p.y+.12,p.z); scene.add(r); });
const markM=[]; W.marks.forEach(p=>{ const m=new THREE.Mesh(new THREE.TorusGeometry(.75,.11,8,20),new THREE.MeshBasicMaterial({color:0xFFD34D})); m.position.set(p[0],p[1],p[2]); m.visible=false; scene.add(m); markM.push(m); });
const shadow=new THREE.Mesh(new THREE.CircleGeometry(.55,16),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.35,depthWrite:false})); shadow.rotation.x=-Math.PI/2; scene.add(shadow);
const sock=new THREE.Mesh(new THREE.ConeGeometry(.45,2.4,8),new THREE.MeshBasicMaterial({color:0xF07030})); sock.geometry.rotateX(Math.PI/2); sock.position.set(-10,21.6,30); scene.add(sock);
function mkMesh(ch,col){ const p=DR[ch], g=new THREE.Group(), mat=new THREE.MeshLambertMaterial({color:col==null?p.col:col}), dk=new THREE.MeshLambertMaterial({color:0x22292C}), s=Math.cbrt(p.m/1.6); g.userData.props=[];
  g.add(new THREE.Mesh(new THREE.BoxGeometry(.34*s,.12*s,.46*s),mat)); const nose=new THREE.Mesh(new THREE.BoxGeometry(.16*s,.08*s,.1*s),new THREE.MeshBasicMaterial({color:0xFF4030})); nose.position.set(0,0,-.26*s); g.add(nose);
  for(const [ax,az] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ const arm=new THREE.Mesh(new THREE.BoxGeometry(.05,.04,.5*s),dk); arm.position.set(ax*.2*s,0,az*.2*s); arm.rotation.y=ax*az*Math.PI/4; g.add(arm);
    const pr=new THREE.Mesh(new THREE.CylinderGeometry(.19*s,.19*s,.015,14),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.35})); pr.position.set(ax*.36*s,.07,az*.36*s); g.add(pr);
    const bl=new THREE.Mesh(new THREE.BoxGeometry(.36*s,.012,.035),dk); bl.position.copy(pr.position); g.add(bl); g.userData.props.push(bl); }
  let b; if(ch===0){ b=new THREE.Mesh(new THREE.CylinderGeometry(.04,.06,.3,8),dk); b.rotation.x=Math.PI/2; b.position.set(0,-.08,-.3); }
  if(ch===1){ b=new THREE.Mesh(new THREE.BoxGeometry(.2,.1,.2),dk); b.position.set(0,-.1,-.12); }
  if(ch===2){ b=new THREE.Mesh(new THREE.ConeGeometry(.035,.75,6),new THREE.MeshLambertMaterial({color:0xC9CED2})); b.rotation.x=-Math.PI/2; b.position.set(0,0,-.6); }
  if(ch===3){ b=new THREE.Mesh(new THREE.CylinderGeometry(.07,.07,.6,8),dk); b.rotation.x=Math.PI/2; b.position.set(0,-.12,-.3); }
  if(ch===4){ b=new THREE.Mesh(new THREE.CylinderGeometry(.06,.035,.55,8),new THREE.MeshLambertMaterial({color:0xB87333})); b.rotation.x=Math.PI/2; b.position.set(0,-.1,-.45); const tank=new THREE.Mesh(new THREE.CylinderGeometry(.09,.09,.32,10),new THREE.MeshLambertMaterial({color:0xC0392B})); tank.rotation.z=Math.PI/2; tank.position.set(0,-.16,.08); g.add(tank); const pil=new THREE.Mesh(new THREE.SphereGeometry(.035,6,5),new THREE.MeshBasicMaterial({color:0x5AB0FF})); pil.position.set(0,-.1,-.74); g.add(pil); }
  if(ch===9){ b=new THREE.Mesh(new THREE.CylinderGeometry(.022,.03,1.05,6),dk); b.rotation.x=Math.PI/2; b.position.set(0,-.05,-.62); const tail=new THREE.Mesh(new THREE.CylinderGeometry(.02,.045,.75,6),mat); tail.rotation.x=Math.PI/2; tail.position.set(0,0,.55); g.add(tail); const eye=new THREE.Mesh(new THREE.SphereGeometry(.05,8,6),new THREE.MeshBasicMaterial({color:0xFF2020})); eye.position.set(0,-.05,-1.15); g.add(eye); }
  g.add(b); const web=new THREE.Mesh(new THREE.IcosahedronGeometry(.7,1),new THREE.MeshBasicMaterial({color:0xffffff,wireframe:true})); web.visible=false; g.add(web); g.userData.web=web; if(col!=null){ const cap=new THREE.Mesh(new THREE.BoxGeometry(.2*s,.035,.22*s),new THREE.MeshLambertMaterial({color:p.col})); cap.position.y=.075*s; g.add(cap); } const sh=new THREE.Mesh(new THREE.IcosahedronGeometry(.85,1),new THREE.MeshBasicMaterial({color:0xB58CFF,wireframe:true})); sh.visible=false; g.add(sh); g.userData.sh=sh; const bo=new THREE.Mesh(new THREE.OctahedronGeometry(.16,0),new THREE.MeshBasicMaterial({color:0xFFD34D})); bo.position.y=.42; bo.visible=false; g.add(bo); g.userData.bo=bo; return g; }

/* ---------- стан ---------- */
const SPT=[[-70,.42,62,-.9],[76,.42,-70,2.3]], SPF=[[-70,.42,62,-.9],[76,.42,-70,2.3],[-90,.42,-74,-2.3],[86,.42,58,.8],[30,.42,-76,3.1],[15,.42,72,0]], FREE=[0,.42,20,0];
const TEAMC=[0x3F8FD2,0xE8853A], FFAC=[0x3F8FD2,0xE8853A,0x6FBF4A,0xA070D0,0xE4C63A,0xD86FA8], TEAMN=['Сині','Помаранчеві'], hex=c=>'#'+c.toString(16).padStart(6,'0');
function mkD(ch){ return {ch:ch,id:0,team:0,side:0,local:true,bot:false,col:0,det:0,ls:null,rp:null,lastBy:-1,p:new THREE.Vector3(),v:new THREE.Vector3(),yaw:0,pitch:0,roll:0,batt:1,T:0,ground:true,spin:0,hp:100,cd:0,dcd:0,dash:0,tang:0,imm:0,lockT:0,dry:0,prop:100,snag:0,boost:0,shield:0,rT:0,aimT:0,aimId:null,laser:null,zoom:0,el:0,le:0,ld:null,hook:null,hcd:0,hookId:null,tgt:null,dead:false,lock:false,indoor:false,corn:false,mesh:null,
  inp:{mx:0,my:0,yaw:0,alt:0,fire:false,dash:false}}; }
let me=mkD(0), foe=null, D=[];
const G={mode:'menu',kind:'free',myId:0,host:true,fmt:'teams',t:0,wa:.6,ws:3,wx:0,wz:0,hitT:0,hits:0,got:0,left:[],msg:'',msgT:0,chg:false,camYaw:0,sc:[0,0,0,0,0,0,0,0],res:'',phase:'fight',phT:0,rain:0,rainIn:45,rainW:false,rule:'duel',win:false,fog:null,ctOff:0,detT:0,scanT:0,baseHit:0,rtt:0,netMsg:'',auto:coarse,botSkill:.6};
const I={mx:0,my:0,yaw:0,alt:0,fire:false,dash:false}, key={}; const nearL=[]; const shots=[], fx=[];
function say(s,t){G.msg=s;G.msgT=t||2.5;}
function auth(){ return G.kind!=='net'||G.host; }
function isEnemy(d){ return d!==me&&d.side!==me.side; }
function label(d){ return d===me?'Ти':d.bot?(G.kind==='bot'?'Комп\'ютер':'К'+(d.id-5)):'Г'+(d.id+1); }
function spawnOf(d){ if(G.kind==='free') return FREE; if(G.fmt==='teams'){ const s=SPT[d.team], k=D.filter(q=>q.team===d.team).indexOf(d), sg=d.team?-1:1; return [s[0]+k*4*sg,s[1],s[2]-k*3*sg,s[3]]; } return SPF[Math.max(0,D.indexOf(d))%6]; }
function spawn(d,sp){ d.p.set(sp[0],sp[1],sp[2]); d.v.set(0,0,0); d.yaw=sp[3]; d.pitch=d.roll=0; d.ground=true; d.hp=100; d.batt=1; d.cd=d.dcd=d.dash=d.tang=d.imm=d.lockT=d.snag=d.boost=d.shield=d.aimT=d.burnT=0; d.fuel=1; d.dry2=false; d.flaming=false; d.aimId=null; d.zoom=0; d.el=0; d.hook=null; d.hcd=0; d.hookId=null; if(d===me) scopeApply(); d.prop=100; d.dead=false; d.lastBy=-1; if(d.mesh) d.mesh.visible=true; }
function clearFx(){ for(const s of shots) scene.remove(s.m); shots.length=0; for(const f of fx) scene.remove(f.m); fx.length=0; }
/* cfg: {kind:'free'|'bot'|'net', rule, fmt:'teams'|'ffa', myId, bi:[i0,i1], players:[{id,ch,team,bot}]} */
function start(cfg){ G.kind=cfg.kind; G.myId=cfg.myId|0; G.host=G.kind!=='net'||G.myId===0; G.fmt=cfg.fmt==='ffa'?'ffa':'teams'; G.rule=(G.kind!=='free'&&RULES[cfg.rule])?cfg.rule:'duel'; if(G.rule==='base'&&G.fmt!=='teams') G.rule='duel';
  clearFx(); clearBases(); pkClear(); flagM.visible=false; FL.i=-1; FL.n=0; FL.req=-1; G.win=false; G.baseHit=0; G.fog=null; G.ctOff=0; fireReset(); G.res=''; for(const b of BIRDS) b.hid=0;
  for(const d of D){ if(d.mesh) scene.remove(d.mesh); if(d.laser) scene.remove(d.laser); } if(me.mesh) scene.remove(me.mesh); D=[];
  for(const pl of cfg.players){ const d=mkD(clamp(pl.ch|0,0,4)); d.id=pl.id|0; d.team=pl.team?1:0; d.side=G.fmt==='teams'?d.team:d.id; d.bot=!!pl.bot; d.local=d.id===G.myId||(d.bot&&G.host); if(d.bot) d.bs={t:Math.random()*.25,ty:20,err:0,sd:D.length%2?1:-1,st:0,los:true,wall:false,stuck:0,esc:0}; d.col=G.kind==='free'?null:G.fmt==='teams'?TEAMC[d.team]:FFAC[d.id%6]; d.mesh=mkMesh(d.ch,d.col); if(d.col==null) d.col=DR[d.ch].col; scene.add(d.mesh); if(d.ch===9||d.ch===2){ const lg=new THREE.BufferGeometry(); lg.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3)); d.laser=new THREE.Line(lg,new THREE.LineBasicMaterial({color:d.ch===2?0x1E2326:0xFF2020,transparent:true,opacity:.8})); d.laser.frustumCulled=false; d.laser.visible=false; scene.add(d.laser); } D.push(d); }
  me=D.find(d=>d.id===G.myId)||D[0]; foe=D.find(isEnemy)||null; for(const d of D) d.tgt=d===me?foe:me;
  if(G.rule==='base'){ const bi=Array.isArray(cfg.bi)?cfg.bi:[0,0]; for(let t=0;t<2;t++){ const l=BSP[t], a=l[clamp(bi[t]|0,0,l.length-1)]; BASE[t]=mkBase(t,a[0],a[1],a[2]); } BASE[me.team].found=true; }
  G.t=0; G.hits=0; G.got=0; G.rain=0; G.rainIn=35+Math.random()*25; G.rainW=false; G.sc=[0,0,0,0,0,0,0,0]; G.left=G.kind==='free'?W.marks.map((_,i)=>i):[]; markM.forEach(m=>m.visible=G.kind==='free');
  G.mode='play'; respawnAll(); if(coarse){ autoBig=true; setBig(true,true); } ui();
  if(G.rule==='flag'&&auth()) flagNext(-1);
  say(G.kind==='free'?'Збери всі '+W.marks.length+' міток: вони в будівлях, на поверхах і в полі':G.rule==='base'?'Знайди базу суперника і знищ її. Своя — кольору твоєї команди на карті':G.rule==='flag'?'Шукай червоний прапор: видно лише відстань до нього. До 5':'Знайди суперників і збий їх. До '+WIN+' раундів',5); }
function rndBi(outdoor){ const n=outdoor?4:6; return [Math.floor(Math.random()*n),Math.floor(Math.random()*n)]; }
function soloCfg(kind,rule,ch,botCh){ return kind==='free'?{kind:'free',myId:0,players:[{id:0,ch:ch,team:0}]}:{kind:'bot',rule:rule,fmt:'teams',myId:0,bi:rndBi(true),players:[{id:0,ch:ch,team:0},{id:6,ch:botCh,team:1,bot:true}]}; }
function respawnAll(){ for(const d of D){ if(d.local) spawn(d,spawnOf(d)); else { d.dead=false; d.hp=100; if(d.rp) d.rp.fl&=~4; d.mesh.visible=true; } } G.camYaw=me.yaw; G.phase='fight'; clearFx(); }

/* ---------- фізика польоту ---------- */
function resolve(d,nx,ny,nz,pen){ d.p.x+=nx*pen; d.p.y+=ny*pen; d.p.z+=nz*pen; const vn=d.v.x*nx+d.v.y*ny+d.v.z*nz; if(vn<0){ if(-vn>3.2) bump(d,-vn); const k=1.2*vn; d.v.x-=k*nx; d.v.y-=k*ny; d.v.z-=k*nz; d.v.multiplyScalar(.985); } if(ny>.7) d.ground=true; }
function bump(d,sp){ if(d.local) d.prop=Math.max(0,d.prop-Math.max(0,sp-2.5)*2.2/DR[d.ch].pt); if(d===me){ G.hits++; G.hitT=.35; beep(90+sp*4,0,.14,'sawtooth',.16); } const th=d.tang>0?3:7; if(G.kind!=='free'&&sp>th&&!d.dead&&(d.local)) d.hp-=Math.min(40,(sp-th)*(d.tang>0?4:3.5)); }
function netHit(d){ if(d.tang<=0&&d.imm<=0){ d.tang=3.4; return true; } return false; }
function collide(d){ collideW(d); if(G.rule==='base') for(const b of BASE) if(b&&!b.dead){ const dx=d.p.x-b.p.x, dz=d.p.z-b.p.z, dd=Math.hypot(dx,dz); const by=d.p.y-b.y0; if(by<1.3+R0&&by>-R0&&dd<1.3+R0){ if(by>1.3) resolve(d,0,1,0,1.3+R0-by); else if(dd>1e-6) resolve(d,dx/dd,0,dz/dd,1.3+R0-dd); } } }
function collideW(d){ W.near(d.p.x,d.p.z,nearL); const cols=W.cols; for(let pass=0;pass<2;pass++) for(const idx of nearL){ const c=cols[idx], x=d.p.x,y=d.p.y,z=d.p.z;
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
  if(d.dead){ mx=my=yw=al=0; } else if(d.tang>0){ d.tang-=dt; if(d.tang<=0) d.imm=2.5; if(G.kind!=='free'&&(d.local)) d.hp-=6*(d.ch===3?.75:1)*dt; mx=clamp(mx*.3+Math.sin(G.t*9+d.ch)*.8,-1,1); my=clamp(my*.3+Math.cos(G.t*7)*.8,-1,1); yw+=Math.sin(G.t*5)*.9; }
  d.pull=false; if(d.boost>0) d.boost-=dt; if(d.shield>0) d.shield-=dt; if(d.imm>0) d.imm-=dt; if(d.dcd>0) d.dcd-=dt; if(d.dash>0) d.dash-=dt; if(d.hcd>0) d.hcd-=dt; if(inp.dash&&d.ch===2&&d.dcd<=0&&!d.dead&&d.batt>.05){ d.dash=2; d.dcd=d.boost>0?2:5; d.batt=Math.max(0,d.batt-.05); if(d===me) beep(520,0,.25,'sawtooth',.12); }
  d.yaw-=yw*p.yaw*RAD*(1-.15*wetK)*(d.zoom?(d.zoom===2?.09:.18):1)*dt;
  if(d.dash>0&&d.tgt&&!d.tgt.dead&&!d.dead){ const tx=d.tgt.p.x-d.p.x, ty=d.tgt.p.y-d.p.y, tz=d.tgt.p.z-d.p.z, tl=Math.hypot(tx,ty,tz); let da=Math.atan2(-tx,-tz)-d.yaw; da=Math.atan2(Math.sin(da),Math.cos(da));
    if(tl<35&&tl>.3&&Math.abs(da)<1){ d.pull=true; d.yaw+=clamp(da,-2.8*dt,2.8*dt); const ux=tx/tl, uy=ty/tl, uz=tz/tl, va=d.v.x*ux+d.v.y*uy+d.v.z*uz, kd=Math.min(1,3*dt); d.v.x-=(d.v.x-ux*va)*kd; d.v.y-=(d.v.y-uy*va)*kd; d.v.z-=(d.v.z-uz*va)*kd; d.v.x+=ux*27*dt; d.v.y+=uy*27*dt; d.v.z+=uz*27*dt; } }
  if(d.hook){ const h=d.hook, t=h.tg, tx=t.p.x-d.p.x, ty=t.p.y-d.p.y, tz=t.p.z-d.p.z, tl=Math.hypot(tx,ty,tz); h.t-=dt; h.c=(h.c||0)+dt; let cut=h.t<=0||t.dead||d.dead||tl>36||tl<.4; if(!cut&&h.c>.12){ h.c=0; cut=blocked(d.p,t.p); }
    if(cut){ d.hook=null; if(d===me&&!d.dead&&h.t>0&&tl>3) say('Трос обірвався',1.5); } else { d.pull=true; const ux=tx/tl, uy=ty/tl, uz=tz/tl, va=d.v.x*ux+d.v.y*uy+d.v.z*uz, kd=Math.min(1,5*dt); d.v.x-=(d.v.x-ux*va)*kd; d.v.y-=(d.v.y-uy*va)*kd; d.v.z-=(d.v.z-uz*va)*kd; d.v.x+=ux*40*dt; d.v.y+=uy*40*dt; d.v.z+=uz*40*dt; let da=Math.atan2(-tx,-tz)-d.yaw; da=Math.atan2(Math.sin(da),Math.cos(da)); d.yaw+=clamp(da,-5*dt,5*dt); } }
  const boost=d.dash>0?1.3:1, mt=p.tilt*RAD*boost*(1-.18*wetM), rr=p.rate*RAD*dt, sy=Math.sin(d.yaw), cy=Math.cos(d.yaw); let tp=my*mt, tr=mx*mt;
  if(Math.abs(mx)+Math.abs(my)<.05&&!d.ground&&!d.dead&&!d.hook&&d.dash<=0){ const vf=-d.v.x*sy-d.v.z*cy, vr=d.v.x*cy-d.v.z*sy; tp=clamp(-vf*.13,-mt*.85,mt*.85); tr=clamp(-vr*.13,-mt*.85,mt*.85); }
  if(d.prop<60&&!d.ground){ const wv=(60-d.prop)/60*.15; tp+=Math.sin(G.t*13+d.ch)*wv; tr+=Math.cos(G.t*11+d.ch)*wv; }
  if(d.dead){ d.pitch+=2.5*dt; d.roll+=3.3*dt; } else { d.pitch+=clamp(tp-d.pitch,-rr,rr); d.roll+=clamp(tr-d.roll,-rr,rr); }
  const sp=Math.sin(d.pitch), sr=Math.sin(d.roll); let ux=-sy*sp+cy*sr, uz=-cy*sp-sy*sr, uy=Math.cos(d.pitch)*Math.cos(d.roll); const ul=Math.hypot(ux,uy,uz)||1; ux/=ul; uy/=ul; uz/=ul;
  const sag=d.batt<=0?0:(d.batt<.15?.75+d.batt/.15*.25:1), CEIL=Math.min(p.ceil,TOPY), ceilK=1-(1-1/p.twr)*Math.pow(clamp(d.p.y/CEIL,0,1.25),2);
  let Tmax=d.batt<=0?p.m*GR*.88:p.m*GR*p.twr*ceilK*sag*propK*(1-.1*wetM)*(d.dash>0?1.35:1); if(d.tang>0) Tmax=Math.min(Tmax,p.m*GR*.5);
  const idle=d.ground&&al<=.05&&Math.abs(mx)+Math.abs(my)<.05;
  let T; if(d.dead) T=0; else if(idle) T=p.m*GR*.1; else { const vyC=d.pull?d.v.y:al>0?al*p.vUp*(1-.3*wetM):al*p.vDn, ay=clamp((vyC-d.v.y)*4,-9,14); T=clamp(p.m*(GR+ay)/Math.max(.35,uy),p.m*GR*.1,Tmax); }
  d.T=T; const ge=d.p.y<1.3?1+.16*(1-d.p.y/1.3):1, a=T*ge/p.m;
  const wk=zn?0:clamp(d.p.y/6,.25,1), wx=G.wx*wk, wz=G.wz*wk;
  const rx=d.v.x-wx, ry=d.v.y, rz=d.v.z-wz, rs=Math.hypot(rx,ry,rz), k=.5*RHO*p.cda/p.m*(1+wetK*.25);
  d.v.x+=(ux*a-k*rs*rx)*dt; d.v.y+=(uy*a-GR-k*2.2*rs*ry)*dt; d.v.z+=(uz*a-k*rs*rz)*dt;
  d.corn=cornAt(d.p.x,d.p.y,d.p.z); if(d.corn){ const f=Math.max(0,1-2.6*dt); d.v.x*=f; d.v.z*=f; d.v.y*=Math.max(0,1-1.2*dt); }
  d.p.x+=d.v.x*dt; d.p.y+=d.v.y*dt; d.p.z+=d.v.z*dt; if(d.p.y>TOPY+.3){ d.p.y=TOPY+.3; if(d.v.y>0) d.v.y=0; } d.ground=false; collide(d); if(!d.dead&&(d.local)) hazards(d,dt);
  const fy=W.floorAt(d.p.x,d.p.z)+R0; if(d.p.y<fy){ if(d.v.y<-3.5) bump(d,-d.v.y); d.p.y=fy; if(d.v.y<0) d.v.y=0; d.ground=true; }
  if(d.ground){ const f=Math.max(0,1-((idle||d.dead)?10:2.5)*dt); d.v.x*=f; d.v.z*=f; }
  const L=W.LIM; if(Math.abs(d.p.x)>L) d.v.x-=Math.sign(d.p.x)*12*dt; if(Math.abs(d.p.z)>L) d.v.z-=Math.sign(d.p.z)*12*dt;
  if(!d.dead) d.batt=Math.max(0,d.batt-dt/p.hov*Math.pow(T/(p.m*GR),1.5)*(1+wetK*.2)*(d.bot?.35:1));
  let chg=false; for(const pd of W.pads){ if(Math.hypot(d.p.x-pd.x,d.p.z-pd.z)<1.9&&d.p.y-pd.y<1.6&&d.p.y>=pd.y&&d.v.length()<1.5){ d.batt=Math.min(1,d.batt+dt/9); d.prop=Math.min(100,d.prop+10*dt); chg=true; } } if(d===me) G.chg=chg;
  if(d.cd>0) d.cd-=dt;
  if(G.kind!=='free'&&!d.dead&&d.batt<=0&&d.ground&&(d.local)){ d.dry+=dt; if(d.dry>3){ d.hp=0; if(d===me) say('Заряд скінчився — раунд програно',3); } } else d.dry=0; }

/* ---------- зброя ---------- */
const tA=new THREE.Vector3(), tB=new THREE.Vector3();
const BX=W.cols.map(c=>c.r?[c.x-c.r*.8,c.y0,c.z-c.r*.8,c.x+c.r*.8,c.y1,c.z+c.r*.8]:c);
/* найближчий вхід променя в перешкоду: повертає t у (0, maxT) або maxT */
function rayBox(ox,oy,oz,dx,dy,dz,maxT){ let best=maxT; const ex=ox+dx*maxT, ey=oy+dy*maxT, ez=oz+dz*maxT, ax=ox<ex?ox:ex, bx=ox<ex?ex:ox, ay=oy<ey?oy:ey, by=oy<ey?ey:oy, az=oz<ez?oz:ez, bz=oz<ez?ez:oz;
  for(let i=0;i<BX.length;i++){ const c=BX[i]; if(c[3]<ax||c[0]>bx||c[4]<ay||c[1]>by||c[5]<az||c[2]>bz) continue; let t0=-1e9, t1=1e9, a, b;
    if(dx!==0){ a=(c[0]-ox)/dx; b=(c[3]-ox)/dx; if(a>b){ const q=a; a=b; b=q; } if(a>t0) t0=a; if(b<t1) t1=b; } else if(ox<c[0]||ox>c[3]) continue;
    if(dy!==0){ a=(c[1]-oy)/dy; b=(c[4]-oy)/dy; if(a>b){ const q=a; a=b; b=q; } if(a>t0) t0=a; if(b<t1) t1=b; } else if(oy<c[1]||oy>c[4]) continue;
    if(dz!==0){ a=(c[2]-oz)/dz; b=(c[5]-oz)/dz; if(a>b){ const q=a; a=b; b=q; } if(a>t0) t0=a; if(b<t1) t1=b; } else if(oz<c[2]||oz>c[5]) continue;
    if(t0<=t1&&t0>1e-3&&t0<best) best=t0; } return best; }
function blocked(a,b){ return rayBox(a.x,a.y,a.z,b.x-a.x,b.y-a.y,b.z-a.z,.999)<.999; }
function aimOf(d,tg,out){ const p=DR[d.ch], fx0=-Math.sin(d.yaw), fz0=-Math.cos(d.yaw); out.set(fx0,-Math.sin(d.pitch)*.25,fz0).normalize(); d.lock=false; if(!tg||tg.dead||d.dead||tg.dash>1.1||(d.ch===9&&d.p.distanceTo(tg.p)<16)||(tg.corn&&d.p.distanceTo(tg.p)>12)||((murk(d.p)||murk(tg.p))&&d.p.distanceTo(tg.p)>18)) return out;
  let lead=0; const dist=d.p.distanceTo(tg.p); if(d.ch===1) lead=dist/30; else if(d.ch===3) lead=dist/48; else if(d.ch===2) lead=dist/45;
  tA.copy(tg.p).addScaledVector(tg.v,lead*.9).sub(d.p); const hd=Math.hypot(tA.x,tA.z)||1e-6, dot=(tA.x*fx0+tA.z*fz0)/hd, el=Math.atan2(tA.y,hd);
  if(dist<p.rng*(G.rain>0?.75:1)&&dot>Math.cos((d.ch===2?25:d.ch===4?32:d.ch===9?9:17)*RAD)&&Math.abs(el)<55*RAD&&!blocked(d.p,tg.p)){ d.lock=true; if(d.ch===1||d.ch===3) tA.y+=.5*(d.ch===1?3:6)*lead*lead; out.copy(tA).normalize(); } return out; }
function line(a,b,colr,life){ const g=new THREE.BufferGeometry().setFromPoints([a.clone(),b.clone()]), m=new THREE.Line(g,new THREE.LineBasicMaterial({color:colr,transparent:true})); scene.add(m); fx.push({m:m,t:life,T:life}); }
function boom(p,r,colr){ const m=new THREE.Mesh(new THREE.SphereGeometry(1,10,8),new THREE.MeshBasicMaterial({color:colr,transparent:true,opacity:.8})); m.position.copy(p); m.scale.setScalar(.3); scene.add(m); fx.push({m:m,t:.45,T:.45,grow:r}); }
function applyHit(d,dm,k,by){ d.hp-=dm*(d.shield>0?.4:1); d.lastBy=by; if(k==='net') netHit(d); if(k==='shot') d.prop=Math.max(0,d.prop-dm*.35/DR[d.ch].pt); if(k==='fire'){ d.prop=Math.max(0,d.prop-dm*.6/DR[d.ch].pt); d.burnT=2.5; } if(d===me&&k==='fire'){ G.hitT=.3; if(!(G.burnT>0)){ G.burnT=2; say('Тебе палять вогнеметом!',1.6); beep(120,0,.25,'sawtooth',.1); } return; } if(d===me){ G.hitT=.35; beep(140,0,.18,'square',.14); if(k==='net') say('Тебе обплутало сіткою!',2); if(k==='ram') say('Тебе протаранили!',1.5); if(k==='snipe') say('Тебе підстрелила Бабка!',2); if(k==='hook') say('Тебе зачепили гарпуном!',2); } }
function hurt(tg,dmg,kind,by){ by=by||me; if(!tg||tg.dead) return;
  if(tg.isBase){ dmg=kind==='net'?18:kind==='fire'?dmg*.8:kind==='snipe'?dmg*.5:kind==='shot'?dmg*.5:kind==='ram'?dmg*1.4:dmg*1.2; const en=tg.team!==me.team; if(en) tg.found=true; if(G.kind==='net'&&!G.host) send({t:'bh',b:tg.team,d:Math.round(dmg)},0); else baseDmg(tg,dmg); if(en&&by===me) beep(880,0,.07,'square',.09); boom(tg.p,1.2,0xFFD34D); return; }
  if(tg.ch===3) dmg*=.75; else if(tg.ch===4) dmg*=.7; if(tg.local) applyHit(tg,dmg,kind,by.id); else send({t:'hit',v:tg.id,d:Math.round(dmg),k:kind,by:by.id},tg.bot?0:tg.id);
  if(tg!==me){ if(by===me) beep(880,0,.07,'square',.09); boom(tg.p,.9,0xFFD34D); } }
function fire(d,tg,ghost,dirIn){ const p=DR[d.ch];
  if(d.ch===2){ if(d.dead||d.hcd>0||d.tang>0||d.hook) return false; d.hcd=8*(d.boost>0?.5:1); const dir=dirIn||aimOf(d,tg,new THREE.Vector3()).clone(), o=d.p.clone().addScaledVector(dir,.6);
    if(d.local&&G.kind==='net'&&!ghost) send({t:'f',id:d.id,o:[+o.x.toFixed(2),+o.y.toFixed(2),+o.z.toFixed(2)],d:[+dir.x.toFixed(3),+dir.y.toFixed(3),+dir.z.toFixed(3)]});
    const m=new THREE.Mesh(new THREE.ConeGeometry(.09,.5,6),new THREE.MeshBasicMaterial({color:0xE8E0D0})); m.position.copy(o); m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dir); scene.add(m);
    shots.push({m:m,p:o,v:dir.clone().multiplyScalar(45).addScaledVector(d.v,.2),g:0,net:false,hook:true,own:d,tg:tg,ghost:ghost,o:o.clone(),life:.62}); beep(600,0,.08,'square',d===me?.14:.07); beep(240,.03,.2,'triangle',d===me?.14:.07); return true; }
  if(d.ch===4) return false;
  if(d.dead||d.cd>0||d.tang>0) return false; const B=d.boost>0; d.cd=p.cdn*(B?[.66,.6,1,.57,.6][d.ch]:1); const dir=dirIn||aimOf(d,tg,new THREE.Vector3()).clone(), o=d.p.clone().addScaledVector(dir,.5);
  if(d.local&&G.kind==='net'&&!ghost) send({t:'f',id:d.id,o:[+o.x.toFixed(2),+o.y.toFixed(2),+o.z.toFixed(2)],d:[+dir.x.toFixed(3),+dir.y.toFixed(3),+dir.z.toFixed(3)]});
  if(d.ch===9){ const real=!ghost&&tg&&!tg.dead&&d.lock; let end=ghost&&d._e?d._e:real?d.p.distanceTo(tg.p):sray(o,dir,170); d._e=0; streak(o,dir,end,d===me); d.v.addScaledVector(dir,-1.5); d.aimT=0; if(real) hurt(tg,60*(B?1.25:1),'snipe',d); return true; }
  if(d.ch===0){ beep(210,0,.12,'sawtooth',d===me?.2:.1); beep(90,0,.16,'square',d===me?.14:.07);
    let sum=0; for(let i=0;i<(B?13:8);i++){ const sd=dir.clone(); sd.x+=(Math.random()-.5)*.14; sd.y+=(Math.random()-.5)*.1; sd.z+=(Math.random()-.5)*.14; sd.normalize(); let end=p.rng;
      end=sray(o,sd,p.rng);
      if(!ghost&&tg&&!tg.dead){ tA.copy(tg.p).sub(o); const along=tA.dot(sd); if(along>0&&along<end){ tB.copy(o).addScaledVector(sd,along); if(tB.distanceTo(tg.p)<(tg.r||.7)){ end=along; sum+=3.2*(1-along/p.rng*.65); } } }
      line(o,o.clone().addScaledVector(sd,end),0xFFE9A0,.09); } if(sum>0) hurt(tg,sum,'shot',d); }
  else { const net=d.ch===1, m=new THREE.Mesh(net?new THREE.IcosahedronGeometry(1.3,1):new THREE.SphereGeometry(.22,8,6),new THREE.MeshBasicMaterial({color:net?(B?0xFFD34D:0xffffff):(B?0xC9503A:0x22292C),wireframe:net})); m.position.copy(o); if(B) m.scale.setScalar(1.6); scene.add(m);
    shots.push({m:m,p:o,v:dir.clone().multiplyScalar(net?30:48).addScaledVector(d.v,.3),g:net?3:6,net:net,own:d,tg:tg,ghost:ghost,big:B,o:o.clone(),life:net?1.6:2.2});
    if(net) beep(320,0,.22,'triangle',d===me?.14:.07); else { beep(70,0,.35,'sawtooth',d===me?.3:.16); beep(45,.02,.4,'square',d===me?.2:.1); d.v.addScaledVector(dir,-2.6); } }
  return true; }
function stepShots(dt){ for(let i=shots.length-1;i>=0;i--){ const s=shots[i]; s.life-=dt; s.v.y-=s.g*dt; s.p.addScaledVector(s.v,dt); s.m.position.copy(s.p); if(s.net) s.m.rotation.y+=6*dt;
    if(s.hook){ const tg=s.tg, ow=s.own; line(ow.p,s.p,0x22292C,.05); let end=s.life<=0||W.inside(s.p.x,s.p.y,s.p.z,0)||s.p.y<W.floorAt(s.p.x,s.p.z)+.1;
      if(!end&&tg&&!tg.dead&&s.p.distanceTo(tg.p)<1.15+(tg.r?tg.r-.4:0)){ end=true; if(!s.ghost&&!ow.dead){ hurt(tg,3,'hook',ow); ow.hook={tg:tg,t:2.4,c:0}; if(ow===me){ say('Зачепив! Тягне до цілі',1.6); beep(900,0,.07,'square',.14); } } }
      if(end){ scene.remove(s.m); shots.splice(i,1); } continue; }
    let done=s.life<=0, hitW=false; const tg=s.tg;
    if(!done&&tg&&!tg.dead&&s.p.distanceTo(tg.p)<(s.net?(s.big?2.8:1.75):.95)+(tg.r?tg.r-.4:0)){ done=true; const dud=!s.net&&s.p.distanceTo(s.o)<6; if(!s.ghost) hurt(tg,s.net?(s.big?30:22):dud?22:(s.big?44:36),s.net?'net':'shell',s.own); if(!s.net) boom(s.p,dud?1:3,0xFF8A3D); }
    if(!done&&(W.inside(s.p.x,s.p.y,s.p.z,0)||s.p.y<W.floorAt(s.p.x,s.p.z)+.1)){ done=true; hitW=true; }
    if(done){ if(!s.net&&(hitW||s.life<=0)&&s.p.distanceTo(s.o)>=6){ boom(s.p,4.2,0xFF8A3D); beep(60,0,.4,'sawtooth',.18); if(!s.ghost&&tg&&!tg.dead){ const dd=s.p.distanceTo(tg.p); if(dd<4.5&&!blocked(s.p,tg.p)) hurt(tg,24*(1-dd/4.5),'shell',s.own); } }
      scene.remove(s.m); shots.splice(i,1); } }
  for(let i=fx.length-1;i>=0;i--){ const f=fx[i]; if(f.sn){ const q=f.sn; q.s+=900*dt; const a=Math.max(0,q.s-22), b=Math.min(q.len,q.s), at=f.m.geometry.attributes.position; at.setXYZ(0,q.o.x+q.dir.x*a,q.o.y+q.dir.y*a,q.o.z+q.dir.z*a); at.setXYZ(1,q.o.x+q.dir.x*b,q.o.y+q.dir.y*b,q.o.z+q.dir.z*b); at.needsUpdate=true; if(a>=q.len){ scene.remove(f.m); fx.splice(i,1); } continue; }
    f.t-=dt; f.m.material.opacity=Math.max(0,f.t/f.T); if(f.grow) f.m.scale.setScalar(.3+f.grow*(1-f.t/f.T)); if(f.t<=0){ scene.remove(f.m); fx.splice(i,1); } } }
/* снайпер: напрям прицілу, промінь до перешкоди, влучання, швидкий слід пострілу */
function aimDir(d,out){ const ce=Math.cos(d.el); return out.set(-Math.sin(d.yaw)*ce,Math.sin(d.el),-Math.cos(d.yaw)*ce); }
function sray(o,dir,max){ let t=rayBox(o.x,o.y,o.z,dir.x,dir.y,dir.z,max); if(dir.y<0){ let tg=-o.y/dir.y; if(tg>0&&tg<t){ if(W.floorAt(o.x+dir.x*tg,o.z+dir.z*tg)<0) tg=(-3.2-o.y)/dir.y; if(tg<t) t=tg; } } return t; }
function srayHit(d,o,dir,end){ let best=null, bd=end; const test=(t,r)=>{ tA.copy(t.p).sub(o); const al=tA.dot(dir); if(al<1||al>bd) return; const off=Math.sqrt(Math.max(0,tA.lengthSq()-al*al)); if(off<r+al*.004){ bd=al; best=t; } };
  for(const e of D) if(e.side!==d.side&&!e.dead) test(e,.7); if(G.rule==='base'){ const b=BASE[1-d.team]; if(b&&!b.dead) test(b,1.4); } return best?{t:best,d:bd}:null; }
function streak(o,dir,len,mine){ const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.BufferAttribute(new Float32Array(6),3)); const m=new THREE.Line(g,new THREE.LineBasicMaterial({color:0xFFF2E0})); m.frustumCulled=false; scene.add(m); fx.push({m:m,t:1,T:1,sn:{o:o.clone(),dir:dir.clone(),len:len,s:0}});
  line(o,o.clone().addScaledVector(dir,len),0xFF3030,.45); beep(1500,0,.05,'square',mine?.2:.1); beep(170,.01,.32,'sawtooth',mine?.22:.12); }
function snipe(d){ const B=d.boost>0, dir=aimDir(d,new THREE.Vector3()), o=d.p.clone().addScaledVector(dir,.6); d.cd=DR[4].cdn*(B?.6:1); let end=sray(o,dir,170); const h=srayHit(d,o,dir,end); if(h) end=h.d;
  if(G.kind==='net') send({t:'f',id:d.id,o:[+o.x.toFixed(2),+o.y.toFixed(2),+o.z.toFixed(2)],d:[+dir.x.toFixed(4),+dir.y.toFixed(4),+dir.z.toFixed(4)],e:+end.toFixed(1)});
  streak(o,dir,end,true); d.v.addScaledVector(dir,-1.5); if(h){ hurt(h.t,60*(B?1.25:1),'snipe',d); say('Влучив!',1.2); } }
function scopeApply(){ const z=me.ch===9?me.zoom:0, f=[70,17,8.5][z]; if(cam.fov!==f){ cam.fov=f; cam.updateProjectionMatrix(); } if(me.mesh&&!me.dead) me.mesh.visible=!z; }
function scopeToggle(){ if(G.mode!=='play'||me.ch!==9||me.dead||me.tang>0) return; if(!me.zoom) me.el=0; me.zoom=(me.zoom+1)%3; scopeApply(); beep(me.zoom?900:500,0,.05,'square',.08); }
function scopeOff(){ if(me.zoom){ me.zoom=0; } scopeApply(); }
function ramOf(a,b){ tA.copy(b.p).sub(a.p); const br=b.r||0, dist=tA.length(); if(dist>2.3+br||dist<1e-4) return 0; tA.multiplyScalar(1/dist); const fxx=-Math.sin(a.yaw), fzz=-Math.cos(a.yaw);
  const vr=(a.v.x-b.v.x)*tA.x+(a.v.y-b.v.y)*tA.y+(a.v.z-b.v.z)*tA.z, fdot=fxx*tA.x+fzz*tA.z, tip=Math.hypot(a.p.x+fxx*.85-b.p.x,a.p.y-b.p.y,a.p.z+fzz*.85-b.p.z);
  const hx=b.p.x-a.p.x, hz=b.p.z-a.p.z, hd=Math.hypot(hx,hz), front=hd<.8||(fxx*hx+fzz*hz)/hd>.1, hit=a.ch===2&&a.cd<=0&&a.tang<=0&&vr>4&&front&&(tip<1.35+br||dist<1.5+br); if(hit) a.hook=null; return hit?Math.min(a.boost>0?52:38,vr*5*(a.boost>0?1.4:1)*Math.sqrt(1.6/(b.isBase?3.2:DR[b.ch].m))):0; }
function myB(){ return BASE[me.team]; }
function enB(){ return BASE[1-me.team]; }
function ramBase(){ const b=enB(); if(G.rule!=='base'||!b||b.dead||me.dead||me.ch!==2) return; const dmg=ramOf(me,b); if(dmg>0){ me.cd=2.5; hurt(b,dmg,'ram'); say('Таран!',1); me.v.multiplyScalar(-.4); } }
function ramCheck(){ if(me.dead) return; for(const o of D){ if(o===me||o.dead) continue; const en=o.side!==me.side, dmg=en?ramOf(me,o):0; if(dmg>0){ me.cd=2.5; hurt(o,dmg,'ram'); say('Таран!',1); }
    tA.copy(o.p).sub(me.p); const dist=tA.length(); if((dist>1.15&&!dmg)||dist<1e-4) continue; tA.multiplyScalar(1/dist);
    const vr=(me.v.x-o.v.x)*tA.x+(me.v.y-o.v.y)*tA.y+(me.v.z-o.v.z)*tA.z;
    if(vr>0){ if(en&&!dmg&&vr>6&&me.cd<=0&&me.ch!==2){ me.cd=.8; hurt(o,6,'bump'); } me.v.addScaledVector(tA,-vr*1.2); if(o.bot&&o.local) o.v.addScaledVector(tA,vr*.8); }
    if(dist<1.15) me.p.addScaledVector(tA,-(1.15-dist)); } }
function botRam(bot){ if(bot.dead) return; const eb=G.rule==='base'?BASE[1-bot.team]:null; if(eb&&!eb.dead&&bot.ch===2){ const d0=ramOf(bot,eb); if(d0>0){ bot.cd=2.5; hurt(eb,d0,'ram',bot); bot.v.multiplyScalar(-.4); } }
  for(const e of D){ if(e.side===bot.side||e.dead) continue; const dmg=ramOf(bot,e); if(dmg>0){ bot.cd=2.5; hurt(e,dmg,'ram',bot); bot.v.multiplyScalar(-.4); break; } } }
function botTarget(d){ let best=null, bd=1e12; for(const e of D){ if(e.side===d.side||e.dead) continue; const q=e.p.distanceToSquared(d.p); if(q<bd){ bd=q; best=e; } } const eb=G.rule==='base'?BASE[1-d.team]:null; if(eb&&!eb.dead&&(!best||bd>55*55)) return eb; return best; }

/* ---------- комп'ютер ---------- */
const botS=[{t:0,ty:20,err:0,sd:1,st:0,los:true,wall:false,stuck:0,esc:0},{t:0,ty:20,err:0,sd:-1,st:0,los:true,wall:false,stuck:0,esc:0}];
function botThink(d,tg,bs,dt){ const p=DR[d.ch], inp=d.inp; if(d.dead||!tg||tg.dead){ inp.mx=inp.my=inp.yaw=0; inp.alt=d.dead?0:.2; inp.fire=inp.dash=false; d.lockT=0; return; }
  tA.copy(tg.p).sub(d.p); const hd=Math.hypot(tA.x,tA.z), want=[7,15,0,28,4][d.ch]; bs.t-=dt; bs.st-=dt; if(bs.st<=0){ bs.st=2+Math.random()*3; bs.sd=-bs.sd; }
  if(bs.t<=0){ bs.t=.25; bs.err=(Math.random()-.5)*(1-G.botSkill)*.9; bs.ty=hd>45?Math.max(tg.p.y+4,24):Math.min(tg.p.y+[1,3,0,5,1][d.ch],Math.max(22,tg.p.y)); if(tg.indoor&&hd<40) bs.ty=Math.max(tg.p.y,d.ch===3?14:10);
    bs.los=!blocked(d.p,tg.p); if(!bs.los&&!(tg.indoor&&hd<14)) bs.ty=Math.max(bs.ty,27); const fx0=-Math.sin(d.yaw), fz0=-Math.cos(d.yaw); bs.wall=false; for(let q=2;q<=8;q+=2) if(W.inside(d.p.x+fx0*q,d.p.y,d.p.z+fz0*q,.5)){ bs.wall=true; break; }
    if(hd>want+6&&Math.hypot(d.v.x,d.v.z)<1.2){ bs.stuck+=.25; if(bs.stuck>1.2){ bs.esc=1.6; bs.sd=-bs.sd; bs.stuck=0; } } else bs.stuck=0; }
  if(bs.esc>0) bs.esc-=dt;
  let da=Math.atan2(-tA.x,-tA.z)+bs.err-d.yaw; da=Math.atan2(Math.sin(da),Math.cos(da)); inp.yaw=clamp(-da*2.2,-1,1);
  const fwd=Math.abs(da)<.9?clamp((hd-want)/8,-1,1):0; inp.my=fwd*(d.ch===2?1:.85); inp.mx=d.ch===2?(hd>11?Math.sin(G.t*2.6)*.75:0):(hd<want*2.2?bs.sd*[.8,.65,0,.4,.5][d.ch]:Math.sin(G.t*.7+d.ch)*.3); inp.alt=clamp((Math.min(bs.ty,p.ceil*.9)-d.p.y)*.5,-1,1);
  if(bs.wall){ inp.alt=1; inp.my=Math.min(inp.my,.15); } if(bs.esc>0){ inp.mx=bs.sd; inp.my=-.5; inp.alt=1; }
  if(d.batt<.2) inp.my*=.4; inp.dash=d.ch===2&&hd<30&&Math.abs(da)<.5&&!d.hook;
  aimOf(d,tg,tB); if(d.ch===9&&d.lock&&d.cd<=0){ inp.mx=0; inp.my=0; } d.lockT=d.lock&&(d.ch!==9||(d.cd<=0&&d.v.length()<5))?d.lockT+dt:0; inp.fire=d.lockT>(d.ch===9?1:.25)+(1-G.botSkill)*.7; if(d.ch===4){ tA.copy(tg.p).sub(d.p); const hd2=Math.hypot(tA.x,tA.z); let a2=Math.atan2(-tA.x,-tA.z)-d.yaw; a2=Math.atan2(Math.sin(a2),Math.cos(a2)); d.flameWant=tA.length()<10&&Math.abs(a2)<.6&&Math.abs(tA.y)<hd2*.8+1.5; } if(d.ch===9){ d.aimT=d.lockT; d.aimId=tg.isBase?100+tg.team:tg.id; }
  if(inp.fire&&(d.ch===2?d.hcd:d.cd)<=0&&G.phase==='fight'){ const e=(1-G.botSkill)*.09; tB.x+=(Math.random()-.5)*e; tB.y+=(Math.random()-.5)*e; tB.z+=(Math.random()-.5)*e; fire(d,tg,false,tB.clone().normalize()); if(d.ch===9) d.lockT=0; } }

/* ---------- етап 4: режими, база, прапор, артефакти, шум ---------- */
const RULES={duel:{n:'Дуель',d:'Збий суперників. Раунд за тим, хто лишився в повітрі. До 3 раундів.'},base:{n:'База',d:'Знайди базу суперника і знищ її. Свою бережи: поки ти далеко, її б\'ють.'},flag:{n:'Прапор',d:'Прапор схований і щохвилини міняє місце. Видно лише відстань до нього. До 5 прапорів.'}};
let myRule='duel'; try{ const v=localStorage.getItem('pz_dr_rule'); if(RULES[v]) myRule=v; }catch(e){}
(function(){ const st=document.createElement('style'); st.textContent='.chars{grid-template-columns:repeat(3,1fr)}@media (min-width:980px){.chars{grid-template-columns:repeat(5,1fr)}}@media (max-width:620px){.chars{grid-template-columns:repeat(3,1fr)}.chars .stats{display:none}.chars button{padding:6px 5px}}.selst{display:none;width:100%;max-width:300px;margin:6px auto 0;font-size:.72rem;text-align:left}@media (max-width:620px){.selst{display:grid}}.rules{display:flex;gap:6px;justify-content:center;flex-wrap:wrap;margin:6px 0 0}.rules button{font:inherit;font-weight:700;font-size:.8rem;padding:6px 14px;border-radius:999px;border:1.5px solid rgba(255,255,255,.35);background:transparent;color:#fff;cursor:pointer}.rules button.on{background:#C9A961;border-color:#C9A961;color:#1b2429}.rd{margin:.35rem 0 .2rem;font-size:.8rem;opacity:.85}'; document.head.appendChild(st); })();
const BSP=[[[-88,44,0],[-84,-34,0],[-30,50,0],[-66,14,0],[-41,-7.5,-3.2],[-21.5,-12,3.5]],[[84,-62,0],[40,-72,0],[96,14,0],[82,36,0],[75.5,-16,0],[75,-13,4.3]]].map(l=>l.filter(q=>!W.inside(q[0],q[2]+1.4,q[1],1.3)));
const BASE=[null,null];
function mkBase(team,x,z,y){ y=y||0; const g=new THREE.Group(), c=TEAMC[team]; const body=new THREE.Mesh(new THREE.BoxGeometry(1.9,1.2,1.9),new THREE.MeshLambertMaterial({color:0x4A5560})); body.position.y=.6; g.add(body);
  const top=new THREE.Mesh(new THREE.BoxGeometry(2.1,.12,2.1),new THREE.MeshLambertMaterial({color:c})); top.position.y=1.26; g.add(top); const mast=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,3,6),new THREE.MeshLambertMaterial({color:0x22292C})); mast.position.y=2.8; g.add(mast);
  const lamp=new THREE.Mesh(new THREE.SphereGeometry(.3,10,8),new THREE.MeshBasicMaterial({color:c})); lamp.position.y=y?2.3:4.4; if(y){ mast.scale.y=.3; mast.position.y=1.75; } g.add(lamp); g.position.set(x,y,z); scene.add(g);
  return {isBase:true,team:team,side:team,y0:y,p:new THREE.Vector3(x,y+.8,z),v:new THREE.Vector3(),hp:300,dead:false,ch:-1,dash:0,tang:0,r:1.3,mesh:g,found:false,corn:false,local:false}; }
function clearBases(){ for(let i=0;i<2;i++) if(BASE[i]){ scene.remove(BASE[i].mesh); BASE[i]=null; } }
function baseAlert(){ if(G.baseHit<=0){ say('Твою базу атакують!',2.5); beep(300,0,.3,'square',.14); } G.baseHit=4; }
function baseDmg(b,dmg){ b.hp-=dmg; if(b.team===me.team) baseAlert(); }
function baseDown(t){ const b=BASE[t]; if(!b||b.dead) return; b.dead=true; b.mesh.visible=false; boom(b.p,6,0xFF8A3D); }
const FSP=W.marks.filter(m=>m[1]<=30), flagM=new THREE.Group(), FL={i:-1,n:0,t:0,req:-1};
(function(){ const pole=new THREE.Mesh(new THREE.CylinderGeometry(.04,.04,1.8,6),new THREE.MeshLambertMaterial({color:0xF2F4F4})); pole.position.y=.2; flagM.add(pole); const cl=new THREE.Mesh(new THREE.PlaneGeometry(.9,.55),new THREE.MeshBasicMaterial({color:0xE53935,side:THREE.DoubleSide})); cl.position.set(.47,.8,0); flagM.add(cl); flagM.visible=false; scene.add(flagM); })();
function flagPut(i,n){ FL.i=i; FL.n=n; FL.t=60; const m=FSP[i]; flagM.position.set(m[0],m[1]-.5,m[2]); flagM.visible=true; }
function flagNext(by){ let i; do{ i=Math.floor(Math.random()*FSP.length); }while(i===FL.i); flagPut(i,FL.n+1); send({t:'flag',i:i,n:FL.n,sc:G.sc,by:by}); }
const PSP=[[0,3,0],[-30,6,10],[30,5,12],[22,8,-22],[58,7.6,-2],[-51,7.2,27],[40,14.2,36],[45,10,-53],[-10,22.5,30],[-64,11.2,-7],[0,4,-120],[125,4,0],[-125,4,0],[0,4,112],[10,4.5,50],[-30,12,-64],[68,5,32],[-36,-2,-18],[-27,1.6,-7.5],[-39,5,-19],[-31,8.4,-10],[88.7,2.2,-12],[75,6,-10],[45,2.9,-53],[36,2,36],[-46.5,2.2,27.5],[-61,4.8,-4.5],[-60,3,-34],[58,3,-14]].filter(q=>!W.inside(q[0],q[1],q[2],.9));
const PKT={w:{c:0xFFD34D,n:'Посилена зброя на 12 с'},h:{c:0x8FD08A,n:'Ремкомплект: +40 здоров\'я і гвинти'},b:{c:0x35C6D8,n:'Батарея: повний заряд'},s:{c:0xB58CFF,n:'Щит на 10 с'}};
const PK=[]; let pkT=8, pkId=0;
function pkAdd(id,k,i){ const q=PSP[i]; if(!q||!PKT[k]||PK.some(x=>x.id===id)) return; const g=new THREE.Group(); g.add(new THREE.Mesh(new THREE.OctahedronGeometry(.6,0),new THREE.MeshBasicMaterial({color:PKT[k].c}))); const beam=new THREE.Mesh(new THREE.CylinderGeometry(.12,.12,16,6,1,true),new THREE.MeshBasicMaterial({color:PKT[k].c,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false})); beam.position.y=8; g.add(beam); g.position.set(q[0],q[1],q[2]); scene.add(g); PK.push({id:id,k:k,i:i,t:25,m:g,p:new THREE.Vector3(q[0],q[1],q[2]),req:false}); }
function pkDel(pk){ scene.remove(pk.m); const i=PK.indexOf(pk); if(i>=0) PK.splice(i,1); }
function pkClear(){ while(PK.length) pkDel(PK[0]); pkT=8; }
function pkApply(d,k){ if(k==='w') d.boost=12; else if(k==='h'){ d.hp=Math.min(100,d.hp+40); d.prop=Math.min(100,d.prop+50); } else if(k==='b') d.batt=1; else if(k==='s') d.shield=10; if(d===me){ say(PKT[k].n,2.5); beep(660,0,.1,'triangle',.16); beep(990,.09,.16,'triangle',.16); } }
function pkTake(pk,d){ if(G.kind==='net') send({t:'pt',id:pk.id,by:d.id}); if(d.local) pkApply(d,pk.k); if(d!==me) say((d.side===me.side?'Напарник':'Суперник')+' підібрав: '+PKT[pk.k].n,2); pkDel(pk); }
function pkStep(dt){ const au=auth();
  if(au){ pkT-=dt; if(pkT<=0&&PK.length<3&&PSP.length){ pkT=9+Math.random()*8; let i,n=0; do{ i=Math.floor(Math.random()*PSP.length); }while(PK.some(q=>q.i===i)&&++n<20); const r=Math.random(), k=r<.36?'w':r<.66?'h':r<.84?'b':'s'; pkAdd(++pkId,k,i); send({t:'pk',id:pkId,k:k,i:i}); } }
  for(let j=PK.length-1;j>=0;j--){ const pk=PK[j]; pk.t-=dt; pk.m.children[0].rotation.y+=2.5*dt; pk.m.visible=pk.t>4||Math.floor(pk.t*5)%2===0; if(pk.t<=0){ if(au||pk.t<-3) pkDel(pk); continue; }
    for(const d of D){ if(!d.local||d.dead||d.p.distanceTo(pk.p)>=1.9) continue; if(au){ pkTake(pk,d); break; } else if(d===me&&!pk.req){ pk.req=true; send({t:'pg',id:pk.id},0); } } } }
function hearR(d){ const p=DR[d.ch]; return (18+115*p.loud*Math.min(1.25,Math.sqrt(Math.max(.04,d.T/(p.m*GR)))))*(G.rain>0?.5:1); }
function detect(dt){ G.detT-=dt; if(G.detT>0) return; G.detT=.25; for(const e of D){ if(e===me) continue; if(e.side===me.side){ e.det=2; continue; } if(e.dead){ e.det=0; continue; } if(!e.local) e.corn=cornAt(e.p.x,e.p.y,e.p.z);
    const dist=me.p.distanceTo(e.p), seen=dist<150&&!(e.corn&&dist>12)&&!((murk(me.p)||murk(e.p))&&dist>20)&&!blocked(me.p,e.p), heard=dist<hearR(e); e.det=seen?2:heard?1:0; if(e.det) e.ls=[e.p.x,e.p.z,G.t]; } }
function scoreLine(){ if(G.kind==='bot') return 'Ти '+G.sc[me.side]+' : '+G.sc[1-me.side]+' комп\'ютер'; if(G.fmt==='teams') return (me.team===0?'<u>'+TEAMN[0]+'</u>':TEAMN[0])+' '+G.sc[0]+' : '+G.sc[1]+' '+(me.team===1?'<u>'+TEAMN[1]+'</u>':TEAMN[1]); return D.map(d=>(d===me?'<u>Ти</u>':label(d))+' '+G.sc[d.side]).join(' · '); }
function finish(w){ if(G.phase==='end') return; G.win=w===me.side; G.phase='end'; G.phT=2.5; say(G.win?'Перемога!':'Поразка',3); if(G.win) [523,659,784,1047].forEach((f,i)=>beep(f,i*.12,.22,'triangle',.16)); else beep(200,0,.7,'sawtooth',.2); }
function over(w){ if(G.phase==='end') return; if(G.kind==='net') send({t:'over',w:w,sc:G.sc}); finish(w); }
function endTick(dt){ G.phT-=dt; if(G.phT>0) return; G.res=(G.win?'Перемога! ':'Поразка. ')+(G.rule==='base'?(G.win?'Базу суперника знищено':'Твою базу знищено'):scoreLine().replace(/<\/?u>/g,'')); if(G.kind==='net'){ G.mode='room'; if(isHost){ R.playing=false; roomCast(); } } else G.mode='over'; ui(); }
function die(d){ d.dead=true; if(G.kind==='net') send({t:'dead',id:d.id,by:d.lastBy}); if(d===me){ say('Тебе збито',3); beep(200,0,.6,'sawtooth',.2); } else if(d.side===me.side){ say('Напарника збито',2.5); } else { say('Суперника збито!',2.5); [523,659,784].forEach((f,i)=>beep(f,i*.12,.2,'triangle',.16)); } }
function roundEnd(w){ G.phase='down'; G.phT=3.6; say(w<0?'Раунд нічийний':w===me.side?'Раунд твій!':'Раунд програно',3); }
function newRound(){ respawnAll(); say('Раунд '+(G.sc.reduce((a,b)=>a+b,0)+1),2); }
function sidesIn(){ const s=new Set(); for(const d of D) s.add(d.side); return s; }
function duelRules(dt){ if(G.phase==='end'){ endTick(dt); return; }
  for(const d of D) if(d.local&&d.hp<=0&&!d.dead) die(d);
  if(G.phase==='fight'){ if(!auth()) return; const all=sidesIn(); if(all.size<2){ over(all.size?all.values().next().value:me.side); return; }
    const alive=new Set(); for(const d of D) if(!d.dead) alive.add(d.side); if(alive.size<=1){ const w=alive.size?alive.values().next().value:-1; if(w>=0) G.sc[w]++; send({t:'rnd',w:w,sc:G.sc}); roundEnd(w); } }
  else if(G.phase==='down'){ G.phT-=dt; if(G.phT<=0&&auth()){ let best=-1,bs=0; G.sc.forEach((v,i)=>{ if(v>bs){ bs=v; best=i; } }); if(bs>=WIN) over(best); else { send({t:'nr'}); newRound(); } } } }
function contRules(dt){ if(G.phase==='end'){ endTick(dt); return; }
  for(const d of D){ if(!d.local) continue; if(d.hp<=0&&!d.dead){ d.dead=true; d.rT=4; if(G.kind==='net') send({t:'dead',id:d.id,by:d.lastBy}); if(d===me){ say('Тебе збито. Повернешся за 4 с',3.5); beep(200,0,.6,'sawtooth',.2); if(G.kind==='bot'&&G.rule==='flag'&&foe) G.sc[foe.side]++; } else if(d.side===me.side){ say('Напарника збито',2.5); } else { say('Суперника збито!',2.5); [523,659,784].forEach((f,i)=>beep(f,i*.12,.2,'triangle',.16)); } }
    if(d.dead){ d.rT-=dt; if(d.rT<=0){ spawn(d,spawnOf(d)); if(d===me) G.camYaw=me.yaw; } } }
  if(G.baseHit>0) G.baseHit-=dt;
  if(auth()&&G.kind==='net'){ const all=sidesIn(); if(all.size<2){ over(all.size?all.values().next().value:me.side); return; } }
  if(G.rule==='base'){ if(auth()) for(let t=0;t<2;t++){ const b=BASE[t]; if(b&&b.hp<=0&&!b.dead){ baseDown(t); over(1-t); return; } }
    const b1=enB(); G.scanT-=dt; if(G.scanT<=0&&b1){ G.scanT=.3; if(!b1.found&&!me.dead&&me.p.distanceTo(b1.p)<45&&!blocked(me.p,b1.p)){ b1.found=true; say('Базу суперника знайдено!',3); beep(784,0,.12,'triangle',.16); beep(1047,.1,.18,'triangle',.16); } } }
  if(G.rule==='flag'){ if(auth()){ FL.t-=dt; if(FL.t<=0){ say('Прапор перенесли',2); flagNext(-1); } }
    if(FL.i>=0&&!me.dead&&me.p.distanceTo(flagM.position)<1.9){ if(auth()){ G.sc[me.side]++; say('Прапор твій!',2.5); beep(784,0,.12,'triangle',.16); beep(1047,.1,.18,'triangle',.16); flagNext(me.id); } else if(FL.req!==FL.n){ FL.req=FL.n; send({t:'cap',n:FL.n},0); } }
    flagM.rotation.y=G.t*1.5;
    if(auth()){ const w=G.sc.findIndex(v=>v>=5); if(w>=0) over(w); } } }

/* ---------- етап 5: птахи, хмари, туман ---------- */
function Tc(){ return G.t+G.ctOff; }
const BK={crow:{c:0x1E2326,s:.55,r:.42,d:18,n:'Ворона'},pigeon:{c:0x9AA7AE,s:.36,r:.32,d:12,n:'Голуб'},swallow:{c:0x2B3338,s:.26,r:.26,d:8,n:'Ластівка'},stork:{c:0xF2EFE8,s:1.15,r:.75,d:35,n:'Лелека'},sparrow:{c:0x8A6A44,s:.22,r:.24,d:7,n:'Горобець'},bat:{c:0x3A2B22,s:.28,r:.26,d:8,n:'Кажан'}};
const BIRDS=[];
function flock(kind,n,c,rx,rz,v,gap,w){ const R=(rx+rz)/2, ph=Math.random()*6.28; for(let k=0;k<n;k++) BIRDS.push({k:BK[kind],c:c,rx:rx,rz:rz,w:v/R,ph:ph-k*(gap||1.2)/R*Math.sign(v),lat:((k%3)-1)*(w||0),up:((k*7)%3-1)*.35,i:k,hid:0,p:new THREE.Vector3(),yaw:0}); }
flock('crow',1,[0,15,-5],62,55,7); flock('crow',1,[10,20,0],120,100,-6.5); flock('crow',1,[-62,13,40],26,20,6);
flock('stork',1,[0,36,0],115,105,5); flock('stork',1,[30,31,-20],80,90,-4.5);
flock('swallow',1,[0,4.5,18],40,9,12); flock('swallow',1,[20,4.2,-12],28,9,-11); flock('swallow',1,[-26,3.6,46],15,7,10.5);
flock('pigeon',7,[-50,27,-50],24,14,8,1.4,1.2); flock('pigeon',6,[45,3.3,-53],20,1.5,5.5,1.3,.45); flock('pigeon',5,[40,6.9,36],7.5,4,4.5,1.1,.4); flock('pigeon',6,[41,9,-35],22,8,7,1.3,1);
flock('sparrow',8,[82,6.6,-12],6.5,9.5,5,1.1,.5); flock('bat',5,[-30,7.9,-14],11,1.5,4,1.2,.3);
flock('sparrow',8,[0,7,95],150,20,10,1.2,1.5); flock('sparrow',7,[-20,9,-105],120,17,-9.5,1.2,1.4);
const birdG=new THREE.BufferGeometry(); birdG.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.55, .14,0,.35, -.14,0,.35,  0,0,-.2, 1,.45,.1, 0,0,.25,  0,0,-.2, 0,0,.25, -1,.45,.1],3)); birdG.computeVertexNormals();
const birdM=new THREE.InstancedMesh(birdG,new THREE.MeshBasicMaterial({side:THREE.DoubleSide}),BIRDS.length); birdM.frustumCulled=false; scene.add(birdM);
(function(){ const c=new THREE.Color(); BIRDS.forEach((b,i)=>{ birdM.setColorAt(i,c.set(b.k.c)); }); if(birdM.instanceColor) birdM.instanceColor.needsUpdate=true; })();
const bM4=new THREE.Matrix4(), bQ=new THREE.Quaternion(), bS=new THREE.Vector3(), bUp=new THREE.Vector3(0,1,0);
function birdHit(d,b){ const pt=DR[d.ch].pt; d.prop=Math.max(0,d.prop-b.k.d/pt); d.v.multiplyScalar(.7); if(G.kind!=='free') d.hp-=b.k.d*.4; b.hid=25; if(d===me){ G.hits++; G.hitT=.3; say(b.k.n+'! Бережи гвинти',2); beep(700,0,.06,'square',.12); beep(160,.04,.2,'sawtooth',.14); } }
function birdPos(){ const t=Tc(); for(const b of BIRDS){ const a=t*b.w+b.ph, ca=Math.cos(a), sa=Math.sin(a), k=Math.min(1,b.rz/b.rx); b.p.set(b.c[0]+(b.rx+b.lat)*ca,b.c[1]+b.up+.5*Math.sin(a*2+b.i),b.c[2]+(b.rz+b.lat*k)*sa); const sg=Math.sign(b.w); b.yaw=Math.atan2(b.rx*sa*sg,-b.rz*ca*sg); } }
function birdStep(dt){ birdPos(); cloudPos(); for(const b of BIRDS){
    if(b.hid>0){ b.hid-=dt; continue; }
    for(const d of D){ if(d.local&&!d.dead&&Math.abs(d.p.x-b.p.x)<1.4&&Math.abs(d.p.z-b.p.z)<1.4&&d.p.distanceTo(b.p)<b.k.r+.45){ birdHit(d,b); break; } } } }
function birdDraw(){ const t=Tc(); for(let i=0;i<BIRDS.length;i++){ const b=BIRDS[i], s=b.hid>0?0:b.k.s; bQ.setFromAxisAngle(bUp,b.yaw); bS.set(s,s*Math.sin(t*(b.k.s>1?5:14)+i),s); bM4.compose(b.p,bQ,bS); birdM.setMatrixAt(i,bM4); } birdM.instanceMatrix.needsUpdate=true; }
const CLD=[], MURK=new THREE.Color(0xDDE3E6); let murkK=0;
(function(){ const base=new THREE.IcosahedronGeometry(1,1).toNonIndexed(), bp=base.attributes.position; const defs=[[-120,26,-60,0],[40,24,90,2.1],[150,42,-10,4],[-30,44,160,1],[-190,30,120,3.3],[90,27,-150,5.2]];
  for(const df of defs){ const pos=[]; for(let j=0;j<5;j++){ const ox=(j-2)*8+Math.sin(j*2.3)*3, oz=Math.cos(j*1.7)*7, sx=9+((j*5)%4)*1.6, sy=4+(j%2)*1.4; for(let i=0;i<bp.count;i++) pos.push(bp.getX(i)*sx+ox,bp.getY(i)*sy,bp.getZ(i)*sx+oz); }
    const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(pos,3)); g.computeVertexNormals(); const m=new THREE.Mesh(g,new THREE.MeshLambertMaterial({color:0xffffff,flatShading:true,side:THREE.DoubleSide})); scene.add(m); CLD.push({x0:df[0],y0:df[1],z0:df[2],ph:df[3],m:m,p:new THREE.Vector3()}); } })();
const fogM=new THREE.Mesh(new THREE.CylinderGeometry(1,1,1,28,1,false),new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.2,side:THREE.DoubleSide,depthWrite:false})); fogM.visible=false; scene.add(fogM);
function wrap(v){ return ((v+230)%460+460)%460-230; }
function cloudPos(){ const t=Tc(); for(const c of CLD) c.p.set(wrap(c.x0+2.2*t),c.y0+(c.y0<32?8:5)*Math.sin(t*.045+c.ph),wrap(c.z0+.9*t)); }
function inCloud(p){ for(const c of CLD){ const dx=(p.x-c.p.x)/21, dy=(p.y-c.p.y)/5, dz=(p.z-c.p.z)/13; if(dx*dx+dy*dy+dz*dz<1) return true; } return false; }
function inFog(p){ const f=G.fog; return !!f&&p.y<24&&Math.hypot(p.x-f.x,p.z-f.z)<f.r; }
function murk(p){ return inFog(p)||inCloud(p)||inSmoke(p); }
function fogStart(){ const f={x:(Math.random()-.5)*170,z:(Math.random()-.5)*150,r:60+Math.random()*35,t:15+Math.random()*15}; G.fog=f; send({t:'fog',x:Math.round(f.x),z:Math.round(f.z),r:Math.round(f.r),T:+f.t.toFixed(1)}); say('Опускається туман',3); }
function skyStep(){ cloudPos(); const g=1-.45*wet; for(const c of CLD){ c.m.position.copy(c.p); c.m.material.color.setRGB(g,g,g+.02); } const f=G.fog; fogM.visible=!!f; if(f){ fogM.position.set(f.x,12,f.z); fogM.scale.set(f.r,24,f.r); fogM.material.opacity=.32*Math.min(1,f.t/3); } birdDraw(); }

/* ---------- Овод: вогнемет і пожежі в кукурудзі та сіні ---------- */
const FLR=9, FLA=20*RAD, FC=5, FIELDS=W.fields.map(f=>({f:f,nx:Math.ceil((f.x1-f.x0)/FC),nz:Math.ceil((f.z1-f.z0)/FC)})), FOFF=[]; let NCELL=0; for(const q of FIELDS){ FOFF.push(NCELL); NCELL+=q.nx*q.nz; }
const fireT=new Float32Array(NCELL), burning=[];
const HAY=[[45,.6,38.6,1.4],[47.2,.6,38.6,1.4],[46.1,1.9,38.6,1.4],[45,.6,33.6,1.4],[39,5.4,39.6,1.4],[41.2,5.4,39.6,1.4],[48,5.4,32.6,1.4],[66,.75,22,1],[69,.75,25,1],[72,.75,21,1],[67,.75,28,1]], hayT=new Float32Array(HAY.length);
const ashM=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),new THREE.MeshLambertMaterial({color:0x2A2522}),1400); ashM.count=0; ashM.frustumCulled=false; scene.add(ashM); const hayAsh=[]; const aM4=new THREE.Matrix4();
function cellAt(x,z){ for(let k=0;k<FIELDS.length;k++){ const q=FIELDS[k], f=q.f; if(x>f.x0&&x<f.x1&&z>f.z0&&z<f.z1) return FOFF[k]+Math.min(q.nx-1,Math.floor((x-f.x0)/FC))*q.nz+Math.min(q.nz-1,Math.floor((z-f.z0)/FC)); } return -1; }
function cellInfo(i){ for(let k=FIELDS.length-1;k>=0;k--) if(i>=FOFF[k]){ const q=FIELDS[k], j=i-FOFF[k], ix=Math.floor(j/q.nz), iz=j%q.nz; return {k:k,ix:ix,iz:iz,x:q.f.x0+(ix+.5)*FC,z:q.f.z0+(iz+.5)*FC}; } return null; }
function cornAt(x,y,z){ if(!W.inCorn(x,y,z)) return false; const c=cellAt(x,z); return c<0||fireT[c]===0; }
function inSmoke(p){ if(p.y>14) return false; const c=cellAt(p.x,p.z); if(c>=0&&fireT[c]>0) return true; for(let j=0;j<HAY.length;j++) if(hayT[j]>0&&Math.hypot(p.x-HAY[j][0],p.z-HAY[j][2])<4&&p.y<HAY[j][1]+9) return true; return false; }
function ignite(i,net){ if(i<0||i>=NCELL||fireT[i]!==0||burning.length>320) return; fireT[i]=11+Math.random()*3; burning.push(i); if(net&&G.kind==='net') send({t:'ign',c:i}); }
function igniteHay(j,net){ if(j<0||j>=HAY.length||hayT[j]!==0) return; hayT[j]=22; if(net&&G.kind==='net') send({t:'ign',h:j}); if(me.p.distanceTo(new THREE.Vector3(HAY[j][0],HAY[j][1],HAY[j][2]))<60) say('Загорілося сіно!',2); }
function fireReset(){ fireT.fill(0); hayT.fill(0); burning.length=0; ashM.count=0; ashM.instanceMatrix.needsUpdate=true; for(const m of hayAsh) scene.remove(m); hayAsh.length=0; for(const q of PT) q.l=0; G.spreadT=0; }
function fireWorld(dt){ const wet=G.rain>0?2.2:1;
  for(let n=burning.length-1;n>=0;n--){ const i=burning[n]; fireT[i]-=dt*wet; if(fireT[i]<=0){ fireT[i]=-1; burning.splice(n,1); const c=cellInfo(i); if(c&&ashM.count<1400){ aM4.makeScale(FC,1.2,FC); aM4.setPosition(c.x,.6,c.z); ashM.setMatrixAt(ashM.count++,aM4); ashM.instanceMatrix.needsUpdate=true; } } }
  for(let j=0;j<HAY.length;j++) if(hayT[j]>0){ hayT[j]-=dt*wet; if(hayT[j]<=0){ hayT[j]=-1; const h=HAY[j], m=new THREE.Mesh(new THREE.BoxGeometry(h[3]*1.5,.4,h[3]*1.5),ashM.material); m.position.set(h[0],h[1]-h[3]*.5+.2,h[2]); scene.add(m); hayAsh.push(m); } }
  if(auth()&&G.rain<=0){ G.spreadT=(G.spreadT||0)-dt; if(G.spreadT<=0){ G.spreadT=.5; const wl=Math.hypot(G.wx,G.wz)||1, wx=G.wx/wl, wz=G.wz/wl, wk=Math.min(1.6,G.ws/4); const add=[];
      for(const i of burning){ const c=cellInfo(i); if(!c) continue; const q=FIELDS[c.k]; for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){ const ix=c.ix+dx, iz=c.iz+dz; if(ix<0||iz<0||ix>=q.nx||iz>=q.nz) continue; const ni=FOFF[c.k]+ix*q.nz+iz; if(fireT[ni]!==0) continue; if(Math.random()<.07*(1+wk*(dx*wx+dz*wz))) add.push(ni); } }
      for(const ni of add) ignite(ni,true);
      for(let j=0;j<HAY.length;j++) if(hayT[j]>0) for(let k=0;k<HAY.length;k++) if(hayT[k]===0&&Math.hypot(HAY[j][0]-HAY[k][0],HAY[j][2]-HAY[k][2])<4&&Math.random()<.25) igniteHay(k,true); } }
  for(const d of D){ if(!d.local||d.dead) continue; if(d.burnT>0){ d.burnT-=dt; if(G.kind!=='free') d.hp-=8*dt; } let burn=0; const c=cellAt(d.p.x,d.p.z); if(c>=0&&fireT[c]>0&&d.p.y<4.5) burn=1; for(let j=0;j<HAY.length;j++) if(hayT[j]>0&&Math.hypot(d.p.x-HAY[j][0],d.p.z-HAY[j][2])<HAY[j][3]+1.6&&d.p.y<HAY[j][1]+3.5) burn=1;
    if(burn){ if(G.kind!=='free') d.hp-=12*dt; d.prop=Math.max(0,d.prop-8*dt/DR[d.ch].pt); d.v.y+=4*dt; if(d===me&&!(G.burnT>0)){ G.burnT=2.5; say('Вогонь! Тікай із пожежі',2); } } } }
function flameDir(d,out){ return out.set(-Math.sin(d.yaw)*Math.cos(d.pitch*.5),-.12-Math.sin(d.pitch)*.4,-Math.cos(d.yaw)*Math.cos(d.pitch*.5)).normalize(); }
const fA={}; let fFlush=0, fIgn=0; const fD=new THREE.Vector3(), fP=new THREE.Vector3();
function flameStep(d,dt,want){ if(d.fuel==null) d.fuel=1; if(d.dry2&&d.fuel>.35) d.dry2=false; const can=!d.dead&&d.tang<=0&&!d.dry2&&d.fuel>0;
  d.flaming=!!want&&can; if(d.flaming){ d.fuel=Math.max(0,d.fuel-dt/4); if(d.fuel<=0){ d.dry2=true; if(d===me) say('Пальне скінчилось — доливається',1.6); } } else d.fuel=Math.min(1,d.fuel+dt/6);
  if(!d.flaming) return; flameDir(d,fD); const B=d.boost>0, R=FLR*(B?1.3:1);
  const hitT=t=>{ tA.copy(t.p).sub(d.p); const dist=tA.length(); if(dist>R+(t.r||0)) return 0; const al=tA.dot(fD); if(al<=0) return 0; const off=Math.sqrt(Math.max(0,dist*dist-al*al)); if(off>al*Math.tan(FLA)+.6+(t.r||0)) return 0; if(blocked(d.p,t.p)) return 0; return 1-dist/R*.4; };
  for(const e of D){ if(e.side===d.side||e.dead) continue; const k=hitT(e); if(k>0) fA[e.id]=(fA[e.id]||0)+34*k*dt*(B?1.3:1); }
  if(G.rule==='base'){ const b=BASE[1-d.team]; if(b&&!b.dead){ const k=hitT(b); if(k>0) fA['b'+b.team]=(fA['b'+b.team]||0)+22*k*dt; } }
  fFlush-=dt; if(fFlush<=0){ fFlush=.25; for(const key in fA){ const v=fA[key]; if(v<.5) continue; const tg=key[0]==='b'?BASE[+key.slice(1)]:D.find(q=>q.id===+key); if(tg&&!tg.dead) hurt(tg,v,'fire',d); delete fA[key]; } }
  fIgn-=dt; if(fIgn<=0){ fIgn=.12; for(let s=1.5;s<=R;s+=1.4){ fP.copy(d.p).addScaledVector(fD,s); fP.y-=.02*s*s; if(fP.y<2.7){ const c=cellAt(fP.x,fP.z); if(c>=0&&fireT[c]===0&&Math.random()<.5) ignite(c,true); }
      for(let j=0;j<HAY.length;j++) if(hayT[j]===0&&Math.hypot(fP.x-HAY[j][0],fP.y-HAY[j][1],fP.z-HAY[j][2])<HAY[j][3]+.8) igniteHay(j,true); } } }
/* частинки: полум'я і дим */
const NP=900, PT=[]; for(let i=0;i<NP;i++) PT.push({x:0,y:0,z:0,vx:0,vy:0,vz:0,l:0,L:1,s:0});
function pTex(inner,outer){ const c=document.createElement('canvas'); c.width=c.height=32; const x=c.getContext('2d'), g=x.createRadialGradient(16,16,0,16,16,16); g.addColorStop(0,inner); g.addColorStop(1,outer); x.fillStyle=g; x.fillRect(0,0,32,32); return new THREE.CanvasTexture(c); }
const fGeo=new THREE.BufferGeometry(), fPos=new Float32Array(NP*3); fGeo.setAttribute('position',new THREE.BufferAttribute(fPos,3)); const sGeo=new THREE.BufferGeometry(), sPos=new Float32Array(NP*3); sGeo.setAttribute('position',new THREE.BufferAttribute(sPos,3));
const fPts=new THREE.Points(fGeo,new THREE.PointsMaterial({size:1.1,map:pTex('rgba(255,236,170,1)','rgba(255,90,0,0)'),transparent:true,depthWrite:false,blending:THREE.AdditiveBlending})), sPts=new THREE.Points(sGeo,new THREE.PointsMaterial({size:3.2,map:pTex('rgba(70,66,62,.55)','rgba(70,66,62,0)'),transparent:true,depthWrite:false}));
fPts.frustumCulled=sPts.frustumCulled=false; scene.add(fPts); scene.add(sPts); let pI=0, pLast=0;
function emit(x,y,z,vx,vy,vz,L,smoke){ const q=PT[pI]; pI=(pI+1)%NP; q.x=x;q.y=y;q.z=z;q.vx=vx;q.vy=vy;q.vz=vz;q.l=L;q.L=L;q.s=smoke?1:0; }
function partStep(){ const now=performance.now()/1000, dt=Math.min(.05,now-pLast||0); pLast=now; const cp=cam.position;
  for(const d of D){ if((d.burnT>0||d.burnV)&&!d.dead&&Math.random()<.6) emit(d.p.x+(Math.random()-.5)*.6,d.p.y,d.p.z+(Math.random()-.5)*.6,(Math.random()-.5),2+Math.random()*2,(Math.random()-.5),.4,false); if(!d.flaming||d.dead) continue; flameDir(d,fD); for(let k=0;k<6;k++){ const sp=13+Math.random()*5, j=.18; emit(d.p.x+fD.x*.8,d.p.y+fD.y*.8-.1,d.p.z+fD.z*.8,(fD.x+(Math.random()-.5)*j)*sp+d.v.x,(fD.y+(Math.random()-.5)*j)*sp+d.v.y,(fD.z+(Math.random()-.5)*j)*sp+d.v.z,.42+Math.random()*.12,false); } }
  let budget=70; for(const i of burning){ if(budget<=0) break; const c=cellInfo(i); if(!c||Math.abs(c.x-cp.x)>130||Math.abs(c.z-cp.z)>130) continue; budget--; if(Math.random()<.9) emit(c.x+(Math.random()-.5)*FC,.4+Math.random()*1.6,c.z+(Math.random()-.5)*FC,(Math.random()-.5),2.5+Math.random()*2.5,(Math.random()-.5),.7+Math.random()*.5,false); if(Math.random()<.35) emit(c.x+(Math.random()-.5)*FC,2.5,c.z+(Math.random()-.5)*FC,G.wx*.4,2+Math.random()*1.5,G.wz*.4,3.5,true); }
  for(let j=0;j<HAY.length;j++) if(hayT[j]>0){ const h=HAY[j]; for(let k=0;k<3;k++) emit(h[0]+(Math.random()-.5)*h[3]*2,h[1]+Math.random()*h[3],h[2]+(Math.random()-.5)*h[3]*2,(Math.random()-.5),3+Math.random()*3,(Math.random()-.5),.7,false); if(Math.random()<.5) emit(h[0],h[1]+h[3],h[2],G.wx*.4,2.2,G.wz*.4,4,true); }
  for(let i=0;i<NP;i++){ const q=PT[i]; if(q.l>0){ q.l-=dt; q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; if(!q.s){ q.vy+=1.5*dt; q.vx*=.96; q.vz*=.96; } }
    const A=q.s?sPos:fPos, B2=q.s?fPos:sPos; if(q.l>0){ A[i*3]=q.x; A[i*3+1]=q.y; A[i*3+2]=q.z; B2[i*3+1]=-999; } else { fPos[i*3+1]=-999; sPos[i*3+1]=-999; } }
  fGeo.attributes.position.needsUpdate=true; sGeo.attributes.position.needsUpdate=true; }

/* ---------- крок гри ---------- */
function remoteStep(d,dt){ const r=d.rp; if(!r) return; r.age+=dt; const a=Math.min(r.age,.2), k=Math.min(1,dt*18); d.p.x+=(r.p[0]+r.v[0]*a-d.p.x)*k; d.p.y+=(r.p[1]+r.v[1]*a-d.p.y)*k; d.p.z+=(r.p[2]+r.v[2]*a-d.p.z)*k; d.v.set(r.v[0],r.v[1],r.v[2]); d.yaw=r.a[0]; d.pitch=r.a[1]; d.roll=r.a[2]; d.T=r.T; d.hp=r.hp; d.batt=r.b; d.tang=r.tg; d.dash=r.ds?2:0; d.prop=r.pr; d.shield=(r.fl&1)?1:0; d.boost=(r.fl&2)?1:0; d.flaming=!!(r.fl&8); d.burnV=!!(r.fl&16); d.aimId=d.ch===9?r.at:null; d.aimT=d.ch===9&&r.at!=null?1:0; d.hookId=d.ch===2?r.at:null; d.zoom=r.zm; d.el=r.el;
  if(G.rule!=='duel'&&d.dead&&!(r.fl&4)){ d.dead=false; d.mesh.visible=true; d.p.set(r.p[0],r.p[1],r.p[2]); } }
function pickTarget(){ let tg=null; const es=D.filter(d=>isEnemy(d)&&!d.dead).sort((a,b)=>a.p.distanceToSquared(me.p)-b.p.distanceToSquared(me.p)); foe=es[0]||D.find(isEnemy)||null;
  for(const e of es){ aimOf(me,e,tB); if(me.lock){ tg=e; break; } }
  if(!tg){ const b=G.rule==='base'?enB():null; if(b&&!b.dead){ aimOf(me,b,tB); if(me.lock) tg=b; } }
  if(!tg){ aimOf(me,null,tB); tg=es[0]||null; } return tg; }
function step(dt){ G.t+=dt;
  G.wa+=.02*dt*Math.sin(G.t*.11); G.ws=Math.max(0,3.2+2.2*Math.sin(G.t*.13)+1.6*Math.sin(G.t*.71+1)*Math.sin(G.t*.29)); G.wx=Math.cos(G.wa)*G.ws; G.wz=Math.sin(G.wa)*G.ws;
  if(auth()){ G.rainIn-=dt; if(!G.rainW&&G.rainIn<5&&G.rain<=0){ G.rainW=true; say('Насувається дощ',3); send({t:'rw'}); } if(G.rainIn<=0&&G.rain<=0){ G.rain=20; G.rainIn=75+Math.random()*45; G.rainW=false; send({t:'rain'}); say('Дощ: мотори тягнуть гірше, видно й чути менше',3.5); } }
  if(G.rain>0){ G.rain-=dt; if(G.rain<=0){ say('Дощ минув',2.5); if(auth()) fogStart(); } }
  if(G.fog){ G.fog.t-=dt; if(G.fog.t<=0) G.fog=null; }
  birdStep(dt);
  const inp=me.inp; inp.mx=clamp(I.mx+((key.d?1:0)-(key.a?1:0)),-1,1); inp.my=clamp(I.my+((key.w?1:0)-(key.s?1:0)),-1,1); inp.yaw=clamp(I.yaw+((key.right?1:0)-(key.left?1:0)),-1,1); const scoped=me.ch===9&&me.zoom>0; if(scoped&&(me.dead||me.tang>0)) scopeOff(); inp.alt=scoped?clamp((key.up?1:0)-(key.down?1:0),-1,1):clamp(I.alt+((key.up||key.aup?1:0)-(key.down||key.adn?1:0)),-1,1); if(scoped) me.el=clamp(me.el+(I.alt+((key.aup?1:0)-(key.adn?1:0)))*(me.zoom===2?11:22)*RAD*dt,-1.15,.75); inp.dash=I.dash||!!key.dash||!!I.dashTap; I.dashTap=false;
  if(G.autoMe&&foe) botThink(me,foe,botS[0],dt);
  stepD(me,dt);
  if(me.ch===4) flameStep(me,dt,G.phase!=='end'&&(I.fire||!!key.fire||(G.auto&&me.lock)||!!G.autoMe&&me.lock));
  for(const d of D){ if(d===me) continue; if(d.bot&&d.local){ const bt=botTarget(d); d.tgt=bt; botThink(d,bt,d.bs,dt); stepD(d,dt); botRam(d); if(d.ch===4) flameStep(d,dt,!!d.flameWant&&G.phase==='fight'); } else remoteStep(d,dt); }
  if(D.length>1){ ramCheck(); ramBase(); if(G.autoMe){ foe=D.find(d=>isEnemy(d)&&!d.dead)||D.find(isEnemy)||null; } else { const tg=pickTarget(); me.tgt=tg; if(me.ch===9){ me.aimT=0; me.aimId=null; const want=I.fire||!!key.fire; if((I.fireTap||(want&&!G.fireHeld))&&me.cd<=0&&G.phase==='fight'&&me.tang<=0) snipe(me); G.fireHeld=want; }
      else if((I.fire||key.fire||I.fireTap||(G.auto&&me.lock))&&(me.ch===2?me.hcd:me.cd)<=0&&G.phase==='fight') fire(me,tg,false,tB.clone()); }
    G.aimed=D.some(q=>{ if(q.ch!==9||q.side===me.side||q.dead) return false; if(q.aimT>0&&q.aimId===me.id) return true; if(!q.zoom||!q.ld) return false; tA.copy(me.p).sub(q.p); const al=tA.dot(q.ld); return al>2&&al<q.le+2&&Math.sqrt(Math.max(0,tA.lengthSq()-al*al))<2.2; }); if(G.aimed&&!me.dead){ G.warnT=(G.warnT||0)-dt; if(G.warnT<=0){ G.warnT=.4; beep(1250,0,.06,'square',.12); } }
    detect(dt); pkStep(dt); }
  I.fireTap=false; stepShots(dt); fireWorld(dt);
  if(G.kind==='free'){ for(let i=G.left.length-1;i>=0;i--){ const m=W.marks[G.left[i]]; if(Math.hypot(me.p.x-m[0],me.p.y-m[1],me.p.z-m[2])<1.5){ markM[G.left[i]].visible=false; G.left.splice(i,1); G.got++; beep(784,0,.12,'triangle',.16); beep(1047,.1,.18,'triangle',.16); say(G.left.length?'Мітка '+G.got+' з '+W.marks.length:'Усі мітки зібрано за '+fmtT(G.t)+'!',G.left.length?1.6:6); } } }
  else if(G.rule==='duel') duelRules(dt); else contRules(dt);
  if(G.hitT>0)G.hitT-=dt; if(G.msgT>0)G.msgT-=dt; if(G.burnT>0)G.burnT-=dt; }
function fmtT(t){ return Math.floor(t/60)+':'+String(Math.floor(t%60)).padStart(2,'0'); }

/* ---------- мережа ---------- */
const PFX='pz-drony-'; let peer=null, hostConn=null, conns={}, code='', netState='', joinTO=null, sendT=0, pingT=0, isHost=false, myId=0, inRoom=false, lastHost=0, lag=isLoc?(+Q.get('lag')||0):0;
const invite=(Q.get('g')||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,5);
const R={P:[],fmt:'teams',rule:'duel',playing:false}, BC={s:1,f:1,dead:1};
function peerOpts(){ const s=Q.get('srv'); if(s&&isLoc){const a=s.split(':'); return {host:a[0],port:+a[1],path:'/',secure:false,debug:1};} return {debug:1}; }
function mkCode(){const A='ABCDEFGHJKMNPQRSTUVWXYZ23456789'; let s=''; for(let i=0;i<5;i++) s+=A[Math.floor(Math.random()*A.length)]; return s;}
function rawSend(c,m){ if(c&&c.open){ try{c.send(m);}catch(e){} } }
/* господар шле всім або одному; гість шле господареві, той пересилає */
function send(m,to){ if(!inRoom) return; if(isHost){ m.from=0; if(to==null){ for(const k in conns) rawSend(conns[k],m); } else if(to!==0) rawSend(conns[to],m); } else { if(to!=null) m.to=to; rawSend(hostConn,m); } }
function hostRecv(k,m){ if(!m||typeof m!=='object') return; m.from=k; if(m.to!=null&&(m.to|0)!==0){ rawSend(conns[m.to|0],m); return; } if(BC[m.t]){ for(const j in conns) if(+j!==k) rawSend(conns[j],m); } onMsg(m); }
function netClose(){ clearTimeout(joinTO); const cs=conns; conns={}; for(const k in cs){ try{cs[k].close();}catch(e){} } const hc=hostConn; hostConn=null; try{ if(hc) hc.close(); }catch(e){} const p=peer; peer=null; try{ if(p) p.destroy(); }catch(e){} inRoom=false; isHost=false; myId=0; R.P=[]; R.playing=false; }
function netFail(msg){ netClose(); G.mode='room'; netState='err'; G.netMsg=msg; ui(); }
function roomCast(){ send({t:'room',R:{P:R.P,fmt:R.fmt,rule:R.rule,playing:R.playing}}); if(G.mode==='room') ui(); }
function teamFix(){ if(R.fmt!=='teams') R.P=R.P.filter(q=>!q.bot); else for(let t=0;t<2;t++){ const hum=R.P.filter(q=>!q.bot&&q.team===t).length, bots=R.P.filter(q=>q.bot&&q.team===t), maxB=hum===0?3:Math.min(1,3-hum); while(bots.length>maxB){ const b=bots.pop(); R.P.splice(R.P.indexOf(b),1); } } if(R.fmt==='teams') for(let i=0;i<R.P.length;i++){ const pl=R.P[i], tk=R.P.slice(0,i).filter(q=>q.team===pl.team).map(q=>q.ch); if(tk.includes(pl.ch)){ for(let c=0;c<5;c++) if(!tk.includes(c)){ pl.ch=c; break; } } } }
function botOk(t){ if(R.fmt!=='teams'||R.playing) return false; const hum=R.P.filter(q=>!q.bot&&q.team===t).length, bots=R.P.filter(q=>q.bot&&q.team===t).length; return hum+bots<3&&(bots<1||hum===0); }
function botAdd(t){ if(!isHost||!botOk(t)) return; const used=R.P.map(q=>q.id); let id=6; while(used.includes(id)) id++; const pl={id:id,ch:Math.floor(Math.random()*5),team:t,bot:true}; R.P.push(pl); fixPick(pl); roomCast(); }
function botDel(id){ if(!isHost||R.playing) return; R.P=R.P.filter(q=>!(q.bot&&q.id===id)); roomCast(); }
function botCyc(id){ const pl=R.P.find(q=>q.bot&&q.id===id); if(!isHost||!pl||R.playing) return; for(let k=1;k<=5;k++){ const c=(pl.ch+k)%5; if(!R.P.some(q=>q!==pl&&q.team===pl.team&&q.ch===c)){ pl.ch=c; break; } } roomCast(); }
function fixPick(pl){ if(R.fmt!=='teams') return; const taken=R.P.filter(q=>q!==pl&&q.team===pl.team).map(q=>q.ch); if(taken.includes(pl.ch)){ for(let c=0;c<5;c++) if(!taken.includes(c)){ pl.ch=c; break; } } }
function roomPick(id,ch,team){ const pl=R.P.find(q=>q.id===id); if(!pl||R.playing) return; if(team!=null){ const nt=team?1:0; if(R.P.filter(q=>!q.bot&&q.team===nt&&q!==pl).length<3){ pl.team=nt; R.P.splice(R.P.indexOf(pl),1); R.P.push(pl); teamFix(); } } if(ch!=null){ const nc=clamp(ch|0,0,4); if(R.fmt!=='teams'||!R.P.some(q=>q!==pl&&q.team===pl.team&&q.ch===nc)) pl.ch=nc; } roomCast(); }
function roomSet(fmt,rule){ if(fmt){ R.fmt=fmt==='ffa'?'ffa':'teams'; teamFix(); } if(rule&&RULES[rule]) R.rule=rule; if(R.fmt==='ffa'&&R.rule==='base') R.rule='duel'; myRule=R.rule; try{localStorage.setItem('pz_dr_rule',myRule);}catch(e){} roomCast(); }
function canStart(){ if(R.P.length<2) return 'Потрібно щонайменше двоє: друг або комп\'ютер.'; if(R.fmt==='teams'&&(!R.P.some(q=>q.team===0)||!R.P.some(q=>q.team===1))) return 'У кожній команді має бути хоча б один гравець або комп\'ютер.'; return ''; }
function hostStartMatch(){ if(!isHost||R.playing||canStart()) return; const cfg={rule:R.rule,fmt:R.fmt,bi:rndBi(false),players:R.P.map(q=>({id:q.id,ch:q.ch,team:q.team,bot:!!q.bot}))}; R.playing=true; send({t:'go',cfg:cfg}); send({t:'room',R:{P:R.P,fmt:R.fmt,rule:R.rule,playing:true}}); start(Object.assign({kind:'net',myId:0},cfg)); }
function admit(c,m){ const used=R.P.map(q=>q.id), h0=R.P.filter(q=>!q.bot&&q.team===0).length, h1=R.P.filter(q=>!q.bot&&q.team===1).length; let id=-1; for(let i=1;i<6;i++) if(!used.includes(i)){ id=i; break; } if(id<0||(R.fmt==='teams'&&h0>=3&&h1>=3)){ rawSend(c,{t:'full',from:0}); setTimeout(()=>{ try{c.close();}catch(e){} },400); return; }
  c._pid=id; conns[id]=c; const n0=R.P.filter(q=>q.team===0).length, n1=R.P.filter(q=>q.team===1).length, pl={id:id,ch:clamp(m.ch|0,0,4),team:h0>=3?1:h1>=3?0:(n1<n0?1:0)}; R.P.push(pl); teamFix(); rawSend(c,{t:'you',id:id,from:0}); roomCast(); }
function playerLeft(id){ const d=D.find(q=>q.id===id); if(!d||d===me) return; d.dead=true; scene.remove(d.mesh); if(d.laser) scene.remove(d.laser); D.splice(D.indexOf(d),1); if(foe===d) foe=D.find(isEnemy)||null; if(G.mode==='play') say('Гравець '+(id+1)+' вийшов',2.5); }
function drop(id){ delete conns[id]; R.P=R.P.filter(q=>q.id!==id); teamFix(); if(G.kind==='net'&&G.mode==='play'){ send({t:'left',id:id}); playerLeft(id); } roomCast(); }
function hostGame(){ netClose(); G.res=''; if(typeof Peer==='undefined'){ netFail('Не завантажилась бібліотека зв\'язку. Онови сторінку.'); return; } code=mkCode(); isHost=true; myId=0; inRoom=true; R.P=[{id:0,ch:myCh,team:0}]; R.rule=myRule; if(R.fmt==='ffa'&&R.rule==='base') R.rule='duel'; R.playing=false; G.mode='room'; netState='open'; ui();
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
function onMsg(m){ if(!m||typeof m!=='object') return; const from=m.from|0, c4=v=>clamp(v|0,0,4), dOf=id=>D.find(q=>q.id===id), play=G.kind==='net'&&G.mode==='play';
  switch(m.t){
   case 'you': if(!isHost){ myId=m.id|0; } break;
   case 'full': if(!isHost) netFail('У кімнаті вже немає місця. Спробуй пізніше.'); break;
   case 'room': if(!isHost&&m.R&&Array.isArray(m.R.P)){ R.P=m.R.P.slice(0,9).map(q=>({id:q.id|0,ch:c4(q.ch),team:q.team?1:0,bot:!!q.bot})); R.fmt=m.R.fmt==='ffa'?'ffa':'teams'; R.rule=RULES[m.R.rule]?m.R.rule:'duel'; R.playing=!!m.R.playing; if(netState==='join') netState='ok'; if(G.mode==='room') ui(); } break;
   case 'pick': if(isHost) roomPick(from,m.ch,m.team); break;
   case 'go': if(!isHost&&m.cfg&&Array.isArray(m.cfg.players)&&m.cfg.players.some(q=>(q.id|0)===myId)){ start({kind:'net',myId:myId,rule:String(m.cfg.rule),fmt:m.cfg.fmt,bi:m.cfg.bi,players:m.cfg.players.slice(0,9).map(q=>({id:q.id|0,ch:c4(q.ch),team:q.team?1:0,bot:!!q.bot}))}); } break;
   case 's': { const d=dOf(from===0&&m.id!=null?(m.id|0):from); if(play&&d&&!d.local&&Array.isArray(m.p)&&Array.isArray(m.v)&&Array.isArray(m.a)){ const first=!d.rp; d.rp={p:m.p.map(Number),v:m.v.map(Number),a:m.a.map(Number),T:+m.T||0,hp:+m.hp||0,b:+m.b||0,tg:+m.tg||0,ds:m.ds?1:0,pr:m.pr==null?100:+m.pr,fl:m.fl|0,at:m.at==null?null:(m.at|0),zm:clamp(m.zm|0,0,2),el:clamp(+m.el||0,-1.2,.8),age:0}; if(first) d.p.set(d.rp.p[0],d.rp.p[1],d.rp.p[2]);
       if(from===0&&!G.host){ if(m.ct!=null){ const off=+m.ct-G.t; G.ctOff=Math.abs(off-G.ctOff)>1?off:G.ctOff+(off-G.ctOff)*.05; } if(Array.isArray(m.bh)&&G.rule==='base') for(let t=0;t<2;t++){ const b=BASE[t], nh=+m.bh[t]; if(b&&isFinite(nh)){ if(t===me.team&&nh<b.hp-.5) baseAlert(); b.hp=nh; } } } } break; }
   case 'f': { const d=dOf(from===0&&m.id!=null?(m.id|0):from); if(play&&d&&!d.local&&Array.isArray(m.o)&&Array.isArray(m.d)){ const sv=d.p.clone(); d.cd=0; d.hcd=0; d.hook=null; d.tang=0; d._e=clamp(+m.e||0,0,170); d.p.set(+m.o[0],+m.o[1],+m.o[2]); fire(d,d.side!==me.side?me:null,true,new THREE.Vector3(+m.d[0],+m.d[1],+m.d[2]).normalize()); d.p.copy(sv); } break; }
   case 'hit': { const d=dOf(m.v==null?G.myId:(m.v|0)); if(play&&d&&d.local&&!d.dead&&G.phase==='fight') applyHit(d,clamp(+m.d||0,0,110),m.k,m.by==null?from:(m.by|0)); break; }
   case 'dead': { const d=dOf(from===0&&m.id!=null?(m.id|0):from); if(play&&d&&!d.local&&!d.dead){ d.dead=true; if(d.rp) d.rp.fl|=4; const mine=m.by!=null&&(m.by|0)===G.myId; say((d.side===me.side?'Напарника збито':'Суперника збито')+(mine?' — твоя робота!':''),2.5); if(d.side!==me.side) [523,659,784].forEach((f,i)=>beep(f,i*.12,.2,'triangle',.16)); } break; }
   case 'rnd': if(play&&!G.host&&Array.isArray(m.sc)){ G.sc=[0,1,2,3,4,5,6,7].map(i=>m.sc[i]|0); roundEnd(m.w==null?-1:(m.w|0)); } break;
   case 'nr': if(play&&!G.host) newRound(); break;
   case 'over': if(play&&!G.host){ if(Array.isArray(m.sc)) G.sc=[0,1,2,3,4,5,6,7].map(i=>m.sc[i]|0); const w=m.w|0; if(G.rule==='base') baseDown(1-w); finish(w); } break;
   case 'left': if(!isHost) playerLeft(m.id|0); break;
   case 'bh': if(play&&G.host&&G.rule==='base'&&G.phase==='fight'){ const b=BASE[m.b?1:0], d=dOf(from); if(b&&!b.dead&&d&&d.team!==b.team) baseDmg(b,clamp(+m.d||0,0,110)); } break;
   case 'flag': if(play&&!G.host&&G.rule==='flag'&&Array.isArray(m.sc)){ G.sc=[0,1,2,3,4,5,6,7].map(i=>m.sc[i]|0); const by=m.by==null?-1:(m.by|0), bd=dOf(by), tx=by===G.myId?'Прапор твій!':bd?(bd.side===me.side?'Напарник узяв прапор':'Суперник узяв прапор'):(FL.i>=0?'Прапор перенесли':''); if(tx) say(tx,2.5); if(by===G.myId){ beep(784,0,.12,'triangle',.16); beep(1047,.1,.18,'triangle',.16); } flagPut(clamp(m.i|0,0,FSP.length-1),m.n|0); } break;
   case 'cap': if(play&&G.host&&G.rule==='flag'&&(m.n|0)===FL.n&&G.phase==='fight'){ const d=dOf(from); if(d){ G.sc[d.side]++; say((d.side===me.side?'Напарник':'Суперник')+' узяв прапор',2.5); flagNext(d.id); } } break;
   case 'pk': if(play&&!G.host) pkAdd(m.id|0,String(m.k),m.i|0); break;
   case 'pg': if(play&&G.host){ const pk=PK.find(q=>q.id===(m.id|0)), d=dOf(from); if(pk&&d&&!d.dead) pkTake(pk,d); } break;
   case 'pt': if(play&&!G.host){ const pk=PK.find(q=>q.id===(m.id|0)), d=dOf(m.by|0); if(pk){ if((m.by|0)===G.myId) pkApply(me,pk.k); else if(d) say((d.side===me.side?'Напарник':'Суперник')+' підібрав: '+PKT[pk.k].n,2); pkDel(pk); } } break;
   case 'fog': if(play&&!G.host){ G.fog={x:+m.x||0,z:+m.z||0,r:clamp(+m.r||70,30,120),t:clamp(+m.T||20,5,30)}; say('Опускається туман',3); } break;
   case 'ign': if(play){ if(m.c!=null) ignite(m.c|0,false); if(m.h!=null) igniteHay(m.h|0,false); } break;
   case 'rw': if(play&&!G.host) say('Насувається дощ',3); break;
   case 'rain': if(play&&!G.host){ G.rain=20; say('Дощ: мотори тягнуть гірше, видно й чути менше',3.5); } break;
   case 'pi': if(isHost) send({t:'po',ts:m.ts},from); break; case 'po': G.rtt=Math.round(performance.now()-m.ts); break; } }
/* раз на 2 с: гість озивається до господаря; хто мовчить 20 с — того вважаємо відключеним */
setInterval(()=>{ if(!inRoom) return; const now=performance.now(); if(isHost){ for(const k in conns){ const c=conns[k]; if(c._t&&now-c._t>20000){ try{c.close();}catch(e){} if(conns[k]===c) drop(+k); } } } else { send({t:'pi',ts:now},0); if(lastHost&&now-lastHost>20000) netFail('Зв\'язок із кімнатою обірвався. Зайди ще раз за тим самим посиланням.'); } },2000);
function netFrame(dt){ if(G.kind!=='net'||!inRoom) return; sendT+=dt; const r=v=>Math.round(v*100)/100;
  if(sendT>=1/(D.length>4?10:D.length>2?15:25)&&G.mode==='play'){ sendT=0; const mk=q=>({t:'s',id:q.id,p:[r(q.p.x),r(q.p.y),r(q.p.z)],v:[r(q.v.x),r(q.v.y),r(q.v.z)],a:[r(q.yaw),r(q.pitch),r(q.roll)],T:r(q.T),hp:Math.round(q.hp),b:r(q.batt),tg:r(Math.max(0,q.tang)),ds:q.dash>1.1?1:0,pr:Math.round(q.prop),fl:(q.shield>0?1:0)|(q.boost>0?2:0)|(q.dead?4:0)|(q.flaming?8:0)|(q.burnT>0?16:0),at:(q.ch===9&&q.aimT>0&&q.aimId!=null)?q.aimId:(q.ch===2&&q.hook)?(q.hook.tg.isBase?100+q.hook.tg.team:q.hook.tg.id):null,zm:q.ch===9?q.zoom:0,el:q.ch===9?r(q.el):0}); const m=mk(me); if(isHost) for(const q of D) if(q.bot&&q.local) send(mk(q));
    if(isHost){ m.ct=r(G.t); if(G.rule==='base') m.bh=[BASE[0]?Math.round(BASE[0].hp):300,BASE[1]?Math.round(BASE[1].hp):300]; } send(m); }
}

/* ---------- камера, індикатори ---------- */
const tv=new THREE.Vector3(), pv=new THREE.Vector3();
function placeD(d){ const m=d.mesh; if(!m) return; m.position.copy(d.p); m.rotation.order='YXZ'; m.rotation.y=d.yaw; m.rotation.x=-d.pitch; m.rotation.z=-d.roll; d.spin+=d.dead?.1:.9+Math.sqrt(Math.max(0,d.T)/(DR[d.ch].m*GR))*1.6; const pr=m.userData.props; for(let i=0;i<pr.length;i++) pr[i].rotation.y=d.spin*(i%2?1:-1); m.userData.web.visible=d.tang>0; m.userData.sh.visible=d.shield>0; m.userData.bo.visible=d.boost>0;
  if(d.laser&&d.ch===2){ const hk=d.dead?null:d.local?(d.hook&&d.hook.tg):(d.hookId!=null?(d.hookId>=100?BASE[d.hookId-100]:D.find(q=>q.id===d.hookId)):null); d.laser.visible=!!hk&&!hk.dead; if(d.laser.visible){ const a=d.laser.geometry.attributes.position; a.setXYZ(0,d.p.x,d.p.y,d.p.z); a.setXYZ(1,hk.p.x,hk.p.y,hk.p.z); a.needsUpdate=true; d.laser.material.opacity=1; } }
  else if(d.laser){ const tg=d.aimT>0&&!d.dead&&d.aimId!=null?(d.aimId>=100?BASE[d.aimId-100]:D.find(q=>q.id===d.aimId)):null, a=d.laser.geometry.attributes.position, sc=d.zoom>0&&!d.dead; d.laser.visible=(!!tg&&!tg.dead)||sc;
    if(sc){ if(!d.ld) d.ld=new THREE.Vector3(); aimDir(d,d.ld); pv.copy(d.p).addScaledVector(d.ld,.6); d.le=sray(pv,d.ld,170); a.setXYZ(0,pv.x,pv.y,pv.z); a.setXYZ(1,pv.x+d.ld.x*d.le,pv.y+d.ld.y*d.le,pv.z+d.ld.z*d.le); a.needsUpdate=true; d.laser.material.opacity=d===me?.25:.7; }
    else if(d.laser.visible){ a.setXYZ(0,d.p.x,d.p.y-.05,d.p.z); a.setXYZ(1,tg.p.x,tg.p.y,tg.p.z); a.needsUpdate=true; d.laser.material.opacity=.45+.4*Math.abs(Math.sin(G.t*12)); } }
  if(d===me&&!d.dead) m.visible=!(d.ch===9&&d.zoom); }
function place(){ const d=me; for(const q of D) placeD(q);
  let dy=G.camYaw-d.yaw; G.camYaw-=dy*.12; const sy=Math.sin(G.camYaw), cy=Math.cos(G.camYaw), back=d.indoor?2.3:3.6, up=d.indoor?.7:1.35;
  let bx=d.p.x, by=d.p.y, bz=d.p.z; for(let i=1;i<=10;i++){ const f=i/10, x=d.p.x+sy*back*f, y=d.p.y+up*f, z=d.p.z+cy*back*f; if(W.inside(x,y,z,.18)||y<W.floorAt(x,z)+.2) break; bx=x; by=y; bz=z; }
  if(d.ch===9&&d.zoom&&!d.dead){ aimDir(d,tv); cam.position.copy(d.p).addScaledVector(tv,.7); cam.lookAt(cam.position.x+tv.x*20,cam.position.y+tv.y*20,cam.position.z+tv.z*20); pv.copy(cam.position); const en=sray(pv,tv,170), h=srayHit(d,pv,tv,en); G.onT=!!h; G.rng=h?h.d:en; }
  else { cam.position.lerp(tv.set(bx,by,bz),.35); cam.lookAt(d.p.x-sy*5,d.p.y+.35,d.p.z-cy*5); }
  shadow.position.set(d.p.x,W.floorAt(d.p.x,d.p.z)+.03,d.p.z); shadow.material.opacity=clamp(.4-d.p.y*.008,.08,.4); shadow.scale.setScalar(1+d.p.y*.03);
  wet+=((G.rain>0?1:0)-wet)*.04; scene.background.copy(SKY0).lerp(SKY1,wet); murkK+=((murk(d.p)?1:0)-murkK)*.08; scene.background.lerp(MURK,murkK*.85); scene.fog.color.copy(scene.background); scene.fog.near=(160-110*wet)*(1-murkK)+1.5*murkK; scene.fog.far=(560-330*wet)*(1-murkK)+26*murkK; skyStep(); rainM.visible=wet>.05&&!d.indoor;
  if(rainM.visible){ rainM.position.set(cam.position.x,cam.position.y,cam.position.z); rainM.material.opacity=.55*wet; for(let i=0;i<RN;i++){ let y=rainP[i*6+1]-.55; if(y<-8) y+=26; rainP[i*6+1]=y; rainP[i*6+4]=y-1.1; } rainG.attributes.position.needsUpdate=true; }
  partStep(); for(const gm of grainM) gm.material.opacity=.62+.2*Math.sin(G.t*23+gm.position.x);
  sock.rotation.y=Math.atan2(G.wx,G.wz); sock.scale.set(1,1,.4+G.ws*.12); for(const m of markM) if(m.visible) m.rotation.y=G.t*2; }
function resize(){ const cw=cv.clientWidth, chh=cv.clientHeight; if(cw<2||chh<2||!renderer)return; renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,coarse?1.5:2)); renderer.setSize(cw,chh,false); cam.aspect=cw/chh; cam.updateProjectionMatrix(); }
const mapC=$('map'), mx2=mapC.getContext('2d'); let mapT=0, fps=60;
function arrow(d,fill,stroke){ mx2.save(); mx2.translate(75+clamp(d.p.x,-210,210)*150/430,75+clamp(d.p.z,-210,210)*150/430); mx2.rotate(-d.yaw); mx2.fillStyle=fill; mx2.strokeStyle=stroke; mx2.lineWidth=1.5; mx2.beginPath(); mx2.moveTo(0,-6); mx2.lineTo(4,5); mx2.lineTo(0,2.5); mx2.lineTo(-4,5); mx2.closePath(); mx2.fill(); mx2.stroke(); mx2.restore(); }
function drawMap(){ const s=150/430, o=75; mx2.clearRect(0,0,150,150); mx2.fillStyle='rgba(120,160,90,.55)'; mx2.fillRect(0,0,150,150); mx2.fillStyle='rgba(205,190,150,.8)'; mx2.fillRect(o-95*s,o-80*s,190*s,155*s);
  mx2.fillStyle='rgba(60,70,80,.9)'; for(const f of W.foot) mx2.fillRect(o+f[0]*s,o+f[1]*s,(f[2]-f[0])*s,(f[3]-f[1])*s);
  mx2.strokeStyle='rgba(30,35,38,.55)'; mx2.lineWidth=.7; mx2.beginPath(); for(const h of W.haz) if(h.t==='w'){ mx2.moveTo(o+h.a[0]*s,o+h.a[2]*s); mx2.lineTo(o+h.b[0]*s,o+h.b[2]*s); } mx2.stroke();
  mx2.fillStyle='#35C6D8'; for(const p of W.pads){ mx2.beginPath(); mx2.arc(o+p.x*s,o+p.z*s,2.6,0,7); mx2.fill(); }
  mx2.fillStyle='#FFD34D'; for(const i of G.left){ const m=W.marks[i]; mx2.beginPath(); mx2.arc(o+m[0]*s,o+m[2]*s,2,0,7); mx2.fill(); }
  if(G.fog){ mx2.fillStyle='rgba(255,255,255,.55)'; mx2.beginPath(); mx2.arc(o+G.fog.x*s,o+G.fog.z*s,G.fog.r*s,0,7); mx2.fill(); }
  if(G.kind!=='free'){ for(const pk of PK){ mx2.fillStyle=hex(PKT[pk.k].c); mx2.fillRect(o+pk.p.x*s-2,o+pk.p.z*s-2,4,4); }
    for(const b of BASE) if(b&&!b.dead&&b.found){ mx2.fillStyle=hex(TEAMC[b.team]); mx2.strokeStyle='#fff'; mx2.lineWidth=1; mx2.fillRect(o+b.p.x*s-3.5,o+b.p.z*s-3.5,7,7); mx2.strokeRect(o+b.p.x*s-3.5,o+b.p.z*s-3.5,7,7); }
    for(const e of D){ if(e===me||e.dead) continue; const ex=o+clamp(e.p.x,-210,210)*s, ez=o+clamp(e.p.z,-210,210)*s; if(e.side===me.side) arrow(e,hex(e.col),'#fff'); else if(e.det===2) arrow(e,'#FF4030','#fff'); else if(e.det===1){ mx2.strokeStyle='#FF4030'; mx2.lineWidth=1.5; mx2.beginPath(); mx2.arc(ex,ez,5+2*Math.sin(G.t*6),0,7); mx2.stroke(); } else if(e.ls&&G.t-e.ls[2]<8){ mx2.fillStyle='rgba(255,64,48,.7)'; mx2.font='bold 11px sans-serif'; mx2.fillText('?',o+clamp(e.ls[0],-210,210)*s-3,o+clamp(e.ls[1],-210,210)*s+4); } } }
  arrow(me,'#fff','#1F4E5F'); }
const tagEls=[], scEl=document.createElement('div'); (function(){ const stg=$('stage'), st=document.createElement('style'); scEl.id='scope'; scEl.hidden=true; scEl.innerHTML='<b></b>'; stg.appendChild(scEl); const bs=document.createElement('button'); bs.id='bScope'; bs.className='fb'; bs.hidden=true; bs.textContent='ПРИЦІЛ'; stg.appendChild(bs); bs.addEventListener('pointerdown',e=>{ e.preventDefault(); audioInit(); scopeToggle(); }); bs.addEventListener('contextmenu',e=>e.preventDefault());
  st.textContent='#scope{position:absolute;inset:0;pointer-events:none;z-index:2;background:radial-gradient(circle closest-side at 50% 50%,transparent 0,transparent 86%,rgba(0,0,0,.93) 88%)}#scope::before,#scope::after{content:"";position:absolute;background:rgba(255,255,255,.75)}#scope::before{left:50%;top:14%;bottom:14%;width:1px}#scope::after{top:50%;left:22%;right:22%;height:1px}#scope.on::before,#scope.on::after{background:#FF3020}#scope b{position:absolute;left:50%;top:78%;transform:translateX(-50%);color:#fff;font-size:.74rem;font-weight:800;text-shadow:0 1px 3px #000;white-space:nowrap}#scope[hidden]{display:none}#bScope{bottom:184px;width:62px;height:62px;font-size:.6rem;background:rgba(40,120,200,.55);right:22px}#bScope.on{background:rgba(255,211,77,.7);color:#1b2429}.tg{position:absolute;pointer-events:none;color:#fff;font-weight:800;font-size:.72rem;text-shadow:0 1px 3px rgba(0,0,0,.7);transform:translate(-50%,-100%);white-space:nowrap}.tg.off{font-size:1.4rem}.plist{display:grid;gap:5px;margin:8px auto;text-align:left;max-width:420px}.plist div{display:flex;align-items:center;gap:8px;font-size:.86rem}.plist i{width:13px;height:13px;border-radius:50%;flex:none}.plist span{margin-left:auto;opacity:.85}.plist .mini{font:inherit;font-weight:800;width:28px;height:28px;border-radius:50%;border:1.5px solid rgba(255,255,255,.4);background:transparent;color:#fff;cursor:pointer;flex:none}.rules button:disabled{opacity:.3;text-decoration:line-through;cursor:default}.rl{font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;opacity:.6;margin:8px 0 0}#hT u{text-decoration:none;color:#FFD34D}'; document.head.appendChild(st);
  for(let i=0;i<5;i++){ const e=document.createElement('div'); e.className='tg'; e.hidden=true; stg.appendChild(e); tagEls.push(e); } })();
function hud(){ const p=DR[me.ch], hs=Math.hypot(me.v.x,me.v.z), wr=Math.atan2(G.wx,G.wz)-Math.atan2(-Math.sin(me.yaw),-Math.cos(me.yaw)), ar=['↑','↗','→','↘','↓','↙','←','↖'][((Math.round(wr/(Math.PI/4))%8)+8)%8], duel=G.kind!=='free';
  $('hL').innerHTML='<b>'+p.n+'</b>'+(duel?' · здоров\'я '+Math.max(0,Math.round(me.hp)):' · мітки '+G.got+'/'+W.marks.length)+(duel?'<div class="bar"><i style="width:'+clamp(me.hp,0,100)+'%;background:#F0705A"></i></div>':'')+'<div class="bar"><i style="width:'+(me.batt*100).toFixed(0)+'%;background:'+(me.batt<.15?'#F0705A':G.chg?'#35C6D8':'#8FD08A')+'"></i></div>'+
    'Заряд '+Math.round(me.batt*100)+'%'+(G.chg?' · заряджається':'')+'<br><span'+(me.prop<40?' style="color:#FFB0A0"':'')+'>Гвинти '+Math.round(me.prop)+'%</span>'+(G.rain>0?' · дощ '+Math.ceil(G.rain)+' с':'')+(me.shield>0?' · <span style="color:#D5C2FF">щит '+Math.ceil(me.shield)+' с</span>':'')+(me.boost>0?' · <span style="color:#FFD34D">зброя '+Math.ceil(me.boost)+' с</span>':'')+(me.ch===4?'<br>Пальне '+Math.round((me.fuel==null?1:me.fuel)*100)+'%'+(me.dry2?' · доливається':''):'')+'<br>'+(hs*3.6).toFixed(0)+' км/год · висота '+me.p.y.toFixed(0)+' м<br>Вітер '+ar+' '+G.ws.toFixed(0)+' м/с'+(me.indoor?' · під дахом':'')+'<br><span style="opacity:.6">'+fps.toFixed(0)+' кадрів/с'+(G.kind==='net'&&G.rtt?' · зв\'язок '+G.rtt+' мс':'')+(duel?' · тебе чути за '+Math.round(hearR(me))+' м':'')+'</span>';
  const hT=$('hT'), aim=$('aim'); hT.hidden=!duel; aim.hidden=!duel; let ti=0;
  if(duel){ const b0=myB(), b1=enB(); let head=G.rule==='base'&&b0&&b1?'Твоя база '+Math.max(0,Math.round(b0.hp))+' · чужа '+(b1.found?Math.max(0,Math.round(b1.hp)):'не знайдена'):G.rule==='flag'?'Прапори: '+scoreLine()+' · до прапора '+(FL.i>=0?Math.round(me.p.distanceTo(flagM.position))+' м':'…'):scoreLine();
    for(const e of D){ if(e===me) continue; const en=e.side!==me.side; head+='<div class="bar"><i style="width:'+clamp(e.hp,0,100)+'%;background:'+hex(e.col)+'"></i></div>'+label(e)+' · '+DR[e.ch].n+(e.dead?' · збито':en&&!e.det?' · не видно й не чути':'')+(e.tang>0?' · заплутався':'')+(e.prop<40?' · гвинти побиті':'')+(e.shield>0?' · щит':'')+(e.boost>0?' · посилена зброя':''); }
    hT.innerHTML=head; aim.className=me.lock?'lock':''; if(me.ch===9&&me.zoom) aim.hidden=true;
    for(const e of D){ if(e===me) continue; const el=tagEls[ti++]; if(!el) break; const en=e.side!==me.side; if(e.dead||(en&&!e.det)){ el.hidden=true; continue; } el.hidden=false; el.style.color=en?'#FF6050':hex(e.col); pv.copy(e.p); pv.y+=.6; pv.project(cam); const on=pv.z<1&&Math.abs(pv.x)<.96&&Math.abs(pv.y)<.94;
      if(on){ el.className='tg'; el.style.left=((pv.x+1)/2*100)+'%'; el.style.top=((1-pv.y)/2*100)+'%'; el.textContent=(en?'':label(e)+' · ')+(e.det===2?Math.round(me.p.distanceTo(e.p))+' м':'♪'); }
      else { let x=pv.x, y=pv.y; if(pv.z>1){x=-x;y=-y;} const mlen=Math.max(Math.abs(x),Math.abs(y))||1; x=x/mlen*.9; y=y/mlen*.86; el.className='tg off'; el.style.left=((x+1)/2*100)+'%'; el.style.top=((1-y)/2*100+4)+'%'; el.textContent=en?'◆':'●'; } }
    $('bFire').classList.toggle('cd',(me.ch===2?me.hcd:me.cd)>0); $('bDash').classList.toggle('cd',me.dcd>0); }
  for(;ti<tagEls.length;ti++) tagEls[ti].hidden=true;
  const scp=me.ch===9&&me.zoom>0&&!me.dead; scEl.hidden=!scp; if(scp){ scEl.className=G.onT?'on':''; scEl.firstChild.textContent='×'+(me.zoom===2?8:4)+' · '+(G.rng>=169?'далі 170 м':Math.round(G.rng)+' м')+(me.cd>0?' · перезаряд '+me.cd.toFixed(1)+' с':' · готово'); } $('bScope').classList.toggle('on',scp);
  let m=G.msgT>0?G.msg:''; if(G.aimed&&!me.dead&&duel) m='На тебе цілиться Бабка — ховайся!';  if(!m){ if(me.batt<=0) m='Заряд скінчився'+(duel?'':'. Натисни «На старт»'); else if(me.batt<.15) m='Заряд на межі — шукай блакитну зарядку'; else if(me.prop<30) m='Гвинти побиті — на блакитній зарядці їх полагодять'; else if(Math.abs(me.p.x)>W.LIM||Math.abs(me.p.z)>W.LIM) m='Сигнал слабшає — вертайся'; else if(me.corn) m='У кукурудзі: стебла гальмують'; else if(inFog(me.p)) m='Туман: видно метрів на двадцять'; else if(inCloud(me.p)) m='У хмарі нічого не видно'; else if(inSmoke(me.p)) m='Дим від пожежі: нічого не видно'; else if(me.p.y>TOPY-1.2) m='Стеля: вище за найвищу вежу не злетіти'; }
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
function ui(){ const play=G.mode==='play'; if(autoBig&&!play) setBig(false); document.body.classList.toggle('m',!play); ov.hidden=play; $('bHome').hidden=!play||G.kind!=='free'; $('bMenu').hidden=G.mode==='menu'; $('bMenu').textContent=inRoom||G.mode==='room'?'Вийти з кімнати':'Меню'; $('hL').hidden=$('map').hidden=!play;
  $('bFire').hidden=!play||G.kind==='free'; $('bFire').textContent=me.ch===2?'ГАРПУН':'ВОГОНЬ'; $('bDash').hidden=!play||me.ch!==2; $('bScope').hidden=!play||me.ch!==9; if(!play){ scopeOff(); scEl.hidden=true; } if(!play){ $('hT').hidden=$('aim').hidden=true; for(const e of tagEls) e.hidden=true; } $('tag').hidden=true;
  if(play){ setTimeout(resize,30); return; }
  const bar=(l,v)=>'<span>'+l+'</span><i style="--w:'+Math.round(clamp(v,.08,1)*100)+'%"></i>';
  if(G.mode==='menu'){
    card.innerHTML=(glOK?'':'<p>Цей пристрій не показує 3D у цьому вікні.</p>')+'<span class="k">Бій дронів над фермою · версія '+VER+'</span><h3>Обери дрон</h3><div class="chars">'+DR.map((p,i)=>'<button data-ch="'+i+'" class="'+(i===myCh?'on':'')+'"><b>'+p.n+'</b><em>'+p.w+'</em><div class="stats">'+bar('Швидкість',p.vmax/26.5)+bar('Маневр',p.rate/432)+bar('Заряд',p.hov/240)+bar('Проти вітру',1-(p.cda/p.m)/.085)+bar('Тиша',1-p.loud*.9)+bar('Гвинти',p.pt/1.6)+'</div></button>').join('')+'</div>'+(p=>'<div class="stats selst">'+bar('Швидкість',p.vmax/26.5)+bar('Маневр',p.rate/432)+bar('Заряд',p.hov/240)+bar('Проти вітру',1-(p.cda/p.m)/.085)+bar('Тиша',1-p.loud*.9)+bar('Гвинти',p.pt/1.6)+'</div>')(DR[myCh])+'<p>'+DR[myCh].d+' <b style="color:var(--star)">'+DR[myCh].wd+'</b></p>'+
      '<div class="rules">'+Object.keys(RULES).map(k=>'<button data-rule="'+k+'" class="'+(k===myRule?'on':'')+'">'+RULES[k].n+'</button>').join('')+'</div><p class="rd">'+RULES[myRule].d+'</p><div class="btns"><button id="mHost">Кімната для друзів (до 6)</button><button class="sec" id="mBot">Проти комп\'ютера</button><button class="sec" id="mFree">Вільний політ</button></div><p class="rd">У кімнату друзі заходять за одним посиланням. Команду, дрон і режим обираєте вже всередині; можна додати комп\'ютерів і грати до 3 на 3.</p>';
    card.querySelectorAll('button[data-ch]').forEach(b=>b.onclick=()=>{ myCh=+b.dataset.ch; try{localStorage.setItem('pz_dr_ch',myCh);}catch(e){} ui(); });
    card.querySelectorAll('button[data-rule]').forEach(b=>b.onclick=()=>{ myRule=b.dataset.rule; try{localStorage.setItem('pz_dr_rule',myRule);}catch(e){} ui(); });
    $('mHost').onclick=()=>{ audioInit(); hostGame(); };
    $('mBot').onclick=()=>{ audioInit(); start(soloCfg('bot',myRule,myCh,Math.floor(Math.random()*5))); }; $('mFree').onclick=()=>{ audioInit(); start(soloCfg('free','duel',myCh,0)); };
    if(!glOK) card.querySelectorAll('.btns button').forEach(b=>b.disabled=true);
  } else if(G.mode==='room'){ const url=location.origin+location.pathname+'?g='+code;
    if(netState==='err'){ card.innerHTML='<h3>Не вийшло</h3><p>'+G.netMsg+'</p><div class="btns"><button id="lBack">У меню</button></div>'; }
    else if(netState==='join'||netState==='open'){ card.innerHTML='<span class="k">Кімната '+code+'</span><h3>'+(netState==='join'?'Заходимо в кімнату…':'Створюємо кімнату…')+'</h3><p>Це займає кілька секунд.</p><div class="btns"><button class="sec" id="lBack">Назад</button></div>'; }
    else { const teams=R.fmt==='teams', meP=R.P.find(q=>q.id===myId)||{ch:myCh,team:0}, taken=teams?R.P.filter(q=>q.id!==myId&&q.team===meP.team).map(q=>q.ch):[], why=canStart();
      let h='<span class="k">Кімната '+code+' · людей: '+R.P.filter(q=>!q.bot).length+' / 6</span>'+(G.res?'<h3>'+G.res+'</h3>':'<h3>'+(isHost?'Збери друзів і тисни «Старт»':'Ти в кімнаті')+'</h3>');
      h+='<div class="plist">'+R.P.map(q=>'<div><i style="background:'+hex(teams?TEAMC[q.team]:FFAC[q.id%6])+'"></i><b>'+(q.bot?'Комп\'ютер '+(q.id-5):'Гравець '+(q.id+1)+(q.id===myId?' — ти':'')+(q.id===0?' · господар':''))+'</b><span>'+DR[q.ch].n+(teams?' · '+TEAMN[q.team]:'')+'</span>'+(q.bot&&isHost&&!R.playing?'<button class="mini" data-rcyc="'+q.id+'" title="інший дрон">↻</button><button class="mini" data-rdel="'+q.id+'" title="прибрати">✕</button>':'')+'</div>').join('')+'</div>';
      if(R.playing) h+='<p>Зараз іде бій. Наступний почнеться, щойно цей закінчиться.</p>';
      else { h+='<p class="rl">Твій дрон</p><div class="rules">'+DR.map((p,i)=>'<button data-rch="'+i+'" class="'+(i===meP.ch?'on':'')+'"'+(taken.includes(i)?' disabled':'')+'>'+p.n+'</button>').join('')+'</div>';
        if(teams) h+='<p class="rl">Твоя команда</p><div class="rules">'+TEAMN.map((n,i)=>'<button data-rteam="'+i+'" class="'+(i===meP.team?'on':'')+'"'+(i===meP.team?' style="background:'+hex(TEAMC[i])+';border-color:'+hex(TEAMC[i])+';color:#fff"':'')+'>'+n+'</button>').join('')+'</div>';
        if(isHost&&teams) h+='<p class="rl">Комп\'ютери</p><div class="rules">'+TEAMN.map((n,i)=>'<button data-rbot="'+i+'"'+(botOk(i)?'':' disabled')+'>+ до «'+n+'»</button>').join('')+'</div><p class="rd">У команді з людьми — один комп\'ютер; у команді без людей — до трьох.</p>';
        if(isHost) h+='<p class="rl">Бій</p><div class="rules">'+[['teams','Команди'],['ffa','Кожен за себе']].map(f=>'<button data-rfmt="'+f[0]+'" class="'+(R.fmt===f[0]?'on':'')+'">'+f[1]+'</button>').join('')+'</div><div class="rules">'+Object.keys(RULES).map(k=>'<button data-rrule="'+k+'" class="'+(k===R.rule?'on':'')+'"'+(k==='base'&&!teams?' disabled':'')+'>'+RULES[k].n+'</button>').join('')+'</div><p class="rd">'+RULES[R.rule].d+'</p>';
        else h+='<p class="rd">'+(teams?'Команди':'Кожен за себе')+' · '+RULES[R.rule].n+'. '+RULES[R.rule].d+'<br>Чекаємо, поки господар натисне «Старт».</p>'; }
      h+='<div class="link" id="lUrl">'+url+'</div><div class="btns">'+(isHost&&!R.playing?'<button id="rStart"'+(why?' disabled':'')+'>Старт</button>':'')+(navigator.share?'<button class="sec" id="lShare">Запросити</button>':'')+'<button class="sec" id="lCopy">Скопіювати посилання</button><button class="sec" id="lBack">Вийти</button></div>'+(isHost&&!R.playing&&why?'<p class="rd">'+why+'</p>':'');
      card.innerHTML=h;
      card.querySelectorAll('button[data-rch]').forEach(b=>b.onclick=()=>{ audioInit(); myCh=+b.dataset.rch; try{localStorage.setItem('pz_dr_ch',myCh);}catch(e){} if(isHost) roomPick(0,myCh,null); else send({t:'pick',ch:myCh},0); });
      card.querySelectorAll('button[data-rteam]').forEach(b=>b.onclick=()=>{ audioInit(); const t=+b.dataset.rteam; if(isHost) roomPick(0,null,t); else send({t:'pick',team:t},0); });
      card.querySelectorAll('button[data-rbot]').forEach(b=>b.onclick=()=>botAdd(+b.dataset.rbot)); card.querySelectorAll('button[data-rdel]').forEach(b=>b.onclick=()=>botDel(+b.dataset.rdel)); card.querySelectorAll('button[data-rcyc]').forEach(b=>b.onclick=()=>botCyc(+b.dataset.rcyc));
      card.querySelectorAll('button[data-rfmt]').forEach(b=>b.onclick=()=>roomSet(b.dataset.rfmt,null)); card.querySelectorAll('button[data-rrule]').forEach(b=>b.onclick=()=>roomSet(null,b.dataset.rrule));
      const rs=$('rStart'); if(rs) rs.onclick=()=>{ audioInit(); hostStartMatch(); };
      const cp=$('lCopy'); cp.onclick=()=>{ const sel=()=>{ const r=document.createRange(); r.selectNodeContents($('lUrl')); const s=getSelection(); s.removeAllRanges(); s.addRange(r); cp.textContent='Виділено — скопіюй'; }; try{ navigator.clipboard.writeText(url).then(()=>{cp.textContent='Скопійовано';},sel); }catch(e){ sel(); } };
      const sh=$('lShare'); if(sh) sh.onclick=()=>{ try{ navigator.share({title:'Дрони над фермою',text:'Заходь у кімнату, політаємо:',url:url}).catch(()=>{}); }catch(e){} }; }
    $('lBack').onclick=()=>{ netClose(); G.mode='menu'; G.res=''; ui(); };
  } else if(G.mode==='over'){ const bot=D.find(d=>d.bot)||me;
    card.innerHTML='<span class="k">'+RULES[G.rule].n+' · '+DR[me.ch].n+' проти: '+DR[bot.ch].n+'</span><h3>'+(G.win?'Перемога!':'Поразка')+'</h3><p class="code">'+G.res.replace(/^(Перемога! |Поразка\. )/,'')+'</p><div class="btns"><button id="oAgain">Реванш</button><button class="sec" id="oMenu">У меню</button></div>';
    $('oAgain').onclick=()=>start(soloCfg('bot',G.rule,me.ch,bot.ch)); $('oMenu').onclick=()=>{ G.mode='menu'; ui(); }; }
  setTimeout(resize,30); }
/* джойстики */
const st={}, SR=55;
function loc(e){ const r=$('stage').getBoundingClientRect(), rot=document.body.classList.contains('rot'); return rot?{x:e.clientY-r.top,y:r.right-e.clientX,w:r.height,h:r.width}:{x:e.clientX-r.left,y:e.clientY-r.top,w:r.width,h:r.height}; }
cv.addEventListener('pointerdown',e=>{ if(G.mode!=='play')return; e.preventDefault(); audioInit(); if(e.pointerType==='mouse'){ if(e.button===2) scopeToggle(); else { I.fire=true; I.fireTap=true; } return; } const l=loc(e), side=l.x<l.w/2?'L':'R'; if(st[side])return; st[side]={id:e.pointerId,x:l.x,y:l.y}; document.body.classList.add('used'); const el=$('s'+side); el.hidden=false; el.style.left=l.x+'px'; el.style.top=l.y+'px'; el.firstChild.style.transform=''; try{cv.setPointerCapture(e.pointerId);}catch(_){}} );
cv.addEventListener('pointermove',e=>{ for(const side of ['L','R']){ const s=st[side]; if(!s||s.id!==e.pointerId) continue; const l=loc(e); let dx=(l.x-s.x)/SR, dy=(l.y-s.y)/SR; const m=Math.hypot(dx,dy); if(m>1){dx/=m;dy/=m;} $('s'+side).firstChild.style.transform='translate('+dx*SR*.6+'px,'+dy*SR*.6+'px)';
    const dz=v=>Math.abs(v)<.12?0:(v-Math.sign(v)*.12)/.88; if(side==='L'){ I.mx=dz(dx); I.my=dz(-dy); } else { I.yaw=dz(dx); I.alt=dz(-dy); } } });
const pUp=e=>{ if(e.pointerType==='mouse') I.fire=false; for(const side of ['L','R']){ const s=st[side]; if(s&&s.id===e.pointerId){ st[side]=null; $('s'+side).hidden=true; if(side==='L'){I.mx=I.my=0;} else {I.yaw=I.alt=0;} } } };
cv.addEventListener('pointerup',pUp); cv.addEventListener('pointercancel',pUp); cv.addEventListener('contextmenu',e=>e.preventDefault());
function holdBtn(id,k){ const el=$(id), dn=e=>{e.preventDefault(); audioInit(); I[k]=true; if(k==='fire') I.fireTap=true; if(k==='dash') I.dashTap=true; try{el.setPointerCapture(e.pointerId);}catch(_){}} , up=()=>{I[k]=false;}; el.addEventListener('pointerdown',dn); el.addEventListener('pointerup',up); el.addEventListener('pointercancel',up); el.addEventListener('lostpointercapture',up); el.addEventListener('contextmenu',e=>e.preventDefault()); }
holdBtn('bFire','fire'); holdBtn('bDash','dash');
const KM={KeyW:'w',KeyS:'s',KeyA:'a',KeyD:'d',ArrowLeft:'left',ArrowRight:'right',ArrowUp:'aup',ArrowDown:'adn',KeyQ:'left',KeyE:'right',Space:'up',ShiftLeft:'down',ShiftRight:'down',KeyF:'fire',KeyC:'dash'};
window.addEventListener('keydown',e=>{ if(G.mode!=='play')return; const k=KM[e.code]; if(k){ if(k==='fire'&&!key.fire) I.fireTap=true; if(k==='dash'&&!key.dash) I.dashTap=true; key[k]=true;e.preventDefault();audioInit();} else if(e.code==='KeyR'&&G.kind==='free'){ spawn(me,FREE); me.batt=1; } else if(e.code==='KeyX'){ e.preventDefault(); scopeToggle(); } });
window.addEventListener('keyup',e=>{ const k=KM[e.code]; if(k) key[k]=false; }); window.addEventListener('blur',()=>{ for(const k in key) key[k]=false; I.fire=I.dash=false; });
$('bHome').onclick=()=>{ spawn(me,FREE); say('На старті, заряд повний',2); };
$('bMenu').onclick=()=>{ netClose(); G.mode='menu'; G.res=''; ui(); };
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
  else { G.t+=dt; if(G.mode==='menu'||G.mode==='room'){ birdPos(); skyStep(); cam.position.set(Math.sin(G.t*.08)*90,38,Math.cos(G.t*.08)*90+10); cam.lookAt(0,6,-10); } netFrame(dt); }
  if(renderer) renderer.render(scene,cam); audioFrame(); requestAnimationFrame(frame); }
new ResizeObserver(resize).observe(cv); resize(); ui(); if(invite&&glOK) joinGame(invite); requestAnimationFrame(frame);
if(isLoc) window.__d={get me(){return me;},get foe(){return foe;},get D(){return D;},G:G,I:I,W:W,DR:DR,R:R,BASE:BASE,step:step,start:start,soloCfg:soloCfg,place:place,hud:hud,net:()=>({room:inRoom,host:isHost,id:myId,code:code,st:netState,msg:G.netMsg,n:R.P.length}),PK:PK,FL:FL,flagM:flagM,PSP:PSP,FSP:FSP,BSP:BSP,BIRDS:BIRDS,CLD:CLD,inCloud:inCloud,fogStart:fogStart,murk:murk,pkAdd:pkAdd,fireState:(x,z)=>{ const c=cellAt(x,z); return c<0?0:fireT[c]; },cornAt:cornAt,hayState:()=>Array.from(hayT),blocked:blocked,fA:fA,fireN:()=>[burning.length,Array.from(fireT).filter(v=>v<0).length,Array.from(hayT).filter(v=>v!==0).length]};
})();
