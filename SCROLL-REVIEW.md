# LaunchAxis scroll scenes — review version

Prepared 2026-10-29. This branch is not deployed to launchaxis.net.

## What is implemented

- Tide: scattered lines assemble into the actual Venus mesh; the camera moves around the boat; the supplied wood and normal textures appear; the view crossfades into the existing rendered Tide video.
- Axis: the original joint animation is driven by native page scrolling, with a keyboard-operable position slider and a Follow scroll control. This is artist-authored animation, not an AI training result. FabriCreator's arm-design credit remains visible.
- Progressive enhancement: original project text and videos work without the new module. WebGL-unavailable devices get a Canvas 2D wireframe projection of the same geometry. Motion-off, reduced-motion and data-saving preferences avoid the scroll sequence. No wheel interception or scroll locking.
- The engine is loaded when the project area approaches the viewport. The two optimized models total 2,754,928 bytes (about 2.75 MB decimal). The runtime is self-hosted; no third-party CDN is needed.

## Source assets

Tide uses an evaluated copy of the active Venus boat and camera at frame 30 from the supplied watah.blend, with the supplied albedo and normal maps embedded in tide.glb. The ocean remains in the existing rendered video; it is not a live water simulation.

Axis uses the supplied RoboticArm.blend to retain its white/graphite materials and joint animation, cross-checked against the supplied RoboticArm.glb. Studio planes are omitted. Geometry is simplified and meshopt-compressed for the web. The 27 animation clips retain the original approximately 4.17-second movement.

The uploaded Blender projects, FBX, full-resolution textures, and original GLB have not been modified or included in this branch. Only web derivatives are included.

## Verification status

Passed: both compressed models parse using the same Three.js GLTFLoader and MeshoptDecoder as the website; both produce finite bounds; Tide has one camera and two embedded textures; all Axis clips load and reverse scrubbing returns to the starting transform; static HTML IDs, links, source paths, controls, credit and reduced-motion checks pass.

The preview browser had WebGL disabled. The existing video fallback was observed working. The preview service subsequently timed out, including on recovery, so the new Canvas fallback and complete WebGL sequence have **not** been visually verified in-browser. Offline geometry projections are in review/ and are not browser screenshots.

Before merging, check:

1. Desktop and mobile: scroll through all three Tide stages, then back up. Check the source-camera-to-video framing and adjust the final camera/pose or video start frame if the handover jumps. Exact seamless alignment is not yet confirmed.
2. WebGL rendering: texture orientation, lighting, camera framing, model size and all Axis poses.
3. Canvas fallback: disable WebGL in a test browser and verify both wireframe views.
4. Controls: keyboard stage buttons, Skip to film, Axis slider and Follow scroll. Ensure hidden controls do not receive focus.
5. Pause motion, OS reduced motion, data saver, WebGL context loss, slow model loading, project filters, and returning to the page after switching tabs.
6. Mobile performance and layout stability. The desktop asset checks do not establish phone frame rate.

## Build and test

The built assets are committed. GitHub Pages does not need to run npm.

For development, run `npm ci`, then `npm run build` and `npm run check:assets`. The latter produces local .qa/ geometry checks; it does not launch a browser or replace browser testing. Serve the repository root through an ordinary local static server; opening index.html via file:// does not support the module/model requests.

Merge only after the visual checks pass. Existing CNAME, sitemap, robots, metadata, contacts, and original media remain unchanged.
