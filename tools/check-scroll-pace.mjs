import assert from 'node:assert/strict';
import {WheelPace} from '../assets/scroll-pace.js';
function run(delta,interval=100){const pace=new WheelPace();let distance=0;for(let t=0;t<=1000;t+=10){if(t%interval===0)pace.pulse(delta,t);distance+=pace.advance(t,1000);}return distance;}
assert.equal(run(1),run(1200),'Small and huge wheel deltas must travel at the same speed');
assert.equal(run(1,100),run(1200,10),'A higher wheel event rate must not accelerate the scene');
assert.equal(run(1),850,'One second of active input must move exactly .85 timeline units');
assert.equal(run(-1),-850,'Reverse scrolling must use the same speed');
const pace=new WheelPace();pace.pulse(100000,0);let distance=0;for(let t=10;t<=5000;t+=10)distance+=pace.advance(t,1000);
assert.equal(distance,255,'A fast flick must stop after 300ms without queued distance');
const delayed=new WheelPace();delayed.pulse(1,0);
assert.equal(delayed.advance(1000,1000),255,'Dropped frames must keep the same elapsed-time pace, bounded by the input window');
assert.equal(delayed.advance(2000,1000),0,'A delayed frame must not create any additional queued movement');
pace.pulse(1,5000);pace.stop();assert.equal(pace.advance(5016,1000),0,'Navigation and pointer input must cancel movement');
pace.pulse(1,6000);pace.advance(6010,1000);pace.pulse(-1,6010);assert(pace.advance(6020,1000)<0,'Direction must reverse without an old queue');
console.log('PASS: fixed speed across wheel deltas/event rates, reverse, bounded continuation and cancellation.');
