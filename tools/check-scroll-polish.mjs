import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const timeline=read('assets/continuum.js'),html=read('index.html'),css=read('assets/continuum.css');
const timing=timeline.slice(timeline.indexOf(' const END='),timeline.indexOf(' const anchors='));
const {storyTime,scrollTime,SCROLL_END,END}=vm.runInNewContext(timing+';({storyTime,scrollTime,SCROLL_END,END})');
const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,p)=>a+(b-a)*p;
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
const windowed=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
const readWindow=name=>timeline.match(new RegExp('layer\\(n\\.'+name+',windowed\\(t,([\\d.,]+)\\)'))[1].split(',').map(Number);
const work=readWindow('work'),prelude=readWindow('prelude');
const axis=timeline.match(/axisA=windowed\(t,([\d.,]+)\)/)[1].split(',').map(Number);
let last=-1,readableWork=0,readableBlender=0;
for(let d=0;d<=SCROLL_END;d+=.001){
 const t=storyTime(d);assert(t>=last,'Forward scroll must remain monotone');last=t;
 const heading=windowed(t,...work),intro=windowed(t,...prelude),arm=windowed(t,...axis);
 if(heading>.999)readableWork+=.001;
 if(intro>.999)readableBlender+=.001;
 assert.equal(intro*arm,0,'Axis and Blender title must never overlap');
}
assert(readableWork/.85>1.6&&readableWork/.85<1.95,'Work heading should be readable without the previous long hold');
assert(timeline.includes('const cardsOut=1-smooth(2.92,3.22,t)'),'Travelling images must clear before the heading reading hold');
assert(readableBlender/.85>1.5&&readableBlender/.85<1.85,'Blender introduction should have a shorter, readable pause');
for(let t=0;t<=END;t+=.01)assert(Math.abs(storyTime(scrollTime(t))-t)<1e-10,'Anchors must use inverse timing');
assert(Math.abs(storyTime(SCROLL_END)-END)<1e-10,'The timeline must still reach the footer');
const sample=vm.runInNewContext(timeline.match(/ function sample[^\n]+/)[0]+';sample',{smooth,mix});
const boxes=timeline.match(/const portalBox=sample\((mobile\?[^;]+),t\);/)[1];
for(const mobile of [false,true]){
 const keys=vm.runInNewContext(boxes,{mobile}),settled=sample(keys,15.9);
 for(let t=15.9;t<=END;t+=.01)assert.deepEqual(sample(keys,t),settled,'Notes must hold the full settled frame');
}
const nav=html.match(/<nav class="main-nav"[^>]*>(.*?)<\/nav>/)[1];
assert(nav.includes('<a href="#contact">Contact</a>'));
assert(html.includes('href="mailto:hello@launchaxis.net"'),'The actual email link remains');
assert(timeline.includes("style(s.badge.lastElementChild,'visibility',t<=1.2?'hidden':'visible')"));
assert(css.includes('.hero-bottom-copy .round-link{transform:translateY(clamp(12px,2vh,22px))}'));
assert(css.includes('top:38%;width:29%;max-height:calc(62% - 60px)'));
assert(css.includes('top:58%;max-height:calc(42% - 52px)'));
assert(css.includes('overflow-y:auto'),'Expanded descriptions retain native scrolling');
console.log('PASS: reading holds, reversible anchors, Axis/Blender separation, fixed Notes frame, plain Contact, opening CTA and roomy descriptions.');
