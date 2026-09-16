import fs from 'node:fs';
import * as THREE from 'three';
import {createHandRig,poseHand} from '../src/hand-rig.js';
const b=fs.readFileSync('assets/models/sketchfab/female-hand.glb'),n=b.readUInt32LE(12),g=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
const a=g.accessors[g.meshes[0].primitives[0].attributes.POSITION],v=g.bufferViews[a.bufferView],positions=[];
for(let i=0;i<a.count;i++)for(let j=0;j<3;j++)positions.push(bin.readFloatLE((v.byteOffset||0)+(a.byteOffset||0)+i*(v.byteStride||12)+j*4));
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));const source=new THREE.Mesh(geometry,new THREE.MeshStandardMaterial());
const rig=createHandRig(source,1);
for(const [name,curls] of Object.entries({idle:[0,0,0,0,0],grip:[.6,.64,.72,.78,.82],stir:[.78,.87,.98,1.02,1.06]})){
 poseHand(rig,curls,.65);
 const points=Object.fromEntries(Object.entries(rig.digits).map(([k,b])=>[k,b[3].getWorldPosition(new THREE.Vector3()).toArray()]));console.log(name,JSON.stringify(points));
}

for(const opposition of [0,.15,.3,.45,.6]){
 poseHand(rig,[.9,.87,.98,1.02,1.06],opposition);console.log(opposition,rig.digits.thumb[3].getWorldPosition(new THREE.Vector3()).toArray());
}
