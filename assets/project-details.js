// Native details/summary remains the fallback and keyboard interaction model.
const reduce=matchMedia('(prefers-reduced-motion: reduce)');
for(const details of document.querySelectorAll('.project details')){
 const summary=details.querySelector('summary'),body=details.querySelector(':scope > div');if(!summary||!body||!body.animate)continue;
 const inner=document.createElement('div');inner.className='project-details-inner';inner.append(...body.childNodes);body.append(inner);body.classList.add('project-details-body');details.classList.add('details-enhanced');
 let expanded=details.open,animation=null,fade=null,version=0,scrollFrame=0,restoreScroll=0,scrollTarget=null;
 details.dataset.expanded=String(expanded);summary.setAttribute('aria-expanded',String(expanded));body.inert=!expanded;
 function finish(open,id){if(id!==version)return;cancelAnimationFrame(scrollFrame);animation=null;fade=null;details.open=open;body.style.height='';inner.style.opacity='';inner.style.transform='';if(scrollTarget){scrollTarget.element.scrollTop=scrollTarget.top;scrollTarget=null;}}
 summary.addEventListener('click',event=>{
  event.preventDefault();
  const height=details.open?body.getBoundingClientRect().height:0,opacity=details.open?getComputedStyle(inner).opacity:0,transform=details.open?getComputedStyle(inner).transform:'translateY(-8px)';
  const copy=details.closest('.project-copy'),scroller=copy&&/auto|scroll/.test(getComputedStyle(copy).overflowY)?copy:null;
  if(!expanded&&!animation&&scroller)restoreScroll=scroller.scrollTop;
  animation?.cancel();fade?.cancel();cancelAnimationFrame(scrollFrame);expanded=!expanded;const id=++version;
  details.dataset.expanded=String(expanded);summary.setAttribute('aria-expanded',String(expanded));body.inert=!expanded;
  details.open=true;body.style.height='auto';const target=expanded?inner.getBoundingClientRect().height:0;
  const scrollStart=scroller?.scrollTop||0;
  if(scroller){
   const box=scroller.getBoundingClientRect(),summaryTop=scrollStart+summary.getBoundingClientRect().top-box.top;
   const showBottom=scrollStart+body.getBoundingClientRect().top+target-box.bottom+8;
   scrollTarget={element:scroller,top:expanded?Math.max(scrollStart,Math.min(summaryTop,showBottom)):restoreScroll};
  }
  if(reduce.matches){finish(expanded,id);return;}
  const timing={duration:460,easing:'cubic-bezier(.22,1,.36,1)'};
  animation=body.animate([{height:`${height}px`},{height:`${target}px`}],timing);
  fade=inner.animate([{opacity,transform},{opacity:expanded?1:0,transform:expanded?'translateY(0)':'translateY(-8px)'}],timing);
  body.style.height=`${target}px`;inner.style.opacity=expanded?'1':'0';inner.style.transform=expanded?'translateY(0)':'translateY(-8px)';
  // Reveal the growing copy inside its own reading panel; never move the
  // document, which would unintentionally advance the cinematic timeline.
  function reveal(){if(id!==version||!animation||!scrollTarget)return;const p=Math.min(1,(animation.currentTime||0)/timing.duration),ease=1-Math.pow(1-p,4);scroller.scrollTop=scrollStart+(scrollTarget.top-scrollStart)*ease;scrollFrame=requestAnimationFrame(reveal);}
  if(scrollTarget)scrollFrame=requestAnimationFrame(reveal);
  animation.onfinish=()=>finish(expanded,id);
 });
 reduce.addEventListener('change',()=>{if(reduce.matches){animation?.cancel();fade?.cancel();finish(expanded,version);}});
}
