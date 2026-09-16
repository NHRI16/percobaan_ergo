// Export the mirrored pair, skeletal weights and reusable animation clips.
// Browser requests are fulfilled from the workspace; no network downloads occur.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--enable-unsafe-swiftshader']});
try{
 const page=await browser.newPage({viewport:{width:1440,height:850}});
 await page.route('http://hand-preview.local/**',async route=>{
  const pathname=decodeURIComponent(new URL(route.request().url()).pathname);
  if(pathname==='/'){await route.fulfill({contentType:'text/html',body:'<html><body style="margin:0;background:#26322f"><script type="importmap">{"imports":{"three":"/node_modules/three/build/three.module.js","three/addons/":"/node_modules/three/examples/jsm/"}}</script></body></html>'});return;}
  const filename=path.resolve(root,'.'+pathname);if(!filename.startsWith(root+path.sep)){await route.abort();return;}
  try{await route.fulfill({body:await fs.readFile(filename),contentType:filename.endsWith('.js')?'text/javascript':'model/gltf-binary'});}catch{await route.abort();}
 });
 await page.goto('http://hand-preview.local/');
 const result=await page.evaluate(async()=>{
  const THREE=await import('three'),{GLTFLoader}=await import('three/addons/loaders/GLTFLoader.js'),{GLTFExporter}=await import('three/addons/exporters/GLTFExporter.js');
  const {createHandRig,poseHand}=await import('/src/hand-rig.js');const {HAND_POSES}=await import('/src/hand-poses.js');
  const gltf=await new GLTFLoader().loadAsync('/assets/models/sketchfab/female-hand.glb');
  const scene=new THREE.Scene(),rigs=[createHandRig(gltf.scene,-1),createHandRig(gltf.scene,1)];
  rigs.forEach(rig=>{scene.add(rig.root);rig.root.position.x=rig.side*.13;});scene.updateMatrixWorld(true);
  const profiles=Object.fromEntries(Object.entries({Idle:'idle',Reach:'reach',Grip:'carry',Pinch:'pinch',Stir:'stir',Clean:'clean',Release:'reach'}).map(([name,key])=>[name,HAND_POSES[key]]));
  const clips=Object.entries(profiles).map(([name,pose])=>{
   const times=[0,.18,.55,.82,1],tracks=[];
   for(const rig of rigs){
    const values=rig.bones.map(()=>[]);
    times.forEach((t,index)=>{const amount=index===0||index===4?0:1;poseHand(rig,pose.curls.map(v=>v*amount),pose.opposition*amount,pose.spread*amount);rig.bones.forEach((bone,i)=>values[i].push(...bone.quaternion.toArray()));});
    rig.bones.forEach((bone,i)=>tracks.push(new THREE.QuaternionKeyframeTrack(bone.name+'.quaternion',times,values[i])));
   }
   return new THREE.AnimationClip(name,1,tracks);
  });
  rigs.forEach(rig=>poseHand(rig,[0,0,0,0,0],0,0));scene.updateMatrixWorld(true);
  scene.userData={...gltf.asset.extras,modifications:'Mirrored left/right pair; 23 bones per hand; smooth skin weights; seven skeletal animation clips; 1K textures; legacy material conversion.'};
  const buffer=await new GLTFExporter().parseAsync(scene,{binary:true,animations:clips,maxTextureSize:1024});
  // A calibration view shows actual textured meshes and the resulting finger deformation.
  const renderer=new THREE.WebGLRenderer({antialias:true});renderer.setSize(1440,850);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor('#26322f');document.body.appendChild(renderer.domElement);
  const view=new THREE.Scene();view.add(new THREE.HemisphereLight('#ffffff','#53695e',2));const sun=new THREE.DirectionalLight('#ffeadb',3);sun.position.set(-1,3,2);view.add(sun);
  const camera=new THREE.PerspectiveCamera(34,1440/850,.01,10);camera.position.set(0,1.15,.44);camera.lookAt(0,0,0);
  for(const [i,name] of ['Idle','Grip','Pinch'].entries())for(const side of [-1,1]){const rig=createHandRig(gltf.scene,side);rig.root.position.set((i-1)*.31+side*.065,0,0);view.add(rig.root);poseHand(rig,profiles[name].curls,profiles[name].opposition,profiles[name].spread);}
  renderer.render(view,camera);
  const labels=document.createElement('div');labels.style.cssText='position:absolute;inset:35px 0 auto;display:flex;justify-content:space-around;color:#eff6e9;font:22px sans-serif';labels.innerHTML='<span>IDLE / RILEKS</span><span>GRIP / GENGGAM</span><span>PINCH / JEPIT</span>';document.body.appendChild(labels);
  const bytes=new Uint8Array(buffer);let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return {base64:btoa(binary),bones:rigs.map(r=>r.bones.length),clips:clips.map(c=>c.name)};
 });
 const output=path.join(root,'assets/models/sketchfab/female-hands-rigged.glb');await fs.writeFile(output,Buffer.from(result.base64,'base64'));
 await fs.mkdir(path.join(root,'artifacts'),{recursive:true});await page.screenshot({path:path.join(root,'artifacts/female-hands-calibration.png')});
 console.log(JSON.stringify({output,bytes:(await fs.stat(output)).size,bones:result.bones,clips:result.clips}));
}finally{await browser.close();}
