import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createAxisCameraControls} from '../assets/axis-camera.js';

// Test input/camera behavior without a browser or WebGL dependency.
class Surface extends EventTarget {
 constructor(){super();this.style={};this.classes=new Set();this.classList={add:v=>this.classes.add(v),remove:v=>this.classes.delete(v)};this.clientWidth=800;this.clientHeight=400;this.root=new EventTarget();this.focused=false;}
 getRootNode(){return this.root;}
 setPointerCapture(){}
 releasePointerCapture(){}
 focus(){this.focused=true;}
}
const send=(host,type,values={})=>{const e=new Event(type,{cancelable:true});Object.assign(e,values);host.dispatchEvent(e);return e;};
const pointer=(host,type,x,y,button=0)=>send(host,type,{pointerId:1,pointerType:'mouse',clientX:x,clientY:y,pageX:x,pageY:y,button});
const host=new Surface(),reset=new Surface(),camera=new THREE.PerspectiveCamera(38,2,.01,100);
camera.position.set(4.8,2.2,-5.5);camera.lookAt(0,.05,0);
let redraws=0;
const input=createAxisCameraControls(camera,host,reset,()=>redraws++);
const homePosition=camera.position.clone(),homeOrientation=camera.quaternion.clone();
pointer(host,'pointerdown',200,200);pointer(host,'pointermove',330,160);pointer(host,'pointerup',330,160);
assert(camera.quaternion.angleTo(homeOrientation)>.1,'Dragging must orbit the camera');
assert(host.focused,'Pointer input must enable keyboard camera access');
assert(!host.classes.has('is-orbiting'),'Release must clear the dragging cursor');
assert(redraws>0,'Orbiting must request a redraw even when scroll is stationary');
const chosenPosition=camera.position.clone(),chosenOrientation=camera.quaternion.clone(),chosenTarget=input.controls.target.clone();
const model=new THREE.Object3D(),joint=new THREE.Object3D();joint.name='Joint';model.add(joint);
const mixer=new THREE.AnimationMixer(model),clip=new THREE.AnimationClip('Reach',1,[new THREE.NumberKeyframeTrack('Joint.rotation[z]',[0,1],[0,1])]);
mixer.clipAction(clip).play();
for(const progress of [.1,.6,.9,.3]){
 mixer.setTime(progress);
 assert(camera.position.distanceTo(chosenPosition)<1e-10,'Scroll must retain the camera position');
 assert(camera.quaternion.angleTo(chosenOrientation)<1e-7,'Scroll must retain the camera orientation');
 assert(input.controls.target.distanceTo(chosenTarget)<1e-10,'Scroll must retain the camera target');
}
const wheel=send(host,'wheel',{deltaY:120,deltaMode:0,clientX:300,clientY:200});
assert(!wheel.defaultPrevented,'Wheel must remain available to native page scrolling');
assert.equal(host.style.touchAction,'pan-y pinch-zoom','Vertical touch scrolling must remain available');
send(reset,'click');
assert(camera.position.distanceTo(homePosition)<1e-10,'Reset must restore the camera position');
assert(camera.quaternion.angleTo(homeOrientation)<1e-7,'Reset must restore camera orientation');
send(host,'keydown',{key:'ArrowRight',code:'ArrowRight',shiftKey:true});
assert(camera.quaternion.angleTo(homeOrientation)>.01,'Shift + arrow must orbit without a mouse');
send(host,'keydown',{key:'r',code:'KeyR'});
assert(camera.quaternion.angleTo(homeOrientation)<1e-7,'R must reset the camera');
input.dispose();
const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
assert(!html.includes('axis-motion-range'),'The old animation slider must be removed');
const runtime=readFileSync(new URL('../assets/scroll-runtime.src.js',import.meta.url),'utf8');
assert(runtime.includes('camera.position.set(4.8,2.2,-5.5)'),'The opening and reset camera should give a right-facing side view');
assert(!/turntable\.rotation\.y\s*=.*progress/.test(runtime),'Scroll must not rotate the whole model around a stationary camera');
// Check the actual exported starting pose, not just the camera coordinates.
const buffer=readFileSync(new URL('../assets/models/axis.glb',import.meta.url));
const gltf=await new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).parseAsync(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength),'');
const box=new THREE.Box3().setFromObject(gltf.scene),size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3()),scale=3/Math.max(size.x,size.y,size.z);
const rig=new THREE.Group();rig.scale.setScalar(scale);rig.position.copy(center).multiplyScalar(-scale);rig.add(gltf.scene);
const turntable=new THREE.Group();turntable.rotation.y=-.55;turntable.add(rig);
const actualMixer=new THREE.AnimationMixer(gltf.scene);
for(const clip of gltf.animations)actualMixer.clipAction(clip).play();
actualMixer.setTime(0);turntable.updateMatrixWorld(true);camera.updateMatrixWorld(true);
const jaw=name=>new THREE.Box3().setFromObject(gltf.scene.getObjectByName(name)).getCenter(new THREE.Vector3());
const gripper=jaw('Pinza1').add(jaw('Pinza2')).multiplyScalar(.5);
const shoulder=gltf.scene.getObjectByName('Eje_Central_pivot').getWorldPosition(new THREE.Vector3());
const rightwardSpan=gripper.clone().project(camera).x-shoulder.clone().project(camera).x;
assert(rightwardSpan>.15,'The actual gripper must point clearly RIGHT of the shoulder on screen');
const reach=gripper.clone().sub(shoulder);reach.y=0;reach.normalize();
const viewing=camera.position.clone();viewing.y=0;viewing.normalize();
assert(Math.abs(reach.dot(viewing))<.4,'The starting view should show the reach from the side, not end-on');
console.log('PASS: actual GLB starting pose faces right with a side-on silhouette.');
console.log('PASS: drag orbit, persistent camera during pose updates, native wheel/touch scrolling, keyboard access, reset, and slider removal.');
