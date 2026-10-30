/* A sequence of reversible scroll compositions, not one-time entrance effects. */
(()=>{
 'use strict';
 const root=document.documentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)'),$=s=>document.querySelector(s);
 const disciplines=$('.discipline-strip'),stage=$('.discipline-stage'),work=$('.work-heading'),studio=$('.studio'),contact=$('.contact'),footer=$('.footer-brand'),prelude=$('.tide-prelude'),manifesto=$('.manifesto');
 const chapters=[...document.querySelectorAll('#aventis,#axis')];
 chapters.forEach((el,i)=>{const title=el.querySelector('.project-name'),wrap=document.createElement('div');wrap.className='chapter-title';title.setAttribute('aria-label',title.textContent.trim());title.dataset.chapter=el.id==='aventis'?'ARTIFICIAL INTELLIGENCE':'ROBOTICS';el.insertBefore(wrap,el.querySelector('.project-layout'));wrap.append(title);});
 root.classList.add('kinetic-ready');
 const clamp=n=>Math.min(1,Math.max(0,n)),ease=p=>p*p*(3-2*p),set=(el,key,value)=>el.style.setProperty(key,value);
 const phase=(el,start=.95,end=.05)=>{const r=el.getBoundingClientRect();return clamp((innerHeight*start-r.top)/(innerHeight*(start-end)+r.height*.22));};
 const visible=el=>{const r=el.getBoundingClientRect();return r.top<innerHeight+150&&r.bottom>-150;};
 let raf=0;
 function draw(){raf=0;if(root.classList.contains('continuum-enabled'))return;const enabled=!reduce.matches;root.classList.toggle('kinetic-active',enabled);if(!enabled||document.hidden)return;
  const w=innerWidth,mobile=w<700;
  if(visible(disciplines)){
   const r=disciplines.getBoundingClientRect(),top=mobile?65:76,p=clamp((top-r.top)/Math.max(1,disciplines.offsetHeight-stage.offsetHeight)),e=ease(p),strength=mobile?.35:1;
   set(disciplines,'--word-one',`${(e-.5)*w*.22*strength}px`);set(disciplines,'--word-two',`${(.5-e)*w*.38*strength}px`);set(disciplines,'--word-three',`${(e-.5)*w*.24*strength}px`);
   set(disciplines,'--ai-x',`${-e*w*.17}px`);set(disciplines,'--ai-y',`${(1-e)*120-e*120}px`);set(disciplines,'--ai-r',`${-9+e*16}deg`);
   set(disciplines,'--arm-x',`${e*w*.15}px`);set(disciplines,'--arm-y',`${160-e*340}px`);set(disciplines,'--arm-r',`${7-e*14}deg`);
   set(disciplines,'--boat-x',`${e*w*.15}px`);set(disciplines,'--boat-y',`${100-e*150}px`);set(disciplines,'--boat-r',`${-6+e*11}deg`);set(disciplines,'--image-scale',String(.85+e*.35));
  }
  if(visible(work))set(work,'--work-x',`${(1-ease(phase(work)))*(mobile?35:100)}px`);
  chapters.forEach((el,i)=>{if(!visible(el))return;
   const title=el.querySelector('.chapter-title'),p=ease(phase(title)),rect=el.getBoundingClientRect(),travel=clamp((innerHeight*.6-rect.top)/(el.offsetHeight+innerHeight*.3));
   set(el,'--chapter-x',`${(1-p)*(i?-1:1)*(mobile?30:160)}px`);set(el,'--copy-y',`${(1-ease(phase(el.querySelector('.project-layout'))))*(mobile?20:60)}px`);
   const entrance=ease(phase(el.querySelector('.project-layout'),.95,.2));set(el,'--media-inset',`${(1-entrance)*18}%`);set(el,'--media-scale',String(.88+entrance*.12));set(el,'--media-y',`${(1-entrance)*(mobile?35:90)}px`);
   set(el,'--brand-rotate',`${(travel-.5)*18}deg`);set(el,'--brand-scale',String(.88+travel*.24));set(el,'--render-scale',String(1.16-travel*.16));
  });
  if(visible(prelude)){const p=ease(phase(prelude));set(prelude,'--prelude-scale',String(.86+p*.14));set(prelude,'--prelude-y',`${(1-p)*80}px`);}
  if(visible(studio)){set(studio,'--studio-x',`${(1-ease(phase(studio)))*(mobile?30:100)}px`);}
  if(visible(contact)){const p=ease(phase(contact));set(contact,'--contact-x',`${(1-p)*(mobile?25:140)}px`);set(contact,'--contact-turn',`${(1-p)*-55}deg`);set(contact,'--social-rise',`${(1-ease(phase($('.social-grid'))))*70}px`);}
  if(visible(footer)){const p=ease(phase(footer));set(footer,'--footer-rise',`${(1-p)*110}px`);set(footer,'--footer-scale',String(.88+p*.12));}
  if(visible(manifesto))set(manifesto,'--mark-turn',`${(1-phase(manifesto))*-90}deg`);
 }
 const schedule=()=>{if(!raf)raf=requestAnimationFrame(draw);};
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',schedule);addEventListener('load',schedule,{once:true});draw();
})();
