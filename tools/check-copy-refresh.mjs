import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {footerJokes,chooseFooterJoke} from '../assets/footer-joke.js';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const html=read('index.html'),timeline=read('assets/continuum.js'),runtime=read('assets/scroll-runtime.src.js');
assert(html.includes('<span>Ideas worth</span><span class="hero-last">bringing to <em>life.</em></span>'));
for(const phrase of ['Where it all starts','About Aventis','About Axis','About LaunchAxis','Notes from the projects.','More here soon','Inspired by the film <em>Flow</em>',"The robotic arm is just one part of Axis"]){assert(html.includes(phrase),phrase);}
assert(!html.includes('class="principles"'));
assert(!timeline.includes('principles'));
assert(!html.includes('social-number'));
assert(!/0[123] —|0[123] \/|<span>0[123]<\/span>/.test(html));
assert(runtime.includes("['VERTICES','One piece at a time...']"));
assert(!read('assets/scroll-runtime.js').includes('A thousand directions.'));
assert.equal(footerJokes.length,6);
for(let previous=-1;previous<6;previous++)for(let draw=0;draw<100;draw++){
 const next=chooseFooterJoke(previous,()=>draw/100);
 assert(next>=0&&next<6);assert.notEqual(next,previous);
}
// Exercise the actual initialisation twice, then with storage denied.
const source=read('assets/footer-joke.js').replaceAll('export ','');
let stored=null;const node={textContent:''};
const storage={getItem:()=>stored,setItem:(_,value)=>{stored=value;}};
const run=store=>vm.runInNewContext(source,{document:{querySelector:()=>node},sessionStorage:store,Math:Object.assign(Object.create(Math),{random:()=>.4})});
run(storage);const first=node.textContent;run(storage);assert.notEqual(node.textContent,first);
run({getItem(){throw Error('denied');},setItem(){throw Error('denied');}});assert(footerJokes.includes(node.textContent));
assert(!source.includes('addEventListener'),'No scroll or navigation-triggered joke changes');
assert(timeline.includes('END=14.5'));
console.log('PASS: approved copy, retained hero, no Principles or numbering, new runtime captions; six jokes, reload-only, no immediate repeat and storage fallback.');
