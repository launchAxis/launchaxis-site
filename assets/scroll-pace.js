// Wheel delta controls direction, never speed or a queue of future movement.
// Touch, keyboard, zoom gestures and nested reading panels remain native.
export class WheelPace {
 constructor(rate=.85,hold=300){this.rate=rate;this.hold=hold;this.stop();}
 pulse(delta,now){if(!delta)return;if(!this.active)this.previous=now;this.direction=Math.sign(delta);this.until=now+this.hold;this.active=true;}
 advance(now,unit){if(!this.active)return 0;const end=Math.min(now,this.until),dt=Math.max(0,end-this.previous);this.previous=now;const distance=this.direction*this.rate*unit*dt/1000;if(now>=this.until)this.active=false;return distance;}
 stop(){this.active=false;this.direction=0;this.previous=0;this.until=0;}
}

// Browsers round document scroll positions. Never require an exact match with
// the fractional end of a responsive timeline before returning native scroll.
export function canPaceAt(y,direction,{start,end}){
 return y>=start-1&&y<=end+1&&(direction>0?y<end-1:y>start+1);
}

export function installSteadyWheel(getRange){
 const root=document.documentElement,clock=new WheelPace();let frame=0,position=null;
 function stop(){clock.stop();cancelAnimationFrame(frame);frame=0;position=null;root.classList.remove('steady-scroll-active');}
 function nestedCanScroll(target,direction){
  for(let el=target instanceof Element?target:null;el&&el!==document.body&&el!==root;el=el.parentElement){
   if(!/auto|scroll/.test(getComputedStyle(el).overflowY)||el.scrollHeight<=el.clientHeight+1)continue;
   if(direction>0?el.scrollTop<el.scrollHeight-el.clientHeight-1:el.scrollTop>1)return true;
  }return false;
 }
 function draw(now){
  frame=0;const range=getRange();if(!range||document.hidden){stop();return;}
  const next=Math.min(range.end,Math.max(range.start,(position??scrollY)+clock.advance(now,range.unit)));position=next;
  window.scrollTo({top:next,behavior:'instant'});
  // The first RAF timestamp can precede the wheel event, producing zero delta.
  // Stay active when pointing INTO the range, even if still exactly at its edge.
  const room=clock.direction>0?next<range.end-1:next>range.start+1;
  if(clock.active&&room)frame=requestAnimationFrame(draw);else stop();
 }
 function wheel(event){
  if(event.ctrlKey||event.metaKey||event.shiftKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||!event.deltaY||!event.cancelable){stop();return;}
  const range=getRange(),direction=Math.sign(event.deltaY);
  if(!range||nestedCanScroll(event.target,direction)||!canPaceAt(scrollY,direction,range)){stop();return;}
  event.preventDefault();if(!clock.active)position=scrollY;clock.pulse(event.deltaY,performance.now());root.classList.add('steady-scroll-active');if(!frame)frame=requestAnimationFrame(draw);
 }
 addEventListener('wheel',wheel,{passive:false});
 addEventListener('pointerdown',stop,{passive:true});addEventListener('touchstart',stop,{passive:true});addEventListener('keydown',stop);
 document.addEventListener('visibilitychange',stop);
 return {stop,dispose(){stop();removeEventListener('wheel',wheel);removeEventListener('pointerdown',stop);removeEventListener('touchstart',stop);removeEventListener('keydown',stop);document.removeEventListener('visibilitychange',stop);}};
}
