/* One continuous, reversible composition. Every original content node is
   retained. Reduced motion restores the readable document and native input. */
(()=>{
 'use strict';
 const root=document.documentElement,reduce=matchMedia('(prefers-reduced-motion: reduce)'),$=s=>document.querySelector(s);
 if(!('IntersectionObserver' in window)||!('ResizeObserver' in window))return;
 const END=15.6,TIDE_START=7.75,TIDE_END=11.05;
 const anchors={top:0,main:0,projects:2.65,aventis:4.1,axis:6.1,tide:7.55,'tide-details':11.55,about:12.6,notes:15};
 const clamp=v=>Math.max(0,Math.min(1,v)),mix=(a,b,p)=>a+(b-a)*p,smooth=(a,b,t)=>{const p=clamp((t-a)/(b-a));return p*p*(3-2*p);};
 const windowed=(t,a,b,c,d)=>smooth(a,b,t)*(1-smooth(c,d,t));
 const colors=[[0,[245,245,239]],[.85,[245,245,239]],[1.35,[23,45,35]],[2.2,[23,45,35]],[2.6,[217,235,173]],[3.1,[217,235,173]],[3.65,[245,245,239]],[6.6,[245,245,239]],[7.5,[16,21,15]],[11.8,[16,21,15]],[12.7,[31,53,36]],[14.8,[31,53,36]],[15.6,[20,37,26]]];
 let state=null,raf=0,last=0,current=0,pace=null,axisVideo=null,createVideo=null;
 import('/assets/scroll-video.js').then(module=>{createVideo=module.createScrollVideo;if(state)axisVideo=createVideo($('#axis-video'),schedule);schedule();}).catch(()=>{/* The original video remains the fallback. */});
 import('/assets/scroll-pace.js').then(({installSteadyWheel})=>{
  pace=installSteadyWheel(()=>{if(!state||reduce.matches)return null;const start=scrollY+state.track.getBoundingClientRect().top-state.top;return {start,end:start+END*state.unit,unit:state.unit};});
 }).catch(()=>{/* The native scroll timeline is a complete fallback. */});
 function sample(keys,t){let a=keys[0],b=keys.at(-1);for(let i=1;i<keys.length;i++){if(t<=keys[i][0]){a=keys[i-1];b=keys[i];break;}}const p=smooth(a[0],b[0],t);return a[1].map((v,i)=>mix(v,b[1][i],p));}
 function mount(){
  if(state||reduce.matches)return;
  const main=$('main'),track=document.createElement('div'),stage=document.createElement('div'),portal=document.createElement('div'),images=document.createElement('div');
  track.className='continuum-track';stage.className='continuum-stage';portal.className='continuum-portal';images.className='continuum-images';images.setAttribute('aria-hidden','true');
  track.append(stage);stage.append(images,portal);main.prepend(track);
  const moved=[],styles=new Map(),attributes=new Map();
  function move(el,parent){const home=document.createComment('continuum: original position');el.before(home);moved.push({el,home});parent.append(el);return el;}
  const hero=move($('.hero'),stage),manifesto=move($('.manifesto'),stage),discipline=move($('.discipline-strip'),stage),work=move($('.work-heading'),stage),aventis=move($('#aventis'),stage),axis=move($('#axis'),stage),tide=move($('#tide'),stage),studio=move($('#about'),stage),notes=move($('#notes'),stage),toolbar=move($('.work-toolbar'),stage);
  const boat=move($('.hero-media'),images),arm=move($('.satellite-arm'),images),ai=move($('.satellite-ai'),images);
  const network=move($('.network-visual'),portal),robot=move($('.render-block'),portal),story=move($('.tide-story'),portal);
  const description=move($('.tide-description'),stage),prelude=move($('.tide-prelude'),stage),principles=move($('.principles'),stage);
  const nodes={hero,manifesto,discipline,work,aventis,axis,tide,studio,notes,toolbar,boat,arm,ai,network,robot,story,description,prelude,principles};
  const badge=document.createElement('div');badge.className='continuum-caption mono';badge.setAttribute('aria-hidden','true');badge.innerHTML='<span>LA / A CONTINUOUS EXPLORATION</span><span>SCROLL TO CONTINUE ↓</span>';stage.append(badge);
  state={track,stage,portal,images,moved,styles,attributes,nodes,badge,unit:1,top:0};
  if(createVideo&&!axisVideo)axisVideo=createVideo($('#axis-video'),schedule);
  for(const el of Object.values(nodes))attributes.set(el,{inert:el.inert,hidden:el.getAttribute('aria-hidden')});
  root.classList.add('continuum-enabled');root.classList.remove('kinetic-active','editorial-motion');
  current=0;last=0;resize();draw(performance.now());
  requestAnimationFrame(()=>{const hash=decodeURIComponent(location.hash.slice(1));if(hash in anchors)go(anchors[hash],false);});
 }
 function style(el,key,value){if(!state.styles.has(el))state.styles.set(el,el.getAttribute('style'));el.style.setProperty(key,String(value));}
 function layer(el,alpha,dy=0,interactive=true){const a=clamp(alpha);style(el,'opacity',a.toFixed(4));style(el,'visibility',a<.002?'hidden':'visible');style(el,'--continuum-y',`${dy.toFixed(2)}px`);style(el,'pointer-events',a>.65&&interactive?'auto':'none');el.inert=a<.65||!interactive;el.setAttribute('aria-hidden',a<.15?'true':'false');}
 function card(el,box,opacity){const [x,y,w,h,r]=box;style(el,'left',`${x-w/2}%`);style(el,'top',`${y-h/2}%`);style(el,'width',`${w}%`);style(el,'height',`${h}%`);style(el,'transform',`rotate(${r}deg)`);style(el,'opacity',opacity);style(el,'visibility',opacity<.001?'hidden':'visible');}
 function resize(){if(!state)return;state.top=$('.header').offsetHeight;state.unit=Math.max(520,innerHeight*.92);state.track.style.height=`${END*state.unit+innerHeight-state.top}px`;state.track.style.setProperty('--continuum-top',`${state.top}px`);state.track.style.setProperty('--continuum-height',`${innerHeight-state.top}px`);schedule();}
 function go(t,animated=true){if(!state)return;pace?.stop();const top=scrollY+state.track.getBoundingClientRect().top-state.top+t*state.unit;window.scrollTo({top,behavior:animated?'smooth':'instant'});}
 function draw(now){
  raf=0;if(!state||document.hidden)return;
  const s=state,n=s.nodes,mobile=innerWidth<700,rect=s.track.getBoundingClientRect(),desired=Math.max(0,Math.min(END,(s.top-rect.top)/s.unit)),dt=last?Math.min(.05,(now-last)/1000):1/60;last=now;
  current=root.classList.contains('steady-scroll-active')||Math.abs(desired-current)>2||!s.drawn?desired:mix(current,desired,1-Math.exp(-15*dt));if(Math.abs(current-desired)<.0002)current=desired;s.drawn=true;
  const t=current;root.dataset.continuumTime=t.toFixed(4);
  const rgb=sample(colors,t).map(Math.round),dark=t>1.12&&t<2.4||t>7.08;root.classList.toggle('continuum-dark',dark);root.style.setProperty('--continuum-bg',`rgb(${rgb.join(' ')})`);root.style.setProperty('--continuum-ink',dark?'#edf2e5':'#17271d');
  // The same three images travel from the opening through the manifesto and
  // discipline typography. The Aventis tile lands in the shared project frame.
  const cardsOut=1-smooth(3.25,3.7,t);
  const boatKeys=mobile?[[0,[50,47,84,63,0]],[.8,[50,49,100,94,0]],[1.4,[15,82,36,23,-5]],[2.3,[23,77,41,26,-4]],[3.6,[-30,100,36,28,-12]]]:[[0,[50,47,64,72,0]],[.8,[50,49,100,98,0]],[1.4,[16,79,26,29,-6]],[2.4,[24,80,31,27,-4]],[3.6,[-35,105,30,30,-14]]];
  card(n.boat,sample(boatKeys,t),cardsOut);
  card(n.arm,sample([[0,[4,25,mobile?25:20,30,-5]],[.8,[-20,0,20,30,-9]],[1.4,[mobile?107:94,26,20,30,6]],[2.5,[85,31,24,38,5]],[3.6,[130,0,26,40,12]]],t),cardsOut);
  card(n.ai,sample([[0,[96,70,20,23,5]],[.8,[120,100,22,23,10]],[1.4,[86,83,21,22,4]],[2.5,[19,20,24,25,-7]],[3.6,mobile?[50,38,90,40,0]:[65,65,62,62,0]]],t),cardsOut);
  layer(n.hero,1-smooth(.65,1.2,t),-smooth(.6,1.2,t)*100);
  if(t<1.2){const title=$('#hero-title'),inverse=$('.hero-title-inverse'),m=n.boat.getBoundingClientRect(),r=title.getBoundingClientRect(),h=$('.hero-stage').getBoundingClientRect();style(inverse,'left',`${r.left-h.left}px`);style(inverse,'top',`${r.top-h.top}px`);style(inverse,'width',`${r.width}px`);style(inverse,'clip-path',`inset(${Math.max(0,m.top-r.top)}px ${Math.max(0,r.right-m.right)}px ${Math.max(0,r.bottom-m.bottom)}px ${Math.max(0,m.left-r.left)}px)`);}
  layer(n.manifesto,windowed(t,.9,1.25,2.1,2.38),(1-smooth(.9,1.3,t))*75-smooth(2.1,2.4,t)*130);
  n.manifesto.querySelectorAll('.word').forEach((el,i,arr)=>style(el,'color',(i+.2)/arr.length<smooth(1.1,2.05,t)?'#f0f5e8':'#8ea38b'));
  layer(n.discipline,windowed(t,2.32,2.58,2.85,3.2));
  style(n.discipline,'--word-one',`${(t-2.65)*innerWidth*.14}px`);style(n.discipline,'--word-two',`${(2.65-t)*innerWidth*.17}px`);style(n.discipline,'--word-three',`${(t-2.65)*innerWidth*.1}px`);
  layer(n.work,windowed(t,2.9,3.22,3.45,3.75),(1-smooth(2.9,3.25,t))*65-smooth(3.45,3.75,t)*65);
  layer(n.aventis,windowed(t,3.4,3.75,5.15,5.65),0);
  layer(n.axis,windowed(t,5.3,5.7,7.05,7.55),0);
  for(const [el,start,end] of [[n.aventis,3.4,5.65],[n.axis,5.3,7.55]]){style(el,'--title-slide',`${(1-smooth(start,start+.4,t))*100-smooth(end-.4,end,t)*100}px`);style(el,'--copy-rise',`${(1-smooth(start+.1,start+.55,t))*50}px`);}
  const networkA=windowed(t,3.25,3.75,5.25,5.8),axisA=windowed(t,5.2,5.8,7.3,7.9),tideA=smooth(7.3,7.95,t);
  layer(n.network,networkA,0,false);layer(n.robot,axisA);layer(n.story,tideA);
  const portalBox=sample(mobile?[[0,[50,38,90,40]],[6.6,[50,38,90,40]],[7.7,[50,50,100,100]],[11.7,[50,50,100,100]],[12.5,[50,26,90,39]],[13.5,[50,26,90,39]],[14.5,[50,24,66,31]],[15.6,[50,24,52,24]]]:[[0,[65,50,62,62]],[5.15,[65,50,62,62]],[5.8,[65,65,62,62]],[6.6,[65,65,62,62]],[7.7,[50,50,100,100]],[11.7,[50,50,100,100]],[12.5,[24,48,44,69]],[13.5,[24,48,44,69]],[14.5,[24,44,37,55]],[15.6,[24,40,30,43]]],t);
  const [x,y,w,h]=portalBox;style(s.portal,'left',`${x-w/2}%`);style(s.portal,'top',`${y-h/2}%`);style(s.portal,'width',`${w}%`);style(s.portal,'height',`${h}%`);style(s.portal,'opacity',smooth(3.25,3.65,t));style(s.portal,'visibility',t<3.22?'hidden':'visible');
  style(n.network,'--brand-rotate',`${(t-4.5)*8}deg`);style(n.network,'--brand-scale',1+(t-4.5)*.045);
  const axisPanel=$('.axis-3d-panel'),video=$('#axis-video');
  if(t>3)axisVideo?.prepare();
  const videoProgress=clamp((t-6.55)/(7.85-6.55));axisVideo?.setProgress(videoProgress);video.dataset.scrollProgress=videoProgress.toFixed(5);
  // Loading is not a reason to replace the 3D sequence with autoplay. Only
  // hand over when both the interactive scene and a decoded video frame exist.
  const sceneReady=axisPanel.dataset.sceneState==='ready',sceneFailed=axisPanel.dataset.sceneState==='error';
  const render=sceneFailed?1:sceneReady&&video.dataset.scrubReady==='true'?smooth(6.55,7.05,t):0;style(n.robot,'--render-mix',render);
  axisPanel.dataset.continuumProgress=clamp((t-5.65)/1.35).toFixed(5);axisPanel.dataset.continuumActive=String(axisA>.01&&render<.995);axisPanel.inert=render>.8;
  // This is the existing Tide timeline, unmodified: only its source of progress
  // comes from the shared stage. Its 24,625 vertices and shot registration stay.
  n.story.dataset.continuumProgress=clamp((t-TIDE_START)/(TIDE_END-TIDE_START)).toFixed(5);n.story.dataset.continuumActive=String(tideA>.005&&rect.bottom>s.top);
  // The introductory title is fully gone at 8.15 before the vertex copy enters.
  style(n.story,'--continuum-story-ui',smooth(8.18,8.42,t)*(1-smooth(11.0,11.35,t)));
  // Explicit visibility is a second guard against any inherited UI opacity rule.
  style(n.story.querySelector('.tide-story-ui'),'visibility',t<8.18||t>=11.35?'hidden':'visible');
  layer(n.tide,0);layer(n.prelude,windowed(t,7.25,7.55,7.85,8.15),(1-smooth(7.25,7.6,t))*65);
  layer(n.description,windowed(t,11.0,11.35,11.9,12.3),(1-smooth(11,11.4,t))*55);
  style(n.story,'--continuum-film-shade',windowed(t,11.0,11.35,12,12.45)*.5);
  layer(n.studio,windowed(t,12.0,12.45,13.35,13.7),(1-smooth(12.0,12.5,t))*55);
  layer(n.principles,windowed(t,13.2,13.55,14.65,15));
  [...n.principles.children].forEach((el,i)=>{const a=13.3+i*.4;layer(el,windowed(t,a,a+.25,a+.38,a+.65),(1-smooth(a,a+.25,t))*40-smooth(a+.38,a+.65,t)*40);});
  layer(n.notes,smooth(14.6,15.05,t),(1-smooth(14.6,15.05,t))*50);
  layer(n.toolbar,windowed(t,3.4,3.7,7.1,7.35));
  style(s.badge,'opacity',1-windowed(t,3.3,3.7,11.3,11.8));
  n.toolbar.querySelectorAll('[data-project-link]').forEach(link=>{const id=t<5.5?'aventis':t<7.5?'axis':'tide';if(link.dataset.projectLink===id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
  video.dataset.continuumVisible=String(axisA>.05&&render>.05);
  window.dispatchEvent(new CustomEvent('launchaxis:continuum',{detail:{time:t}}));
  if(Math.abs(current-desired)>.0002)schedule();
 }
 function unmount(){if(!state)return;pace?.stop();axisVideo?.dispose();axisVideo=null;if(reduce.matches){const video=$('#axis-video');video.autoplay=false;video.controls=true;video.pause();}const s=state;cancelAnimationFrame(raf);raf=0;
  for(const {el,home} of [...s.moved].reverse()){home.replaceWith(el);}
  for(const [el,styleValue] of s.styles){if(styleValue===null)el.removeAttribute('style');else el.setAttribute('style',styleValue);}
  for(const [el,a] of s.attributes){el.inert=a.inert;if(a.hidden===null)el.removeAttribute('aria-hidden');else el.setAttribute('aria-hidden',a.hidden);}
  for(const el of s.nodes.principles.children){el.inert=false;el.removeAttribute('aria-hidden');}
  $('.axis-3d-panel').inert=false;s.track.remove();root.classList.remove('continuum-enabled','continuum-dark');delete root.dataset.continuumTime;root.style.removeProperty('--continuum-bg');root.style.removeProperty('--continuum-ink');state=null;window.dispatchEvent(new Event('resize'));
 }
 function schedule(){if(state&&!raf)raf=requestAnimationFrame(draw);}
 document.addEventListener('click',e=>{if(!state)return;const step=e.target.closest('[data-story-step]');if(step){e.preventDefault();e.stopImmediatePropagation();go(mix(TIDE_START,TIDE_END,Number(step.dataset.storyStep)));return;}const link=e.target.closest('a[href^="#"]');if(!link)return;const id=decodeURIComponent(link.hash.slice(1));if(!(id in anchors))return;e.preventDefault();history.pushState(null,'',link.hash);go(anchors[id]);},true);
 window.addEventListener('popstate',()=>{const id=decodeURIComponent(location.hash.slice(1));if(state&&id in anchors)go(anchors[id],false);});
 addEventListener('scroll',schedule,{passive:true});addEventListener('resize',resize,{passive:true});document.addEventListener('visibilitychange',schedule);reduce.addEventListener('change',()=>{if(reduce.matches)unmount();else mount();});
 addEventListener('launchaxis:scene-ready',schedule);
 addEventListener('load',()=>{resize();const id=decodeURIComponent(location.hash.slice(1));if(state&&id in anchors)go(anchors[id],false);},{once:true});
 mount();
})();
