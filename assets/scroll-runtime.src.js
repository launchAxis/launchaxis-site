import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {MeshoptDecoder} from 'three/addons/libs/meshopt_decoder.module.js';
import {createAxisCameraControls} from './axis-camera.js';

// Document position is the timeline; the shared stage normalizes mouse-wheel pace.
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,v)=>{const t=clamp((v-a)/(b-a));return t*t*(3-2*t);};
const root=document.documentElement;
const reducedMotion=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
const active=()=>!root.classList.contains('motion-paused')&&!reducedMotion?.matches;
const loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const vec=()=>new THREE.Vector3();
let jobs=[],scheduled=false,previousFrame=0,frameBlend=.2;
function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
function update(now){scheduled=false;if(document.hidden){previousFrame=0;return;}const delta=previousFrame&&now-previousFrame<120?Math.min(.05,(now-previousFrame)/1000):1/60;previousFrame=now;frameBlend=1-Math.exp(-13*delta);let more=false;for(const job of jobs)more=job()||more;if(more)schedule();}
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
  // A simple ground plane for the arm, also in the no-WebGL fallback.
  // Tide has no canvasFloor objects, so its vertex renderer is unchanged.
  scene.traverse(object=>{
   if(!object.visible||!object.userData.canvasFloor)return;
   projector.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(object.matrixWorld);
   ctx.globalAlpha=object.material.opacity;ctx.fillStyle=`#${object.material.color.getHexString()}`;ctx.beginPath();
   [0,1,3,2].forEach((index,i)=>{a.fromBufferAttribute(object.geometry.attributes.position,index).applyMatrix4(projector);const x=(a.x*.5+.5)*width,y=(-a.y*.5+.5)*height;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fill();
  });
  scene.traverse(object=>{
   if(!object.visible||(!object.isLineSegments&&!object.isPoints))return;
   const geometry=object.geometry,position=geometry.attributes.position,indices=geometry.index;
   const material=object.material,uniforms=material.uniforms;
   const opacity=uniforms?.uOpacity?.value??material.opacity;if(opacity<.001)return;
   const source=geometry.attributes.aStart,seed=geometry.attributes.aSeed;
   projector.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).multiply(object.matrixWorld);
   const count=indices?indices.count:position.count;
   if(object.isPoints){
    ctx.fillStyle='#d7ebaf';ctx.globalAlpha=opacity;
    for(let n=0;n<position.count;n++){
     a.fromBufferAttribute(position,n);
     const s=seed?.getX(n)??.5;
     if(source){const t=smooth(0,1,clamp((uniforms.uAssembly.value-s*.19)/.81));start.fromBufferAttribute(source,n);a.lerpVectors(start,a,t);const arc=Math.sin(t*Math.PI)*(1-t)*uniforms.uSize.value*.3;a.x+=Math.cos(s*31.4)*arc;a.y+=Math.sin(s*25.1)*arc;a.z+=Math.cos(s*18.7)*arc;}
     a.applyMatrix4(projector);if(!inView(a)||Math.abs(a.x)>1.05||Math.abs(a.y)>1.05)continue;
     const dot=(uniforms?.uPointSize?.value??1.6)*(.75+s*.5);
     ctx.fillRect((a.x*.5+.5)*width-dot/2,(-a.y*.5+.5)*height-dot/2,dot,dot);
    }return;
   }
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
 const story=document.querySelector('.tide-story');if(!story)return;
 const host=story.querySelector('.tide-3d'),screen=story.querySelector('.tide-screen'),stage=story.querySelector('.tide-stage'),video=story.querySelector('video'),ui=story.querySelector('.tide-story-ui');
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
  // A continuous arc avoids the old stop/start halfway around the boat.
  const cameraPath=new THREE.CatmullRomCurve3([startPosition,turnPosition,endPosition],false,'centripetal');
  const focal=center.clone();
  // Use the actual mesh vertices, welding UV/normal duplicates into single dots.
  // The solid mesh is not part of this particle-to-footage transition.
  const target=[],starts=[],seeds=[],seen=new Set();let vertex=0;
  craft.traverse(o=>{
   if(!o.isMesh)return;
   const pos=o.geometry.getAttribute('position');o.visible=false;
   for(let i=0;i<pos.count;i++){
    const p=vec().fromBufferAttribute(pos,i).applyMatrix4(o.matrixWorld),key=[p.x,p.y,p.z].map(n=>Math.round(n*10000)).join(',');
    if(seen.has(key))continue;seen.add(key);
    const hash=Math.sin(vertex*127.1+31.7)*43758.5453,h=hash-Math.floor(hash),h2=(vertex*.61803398875)%1,z=2*h2-1,angle=vertex*2.39996323,r=length*(.8+h*1.9),ring=Math.sqrt(1-z*z);
    target.push(p.x,p.y,p.z);starts.push(center.x+Math.cos(angle)*ring*r,center.y+z*r,center.z+Math.sin(angle)*ring*r);seeds.push(h);vertex++;
   }
  });
  const particleGeometry=new THREE.BufferGeometry();
  particleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(target,3));
  particleGeometry.setAttribute('aStart',new THREE.Float32BufferAttribute(starts,3));
  particleGeometry.setAttribute('aSeed',new THREE.Float32BufferAttribute(seeds,1));
  const particleMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{uAssembly:{value:0},uOpacity:{value:.8},uSize:{value:length},uPointSize:{value:1.5},uDpr:{value:Math.min(devicePixelRatio||1,1.6)}},vertexShader:`
   attribute vec3 aStart;attribute float aSeed;uniform float uAssembly;uniform float uSize;uniform float uPointSize;uniform float uDpr;varying float vSeed;
   void main(){float t=clamp((uAssembly-aSeed*.19)/.81,0.,1.);t=t*t*(3.-2.*t);vec3 p=mix(aStart,position,t);float arc=sin(t*3.14159265)*(1.-t)*uSize*.3;p+=vec3(cos(aSeed*31.4),sin(aSeed*25.1),cos(aSeed*18.7))*arc;vSeed=aSeed;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);gl_PointSize=uPointSize*uDpr*(.75+aSeed*.5);}
  `,fragmentShader:`uniform float uOpacity;varying float vSeed;void main(){float d=length(gl_PointCoord-.5);if(d>.5)discard;vec3 c=mix(vec3(.72,.83,.62),vec3(.94,.99,.84),vSeed);gl_FragColor=vec4(c,uOpacity*(1.-smoothstep(.3,.5,d)));}`});
  const particles=new THREE.Points(particleGeometry,particleMaterial);particles.frustumCulled=false;scene.add(particles);
  host.dataset.vertices=String(vertex);
  const registration=new THREE.Matrix4();
  let failed=false,lastPhase=-1,last=-1,progress=0,width=0,height=0;
  const label=story.querySelector('.story-kicker'),statement=story.querySelector('.story-statement'),buttons=[...story.querySelectorAll('[data-story-step]')];
  const uiControls=[...ui.querySelectorAll('button,a')];
  const stateCopy=[['VERTICES','One piece at a time...'],['FORM','The boat takes shape.'],['SCENE','The scene comes together.']];
  video.dataset.storyManaged='true';video.autoplay=false;video.pause();
  // End on the source Blender camera. Verify the shot match in browser QA.
  video.preload='auto';video.addEventListener('loadeddata',schedule,{once:true});video.load();
  story.classList.add('story-ready');ui.hidden=false;
  function resize(){
   const toolbar=document.querySelector('.work-toolbar'),header=document.querySelector('.header');
   const top=root.classList.contains('continuum-enabled')?0:(header?.offsetHeight||0)+(toolbar?.offsetHeight||0);
   story.style.setProperty('--story-top',`${top}px`);story.style.setProperty('--measured-story-top',`${top}px`);
   const w=screen.clientWidth,h=screen.clientHeight;if(w>0&&h>0&&(width!==w||height!==h)){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();last=-1;schedule();}
  }
  const ro=new ResizeObserver(resize);ro.observe(screen);ro.observe(document.querySelector('.header'));ro.observe(document.querySelector('.work-toolbar'));resize();
  buttons.forEach(button=>button.addEventListener('click',()=>{
   const top=parseFloat(getComputedStyle(story).getPropertyValue('--story-top'))||149;
   const start=story.getBoundingClientRect().top+scrollY-top;
   window.scrollTo({top:start+(story.offsetHeight-stage.offsetHeight)*Number(button.dataset.storyStep),behavior:active()?'smooth':'instant'});
  }));
  function fallback(){failed=true;story.classList.remove('story-ready','story-static');ui.hidden=true;ui.inert=false;video.dataset.storyManaged='false';renderer.dispose();host.replaceChildren();ro.disconnect();video.play().catch(()=>{video.controls=true;});notice(story,'The 3D view is unavailable on this device. The original Tide scene is shown instead.');}
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();fallback();},{once:true});
  jobs.push(()=>{
   if(failed)return false;
   const enabled=active();story.classList.toggle('story-static',!enabled);
   if(!enabled){ui.inert=true;last=-1;return false;}
   if(!story.getClientRects().length){video.pause();last=-1;return false;}
   const rect=story.getBoundingClientRect(),top=parseFloat(getComputedStyle(story).getPropertyValue('--story-top'))||149;
   const continuous=root.classList.contains('continuum-enabled');
   const desired=continuous?Number(story.dataset.continuumProgress||0):clamp((top-rect.top)/Math.max(1,story.offsetHeight-stage.offsetHeight));
   const visible=continuous?story.dataset.continuumActive==='true':rect.bottom>top&&rect.top<innerHeight;
   if(!visible){video.pause();last=-1;return false;}
   progress=last<0?desired:THREE.MathUtils.lerp(progress,desired,frameBlend);
   if(Math.abs(progress-desired)<.00015)progress=desired;
   if(progress===last){if(progress>.88&&video.paused)video.play().catch(()=>{video.controls=true;});return false;}last=progress;
   const p=progress,assembly=smooth(.01,.43,p),turn=smooth(.32,.69,p),reveal=smooth(.76,.88,p),dock=smooth(.92,1,p);
   particleMaterial.uniforms.uAssembly.value=assembly;
   particleMaterial.uniforms.uOpacity.value=.5+assembly*.28;
   particleMaterial.uniforms.uPointSize.value=THREE.MathUtils.lerp(2,1.35,assembly);
   camera.position.copy(cameraPath.getPointAt(turn));
   // Portrait screens need a wider orbit; blend back into the render framing
   // only for the final handover, where the footage itself is cover-cropped.
   const portraitFraming=1+(Math.max(1,1.2/camera.aspect)-1)*(1-smooth(.82,1,turn));
   camera.position.sub(focal).multiplyScalar(portraitFraming).add(focal);
   camera.lookAt(focal);
   // The render's orientation only fits its final position. Blending it early
   // looks away from the boat while the camera is still on the orbit.
   camera.quaternion.slerp(endQuaternion,smooth(.92,1,turn));
   const endFov=THREE.MathUtils.radToDeg(2*Math.atan(Math.tan(THREE.MathUtils.degToRad(nativeFov)/2)*Math.min(1,nativeAspect/camera.aspect)));
   camera.fov=THREE.MathUtils.lerp(camera.aspect<1?57:40,endFov,smooth(.15,1,turn));camera.updateProjectionMatrix();
   // Film-plane registration measured from bow/stern landmarks in the actual
   // supplied clip's first frame (1280 x 600), not the separately saved .blend.
   // Apply in native film coordinates, conjugated by the video's cover crop.
   const aligned=smooth(.72,1,turn),sx=Math.max(1,nativeAspect/camera.aspect),sy=Math.max(1,camera.aspect/nativeAspect);
   const ax=.9172105806,bx=.1055532892,cx=-.1816644784,ay=-.1401659871,by=.7990381312,cy=.2757068068;
   registration.set(1+(ax-1)*aligned,bx*sx/sy*aligned,0,cx*sx*aligned,ay*sy/sx*aligned,1+(by-1)*aligned,0,cy*sy*aligned,0,0,1,0,0,0,0,1);
   camera.projectionMatrix.premultiply(registration);camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
   renderer.render(scene,camera);
   const phase=p<.39?0:p<.72?1:2;
   if(phase!==lastPhase){lastPhase=phase;label.textContent=stateCopy[phase][0];statement.innerHTML=stateCopy[phase][1];buttons.forEach((b,i)=>{if(i===phase)b.setAttribute('aria-current','step');else b.removeAttribute('aria-current');});}
   story.style.setProperty('--scene-reveal',reveal.toFixed(4));
   story.style.setProperty('--model-opacity',(1-reveal).toFixed(4));
   story.style.setProperty('--heading-opacity',(1-smooth(.68,.76,p)).toFixed(4));
   story.style.setProperty('--ui-opacity',(1-smooth(.84,.91,p)).toFixed(4));
   story.style.setProperty('--story-scale',(1-dock*.075).toFixed(4));
   story.style.setProperty('--story-progress',p.toFixed(4));
   story.style.setProperty('--video-events',p>.83?'auto':'none');
   ui.inert=p>.91;
   uiControls.forEach(el=>el.tabIndex=p>.91?-1:0);
   if(p>.88&&!document.hidden){if(video.paused)video.play().catch(()=>{video.controls=true;});}
   else {video.pause();if(video.readyState>0&&video.currentTime>.01)video.currentTime=0;}
   return Math.abs(progress-desired)>.00015;
  });
  schedule();
 }catch(error){
  if(renderer)renderer.dispose();story.classList.remove('story-ready','story-static');ui.hidden=true;ui.inert=false;video.dataset.storyManaged='false';host.replaceChildren();video.play().catch(()=>{video.controls=true;});
  console.warn('Tide 3D enhancement unavailable:',error.message);
 }
}

async function axis(){
 const panel=document.querySelector('.axis-3d-panel');if(!panel)return;
 panel.dataset.sceneState='loading';
 const host=panel.querySelector('.axis-model-canvas'),resetView=panel.querySelector('.axis-reset-view');
 let renderer,cameraInput;
 try{
  const gltf=await loader.loadAsync('/assets/models/axis.glb');
  const scene=new THREE.Scene();lightScene(scene);renderer=rendererFor(host);renderer.toneMappingExposure=1.35;
  const model=gltf.scene;model.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(model),size=box.getSize(vec()),center=box.getCenter(vec()),scale=3/Math.max(size.x,size.y,size.z);
  const rig=new THREE.Group();rig.scale.setScalar(scale);rig.position.copy(center).multiplyScalar(-scale);rig.add(model);
  const turntable=new THREE.Group();turntable.rotation.y=-.55;turntable.add(rig);scene.add(turntable);
  const camera=new THREE.PerspectiveCamera(38,1,.01,100);camera.position.set(4.8,2.2,5.5);camera.lookAt(0,.05,0);
  const floor=new THREE.Mesh(new THREE.PlaneGeometry(7,7),new THREE.MeshStandardMaterial({color:0xe7e9df,roughness:1,transparent:true,opacity:.65,side:THREE.DoubleSide}));
  floor.rotation.x=-Math.PI/2;floor.position.y=(box.min.y-center.y)*scale-.025;floor.receiveShadow=true;floor.userData.canvasFloor=true;scene.add(floor);
  if(!renderer.isCanvasFallback){
   renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
   const key=scene.children.find(o=>o.isDirectionalLight);key.castShadow=true;key.shadow.mapSize.set(1024,1024);Object.assign(key.shadow.camera,{left:-6,right:6,top:6,bottom:-6,near:.1,far:40});key.shadow.bias=-.0002;key.shadow.normalBias=.02;
  }
  const mixer=new THREE.AnimationMixer(model),actions=gltf.animations.map(c=>mixer.clipAction(c));
  const duration=Math.max(0,...gltf.animations.map(c=>c.duration));
  actions.forEach(a=>{a.setLoop(THREE.LoopOnce,1);a.clampWhenFinished=true;a.play();});
  // Edge overlays use each mesh's local coordinates and follow the original joints.
  const wireMaterials=[];
  model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;
   const geometry=new THREE.EdgesGeometry(o.geometry,35),material=new THREE.LineBasicMaterial({color:0x34523c,transparent:true,opacity:.08});
   const edges=new THREE.LineSegments(geometry,material);o.add(edges);wireMaterials.push(material);
  });
  panel.hidden=false;panel.dataset.sceneState='ready';window.dispatchEvent(new CustomEvent('launchaxis:scene-ready'));document.querySelector('.render-caption-label').hidden=false;
  panel.querySelector('.axis-model-status').textContent=renderer.isCanvasFallback?'WIREFRAME VIEW':'LIVE 3D';
  let width=0,height=0,last=-1,progress=0,failed=false,cameraDirty=true;
  cameraInput=createAxisCameraControls(camera,host,resetView,()=>{cameraDirty=true;schedule();});
  renderer.domElement.setAttribute('aria-hidden','true');
  function resize(){const w=host.clientWidth,h=host.clientHeight;if(w&&h&&(w!==width||h!==height)){width=w;height=h;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w/h<1?44:38;camera.updateProjectionMatrix();cameraDirty=true;last=-1;schedule();}}
  const ro=new ResizeObserver(resize);ro.observe(host);resize();
  renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();failed=true;panel.hidden=true;panel.dataset.sceneState='error';window.dispatchEvent(new CustomEvent('launchaxis:scene-ready'));document.querySelector('.render-caption-label').hidden=true;cameraInput.dispose();renderer.dispose();ro.disconnect();},{once:true});
  jobs.push(()=>{
   if(failed||!panel.getClientRects().length)return false;
   const rect=panel.getBoundingClientRect(),continuous=root.classList.contains('continuum-enabled');if(rect.bottom<0||rect.top>innerHeight||continuous&&panel.dataset.continuumActive!=='true'){last=-1;return false;}
   const enabled=active();
   // Scroll only changes joint poses. Camera position, target and orientation
   // belong to the visitor and survive forward/reverse scrolling and re-entry.
   const desired=enabled?(continuous?Number(panel.dataset.continuumProgress||0):clamp((innerHeight*.8-rect.top)/(innerHeight*.5+rect.height*.8))):progress;
   progress=last<0?desired:THREE.MathUtils.lerp(progress,desired,frameBlend);
   if(Math.abs(progress-desired)<.00015)progress=desired;
   if(last===progress&&!cameraDirty)return false;last=progress;cameraDirty=false;
   for(const a of actions){a.paused=false;a.enabled=true;}
   mixer.setTime(duration*Math.min(.9999,progress));
   for(const mat of wireMaterials)mat.opacity=renderer.isCanvasFallback?.65:.025+(1-smooth(.05,.55,progress))*.08;
   renderer.render(scene,camera);
   return Math.abs(progress-desired)>.00015;
  });schedule();
 }catch(error){cameraInput?.dispose();if(renderer)renderer.dispose();panel.hidden=true;panel.dataset.sceneState='error';window.dispatchEvent(new CustomEvent('launchaxis:scene-ready'));console.warn('Axis 3D enhancement unavailable:',error.message);}
}

let initialized=false;const loaded=new Set();
export function boot(project='all'){
 if(!active()||navigator.connection?.saveData)return false;
 if(!initialized){
  initialized=true;
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule,{passive:true});
  window.addEventListener('launchaxis:continuum',schedule);
  document.addEventListener('visibilitychange',schedule);
  reducedMotion?.addEventListener('change',schedule);
  new MutationObserver(schedule).observe(root,{attributes:true,attributeFilter:['class']});
  // Filtering projects changes layout without necessarily generating a scroll event.
  document.querySelectorAll('[data-filter]').forEach(b=>b.addEventListener('click',()=>requestAnimationFrame(schedule)));
 }
 for(const name of project==='all'?['axis','tide']:[project]){
  if(loaded.has(name))continue;
  if(name!=='axis'&&name!=='tide')continue;
  loaded.add(name);if(name==='axis')axis();else tide();
 }
 return true;
}
