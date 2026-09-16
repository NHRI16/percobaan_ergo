import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as THREE from 'three';
import {createHandRig,poseHand,handContact} from '../src/hand-rig.js';
import {HAND_POSES} from '../src/hand-poses.js';

function sourceMesh(){
 const bytes=fs.readFileSync(new URL('../assets/models/sketchfab/female-hand.glb',import.meta.url)),length=bytes.readUInt32LE(12);
 const gltf=JSON.parse(bytes.subarray(20,20+length)),binary=bytes.subarray(28+length),accessor=gltf.accessors[gltf.meshes[0].primitives[0].attributes.POSITION],view=gltf.bufferViews[accessor.bufferView],positions=[];
 for(let i=0;i<accessor.count;i++)for(let j=0;j<3;j++)positions.push(binary.readFloatLE((view.byteOffset||0)+(accessor.byteOffset||0)+i*(view.byteStride||12)+j*4));
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));return new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
}

test('hand skinning assigns finite normalized weights to every vertex and all five fingers',()=>{
 const rig=createHandRig(sourceMesh()),weights=rig.mesh.geometry.attributes.skinWeight,indices=rig.mesh.geometry.attributes.skinIndex;
 assert.equal(rig.bones.length,23);assert.equal(Object.keys(rig.digits).length,5);
 const used=new Set();
 for(let i=0;i<weights.count;i++){
  let total=0;for(let j=0;j<4;j++){const w=weights.array[i*4+j],bone=indices.array[i*4+j];assert.ok(Number.isFinite(w)&&w>=0&&w<=1);assert.ok(bone<23);total+=w;if(w>.01)used.add(bone);}
  assert.ok(Math.abs(total-1)<1e-6);
 }
 for(const joints of Object.values(rig.digits))for(const bone of joints.slice(0,3))assert.ok(used.has(rig.bones.indexOf(bone)),bone.name);
});

test('finger bones deform the real mesh, keep the forearm stable, and mirror symmetrically',()=>{
 const source=sourceMesh(),right=createHandRig(source,1),left=createHandRig(source,-1),point=new THREE.Vector3();
 const rest=[];poseHand(right,[0,0,0,0,0],0,0);for(let i=0;i<right.mesh.geometry.attributes.position.count;i++)rest.push(right.mesh.getVertexPosition(i,new THREE.Vector3()));
 for(const pose of Object.values(HAND_POSES)){
  poseHand(right,pose.curls,pose.opposition,pose.spread);poseHand(left,pose.curls,pose.opposition,pose.spread);
  for(let i=0;i<rest.length;i++){
   const r=right.mesh.getVertexPosition(i,new THREE.Vector3()).applyMatrix4(right.mesh.matrixWorld),l=left.mesh.getVertexPosition(i,point).applyMatrix4(left.mesh.matrixWorld);
   assert.ok([r.x,r.y,r.z,l.x,l.y,l.z].every(Number.isFinite));assert.ok(Math.abs(r.x+l.x)<1e-6);assert.ok(Math.abs(r.y-l.y)<1e-6);assert.ok(Math.abs(r.z-l.z)<1e-6);
   if(rest[i].z>.08)assert.ok(r.distanceTo(rest[i])<1e-6,'forearm should not bend with the fingers');
  }
 }
 // Each individual finger can move without relying on a whole-hand transform.
 for(let finger=0;finger<5;finger++){
  const curls=[0,0,0,0,0];curls[finger]=.85;poseHand(right,curls,0,0);
  let moved=0;for(let i=0;i<rest.length;i++)if(right.mesh.getVertexPosition(i,point).distanceTo(rest[i])>.004)moved++;
  assert.ok(moved>40,`finger ${finger}: only ${moved} vertices moved`);
 }
 const pose=HAND_POSES.stir;poseHand(right,pose.curls,pose.opposition,pose.spread);
 const contact=handContact(right),thumb=right.digits.thumb[3].getWorldPosition(new THREE.Vector3()),index=right.digits.index[3].getWorldPosition(new THREE.Vector3());
 assert.ok(thumb.distanceTo(index)<.025,'thumb and index must close around a utensil');assert.ok(contact.length()<.15);
});
