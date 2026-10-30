// Share one engine, but fetch each model only as its own section approaches.
const targets=[document.querySelector('#axis'),document.querySelector('#tide')].filter(Boolean);
if(targets.length && 'IntersectionObserver' in window){
  let runtime=null;const requested=new Set();
  const eligible=()=>!navigator.connection?.saveData&&!document.documentElement.classList.contains('motion-paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
  function request(target){
    if(!target||!eligible()||requested.has(target))return;
    requested.add(target);runtime??=import('./scroll-runtime.js?v=20261030d');
    runtime.then(m=>{if(m.boot(target.id))observer.unobserve(target);else requested.delete(target);}).catch(()=>{requested.delete(target);runtime=null;});
  }
  const observer=new IntersectionObserver(entries=>{
    if(!eligible()||document.documentElement.classList.contains('continuum-enabled'))return;
    entries.filter(e=>e.isIntersecting).forEach(({target})=>{
      if(requested.has(target))return;
      requested.add(target);
      runtime??=import('./scroll-runtime.js?v=20261030d');
      runtime.then(m=>{
        if(m.boot(target.id)){observer.unobserve(target);}
        else{requested.delete(target);}
      }).catch(()=>{requested.delete(target);runtime=null;});
    });
  },{rootMargin:'550px 0px'});
  targets.forEach(t=>observer.observe(t));
  // Fetch the arm during the opening, not less than a second before its entrance.
  // This also covers a direct #axis visit. Tide still loads only as it approaches.
  const loadApproaching=()=>{if(!document.documentElement.classList.contains('continuum-enabled'))return;const t=Number(document.documentElement.dataset.continuumTime||0);request(targets.find(t=>t.id==='axis'));if(t>5.5)request(targets.find(t=>t.id==='tide'));};
  window.addEventListener('launchaxis:continuum',loadApproaching);loadApproaching();
  const refresh=()=>{if(eligible()){loadApproaching();targets.filter(t=>!requested.has(t)).forEach(t=>{observer.unobserve(t);observer.observe(t);});}};
  new MutationObserver(refresh).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',refresh);
  navigator.connection?.addEventListener?.('change',refresh);
}
