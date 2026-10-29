import assert from 'node:assert/strict';
import {WheelPace,canPaceAt,installSteadyWheel} from '../assets/scroll-pace.js';
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

const range={start:0,end:13433.472,unit:1000};
assert(canPaceAt(0,1,range),'Down must enter the timeline from the exact start');
assert(!canPaceAt(0,-1,range),'Up at the start must remain native');
for(const y of [Math.floor(range.end),Math.round(range.end),Math.ceil(range.end)])assert(!canPaceAt(y,1,range),'Rounded end positions must release native downward scrolling');
assert(canPaceAt(Math.round(range.end),-1,range),'Up must re-enter from the end');

// Exercise the actual event/RAF controller, including a zero-time first frame.
const listeners=new Map(),frames=new Map(),classes=new Set();let id=0,now=100,y=0;
globalThis.Element=class{};
globalThis.document={hidden:false,body:{},documentElement:{classList:{add:c=>classes.add(c),remove:c=>classes.delete(c)}},addEventListener(){},removeEventListener(){}};
globalThis.addEventListener=(name,fn)=>listeners.set(name,fn);globalThis.removeEventListener=(name)=>listeners.delete(name);
globalThis.requestAnimationFrame=fn=>{frames.set(++id,fn);return id;};globalThis.cancelAnimationFrame=i=>frames.delete(i);
Object.defineProperty(globalThis,'performance',{value:{now:()=>now},configurable:true});
Object.defineProperty(globalThis,'scrollY',{get:()=>y,configurable:true});globalThis.window={scrollTo:({top})=>{y=Math.round(top);}};
const controller=installSteadyWheel(()=>range);
function wheel(delta){let prevented=false;listeners.get('wheel')({deltaX:0,deltaY:delta,cancelable:true,target:null,preventDefault(){prevented=true;}});return prevented;}
function frame(t){now=t;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(t));}
assert(wheel(1));frame(95);assert.equal(y,0);assert.equal(frames.size,1,'A zero-movement first RAF must not stop entry');frame(116);assert(y>0,'The next frame must move away from the opening');
controller.stop();y=Math.round(range.end);assert(!wheel(5000),'At the rounded ending, a large wheel event must pass through to contact');
assert(wheel(-1),'Reverse direction must re-enter the scene');frame(132);assert(y<range.end-1);
controller.dispose();assert.equal(frames.size,0);assert(!classes.has('steady-scroll-active'));
console.log('PASS: real controller starts at zero, releases fractional end, reverses and cleans up.');
