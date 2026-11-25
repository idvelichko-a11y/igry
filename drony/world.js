/* Ферма: будує одну злиту сітку, список перешкод для зіткнень, зони будівель, зарядки, мітки. Одиниця — метр. x — схід, z — південь, y — угору. */
window.buildWorld=function(THREE){
"use strict";
const P=[],Nn=[],C=[], cols=[], zones=[], pads=[], marks=[], fields=[], foot=[];
const col=new THREE.Color(), v=new THREE.Vector3(), n=new THREE.Vector3(), m4=new THREE.Matrix4(), n3=new THREE.Matrix3(), q=new THREE.Quaternion(), sc=new THREE.Vector3(), ps=new THREE.Vector3();
const UB=new THREE.BoxGeometry(1,1,1).toNonIndexed(), UC={};
function ucyl(seg){ return UC[seg]||(UC[seg]=new THREE.CylinderGeometry(1,1,1,seg).toNonIndexed()); }
function push(geom,mat,c){ const pa=geom.attributes.position, na=geom.attributes.normal; n3.getNormalMatrix(mat); col.set(c);
  for(let i=0;i<pa.count;i++){ v.fromBufferAttribute(pa,i).applyMatrix4(mat); n.fromBufferAttribute(na,i).applyMatrix3(n3).normalize(); P.push(v.x,v.y,v.z); Nn.push(n.x,n.y,n.z); C.push(col.r,col.g,col.b); } }
function box(x0,y0,z0,x1,y1,z1,c,solid){ if(x1<x0){const t=x0;x0=x1;x1=t;} if(z1<z0){const t=z0;z0=z1;z1=t;} m4.makeScale(x1-x0,y1-y0,z1-z0); m4.setPosition((x0+x1)/2,(y0+y1)/2,(z0+z1)/2); push(UB,m4,c); if(solid!==false) cols.push([x0,y0,z0,x1,y1,z1]); }
function cyl(x,z,r,y0,y1,c,solid,seg){ m4.makeScale(r,y1-y0,r); m4.setPosition(x,(y0+y1)/2,z); push(ucyl(seg||12),m4,c); if(solid!==false) cols.push({x:x,z:z,r:r,y0:y0,y1:y1}); }
function cylH(x,y,z,r,len,axis,c,seg){ q.setFromAxisAngle(axis==='x'?new THREE.Vector3(0,0,1):new THREE.Vector3(1,0,0),Math.PI/2); m4.compose(ps.set(x,y,z),q,sc.set(r,len,r)); push(ucyl(seg||10),m4,c); }
function tri(a,b,c2,c){ col.set(c); const e1=new THREE.Vector3().subVectors(b,a), e2=new THREE.Vector3().subVectors(c2,a), nn=e1.cross(e2).normalize(); for(const p of [a,b,c2]){ P.push(p.x,p.y,p.z); Nn.push(nn.x,Math.abs(nn.y),nn.z); C.push(col.r,col.g,col.b); } }
function quad(a,b,c2,d,c){ tri(a,b,c2,c); tri(a,c2,d,c); }
const V3=(x,y,z)=>new THREE.Vector3(x,y,z);
/* двосхилий дах: axis 'x' — коник уздовж x */
function roof(x0,x1,z0,z1,y,h,axis,c,cg){ const o=.6;
  if(axis==='x'){ const zm=(z0+z1)/2; quad(V3(x0-o,y,z0-o),V3(x1+o,y,z0-o),V3(x1+o,y+h,zm),V3(x0-o,y+h,zm),c); quad(V3(x1+o,y,z1+o),V3(x0-o,y,z1+o),V3(x0-o,y+h,zm),V3(x1+o,y+h,zm),c); tri(V3(x0,y,z0),V3(x0,y+h,zm),V3(x0,y,z1),cg); tri(V3(x1,y,z0),V3(x1,y,z1),V3(x1,y+h,zm),cg);
    for(let i=0;i<4;i++){ const k=(z1-z0)/2*(i/4); cols.push([x0-o,y+i*h/4,z0+k-(i?0:o),x1+o,y+(i+1)*h/4,z1-k+(i?0:o)]); } }
  else { const xm=(x0+x1)/2; quad(V3(x0-o,y,z1+o),V3(x0-o,y,z0-o),V3(xm,y+h,z0-o),V3(xm,y+h,z1+o),c); quad(V3(x1+o,y,z0-o),V3(x1+o,y,z1+o),V3(xm,y+h,z1+o),V3(xm,y+h,z0-o),c); tri(V3(x0,y,z0),V3(x1,y,z0),V3(xm,y+h,z0),cg); tri(V3(x1,y,z1),V3(x0,y,z1),V3(xm,y+h,z1),cg);
    for(let i=0;i<4;i++){ const k=(x1-x0)/2*(i/4); cols.push([x0+k-(i?0:o),y+i*h/4,z0-o,x1-k+(i?0:o),y+(i+1)*h/4,z1+o]); } } }
/* стіна з отворами. axis 'x': стіна в площині z=k, тягнеться вздовж x. holes: [від, до, низ, верх] */
function wall(axis,k,a0,a1,y0,y1,c,holes,t){ t=t||.3; holes=(holes||[]).slice().sort((p,r)=>p[0]-r[0]); let a=a0;
  const seg=(s,e,ya,yb)=>{ if(e-s<.02||yb-ya<.02)return; if(axis==='x') box(s,ya,k-t/2,e,yb,k+t/2,c); else box(k-t/2,ya,s,k+t/2,yb,e,c); };
  for(const h of holes){ seg(a,h[0],y0,y1); seg(h[0],h[1],y0,h[2]); seg(h[0],h[1],h[3],y1); a=h[1]; } seg(a,a1,y0,y1); }
function slab(x0,x1,z0,z1,y,t,c,h){ if(!h){ box(x0,y,z0,x1,y+t,z1,c); return; } box(x0,y,z0,x1,y+t,h[2],c); box(x0,y,h[3],x1,y+t,z1,c); box(x0,y,h[2],h[0],y+t,h[3],c); box(h[1],y,h[2],x1,y+t,h[3],c); }
function zone(name,x0,z0,x1,z1,h){ zones.push({n:name,x0:x0,z0:z0,x1:x1,z1:z1,h:h}); foot.push([x0,z0,x1,z1]); }
function wins(a0,a1,step,w,y0,y1){ const r=[]; for(let a=a0+step/2;a<a1-w;a+=step) r.push([a-w/2,a+w/2,y0,y1]); return r; }
function tree(x,z,s){ s=s||1; cyl(x,z,.28*s,0,2.6*s,'#7A5A3A',true,6); m4.makeScale(2.3*s,3.4*s,2.3*s); m4.setPosition(x,4.2*s,z); push(new THREE.IcosahedronGeometry(1,0),m4,'#4E8A4A'); cols.push({x:x,z:z,r:1.9*s,y0:2.6*s,y1:7*s}); }
function cow(x,z,dir,c){ const b=veh(x,z,dir); b(-1,.7,-.35,1,1.5,.35,c||'#F2EFE8'); b(1,.9,-.25,1.6,1.6,.25,c||'#F2EFE8'); b(-.3,1.1,-.36,.4,1.5,.36,'#3A2B22',false); for(const lx of [-.8,.7]) for(const lz of [-.3,.2]) b(lx,0,lz,lx+.18,.7,lz+.14,'#3A2B22',false); }
/* машина: локальні координати, довжина вздовж x; dir 0..3 — поворот на 90° */
function veh(x,z,dir){ const T=(lx,lz)=>dir===0?[x+lx,z+lz]:dir===1?[x-lz,z+lx]:dir===2?[x-lx,z-lz]:[x+lz,z-lx];
  const b=(lx0,y0,lz0,lx1,y1,lz1,c,solid)=>{ const a=T(lx0,lz0), e=T(lx1,lz1); box(Math.min(a[0],e[0]),y0,Math.min(a[1],e[1]),Math.max(a[0],e[0]),y1,Math.max(a[1],e[1]),c,solid); };
  b.w=(lx,lz,r,wd,c)=>{ const p=T(lx,lz); cylH(p[0],r,p[1],r,wd,(dir%2===0)?'z':'x',c||'#1E2326'); cylH(p[0],r,p[1],r*.5,wd+.04,(dir%2===0)?'z':'x','#C9A961'); };
  return b; }

/* ---------- земля, двір, дороги ---------- */
box(-320,-1,-320,320,0,320,'#6E9A4E',false);
box(-95,0,-80,95,.04,75,'#A99E86',false);                 /* двір — гравій */
box(-210,0,56,210,.06,64,'#9C9485',false); box(-4,0,0,4,.07,56,'#9C9485',false);

/* ---------- поля кукурудзи ---------- */
function corn(x0,x1,z0,z1,along){ fields.push({x0:x0,x1:x1,z0:z0,z1:z1,along:along,sp:2,w:.8,h:2.4}); const cs=['#4E8236','#5C8F3C','#467430'];
  if(along==='x'){ let i=0; for(let z=z0+1;z<z1;z+=2,i++){ box(x0,0,z-.4,x1,2.2,z+.4,cs[i%3],false); box(x0,2.2,z-.3,x1,2.45,z+.3,'#C9B45A',false); } }
  else { let i=0; for(let x=x0+1;x<x1;x+=2,i++){ box(x-.4,0,z0,x+.4,2.2,z1,cs[i%3],false); box(x-.3,2.2,z0,x+.3,2.45,z1,'#C9B45A',false); } } }
corn(-200,200,-200,-82,'x'); corn(-200,200,78,200,'x'); corn(-200,-98,-80,54,'z'); corn(98,200,-80,54,'z');

/* ---------- елеватор: силоси, башта з поверхами, галерея, проїзд ---------- */
for(const sx of [-70,-59,-48,-37]){ cyl(sx,-50,5,0,18,'#C9CED2',true,16); m4.makeScale(5.2,3,5.2); m4.setPosition(sx,19.5,-50); push(new THREE.ConeGeometry(1,1,16).toNonIndexed(),m4,'#AEB4B9'); cols.push({x:sx,z:-50,r:3.2,y0:18,y1:20}); }
foot.push([-75,-55,-32,-45]);
(function(){ const x0=-26,x1=-18,z0=-54,z1=-46,c='#D6D2C4', H=30; zone('Елеватор',x0,z0,x1,z1,H);
  wall('x',z1,x0,x1,0,H,c,[[-24,-20,0,3.4]].concat([1,2,3,4].map(f=>[-23,-21,f*6+1.6,f*6+3.4])));        /* південь: ворота й вікна */
  wall('x',z0,x0,x1,0,H,c,[0,1,2,3,4].map(f=>[-23,-21,f*6+1.6,f*6+3.4]));
  wall('z',x1,z0,z1,0,H,c,[0,1,2,3,4].map(f=>[-51,-49,f*6+1.6,f*6+3.4]));
  wall('z',x0,z0,z1,0,H,c,[[-51.5,-48.5,19,22]].concat([0,1,2,4].map(f=>[-51,-49,f*6+1.6,f*6+3.4])));     /* захід: вхід у галерею на висоті */
  for(let f=1;f<5;f++){ const e=f%2; slab(x0,x1,z0,z1,f*6,.3,'#A8A498',e?[x0+.6,x0+3.6,z0+.6,z0+3.6]:[x1-3.6,x1-.6,z1-3.6,z1-.6]); }
  slab(x0-.4,x1+.4,z0-.4,z1+.4,H,.4,'#8E8A7E'); pads.push({x:-22,y:H+.4,z:-50,n:'дах елеватора'});
  /* галерея над силосами: тунель 3×3 */
  box(-78,18.9,-51.5,x0,19.1,-48.5,'#8E8A7E'); box(-78,22,-51.5,x0,22.2,-48.5,'#8E8A7E');
  wall('x',-51.5,-78,x0,19.1,22,'#B7B2A2',wins(-78,x0,8,3,19.9,21.4),.2); wall('x',-48.5,-78,x0,19.1,22,'#B7B2A2',wins(-78,x0,8,3,19.9,21.4),.2);
  /* проїзд для машин: стіни з півночі й півдня, відкритий зі сходу й заходу */
  zone('Проїзд',-72,-40,-38,-28,7); wall('x',-40,-72,-38,0,7,'#B7B2A2',wins(-72,-38,8,3,2,4.5)); wall('x',-28,-72,-38,0,7,'#B7B2A2',wins(-72,-38,8,3,2,4.5)); slab(-72.5,-37.5,-40.5,-27.5,7,.3,'#8E8A7E');
  box(-56,5.2,-34.6,-54,7,-33.4,'#7C8288',false); cyl(-55,-34,.45,3.6,5.2,'#7C8288',true,8);                 /* труба вивантаження */
})();

/* ---------- корівник ---------- */
(function(){ const x0=20,x1=70,z0=-62,z1=-44,c='#C96A4A',H=5; zone('Корівник',x0,z0,x1,z1,H+3);
  wall('z',x0,z0,z1,0,H,c,[[-56,-50,0,4]]); wall('z',x1,z0,z1,0,H,c,[[-56,-50,0,4]]);
  wall('x',z0,x0,x1,0,H,c,wins(x0,x1,6,2.2,1.6,3.4)); wall('x',z1,x0,x1,0,H,c,wins(x0,x1,6,2.2,1.6,3.4));
  roof(x0,x1,z0,z1,H,3.2,'x','#6E7378','#C96A4A');
  for(let x=x0+5;x<x1-4;x+=5){ box(x,0,z0+.3,x+.15,1.2,-56.5,'#8A8F94'); box(x,0,-49.5,x+.15,1.2,z1-.3,'#8A8F94'); }
  box(x0+2,1.2,-56.6,x1-2,1.3,-56.4,'#8A8F94',false); box(x0+2,1.2,-49.6,x1-2,1.3,-49.4,'#8A8F94',false);
  const cc=['#F2EFE8','#3A2B22','#B5793F']; let i=0; for(let x=x0+7.5;x<x1-5;x+=5,i++){ cow(x,-59,1,cc[i%3]); if(i%2===0) cow(x,-47,3,cc[(i+1)%3]); }
  /* вигул із парканом */
  for(const zz of [-40,-30]){ box(22,.9,zz-.06,60,1,zz+.06,'#8A6A44'); box(22,.45,zz-.06,60,.55,zz+.06,'#8A6A44',false); } for(const xx of [22,60]){ box(xx-.06,.9,-40,xx+.06,1,-30,'#8A6A44'); }
  for(let x=22;x<=60;x+=3.8) for(const zz of [-40,-30]) box(x-.08,0,zz-.08,x+.08,1.1,zz+.08,'#8A6A44',false);
  cow(30,-35,0,'#F2EFE8'); cow(41,-33,2,'#3A2B22'); cow(50,-36,1,'#B5793F'); cow(36,-37,3,'#F2EFE8');
})();

/* ---------- навіс для техніки (відкритий із заходу) ---------- */
(function(){ const x0=50,x1=66,z0=-26,z1=8,c='#8FA3AD'; zone('Навіс',x0,z0,x1,z1,6);
  wall('z',x1,z0,z1,0,5.5,c,wins(z0,z1,7,2.4,2.2,4)); wall('x',z0,x0,x1,0,5.5,c); wall('x',z1,x0,x1,0,5.5,c);
  for(const z of [z0+.2,-15,-4,z1-.2]) box(x0-.2,0,z-.2,x0+.2,5.5,z+.2,'#6E7378'); box(x0-.8,5.5,z0-.5,x1+.5,5.8,z1+.5,'#6E7378');
  pads.push({x:58,y:5.8,z:-9,n:'дах навісу'});
})();

/* ---------- сінник: два яруси ---------- */
(function(){ const x0=30,x1=50,z0=30,z1=42,c='#A8563C',H=9; zone('Сінник',x0,z0,x1,z1,H+3);
  wall('x',z0,x0,x1,0,H,c,[[37,43,0,4.2],[32,34.4,6,7.6],[45.6,48,6,7.6]]); wall('x',z1,x0,x1,0,H,c,[[38.2,41.8,5,8],[32,34.4,1.6,3.2],[45.6,48,1.6,3.2]]);
  wall('z',x0,z0,z1,0,H,c,[[34.8,37.2,1.6,3.2],[34.8,37.2,6,7.6]]); wall('z',x1,z0,z1,0,H,c,[[34.8,37.2,1.6,3.2],[34.8,37.2,6,7.6]]);
  slab(x0,x1,z0,z1,4.5,.3,'#8A6A44',[31,35.5,31,35.5]); roof(x0,x1,z0,z1,H,3.4,'x','#5E6368','#A8563C');
  for(const b of [[44,0,38],[46.2,0,38],[45.1,1.3,38],[44,0,33],[38,4.8,39],[40.2,4.8,39],[47,4.8,32]]) box(b[0],b[1],b[2],b[0]+2,b[1]+1.25,b[2]+1.2,'#D9B85A');
})();

/* ---------- майстерня: дві кімнати ---------- */
(function(){ const x0=-60,x1=-42,z0=24,z1=36,c='#9AA7AE',H=5; zone('Майстерня',x0,z0,x1,z1,H+1);
  wall('x',z0,x0,x1,0,H,c,[[-58,-54,0,3.4],[-48.6,-46,1.4,3]]); wall('x',z1,x0,x1,0,H,c,[[-57.2,-54.8,1.4,3],[-48.2,-45.8,1.4,3]]);
  wall('z',x0,z0,z1,0,H,c,[[28.8,31.2,1.4,3]]); wall('z',x1,z0,z1,0,H,c,[[29,30.8,0,2.5]]);
  wall('z',-51,z0,z1,0,H,'#B9C2C7',[[31.5,33.3,0,2.5]],.2); slab(x0-.4,x1+.4,z0-.4,z1+.4,H,.3,'#6E7378');
  box(-59.5,0,34.4,-55,1,35.6,'#7A5A3A'); box(-50.4,0,24.5,-46.5,.9,25.6,'#7A5A3A'); cyl(-44,34,.5,0,1.2,'#C9A961',true,8);
  cylH(-36,1.3,30,1.1,5,'x','#C9CED2',12); cols.push([-38.5,.2,28.9,-33.5,2.4,31.1]); box(-38,0,29.4,-37.6,.3,30.6,'#6E7378',false); box(-34.4,0,29.4,-34,.3,30.6,'#6E7378',false);
  pads.push({x:-51,y:H+.3,z:30,n:'дах майстерні'});
})();

/* ---------- будинок: два поверхи, кімнати, вікна ---------- */
(function(){ const x0=-70,x1=-58,z0=-12,z1=-2,c='#E9E2CF'; zone('Будинок',x0,z0,x1,z1,9);
  const w2=(a,b)=>[[a,b,1,2.3],[a,b,4.1,5.4]];
  wall('z',x1,z0,z1,0,6.2,c,[[-7.8,-6.2,0,2.4],[-7.9,-6.3,4.1,5.4],[-11,-9.4,1,2.3],[-4.6,-3,1,2.3],[-11,-9.4,4.1,5.4],[-4.6,-3,4.1,5.4]]);
  wall('z',x0,z0,z1,0,6.2,c,w2(-10.6,-9).concat(w2(-5,-3.4)));
  wall('x',z0,x0,x1,0,6.2,c,w2(-68,-66.4).concat(w2(-62,-60.4))); wall('x',z1,x0,x1,0,6.2,c,w2(-68,-66.4).concat(w2(-62,-60.4)));
  wall('z',-64,z0,z1,0,3,'#D8D0BC',[[-8,-6.4,0,2.3]],.18);                       /* перший поверх: перегородка */
  slab(x0,x1,z0,z1,3,.25,'#B89C74',[-69.4,-66.8,-11.4,-9]);                          /* перекриття з отвором сходів */
  wall('x',-7,x0,x1,3.25,6.2,'#D8D0BC',[[-63.8,-62.2,3.25,5.5]],.18);               /* другий поверх: перегородка */
  slab(x0,x1,z0,z1,6.2,.2,'#B89C74'); roof(x0,x1,z0,z1,6.4,2.8,'x','#8C4A3A','#E9E2CF');
  box(-57.9,0,-9,-56,.25,-5,'#B89C74'); box(-56.2,0,-9,-56,2.6,-8.8,'#8A6A44',false); box(-56.2,0,-5.2,-56,2.6,-5,'#8A6A44',false); box(-58,2.6,-9.2,-55.8,2.75,-4.8,'#8C4A3A');
  box(-69.4,0,-3,-67.6,.5,-2.4,'#7A5A3A'); box(-61.5,0,-11.6,-59.6,.8,-10.6,'#7A5A3A'); box(-69.2,3.25,-4.2,-67,3.8,-2.6,'#6E8FA8');
  pads.push({x:-53,y:.08,z:-7,n:'біля будинку'});
})();

/* ---------- водонапірна вежа, силосна яма, бочка, стовпи ---------- */
for(const d of [[-12,28],[-8,28],[-12,32],[-8,32]]) box(d[0]-.2,0,d[1]-.2,d[0]+.2,14,d[1]+.2,'#6E7378');
box(-12.2,7,27.8,-7.8,7.2,28.1,'#6E7378'); box(-12.2,7,31.9,-7.8,7.2,32.2,'#6E7378'); box(-12.2,7,27.8,-11.9,7.2,32.2,'#6E7378'); box(-8.1,7,27.8,-7.8,7.2,32.2,'#6E7378');
cyl(-10,30,3.6,14,19,'#9FB7C4',true,14); m4.makeScale(3.8,1.6,3.8); m4.setPosition(-10,19.8,30); push(new THREE.ConeGeometry(1,1,14).toNonIndexed(),m4,'#7E97A5'); foot.push([-13.6,26.4,-6.4,33.6]);
box(4,0,44,4.5,2.6,56,'#9C9485'); box(15.5,0,44,16,2.6,56,'#9C9485'); box(4,0,43.5,16,2.6,44,'#9C9485'); box(4.5,0,44,15.5,1.4,50,'#6B7A3A',false); cols.push([4.5,0,44,15.5,1.3,50]);
for(let x=-180;x<=180;x+=30){ box(x-.15,0,66.85,x+.15,8,67.15,'#7A5A3A'); box(x-1.1,7.4,66.9,x+1.1,7.55,67.1,'#7A5A3A',false); }
box(-180,7.5,66.95,180,7.56,67.05,'#2A2F32',false);
for(const t of [[-76,-18,1.1],[-76,2,1],[-52,-16,.9],[-80,-8,1.2],[-30,60,1],[30,60,1.1],[70,56,1],[-70,48,1.1],[84,20,1],[84,-36,1.1],[-88,-60,1],[0,-72,1.1],[14,-70,.9],[-86,30,1],[76,40,1.2],[-20,-70,1]]) tree(t[0],t[1],t[2]);

/* ---------- техніка надворі та під навісом ---------- */
(function(){ let b;
  /* трактор 1 */ b=veh(14,10,0); b(-1.8,.9,-.6,1.9,1.7,.6,'#D2A63C'); b(-1.9,1.2,-.8,-.2,3,.8,'#2B3338'); b(-1.7,1.9,-.7,-.4,2.8,.7,'#BEE1F0',false); b(-2,3,-.9,-.1,3.12,.9,'#D2A63C'); b.w(-1.2,-.95,.9,.5); b.w(-1.2,.95,.9,.5); b.w(1.4,-.8,.55,.35); b.w(1.4,.8,.55,.35); cols.push([12,0,8.6,16,1,11.4]);
  /* причіп */ b=veh(8,10,0); b(-2.6,1,-1.2,2.6,1.15,1.2,'#9A5A3C'); b(-2.6,1.15,-1.2,2.6,2.2,-1.1,'#9A5A3C'); b(-2.6,1.15,1.1,2.6,2.2,1.2,'#9A5A3C'); b(-2.6,1.15,-1.2,-2.5,2.2,1.2,'#9A5A3C'); b(2.5,1.15,-1.2,2.6,2.2,1.2,'#9A5A3C'); b.w(-.8,-1.25,.5,.3); b.w(-.8,1.25,.5,.3); b.w(.6,-1.25,.5,.3); b.w(.6,1.25,.5,.3); b(2.6,.9,-.08,3.9,1,.08,'#2A2F32',false);
  /* комбайн */ b=veh(2,-22,1); b(-3,1.4,-1.6,3,4.2,1.6,'#1F6F7F'); b(-2.4,4.2,-1.3,1.4,4.9,1.3,'#174C59'); b(3,2.2,-1.1,4.6,4.4,1.1,'#123E49'); b(3.2,2.7,-1,4.5,4.2,1,'#BEE1F0',false); b(4.6,.4,-3.6,5.8,1.5,3.6,'#123E49'); b(3.6,1.2,-.6,4.8,2.2,.6,'#174C59'); b(-1,4.9,-3.6,-.5,5.3,0,'#174C59'); b.w(2.2,-1.75,1.25,.7); b.w(2.2,1.75,1.25,.7); b.w(-2,-1.5,.75,.4); b.w(-2,1.5,.75,.4); cols.push([-.1,0,-25.4,3.9,1.4,-18.6]);
  /* обприскувач із розкладеними штангами */ b=veh(-22,12,0); b(-2,1.4,-.9,1.6,3,.9,'#E9E2CF'); b(1.6,1.6,-.8,3,3.3,.8,'#2B3338'); b(1.7,2.2,-.7,2.9,3.2,.7,'#BEE1F0',false); b(-2.5,1.5,-10,-2.2,1.65,10,'#D2A63C'); b(-2.5,1.65,-10,-2.4,2.1,-9.9,'#D2A63C',false); b(-2.5,1.65,9.9,-2.4,2.1,10,'#D2A63C',false); b.w(-1.2,-1.05,.85,.3); b.w(-1.2,1.05,.85,.3); b.w(2,-1.05,.85,.3); b.w(2,1.05,.85,.3);
  /* вантажівка в проїзді елеватора */ b=veh(-55,-34,0); b(-4,1.2,-1.25,1.6,1.4,1.25,'#6E7378'); b(-4,1.4,-1.25,1.6,3,-1.15,'#C9CED2'); b(-4,1.4,1.15,1.6,3,1.25,'#C9CED2'); b(-4,1.4,-1.25,-3.9,3,1.25,'#C9CED2'); b(1.5,1.4,-1.25,1.6,3,1.25,'#C9CED2'); b(-3.9,1.4,-1.15,1.5,2.5,1.15,'#E0B450',false); b(2,1,-1.2,4,3.2,1.2,'#3F5F8A'); b(2.6,2,-1.1,3.95,3,1.1,'#BEE1F0',false); b.w(-2.6,-1.3,.6,.35); b.w(-2.6,1.3,.6,.35); b.w(-1.2,-1.3,.6,.35); b.w(-1.2,1.3,.6,.35); b.w(3,-1.3,.6,.35); b.w(3,1.3,.6,.35);
  /* навантажувач зі стрілою */ b=veh(24,22,3); b(-1.8,.8,-1,1.8,1.9,1,'#D2A63C'); b(-1,1.9,-1,.4,3.2,-.1,'#2B3338'); for(let i=0;i<5;i++) b(.2+i*.9,2+i*.55,.3,1.3+i*.9,2.4+i*.55,.7,'#2A2F32'); b(4.4,4.2,-.4,5,5,1.4,'#6E7378'); b.w(-1.1,-1.1,.7,.4); b.w(-1.1,1.1,.7,.4); b.w(1.1,-1.1,.7,.4); b.w(1.1,1.1,.7,.4);
  /* прес-підбирач і тюки */ b=veh(60,24,2); b(-1.6,.7,-1.1,1.6,2.6,1.1,'#A8563C'); b(1.6,.7,-.1,3,.9,.1,'#2A2F32',false); b.w(0,-1.2,.6,.3); b.w(0,1.2,.6,.3);
  for(const p of [[66,22],[69,25],[72,21],[67,28]]){ cylH(p[0],.75,p[1],.75,1.3,'x','#D9B85A',12); cols.push([p[0]-.7,0,p[1]-.75,p[0]+.7,1.5,p[1]+.75]); }
  /* під навісом: трактор 2 і сівалка */ b=veh(58,-20,2); b(-1.8,.9,-.6,1.9,1.7,.6,'#3F5F8A'); b(-1.9,1.2,-.8,-.2,3,.8,'#2B3338'); b(-1.7,1.9,-.7,-.4,2.8,.7,'#BEE1F0',false); b(-2,3,-.9,-.1,3.12,.9,'#3F5F8A'); b.w(-1.2,-.95,.9,.5); b.w(-1.2,.95,.9,.5); b.w(1.4,-.8,.55,.35); b.w(1.4,.8,.55,.35);
  b=veh(60,-2,1); b(-.6,.5,-3.5,.6,.9,3.5,'#1F6F7F'); for(let i=-3;i<=3;i++) b(-.5,.9,i-.4,.5,1.7,i+.4,'#C9A961'); b.w(0,-3.7,.5,.25); b.w(0,3.7,.5,.25);
})();

/* ---------- мітки для обльоту ---------- */
marks.push([-22,15,-50],[-55,20.5,-50],[-48,21.5,-50.2],[45,2.4,-53],[8,1.9,10],[-61,4.6,-9.5],[-67,1.5,-5],[42,6.6,36],[-46.5,2,31],[-10,10,30],[0,1.3,-120],[62,2.6,-12],[0,45,10],[-46,4.2,-34]);
pads.push({x:0,y:.08,z:36,n:'двір'},{x:76,y:.08,z:-52,n:'за корівником'});

const g=new THREE.BufferGeometry(); g.setAttribute('position',new THREE.Float32BufferAttribute(P,3)); g.setAttribute('normal',new THREE.Float32BufferAttribute(Nn,3)); g.setAttribute('color',new THREE.Float32BufferAttribute(C,3));
const mesh=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,side:THREE.DoubleSide}));

/* сітка для швидкого пошуку перешкод */
const CELL=10, grid=new Map(), key=(i,j)=>i*4096+j;
cols.forEach((c,idx)=>{ const x0=c.r?c.x-c.r:c[0], x1=c.r?c.x+c.r:c[3], z0=c.r?c.z-c.r:c[2], z1=c.r?c.z+c.r:c[5];
  for(let i=Math.floor(x0/CELL);i<=Math.floor(x1/CELL);i++) for(let j=Math.floor(z0/CELL);j<=Math.floor(z1/CELL);j++){ const k=key(i+2000,j+2000); let a=grid.get(k); if(!a) grid.set(k,a=[]); a.push(idx); } });
function near(x,z,out){ out.length=0; const i=Math.floor(x/CELL), j=Math.floor(z/CELL); for(let a=-1;a<=1;a++) for(let b=-1;b<=1;b++){ const l=grid.get(key(i+a+2000,j+b+2000)); if(l) for(const idx of l) if(out.indexOf(idx)<0) out.push(idx); } return out; }
function inside(x,y,z,pad){ const l=near(x,z,[]); for(const idx of l){ const c=cols[idx]; if(c.r){ if(y>c.y0-pad&&y<c.y1+pad&&Math.hypot(x-c.x,z-c.z)<c.r+pad) return true; } else if(x>c[0]-pad&&x<c[3]+pad&&y>c[1]-pad&&y<c[4]+pad&&z>c[2]-pad&&z<c[5]+pad) return true; } return false; }
function zoneAt(x,y,z){ for(const zz of zones) if(x>zz.x0&&x<zz.x1&&z>zz.z0&&z<zz.z1&&y<zz.h) return zz; return null; }
function inCorn(x,y,z){ if(y>2.5) return false; for(const f of fields) if(x>f.x0&&x<f.x1&&z>f.z0&&z<f.z1){ const t=f.along==='x'?z-f.z0:x-f.x0, m=((t-1)%2+2)%2; return m<.4||m>1.6; } return false; }
return {mesh:mesh,cols:cols,near:near,inside:inside,zones:zones,zoneAt:zoneAt,inCorn:inCorn,pads:pads,marks:marks,foot:foot,fields:fields,verts:P.length/3,LIM:205};
};
