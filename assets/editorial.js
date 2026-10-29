/* Scroll-linked editorial moments. Native scrolling; no wheel interception. */
(()=>{
 const root=document.documentElement,hero=document.querySelector('.hero'),stage=document.querySelector('.hero-stage'),statement=document.querySelector('.reading-statement'),section=document.querySelector('.manifesto');
 if(!hero||!stage||!statement)return;
 const title=document.querySelector('#hero-title'),media=document.querySelector('.hero-media'),inverse=document.createElement('div');inverse.className='hero-title-inverse';inverse.setAttribute('aria-hidden','true');inverse.innerHTML=title.innerHTML;stage.append(inverse);
 const words=statement.textContent.trim().split(/\s+/);statement.setAttribute('aria-label',words.join(' '));statement.replaceChildren(...words.map((word,i)=>{const span=document.createElement('span');span.className='word';span.textContent=word+(i<words.length-1?' ':'');span.setAttribute('aria-hidden','true');return span;}));
 const spans=[...statement.children],reduce=matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
 const clamp=(n)=>Math.min(1,Math.max(0,n));
 function draw(){frame=0;if(root.classList.contains('continuum-enabled'))return;const motion=!root.classList.contains('motion-paused')&&!reduce.matches;root.classList.toggle('editorial-motion',motion);if(document.hidden)return;
  const rect=hero.getBoundingClientRect(),top=parseFloat(getComputedStyle(stage).top)||0,p=motion?clamp((top-rect.top)/Math.max(1,hero.offsetHeight-stage.offsetHeight)):0,e=p*p*(3-2*p);
  if(rect.bottom>0&&rect.top<innerHeight){hero.style.setProperty('--hero-scale',(1+e*.44).toFixed(4));hero.style.setProperty('--hero-lift',(-e*20)+'px');hero.style.setProperty('--hero-text-shift',(-e*38)+'px');hero.style.setProperty('--arm-lift',(-e*190)+'px');hero.style.setProperty('--ai-lift',(e*125)+'px');hero.style.setProperty('--satellite-opacity',(1-e).toFixed(3));hero.style.setProperty('--hero-caption',e.toFixed(3));
   const m=media.getBoundingClientRect(),t=title.getBoundingClientRect(),s=stage.getBoundingClientRect();inverse.style.left=(t.left-s.left)+'px';inverse.style.top=(t.top-s.top)+'px';inverse.style.width=t.width+'px';inverse.style.clipPath=`inset(${Math.max(0,m.top-t.top)}px ${Math.max(0,t.right-m.right)}px ${Math.max(0,t.bottom-m.bottom)}px ${Math.max(0,m.left-t.left)}px)`;inverse.style.visibility='visible';}
  const r=section.getBoundingClientRect(),read=motion?clamp((innerHeight*.87-r.top)/Math.max(1,r.height*.65)):1;
  spans.forEach((span,i)=>span.classList.toggle('is-read',(i+.35)/spans.length<read));
 }
 function schedule(){if(!frame)frame=requestAnimationFrame(draw);}
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule,{passive:true});document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',schedule);
 new MutationObserver(records=>{if(records.some(r=>r.attributeName==='class')){const enabled=!root.classList.contains('motion-paused')&&!reduce.matches;if(enabled!==root.classList.contains('editorial-motion'))schedule();}}).observe(root,{attributes:true,attributeFilter:['class']});draw();
})();
