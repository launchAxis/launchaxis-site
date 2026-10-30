import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),css=read('assets/copy-polish.css');
const brand=html.match(/<a class="brand"[^]*?<\/a>/)[0];
assert(brand.includes('href="#top"'),'The cue must share the existing Home destination');
assert(brand.includes('aria-label="LaunchAxis home — back to top"'));
assert.equal((brand.match(/class="brand-home-arrow"/g)||[]).length,1);
assert(brand.includes('<path d="M19 21C19 12 10 14 6 5m-1 8 1-8 8 2"/>'),'The curved return cue is a vector, not an emoji');
assert(css.includes('filter:none;mix-blend-mode:normal'),'The arrow uses current text ink instead of the wordmark inversion filter');
assert(css.includes('position:absolute;left:0;top:calc(100% + 6px)'),'The hint must not move the logo or navigation');
assert(css.includes('@media(prefers-reduced-motion:reduce)'));
assert(html.includes('/assets/copy-polish.css?v=20261030l'),'Returning visitors request the updated cue styling');
for(const coarse of [false,true]){
 const timers=[];const classes=new Set();const copy={textContent:'Click the logo to go to the beginning.'};
 const hint={hidden:true,classList:{add:v=>classes.add(v)},querySelector:()=>copy};
 vm.runInNewContext(read('assets/home-hint.js'),{document:{querySelector:()=>hint},matchMedia:()=>({matches:coarse}),requestAnimationFrame:fn=>fn(),setTimeout:(fn,time)=>timers.push({fn,time})});
 assert.equal(hint.hidden,false);
 assert.equal(copy.textContent,`${coarse?'Tap':'Click'} the logo to go to the beginning.`);
 assert.deepEqual(timers.map(x=>x.time),[2600,3000]);
 timers[0].fn();assert(classes.has('is-leaving'));
 timers[1].fn();assert.equal(hint.hidden,true);
}
console.log('PASS: accessible logo link, curved SVG hint, Click/Tap wording and automatic fade/removal by three seconds.');
