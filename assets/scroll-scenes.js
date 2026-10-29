// Load the 3D engine only when the project section approaches the viewport.
const targets=[document.querySelector('#axis'),document.querySelector('#tide')].filter(Boolean);
if(targets.length && 'IntersectionObserver' in window){
  let started=false;
  const observer=new IntersectionObserver(entries=>{
    if(!entries.some(e=>e.isIntersecting)||started)return;
    if(navigator.connection?.saveData)return;
    if(document.documentElement.classList.contains('motion-paused'))return;
    started=true;observer.disconnect();
    import('./scroll-runtime.js').then(m=>m.boot()).catch(()=>{});
  },{rootMargin:'850px 0px'});
  targets.forEach(t=>observer.observe(t));
  new MutationObserver(()=>{if(!started&&!document.documentElement.classList.contains('motion-paused')){targets.forEach(t=>{observer.unobserve(t);observer.observe(t);});}}).observe(document.documentElement,{attributes:true,attributeFilter:['class']});
}
