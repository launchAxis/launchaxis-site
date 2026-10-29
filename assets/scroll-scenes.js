// Share one engine, but fetch each model only as its own section approaches.
const targets=[document.querySelector('#axis'),document.querySelector('#tide')].filter(Boolean);
if(targets.length && 'IntersectionObserver' in window){
  let runtime=null;const requested=new Set();
  const eligible=()=>!navigator.connection?.saveData&&!document.documentElement.classList.contains('motion-paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  const observer=new IntersectionObserver(entries=>{
    if(!eligible())return;
    entries.filter(e=>e.isIntersecting).forEach(({target})=>{
      if(requested.has(target))return;
      requested.add(target);
      runtime??=import('./scroll-runtime.js');
      runtime.then(m=>{
        if(m.boot(target.id)){observer.unobserve(target);}
        else{requested.delete(target);}
      }).catch(()=>{requested.delete(target);runtime=null;});
    });
  },{rootMargin:'550px 0px'});
  targets.forEach(t=>observer.observe(t));
  const refresh=()=>{if(eligible())targets.filter(t=>!requested.has(t)).forEach(t=>{observer.unobserve(t);observer.observe(t);});};
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',refresh);
  navigator.connection?.addEventListener?.('change',refresh);
}
