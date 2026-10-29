import assert from 'node:assert/strict';
import {createScrollVideo} from '../assets/scroll-video.js';
const frames=new Map();let id=0;
globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=i=>frames.delete(i);
function tick(){const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn());}
class Video extends EventTarget {
 constructor(){super();Object.assign(this,{dataset:{},autoplay:true,loop:true,controls:true,readyState:0,duration:4.166,paused:false,seeking:false,loads:0,writes:[],time:0});}
 pause(){this.paused=true;}
 load(){this.loads++;}
 get currentTime(){return this.time;}
 set currentTime(t){this.time=t;this.writes.push(t);this.seeking=true;}
 ready(){this.readyState=2;this.dispatchEvent(new Event('loadeddata'));}
 seeked(){this.seeking=false;this.dispatchEvent(new Event('seeked'));}
}
const video=new Video();let readyCount=0;const scrub=createScrollVideo(video,()=>readyCount++);
assert(video.paused&&!video.autoplay&&!video.loop&&!video.controls,'Scrubbing must disable competing autoplay/loop');
scrub.prepare();scrub.prepare();assert.equal(video.loads,1,'Preparation must never reset/reload the video repeatedly');
scrub.setProgress(.2);scrub.setProgress(.5);video.ready();tick();assert.equal(video.writes.length,1);assert(Math.abs(video.currentTime-(video.duration-1/24)*.5)<.001);
scrub.setProgress(.6);scrub.setProgress(.9);tick();assert.equal(video.writes.length,1,'Do not interrupt an active decoder seek');
video.seeked();tick();assert.equal(video.writes.length,2);assert(Math.abs(video.currentTime-(video.duration-1/24)*.9)<.001,'After seeking use only the newest target');
video.seeked();tick();assert.equal(video.writes.length,2,'A still scroll position must hold the same frame');
scrub.setProgress(.1);tick();assert(video.currentTime<1,'Reverse scrolling must rewind the video');
video.paused=false;video.dispatchEvent(new Event('play'));assert(video.paused,'Autoplay from other code must not compete');
assert.equal(readyCount,1);scrub.dispose();assert.equal(frames.size,0);assert.equal(video.dataset.scrollManaged,undefined);
console.log('PASS: paused scroll-driven video, one preload, latest-target coalescing, reverse scrubbing and still-frame hold.');
