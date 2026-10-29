import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createCanvas} from '@napi-rs/canvas';
import {build} from 'esbuild';

// Pure geometry/render-math checks. These are not substitutes for browser QA.
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),out=path.join(root,'.qa');fs.mkdirSync(out,{recursive:true});
globalThis.self=globalThis;globalThis.devicePixelRatio=1;
globalThis.document={documentElement:{classList:{contains(){return false;}}},createElement(){return createCanvas(1,1);}};
await build({entryPoints:[path.join(root,'assets/scroll-runtime.src.js')],outfile:path.join(out,'runtime-test.mjs'),bundle:true,platform:'node',format:'esm',packages:'external',nodePaths:[path.join(root,'node_modules')]});
const {canvasRenderer}=await import(path.join(out,'runtime-test.mjs'));
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
loader.register(()=>({name:'geometry_test_no_textures',loadTexture(){return Promise.resolve(null);}}));
const report={date:'2026-10-29',scope:'Asset and render-math checks only; browser visual QA incomplete',models:[]};
for(const name of ['tide','axis']){
 const bytes=fs.readFileSync(path.join(root,`assets/models/${name}.glb`));
 const gltf=await loader.parseAsync(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),'');
 const model=gltf.scene;model.updateMatrixWorld(true);
 let vertices=0,triangles=0;model.traverse(o=>{if(o.isMesh){vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;}});
 assert(vertices>0&&triangles>0);const box=new THREE.Box3().setFromObject(model),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());
 assert([...box.min,...box.max].every(Number.isFinite));
 const scene=new THREE.Scene(),renderer=canvasRenderer();renderer.setSize(1200,675);let camera;
 const checks={name,bytes:bytes.length,vertices,triangles,clips:gltf.animations.length,bounds:{min:box.min.toArray(),max:box.max.toArray()}};
 if(name==='tide'){
  assert.equal(gltf.cameras.length,1);camera=gltf.cameras[0];camera.updateMatrixWorld(true);
  const camPos=camera.getWorldPosition(new THREE.Vector3()),camQ=camera.getWorldQuaternion(new THREE.Quaternion());camera.removeFromParent();camera.position.copy(camPos);camera.quaternion.copy(camQ);camera.aspect=1200/675;camera.updateProjectionMatrix();
  model.traverse(o=>{if(o.isMesh){const lines=new THREE.LineSegments(new THREE.WireframeGeometry(o.geometry),new THREE.LineBasicMaterial({color:0xd6e7aa,transparent:true,opacity:.35}));lines.matrixAutoUpdate=false;lines.matrix.copy(o.matrixWorld);scene.add(lines);}});
  scene.add(model);scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  const projected=center.clone().project(camera);assert(projected.z>-1&&projected.z<1);assert(Math.abs(projected.x)<1&&Math.abs(projected.y)<1);
  checks.projectedCenter=projected.toArray();checks.cameraFov=camera.fov;
  assert.equal(gltf.parser.json.images.length,2);checks.embeddedTextures=2;
  // Match the geometry with the source render framing, without fabricating a browser capture.
  renderer.render(scene,camera);
 }else{
  const scale=3/Math.max(size.x,size.y,size.z),rig=new THREE.Group(),turn=new THREE.Group();rig.scale.setScalar(scale);rig.position.copy(center).multiplyScalar(-scale);rig.add(model);turn.add(rig);scene.add(turn);
  camera=new THREE.PerspectiveCamera(38,1200/675,.01,100);camera.position.set(4.8,2.2,5.5);camera.lookAt(0,.05,0);
  model.traverse(o=>{if(o.isMesh)o.add(new THREE.LineSegments(new THREE.EdgesGeometry(o.geometry,35),new THREE.LineBasicMaterial({color:0xd6e7aa,transparent:true,opacity:.5})));});
  assert(gltf.animations.length>0);const mixer=new THREE.AnimationMixer(model),actions=gltf.animations.map(c=>mixer.clipAction(c));
  actions.forEach(a=>{a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();});const duration=Math.max(...gltf.animations.map(c=>c.duration));checks.duration=duration;checks.animationSamples=[];
  for(const fraction of [0,.25,.5,.75,.9999,.25,0]){
   for(const a of actions){a.paused=false;a.enabled=true;}mixer.setTime(fraction*duration);model.updateMatrixWorld(true);
   const sample=new THREE.Box3().setFromObject(model);assert([...sample.min,...sample.max].every(Number.isFinite));
   checks.animationSamples.push({fraction,min:sample.min.toArray(),max:sample.max.toArray()});
  }
  assert.deepEqual(checks.animationSamples[0],checks.animationSamples.at(-1));checks.reverseScrubbing='passed';
  mixer.setTime(duration*.5);renderer.render(scene,camera);
 }
 const canvas=createCanvas(1200,675),ctx=canvas.getContext('2d');ctx.fillStyle='#111710';ctx.fillRect(0,0,1200,675);ctx.drawImage(renderer.domElement,0,0);ctx.fillStyle='#d9fc58';ctx.font='16px monospace';ctx.fillText(name==='tide'?'TIDE / SOURCE CAMERA · GEOMETRY CHECK':'AXIS / SOURCE ANIMATION · GEOMETRY CHECK',32,40);ctx.fillStyle='#a5b399';ctx.font='13px sans-serif';ctx.fillText(name==='tide'?'Offline projection of the supplied model — not a browser screenshot':'Arm design: FabriCreator · Artist-authored motion, not an AI result',32,640);
 fs.writeFileSync(path.join(out,`${name}-geometry.png`),canvas.toBuffer('image/png'));report.models.push(checks);
 console.log(`${name}: ${bytes.length} bytes, ${triangles} triangles, ${gltf.animations.length} clips — PASS`);
}
fs.writeFileSync(path.join(out,'asset-check.json'),JSON.stringify(report,null,2));

