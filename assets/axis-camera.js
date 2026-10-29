import {OrbitControls} from 'three/addons/controls/OrbitControls.js';

// Camera input is independent of the model's scroll-driven animation clock.
// In particular, wheel events must keep scrolling the document, not zoom it.
export function createAxisCameraControls(camera, host, resetButton, invalidate) {
 const controls = new OrbitControls(camera, host);
 controls.target.set(0, .05, 0);
 controls.cursor.copy(controls.target);
 controls.maxTargetRadius = 1.25;
 controls.enableZoom = false;
 controls.enableDamping = false;
 controls.autoRotate = false;
 controls.rotateSpeed = .7;
 controls.panSpeed = .65;
 controls.keyRotateSpeed = 6;
 controls.minPolarAngle = .18;
 controls.maxPolarAngle = Math.PI * .48;
 // Horizontal touch drags orbit; vertical swipes and pinch gestures remain
 // native browser navigation. Mouse dragging can orbit in both directions.
 host.style.touchAction = 'pan-y pinch-zoom';
 controls.update();
 controls.saveState();
 controls.listenToKeyEvents(host);

 const change = () => invalidate();
 const start = () => host.classList.add('is-orbiting');
 const end = () => host.classList.remove('is-orbiting');
 const focus = event => { if (event.pointerType !== 'touch') host.focus({preventScroll:true}); };
 const reset = () => { controls.reset(); invalidate(); };
 const key = event => {
  if (event.key.toLowerCase() === 'r' && !event.ctrlKey && !event.metaKey && !event.altKey) {
   event.preventDefault(); reset();
  }
 };
 controls.addEventListener('change', change);
 controls.addEventListener('start', start);
 controls.addEventListener('end', end);
 host.addEventListener('pointerdown', focus);
 host.addEventListener('keydown', key);
 resetButton.addEventListener('click', reset);

 return {
  controls,
  dispose() {
   controls.removeEventListener('change', change);
   controls.removeEventListener('start', start);
   controls.removeEventListener('end', end);
   host.removeEventListener('pointerdown', focus);
   host.removeEventListener('keydown', key);
   resetButton.removeEventListener('click', reset);
   host.classList.remove('is-orbiting');
   controls.dispose();
  }
 };
}
