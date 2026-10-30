import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),runtime=read('assets/scroll-runtime.src.js'),timeline=read('assets/continuum.js'),css=read('assets/copy-polish.css');
assert(!html.includes('Explore the projects in progress.'));
assert(!/\bfilm\b/i.test(html));
assert(html.includes('AI, robotics, and animation.'));
assert(html.includes('class="discipline-word">Animation</span>'));
for(const url of ['https://www.reddit.com/r/LaunchAxis/','https://discord.gg/DuFbXJnEp'])assert(html.includes('href="'+url+'"'));
assert(html.includes('<span class="arm-designer">Arm design by <a'));
assert(css.includes('figcaption>.arm-designer{display:inline-flex;align-items:baseline;gap:.35em;white-space:nowrap'));
for(const phrase of ['Taking shape...','Coming together...']){
 assert(runtime.includes(phrase));assert(read('assets/scroll-runtime.js').includes(phrase));
}
const clamp=v=>Math.max(0,Math.min(1,v)),smooth=(a,b,v)=>{const p=clamp((v-a)/(b-a));return p*p*(3-2*p);};
// Evaluate the production expressions rather than a separate timing model.
const phase=runtime.match(/const phase=([^;]+);/)[1];
const heading=runtime.match(/'--heading-opacity',\(([^\n]+?)\)\.toFixed/)[1];
const reveal=runtime.match(/reveal=(smooth\([^\)]+\))/)[1];
const states=p=>vm.runInNewContext('({phase:'+phase+',heading:'+heading+',reveal:'+reveal+'})',{p,smooth});
const start=Number(timeline.match(/TIDE_START=([\d.]+)/)[1]),end=Number(timeline.match(/TIDE_END=([\d.]+)/)[1]);
let clearScene=0;
for(let i=0;i<=1000;i++){
 const s=states(i/1000);
 if(s.phase===2&&s.heading>.999&&s.reveal===0)clearScene++;
}
assert(clearScene/1000*(end-start)/.85>1.3,'Final caption needs a real reading interval at full wheel speed');
const button=Number(html.match(/data-story-step="([\d.]+)">Scene/)[1]);
assert.equal(states(button).phase,2);assert.equal(states(button).heading,1);assert.equal(states(button).reveal,0);
assert.equal(states(.95).heading,0,'Caption clears before the footage');
assert(states(.95).reveal>0&&states(.95).reveal<1,'Footage still crossfades');
assert.equal(states(1).reveal,1);
const prelude=timeline.match(/layer\(n\.prelude,windowed\(t,([\d.,]+)\)/)[1].split(',').map(Number);
assert((prelude[2]-prelude[1])/.85>1.7,'Blender title stays fully visible for longer');
console.log('PASS: animation wording, both community links, grouped credit, readable Tide caption holds, Scene navigation and video handover.');
