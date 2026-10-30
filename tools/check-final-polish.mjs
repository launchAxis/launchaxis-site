import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),site=read('assets/site.js'),timeline=read('assets/continuum.js'),css=read('assets/continuum.css'),render=read('assets/render.css');
const tide=html.match(/<video id="tide-video"[^>]*>/)[0];
assert(!/\scontrols(?:\s|=|>)/.test(tide));
for(const attribute of ['autoplay','muted','loop','playsinline','disablepictureinpicture'])assert(tide.includes(attribute));
assert(site.includes("attributeFilter: ['controls']"),'Fallback controls must be removed too');
assert(css.includes('#tide-video{pointer-events:none}'));
assert(css.includes('.axis-model-canvas{transform:translateY(clamp(-40px,-4vh,-20px))}'));
assert(!render.includes('.render-block figcaption span{'));
assert(render.includes('align-items:center;gap:.25em;white-space:nowrap'));
assert(html.includes('href="#contact">Contact'));
assert(!html.includes('href="#contact">Connect'));
assert(timeline.includes('smooth(8.18,8.42,t)*(1-smooth(11.0,11.35,t))'));
const clamp=v=>Math.max(0,Math.min(1,v));
const smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p)};
for(let t=7;t<9;t+=.001){
 const prelude=smooth(7.25,7.55,t)*(1-smooth(7.85,8.15,t));
 const vertices=smooth(8.18,8.42,t)*(1-smooth(11,11.35,t));
 assert.equal(prelude*vertices,0,'Tide intro and vertex copy cannot be visible together, in either scroll direction');
}
console.log('PASS: raised model only, inline credit arrow, control-free Tide, Contact label and non-overlapping Tide copy.');

assert(timeline.includes("t<8.18||t>=11.35?'hidden':'visible'"),'Tide UI must also have a hard visibility gate');
assert.equal((html.match(/class="credit-arrow"/g)||[]).length,2);
assert(css.includes('display:inline-flex;flex-direction:row;flex-wrap:nowrap;'));
for(const path of ['continuum.js','continuum.css','render.css','site.js']){
 assert(html.includes('/assets/'+path+'?v=20261030c'),'Returning browsers must request the updated '+path);
}
