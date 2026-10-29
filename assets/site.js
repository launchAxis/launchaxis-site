/* Progressive enhancement only: all project content and links work without JS. */
(() => {
  'use strict';
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData = Boolean(navigator.connection && navigator.connection.saveData);
  const motionButton = document.querySelector('.motion-toggle');
  let preference = null;
  try { preference = localStorage.getItem('launchaxis-motion'); } catch (_) { /* Storage is optional. */ }
  let motion = preference === 'off' ? false : !reduce.matches;
  let raf = 0, time = 0, lastFrame = 0;
  let scrollFraction = 0, pointerX = 0, pointerY = 0;
  const drawables = [];
  const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
  const videos = [...document.querySelectorAll('video')];
  const videoState = new Map();
  const hasObserver = 'IntersectionObserver' in window;

  document.querySelector('#year').textContent = String(new Date().getFullYear());
  const filters = document.querySelector('.filters');
  const filterButtons = [...filters.querySelectorAll('button')];
  const projects = [...document.querySelectorAll('.project[data-category]')];
  const projectLinks = [...document.querySelectorAll('[data-project-link]')];
  const filterStatus = document.querySelector('#filter-status');
  filters.hidden = false;
  function setFilter(key, announce = true) {
    let count = 0;
    projects.forEach(project => {
      project.hidden = key !== 'all' && project.dataset.category !== key;
      if (!project.hidden) count++;
      else project.querySelectorAll('video').forEach(video => video.pause());
    });
    filterButtons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === key)));
    filterStatus.textContent = announce ? `${count} ${count === 1 ? 'project' : 'projects'} shown.` : '';
    requestAnimationFrame(() => { updateScroll(); resizeCanvases(); });
  }
  filterButtons.forEach(button => button.addEventListener('click', () => setFilter(button.dataset.filter)));
  document.querySelectorAll('a[href^="#"]').forEach(link => link.addEventListener('click', () => {
    const target = document.getElementById(link.getAttribute('href').slice(1));
    if (target && target.classList.contains('project') && target.hidden) setFilter('all', false);
  }));

  // Reveal once. Content remains visible if observers or motion are unavailable.
  if (hasObserver && motion) {
    root.classList.add('reveal-enabled');
    const reveal = new IntersectionObserver(entries => {
      entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('revealed'); reveal.unobserve(entry.target); } });
    }, { threshold: 0.08, rootMargin: '0px 0px -20px 0px' });
    document.querySelectorAll('[data-reveal]').forEach(el => reveal.observe(el));
  }

  // Custom controls replace native controls only after their handlers exist.
  videos.forEach(video => {
    const button = document.querySelector(`[aria-controls="${video.id}"]`);
    const wrapper = video.parentElement;
    const state = { visible: false, manuallyPaused: false, tried: false };
    videoState.set(video, state);
    const sync = () => {
      const playing = !video.paused;
      button.setAttribute('aria-pressed', String(playing));
      button.querySelector('.play-symbol').textContent = playing ? 'Ⅱ' : '▶';
      button.querySelector('.film-label').textContent = playing ? 'Pause' : (video.id === 'tide-video' ? 'Play scene' : 'Play render');
      wrapper.classList.toggle('is-playing', playing);
    };
    button.addEventListener('click', async () => {
      if (video.paused) {
        state.manuallyPaused = false;
        video.dataset.manuallyPaused = 'false';
        try { await video.play(); } catch (_) { video.controls = true; button.hidden = true; }
      } else { state.manuallyPaused = true; video.dataset.manuallyPaused = 'true'; video.pause(); }
    });
    video.addEventListener('play', sync);
    video.addEventListener('pause', sync);
    video.addEventListener('error', () => {
      button.hidden = true;
      video.controls = true;
      const notice = document.createElement('p');
      notice.className = 'video-error';
      notice.textContent = 'Video unavailable. The still image is shown above.';
      wrapper.after(notice);
    }, { once: true });
    video.controls = false;
    button.hidden = false;
  });
  const scrub = document.querySelector('#arm-range');
  const arm = document.querySelector('#axis-video');
  arm.addEventListener('loadedmetadata', () => { document.querySelector('.render-scrub').hidden = false; });
  scrub.addEventListener('input', () => {
    if (!Number.isFinite(arm.duration)) return;
    videoState.get(arm).manuallyPaused = true;
    arm.pause();
    arm.currentTime = Number(scrub.value) / 100 * Math.max(0, arm.duration - 0.03);
    scrub.setAttribute('aria-valuetext', `${arm.currentTime.toFixed(1)} seconds`);
  });
  arm.addEventListener('timeupdate', () => {
    if (Number.isFinite(arm.duration)) {
      scrub.value = String(arm.currentTime / arm.duration * 100);
      scrub.setAttribute('aria-valuetext', `${arm.currentTime.toFixed(1)} of ${arm.duration.toFixed(1)} seconds`);
    }
  });
  if (hasObserver) {
    const videoObserver = new IntersectionObserver(entries => entries.forEach(entry => {
      const video = entry.target, state = videoState.get(video);
      state.visible = entry.isIntersecting;
      if (!entry.isIntersecting) { video.pause(); return; }
      if (!state.tried && !saveData) { video.preload = 'metadata'; video.load(); state.tried = true; }
      if (motion && !saveData && !state.manuallyPaused && !document.hidden && video.dataset.storyManaged !== 'true') video.play().catch(() => {});
    }), { threshold: 0.45 });
    videos.forEach(video => videoObserver.observe(video));
  }

  const copy = document.querySelector('.copy-email');
  if (navigator.clipboard && window.isSecureContext) {
    copy.hidden = false;
    copy.addEventListener('click', async () => {
      const status = document.querySelector('.copy-status');
      try { await navigator.clipboard.writeText('hello@launchaxis.net'); status.textContent = 'Copied.'; }
      catch (_) { status.textContent = 'Select and copy the email address instead.'; }
    });
  }

  // Canvas geometry is abstract brand artwork, not a technical system diagram.
  function createDrawable(id, render) {
    const canvas = document.getElementById(id);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const item = { canvas, ctx, render, width: 0, height: 0, visible: !hasObserver };
    canvas.parentElement.classList.add('canvas-ready');
    drawables.push(item);
    if (hasObserver) {
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => { item.visible = e.isIntersecting; });
        drawStill(); startAnimation();
      }, { rootMargin: '80px' });
      observer.observe(canvas);
    }
    return item;
  }
  function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    drawables.forEach(item => {
      const box = item.canvas.getBoundingClientRect();
      if (!box.width || !box.height) return;
      item.width = box.width; item.height = box.height;
      item.canvas.width = Math.round(box.width * dpr); item.canvas.height = Math.round(box.height * dpr);
      item.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    drawStill();
  }
  function project3D(x, y, z, ax, ay, scale, cx, cy) {
    const yy = y * Math.cos(ax) - z * Math.sin(ax), zz = y * Math.sin(ax) + z * Math.cos(ax);
    const xx = x * Math.cos(ay) + zz * Math.sin(ay), zzz = -x * Math.sin(ay) + zz * Math.cos(ay);
    const perspective = 650 / (650 + zzz);
    return [cx + xx * scale * perspective, cy + yy * scale * perspective, zzz];
  }
  function drawCore(ctx, w, h, t) {
    ctx.clearRect(0, 0, w, h);
    if (!w || !h) return;
    const scale = Math.min(w / 620, h / 650), cx = w * .5, cy = h * .51;
    const tilt = .72 + Math.sin(t * .12) * .1 + pointerY * .13;
    const yaw = -.43 + t * .085 + scrollFraction * 1.2 + pointerX * .15;
    const glow = ctx.createRadialGradient(cx, cy, 20, cx, cy, 260 * scale);
    glow.addColorStop(0, 'rgba(156,190,79,.06)'); glow.addColorStop(.6, 'rgba(120,155,65,.025)'); glow.addColorStop(1, 'rgba(120,155,65,0)');
    ctx.fillStyle = glow; ctx.fillRect(0,0,w,h);
    const lines = [], rings = 76, steps = 22, R = 154, tube = 54;
    function point(u,v) { return project3D((R+tube*Math.cos(v))*Math.cos(u),(R+tube*Math.cos(v))*Math.sin(u),tube*Math.sin(v),tilt,yaw,scale,cx,cy); }
    for(let i=0;i<rings;i++) {
      const u=i/rings*Math.PI*2;
      for(let j=0;j<steps;j++) {
        const v=j/steps*Math.PI*2, a=point(u,v), b=point(u+Math.PI*2/rings,v), c=point(u,v+Math.PI*2/steps);
        lines.push({a,b,z:(a[2]+b[2])/2,alpha:.1+.38*(.5+.5*Math.cos(v-.6))});
        if(i%2===0)lines.push({a,b:c,z:(a[2]+c[2])/2,alpha:.08+.16*(.5+.5*Math.sin(u))});
      }
    }
    lines.sort((a,b)=>b.z-a.z);
    for(const line of lines){const alpha=line.alpha*(line.z<0?1.3:.45);ctx.strokeStyle=`rgba(215,229,180,${alpha})`;ctx.lineWidth=line.z<0?.85:.6;ctx.beginPath();ctx.moveTo(line.a[0],line.a[1]);ctx.lineTo(line.b[0],line.b[1]);ctx.stroke();}
    // Two fine orbital paths around the central sculptural form.
    for(let k=0;k<2;k++){
      ctx.beginPath();
      for(let i=0;i<=180;i++){const a=i/180*Math.PI*2;const p=project3D(245*Math.cos(a),245*Math.sin(a),0,1.05+k*.65,yaw*.35+.4+k*.6,scale,cx,cy);if(i===0)ctx.moveTo(p[0],p[1]);else ctx.lineTo(p[0],p[1]);}
      ctx.strokeStyle=k?'rgba(211,247,111,.2)':'rgba(211,247,111,.55)';ctx.lineWidth=.85;ctx.stroke();
    }
    const angle=t*.23+.8;
    const orb=project3D(245*Math.cos(angle),245*Math.sin(angle),0,1.05,yaw*.35+.4,scale,cx,cy);
    ctx.fillStyle='#d9fc58';ctx.shadowColor='#d9fc58';ctx.shadowBlur=15;ctx.beginPath();ctx.arc(orb[0],orb[1],3.3*scale,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    ctx.strokeStyle='rgba(161,184,119,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(cx-6,cy);ctx.lineTo(cx+6,cy);ctx.moveTo(cx,cy-6);ctx.lineTo(cx,cy+6);ctx.stroke();
  }
  function drawNetwork(ctx,w,h,t) {
    ctx.clearRect(0,0,w,h);if(!w||!h)return;
    const cx=w*.5,cy=h*.49,r=Math.min(w,h)*.31;
    const dots=[];
    for(let j=0;j<3;j++){
      ctx.beginPath();
      for(let i=0;i<=120;i++){
        const a=i/120*Math.PI*2,theta=j*Math.PI/3+t*.025;
        const x=Math.cos(a)*r,y=Math.sin(a)*r*.52;
        const xx=cx+x*Math.cos(theta)-y*Math.sin(theta),yy=cy+x*Math.sin(theta)+y*Math.cos(theta);
        if(i===0)ctx.moveTo(xx,yy);else ctx.lineTo(xx,yy);
        if(i%15===0)dots.push([xx,yy]);
      }
      ctx.strokeStyle='rgba(180,214,117,.32)';ctx.lineWidth=.7;ctx.stroke();
      const a=t*.2+j*2,theta=j*Math.PI/3+t*.025,x=Math.cos(a)*r,y=Math.sin(a)*r*.52;
      ctx.fillStyle='#d9fc58';ctx.shadowColor='#d9fc58';ctx.shadowBlur=14;ctx.beginPath();ctx.arc(cx+x*Math.cos(theta)-y*Math.sin(theta),cy+x*Math.sin(theta)+y*Math.cos(theta),3,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
    }
    dots.forEach(([x,y],i)=>{ctx.beginPath();ctx.arc(x,y,i%3===0?2:1,0,Math.PI*2);ctx.fillStyle='rgba(202,222,166,.65)';ctx.fill();});
    for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(cx,cy,r*(1.25+i*.1),0,Math.PI*2);ctx.setLineDash([1,8]);ctx.strokeStyle=`rgba(150,179,102,${.12-i*.02})`;ctx.stroke();}ctx.setLineDash([]);
  }
  function drawStill(){drawables.forEach(item=>{if(item.visible&&item.width)item.render(item.ctx,item.width,item.height,time);});}
  function tick(timestamp){
    raf=0;
    if(!motion||document.hidden)return;
    if(timestamp-lastFrame>=1000/30){time+=Math.min((timestamp-lastFrame)/1000,.05);lastFrame=timestamp;drawStill();}
    if(drawables.some(x=>x.visible))raf=requestAnimationFrame(tick);
  }
  function startAnimation(){if(motion&&!document.hidden&&!raf&&drawables.some(x=>x.visible)){lastFrame=performance.now();raf=requestAnimationFrame(tick);}}
  function setMotion(enabled,persist=false){
    motion=enabled;root.classList.toggle('motion-paused',!motion);
    motionButton.setAttribute('aria-pressed',String(!motion));
    motionButton.querySelector('.motion-label').textContent=motion?'Pause motion':'Enable motion';
    motionButton.querySelector('.motion-glyph').textContent=motion?'Ⅱ':'▶';
    motionButton.setAttribute('aria-label',motion?'Pause animations and videos':'Enable animations and video previews');
    if(persist){try{localStorage.setItem('launchaxis-motion',motion?'on':'off');}catch(_){}}
    if(!motion){cancelAnimationFrame(raf);raf=0;videos.forEach(v=>v.pause());root.style.setProperty('--title-drift','0px');}
    else{startAnimation();videos.forEach(v=>{const s=videoState.get(v);if(s.visible&&!s.manuallyPaused&&!saveData&&v.dataset.storyManaged!=='true')v.play().catch(()=>{});});}
    drawStill();
  }
  motionButton.addEventListener('click',()=>setMotion(!motion,true));
  motionButton.hidden=false;
  reduce.addEventListener('change',e=>setMotion(!e.matches));
  document.addEventListener('visibilitychange',()=>{
    if(document.hidden){cancelAnimationFrame(raf);raf=0;videos.forEach(v=>v.pause());}
    else{startAnimation();videos.forEach(v=>{const s=videoState.get(v);if(motion&&s.visible&&!s.manuallyPaused&&!saveData&&v.dataset.storyManaged!=='true')v.play().catch(()=>{});});}
  });

  let scrollScheduled=false;
  const progress=document.querySelector('.reading-progress');
  const hero=document.querySelector('.hero');
  const tide=document.querySelector('.tide-cinema');
  function updateScroll(){
    scrollScheduled=false;
    const max=document.documentElement.scrollHeight-innerHeight;
    progress.style.transform=`scaleX(${max>0?clamp(scrollY/max,0,1):0})`;
    scrollFraction=motion?clamp(scrollY/Math.max(hero.offsetHeight,1),0,1):0;
    if(motion){const box=tide.getBoundingClientRect();const drift=clamp((innerHeight*.5-box.top)/innerHeight,-.7,.7)*45;tide.style.setProperty('--title-drift',`${drift}px`);}
    let active=projects.find(p=>!p.hidden);
    for(const project of projects){if(!project.hidden&&project.getBoundingClientRect().top<innerHeight*.45)active=project;}
    projectLinks.forEach(link=>{if(active&&link.dataset.projectLink===active.id)link.setAttribute('aria-current','true');else link.removeAttribute('aria-current');});
  }
  window.addEventListener('scroll',()=>{if(!scrollScheduled){scrollScheduled=true;requestAnimationFrame(updateScroll);}},{passive:true});
  hero.addEventListener('pointermove',e=>{if(!motion||e.pointerType==='touch')return;const r=hero.getBoundingClientRect();pointerX=(e.clientX-r.left)/r.width-.5;pointerY=(e.clientY-r.top)/r.height-.5;},{passive:true});
  hero.addEventListener('pointerleave',()=>{pointerX=pointerY=0;});
  createDrawable('axis-core',drawCore);createDrawable('network-canvas',drawNetwork);
  if('ResizeObserver' in window){const ro=new ResizeObserver(resizeCanvases);drawables.forEach(d=>ro.observe(d.canvas.parentElement));}
  else window.addEventListener('resize',resizeCanvases,{passive:true});
  resizeCanvases();setMotion(motion);updateScroll();startAnimation();
})();
