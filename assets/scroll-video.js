// Seek to the latest scroll target, never queue every intermediate frame and
// never run autoplay alongside scrubbing. The original clip remains intact.
export function createScrollVideo(video,onReady=()=>{}){
 const original={autoplay:video.autoplay,loop:video.loop,controls:video.controls};
 let prepared=false,disposed=false,frame=0,progress=0;
 video.dataset.scrollManaged='true';video.dataset.scrubReady='false';
 video.autoplay=false;video.loop=false;video.controls=false;video.pause();
 function schedule(){if(!disposed&&!frame)frame=requestAnimationFrame(flush);}
 function flush(){
  frame=0;if(disposed||!prepared||video.seeking||video.readyState<1||!Number.isFinite(video.duration)||video.duration<=0)return;
  const target=Math.max(0,video.duration-1/24)*progress;
  if(Math.abs(video.currentTime-target)>1/48)video.currentTime=target;
 }
 function ready(){
  if(disposed)return;
  if(video.readyState>=2&&video.dataset.scrubReady!=='true'){video.dataset.scrubReady='true';onReady();}
  schedule();
 }
 function pauseAutoplay(){if(!disposed&&!video.paused)video.pause();}
 video.addEventListener('loadedmetadata',ready);video.addEventListener('loadeddata',ready);
 video.addEventListener('seeked',ready);video.addEventListener('canplay',ready);video.addEventListener('play',pauseAutoplay);
 return {
  prepare(){if(prepared||disposed)return;prepared=true;video.preload='auto';if(video.readyState===0)video.load();else ready();},
  setProgress(value){progress=Math.max(0,Math.min(1,value));schedule();},
  dispose(){disposed=true;cancelAnimationFrame(frame);for(const name of ['loadedmetadata','loadeddata','seeked','canplay'])video.removeEventListener(name,ready);video.removeEventListener('play',pauseAutoplay);delete video.dataset.scrollManaged;delete video.dataset.scrubReady;Object.assign(video,original);}
 };
}
