import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { buildCooking } from './cooking.js';
import { PlayerHands } from './hands.js';
import { ObjectMover } from './moving.js';
import { applySurfaceTextures, loadDecorativeModel } from './assets.js';
import { buildNeighborhood, NEIGHBORHOOD_BOUNDS, GATE_Z } from './neighborhood.js';

const geometries=new Map(), materials=new Map(), textures=new Map();
const geometry=(key,create)=>{if(!geometries.has(key))geometries.set(key,create());return geometries.get(key);};
function mat(color,roughness=.7,metalness=0){const key=`${color}/${roughness}/${metalness}`;if(!materials.has(key))materials.set(key,new THREE.MeshStandardMaterial({color,roughness,metalness}));return materials.get(key);}
function seeded(seed=127){return ()=>{seed=(seed*1664525+1013904223)>>>0;return seed/4294967296;};}
function canvasTexture(key,draw,size=512){if(textures.has(key))return textures.get(key);const canvas=document.createElement('canvas');canvas.width=canvas.height=size;draw(canvas.getContext('2d'),size);const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;textures.set(key,t);return t;}
function surface(type){
 const key='surface-'+type;if(materials.has(key))return materials.get(key);
 const random=seeded(219);const tex=canvasTexture(type,(c,s)=>{
  if(type==='wood'||type==='floor'){
   c.fillStyle='#b39472';c.fillRect(0,0,s,s);const rows=type==='floor'?7:3;
   for(let p=0;p<rows;p++){
    const y=p*s/rows;c.fillStyle=`hsl(31 29% ${51+random()*12}%)`;c.fillRect(0,y,s,s/rows);
    for(let j=0;j<280;j++){
     c.strokeStyle=`rgba(64,38,21,${random()*.19})`;c.lineWidth=.25+random();c.beginPath();const yy=y+random()*s/rows;
     c.moveTo(0,yy);c.bezierCurveTo(s*.25,yy+random()*7,s*.7,yy-random()*7,s,yy);c.stroke();
    }
    if(type==='floor'){c.fillStyle='#3d302b70';c.fillRect(0,y,s,1.5);c.fillRect(p%2?s*.28:s*.73,y,1.5,s/rows);c.fillStyle='#e9cc9b55';c.fillRect(0,y+2,s,1);}
   }
  }else if(type==='rug'||type==='fabric'){
   c.fillStyle=type==='fabric'?'#acb3a0':'#b6baac';c.fillRect(0,0,s,s);
   for(let i=0;i<26000;i++){c.fillStyle=random()>.5?'#f6f4e944':'#424a393d';c.fillRect(random()*s,random()*s,1,3);}
   for(let i=0;i<s;i+=4){c.fillStyle='#414a3425';c.fillRect(i,0,1,s);c.fillRect(0,i,s,1);}
  }else if(type==='stone'){
   c.fillStyle='#c8c5ba';c.fillRect(0,0,s,s);
   for(let i=0;i<28000;i++){const shade=100+Math.floor(random()*110);c.fillStyle=`rgba(${shade},${shade},${shade-5},.23)`;c.fillRect(random()*s,random()*s,1+random()*3,1+random()*2);}
   for(let i=0;i<7;i++){c.strokeStyle='#6f75631a';c.lineWidth=.5+random()*2;c.beginPath();const yy=random()*s;c.moveTo(0,yy);c.bezierCurveTo(s*.3,yy+50,s*.7,yy-70,s,yy+20);c.stroke();}
  }else if(type==='grass'){
   c.fillStyle='#718257';c.fillRect(0,0,s,s);
   for(let i=0;i<29000;i++){c.strokeStyle=['#9da36b','#506947','#849454','#bbc18155'][Math.floor(random()*4)];const x=random()*s,y=random()*s;c.lineWidth=.6+random();c.beginPath();c.moveTo(x,y);c.lineTo(x-1+random()*2,y-2-random()*7);c.stroke();}
  }else if(type==='soil'){
   c.fillStyle='#504434';c.fillRect(0,0,s,s);
   for(let i=0;i<12000;i++){c.fillStyle=random()>.5?'#92806065':'#302a2390';c.fillRect(random()*s,random()*s,1+random()*4,1+random()*4);}
  }else{
   c.fillStyle='#e4e1d6';c.fillRect(0,0,s,s);for(let i=0;i<26000;i++){c.fillStyle=`rgba(90,83,69,${random()*.07})`;c.fillRect(random()*s,random()*s,2,2);}
  }
 });
 tex.wrapS=tex.wrapT=THREE.RepeatWrapping;
 const repeats={floor:[3,4],rug:[3,3],fabric:[2,2],grass:[12,12],stone:[2,2],soil:[3,3]};if(repeats[type])tex.repeat.set(...repeats[type]);
 const m=new THREE.MeshStandardMaterial({map:tex,roughness:type==='wood'?.5:type==='stone'?.73:.94,bumpMap:tex,bumpScale:type==='fabric'?.003:type==='stone'?.018:.009});materials.set(key,m);return m;
}
function addMesh(parent,geo,material,x=0,y=0,z=0){const mesh=new THREE.Mesh(geo,material);mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function box(p,w,h,d,x,y,z,color,round=0){const key=`box-${w}-${h}-${d}-${round}`;return addMesh(p,geometry(key,()=>round?new RoundedBoxGeometry(w,h,d,2,Math.min(round,w/3,h/3,d/3)):new THREE.BoxGeometry(w,h,d)),typeof color==='string'?mat(color):color,x,y,z);}
function cyl(p,rt,rb,h,x,y,z,color,s=16){return addMesh(p,geometry(`cyl-${rt}-${rb}-${h}-${s}`,()=>new THREE.CylinderGeometry(rt,rb,h,s)),typeof color==='string'?mat(color):color,x,y,z);}
function sphere(p,r,x,y,z,color){return addMesh(p,geometry(`sphere-${r}`,()=>new THREE.SphereGeometry(r,12,8)),typeof color==='string'?mat(color):color,x,y,z);}
function group(p,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);p.add(g);return g;}
function rod(p,a,b,r,color){const start=new THREE.Vector3(...a),end=new THREE.Vector3(...b),delta=end.clone().sub(start);const m=cyl(p,r,r,delta.length(),...(start.add(end).multiplyScalar(.5).toArray()),color,8);m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());return m;}
function leafMaterial(){
 const key='botanical-leaf';if(materials.has(key))return materials.get(key);
 const tex=canvasTexture(key,(c,s)=>{
  const fill=c.createLinearGradient(0,0,s,s);fill.addColorStop(0,'#85994f');fill.addColorStop(.5,'#456a39');fill.addColorStop(1,'#234c32');
  c.fillStyle=fill;c.beginPath();c.moveTo(s*.5,s*.04);c.bezierCurveTo(s*.99,s*.32,s*.91,s*.7,s*.5,s*.97);c.bezierCurveTo(s*.1,s*.75,s*.02,s*.3,s*.5,s*.04);c.fill();
  c.strokeStyle='#b3be774b';c.lineWidth=3;c.beginPath();c.moveTo(s*.5,s*.06);c.lineTo(s*.5,s*.95);c.stroke();
  c.lineWidth=1.2;for(let i=0;i<9;i++){const y=s*(.22+i*.067);c.beginPath();c.moveTo(s*.5,y+.08*s);c.lineTo(s*(i<4?.26:.3),y-.04*s);c.moveTo(s*.5,y+.08*s);c.lineTo(s*(i<4?.74:.7),y-.04*s);c.stroke();}
 },128);
 const m=new THREE.MeshStandardMaterial({map:tex,alphaTest:.45,side:THREE.DoubleSide,roughness:.86,color:'#ffffff'});materials.set(key,m);return m;
}
function plant(p,x,z,scale=1){
 const g=group(p,x,0,z);g.scale.setScalar(scale);g.userData.propLabel='Tanaman pot';
 cyl(g,.24,.18,.43,0,.215,0,mat('#d7cfc0',.87),24);cyl(g,.246,.235,.035,0,.455,0,mat('#e6ded0',.8),24);cyl(g,.22,.22,.015,0,.458,0,surface('soil'));
 const rand=seeded(92),leafGeo=geometry('plant-leaf',()=>new THREE.PlaneGeometry(.3,.58,1,3));
 for(let i=0;i<15;i++){
  const a=i*2.399,h=.72+rand()*.75,r=.14+rand()*.28,xx=Math.sin(a)*r,zz=Math.cos(a)*r;
  rod(g,[0,.45,0],[xx,h,zz],.008,'#536948');
  const leaf=addMesh(g,leafGeo,leafMaterial(),xx,h+.13,zz);leaf.rotation.set(-.2+rand()*.7,a,Math.sin(a)*.6);leaf.scale.setScalar(.65+rand()*.45);
 }
 return g;
}
function tree(p,x,z,scale=1,seed=17){
 const g=group(p,x,0,z);g.scale.setScalar(scale);const random=seeded(seed),bark=mat('#6b6051',.97);
 cyl(g,.08,.18,3.08,0,1.26,0,bark,10);
 for(let i=0;i<5;i++){const a=i*Math.PI*2/5;rod(g,[0,.13,0],[Math.sin(a)*.38,-.14,Math.cos(a)*.38],.055,bark);}
 for(let i=0;i<6;i++){const a=i*2.399;rod(g,[0,1.3+i*.15,0],[Math.sin(a)*.83,2.8+random()*.7,Math.cos(a)*.83],.035,bark);}
 const leaves=new THREE.InstancedMesh(geometry('canopy-leaf',()=>new THREE.PlaneGeometry(.23,.46)),leafMaterial(),420);
 const dummy=new THREE.Object3D();
 for(let i=0;i<420;i++){const a=random()*Math.PI*2,u=random()*2-1,r=Math.cbrt(random());dummy.position.set(Math.cos(a)*Math.sqrt(1-u*u)*r*1.4,2.9+u*r*1.24,Math.sin(a)*Math.sqrt(1-u*u)*r*1.4);dummy.rotation.set(random()*Math.PI,random()*Math.PI,random()*Math.PI);dummy.scale.setScalar(.8+random()*.8);dummy.updateMatrix();leaves.setMatrixAt(i,dummy.matrix);leaves.setColorAt(i,new THREE.Color().setHSL(.23+random()*.06,.24+random()*.16,.42+random()*.16));}
 leaves.castShadow=true;leaves.receiveShadow=true;g.add(leaves);return g;
}
function sign(p,text,x,y,z,width=.6,height=.18,color='#e9eee0'){
 const tex=canvasTexture('sign-'+text,(c,s)=>{c.fillStyle='#263b32';c.fillRect(0,0,s,s);c.fillStyle=color;c.textAlign='center';c.textBaseline='middle';c.font=`600 ${s*.48}px sans-serif`;c.fillText(text,s/2,s/2,s*.88);},512);
 return addMesh(p,geometry(`sign-${width}-${height}`,()=>new THREE.PlaneGeometry(width,height)),new THREE.MeshStandardMaterial({map:tex,roughness:.8}),x,y,z);
}
function book(p,x,y,z,color,w=.2,h=.035,d=.28){const b=box(p,w,h,d,x,y,z,color,.006);b.userData.propLabel='Buku';return b;}
function art(p,x,y,z,width=1.1,height=1.35,style='flow'){
 const frame=group(p,x,y,z);frame.userData.propLabel='Bingkai gambar';p=frame;x=y=z=0;
 const tex=canvasTexture('art-'+style,(c,s)=>{c.fillStyle=style==='flow'?'#ecebdc':'#d7dccb';c.fillRect(0,0,s,s);c.fillStyle='#334d3d';c.font='17px sans-serif';c.fillText('E R G O F L I P   /   S T U D I O',46,55);c.lineWidth=2;c.strokeStyle='#7f9565';for(let j=0;j<7;j++){c.beginPath();c.ellipse(270+j*7,255-j*4,80+j*11,125+j*6,-.5,0,Math.PI*2);c.stroke();}c.fillStyle='#354b3b';c.font='500 37px sans-serif';c.fillText(style==='flow'?'Less strain.':'Make space.',45,437);c.fillText(style==='flow'?'More flow.':'For good ideas.',45,479);});
 box(p,width+.075,height+.075,.045,x,y,z,surface('wood'));const face=addMesh(p,geometry('artplane-'+width+height,()=>new THREE.PlaneGeometry(width,height)),new THREE.MeshStandardMaterial({map:tex,roughness:1}),x,y,z+.027);face.castShadow=false;
}
function cabinet(p,x,z,width=1.45){const g=group(p,x,0,z);g.userData.propLabel='Lemari';g.userData.solidSize=[width,.54];const m=mat('#d2d5c3',.66);box(g,width,.68,.5,0,.45,0,m,.018);box(g,width+.05,.045,.54,0,.81,0,surface('wood'),.012);for(let i=-1;i<=1;i+=2){box(g,width/2-.025,.61,.025,i*width/4,.46,.267,m,.008);cyl(g,.017,.017,.028,i*.085,.6,.29,mat('#9a8c60',.3,.7)).rotation.x=Math.PI/2;for(const z1 of [-.17,.17])box(g,.04,.14,.04,i*(width/2-.13),.1,z1,'#59634c');}return g;}
function sofa(p,x=0,z=0){const g=group(p,x,0,z);g.userData.propLabel='Sofa';g.userData.solidSize=[1.95,.95];const fabric=mat('#cac9b5',.95);box(g,1.75,.32,.78,0,.34,0,fabric,.1);box(g,1.8,.6,.18,0,.65,-.36,fabric,.075);for(const x1 of [-.88,.88])box(g,.17,.4,.88,x1,.5,.0,fabric,.06);for(const x1 of [-.43,.43])box(g,.8,.16,.66,x1,.53,.06,mat('#d2d1bd',.95),.075);for(const xx of [-.7,.7])for(const zz of [-.25,.25])cyl(g,.025,.02,.2,xx,.12,zz,'#504c3d',8);const pillow=box(g,.4,.4,.14,.52,.81,-.12,mat('#889977',.95),.06);pillow.rotation.z=-.17;return g;}
function dust(p,index,x,z){const g=group(p,x,.012,z);g.userData.dirtIndex=index;const tex=canvasTexture('dust',(c,s)=>{const rand=seeded(68);for(let i=0;i<80;i++){const xx=s/2+(rand()-.5)*s*.9,yy=s/2+(rand()-.5)*s*.6,r=7+rand()*40;const gr=c.createRadialGradient(xx,yy,0,xx,yy,r);gr.addColorStop(0,'rgba(103,77,44,.23)');gr.addColorStop(1,'rgba(103,77,44,0)');c.fillStyle=gr;c.fillRect(xx-r,yy-r,r*2,r*2);}});const m=new THREE.MeshStandardMaterial({map:tex,transparent:true,depthWrite:false,roughness:1});const stain=addMesh(g,geometry('dirtplane',()=>new THREE.PlaneGeometry(.85,.62)),m);stain.rotation.x=-Math.PI/2;stain.castShadow=false;for(let i=0;i<4;i++){const scrap=box(g,.05,.008,.07,(i-1.5)*.1,.007,(i%2-.5)*.13,i%2?'#b6a78c':'#d8d1bc');scrap.rotation.y=i;}return g;}
function desk(p,x,z,height=.75,w=2.4,d=.9){
 const g=group(p,x,0,z),legs=[];const top=box(g,w,.055,d,0,height,0,surface('wood'),.018);
 for(const xx of [-w/2+.15,w/2-.15]){
  for(const zz of [-d/2+.09,d/2-.09])legs.push(box(g,.045,height-.05,.045,xx,height/2-.035,zz,mat('#3e4740',.42,.3)));
  box(g,.065,.045,d-.1,xx,.035,0,'#3e4740');
 }
 const crossbar=box(g,w-.3,.05,.04,0,height-.11,-d/2+.08,'#3e4740');
 const cableTray=box(g,w*.46,.07,.16,0,height-.1,-d/2+.13,mat('#303b36',.6),.015);
 g.userData={top,legs,crossbar,cableTray,height,propLabel:'Meja',solidSize:[w,d]};return g;
}
function chair(p){const g=group(p,0,0,.42);const black=mat('#333e38',.5,.15);const fabric=mat('#849b78',.94);const seat=group(g);box(seat,.56,.09,.54,0,0,0,fabric,.05);const back=group(seat,0,.1,.225);box(back,.53,.53,.085,0,.2,0,fabric,.045);box(back,.49,.1,.11,0,.1,-.025,mat('#718968',.95),.04);box(back,.36,.12,.065,0,.5,.02,fabric,.04);for(const x of [-.335,.335]){rod(seat,[x,0,.15],[x,.2,.1],.022,black);box(seat,.06,.035,.3,x,.225,-.04,black,.015);}const stem=cyl(g,.035,.045,.32,0,.26,0,mat('#a4aaa0',.35,.6));for(let i=0;i<5;i++){const a=i*Math.PI*2/5,xx=Math.sin(a)*.32,zz=Math.cos(a)*.32;rod(g,[0,.14,0],[xx,.09,zz],.021,black);const wheel=cyl(g,.042,.042,.032,xx,.053,zz,black,12);wheel.rotation.z=Math.PI/2;}g.userData={seat,back,stem};return g;}
function monitor(p){const g=group(p,-.2,0,-.9);const black=mat('#2b3431',.4,.15);const base=box(g,.3,.025,.2,0,.796,.0,black,.02);const pole=cyl(g,.022,.028,.28,0,.93,-.035,black);const screen=group(g);box(screen,.67,.37,.036,0,-.185,0,black,.014);const tex=canvasTexture('screen',(c,s)=>{c.fillStyle='#c8d5b7';c.fillRect(0,0,s,s);c.fillStyle='#25382f';c.fillRect(0,0,98,s);c.fillStyle='#bacc9c';c.font='bold 20px sans-serif';c.fillText('ef.',27,46);for(let i=0;i<5;i++){c.fillStyle=i===0?'#bacc9c':'#677e66';c.fillRect(24,104+i*40,47,7);}c.fillStyle='#314835';c.font='30px sans-serif';c.fillText('A better workday.',126,85);c.font='14px sans-serif';c.fillText('Your space. Your wellbeing.',126,117);c.fillStyle='#e8eddc';c.fillRect(125,155,350,152);c.strokeStyle='#72895a';c.lineWidth=4;c.beginPath();c.moveTo(145,268);c.bezierCurveTo(220,285,250,180,305,224);c.bezierCurveTo(350,260,395,185,455,188);c.stroke();for(let i=0;i<3;i++){c.fillStyle='#e5ecd6';c.fillRect(126+i*119,334,108,115);c.fillStyle='#7a9165';c.font='34px sans-serif';c.fillText(['86','12','4'][i],147+i*119,393);c.font='12px sans-serif';c.fillText(['Wellbeing','Focus time','Breaks'][i],140+i*119,427);}});
 const screenMaterial=new THREE.MeshStandardMaterial({map:tex,emissiveMap:tex,emissive:'#ffffff',emissiveIntensity:.18,roughness:.35});addMesh(screen,geometry('screen-plane',()=>new THREE.PlaneGeometry(.638,.334)),screenMaterial,0,-.179,.020);cyl(screen,.003,.003,.003,.29,-.353,.019,mat('#b4c89c',.4)).rotation.x=Math.PI/2;g.userData={screen,pole,base};return g;}
function keyboard(p){const g=group(p,-.2,.795,-.4);box(g,.48,.023,.155,0,0,0,mat('#dddcd0',.65),.012);for(let row=0;row<4;row++)for(let col=0;col<13;col++)box(g,.028,.008,.025,(col-6)*.034,.017,(row-1.5)*.031,row===0?'#a7b49c':'#eeeddf',.003);box(g,.17,.009,.022,0,.018,.063,'#eeeddf',.003);const mouse=sphere(g,.038,.37,0,.0,mat('#d6d8c9',.55));mouse.scale.set(.8,.4,1.3);return g;}
function lamp(p,x,z,y=.78){const g=group(p,x,y,z),dark=mat('#3b493c',.4,.3);cyl(g,.12,.12,.025,0,.025,0,dark);rod(g,[0,.04,0],[.04,.4,0],.015,dark);rod(g,[.04,.4,0],[.23,.55,0],.014,dark);const shade=cyl(g,.06,.115,.13,.23,.53,0,dark);shade.rotation.z=-.4;const bulb=sphere(g,.06,.22,.475,0,new THREE.MeshStandardMaterial({color:'#f5dfad',emissive:'#ffe6aa',emissiveIntensity:.5}));bulb.scale.y=.25;const light=new THREE.PointLight('#fff1c6',.8,2.4,2);light.position.set(.2,.43,0);g.add(light);g.userData.light=light;return g;}
function cart(p,x,z){const g=group(p,x,0,z);for(const y of [.2,.62])box(g,.68,.04,.45,0,y,0,mat('#899c7c',.55),.018);for(const xx of [-.3,.3])for(const zz of [-.18,.18]){box(g,.025,.7,.025,xx,.4,zz,'#455442');sphere(g,.042,xx,.06,zz,'#343b30');}rod(g,[-.3,.75,-.18],[-.3,.75,.18],.02,'#455442');book(g,0,.67,0,'#c9b997',.35,.07,.28);return g;}

const footprints={fridge:[.85,.85],cart:[.7,.5],sofa:[1.95,.95],chair:[.72,.72],box:[.54,.47],path:[.95,.64],carry:[.54,.47]};
function insideFootprint(x,z,b,padding=.19){const a=b.rotation||0,dx=x-b.x,dz=z-b.z;return Math.abs(Math.cos(a)*dx-Math.sin(a)*dz)<b.w/2+padding&&Math.abs(Math.sin(a)*dx+Math.cos(a)*dz)<b.d/2+padding;}
function overlappingFootprints(a,b){
 const axes=r=>[[Math.cos(r||0),-Math.sin(r||0)],[Math.sin(r||0),Math.cos(r||0)]],aa=axes(a.rotation),bb=axes(b.rotation);
 return [...aa,...bb].every(([x,z])=>{const radius=(r,ax)=>(r.w*Math.abs(x*ax[0][0]+z*ax[0][1])+r.d*Math.abs(x*ax[1][0]+z*ax[1][1]))/2;return Math.abs((a.x-b.x)*x+(a.z-b.z)*z)<radius(a,aa)+radius(b,bb)+.025;});
}
function localBounds(g){
 g.updateWorldMatrix(true,true);const bounds=new THREE.Box3(),inverse=g.matrixWorld.clone().invert();
 g.traverseVisible(mesh=>{if(!mesh.isMesh||mesh.userData.hitProxy)return;mesh.geometry.computeBoundingBox();bounds.union(mesh.geometry.boundingBox.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,mesh.matrixWorld)));});return bounds;
}

export class World{
 constructor(container,settings){
  this.container=container;this.settings=settings;this.scene=new THREE.Scene();this.scene.background=new THREE.Color('#c4d7df');this.scene.fog=new THREE.Fog('#c4d7df',30,85);this.camera=new THREE.PerspectiveCamera(60,1,.06,100);this.camera.rotation.order='YXZ';this.rig=new THREE.Group();this.rig.add(this.camera);this.scene.add(this.rig);
  this.renderer=new THREE.WebGLRenderer({antialias:!matchMedia('(pointer:coarse)').matches,powerPreference:'high-performance'});this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.0;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.xr.enabled=true;this.renderer.xr.setReferenceSpaceType('local-floor');container.appendChild(this.renderer.domElement);
  const env=new RoomEnvironment();const pmrem=new THREE.PMREMGenerator(this.renderer);this.environment=pmrem.fromScene(env,.04);this.scene.environment=this.environment.texture;this.scene.environmentIntensity=.32;env.dispose();pmrem.dispose();
  this.hemi=new THREE.HemisphereLight('#e4effa','#77715b',1.12);this.scene.add(this.hemi);this.sun=new THREE.DirectionalLight('#fff1d9',2.75);this.sun.position.set(-7,5.4,1.4);this.sun.castShadow=true;Object.assign(this.sun.shadow.camera,{left:-7,right:7,top:7,bottom:-7,near:.5,far:35});this.sun.shadow.bias=-.00025;this.sun.shadow.normalBias=.014;this.sun.shadow.mapSize.set(2048,2048);this.scene.add(this.sun);this.fill=new THREE.DirectionalLight('#d8e7f7',.45);this.fill.position.set(4,3,4);this.scene.add(this.fill);
  this.scene.add(this.sun.target);
  this.root=new THREE.Group();this.scene.add(this.root);this.objects=new Map();this.propDefinitions=new Map();this.hands=new PlayerHands(this.camera);this.mover=new ObjectMover(this);this.colliders=[];this.dirts=[];this.animations=[];this.carrying=false;this.deliveryPoint=new THREE.Vector3(-2,0,-3);this.raycaster=new THREE.Raycaster();this.outline=new THREE.BoxHelper(new THREE.Mesh(new THREE.BoxGeometry(.1,.1,.1)),0xd5eca0);this.outline.visible=false;this.scene.add(this.outline);this.renderer.shadowMap.autoUpdate=false;this.setQuality(settings.quality);this.resize();
  new ResizeObserver(()=>this.resize()).observe(container);
  for(const type of ['floor','wood','plaster','grass','stone']){
   const material=surface(type);if(material.userData.pbrRequested)continue;material.userData.pbrRequested=true;if(type==='grass')material.color.set('#9ab480');
   applySurfaceTextures(material,type,this.renderer,{repeat:type==='grass'?[64,64]:type==='stone'?[1,1]:undefined,roughness:type==='wood'?.72:undefined});
  }
 }
 setQuality(quality){this.quality=quality;const low=quality==='low'||(quality==='auto'&&matchMedia('(pointer:coarse)').matches);this.renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.7));this.renderer.shadowMap.enabled=!low;this.low=low;this.renderer.shadowMap.needsUpdate=true;this.resize();}
 resize(){const w=this.container.clientWidth,h=this.container.clientHeight;if(!w||!h)return;this.camera.aspect=w/h;this.camera.updateProjectionMatrix();this.renderer.setSize(w,h);}
 register(id,g,anchor=[0,1,0],label=true){g.userData.id=id;this.objects.set(id,{group:g,anchor:new THREE.Vector3(...anchor),label});return g;}
 registerProp(id,g,name,solidSize){
  if(!this.objects.has(id))this.register(id,g,[0,.3,0],false);
  const entry=this.objects.get(id);entry.solidSize=solidSize;
  this.propDefinitions.set(id,{id,name,icon:'box',description:'Barang ruangan. Angkat atau geser, arahkan ke tempat kosong, lalu letakkan. Barang di atas furnitur ikut dipindahkan.',controls:[],movable:true});
  this.colliders=this.colliders.filter(c=>c.id!==id);
  this.updateHitBox(id);
 }
 collectProps(){
  let count=0;const props=[];
  const fixedSizes={counter:[4.1,.8],planter:[2.5,1.14],bench:[2.8,1.05],light:[.25,.25]};
  for(const [id,size] of Object.entries(fixedSizes)){const e=this.objects.get(id);if(e)e.solidSize=size;}this.root.traverse(g=>{if(g.userData.propLabel)props.push(g);});
  for(const g of props){const id=g.userData.id||`prop-${count++}`;this.registerProp(id,g,g.userData.propLabel,g.userData.solidSize);}
  for(const [id,e] of this.objects){if(e.solidSize){const pos=e.group.getWorldPosition(new THREE.Vector3());this.colliders=this.colliders.filter(c=>Math.hypot(c.x-pos.x,c.z-pos.z)>.55||Math.abs(c.w-e.solidSize[0])>.6);}}
 }
 removePlacement(id){const e=this.objects.get(id);if(!e?.appliedPlacement)return;e.group.position.sub(new THREE.Vector3(...e.appliedPlacement.offset));e.group.rotation.y-=e.appliedPlacement.rotation;e.appliedPlacement=null;}
 applyPlacement(id){const e=this.objects.get(id),placement=this.placements?.[id];if(!e||!placement||e.appliedPlacement)return;e.group.position.add(new THREE.Vector3(...placement.offset));e.group.rotation.y+=placement.rotation;e.appliedPlacement=structuredClone(placement);this.updateHitBox(id);}
 portal(id,x,z,text){
  const g=group(this.root,x,0,z);g.rotation.y=Math.PI;
  box(g,1.04,2.25,.085,0,1.125,0,mat('#62715d',.61),.018);
  for(const xx of [-.57,.57])box(g,.075,2.35,.16,xx,1.175,0,mat('#e9e4d9',.7),.006);
  box(g,1.21,.075,.16,0,2.34,0,mat('#e9e4d9',.7),.006);
  for(const yy of [.5,1.15])box(g,.81,.46,.021,0,yy,.053,mat('#718167',.69),.008);
  box(g,.65,.42,.025,0,1.81,.052,mat('#829b9a',.2,.25),.008);
  rod(g,[.35,1.0,.08],[.35,1.0,.13],.02,mat('#c8bd9d',.25,.75));rod(g,[.35,1.0,.13],[.2,1.0,.13],.02,mat('#c8bd9d',.25,.75));
  sign(g,text,0,2.01,.077,.65,.14);sign(g,'F · BUKA PINTU',0,1.46,.074,.58,.1);
  const doormat=box(this.root,1.22,.014,.6,x,.012,z-.45,surface('rug'),.02);doormat.castShadow=false;
  this.register(id,g,[0,2.56,0]);this.updateHitBox(id);return g;
 }
 shell(room){const p=this.root;box(p,9,.1,8,0,-.06,0,surface('floor'));box(p,9,3.2,.15,0,1.6,-4,mat(room==='workshop'?'#b4b9a6':'#aab8a0',.96));box(p,.15,3.2,8,4.5,1.6,0,surface('plaster'));
  // The rear wall has a framed door to the explorable garden.
  box(p,6.6,3.2,.15,-1.2,1.6,4,surface('plaster'));box(p,1.3,3.2,.15,3.85,1.6,4,surface('plaster'));box(p,1.1,.9,.15,2.65,2.75,4,surface('plaster'));
  this.portal('exit',2.65,3.96,'KE HALAMAN');
  box(p,.15,.8,8,-4.5,.4,0,surface('plaster'));box(p,.15,.4,8,-4.5,3,0,surface('plaster'));box(p,.15,2.1,1.0,-4.5,1.85,-3.5,surface('plaster'));box(p,.15,2.1,2,-4.5,1.85,3,surface('plaster'));for(const z of [-3,1.95])box(p,.18,2.2,.075,-4.48,1.85,z,'#e8e7da');for(const y of [.79,2.85])box(p,.22,.075,5.1,-4.43,y,-.55,'#eae9de');for(const z of [-1.4,.3])box(p,.13,2,.045,-4.45,1.83,z,'#dedfd3');box(p,.13,.045,5,-4.45,1.8,-.55,'#dedfd3');box(p,.32,.04,5.25,-4.31,.77,-.53,surface('wood'));box(p,9,.105,.035,0,.06,-3.89,'#e4e4d5');box(p,.035,.105,8,4.39,.06,0,'#e4e4d5');box(p,.035,.105,8,-4.39,.06,0,'#e4e4d5');
  // A light ceiling with recessed fixtures; the walls have real openings for daylight.
  box(p,9,.08,8,0,3.24,0,mat('#eeeede',1));for(const x of [-2,1,3])for(const z of [-2,1]){cyl(p,.07,.07,.018,x,3.188,z,mat('#d6d8c9',.3));cyl(p,.048,.048,.02,x,3.175,z,new THREE.MeshStandardMaterial({color:'#fff1d1',emissive:'#fff2d5',emissiveIntensity:.4}));}
  box(p,45,.1,45,-10,-.25,0,surface('grass'));for(let i=0;i<7;i++){const x=-8-(i%3)*2.2,z=-8+i*2.8;this.addTree(p,x,z,1.2+(i%3)*.15,41+i);}
  for(let i=0;i<11;i++)box(p,.065,1.05,.04,-6, .3,-4+i*.7,surface('wood'));box(p,.05,.07,8,-6,.6,0,surface('wood'));
  // Window trim, radiator and sockets anchor the room at human scale.
  box(p,.16,.45,1.2,-4.31,.32,.2,mat('#dadbd1',.65),.025);for(let i=0;i<12;i++)box(p,.024,.37,.025,-4.213,.32,-.31+i*.093,'#f1f0e5',.006);
  for(const xx of [-2.4,2.0]){box(p,.15,.09,.014,xx,.3,-3.906,'#efede3',.006);for(const dx of [-.035,.035])cyl(p,.008,.008,.005,xx+dx,.3,-3.897,'#999b8e',8).rotation.x=Math.PI/2;}
  for(let i=0;i<16;i++)box(p,.055,2.5,.07,2.65+i*.085,1.68,-3.86,surface('wood'));
  art(p,-.45,2.12,-3.89,1.15,1.36,room==='workshop'?'make':'flow');plant(p,-3.7,-3.15,1.23);plant(p,3.7,2.8,.9);this.colliders.push({x:3.8,z:-2.75,w:1.5,d:.6});
 }
 build(room,values,placements={}){
  this.clear();this.buildGeneration=(this.buildGeneration||0)+1;this.room=room;this.values=values;this.placements=placements;this.assetState={pending:0,loaded:[],failed:[]};
  const outside=room==='outdoor';this.bounds=outside?{...NEIGHBORHOOD_BOUNDS}:{minX:-4.15,maxX:4.15,minZ:-3.65,maxZ:3.65};
  this.camera.far=outside?180:100;this.camera.updateProjectionMatrix();this.scene.fog.near=outside?65:30;this.scene.fog.far=outside?155:85;
  this.sun.target.position.set(0,0,0);this.sun.position.set(outside?-24:-7,outside?38:5.4,outside?14:1.4);this.sun.intensity=outside?2.5:2.75;this.hemi.intensity=outside?1.4:1.12;this.scene.environmentIntensity=outside?.38:.32;
  const radius=outside?28:7;Object.assign(this.sun.shadow.camera,{left:-radius,right:radius,top:radius,bottom:-radius,far:outside?130:35});this.sun.shadow.camera.updateProjectionMatrix();
  if(outside)this.outdoor();else this.shell(room);
  if(room==='office')this.office();if(room==='kitchen')this.kitchen();if(room==='home')this.home();if(room==='workshop')this.workshop();
  const positions=room==='office'?[[-1.2,1.45],[1.55,.85],[.55,2.5]]:room==='kitchen'?[[-1.8,1.7],[1.3,1.3],[.1,2.65]]:room==='home'?[[-1.15,1.1],[1.7,.8],[.65,2.55]]:outside?[[-.38,2.3],[.28,-2.0],[.1,-5.5]]:[[-1.5,1.4],[1.6,.8],[.15,2.45]];
  positions.forEach(([x,z],i)=>{const g=dust(this.root,i,x,z);if(outside){g.position.y=.076;for(let j=0;j<5;j++){const leaf=addMesh(g,geometry('fallen-leaf',()=>new THREE.PlaneGeometry(.09,.17)),leafMaterial(),(j-2)*.095,.012,(j%2-.5)*.14);leaf.rotation.set(-Math.PI/2,0,j*1.7);}}g.userData.id='dirt';this.dirts.push(g);});this.objects.set('dirt',{group:this.dirts[0],anchor:new THREE.Vector3(0,.08,0),label:true});
  this.collectProps();
  for(const id of this.objects.keys()){this.update(id,values[id]);this.applyPlacement(id);if(id!=='dirt')this.updateHitBox(id);}
  this.rig.position.set(0,0,0);this.rig.rotation.set(0,0,0);this.camera.position.set(...(outside?[.35,1.64,4.2]:[3.3,1.64,3.5]));this.camera.lookAt(...(outside?[0,1.1,-2.8]:[-.4,1.05,-1.0]));this.camera.rotation.order='YXZ';this.camera.updateMatrixWorld();this.renderer.shadowMap.needsUpdate=true;
 }
 clear(){
  this.mover.cancel();this.cancelCarry();this.propDefinitions.clear();this.cookingVisual=null;this.outline.visible=false;this.animations=[];
  const transientMaterials=new Set(),importedTextures=new Set(),cachedMaterials=new Set(materials.values());
  this.root.traverse(o=>{
   if(!o.isMesh&&!o.isLine)return;
   const ms=Array.isArray(o.material)?o.material:[o.material];
   for(const m of ms){
    if(m&&!cachedMaterials.has(m))transientMaterials.add(m);
    // User imports own their image maps; bundled models reuse the asset cache.
    if(o.userData.imported&&m)for(const value of Object.values(m))if(value?.isTexture)importedTextures.add(value);
   }
   if(o.userData.imported||o.userData.transientGeometry||o.isLine)o.geometry?.dispose();
   if(o.isInstancedMesh)o.dispose();
  });
  transientMaterials.forEach(m=>m.dispose());importedTextures.forEach(texture=>texture.dispose());
  this.root.clear();this.objects.clear();this.colliders=[];this.dirts=[];this.triangle=null;this.deliveryMarker=null;this.desktopDecor=null;this.gate=null;this.residences=[];
 }
 office(){const p=this.root;const rug=box(p,3.4,.012,2.8,-.25,.008,-.35,surface('rug'),.015);rug.userData.propLabel='Karpet';this.register('desk',desk(p,-.2,-.67,.75,2.45,1.6),[0,.9,0],false);this.colliders.push({x:-.2,z:-.67,w:2.45,d:1.6});this.register('chair',chair(p),[0,1.12,.0]);this.register('monitor',monitor(p),[0,1.48,0]);this.register('keyboard',keyboard(p),[0,.11,0],false);this.register('lamp',lamp(p,-1.16,-1.03),[.15,.65,0]);
  const decor=group(p);this.desktopDecor=decor;this.registerProp('desktop-decor',decor,'Perlengkapan meja');
  box(decor,.97,.006,.37,-.03,.782,-.5,mat('#4a5a4a',.96),.024);
  book(decor,.61,.803,-.68,'#d6d5b3',.27,.04,.33);book(decor,.65,.833,-.69,'#778b65',.28,.025,.32);cyl(decor,.048,.04,.095,.73,.84,-1.22,'#eee5d0');cyl(decor,.041,.041,.002,.73,.889,-1.22,'#5a4833');cyl(decor,.042,.035,.1,-.87,.831,-1.34,'#a6ae97');for(let i=0;i<3;i++)rod(decor,[-.89+i*.018,.82,-1.34],[-.90+i*.022,.98,-1.33],.004,'#3c4c40');
  this.addReadingChair([3.05,0,.18],-Math.PI/2);
  const cred=cabinet(p,3.62,-2.8,1.4);book(cred,-.3,.86,0,'#b8c49c',.32,.06,.25);book(cred,-.28,.905,0,'#ece4cc',.3,.03,.25);const pot=plant(cred,.34,0,.35);pot.position.y=.84;sofa(p,-3.15,1.3).rotation.y=Math.PI/2;this.colliders.push({x:-3.15,z:1.3,w:.9,d:1.9});const side=group(p,-2.2,0,2.2);side.userData={propLabel:'Meja samping',solidSize:[.66,.66]};cyl(side,.33,.33,.045,0,.47,0,surface('wood'));for(let i=0;i<3;i++){const a=i*2.094;rod(side,[Math.sin(a)*.17,.44,Math.cos(a)*.17],[Math.sin(a)*.22,.01,Math.cos(a)*.22],.018,'#4e5943');}book(side,0,.52,0,'#f0e7cf',.22,.03,.28);
 }
 kitchen(){const p=this.root;const counter=group(p,0,0,-2.65),cabinetVisual=group(counter);for(const x of [-1.8,-.8,.2,1.2]){box(cabinetVisual,.98,.84,.67,x,.45,0,mat('#849777',.65),.015);box(cabinetVisual,.91,.69,.025,x,.48,.35,'#91a383',.01);box(cabinetVisual,.28,.016,.03,x,.72,.38,mat('#c5bc93',.3,.7));}box(counter,4.02,.045,.76,-.3,.9,0,mat('#e6e4d6',.4),.015);this.register('counter',counter,[-.5,1.1,.3]);this.colliders.push({x:-.3,z:-2.65,w:4.1,d:.8});
  this.addLocalModel('kitchenCounter',cabinetVisual,{fit:[4.02,.87,.72],position:[-.3,0,0]},'counter',true);
  const sink=group(counter,-1.5,.927,.0);box(sink,.68,.025,.48,0,0,0,mat('#b5c3bc',.25,.75),.035);box(sink,.57,.03,.36,0,.01,0,'#5a7873',.035);rod(sink,[0,0,-.19],[0,.28,-.19],.017,mat('#b7c3bd',.2,.9));rod(sink,[0,.28,-.19],[0,.28,.01],.017,mat('#b7c3bd',.2,.9));rod(sink,[0,.28,.01],[0,.22,.01],.017,mat('#b7c3bd',.2,.9));const stove=group(counter,1.15,.936,0);box(stove,.64,.025,.51,0,0,0,mat('#293833',.3),.012);for(const xx of [-.16,.16])for(const zz of [-.13,.13]){cyl(stove,.09,.09,.006,xx,.018,zz,'#727d70',24);cyl(stove,.068,.068,.008,xx,.02,zz,'#27322c',24);}this.registerProp('stove',stove,'Kompor & sup sayur');this.cookingVisual=buildCooking(stove);this.cookingVisual.update({on:false,handle:0});
  const fridge=group(p);box(fridge,.8,1.85,.77,0,.955,0,mat('#d9e0d4',.38,.22),.035);for(const [y,h] of [[.71,1.27],[1.63,.49]]){box(fridge,.74,h,.04,0,y,.41,'#e0e4d9',.019);box(fridge,.023,h*.42,.04,-.28,y,.452,mat('#6b7b70',.3,.65),.009);}box(fridge,.16,.025,.003,.16,1.88,.437,'#879b80');this.register('fridge',fridge,[0,2.04,0]);
  const shelf=group(p,-2.85,0,-3.63);box(shelf,1.35,.045,.38,0,0,0,surface('wood'),.01);for(const x of [-.5,.5])box(shelf,.035,.26,.035,x,-.13,-.1,'#51634a');for(let i=0;i<3;i++){const jar=group(shelf,-.38+i*.25,.025,0);jar.userData.propLabel='Toples dapur';cyl(jar,.08,.075,.16,0,.08,0,i===1?'#c9c3a7':'#e8e3ce');cyl(jar,.084,.084,.02,0,.17,0,surface('wood'));}this.register('shelf',shelf,[0,.32,0]);this.register('cart',cart(p,0,1.5),[0,.91,0],false);const ingredients=group(counter,-.25,.943,.06);ingredients.userData.propLabel='Talenan & bahan masakan';box(ingredients,.4,.025,.3,0,0,0,surface('wood'),.03);sphere(ingredients,.06,-.05,.077,0,'#b8bb69');sphere(ingredients,.065,.08,.077,-.03,'#c99466');
  this.addLocalModel('apartmentFridge',fridge,{fit:[.79,1.9,.79]},'fridge',true);
  const coffee=group(counter,.36,.927,-.04);this.registerProp('coffee',coffee,'Mesin kopi');this.addLocalModel('apartmentCoffee',coffee,{height:.31},'coffee');
  this.addLocalModel('kitchenPendants',p,{height:1.1,position:[-.25,2.08,-2.55]});
  // A tall oven alcove occupies the existing cabinet footprint at the rear right.
  const oven=group(p,3.72,0,-2.75);oven.userData={propLabel:'Lemari oven',solidSize:[1.04,.7]};box(oven,1.04,2.48,.65,0,1.24,0,surface('wood'),.016);
  this.addLocalModel('kitchenOven',oven,{fit:[.83,1.47,.68],position:[0,.52,.04],rotation:-Math.PI/2});
  this.drawTriangle();
 }
 drawTriangle(){const old=this.triangle;if(old){this.root.remove(old);old.geometry.dispose();old.material.dispose();}const f=this.values.fridge;const pts=[[-1.8,.023,-2.2],[1.2,.023,-2.3],[f.x,.023,f.z],[-1.8,.023,-2.2]].map(v=>new THREE.Vector3(...v));this.triangle=new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts),new THREE.LineDashedMaterial({color:'#d3e7a8',dashSize:.12,gapSize:.09,transparent:true,opacity:.75}));this.triangle.computeLineDistances();this.root.add(this.triangle);}
 home(){const p=this.root;const seating=this.register('sofa',sofa(p,0,-1.5),[0,1.22,0]);this.addLocalModel('apartmentSofa',seating,{fit:[1.9,.82,.9]},'sofa',true);box(p,3.25,.012,2.15,-.5,.008,-.6,surface('rug'),.018);const table=group(p,.15,0,-.35);table.userData={propLabel:'Meja kopi',solidSize:[1.1,.58]};box(table,1.1,.055,.58,0,.42,0,surface('wood'),.1);for(const x of [-.4,.4])for(const z of [-.18,.18])rod(table,[x,.41,z],[x*1.1,.01,z*1.1],.024,'#5b6350');book(table,.18,.46,0,'#e4dac2',.28,.03,.35);this.colliders.push({x:.15,z:-.35,w:1.1,d:.58});cabinet(p,3.6,-2.8,1.45);
  this.addReadingChair([-3.05,0,2.6],Math.PI*.7);
  for(const [id,x,z,col] of [['broom',-2.8,.25,'#c9ba82'],['mop',2.15,-.75,'#96b8a0']]){const g=group(p,x,0,z);const handle=group(g);cyl(handle,.018,.018,1,0,.54,0,mat('#b9aa85',.6));cyl(handle,.024,.024,.13,0,1.045,0,'#566e58');if(id==='mop'){box(g,.43,.045,.17,0,.04,0,'#6f9a85',.025);box(g,.46,.018,.2,0,.014,0,'#d3d8c3',.018);}else{box(g,.36,.04,.11,0,.09,0,'#8c7851',.01);box(g,.38,.09,.13,0,.045,0,'#d0b986',.012);}g.userData.handle=handle;this.register(id,g,[0,1.5,0]);}
  const boxg=group(p,1.9,0,1.4);box(boxg,.52,.47,.45,0,.24,0,mat('#b79a6d',.94),.008);box(boxg,.072,.002,.45,0,.478,0,'#d3bc8f');box(boxg,.072,.45,.002,0,.24,.227,'#d3bc8f');const label=box(boxg,.17,.10,.003,.12,.33,.23,'#ede3ca');this.register('box',boxg,[0,.69,0]);desk(p,2.9,1.4,.575,.8,.65);this.colliders.push({x:2.9,z:1.4,w:.8,d:.65});
 }
 workshop(){const p=this.root;const bench=desk(p,-.3,-1.75,.96,2.8,1.05);this.register('bench',bench,[0,1.17,0]);this.colliders.push({x:-.3,z:-1.75,w:2.8,d:1.05});const tools=group(p,-.25,0,-3.45);box(tools,2.35,.85,.035,0,0,0,mat('#acb29a',.85),.025);for(let x=-1.02;x<1.1;x+=.13)for(let y=-.3;y<.4;y+=.13)cyl(tools,.008,.008,.01,x,y,.025,'#667958',6).rotation.x=Math.PI/2;for(let i=0;i<6;i++){const xx=-.8+i*.3;rod(tools,[xx,.12,.09],[xx,-.17,.09],.025,i%2?'#d0ae6d':'#5a7160');if(i%2)box(tools,.17,.05,.06,xx,.16,.09,mat('#829184',.3,.5));else box(tools,.065,.12,.06,xx,.12,.09,mat('#b3b7a6',.3,.5));}this.register('tools',tools,[0,.58,0]);this.register('lamp',lamp(p,.8,-1.86,.99),[.1,.65,0]);this.register('cart',cart(p,.1,1.25),[0,.9,0]);
  box(bench,.45,.11,.37,-.65,1.04,0,'#667b60',.015);box(bench,.19,.16,.12,-.65,1.16,0,mat('#829081',.35,.6));book(bench,.2,1.01,.15,'#ede6d0',.38,.025,.3);cabinet(p,3.6,-2.8,1.45);
 }
 outdoor(){
  const p=this.root,stone=surface('stone'),wood=surface('wood'),dark=mat('#3a4640',.65,.2);
  this.deliveryTarget=this.deliveryPoint;
  buildNeighborhood(this,{box,cyl,group,mat,surface,sign,tree:this.addTree.bind(this),rod});
  this.buildGate();
  // Preserve the mission garden, now part of a much larger residential property.
  for(let i=0;i<14;i++)for(const x of [-.43,.43])box(p,.82,.065,.92,x,.017,4.55-i*.95,stone,.015);
  for(const side of [-1,1])box(p,.055,.075,13.6,side*.89,.022,-1.65,mat('#a3a699',.89),.008);
  box(p,15.9,.055,1.5,0,.012,-6.4,stone,.01);
  for(let i=0;i<20;i++)box(p,.012,.006,1.5,-7.5+i*.8,.043,-6.4,mat('#8b8f83',.96));
  for(const side of [-1,1])box(p,15.9,.075,.07,0,.032,-6.4+side*.79,'#a3a699');
  for(let i=0;i<5;i++)box(p,.78,.06,.64,-1.3-i*.78,.024,-3.2,stone,.018);
  for(let i=0;i<4;i++)box(p,.76,.06,.64,1.25+i*.77,.024,-2.35,stone,.018);
  this.portal('entrance',0,5.31,'MASUK RUMAH');
  plant(p,-1.05,4.72,.82);plant(p,1.13,4.72,.82);
  for(const [x,z,s,key] of [[-5.8,2.25,1.25,'treeGarden'],[-5.85,-4.5,1.55,'treeCanopy'],[6.1,1.7,1.4,'treeGarden'],[6.1,-5.3,1.45,'treeSlender']]){
   this.addTree(p,x,z,s,Math.abs(Math.round(x*13+z*19)),key);this.colliders.push({x,z,w:.7,d:.7});
  }
  const hedges=group(p);
  for(const [x,z] of [[-7.3,-1],[-7.3,0],[-7.3,1],[7.25,-1.2],[7.25,-.2],[7.25,.8]]){const shrub=tree(hedges,x,z,.42,Math.round((x+9)*21+z));shrub.position.y=-.5;}
  // Raised planter: only the bed and its supports change height, not the plants' proportions.
  const planter=group(p,3.45,0,-3.3),bed=group(planter),legs=[];
  box(bed,2.35,.035,1.03,0,-.17,0,dark,.012);
  for(const zz of [-.535,.535])box(bed,2.45,.28,.07,0,-.065,zz,wood,.015);
  for(const xx of [-1.19,1.19])box(bed,.07,.28,1.08,xx,-.065,0,wood,.015);
  box(bed,2.27,.035,.98,0,.038,0,surface('soil'));
  for(const xx of [-1.06,1.06])for(const zz of [-.43,.43])legs.push(box(planter,.06,1,.06,xx,.5,zz,dark));
  for(let i=0;i<6;i++){
   const herb=plant(bed,-.88+(i%3)*.86,-.23+Math.floor(i/3)*.46,.33);
   herb.position.y=-.115;
  }
  sign(bed,'KEBUN ERGONOMIS',0,-.055,.577,1.05,.115);
  planter.userData={bed,legs};this.register('planter',planter,[0,1.15,0]);
  this.colliders.push({x:3.45,z:-3.3,w:2.5,d:1.14});
  // Garden bench and an in-world destination ring make the carrying task readable.
  const bench=group(p,-2.6,0,-3.6);this.registerProp('garden-bench',bench,'Bangku taman',[1.85,.62]);
  for(let i=0;i<5;i++)box(bench,1.8,.045,.095,0,.48,-.22+i*.105,wood,.008);
  for(let i=0;i<3;i++)box(bench,1.8,.12,.04,0,.73+i*.14,-.31,wood,.008);
  for(const xx of [-.72,.72]){box(bench,.065,.51,.055,xx,.25,.2,dark,.008);box(bench,.065,1.06,.055,xx,.53,-.27,dark,.008);box(bench,.07,.05,.56,xx,.44,-.015,dark);}
  this.colliders.push({x:-2.6,z:-3.6,w:1.85,d:.62});
  const ringMaterial=new THREE.MeshStandardMaterial({color:'#bedb88',emissive:'#93bc59',emissiveIntensity:.3,transparent:true,opacity:.7,roughness:1,depthWrite:false});
  const ring=addMesh(p,geometry('delivery-ring',()=>new THREE.RingGeometry(.48,.54,48)),ringMaterial,-2,.068,-3);ring.rotation.x=-Math.PI/2;ring.castShadow=false;this.deliveryMarker=ring;
  const destination=group(bench,0,0,-.25);sign(destination,'ANTAR KOTAK DI SINI',0,1.38,0,1.22,.2);rod(destination,[-.58,.8,0],[-.58,1.51,0],.016,dark);rod(destination,[.58,.8,0],[.58,1.51,0],.016,dark);
  const carry=group(p,-1.35,0,3.5);this.package(carry);this.register('carry',carry,[0,.76,0]);
  // A timber crate deliberately starts across the main exit route.
  const path=group(p,0,0,.4);
  for(const z of [-.28,.28])for(let i=0;i<4;i++)box(path,.88,.105,.035,0,.12+i*.115,z,wood,.01);
  for(const x of [-.43,.43])for(let i=0;i<4;i++)box(path,.035,.105,.58,x,.12+i*.115,0,wood,.008);
  for(const x of [-.33,.33])box(path,.06,.56,.06,x,.3,.21,'#776447',.008);
  box(path,.76,.035,.53,0,.13,0,wood);cyl(path,.17,.13,.23,-.17,.53,0,mat('#a48260',.91));cyl(path,.13,.1,.18,.19,.5,.04,mat('#c6b69b',.9));
  sign(path,'PINDAHKAN DARI JALUR',0,.32,.303,.73,.105);this.register('path',path,[0,.92,0]);
  const light=group(p,1.25,0,-.9);
  cyl(light,.115,.14,.08,0,.06,0,dark,20);cyl(light,.047,.064,.86,0,.51,0,dark,20);
  const head=group(light,0,1.02,0);box(head,.24,.12,.24,0,0,0,dark,.035);
  const glow=new THREE.MeshStandardMaterial({color:'#f5dfaf',emissive:'#ffe0a0',emissiveIntensity:.5});box(head,.19,.025,.19,0,-.067,0,glow,.012);
  const lampLight=new THREE.PointLight('#ffe5b3',.5,3.2,2);lampLight.position.set(0,.9,0);light.add(lampLight);light.userData={light:lampLight,head,glow};this.register('light',light,[0,1.35,0]);
  this.colliders.push({x:1.25,z:-.9,w:.25,d:.25});
  // Instanced blades add parallax near the walkway without a draw call per blade.
  const grassCount=this.low?400:1200,grass=new THREE.InstancedMesh(geometry('grass-blade',()=>new THREE.PlaneGeometry(.035,.18)),leafMaterial(),grassCount),dummy=new THREE.Object3D(),random=seeded(909);
  for(let i=0;i<grassCount;i++){let x=(random()-.5)*15,z=-7.8+random()*12.6;if(Math.abs(x)<1.15)x+=x<0?-1.5:1.5;if(z< -5.5&&z> -7.3)z+=2;dummy.position.set(x,.065,z);dummy.rotation.set(.1,random()*Math.PI,.2-random()*.4);dummy.scale.setScalar(.55+random()*.7);dummy.updateMatrix();grass.setMatrixAt(i,dummy.matrix);}
  grass.receiveShadow=true;grass.castShadow=false;p.add(grass);
 }
 buildGate(){
  const dark=mat('#303b38',.66,.18),panel=group(this.root,0,0,GATE_Z);
  panel.userData.id='gate';
  for(const y of [.18,1.85])box(panel,4.7,.1,.16,0,y,0,dark);
  for(let i=0;i<30;i++)box(panel,.08,1.62,.12,-2.27+i*.156,1.015,0,surface('wood'));
  for(const x of [-2.3,2.3])box(panel,.1,1.85,.16,x,.97,0,dark);
  const proxy=box(panel,4.7,1.9,.18,0,.98,0,new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false}));proxy.castShadow=false;proxy.receiveShadow=false;
  const control=group(this.root,2.83,0,GATE_Z);
  box(control,.3,.43,.64,0,1.25,0,dark,.025);
  for(const side of [-1,1]){const face=group(control,0,0,side*.33);if(side<0)face.rotation.y=Math.PI;sign(face,'F · GERBANG',0,1.25,0,.29,.15);}
  this.register('gate',control,[0,1.25,0],false);
  const collider={x:0,z:GATE_Z,w:4.7,d:.18};this.colliders.push(collider);
  this.gate={panel,collider,progress:0,target:0};
 }
 toggleGate(){
  if(!this.gate)return false;
  const pos=(this.renderer.xr.isPresenting?this.renderer.xr.getCamera():this.camera).getWorldPosition(new THREE.Vector3());
  if(this.gate.target===1&&Math.abs(pos.x)<2.75&&Math.abs(pos.z-GATE_Z)<.75)return false;
  this.gate.target=this.gate.target===1?0:1;return true;
 }
 package(parent){
  box(parent,.52,.47,.45,0,.24,0,mat('#b79a6d',.94),.009);box(parent,.072,.002,.45,0,.478,0,'#d3bc8f');box(parent,.072,.45,.002,0,.24,.227,'#d3bc8f');
  sign(parent,'5 KG · DUA TANGAN',0,.32,.231,.37,.11,'#efe9d8');
 }
 addLocalModel(key,parent,options={},objectId=null,replace=false){
  const generation=this.buildGeneration,state=this.assetState;
  const fallback=replace?parent.children.filter(child=>!child.userData.hitProxy):[];
  state.pending++;
  loadDecorativeModel(key,options).then(model=>{
   const entry=objectId&&this.objects.get(objectId);
   if(generation!==this.buildGeneration||entry?.group.userData.importedModel){
    model.traverse(mesh=>{if(mesh.isMesh)for(const material of Array.isArray(mesh.material)?mesh.material:[mesh.material])material.dispose();});return;
   }
   for(const child of fallback){child.visible=false;child.traverse(mesh=>{if(mesh.isInstancedMesh)mesh.dispose();});}
   parent.add(model);state.loaded.push(key);
   if(objectId)this.updateHitBox(objectId);
   this.renderer.shadowMap.needsUpdate=true;
  }).catch(error=>{if(generation===this.buildGeneration){state.failed.push(key);console.warn(`Model ${key} belum tersedia; tampilan dasar tetap digunakan.`,error);}}).finally(()=>{state.pending--;});
 }
 addTree(parent,x,z,scale=1,seed=17,key='treeCanopy'){
  const ground=this.room==='outdoor'?-.06:-.2;
  const slot=group(parent,x,ground-.045,z);slot.name='sketchfab-tree';slot.userData.treeSlot=true;
  tree(slot,0,0,scale,seed);
  this.addLocalModel(key,slot,{height:4.2*scale,rotation:(seed%360)*Math.PI/180},null,true);
  return slot;
 }
 addReadingChair(position,rotation=0){
  const seat=group(this.root,...position);seat.rotation.y=rotation;
  this.registerProp('reading-chair',seat,'Kursi santai',[.82,.86]);
  this.addLocalModel('readingChair',seat,{height:.94},'reading-chair');
 }
 update(id,v){if(!v)return;const entry=this.objects.get(id);if(!entry)return;const g=entry.group;this.removePlacement(id);
  if(id==='dirt'){this.dirts.forEach((d,i)=>{d.visible=!v.cleaned.includes(i);});const remaining=this.dirts.find(d=>d.visible);entry.group=remaining||this.dirts[0];return;}
  if(this.room==='office'){
   if(id==='chair'){
    g.userData.seat.position.y=v.height/100;g.userData.back.rotation.x=THREE.MathUtils.degToRad(v.back-90);g.userData.stem.scale.y=(v.height/100-.13)/.32;g.userData.stem.position.y=.13+(v.height/100-.13)/2;entry.anchor.y=v.height/100+.72;
    const height=(v.deskHeight??75)/100,deskEntry=this.objects.get('desk'),data=deskEntry?.group.userData;
    if(data){data.top.position.y=height;for(const leg of data.legs){leg.scale.y=(height-.05)/(data.height-.05);leg.position.y=height/2-.035;}data.crossbar.position.y=height-.11;data.cableTray.position.y=height-.1;}
    if(this.desktopDecor){this.removePlacement('desktop-decor');this.desktopDecor.position.y=height-.75;this.applyPlacement('desktop-decor');}
    const lamp=this.objects.get('lamp');if(lamp){this.removePlacement('lamp');lamp.group.position.y=height+.015;this.applyPlacement('lamp');}
    this.update('keyboard',this.values.keyboard);this.update('monitor',this.values.monitor);if(lamp)this.updateHitBox('lamp');
   }
   if(id==='monitor'){
    const surfaceHeight=(this.values.chair?.deskHeight??75)/100;
    v.height=Math.max(v.height,Math.ceil(surfaceHeight*100+43.75));v.distance=Math.max(v.distance,this.values.keyboard.reach+11);
    const standHeight=v.height/100-.37-surfaceHeight-.04;
    g.userData.screen.position.y=v.height/100;g.position.z=-v.distance/100;g.userData.base.position.y=surfaceHeight+.042;g.userData.pole.scale.y=standHeight/.28;g.userData.pole.position.y=surfaceHeight+.055+standHeight/2;entry.anchor.y=v.height/100+.12;
   }
   if(id==='keyboard'){g.position.z=.12-v.reach/100;g.rotation.x=THREE.MathUtils.degToRad(v.tilt);g.position.y=(this.values.chair.deskHeight/100)+.028-localBounds(g).applyMatrix4(new THREE.Matrix4().makeRotationX(g.rotation.x)).min.y;this.update('monitor',this.values.monitor);}
  }
  if(id==='lamp'){g.userData.light.intensity=v.lux/500;g.rotation.y=v.direction===1?-.75:.7;}
  if(this.room==='kitchen'){
   if(id==='counter'){g.scale.y=v.height/90;}
   if(id==='fridge'){g.position.set(v.x,0,v.z);this.drawTriangle();}
   if(id==='shelf')g.position.y=v.height/100;
  }
  if(id==='cart'||id==='sofa')g.position.x=v.x;
  if(this.room==='home'){
   if(id==='broom'||id==='mop'){g.userData.handle.scale.y=v.length/100;g.userData.handle.rotation.z=v.posture===1?.06:.3;entry.anchor.y=v.length/100+.15;}
   if(id==='box'){g.position.y=v.practiced?.6:0;g.position.x=v.practiced?2.9:1.9;}
  }
  if(this.room==='outdoor'){
   if(id==='planter'){const height=v.height/100;g.userData.bed.position.y=height;for(const leg of g.userData.legs){leg.scale.y=Math.max(.1,height-.12);leg.position.y=(height-.12)/2;}entry.anchor.y=height+.55;}
   if(id==='path')g.position.x=v.x;
   if(id==='light'){g.userData.light.intensity=v.lux/160;g.userData.glow.emissiveIntensity=v.lux/220;g.userData.head.rotation.z=v.direction===1?0:.85;}
   if(id==='carry'&&!this.carrying){if(v.delivered)g.position.copy(this.objects.get('garden-bench').group.localToWorld(new THREE.Vector3(.6,.51,.08)));else g.position.set(-1.35,0,3.5);g.rotation.set(0,0,0);if(this.deliveryMarker)this.deliveryMarker.visible=!v.delivered;}
  }
  if(this.room==='workshop'){
   if(id==='bench'){g.scale.y=v.height/96;const l=this.objects.get('lamp');if(l){this.removePlacement('lamp');l.group.position.y=v.height/100+.03;this.applyPlacement('lamp');}}
   if(id==='tools'){g.position.y=v.height/100;g.position.z=-2.65-(v.reach/100-.2);}
  }
  if(v.rotation!==undefined)g.rotation.y=THREE.MathUtils.degToRad(v.rotation);
  if(g.userData.importedModel){const model=g.userData.importedModel,baseY=model.userData.importBaseY??0;if(id==='chair')model.position.y=baseY+(v.height-46)/100;if(id==='monitor')model.position.y=baseY+(v.height-120)/100;}
  this.applyPlacement(id);this.updateHitBox(id);this.renderer.shadowMap.needsUpdate=true;
 }
 updateHitBox(id){
  const entry=this.objects.get(id);if(!entry||id==='dirt'||id==='desk')return;const g=entry.group,bounds=localBounds(g),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());if(bounds.isEmpty()||!Number.isFinite(size.length()))return;
  if(!entry.hitBox){const material=new THREE.MeshBasicMaterial({transparent:true,opacity:0,depthWrite:false,colorWrite:false});entry.hitBox=new THREE.Mesh(geometry('hitbox-unit',()=>new THREE.BoxGeometry(1,1,1)),material);entry.hitBox.userData.hitProxy=true;entry.hitBox.castShadow=false;entry.hitBox.receiveShadow=false;g.add(entry.hitBox);}
  entry.hitBox.position.copy(center);entry.hitBox.scale.set(Math.max(.13,size.x),Math.max(.09,size.y),Math.max(.13,size.z));entry.hitBox.visible=true;entry.aim=center;if(this.propDefinitions.has(id))entry.anchor.copy(center);
 }
 treeBases(){const bases=[];this.root.traverse(g=>{if(g.userData.treeSlot){g.updateWorldMatrix(true,true);const model=g.children.find(c=>c.visible&&c.userData.assetKey);if(model)bases.push({position:g.getWorldPosition(new THREE.Vector3()).toArray(),minY:new THREE.Box3().setFromObject(model,true).min.y});}});return bases;}
 objectBounds(id){const g=this.objects.get(id)?.group;if(!g)return null;const bounds=localBounds(g).applyMatrix4(g.matrixWorld);return {min:bounds.min.toArray(),max:bounds.max.toArray()};}
 footprint(id,values={}){const entry=this.objects.get(id),g=entry?.group,size=entry?.solidSize||footprints[id];if(!g||!size||!g.visible)return null;const pos=g.getWorldPosition(new THREE.Vector3());return {x:values.x??pos.x,z:values.z??pos.z,w:size[0],d:size[1],rotation:values.rotation===undefined?g.rotation.y:THREE.MathUtils.degToRad(values.rotation)};}
 canPlace(id,values){
  const candidate=this.footprint(id,values);if(!candidate)return true;
  const c=Math.cos(candidate.rotation),s=Math.sin(candidate.rotation),extentX=(Math.abs(c)*candidate.w+Math.abs(s)*candidate.d)/2,extentZ=(Math.abs(s)*candidate.w+Math.abs(c)*candidate.d)/2;
  if(candidate.x-extentX<this.bounds.minX||candidate.x+extentX>this.bounds.maxX||candidate.z-extentZ<this.bounds.minZ||candidate.z+extentZ>this.bounds.maxZ)return false;
  const others=[...this.colliders];for(const [otherId,e] of this.objects){if(otherId===id||!e.group.visible)continue;const footprint=this.footprint(otherId);if(footprint)others.push(footprint);}
  const camera=(this.renderer.xr.isPresenting?this.renderer.xr.getCamera():this.camera).getWorldPosition(new THREE.Vector3());
  return !insideFootprint(camera.x,camera.z,candidate)&&!others.some(other=>overlappingFootprints(candidate,other));
 }
 pick(ndc=new THREE.Vector2(0,0),controller=null){
  this.scene.updateMatrixWorld();if(controller){const rotation=new THREE.Matrix4().extractRotation(controller.matrixWorld);this.raycaster.ray.origin.setFromMatrixPosition(controller.matrixWorld);this.raycaster.ray.direction.set(0,0,-1).applyMatrix4(rotation);}else this.raycaster.setFromCamera(ndc,this.camera);
  this.raycaster.far=3.5;const hits=this.raycaster.intersectObject(this.root,true);for(const hit of hits){if(hit.object.userData.hitProxy){let nested=false;hit.object.parent.traverse(n=>{if(n!==hit.object.parent&&n.userData.id)nested=true;});if(nested)continue;}let o=hit.object,hidden=false,id=null,dirtIndex;while(o&&o!==this.root){if(!o.visible)hidden=true;if(o.userData.id&&!id)id=o.userData.id;if(o.userData.dirtIndex!==undefined)dirtIndex=o.userData.dirtIndex;o=o.parent;}if(hidden)continue;if(!id)return null;return {id,dirtIndex,distance:hit.distance,point:hit.point};}return null;
 }
 highlight(id){const e=this.objects.get(id);if(e&&e.group.visible){this.outline.setFromObject(e.group);this.outline.visible=true;}else this.outline.visible=false;}
 positionOf(id){const e=this.objects.get(id);if(!e)return new THREE.Vector3();e.group.updateWorldMatrix(true,false);return e.group.localToWorld(e.anchor.clone());}
 collision(x,z){
  const bounds=this.bounds||{minX:-4.15,maxX:4.15,minZ:-3.65,maxZ:3.65};if(x<bounds.minX||x>bounds.maxX||z<bounds.minZ||z>bounds.maxZ)return true;
  if(this.colliders.some(b=>insideFootprint(x,z,b)))return true;
  for(const [id,e] of this.objects){if(!e.group.visible||this.mover.contains(e.group)||(id==='carry'&&this.carrying))continue;const footprint=this.footprint(id);if(footprint&&insideFootprint(x,z,footprint))return true;}
  return false;
 }
 focus(id){
  if(id==='gate'&&this.gate){const side=this.camera.getWorldPosition(new THREE.Vector3()).z<GATE_Z?-1:1;this.camera.position.set(1,1.64,GATE_Z+side*2.6);this.camera.lookAt(this.gate.target?2.83:1,1.25,GATE_Z+(this.gate.target?side*.34:0));this.camera.updateMatrixWorld();return;}
  const e=this.objects.get(id);if(!e)return;e.group.updateWorldMatrix(true,false);const target=e.aim?e.group.localToWorld(e.aim.clone()):this.positionOf(id);const gpos=e.group.getWorldPosition(new THREE.Vector3());
  const bounds=this.bounds,offsets=['entrance','exit'].includes(id)?[[0,-1.9],[-1.1,-1.4],[1.1,-1.4]]:[[1.1,1.7],[1.6,.7],[-1.2,1.5],[0,2],[1.5,-.7],[-1.6,-.7]];
  let fallback=null;for(const [dx,dz] of offsets){const x=THREE.MathUtils.clamp(gpos.x+dx,bounds.minX+.05,bounds.maxX-.05),z=THREE.MathUtils.clamp(gpos.z+dz,bounds.minZ+.05,bounds.maxZ-.05);if(this.collision(x,z))continue;fallback??=[x,1.64,z];this.camera.position.set(x,1.64,z);this.camera.lookAt(target);this.camera.updateMatrixWorld();if(this.pick()?.id===id)return;}if(fallback)this.camera.position.fromArray(fallback);
  this.camera.lookAt(target.x,target.y,target.z);this.camera.updateMatrixWorld();
 }
 move(strafe,forward,dt,speed=2.1){this.walking=true;const yaw=this.camera.rotation.y,dx=(Math.cos(yaw)*strafe-Math.sin(yaw)*forward)*dt*speed,dz=(-Math.sin(yaw)*strafe-Math.cos(yaw)*forward)*dt*speed;const p=this.camera.position;if(!this.collision(p.x+dx,p.z))p.x+=dx;if(!this.collision(p.x,p.z+dz))p.z+=dz;p.y=THREE.MathUtils.lerp(p.y,1.64,Math.min(1,dt*6));}
 animateActivity(id){const e=this.objects.get(id);if(!e)return;const g=e.group;this.animations.push({g,id,time:0,start:performance.now(),base:g.position.clone(),rotation:g.rotation.clone()});}
 beginCarry(){
  const entry=this.objects.get('carry');if(this.room!=='outdoor'||!entry||this.carrying||this.values.carry.delivered)return false;
  const cameraPosition=(this.renderer.xr.isPresenting?this.renderer.xr.getCamera():this.camera).getWorldPosition(new THREE.Vector3());if(cameraPosition.distanceTo(this.positionOf('carry'))>3.5)return false;
  this.carryStart=entry.group.position.clone();this.carrying=true;this.hands.perform('reach');this.camera.add(entry.group);entry.group.position.set(.15,-.65,-.83);entry.group.rotation.set(0,0,0);this.outline.visible=false;this.renderer.shadowMap.needsUpdate=true;return true;
 }
 updateDeliveryTarget(){const bench=this.objects.get('garden-bench')?.group;if(!bench)return;bench.updateWorldMatrix(true,false);this.deliveryPoint.copy(bench.localToWorld(new THREE.Vector3(.6,0,.6)));if(this.deliveryMarker){this.deliveryMarker.position.set(this.deliveryPoint.x,.068,this.deliveryPoint.z);}}
 deliveryDistance(){
  if(this.room!=='outdoor')return Infinity;this.updateDeliveryTarget();const position=this.camera.getWorldPosition(new THREE.Vector3());return Math.hypot(position.x-this.deliveryPoint.x,position.z-this.deliveryPoint.z);
 }
 finishCarry(){
  if(!this.carrying||this.deliveryDistance()>1.8)return false;const entry=this.objects.get('carry');this.root.add(entry.group);entry.group.position.copy(this.objects.get('garden-bench').group.localToWorld(new THREE.Vector3(.6,.51,.08)));entry.group.rotation.set(0,0,0);this.carrying=false;this.carryStart=null;if(this.deliveryMarker)this.deliveryMarker.visible=false;this.updateHitBox('carry');this.renderer.shadowMap.needsUpdate=true;return true;
 }
 cancelCarry(){
  if(!this.carrying)return;const entry=this.objects.get('carry');if(entry){this.root.add(entry.group);entry.group.position.copy(this.carryStart||new THREE.Vector3(-1.35,0,3.5));entry.group.rotation.set(0,0,0);this.updateHitBox('carry');}this.carrying=false;this.carryStart=null;this.renderer.shadowMap.needsUpdate=true;
 }
 tick(dt){
  this.cookingVisual?.tick(dt);this.mover.tick();this.hands.update(dt,{moving:!!this.walking,carrying:this.carrying||!!this.mover.active,visible:!this.renderer.xr.isPresenting,grips:this.mover.gripTargets(),targets:this.hands.action?.type==='stir'?this.cookingVisual?.targets(this.camera):null});this.walking=false;
  if(this.gate&&this.gate.progress!==this.gate.target){const gate=this.gate,step=dt*.85;gate.progress=gate.target>gate.progress?Math.min(gate.target,gate.progress+step):Math.max(gate.target,gate.progress-step);gate.panel.position.x=gate.progress*5;gate.collider.x=gate.panel.position.x;this.renderer.shadowMap.needsUpdate=true;}
  if(this.room==='outdoor'&&!this.low){const pos=this.camera.getWorldPosition(new THREE.Vector3());if(Math.hypot(pos.x-this.sun.target.position.x,pos.z-this.sun.target.position.z)>8){this.sun.target.position.set(pos.x,0,pos.z);this.sun.position.set(pos.x-24,38,pos.z+14);this.renderer.shadowMap.needsUpdate=true;}}
  if(this.carrying){const g=this.objects.get('carry')?.group;if(g)g.position.y=-.65+Math.sin(performance.now()*.0025)*.009;this.renderer.shadowMap.needsUpdate=true;}
  if(this.room==='outdoor')this.updateDeliveryTarget();
  if(this.deliveryMarker?.visible)this.deliveryMarker.material.opacity=.54+Math.sin(performance.now()*.002)*.14;
  for(const a of this.animations){a.time=(performance.now()-a.start)/1000;const t=Math.min(a.time/1.6,1);if(a.id==='box'){a.g.position.y=Math.sin(t*Math.PI/2)*.6;a.g.position.x=1.9+Math.max(0,(t-.4)/.6);}else{a.g.rotation.z=a.rotation.z+Math.sin(t*Math.PI*6)*.15;a.g.position.z=a.base.z+Math.sin(t*Math.PI*4)*.18;}if(t===1){if(a.id!=='box'){a.g.rotation.copy(a.rotation);a.g.position.copy(a.base);}}this.renderer.shadowMap.needsUpdate=true;}this.animations=this.animations.filter(a=>a.time<1.6);
 }
}
