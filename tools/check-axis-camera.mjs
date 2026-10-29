import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import * as THREE from 'three';
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
camera.position.set(4.8,2.2,5.5);camera.lookAt(0,.05,0);
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
assert(!/turntable\.rotation\.y\s*=.*progress/.test(runtime),'Scroll must not rotate the whole model around a stationary camera');
console.log('PASS: drag orbit, persistent camera during pose updates, native wheel/touch scrolling, keyboard access, reset, and slider removal.');
