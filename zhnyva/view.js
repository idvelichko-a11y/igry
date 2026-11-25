/* Жнива-ліга — вигляд: сцена, машини, м'яч, глядачі-соняшники, частинки, камера. */
(function(){
"use strict";
const Z=window.ZL, F=Z.F, MACH=Z.MACH, clamp=Z.clamp, T=THREE, RAD=Math.PI/180;
const coarse=(()=>{try{return matchMedia('(pointer:coarse)').matches;}catch(e){return false;}})();
const TEAMC=[0x2F7FD6,0xF08A2B], TEAMD=[0x1B4F8C,0xA3540F];
let renderer=null, scene, cam, glOK=true, cv;
const V={ok:true,shake:0,camH:0,camMode:0,slow:1,t:0,TEAMC:TEAMC};
const lam=(c,o)=>new T.MeshLambertMaterial(Object.assign({color:c},o||{})), bas=(c,o)=>new T.MeshBasicMaterial(Object.assign({color:c},o||{}));
function box(w,h,d,m,x,y,z,par){ const g=new T.Mesh(new T.BoxGeometry(w,h,d),m); g.position.set(x||0,y||0,z||0); if(par) par.add(g); return g; }
function cyl(r1,r2,h,n,m,x,y,z,par){ const g=new T.Mesh(new T.CylinderGeometry(r1,r2,h,n),m); g.position.set(x||0,y||0,z||0); if(par) par.add(g); return g; }
function canvasTex(w,h,fn){ const c=document.createElement('canvas'); c.width=w; c.height=h; fn(c.getContext('2d'),w,h); const t=new T.CanvasTexture(c); t.anisotropy=4; return t; }

/* ---------- частинки ---------- */
const PV='attribute float size; attribute vec4 col; varying vec4 vc; uniform float sc; void main(){ vc=col; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*sc/max(1.0,-mv.z); gl_Position=projectionMatrix*mv; }';
const PF='varying vec4 vc; void main(){ float d=length(gl_PointCoord-0.5); if(d>0.5) discard; gl_FragColor=vec4(vc.rgb,vc.a*smoothstep(0.5,0.15,d)); }';
const PFQ='varying vec4 vc; void main(){ gl_FragColor=vc; }';
function PSys(n,blend,square){ const g=new T.BufferGeometry(), pos=new Float32Array(n*3), col=new Float32Array(n*4), siz=new Float32Array(n); g.setAttribute('position',new T.BufferAttribute(pos,3)); g.setAttribute('col',new T.BufferAttribute(col,4)); g.setAttribute('size',new T.BufferAttribute(siz,1));
  const m=new T.ShaderMaterial({vertexShader:PV,fragmentShader:square?PFQ:PF,uniforms:{sc:{value:600}},transparent:true,depthWrite:false,blending:blend}); const pts=new T.Points(g,m); pts.frustumCulled=false;
  const P=[]; for(let i=0;i<n;i++) P.push({l:0,L:1,x:0,y:0,z:0,vx:0,vy:0,vz:0,s:1,g:0,r:1,gg:1,b:1,a:1,dr:0,gr:0}); let k=0;
  return {pts:pts,m:m,emit(x,y,z,vx,vy,vz,L,s,r,gg,b,a,grav,drag,grow){ const q=P[k]; k=(k+1)%n; q.x=x;q.y=y;q.z=z;q.vx=vx;q.vy=vy;q.vz=vz;q.l=L;q.L=L;q.s=s;q.r=r;q.gg=gg;q.b=b;q.a=a==null?1:a;q.g=grav||0;q.dr=drag||0;q.gr=grow||0; },
    step(dt){ for(let i=0;i<n;i++){ const q=P[i]; if(q.l<=0){ siz[i]=0; continue; } q.l-=dt; const f=Math.exp(-q.dr*dt); q.vx*=f; q.vy=q.vy*f-q.g*dt; q.vz*=f; q.x+=q.vx*dt; q.y+=q.vy*dt; q.z+=q.vz*dt; if(q.y<.05&&q.g>0){ q.y=.05; q.vy*=-.3; q.vx*=.6; q.vz*=.6; }
        const u=Math.max(0,q.l/q.L); pos[i*3]=q.x; pos[i*3+1]=q.y; pos[i*3+2]=q.z; col[i*4]=q.r; col[i*4+1]=q.gg; col[i*4+2]=q.b; col[i*4+3]=q.a*Math.min(1,u*2.2); siz[i]=q.s*(1+q.gr*(1-u)); }
      g.attributes.position.needsUpdate=true; g.attributes.col.needsUpdate=true; g.attributes.size.needsUpdate=true; } }; }
let dust, glow, conf;
const rnd=(a)=>(Math.random()-.5)*a;

/* ---------- поле ---------- */
const crowd={n:0,stem:null,head:null,pet:null,P:[],amp:0}, pads=[], rings=[];
let ballM, ballSh, ballRing, ballGlow, goalNets=[], ballPulse=0, skid=null, skidI=0; const SKN=260;
function buildField(){
  scene.background=new T.Color(0x9FCDEA); scene.fog=new T.Fog(0xB9DAEE,170,430);
  scene.add(new T.HemisphereLight(0xFFFFFF,0x8A8F6A,.78)); const sun=new T.DirectionalLight(0xFFF2D6,.6); sun.position.set(-60,120,40); scene.add(sun);
  const out=new T.Mesh(new T.PlaneGeometry(1400,1400),lam(0x9DB86A)); out.rotation.x=-Math.PI/2; out.position.y=-.06; scene.add(out);
  const W=F.FL*2+F.GD*2, D=F.FW*2, tex=canvasTex(1024,640,(x,w,h)=>{ const px=w/W, pz=h/D, ox=w/2, oz=h/2;
    for(let i=0;i<16;i++){ x.fillStyle=i%2?'#B5A452':'#C0AF5B'; x.fillRect(i*w/16,0,w/16+1,h); }
    x.globalAlpha=.16; for(let i=0;i<5200;i++){ x.fillStyle=Math.random()<.5?'#8A7636':'#F0E2A0'; x.fillRect(Math.random()*w,Math.random()*h,1.2,2+Math.random()*4); } x.globalAlpha=1;
    x.strokeStyle='#FFFFFF'; x.lineWidth=3; x.globalAlpha=.9; const L=(a,b,c,d)=>{ x.beginPath(); x.moveTo(ox+a*px,oz+b*pz); x.lineTo(ox+c*px,oz+d*pz); x.stroke(); };
    L(0,-F.FW,0,F.FW); x.beginPath(); x.ellipse(ox,oz,11*px,11*pz,0,0,7); x.stroke(); for(const s of [-1,1]){ x.strokeRect(ox+(s>0?F.FL-16:-F.FL)*px,oz-19*pz,16*px,38*pz); x.strokeRect(ox+(s>0?F.FL-6:-F.FL)*px,oz-F.GW*pz,6*px,F.GW*2*pz);
      x.fillStyle=s<0?'rgba(47,127,214,.28)':'rgba(240,138,43,.28)'; x.fillRect(ox+(s>0?F.FL:-F.FL-F.GD)*px,oz-F.GW*pz,F.GD*px,F.GW*2*pz); } x.globalAlpha=1; });
  const fl=new T.Mesh(new T.PlaneGeometry(W,D),new T.MeshBasicMaterial({map:tex})); fl.rotation.x=-Math.PI/2; scene.add(fl);
  /* борти з тюків соломи */
  const btex=canvasTex(128,64,(x,w,h)=>{ x.fillStyle='#D8B95A'; x.fillRect(0,0,w,h); x.globalAlpha=.35; for(let i=0;i<500;i++){ x.fillStyle=Math.random()<.5?'#A8862E':'#F2DE8E'; x.fillRect(Math.random()*w,Math.random()*h,6+Math.random()*10,1.3); } x.globalAlpha=1; x.strokeStyle='#7A5F22'; x.lineWidth=3; x.strokeRect(1,1,w-2,h-2); x.fillStyle='#5E7FA0'; x.fillRect(0,18,w,3); x.fillRect(0,44,w,3); });
  btex.wrapS=btex.wrapT=T.RepeatWrapping; const WH=3.2, net=canvasTex(64,64,(x,w,h)=>{ x.clearRect(0,0,w,h); x.strokeStyle='rgba(255,255,255,.55)'; x.lineWidth=2; x.strokeRect(0,0,w,h); });
  net.wrapS=net.wrapT=T.RepeatWrapping;
  const wall=(x0,z0,x1,z1)=>{ const len=Math.hypot(x1-x0,z1-z0), t=btex.clone(); t.needsUpdate=true; t.repeat.set(len/4,1.5); const m=new T.Mesh(new T.BoxGeometry(len,WH,2),new T.MeshLambertMaterial({map:t})); const ang=Math.atan2(z1-z0,x1-x0), nx=-Math.sin(ang), nz=Math.cos(ang), mx=(x0+x1)/2, mz=(z0+z1)/2, sg=(mx*nx+mz*nz)>0?1:-1; m.position.set(mx+nx*sg,WH/2,mz+nz*sg); m.rotation.y=-ang; scene.add(m);
    const tn=net.clone(); tn.needsUpdate=true; tn.repeat.set(len/3,3); const n=new T.Mesh(new T.PlaneGeometry(len,9),new T.MeshBasicMaterial({map:tn,transparent:true,opacity:.2,side:T.DoubleSide,depthWrite:false})); n.position.set(mx,WH+4.5,mz); n.rotation.y=-ang; scene.add(n); };
  const cx=F.FL-F.CH, cz=F.FW-F.CH; for(const s of [-1,1]){ wall(-cx,s*F.FW,cx,s*F.FW); wall(s*F.FL,-cz,s*F.FL,-F.GW); wall(s*F.FL,F.GW,s*F.FL,cz); for(const q of [-1,1]) wall(s*cx,q*F.FW,s*F.FL,q*cz); }
  /* ворота-ангари */
  for(const s of [-1,1]){ const col=s<0?TEAMC[0]:TEAMC[1], m=lam(col), g=new T.Group(); for(const q of [-1,1]) box(.7,F.GH,.7,m,0,F.GH/2,q*(F.GW+.35),g); box(.7,.7,F.GW*2+1.4,m,0,F.GH+.35,0,g);
      const roof=lam(0xC8CED2); box(F.GD,.3,F.GW*2+1.4,roof,F.GD/2*s,F.GH+.8,0,g); const tn=net.clone(); tn.needsUpdate=true; tn.repeat.set(10,5); const nm=new T.MeshBasicMaterial({map:tn,transparent:true,opacity:.55,side:T.DoubleSide,depthWrite:false,color:col});
      const back=new T.Mesh(new T.PlaneGeometry(F.GW*2,F.GH),nm); back.rotation.y=Math.PI/2; back.position.set(F.GD*s,F.GH/2,0); g.add(back); for(const q of [-1,1]){ const sd=new T.Mesh(new T.PlaneGeometry(F.GD,F.GH),nm); sd.position.set(F.GD/2*s,F.GH/2,q*F.GW); g.add(sd); }
      g.position.x=s*F.FL; scene.add(g); goalNets.push(nm); }
  /* заправки */
  const padTex=canvasTex(64,64,(x)=>{ const g=x.createRadialGradient(32,32,4,32,32,30); g.addColorStop(0,'rgba(255,240,170,1)'); g.addColorStop(.6,'rgba(255,190,60,.8)'); g.addColorStop(1,'rgba(255,170,40,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); });
  Z.PADS.forEach(p=>{ const g=new T.Group(), r=p[2]?2.6:1.6, d=new T.Mesh(new T.CircleGeometry(r,20),new T.MeshBasicMaterial({map:padTex,transparent:true,depthWrite:false})); d.rotation.x=-Math.PI/2; d.position.y=.06; g.add(d);
    const can=new T.Group(); box(p[2]?.9:.55,p[2]?1.2:.75,p[2]?.5:.32,lam(0xD9A520),0,0,0,can); box(.2,.16,.2,lam(0x333333),p[2]?.25:.15,p[2]?.68:.44,0,can); can.position.y=p[2]?1.5:1; g.add(can); g.userData.can=can; g.position.set(p[0],0,p[1]); scene.add(g); pads.push(g); });
  /* трибуни з соняшниками */
  const stand=lam(0x6E7B53), tiers=5; const spots=[];
  const row=(x0,z0,x1,z1,ox,oz)=>{ const len=Math.hypot(x1-x0,z1-z0), n=Math.floor(len/2.3); for(let t=0;t<tiers;t++){ const off=5+t*2.6, h=1.2+t*1.5; const m=box(len,h,2.6,stand,(x0+x1)/2+ox*off,h/2,(z0+z1)/2+oz*off); m.rotation.y=-Math.atan2(z1-z0,x1-x0); scene.add(m);
      for(let i=0;i<n;i++){ if(Math.random()<(coarse?.55:.2)) continue; const u=(i+.5)/n; spots.push([x0+(x1-x0)*u+ox*off+rnd(.5),h,z0+(z1-z0)*u+oz*off+rnd(.5)]); } } };
  row(-cx,-F.FW,cx,-F.FW,0,-1); row(-cx,F.FW,cx,F.FW,0,1); for(const s of [-1,1]) for(const q of [-1,1]){ row(s*F.FL,q*F.GW+q*3,s*F.FL,q*cz,s,0); }
  const n=spots.length; crowd.n=n; crowd.stem=new T.InstancedMesh(new T.CylinderGeometry(.07,.09,1,5),lam(0x4E8A3A),n); crowd.head=new T.InstancedMesh(new T.CylinderGeometry(.42,.42,.12,10),lam(0x5A3A1C),n); crowd.pet=new T.InstancedMesh(new T.CylinderGeometry(.78,.78,.06,10),lam(0xF4C81E),n);
  for(const s of spots) crowd.P.push({x:s[0],y:s[1],z:s[2],h:1.5+Math.random()*1.1,ph:Math.random()*6.28}); scene.add(crowd.stem); scene.add(crowd.head); scene.add(crowd.pet); crowd.stem.frustumCulled=crowd.head.frustumCulled=crowd.pet.frustumCulled=false;
  /* далина: елеватор, комора, дерева */
  const far=lam(0xC9D2D6); for(let i=0;i<4;i++) cyl(7,7,34,12,far,-150+i*16,17,-150,scene); box(20,46,14,lam(0xB5BEC3),-170,23,-150,scene); box(60,16,26,lam(0xA5553B),150,8,-140,scene); box(64,3,30,lam(0x6B4A3A),150,17.5,-140,scene);
  const tm=lam(0x4F8A45), tr=lam(0x6B4A2E); for(let i=0;i<46;i++){ const a=i/46*6.28+rnd(.1), R=150+Math.random()*90, x=Math.cos(a)*R*1.25, z=Math.sin(a)*R; cyl(.7,.9,5,6,tr,x,2.5,z,scene); const c=new T.Mesh(new T.ConeGeometry(5+Math.random()*3,13+Math.random()*7,7),tm); c.position.set(x,12,z); scene.add(c); }
  const fields=[0xD9C46A,0x86A84E,0xE0B840,0x7C9A4A,0xC2A85A]; for(let i=0;i<14;i++){ const a=i/14*6.28, R=230+Math.random()*120, p=new T.Mesh(new T.PlaneGeometry(120+Math.random()*80,90+Math.random()*60),lam(fields[i%5])); p.rotation.x=-Math.PI/2; p.rotation.z=Math.random(); p.position.set(Math.cos(a)*R,-.03,Math.sin(a)*R); scene.add(p); }
  /* м'яч */
  const bt=canvasTex(256,128,(x,w,h)=>{ x.fillStyle='#F4F4F0'; x.fillRect(0,0,w,h); x.fillStyle='#22292C'; for(let i=0;i<8;i++) for(let j=0;j<4;j++){ if((i+j)%2) continue; x.beginPath(); x.ellipse((i+.5)*w/8,(j+.5)*h/4,w/8*.3,h/4*.36,0,0,7); x.fill(); } });
  ballM=new T.Mesh(new T.SphereGeometry(F.BR,24,16),new T.MeshLambertMaterial({map:bt})); scene.add(ballM);
  const shT=canvasTex(64,64,(x)=>{ const g=x.createRadialGradient(32,32,2,32,32,30); g.addColorStop(0,'rgba(0,0,0,.6)'); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle=g; x.fillRect(0,0,64,64); });
  V.shMat=new T.MeshBasicMaterial({map:shT,transparent:true,depthWrite:false}); ballSh=new T.Mesh(new T.CircleGeometry(1,18),V.shMat); ballSh.rotation.x=-Math.PI/2; scene.add(ballSh);
  ballRing=new T.Mesh(new T.RingGeometry(1.5,1.75,28),bas(0xFFFFFF,{transparent:true,opacity:.7,side:T.DoubleSide,depthWrite:false})); ballRing.rotation.x=-Math.PI/2; scene.add(ballRing);
  ballGlow=new T.Mesh(new T.SphereGeometry(F.BR*1.12,16,10),bas(0xFFFFFF,{transparent:true,opacity:0,depthWrite:false,blending:T.AdditiveBlending})); scene.add(ballGlow);
  skid=new T.InstancedMesh(new T.PlaneGeometry(1,1),bas(0x4A3F22,{transparent:true,opacity:.42,depthWrite:false}),SKN); skid.frustumCulled=false; for(let i=0;i<SKN;i++){ tm4.makeScale(0,0,0); skid.setMatrixAt(i,tm4); } scene.add(skid);
  dust=PSys(coarse?350:700,T.NormalBlending); glow=PSys(coarse?300:600,T.AdditiveBlending); conf=PSys(coarse?200:420,T.NormalBlending,true); scene.add(dust.pts); scene.add(glow.pts); scene.add(conf.pts); }

/* ---------- машини ---------- */
function wheel(r,w,par,x,y,z,arr){ const g=new T.Group(), tm=lam(0x1E2224), hm=lam(0xE8E2C8); const t=cyl(r,r,w,14,tm,0,0,0,g); t.rotation.x=Math.PI/2; const h=cyl(r*.5,r*.5,w+.06,8,hm,0,0,0,g); h.rotation.x=Math.PI/2; for(let i=0;i<4;i++){ const lug=box(r*.3,r*2.02,w*.9,tm,0,0,0,g); lug.rotation.z=i*Math.PI/4; } g.position.set(x,y,z); par.add(g); arr.push(g); return g; }
function carMesh(ch,team){ const M=MACH[ch], root=new T.Group(), body=new T.Group(), col=TEAMC[team], cm=lam(col), dm=lam(TEAMD[team]), dk=lam(0x2A2F33), gl=new T.MeshLambertMaterial({color:0x9FD3F0,transparent:true,opacity:.6}), U=root.userData; root.add(body); U.body=body; U.wheels=[]; U.front=[]; U.M=M; U.ex=[];
  const L=M.hl*2, Wd=M.hw*2, H=M.hh;
  if(M.sp==='boom'){ const wr=.78; box(L*.92,.75,Wd*.78,cm,0,wr+.35,0,body); box(L*.34,.9,Wd*.5,dk,-L*.3,wr+1.05,Wd*.1,body); box(1.25,1.25,Wd*.42,gl,.1,wr+1.3,-Wd*.26,body); box(1.35,.12,Wd*.46,cm,.1,wr+1.98,-Wd*.26,body);
    for(const sx of [-1,1]) for(const sz of [-1,1]){ const w=wheel(wr,.55,root,sx*L*.33,wr,sz*(M.hw-.1),U.wheels); if(sx>0) U.front.push(w); }
    const piv=new T.Group(); piv.position.set(-1.1,2.25,0); body.add(piv); const outer=box(3.4,.42,.42,dm,1.7,0,0,piv); const inner=new T.Group(); piv.add(inner); const ib=box(1,.3,.3,lam(0xD8DCDD),.5,0,0,inner); const plate=new T.Group(); piv.add(plate); box(.25,1.5,1.9,dk,0,0,0,plate); for(const q of [-1,1]) box(1.3,.12,.22,dk,.6,-.7,q*.6,plate);
    U.piv=piv; U.inner=inner; U.plate=plate; U.exPos=[-L*.42,wr+1.6,Wd*.3]; }
  else if(M.sp==='hdr'){ const wr=1.15; box(L*.82,1.9,Wd*.92,cm,-.2,wr+1.15,0,body); box(L*.5,.8,Wd*.8,dm,-.6,wr+2.45,0,body); box(1.5,1.5,Wd*.7,gl,L*.33,wr+2.2,0,body); box(1.6,.14,Wd*.74,cm,L*.33,wr+3,0,body); const tube=cyl(.2,.2,3.6,8,lam(0xD8DCDD),-.6,wr+2.7,-Wd*.5-1,body); tube.rotation.x=Math.PI/2.4;
    for(const sz of [-1,1]){ const w=wheel(wr,.8,root,L*.2,wr,sz*(M.hw-.05),U.wheels); const w2=wheel(.7,.5,root,-L*.36,.7,sz*(M.hw-.3),U.wheels); U.front.push(w2); }
    const hd=new T.Group(); hd.position.set(M.hl+.9,0,0); root.add(hd); box(1.6,.9,M.hw2*2,dm,0,.6,0,hd); box(.25,1.25,M.hw2*2,dk,-.75,.8,0,hd); const reel=new T.Group(); reel.position.set(.5,1.15,0); hd.add(reel); for(let i=0;i<5;i++){ const a=i/5*6.28; box(.08,.08,M.hw2*2-.3,lam(0xE8E2C8),Math.cos(a)*.6,Math.sin(a)*.6,0,reel); } for(const q of [-1,0,1]){ const d=cyl(.62,.62,.06,10,dk,0,0,q*(M.hw2-.2),reel); d.rotation.x=Math.PI/2; }
    box(1.2,.5,1.4,dk,M.hl-.2,1.4,0,body); U.hd=hd; U.reel=reel; U.exPos=[-L*.3,wr+3,Wd*.3]; }
  else if(M.trk){ const th=.95, tw=.62; for(const q of [-1,1]){ const z=q*(M.hw-tw/2); box(L*.82,th,tw,dk,0,th/2,z,root); for(const e of [-1,1]){ const cc=cyl(th/2,th/2,tw,12,dk,e*L*.41,th/2,z,root); cc.rotation.x=Math.PI/2; } for(let i=0;i<4;i++){ const w=cyl(.24,.24,tw+.06,8,lam(0xE8E2C8),-L*.3+i*L*.2,.3,z,root); w.rotation.x=Math.PI/2; } box(L*.9,.1,tw+.16,dm,0,th+.06,z,body); }
    box(L*.8,H*.22,Wd*.5,dk,0,th+H*.11,0,body); box(L*.5,H*.3,Wd*.5,cm,L*.16,th+H*.36,0,body); box(.12,H*.26,Wd*.44,dk,L*.42,th+H*.36,0,body); box(L*.36,H*.42,Wd*.56,gl,-L*.22,th+H*.43,0,body); box(L*.4,H*.05,Wd*.62,cm,-L*.22,th+H*.66,0,body); cyl(.07,.07,H*.3,6,dk,L*.3,th+H*.62,Wd*.16,body); U.exPos=[L*.3,th+H*.8,Wd*.16]; }
  else { const rr=H*.37, fr=H*.24, hoodL=L*.52, cabL=L*.4; box(L*.9,H*.2,Wd*.5,dk,0,rr*.95,0,body); box(hoodL,H*.3,Wd*.56,cm,L*.2,rr+H*.2,0,body); box(.12,H*.26,Wd*.5,dk,L*.2+hoodL/2+.05,rr+H*.2,0,body);
    box(cabL,H*.42,Wd*.72,gl,-L*.22,rr+H*.37,0,body); box(cabL+.2,H*.05,Wd*.8,cm,-L*.22,rr+H*.6,0,body); for(const q of [-1,1]) box(cabL*1.1,.1,.5,dm,-L*.24,rr*1.9+.1,q*(M.hw-.05),body);
    const ex=cyl(.07,.07,H*.34,6,dk,L*.3,rr+H*.5,Wd*.2,body); if(ch===2){ box(.5,H*.16,Wd*.9,dk,L*.47,rr*.8,0,body); for(const q of [-1,1]) cyl(.07,.07,H*.34,6,dk,L*.3,rr+H*.5,q*Wd*.2,body); }
    for(const sz of [-1,1]){ wheel(rr,H*.2,root,-L*.26,rr,sz*(M.hw-.02),U.wheels); if(ch===2) wheel(rr,H*.2,root,-L*.26,rr,sz*(M.hw+H*.2),U.wheels); const w=wheel(fr,H*.15,root,L*.32,fr,sz*(M.hw-.08),U.wheels); U.front.push(w); }
    U.exPos=[L*.3,rr+H*.68,Wd*.2]; }
  const sh=new T.Mesh(new T.CircleGeometry(1,16),V.shMat); sh.rotation.x=-Math.PI/2; sh.scale.set(M.hl*1.25,M.hw*1.5,1); scene.add(sh); U.sh=sh;
  const aura=new T.Mesh(new T.SphereGeometry(M.hl*1.25,14,10),bas(0xFFE08A,{transparent:true,opacity:.25,depthWrite:false,blending:T.AdditiveBlending})); aura.position.y=M.hh*.5; aura.visible=false; root.add(aura); U.aura=aura;
  U.pitch=0; U.roll=0; U.pv=0; U.rv=0; U.sus=0; U.sv=0; U.pvf=0; U.spin=0; U.dT=0; scene.add(root); return root; }
function carRemove(m){ if(!m) return; scene.remove(m); if(m.userData.sh) scene.remove(m.userData.sh); }

const tv=new T.Vector3(), tm4=new T.Matrix4(), tq=new T.Quaternion(), te=new T.Euler(), ts=new T.Vector3();
function placeCar(c,dt){ const m=c.mesh; if(!m) return; const U=m.userData, M=U.M, fx=Math.cos(c.h), fz=Math.sin(c.h), vf=c.vx*fx+c.vz*fz;
  const vis=!(c.demoT>0); m.visible=vis; U.sh.visible=vis; if(!vis) return;
  m.position.set(c.x,c.y,c.z); m.rotation.y=-c.h;
  /* кузов гойдається на підвісці: розгін задирає ніс, поворот кренить */
  if(dt>0){ const af=clamp((vf-U.pvf)/dt,-40,40); U.pvf=vf; const tp=clamp(af*.006,-.16,.2)+(c.air?clamp(c.vy*.018,-.3,.3):0), tr=clamp(-vf*c.w*.011,-.24,.24);
    U.pv+=((tp-U.pitch)*90-U.pv*11)*dt; U.pitch+=U.pv*dt; U.rv+=((tr-U.roll)*90-U.rv*10)*dt; U.roll+=U.rv*dt; U.sv+=(-U.sus*140-U.sv*12)*dt; U.sus+=U.sv*dt; }
  if(c.air&&Math.abs(c.wk)>.4){ U.tum=(U.tum||0)+c.wk*2.2*dt; } else if(U.tum){ U.tum*=Math.max(0,1-10*dt); if(Math.abs(U.tum)<.02) U.tum=0; }
  U.body.rotation.set(U.roll+(U.tum||0),0,U.pitch+c.pit+(c.flipT>0?-(1-c.flipT/.5)*6.283:0)); U.body.position.y=clamp(U.sus,-.35,.3);
  if(dt>0&&!c.air&&c.drift>3.2){ U.skT=(U.skT||0)-dt; if(U.skT<=0){ U.skT=.035; for(const q of [-1,1]){ const sx=c.x-fx*M.hl*.55-fz*q*(M.hw-.15), sz=c.z-fz*M.hl*.55+fx*q*(M.hw-.15); te.set(-Math.PI/2,0,Math.atan2(c.vz,c.vx),'YXZ'); te.set(-Math.PI/2,-Math.atan2(c.vz,c.vx),0,'YXZ'); tq.setFromEuler(te); ts.set(1.3,M.hh*.2+.25,1); tv.set(sx,.045,sz); tm4.compose(tv,tq,ts); skid.setMatrixAt(skidI,tm4); skidI=(skidI+1)%SKN; } skid.instanceMatrix.needsUpdate=true; } }
  U.spin+=vf*dt; for(const w of U.wheels){ w.rotation.z=-U.spin/(w.children[0].geometry.parameters.radiusTop||1); } for(const w of U.front) w.rotation.y=-c.st*.5;
  if(U.piv){ const g=Z.boomGeo(c); U.piv.rotation.z=g.ang; const ext=g.len-3.4; U.inner.children[0].position.x=0; U.inner.children[0].scale.x=ext+.4; U.inner.position.x=3.2+(ext+.4)/2-.2; U.plate.position.x=g.len; U.plate.rotation.z=-g.ang*.6; }
  if(U.hd){ U.hd.position.y=c.y*0+.15+c.ext*2.7-.15; U.reel.rotation.z-=(Math.abs(vf)*.5+2)*dt; }
  U.aura.visible=c.ramT>0||!!c.lock; if(U.aura.visible){ U.aura.material.opacity=c.lock?.16+.05*Math.sin(V.t*8):.2+.12*Math.sin(V.t*18); U.aura.material.color.setHex(c.lock?0x9FD0FF:0xFFE08A); }
  U.sh.position.set(c.x,.05,c.z); U.sh.rotation.z=c.h; U.sh.material=V.shMat; const k=1/(1+c.y*.25); U.sh.scale.set(M.hl*1.25*k,M.hw*1.5*k,1);
  /* пил, вихлоп, турбо */
  if(dt>0){ U.dT-=dt; const sp=Math.abs(vf), ground=!c.air; if(U.dT<=0){ U.dT=.03; const bx=c.x-fx*M.hl*.7, bz=c.z-fz*M.hl*.7;
      if(ground&&(c.drift>2.5||(c.inp&&Math.abs(c.inp.thr)>.5&&sp<M.vmax*.45&&sp>.5))){ for(const q of [-1,1]) dust.emit(bx-fz*q*M.hw,.2,bz+fx*q*M.hw,rnd(2)-c.vx*.1,1+Math.random()*1.5,rnd(2)-c.vz*.1,.6+Math.random()*.5,5+M.hw*3,.78,.68,.42,.5,-.5,1.5,1.6); }
      else if(ground&&sp>10&&Math.random()<.35) dust.emit(bx+rnd(M.hw*2),.15,bz+rnd(M.hw*2),rnd(1),.6,rnd(1),.5,4,.8,.72,.48,.3,-.3,1.5,1.4);
      const ex=U.exPos, wx=c.x+fx*ex[0]-fz*ex[2], wz=c.z+fz*ex[0]+fx*ex[2], wy=c.y+ex[1];
      if(c.boosting||c.dashT>0){ for(let i=0;i<3;i++){ glow.emit(c.x-fx*(M.hl+.2)+rnd(.5),c.y+M.hh*.4+rnd(.4),c.z-fz*(M.hl+.2)+rnd(.5),-fx*(8+Math.random()*8)+c.vx*.6+rnd(2),rnd(2),-fz*(8+Math.random()*8)+c.vz*.6+rnd(2),.25+Math.random()*.2,7,1,.55+Math.random()*.3,.15,.9,0,2,.2); }
        dust.emit(wx,wy,wz,rnd(1),3,rnd(1),.5,5,.2,.2,.2,.5,-1,1,1.5); }
      else if(Math.random()<.25+(c.inp?Math.abs(c.inp.thr)*.4:0)) dust.emit(wx,wy,wz,rnd(.6)-c.vx*.05,2+Math.random(),rnd(.6)-c.vz*.05,.6,2.6,.25,.25,.25,.35,-1,1,2); } } }

/* ---------- події → ефекти ---------- */
function burst(sys,n,x,y,z,sp,L,s,r,g,b,grav,up){ for(let i=0;i<n;i++){ const a=Math.random()*6.28, e=Math.random()*1.4-.3, v=sp*(.3+Math.random()*.7); sys.emit(x,y,z,Math.cos(a)*Math.cos(e)*v,Math.sin(e)*v+(up||0),Math.sin(a)*Math.cos(e)*v,L*(.5+Math.random()*.5),s,r,g,b,1,grav,1.2,.3); } }
function ring(x,y,z,col,R,L,flat){ const m=new T.Mesh(new T.RingGeometry(.82,1,36),bas(col,{transparent:true,opacity:.9,side:T.DoubleSide,depthWrite:false,blending:T.AdditiveBlending})); if(flat) m.rotation.x=-Math.PI/2; m.position.set(x,y,z); scene.add(m); rings.push({m:m,t:L,L:L,R:R,flat:flat}); }
function fxEvent(e,S,me){ const near=me?Math.hypot((e.x||0)-me.x,(e.z||0)-me.z):50, c=e.id!=null?S.cars.find(q=>q.id===e.id):null;
  if(e.t==='hit'){ const k=clamp(e.v/22,0.1,1.4); burst(glow,Math.round(5+k*12),e.x,e.y,e.z,6+k*14,.35,1.6+k*1.6,1,.8,.35,6); ballPulse=Math.max(ballPulse,.1+k*.16); burst(dust,Math.round(3+k*6),e.x,Math.max(.2,e.y-.5),e.z,3+k*5,.7,7,.85,.78,.5,-.5); if(k>.55) ring(e.x,e.y,e.z,0xFFF0B0,2+k*4,.28); if(near<40) V.shake=Math.max(V.shake,k*(c===me?.55:.25)); if(c&&c.mesh) c.mesh.userData.sv-=k*2; }
  else if(e.t==='bounce'){ const k=clamp(e.v/20,.1,1); burst(dust,Math.round(4+k*10),e.x,.2,e.z,2+k*6,.8,8,.8,.72,.46,-.3,1); ring(e.x,.1,e.z,0xFFFFFF,1.5+k*3,.3,true); }
  else if(e.t==='wall'){ const k=clamp(e.v/20,.1,1); burst(conf,Math.round(5+k*12),e.x,e.y,e.z,4+k*7,1,1.8,.9,.78,.36,14,2); }
  else if(e.t==='land'&&c){ const k=clamp(e.v/18,.2,1); burst(dust,Math.round(6+k*10),c.x,.2,c.z,3+k*5,.8,9,.8,.72,.46,-.3,.5); if(c.mesh) c.mesh.userData.sv-=k*5.5; if(c===me) V.shake=Math.max(V.shake,k*.35); }
  else if(e.t==='jump'&&c){ burst(dust,6,c.x,.2,c.z,3,.5,7,.8,.72,.46,-.3,.5); if(c.mesh) c.mesh.userData.sv+=3; }
  else if(e.t==='dash'&&c){ const fx=Math.cos(c.h), fz=Math.sin(c.h); for(let i=0;i<22;i++) glow.emit(c.x-fx*2+rnd(1),c.y+1+rnd(.8),c.z-fz*2+rnd(1),-fx*(6+Math.random()*14)+rnd(4),rnd(4),-fz*(6+Math.random()*14)+rnd(4),.4,9,1,.6,.2,1,0,2,.2); if(c===me) V.shake=Math.max(V.shake,.3); }
  else if(e.t==='flip'&&c){ burst(glow,10,c.x,c.y+1,c.z,6,.3,1.8,.8,.9,1,0); }
  else if(e.t==='demo'){ burst(glow,coarse?40:80,e.x,e.y,e.z,26,.6,3.2,1,.7,.3,6,3); burst(dust,22,e.x,e.y,e.z,9,1.4,10,.16,.16,.16,-1.5,2); burst(conf,coarse?20:40,e.x,e.y,e.z,18,1.6,2,.2,.2,.2,18,6); ring(e.x,e.y,e.z,0xFFB050,12,.5); ring(e.x,.2,e.z,0xFFFFFF,14,.6,true); if(near<50) V.shake=Math.max(V.shake,c===me?1.4:.6); }
  else if(e.t==='respawn'&&c){ ring(c.x,.2,c.z,TEAMC[c.team],7,.6,true); burst(glow,16,c.x,1.5,c.z,7,.5,2,.7,.9,1,-3,2); }
  else if(e.t==='lock'&&c){ ring(c.x,.2,c.z,0x9FD0FF,6,.35,true); burst(dust,8,c.x,.2,c.z,4,.6,8,.8,.72,.46,-.3,.5); }
  else if(e.t==='ram'&&c){ ring(c.x,1.2,c.z,0xFFD060,9,.5,true); burst(glow,20,c.x,1.5,c.z,10,.4,2.6,1,.8,.3,0); }
  else if(e.t==='bump'){ burst(glow,24,e.x,e.y,e.z,14,.4,2.2,1,.9,.6,10); burst(dust,8,e.x,e.y,e.z,6,.8,9,.5,.5,.5,-.3); ring(e.x,e.y,e.z,0xFFFFFF,5,.3); if(near<30) V.shake=Math.max(V.shake,c===me?.8:.3); }
  else if(e.t==='clang'){ burst(glow,8,e.x,e.y,e.z,7,.3,1.8,1,.9,.6,10); }
  else if(e.t==='pad'){ const p=Z.PADS[e.i]; burst(glow,p[2]?26:12,p[0],1.2,p[1],p[2]?9:6,.5,2.2,1,.85,.3,-4,2); }
  else if(e.t==='goal'){ const col=new T.Color(TEAMC[e.team]), x=e.x, y=e.y, z=e.z; for(let i=0;i<(coarse?120:260);i++){ const a=Math.random()*6.28, el=Math.random()*1.5, v=10+Math.random()*34, hue=Math.random(); conf.emit(x,y,z,Math.cos(a)*Math.cos(el)*v,Math.sin(el)*v+6,Math.sin(a)*Math.cos(el)*v,2.2+Math.random()*1.6,2.4+Math.random()*1.6,hue<.5?col.r:1,hue<.5?col.g:.9,hue<.5?col.b:.4,1,16,.9,0); }
    burst(glow,coarse?70:150,x,y,z,40,.9,10,col.r*.6+.4,col.g*.6+.4,col.b*.6+.4,4,4); for(let i=0;i<3;i++) setTimeout(()=>ring(x,y,z,TEAMC[e.team],36+i*14,.9+i*.25),i*140); if(!e.fw){ ring(x,.2,z,0xFFFFFF,60,1.1,true); V.shake=1.3; } crowd.amp=1.6; } }

/* ---------- кадр ---------- */
function frame(S,me,dt,rdt,phase){ V.t+=rdt; const b=S.ball;
  for(const c of S.cars) placeCar(c,dt);
  ballPulse=Math.max(0,ballPulse-rdt*.9); ballM.scale.setScalar(1+ballPulse*Math.cos(V.t*38)*.9); ballM.position.set(b.x,b.y,b.z); if(dt>0){ const sp=Math.hypot(b.vx,b.vz); if(sp>.3){ tv.set(b.vz,0,-b.vx).normalize(); ballM.rotateOnWorldAxis(tv,sp*dt/F.BR); }
    const s3=Math.hypot(b.vx,b.vy,b.vz); if(s3>26){ const n=s3>40?2:1, tc=b.team>=0?new T.Color(TEAMC[b.team]):new T.Color(0xFFFFFF); for(let i=0;i<n;i++) glow.emit(b.x+rnd(1.6),b.y+rnd(1.6),b.z+rnd(1.6),rnd(1),rnd(1),rnd(1),.4,10,tc.r*.7+.3,tc.g*.7+.3,tc.b*.7+.3,.7,0,0,-.5); } }
  const k=1/(1+b.y*.12); ballSh.position.set(b.x,.06,b.z); ballSh.scale.setScalar(F.BR*1.5*k); ballRing.position.set(b.x,.08,b.z); ballRing.visible=b.y>F.BR+1.2; ballRing.scale.setScalar(clamp(.5+b.y*.08,.5,2.2));
  ballGlow.position.copy(ballM.position); ballGlow.material.color.setHex(b.team>=0?TEAMC[b.team]:0xFFFFFF); ballGlow.material.opacity=clamp((Math.hypot(b.vx,b.vy,b.vz)-18)/60,0,.4);
  for(let i=0;i<pads.length;i++){ const g=pads[i], on=!(S.pads[i]>0); g.userData.can.visible=on; g.children[0].material.opacity=on?1:.25; g.userData.can.rotation.y=V.t*1.6+i; g.userData.can.position.y=(Z.PADS[i][2]?1.5:1)+Math.sin(V.t*3+i)*.15; }
  /* соняшники дивляться на м'яч і стрибають на гол */
  crowd.amp=Math.max(0,crowd.amp-rdt*.45); const amp=crowd.amp; V.cf=(V.cf||0)+1; if(V.cf%2===0||amp>0){ const P=crowd.P; for(let i=0;i<crowd.n;i++){ const p=P[i], hop=amp>0?Math.abs(Math.sin(V.t*9+p.ph))*amp*.7:Math.sin(V.t*1.3+p.ph)*.04, hy=p.y+p.h+hop;
      ts.set(1,p.h+hop,1); tq.identity(); tv.set(p.x,p.y+(p.h+hop)/2,p.z); tm4.compose(tv,tq,ts); crowd.stem.setMatrixAt(i,tm4);
      const yaw=Math.atan2(b.x-p.x,b.z-p.z), tilt=Math.PI/2-clamp(Math.atan2(b.y-hy,Math.hypot(b.x-p.x,b.z-p.z)),-.5,.9)*.7; te.set(tilt,yaw,0,'YXZ'); tq.setFromEuler(te); ts.set(1,1,1); tv.set(p.x,hy,p.z); tm4.compose(tv,tq,ts); crowd.pet.setMatrixAt(i,tm4); tv.set(p.x+Math.sin(yaw)*.05,hy,p.z+Math.cos(yaw)*.05); tm4.compose(tv,tq,ts); crowd.head.setMatrixAt(i,tm4); }
    crowd.stem.instanceMatrix.needsUpdate=crowd.head.instanceMatrix.needsUpdate=crowd.pet.instanceMatrix.needsUpdate=true; }
  for(let i=rings.length-1;i>=0;i--){ const r=rings[i]; r.t-=rdt; const u=1-Math.max(0,r.t/r.L); r.m.scale.setScalar(.3+r.R*u); r.m.material.opacity=.9*(1-u); if(!r.flat) r.m.lookAt(cam.position); if(r.t<=0){ scene.remove(r.m); rings.splice(i,1); } }
  dust.step(rdt); glow.step(rdt); conf.step(rdt);
  camStep(S,me,rdt,phase); }
const cp=new T.Vector3(), cl=new T.Vector3(); let camInit=false;
function camStep(S,me,dt,phase){ const b=S.ball; if(V.camFix){ cam.position.set(V.camFix[0],V.camFix[1],V.camFix[2]); cam.lookAt(V.camFix[3],V.camFix[4],V.camFix[5]); return; } if(!me){ const a=V.t*.12; cam.position.set(Math.cos(a)*78,34,Math.sin(a)*66); cam.lookAt(b.x*.4,3,b.z*.4); camInit=false; return; }
  const M=MACH[me.ch], dist=10+M.hl*2.6, hgt=4.4+M.hh*.8, sp=Math.hypot(me.vx,me.vz); let dh=me.h-V.camH; dh=Math.atan2(Math.sin(dh),Math.cos(dh)); V.camH+=dh*Math.min(1,dt*(camInit?5.5:99));
  if(V.camMode===1&&phase!=='end'){ let dx=me.x-b.x, dz=me.z-b.z; const l=Math.hypot(dx,dz)||1; dx/=l; dz/=l; cp.set(me.x+dx*dist,me.y+hgt+clamp(b.y*.12,0,2),me.z+dz*dist); cl.set(b.x*.72+me.x*.28,Math.max(1.5,b.y*.8),b.z*.72+me.z*.28); }
  else { const fx=Math.cos(V.camH), fz=Math.sin(V.camH); cp.set(me.x-fx*dist,me.y*.6+hgt,me.z-fz*dist); cl.set(me.x+fx*9,me.y*.5+2,me.z+fz*9); }
  cp.x=clamp(cp.x,-F.FL-F.GD-4,F.FL+F.GD+4); cp.z=clamp(cp.z,-F.FW-5,F.FW+5);
  if(!camInit){ cam.position.copy(cp); V.look=cl.clone(); camInit=true; } else { cam.position.lerp(cp,Math.min(1,dt*7)); V.look.lerp(cl,Math.min(1,dt*9)); }
  V.shake=Math.max(0,V.shake-dt*2.6); if(V.shake>0){ cam.position.x+=rnd(V.shake*.9); cam.position.y+=rnd(V.shake*.9); cam.position.z+=rnd(V.shake*.9); }
  cam.lookAt(V.look); const f=62+clamp(sp/30,0,1)*14+(me.boosting?5:0); if(Math.abs(cam.fov-f)>.2){ cam.fov+=(f-cam.fov)*Math.min(1,dt*4); cam.updateProjectionMatrix(); } }
function resize(){ if(!renderer) return; const w=cv.clientWidth, h=cv.clientHeight; if(w<2||h<2) return; renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,coarse?1.5:2)); renderer.setSize(w,h,false); cam.aspect=w/h; cam.updateProjectionMatrix(); const sc=h*.17; dust.m.uniforms.sc.value=sc; glow.m.uniforms.sc.value=sc; conf.m.uniforms.sc.value=sc; }
function init(canvas){ cv=canvas; try{ renderer=new T.WebGLRenderer({canvas:cv,antialias:!coarse,powerPreference:'high-performance'}); }catch(e){ V.ok=false; return false; }
  scene=new T.Scene(); cam=new T.PerspectiveCamera(62,16/9,.3,900); cam.position.set(60,30,60); buildField(); resize(); return true; }
function project(x,y,z,out){ tv.set(x,y,z).project(cam); out.x=tv.x; out.y=tv.y; out.z=tv.z; return out; }
function render(){ if(renderer) renderer.render(scene,cam); }
Object.assign(V,{init:init,resize:resize,carMesh:carMesh,carRemove:carRemove,frame:frame,fx:fxEvent,project:project,render:render,coarse:coarse,camReset:()=>{camInit=false;},skidClear:()=>{ for(let i=0;i<SKN;i++){ tm4.makeScale(0,0,0); skid.setMatrixAt(i,tm4); } skid.instanceMatrix.needsUpdate=true; }});
window.ZV=V;
})();
