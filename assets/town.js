// Bud's town — a procedural 3D city on a floating island. Monochrome. Bots walk the streets, buy stocks (rehearsal), and parcels fly home.
import * as THREE from '/assets/three.module.min.js';

export function startTown(opts){
  const box=opts.box, Q=opts.Q, fmt=opts.fmt, log=opts.log, qcard=opts.qcard;
  const LIST=Object.keys(Q.quotes);
  const red=matchMedia('(prefers-reduced-motion:reduce)').matches;
  const gl=document.getElementById('gl'), signsEl=document.getElementById('signs'), tip=document.getElementById('tip');

  // ---------- renderer / scene ----------
  const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
  gl.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.fog=new THREE.FogExp2(0x050505,0.018);
  const camera=new THREE.PerspectiveCamera(38,1,0.1,400);
  const hemi=new THREE.HemisphereLight(0xffffff,0x202020,0.55);scene.add(hemi);
  const sun=new THREE.DirectionalLight(0xffffff,1.35);sun.position.set(18,30,12);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);
  const sc=sun.shadow.camera;sc.left=-30;sc.right=30;sc.top=30;sc.bottom=-30;sc.near=1;sc.far=90;sun.shadow.bias=-0.0006;scene.add(sun);
  const rim=new THREE.DirectionalLight(0xffffff,0.35);rim.position.set(-20,12,-16);scene.add(rim);

  const M={grass:new THREE.MeshStandardMaterial({color:0x9a9a96,roughness:.95}),road:new THREE.MeshStandardMaterial({color:0x3a3a38,roughness:1}),
    rock:new THREE.MeshStandardMaterial({color:0x2c2c2a,roughness:1,flatShading:true}),trunk:new THREE.MeshStandardMaterial({color:0x4a4a46,roughness:1}),
    leaf:new THREE.MeshStandardMaterial({color:0x7c7c78,roughness:.9,flatShading:true}),white:new THREE.MeshStandardMaterial({color:0xf2f2ee,roughness:.6}),
    ink:new THREE.MeshStandardMaterial({color:0x101010,roughness:.5}),glow:new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffffff,emissiveIntensity:1.6}),
    pole:new THREE.MeshStandardMaterial({color:0x55554f,roughness:.8})};

  // ---------- island ----------
  const W=30,D=24,R=4;
  const shape=new THREE.Shape();shape.moveTo(-W/2+R,-D/2);shape.lineTo(W/2-R,-D/2);shape.quadraticCurveTo(W/2,-D/2,W/2,-D/2+R);shape.lineTo(W/2,D/2-R);shape.quadraticCurveTo(W/2,D/2,W/2-R,D/2);shape.lineTo(-W/2+R,D/2);shape.quadraticCurveTo(-W/2,D/2,-W/2,D/2-R);shape.lineTo(-W/2,-D/2+R);shape.quadraticCurveTo(-W/2,-D/2,-W/2+R,-D/2);
  const slab=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:1.6,bevelEnabled:true,bevelThickness:.5,bevelSize:.5,bevelSegments:3}),M.grass);
  slab.rotation.x=-Math.PI/2;slab.position.y=-1.6;slab.receiveShadow=true;slab.castShadow=true;scene.add(slab);
  // rock underside: a jagged inverted pyramid
  const rockGeo=new THREE.ConeGeometry(15,14,9,3,true);const pos=rockGeo.attributes.position;
  for(let i=0;i<pos.count;i++){const y=pos.getY(i);if(y<6.9){pos.setX(i,pos.getX(i)*(1+(Math.random()-.5)*.28));pos.setZ(i,pos.getZ(i)*(1+(Math.random()-.5)*.28));pos.setY(i,y+(Math.random()-.5)*1.2)}}
  rockGeo.computeVertexNormals();const rock=new THREE.Mesh(rockGeo,M.rock);rock.rotation.x=Math.PI;rock.scale.set(1,1,D/W*1.15);rock.position.y=-8.6;scene.add(rock);

  // roads: a grid of two avenues and two streets
  const roads=[];function road(x,z,w,d){const m=new THREE.Mesh(new THREE.BoxGeometry(w,.06,d),M.road);m.position.set(x,.03,z);m.receiveShadow=true;scene.add(m);roads.push(m)}
  road(0,0,W-3,2.2);road(0,0,2.2,D-3);road(0,-7.5,W-3,1.6);road(0,7.5,W-3,1.6);road(-9,0,1.6,D-3);road(9,0,1.6,D-3);
  // waypoints on the road grid
  const XS=[-9,0,9],ZS=[-7.5,0,7.5];const nodes=[];XS.forEach(x=>ZS.forEach(z=>nodes.push(new THREE.Vector3(x,0,z))));
  function nb(i){const x=Math.floor(i/3),z=i%3,out=[];if(x>0)out.push(i-3);if(x<2)out.push(i+3);if(z>0)out.push(i-1);if(z<2)out.push(i+1);return out}
  function nearestNode(p){let b=0,bd=1e9;nodes.forEach((n,i)=>{const d=n.distanceToSquared(p);if(d<bd){bd=d;b=i}});return b}
  function route(a,b){const prev={};const q=[a];prev[a]=-1;while(q.length){const c=q.shift();if(c===b)break;nb(c).forEach(n=>{if(!(n in prev)){prev[n]=c;q.push(n)}})}const out=[];let c=b;while(c!==-1&&c!==undefined){out.unshift(c);c=prev[c]}return out}

  // ---------- window texture ----------
  function winTex(cols,rows,seed){const c=document.createElement('canvas');c.width=cols*16;c.height=rows*16;const x=c.getContext('2d');x.fillStyle='#8c8c88';x.fillRect(0,0,c.width,c.height);let s=seed;
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){s=(s*9301+49297)%233280;const lit=s/233280<.55;x.fillStyle=lit?'#ffffff':'#3a3a38';x.fillRect(i*16+4,j*16+4,8,9)}
    const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.magFilter=THREE.NearestFilter;return t}
  function emitTex(cols,rows,seed){const c=document.createElement('canvas');c.width=cols*16;c.height=rows*16;const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);let s=seed;
    for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){s=(s*9301+49297)%233280;if(s/233280<.55){x.fillStyle='#ffffff';x.fillRect(i*16+4,j*16+4,8,9)}}
    const t=new THREE.CanvasTexture(c);t.magFilter=THREE.NearestFilter;return t}

  // ---------- buildings ----------
  const buildings=[],stockBuild={};let seed=7;
  function building(x,z,w,d,h,tk){const cols=Math.max(2,Math.round(w*2.4)),rows=Math.max(2,Math.round(h*1.7));seed+=13;
    const mat=new THREE.MeshStandardMaterial({map:winTex(cols,rows,seed),emissiveMap:emitTex(cols,rows,seed),emissive:0xffffff,emissiveIntensity:.55,roughness:.85});
    const top=new THREE.MeshStandardMaterial({color:0x6e6e6a,roughness:.9});
    const m=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),[mat,mat,top,top,mat,mat]);m.position.set(x,h/2,z);m.castShadow=true;m.receiveShadow=true;scene.add(m);
    // roof detail
    const r=new THREE.Mesh(new THREE.BoxGeometry(w*.35,.5,d*.35),M.rock);r.position.set(x+w*.2,h+.25,z-d*.2);r.castShadow=true;scene.add(r);
    const b={mesh:m,mat:mat,x:x,z:z,w:w,d:d,h:h,tk:tk,base:.55,flash:0};buildings.push(b);if(tk)stockBuild[tk]=b;return b}
  // blocks between roads; each block gets 1–3 towers; the eight stock houses sit on the outer ring
  const blocks=[[-4.5,-3.75],[4.5,-3.75],[-4.5,3.75],[4.5,3.75],[-13,-3.75],[13,-3.75],[-13,3.75],[13,3.75],[-4.5,-10.5],[4.5,-10.5],[-4.5,10.5],[4.5,10.5],[-13,-10.5],[13,-10.5],[-13,10.5],[13,10.5]];
  const outer=[4,5,6,7,8,9,10,11];let ti=0;
  blocks.forEach((bl,i)=>{const [bx,bz]=bl;const isStock=outer.includes(i)&&ti<LIST.length;
    if(isStock){const tk=LIST[ti++];building(bx,bz,3.6,3.6,2.2+Math.random()*1.2,tk)}
    else{const n=1+Math.floor(Math.random()*2);for(let k=0;k<n;k++){const w=1.8+Math.random()*1.8,d=1.8+Math.random()*1.6,h=3+Math.random()*9;building(bx+(k?1.9:-1.6)+(Math.random()-.5),bz+(Math.random()-.5)*1.4,w,d,h,null)}}});
  // trees + lamps
  function tree(x,z){const g=new THREE.Group();const t=new THREE.Mesh(new THREE.CylinderGeometry(.09,.13,.9,6),M.trunk);t.position.y=.45;t.castShadow=true;const l=new THREE.Mesh(new THREE.IcosahedronGeometry(.55+Math.random()*.3,0),M.leaf);l.position.y=1.2;l.castShadow=true;g.add(t,l);g.position.set(x,0,z);scene.add(g)}
  for(let i=0;i<26;i++){const x=(Math.random()-.5)*(W-4),z=(Math.random()-.5)*(D-4);if(Math.abs(x)<1.6||Math.abs(z)<1.6||Math.abs(Math.abs(x)-9)<1.3||Math.abs(Math.abs(z)-7.5)<1.2)continue;if(buildings.some(b=>Math.abs(b.x-x)<b.w/2+.6&&Math.abs(b.z-z)<b.d/2+.6))continue;tree(x,z)}
  const lamps=[];function lamp(x,z){const p=new THREE.Mesh(new THREE.CylinderGeometry(.05,.05,1.6,5),M.pole);p.position.set(x,.8,z);const b=new THREE.Mesh(new THREE.SphereGeometry(.12,8,8),M.glow);b.position.set(x,1.65,z);const l=new THREE.PointLight(0xffffff,.9,5,2);l.position.set(x,1.7,z);scene.add(p,b,l);lamps.push(l)}
  [[-9,-1.6],[9,1.6],[-1.6,-7.5],[1.6,7.5],[-9,7.5+1.6],[9,-7.5-1.6],[1.6,-1.6],[-1.6,1.6]].forEach(a=>lamp(a[0],a[1]));

  // ---------- clouds under the island ----------
  const cloudTex=(()=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');const g=x.createRadialGradient(64,64,4,64,64,60);g.addColorStop(0,'rgba(200,200,196,.85)');g.addColorStop(1,'rgba(200,200,196,0)');x.fillStyle=g;x.fillRect(0,0,128,128);return new THREE.CanvasTexture(c)})();
  const clouds=[];for(let i=0;i<16;i++){const s=new THREE.Sprite(new THREE.SpriteMaterial({map:cloudTex,transparent:true,opacity:.35+Math.random()*.3,depthWrite:false}));const sc=6+Math.random()*9;s.scale.set(sc,sc*.55,1);s.position.set((Math.random()-.5)*70,-9-Math.random()*8,(Math.random()-.5)*50);s.userData.v=.004+Math.random()*.008;scene.add(s);clouds.push(s)}

  // ---------- bots ----------
  function botMesh(){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.BoxGeometry(.5,.45,.36),M.white);body.position.y=.5;body.castShadow=true;
    const head=new THREE.Mesh(new THREE.BoxGeometry(.62,.44,.5),M.white);head.position.y=1.02;head.castShadow=true;const visor=new THREE.Mesh(new THREE.BoxGeometry(.5,.3,.06),M.ink);visor.position.set(0,1.03,.25);
    const e1=new THREE.Mesh(new THREE.SphereGeometry(.05,8,8),M.glow);e1.position.set(-.13,1.05,.29);const e2=e1.clone();e2.position.x=.13;const ant=new THREE.Mesh(new THREE.CylinderGeometry(.02,.02,.22,5),M.pole);ant.position.y=1.35;const bulb=new THREE.Mesh(new THREE.SphereGeometry(.06,8,8),M.glow);bulb.position.y=1.48;
    const l1=new THREE.Mesh(new THREE.BoxGeometry(.14,.3,.16),M.ink);l1.position.set(-.14,.15,0);const l2=l1.clone();l2.position.x=.14;g.add(body,head,visor,e1,e2,ant,bulb,l1,l2);g.userData.legs=[l1,l2];return g}
  const bots=[];for(let i=0;i<6;i++){const g=botMesh();g.scale.setScalar(1.25);const n=Math.floor(Math.random()*9);g.position.copy(nodes[n]);scene.add(g);bots.push({n:i+1,g:g,node:n,path:[],t:0,st:'idle',wait:500+i*700+Math.random()*900,tk:null,buys:0,speed:1.6+Math.random()*.6,want:null})}
  const AMTS=[25,50,100,100,250,500],POOL={};let NBUY=0,TOT=0;
  function rank(){return LIST.slice().sort((a,b)=>{const qa=Q.quotes[a],qb=Q.quotes[b];return (qb.price-qb.prev)/qb.prev-(qa.price-qa.prev)/qa.prev})}
  function hud(){const rs=Object.keys(POOL).sort((a,b)=>POOL[b]-POOL[a]).slice(0,5),mx=POOL[rs[0]]||1;document.getElementById('hudZ').hidden=rs.length>0;document.getElementById('hudR').innerHTML=rs.map(tk=>'<div class="r"><b>'+tk+'</b><em><s style="width:'+(POOL[tk]/mx*100)+'%"></s></em><span>'+POOL[tk].toLocaleString('en-US')+'</span></div>').join('');document.getElementById('hudT').textContent=TOT.toLocaleString('en-US')+' USDG';document.getElementById('hudN').textContent=NBUY}
  const parcels=[];const parcelGeo=new THREE.SphereGeometry(.11,8,8);
  function sendParcels(tk,n){const from=stockBuild[tk];if(!from)return;for(let i=0;i<n;i++){const to=buildings[Math.floor(Math.random()*buildings.length)];parcels.push({m:null,a:new THREE.Vector3(from.x,from.h+.6,from.z),b:new THREE.Vector3(to.x,to.h+.3,to.z),t:-i*.12,to:to,tk:tk})}}
  function pop(worldPos,html,cls,life){const m=document.createElement('div');m.className='msg'+(cls?' '+cls:'');m.innerHTML=html;m.dataset.x=worldPos.x;m.dataset.y=worldPos.y;m.dataset.z=worldPos.z;signsEl.appendChild(m);setTimeout(()=>m.remove(),life||3700);return m}
  function goBuy(b,tk){const tgt=stockBuild[tk];if(!tgt)return;b.want=tk;const dest=nearestNode(new THREE.Vector3(tgt.x,0,tgt.z));b.path=route(b.node,dest).slice(1);b.st='walk';b.t=0;b.from=b.g.position.clone()}
  function dispatch(tk){const free=bots.filter(b=>b.st==='idle');if(!free.length)return;goBuy(free[Math.floor(Math.random()*free.length)],tk)}
  function buy(b){const tk=b.want,amt=AMTS[Math.floor(Math.random()*AMTS.length)],q=Q.quotes[tk];b.tk=tk;b.buys++;POOL[tk]=(POOL[tk]||0)+amt;TOT+=amt;NBUY++;hud();
    const p=b.g.position.clone();p.y+=1.9;pop(p,'<b>Bud '+b.n+'</b> acquired '+amt+' USDG of '+tk+' at '+fmt(q.price)+'<i>SIM</i>');pop(p,'+'+amt,'plus',1500);
    const bld=stockBuild[tk];bld.flash=1;const s=signsEl.querySelector('.sign[data-t='+tk+']');if(s){s.classList.remove('hit');void s.offsetWidth;s.classList.add('hit')}
    sendParcels(tk,1);if(Math.random()<.3)log('bud '+b.n+' rehearsed a buy: '+amt+' USDG of '+tk+' at '+fmt(q.price)+'. sim. nothing moved.',false)}
  function stepBot(b,dt,ts){const legs=b.g.userData.legs;
    if(b.st==='idle'){b.wait-=dt;if(b.wait<=0&&!document.hidden){const r=rank();const tk=Math.random()<.55?r[Math.floor(Math.random()*3)]:LIST[Math.floor(Math.random()*LIST.length)];goBuy(b,tk)}
      else if(b.wait<=0){b.wait=800}}
    else if(b.st==='walk'){if(!b.path.length){b.st='off';b.t=0;b.from=b.g.position.clone();const tg=stockBuild[b.want];b.to=new THREE.Vector3(tg.x+(Math.random()-.5)*1.2,0,tg.z+(tg.d/2+.7)*(tg.z>b.g.position.z?-1:1));return}
      const target=nodes[b.path[0]];const dir=target.clone().sub(b.g.position);const dist=dir.length();const step=b.speed*dt/1000;
      if(dist<=step){b.g.position.copy(target);b.node=b.path.shift()}else{dir.normalize();b.g.position.addScaledVector(dir,step);b.g.rotation.y=Math.atan2(dir.x,dir.z)}
      legs[0].rotation.x=Math.sin(ts/90)*.7;legs[1].rotation.x=-Math.sin(ts/90)*.7;b.g.position.y=Math.abs(Math.sin(ts/90))*.04}
    else if(b.st==='off'||b.st==='back'){b.t+=dt/900;const k=Math.min(1,b.t);const A=b.st==='off'?b.from:b.to,B=b.st==='off'?b.to:b.from;b.g.position.lerpVectors(A,B,k);const dir=B.clone().sub(A);if(dir.lengthSq()>0)b.g.rotation.y=Math.atan2(dir.x,dir.z);
      legs[0].rotation.x=Math.sin(ts/90)*.7;legs[1].rotation.x=-Math.sin(ts/90)*.7;
      if(k>=1){if(b.st==='off'){b.st='buy';b.t=0;b.g.rotation.y=Math.atan2(stockBuild[b.want].x-b.g.position.x,stockBuild[b.want].z-b.g.position.z);buy(b)}else{b.st='idle';b.wait=2500+Math.random()*5000;b.node=nearestNode(b.g.position);legs[0].rotation.x=legs[1].rotation.x=0}}}
    else if(b.st==='buy'){b.t+=dt/1400;b.g.position.y=Math.abs(Math.sin(b.t*9))*.12;if(b.t>=1){b.g.position.y=0;b.st='back';b.t=0}}}

  // ---------- signs (HTML, projected) ----------
  Object.keys(stockBuild).forEach(tk=>{const b=stockBuild[tk],q=Q.quotes[tk],ch=(q.price-q.prev)/q.prev*100;const el=document.createElement('button');el.className='sign';el.dataset.t=tk;el.innerHTML=tk+'<small>'+(ch>=0?'+':'')+ch.toFixed(1)+'%</small>';el.dataset.x=b.x;el.dataset.y=b.h+1.1;el.dataset.z=b.z;
    el.onclick=()=>{qcard(tk);log('you asked about '+tk+'. '+fmt(q.price)+', '+(ch>=0?'+':'')+ch.toFixed(2)+'% today.',false);dispatch(tk)};signsEl.appendChild(el)});

  // ---------- camera control ----------
  let yaw=-.6,pitch=.66,dist=46,tYaw=yaw,tPitch=pitch,tDist=dist,auto=true,drag=null,mx=0,my=0,fit=1;const look=new THREE.Vector3(0,1.2,0);
  function baseDist(){return 46*fit}
  function setZoom(z){tDist=Math.max(18,Math.min(90*fit,z))}
  document.getElementById('zIn').onclick=()=>setZoom(tDist/1.2);document.getElementById('zOut').onclick=()=>setZoom(tDist*1.2);document.getElementById('zRst').onclick=()=>{tYaw=-.6;tPitch=.66;tDist=baseDist();auto=true};
  box.addEventListener('dblclick',()=>{tYaw=-.6;tPitch=.66;tDist=baseDist();auto=true});
  box.addEventListener('wheel',e=>{if(!e.ctrlKey)return;e.preventDefault();setZoom(tDist*(e.deltaY<0?.9:1.1))},{passive:false});
  box.addEventListener('pointerdown',e=>{if(e.target.closest('button,.qcard,.hud'))return;drag={x:e.clientX,y:e.clientY,yaw:tYaw,pitch:tPitch,moved:false};box.setPointerCapture(e.pointerId)});
  box.addEventListener('pointermove',e=>{const r=box.getBoundingClientRect();mx=((e.clientX-r.left)/r.width-.5)*2;my=((e.clientY-r.top)/r.height-.5)*2;
    if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>3)drag.moved=true;tYaw=drag.yaw-dx*.006;tPitch=Math.max(.25,Math.min(1.2,drag.pitch+dy*.004));auto=false;box.classList.add('drag');tip.hidden=true;return}
    // hover a bot
    const hit=pickBot(e.clientX,e.clientY);if(hit){const p=project(hit.g.position.clone().add(new THREE.Vector3(0,1.7,0)));tip.hidden=false;tip.innerHTML='<b>Bud '+hit.n+'</b> <span>· '+(hit.tk?'holding '+hit.tk:'empty-handed')+' · '+hit.buys+' buys · '+(hit.st==='buy'?'buying':hit.st==='idle'?'waiting':'on an errand')+'</span>';tip.style.left=p.x+'px';tip.style.top=p.y+'px';box.style.cursor='pointer'}else{tip.hidden=true;box.style.cursor=''}});
  box.addEventListener('pointerup',e=>{if(drag&&!drag.moved){const hit=pickBot(e.clientX,e.clientY);if(hit&&hit.st==='idle')hit.wait=0}drag=null;box.classList.remove('drag')});
  box.addEventListener('pointerleave',()=>{mx=0;my=0;tip.hidden=true});
  const ray=new THREE.Raycaster(),ndc=new THREE.Vector2();
  function pickBot(cx,cy){const r=renderer.domElement.getBoundingClientRect();ndc.set(((cx-r.left)/r.width)*2-1,-((cy-r.top)/r.height)*2+1);ray.setFromCamera(ndc,camera);const hits=ray.intersectObjects(bots.map(b=>b.g),true);if(!hits.length)return null;let o=hits[0].object;while(o&&!bots.some(b=>b.g===o))o=o.parent;return bots.find(b=>b.g===o)||null}
  function project(v){const p=v.clone().project(camera);const r=renderer.domElement.getBoundingClientRect(),br=box.getBoundingClientRect();return {x:(p.x+1)/2*r.width+(r.left-br.left),y:(1-p.y)/2*r.height+(r.top-br.top),z:p.z}}

  function resize(){const w=box.clientWidth,h=box.clientHeight;renderer.setSize(w,h,false);renderer.domElement.style.width=w+'px';renderer.domElement.style.height=h+'px';camera.aspect=w/h;camera.updateProjectionMatrix();const was=fit;fit=Math.max(1,1.55/camera.aspect);if(Math.abs(tDist-46*was)<.01||was!==fit)tDist=baseDist()}
  resize();dist=tDist;addEventListener('resize',resize);

  // ---------- loop ----------
  let last=0,frames=0;
  function frame(ts){const dt=last?Math.min(120,ts-last):16;last=ts;frames++;
    if(auto&&!drag)tYaw+=dt*0.00004;
    yaw+=(tYaw+mx*.06-yaw)*.06;pitch+=(tPitch+my*.03-pitch)*.06;dist+=(tDist-dist)*.08;
    camera.position.set(look.x+Math.sin(yaw)*Math.cos(pitch)*dist,look.y+Math.sin(pitch)*dist,look.z+Math.cos(yaw)*Math.cos(pitch)*dist);camera.lookAt(look);
    if(!red){bots.forEach(b=>stepBot(b,dt,ts));clouds.forEach(c=>{c.position.x+=c.userData.v*dt/16;if(c.position.x>36)c.position.x=-36})}
    buildings.forEach((b,i)=>{const pulse=b.base+Math.sin(ts/1300+i)*.08;b.mat.emissiveIntensity=pulse+b.flash*1.4;if(b.flash>0)b.flash=Math.max(0,b.flash-dt/700)});
    lamps.forEach((l,i)=>{l.intensity=.85+Math.sin(ts/300+i*2)*.08});
    for(let i=parcels.length-1;i>=0;i--){const p=parcels[i];p.t+=dt/1100;if(p.t<0)continue;if(!p.m){p.m=new THREE.Mesh(parcelGeo,M.glow);scene.add(p.m)}const k=Math.min(1,p.t);p.m.position.lerpVectors(p.a,p.b,k);p.m.position.y+=Math.sin(k*Math.PI)*3;if(k>=1){scene.remove(p.m);p.to.flash=1;parcels.splice(i,1)}}
    // projected HTML: signs + messages
    signsEl.querySelectorAll('.sign,.msg').forEach(el=>{const v=new THREE.Vector3(+el.dataset.x,+el.dataset.y,+el.dataset.z);const p=project(v);el.style.left=p.x+'px';el.style.top=p.y+'px';el.style.opacity=(p.z>1)?0:'';el.style.zIndex=String(1000-Math.round(p.z*500))});
    renderer.render(scene,camera);
    if(!(red&&frames>3))requestAnimationFrame(frame)}
  requestAnimationFrame(frame);
  document.addEventListener('visibilitychange',()=>{last=0});

  return {forceBuy:(tk)=>{const b=bots[0];b.want=tk;buy(b)},deliver:(tk,n)=>{sendParcels(tk,Math.min(30,n));bots.forEach(b=>{if(b.st==='idle')goBuy(b,tk)});const s=stockBuild[tk];if(s)s.flash=1},dispatch:dispatch,get zoom(){return tDist},bots:bots,renderer:renderer};
}
