import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';

// Native scroll is the timeline. No wheel capture, scroll lock or forced snapping.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const root=document.documentElement;
const active=()=>!root.classList.contains('motion-paused')&&!matchMedia('(prefers-reduced-motion: reduce)').matches;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const vec=()=>new THREE.Vector3();
let jobs=[],scheduled=false;
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
function update(){scheduled=false;if(document.hidden)return;let more=false;for(const job of jobs)more=job()||more;if(more)schedule();}
function rendererFor(host){
 const canvas=document.createElement('canvas');
 // Some managed browsers and low-power devices have no WebGL context at all.
 // Project the same geometry in Canvas 2D instead of dropping the scroll story.
 let context;try{context=canvas.getContext('webgl2',{alpha:true,antialias:true});}catch{}
 if(!context){const renderer=canvasRenderer();host.append(renderer.domElement);return renderer;}
 const renderer=new THREE.WebGLRenderer({canvas,context,alpha:true,antialias:true,powerPreference:'low-power'});
 renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));
 renderer.setClearColor(0x111310,0);renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.45;
 host.append(renderer.domElement);
 return renderer;
}
export function canvasRenderer(){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');
 if(!ctx)throw new Error('Canvas is unavailable');
 let width=1,height=1;const ratio=Math.min(devicePixelRatio||1,1.4);
 const a=vec(),b=vec(),start=vec(),projector=new THREE.Matrix4();
 const inView=p=>p.z>-1&&p.z<1&&Math.abs(p.x)<6&&Math.abs(p.y)<6;
 return {domElement:canvas,isCanvasFallback:true,dispose(){},setSize(w,h){width=w;height=h;canvas.width=Math.round(w*ratio);canvas.height=Math.round(h*ratio);},render(scene,camera){
  scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
  ctx.setTransform(ratio,0,0,ratio,0,0);ctx.clearRect(0,0,width,height);ctx.lineWidth=.7;
  scene.traverse(object=>{
   if(!object.visible||!object.isLineSegments)return;
   const geometry=object.geometry,position=geometry.attributes.position,indices=geometry.index;
   const material=object.material,uniforms=material.uniforms;
   const opacity=uniforms?.uOpacity?.value??material.opacity;if(opacity<.001)return;
   const source=geometry.attributes.aStart,seed=geometry.attributes.aSeed;
   projector.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(object.matrixWorld);
   const count=indices?indices.count:position.count;
   ctx.globalAlpha=opacity;ctx.strokeStyle=uniforms?'#b9d194':`#${material.color.getHexString()}`;ctx.beginPath();
   for(let i=0;i<count-1;i+=2){
    for(let j=0;j<2;j++){
     const n=indices?indices.getX(i+j):i+j,p=j?b:a;p.fromBufferAttribute(position,n);
     if(source){const s=seed.getX(n),t=smooth(0,1,clamp((uniforms.uAssembly.value-s*.15)/.85));start.fromBufferAttribute(source,n);p.lerpVectors(start,p,t);p.y+=Math.sin(t*Math.PI)*(s-.5)*uniforms.uSize.value*.8;}
     p.applyMatrix4(projector);
    }
    if(!inView(a)||!inView(b))continue;
    ctx.moveTo((a.x*.5+.5)*width,(-a.y*.5+.5)*height);ctx.lineTo((b.x*.5+.5)*width,(-b.y*.5+.5)*height);
   }ctx.stroke();
  });ctx.globalAlpha=1;
 }};
}
function lightScene(scene){
 scene.add(new THREE.HemisphereLight(0xf4f2df,0x394234,2.5));
 const key=new THREE.DirectionalLight(0xfff1d9,3.8);key.position.set(-8,14,9);scene.add(key);
 const fill=new THREE.DirectionalLight(0xc9d8e9,1.7);fill.position.set(8,5,-8);scene.add(fill);
}
function notice(target,text){const p=document.createElement('p');p.className='scene-unavailable';p.textContent=text;target.after(p);}

async function tide(){
 const story=document.querySelector('.tide-story'),host=story.querySelector('.tide-3d'),screen=story.querySelector('.tide-screen'),stage=story.querySelector('.tide-stage'),video=story.querySelector('video'),ui=story.querySelector('.tide-story-ui');
 let renderer;
 try{
  const gltf=await loader.loadAsync('/assets/models/tide.glb');
  renderer=rendererFor(host);
  const scene=new THREE.Scene();lightScene(scene);
  const craft=gltf.scene;craft.updateMatrixWorld(true);
  const renderCamera=gltf.cameras[0];if(!renderCamera)throw new Error('Render camera missing');
  const endPosition=renderCamera.getWorldPosition(vec());
  const endQuaternion=renderCamera.getWorldQuaternion(new THREE.Quaternion());
  const nativeAspect=renderCamera.aspect,nativeFov=renderCamera.fov;
  renderCamera.removeFromParent();scene.add(craft);
  const box=new THREE.Box3().setFromObject(craft),center=box.getCenter(vec()),size=box.getSize(vec()),length=Math.max(size.x,size.y,size.z);
  const camera=new THREE.PerspectiveCamera(40,1,.05,1000);
  const startPosition=center.clone().add(new THREE.Vector3(length*.75,length*.85,length*1.65));
  const turnPosition=center.clone().add(new THREE.Vector3(-length*.7,length*.65,length*1.6));
  const focal=center.clone();
  const materials=[];
  craft.traverse(o=>{if(o.isMesh){o.frustumCulled=false;const ms=Array.isArray(o.material)?o.material:[o.material];for(const mat of ms){mat.transparent=true;mat.opacity=0;mat.depthWrite=true;mat.side=THREE.DoubleSide;materials.push(mat);}}});

  // Use edges from the supplied boat itself, with a stable scatter-to-mesh trajectory.
  const target=[],starts=[],seeds=[];let segment=0;
  craft.traverse(o=>{
   if(!o.isMesh)return;
   const wire=new THREE.WireframeGeometry(o.geometry),pos=wire.getAttribute('position');
   const stride=Math.max(1,Math.ceil(pos.count/2/8500));
   for(let i=0;i<pos.count-1;i+=2*stride){
    const hash=(Math.sin(segment*127.1+31.7)*43758.5453)%1;const h=hash-Math.floor(hash);
    for(let j=0;j<2;j++){
     const p=vec().fromBufferAttribute(pos,i+j).applyMatrix4(o.matrixWorld);
     target.push(p.x,p.y,p.z);
     const side=segment%2?1:-1;
     starts.push(center.x+side*length*(2.8+h*4)+(j?.3:0),center.y+(h-.5)*length*5,center.z+(h-.5)*length*4);
     seeds.push(h);
    }segment++;
   }wire.dispose();
  });
  const lineGeometry=new THREE.BufferGeometry();
  lineGeometry.setAttribute('position',new THREE.Float32BufferAttribute(target,3));
  lineGeometry.setAttribute('aStart',new THREE.Float32BufferAttribute(starts,3));
  lineGeometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
  const lineMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uAssembly:{value:0},uOpacity:{value:.7},uSize:{value:length}},vertexShader:`
   attribute vec3 aStart;attribute float aSeed;uniform float uAssembly;uniform float uSize;varying float vSeed;
   void main(){float t=clamp((uAssembly-aSeed*.15)/.85,0.,1.);t=t*t*(3.-2.*t);vec3 p=mix(aStart,position,t);p.y+=sin(t*3.14159265)*(aSeed-.5)*uSize*.8;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}
  `,fragmentShader:`uniform float uOpacity;varying float vSeed;void main(){vec3 c=mix(vec3(.69,.78,.62),vec3(.85,.99,.35),step(.88,vSeed));gl_FragColor=vec4(c,uOpacity*(.4+.6*vSeed));}`});
  const lines=new THREE.LineSegments(lineGeometry,lineMaterial);lines.frustumCulled=false;scene.add(lines);
  const grid=new THREE.GridHelper(length*7,40,0x839a56,0x435137);grid.position.copy(center);grid.position.y=box.min.y+.08;
  grid.material.transparent=true;grid.material.opacity=0;scene.add(grid);
  // A small point field adds depth without substituting fabricated project content.
  const pointPositions=[];for(let i=0;i<96;i++){const a=i*2.39996;pointPositions.push(center.x+Math.cos(a)*length*(1+(i%7)/3),center.y+(i%9-4)*length*.13,center.z+Math.sin(a)*length*2);}
  const pointsGeometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(pointPositions,3));
  const points=new THREE.Points(pointsGeometry,new THREE.PointsMaterial({color:0xc3da9c,size:.024,transparent:true,opacity:.4}));scene.add(points);
  let failed=false,lastPhase=-1,last=-1,progress=0,width=0,height=0;
  const label=story.querySelector('.story-kicker'),statement=story.querySelector('.story-statement'),buttons=[...story.querySelectorAll('[data-story-step]')];
  const stateCopy=[['01 — FORM','Every scene<br>starts with a line.'],['02 — MATERIAL','An idea.<br>Given a form.'],['03 — ATMOSPHERE','And then,<br>a world.']];
  if(renderer.isCanvasFallback)buttons[1].lastChild.textContent=' Perspective';
  video.dataset.storyManaged='true';video.pause();
  // End on the source Blender camera. Verify the shot match in browser QA.
  video.preload='auto';video.load();
  story.classList.add('story-ready');ui.hidden=false;
  function resize(){
   const toolbar=document.querySelector('.work-toolbar'),header=document.querySelector('.header');
   const top=(header?.offsetHeight||0)+(toolbar?.offsetHeight||0);
   story.style.setProperty('--story-top',`${top}px`);story.style.setProperty('--measured-story-top',`${top}px`);
   const w=screen.clientWidth,h=screen.clientHeight;if(w>0&&h>0&&(width!==w||height!==h)){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();last=-1;schedule();}
  }
  const ro=new ResizeObserver(resize);ro.observe(screen);ro.observe(document.querySelector('.header'));ro.observe(document.querySelector('.work-toolbar'));resize();
  buttons.forEach(button=>button.addEventListener('click',()=>{
   const top=parseFloat(getComputedStyle(story).getPropertyValue('--story-top'))||149;
   const start=story.getBoundingClientRect().top+scrollY-top;
   window.scrollTo({top:start+(story.offsetHeight-stage.offsetHeight)*Number(button.dataset.storyStep),behavior:active()?'smooth':'instant'});
  }));
  function fallback(){failed=true;story.classList.remove('story-ready');ui.hidden=true;video.dataset.storyManaged='false';renderer.dispose();host.replaceChildren();ro.disconnect();notice(story,'The 3D view is unavailable on this device. The original Tide scene is shown instead.');}
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();},{once:true});
  jobs.push(()=>{
   if(failed)return false;
   const enabled=active();story.classList.toggle('story-static',!enabled);
   if(!enabled){video.pause();last=-1;return false;}
   if(!story.getClientRects().length){video.pause();return false;}
   const rect=story.getBoundingClientRect(),top=parseFloat(getComputedStyle(story).getPropertyValue('--story-top'))||149;
   const desired=clamp((top-rect.top)/Math.max(1,story.offsetHeight-stage.offsetHeight));
   const visible=rect.bottom>top&&rect.top<innerHeight;
   if(!visible){video.pause();return false;}
   progress=last<0?desired:THREE.MathUtils.lerp(progress,desired,.22);
   if(Math.abs(progress-desired)<.00015)progress=desired;
   if(progress===last){if(progress>.84&&video.dataset.manuallyPaused!=='true'&&video.paused)video.play().catch(()=>{});return false;}last=progress;
   const p=progress,assembly=smooth(0,.28,p),material=smooth(.28,.51,p),turn=smooth(.25,.67,p),reveal=smooth(.69,.84,p),dock=smooth(.87,1,p);
   lineMaterial.uniforms.uAssembly.value=assembly;
   lineMaterial.uniforms.uOpacity.value=renderer.isCanvasFallback?(1-smooth(.69,.84,p))*.55:(1-smooth(.35,.61,p))*.82;
   for(const mat of materials)mat.opacity=material*(1-reveal);
   grid.material.opacity=smooth(.1,.3,p)*(1-reveal)*.22;
   points.material.opacity=(1-smooth(.35,.65,p))*.4;
   if(turn<.45)camera.position.lerpVectors(startPosition,turnPosition,smooth(0,.45,turn));
   else camera.position.lerpVectors(turnPosition,endPosition,smooth(.45,1,turn));
   camera.lookAt(focal);
   camera.quaternion.slerp(endQuaternion,smooth(.36,1,turn));
   const endFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(nativeFov)/2)*Math.min(1,nativeAspect/camera.aspect)));
   camera.fov=THREE.MathUtils.lerp(camera.aspect<1?57:40,endFov,smooth(.15,1,turn));camera.updateProjectionMatrix();
   renderer.render(scene,camera);
   const phase=p<.31?0:p<.64?1:2;
   if(phase!==lastPhase){lastPhase=phase;label.textContent=renderer.isCanvasFallback&&phase===1?'02 — PERSPECTIVE':stateCopy[phase][0];statement.innerHTML=stateCopy[phase][1];buttons.forEach((b,i)=>{if(i===phase)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
   story.style.setProperty('--scene-reveal',reveal.toFixed(4));
   story.style.setProperty('--model-opacity',(1-reveal).toFixed(4));
   story.style.setProperty('--heading-opacity',(1-smooth(.65,.75,p)).toFixed(4));
   story.style.setProperty('--ui-opacity',(1-smooth(.78,.88,p)).toFixed(4));
   story.style.setProperty('--story-scale',(1-dock*.075).toFixed(4));
   story.style.setProperty('--story-progress',p.toFixed(4));
   story.style.setProperty('--video-events',p>.83?'auto':'none');
   ui.inert=p>.88;
   ui.querySelectorAll('button,a').forEach(el=>el.tabIndex=p>.88?-1:0);
   const play=story.querySelector('.film-toggle');play.tabIndex=p>.83?0:-1;
   if(p>.84&&video.dataset.manuallyPaused!=='true'&&!document.hidden){if(video.paused)video.play().catch(()=>{});}
   else if(p<=.84){video.pause();if(video.readyState>0&&video.currentTime>.04)video.currentTime=0;}
   return Math.abs(progress-desired)>.00015;
  });
  schedule();
 }catch(error){
  if(renderer)renderer.dispose();story.classList.remove('story-ready');ui.hidden=true;video.dataset.storyManaged='false';host.replaceChildren();
  console.warn('Tide 3D enhancement unavailable:',error.message);
 }
}

async function axis(){
 const panel=document.querySelector('.axis-3d-panel'),host=panel.querySelector('.axis-model-canvas'),range=panel.querySelector('input'),follow=panel.querySelector('button');
 let renderer;
 try{
  const gltf=await loader.loadAsync('/assets/models/axis.glb');
  const scene=new THREE.Scene();lightScene(scene);renderer=rendererFor(host);renderer.toneMappingExposure=1.35;
  const model=gltf.scene;model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(vec()),center=box.getCenter(vec()),scale=3/Math.max(size.x,size.y,size.z);
  const rig=new THREE.Group();rig.scale.setScalar(scale);rig.position.copy(center).multiplyScalar(-scale);rig.add(model);
  const turntable=new THREE.Group();turntable.add(rig);scene.add(turntable);
  const camera=new THREE.PerspectiveCamera(38,1,.01,100);camera.position.set(4.8,2.2,5.5);camera.lookAt(0,.05,0);
  const grid=new THREE.GridHelper(9,30,0x8b9f68,0x44523a);grid.position.y=(box.min.y-center.y)*scale-.025;grid.material.transparent=true;grid.material.opacity=.3;scene.add(grid);
  const mixer=new THREE.AnimationMixer(model),actions=gltf.animations.map(c=>mixer.clipAction(c));
  const duration=Math.max(0,...gltf.animations.map(c=>c.duration));
  actions.forEach(a=>{a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();});
  // Edge overlays use each mesh's local coordinates and follow the original joints.
  const wireMaterials=[];
  model.traverse(o=>{if(!o.isMesh)return;
   const geometry=new THREE.EdgesGeometry(o.geometry,35),material=new THREE.LineBasicMaterial({color:0xb8d88c,transparent:true,opacity:.08});
   const edges=new THREE.LineSegments(geometry,material);o.add(edges);wireMaterials.push(material);
  });
  panel.hidden=false;document.querySelector('.render-caption-label').hidden=false;
  panel.querySelector('.axis-model-status').textContent=renderer.isCanvasFallback?'WIREFRAME VIEW':'LIVE 3D';
  let width=0,height=0,manual=false,last=-1,progress=0,failed=false;
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(w&&h&&(w!==width||h!==height)){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1?44:38;camera.updateProjectionMatrix();last=-1;schedule();}}
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  range.addEventListener('input',()=>{manual=true;follow.textContent='Follow scroll';schedule();});
  follow.addEventListener('click',()=>{manual=false;last=-1;schedule();});
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;panel.hidden=true;document.querySelector('.render-caption-label').hidden=true;renderer.dispose();ro.disconnect();},{once:true});
  jobs.push(()=>{
   if(failed||!panel.getClientRects().length)return false;
   const rect=panel.getBoundingClientRect();if(rect.bottom<0||rect.top>innerHeight)return false;
   const enabled=active();
   const desired=manual?Number(range.value)/100:enabled?clamp((innerHeight*.8-rect.top)/(innerHeight*.5+rect.height*.8)):.25;
   progress=last<0||manual?desired:THREE.MathUtils.lerp(progress,desired,.18);
   if(Math.abs(progress-desired)<.00015)progress=desired;
   if(last===progress)return false;last=progress;
   for(const a of actions){a.paused=false;a.enabled=true;}
   mixer.setTime(duration*Math.min(.9999,progress));
   turntable.rotation.y=-.55+progress*1.1;
   for(const mat of wireMaterials)mat.opacity=renderer.isCanvasFallback?.5:.04+(1-smooth(.05,.55,progress))*.19;
   if(!manual)range.value=String(Math.round(progress*100));
   range.setAttribute('aria-valuetext',`${Math.round(progress*100)} percent through the artist-authored animation`);
   follow.textContent=manual?'Follow scroll':'Following scroll';
   renderer.render(scene,camera);
   return Math.abs(progress-desired)>.00015;
  });schedule();
 }catch(error){if(renderer)renderer.dispose();panel.hidden=true;console.warn('Axis 3D enhancement unavailable:',error.message);}
}

export function boot(){
 if(!active()||navigator.connection?.saveData)return;
 window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
 document.addEventListener('visibilitychange',schedule);
 new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
 // Filtering projects changes layout without necessarily generating a scroll event.
 document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(schedule)));
 axis();tide();
}
