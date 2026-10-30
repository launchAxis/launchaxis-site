/* Brief discovery cue only; the logo remains a native Home link without JS. */
(()=>{
 'use strict';
 const hint=document.querySelector('.brand-home-hint');
 if(!hint)return;
 if(matchMedia('(pointer:coarse)').matches){
  hint.querySelector('.brand-home-hint-copy').textContent='Tap the logo to go to the beginning.';
 }
 requestAnimationFrame(()=>{
  hint.hidden=false;
  setTimeout(()=>hint.classList.add('is-leaving'),2600);
  setTimeout(()=>{hint.hidden=true;},3000);
 });
})();
