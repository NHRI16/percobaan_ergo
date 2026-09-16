import * as THREE from 'three';

// Landmarks measured on the supplied Female hand scan, in its original OBJ axes.
// Keep these in source units so rebuilding the lightweight GLB does not change the rig.
export const DIGITS = {
  thumb: [[3,-1,11],[4.2,-1.6,13.4],[5.55,-1.9,15.3],[6.45,-2.2,16.9]],
  index: [[2.9,-.7,16],[3.15,-1.2,19.3],[3.2,-2.3,21.6],[3.25,-3.4,23.4]],
  middle: [[.25,-.9,16.8],[.25,-1.8,20.5],[.45,-3.1,23],[.6,-4.1,24.35]],
  ring: [[-2,-1.3,15.7],[-2,-2,19],[-1.9,-3.1,21.3],[-1.9,-4.2,22.5]],
  little: [[-3.6,-1.8,14],[-4,-2.4,17],[-4.2,-3.5,19],[-4.3,-4.4,20.1]],
};
const transform = new THREE.Matrix4().compose(new THREE.Vector3(-.0027,.0117,.108),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),Math.PI),new THREE.Vector3(.009,.009,.009));
const convert = p => new THREE.Vector3(...p).applyMatrix4(transform);
const smooth = (a,b,v) => THREE.MathUtils.smoothstep(v,a,b);

export function createHandRig(source, side = 1) {
  let original; source.traverse(node => { if (node.isMesh && !original) original = node; });
  if (!original?.geometry.attributes.position) throw new Error('Female hand mesh is missing');
  const geometry = original.geometry.clone(), vertices = geometry.attributes.position;
  const material = original.material.clone(); material.roughness = .7; material.metalness = 0;
  material.normalScale?.setScalar(.55); material.side = THREE.FrontSide;
  const bones = [], positions = [], digits = {};
  function bone(name, point, parent = null) {
    const node = new THREE.Bone(); node.name = `${side === 1 ? 'Right' : 'Left'}_${name}`;
    const position = convert(point); node.position.copy(position);
    if (parent !== null) { node.position.sub(positions[parent]); bones[parent].add(node); }
    const index = bones.length; bones.push(node); positions.push(position); return index;
  }
  bone('Forearm',[-.7,0,0]); bone('Wrist',[-.5,-1.1,8.5],0); bone('Palm',[-.3,-1.3,12],1);
  const chains = Object.entries(DIGITS).map(([name,points]) => {
    const indices = points.map((point,i) => bone(`${name}_${i}`,point,i ? bones.length-1 : 2));
    digits[name] = indices.map(index => bones[index]);
    const vectors = points.map(p=>new THREE.Vector3(...p));
    const lengths = vectors.slice(1).map((p,i)=>p.distanceTo(vectors[i]));
    return { name, indices, points:vectors, lengths, direction:vectors[1].clone().sub(vectors[0]).normalize() };
  });
  const indices = new Uint16Array(vertices.count*4), weights = new Float32Array(vertices.count*4), point = new THREE.Vector3();
  for (let i=0;i<vertices.count;i++) {
    point.fromBufferAttribute(vertices,i);
    const candidates=[];
    for (const chain of chains) {
      let along=0,closest=null;
      for(let j=0;j<3;j++){
        const segment=new THREE.Line3(chain.points[j],chain.points[j+1]);
        const t=segment.closestPointToPointParameter(point,true),nearest=segment.at(t,new THREE.Vector3());
        const distance=point.distanceToSquared(nearest);
        if(!closest||distance<closest.distance)closest={chain,distance,along:along+t*chain.lengths[j]};
        along+=chain.lengths[j];
      }
      candidates.push(closest);
    }
    candidates.sort((a,b)=>a.distance-b.distance);
    const nearby=candidates.slice(0,2), proximity=nearby.map(c=>Math.exp(-(c.distance-nearby[0].distance)*1.7)),sum=proximity[0]+proximity[1];
    const influences=new Map(),add=(index,weight)=>{if(weight>0)influences.set(index,(influences.get(index)||0)+weight);};
    let totalDigits=0;
    nearby.forEach((candidate,n)=>{
      const {chain,along}=candidate,forward=point.clone().sub(chain.points[0]).dot(chain.direction);
      // Blend across the web, instead of making a hard seam between thumb/index.
      const web=chain.name==='thumb'?smooth(1.6,4.9,point.x):1;
      const digitWeight=smooth(-1.25,1.4,forward)*web*proximity[n]/sum;totalDigits+=digitWeight;
      const j1=chain.lengths[0],j2=j1+chain.lengths[1],middle=smooth(j1-.8,j1+.8,along),distal=smooth(j2-.65,j2+.65,along);
      add(chain.indices[0],digitWeight*(1-middle));add(chain.indices[1],digitWeight*middle*(1-distal));add(chain.indices[2],digitWeight*distal);
    });
    const wrist=smooth(5,9,point.z),palm=smooth(9.5,13,point.z);
    add(0,(1-totalDigits)*(1-wrist));add(1,(1-totalDigits)*wrist*(1-palm));add(2,(1-totalDigits)*wrist*palm);
    const sorted=[...influences].sort((a,b)=>b[1]-a[1]).slice(0,4), total=sorted.reduce((sum,item)=>sum+item[1],0);
    sorted.forEach(([index,weight],j)=>{indices[i*4+j]=index;weights[i*4+j]=weight/total;});
  }
  geometry.applyMatrix4(transform); geometry.setAttribute('skinIndex',new THREE.Uint16BufferAttribute(indices,4)); geometry.setAttribute('skinWeight',new THREE.Float32BufferAttribute(weights,4));
  const mesh = new THREE.SkinnedMesh(geometry,material); mesh.name = `female-hand-${side===1?'right':'left'}`; mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones)); mesh.frustumCulled=false; mesh.castShadow=false; mesh.receiveShadow=false;
  // A negative parent scale mirrors geometry, bones and skinning together. The renderer
  // flips front-face winding; texture coordinates remain attached to the original scan.
  const root=new THREE.Group(); root.name=mesh.name+'-rig';root.scale.x=side;root.add(mesh);
  root.userData={source:'female_hand.glb',side:side===1?'right':'left',rigged:true};
  return {root,mesh,bones,digits,side,curls:null};
}

export function poseHand(rig, curls, opposition=.2, spread=0, wrist=0) {
  Object.entries(rig.digits).forEach(([name,joints],index)=>{
    const curl=curls[index];
    joints.forEach((joint,j)=>{
      joint.rotation.set(0,0,0); if(j===3)return;
      if(name==='thumb'){joint.rotation.z=curl*[.45,.75,.8][j];if(j===0){joint.rotation.y=-opposition;joint.rotation.x=-curl*.4;}}
      else {joint.rotation.x=-curl*[.58,.9,.65][j];if(j===0)joint.rotation.y=spread*[0,-.5,0,.4,.85][index];}
    });
  });
  rig.bones[1].rotation.x=wrist; rig.curls=[...curls]; rig.root.updateMatrixWorld(true); rig.mesh.skeleton.update();
}

export function handContact(rig){
  const index=rig.digits.index[3].getWorldPosition(new THREE.Vector3()),thumb=rig.digits.thumb[3].getWorldPosition(new THREE.Vector3());
  return rig.root.worldToLocal(index.add(thumb).multiplyScalar(.5)).multiply(rig.root.scale);
}

export function readHandRigs(scene){
  return [-1,1].map(side=>{
    const label=side===1?'right':'left';let root;
    scene.traverse(node=>{if(node.userData.rigged&&node.userData.side===label)root=node;});
    if(!root)throw new Error(`Missing ${label} hand rig`);
    let mesh;root.traverse(node=>{if(node.isSkinnedMesh)mesh=node;});
    if(!mesh||mesh.skeleton.bones.length!==23)throw new Error(`Incomplete ${label} hand skeleton`);
    const bones=mesh.skeleton.bones,digits={};
    for(const name of Object.keys(DIGITS))digits[name]=[0,1,2,3].map(j=>{
      const bone=bones.find(b=>b.name===`${side===1?'Right':'Left'}_${name}_${j}`);
      if(!bone)throw new Error(`Missing ${label} ${name} joint`);return bone;
    });
    root.position.set(0,0,0);mesh.frustumCulled=false;mesh.castShadow=false;mesh.receiveShadow=false;
    return {root,mesh,bones,digits,side,curls:null};
  });
}

