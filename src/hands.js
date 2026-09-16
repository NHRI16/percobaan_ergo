import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { readHandRigs, poseHand, handContact } from './hand-rig.js';
import { HAND_POSES as POSES } from './hand-poses.js';
const blend=(a,b,t)=>a+(b-a)*t;
export class PlayerHands {
 constructor(camera){
  this.camera=camera;this.root=new THREE.Group();this.root.name='player-hands';camera.add(this.root);
  this.time=0;this.action=null;this.status='loading';this.error=null;this.currentPose='idle';
  this.sleeve=new THREE.MeshStandardMaterial({color:'#50685b',roughness:.94});
  const armGeometry=new THREE.CylinderGeometry(.029,.041,1,12),skin=new THREE.MeshStandardMaterial({color:'#c79973',roughness:.86});
  this.fallbackResources=[skin,new THREE.SphereGeometry(.045,10,8),new THREE.CapsuleGeometry(.009,.05,3,6)];
  this.hands=[-1,1].map(side=>{
   const group=new THREE.Group();group.name=side===1?'right-hand':'left-hand';this.root.add(group);
   const fallback=new THREE.Group();group.add(fallback);
   const palm=new THREE.Mesh(this.fallbackResources[1],skin);palm.scale.set(.95,.45,1.25);fallback.add(palm);
   const fingers=[];
   for(let i=0;i<5;i++){const finger=new THREE.Mesh(this.fallbackResources[2],skin);finger.position.set(i===4?-side*.045:(i-1.5)*.02,0,i===4?-.01:-.07);finger.rotation.x=Math.PI/2;fallback.add(finger);fingers.push(finger);}
   const arm=new THREE.Mesh(armGeometry,this.sleeve);group.add(arm);
   return {group,arm,fallback,fingers,side,rig:null,curls:[...POSES.idle.curls],opposition:.1,spread:.04,started:false};
  });
  this.ready=this.load();
 }
 async load(){
  try{
   const gltf=await new GLTFLoader().loadAsync('/assets/models/sketchfab/female-hands-rigged.glb');
   const rigs=readHandRigs(gltf.scene);this.clips=gltf.animations.map(clip=>clip.name);
   this.hands.forEach((hand,i)=>{hand.rig=rigs[i];hand.group.add(hand.rig.root);hand.group.remove(hand.fallback);hand.fallback=null;});
   this.fallbackResources.forEach(resource=>resource.dispose());this.fallbackResources=[];
   // Independent geometry and skeletons share the original scan's image maps.

   this.status='ready';return true;
  }catch(error){this.status='fallback';this.error=error.message;console.warn('Model tangan belum tersedia; tangan dasar tetap aktif.',error);return false;}
 }
 perform(type='reach',seconds=.55){this.action={type,start:this.time,duration:seconds};}
 update(dt,{moving=false,carrying=false,visible=true,targets=null,grips=null}={}){
  this.time+=dt;this.root.visible=visible;
  const progress=this.action?Math.min(1,(this.time-this.action.start)/this.action.duration):0,envelope=this.action?Math.sin(progress*Math.PI):0,action=this.action?.type;
  const pose=carrying?(grips?.pinch?'pinch':'carry'):action==='stir'?'stir':action==='press'?'pinch':action==='clean'?'clean':action==='reach'||action==='release'?'reach':'idle';
  this.currentPose=pose;
  const damping=1-Math.exp(-dt*16),targetPosition=new THREE.Vector3(),targetRotation=new THREE.Euler(),targetQuaternion=new THREE.Quaternion();
  for(const hand of this.hands){
   const {group,side,arm,rig}=hand,bob=moving?Math.sin(this.time*8+side)*.009:Math.sin(this.time*1.7)*.002;
   targetPosition.set(side*.23,-.18+bob+envelope*.04,-.43-envelope*.12);targetRotation.set(-.12,side*-.13,-side*.14);
   const target=POSES[action==='stir'&&side===-1?'carry':pose];hand.curls=hand.curls.map((v,i)=>blend(v,target.curls[i],damping));hand.opposition=blend(hand.opposition,target.opposition,damping);hand.spread=blend(hand.spread,target.spread,damping);
   if(rig)poseHand(rig,hand.curls,hand.opposition,hand.spread,Math.sin(this.time*1.7)*.012);
   if(carrying){
    targetPosition.copy(grips?(side===1?grips.right:grips.left):new THREE.Vector3(side*.25,-.29,-.77));targetRotation.set(.04,side*.08,-side*1.28);
    targetQuaternion.setFromEuler(targetRotation);targetPosition.sub((rig?handContact(rig):new THREE.Vector3(0,-.035,-.045)).applyQuaternion(targetQuaternion));
   }else if(action==='stir'&&targets){
    targetPosition.copy(side===1?targets.right:targets.left);targetRotation.set(side===1?.7:.45,side===1?.55:-.5,side===1?-.65:.65);
    targetQuaternion.setFromEuler(targetRotation);targetPosition.sub((rig?handContact(rig):new THREE.Vector3(0,-.04,-.04)).applyQuaternion(targetQuaternion));
   }else if(action==='press'&&side===1){targetPosition.set(.08,-.16,-.62-envelope*.12);targetRotation.set(-.2,-.1,-.2);}
   else if(action==='clean'&&side===1){targetPosition.x=.12+Math.sin(progress*Math.PI*4)*.1;targetPosition.y=-.25;targetPosition.z=-.64;}
   targetQuaternion.setFromEuler(targetRotation);
   if(!hand.started){group.position.copy(targetPosition);group.quaternion.copy(targetQuaternion);hand.started=true;}
   else {if(action==='stir'&&targets&&progress>.12)group.position.copy(targetPosition);else group.position.lerp(targetPosition,damping);group.quaternion.slerp(targetQuaternion,damping);}
   if(!rig)hand.fingers.forEach((finger,i)=>finger.rotation.x=Math.PI/2+hand.curls[i]);
   // Join the sleeve inside the scan's forearm opening, then aim it at the shoulder.
   group.updateMatrix();
   const wrist=new THREE.Vector3(side*.004,.012,.112),shoulder=new THREE.Vector3(side*.24,-.39,.15).applyMatrix4(group.matrix.clone().invert());
   arm.position.copy(wrist).add(shoulder).multiplyScalar(.5);const direction=wrist.clone().sub(shoulder);
   arm.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.clone().normalize());arm.scale.y=direction.length()+.025;
   hand.contactError=null;
   if(rig&&action==='stir'&&targets){group.updateWorldMatrix(true,true);const contact=this.camera.worldToLocal(group.localToWorld(handContact(rig)));hand.contactError=contact.distanceTo(side===1?targets.right:targets.left);}
  }
  if(this.action&&progress===1)this.action=null;
 }
 snapshot(){return {visible:this.root.visible,action:this.action?.type||null,status:this.status,model:this.status==='ready'?'female_hand.glb':'procedural',clips:this.clips||[],pose:this.currentPose,error:this.error,sides:this.hands.map(hand=>({side:hand.side===1?'right':'left',bones:hand.rig?.bones.length||0,mirrored:hand.rig?.root.scale.x===-1,contactError:hand.contactError??null,curls:[...hand.curls]}))};}
}
