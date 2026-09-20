# Darth Algo cinematic chart journey

## Research and design choice

The previous scene tilted screenshots and swapped chapters, but did not create a continuous camera journey. The owner asked for a substantial upgrade, informed by research.

Sources reviewed September 20, 2026:

- [Jesko Jets](https://jeskojets.com/): visually inspected its oversized product framing, restrained typography, and spatial window metaphor. The lesson is to give the product a world, with intentional transitions. No assets were copied.
- [LuxAlgo](https://www.luxalgo.com/): product explanations and purchase paths stay central to the presentation. We apply that to Darth Algo's actual capabilities rather than unrelated spectacle.
- [GSAP ScrollTrigger documentation](https://gsap.com/docs/v3/Plugins/ScrollTrigger/): continuous scrubbing, distinct timeline beats, native scrolling, responsive refresh and cleanup. These principles informed our small native scroll controller; GSAP itself is not added.
- [Three.js documentation](https://threejs.org/docs/): perspective cameras, mesh geometry, curves and physically lit materials provide actual scene depth.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): limit rendering resolution, release resources, and account for context loss.

## Experience

A five-chapter journey: enter the chart → trend context → signal markers → risk planning → actual Darth Algo product imagery and a trial/plan destination.

A real WebGL scene contains deterministic illustrative candlesticks, a trend curve/cloud, signal markers, risk levels and translucent technical planes. Camera movement continuously follows scroll with easing. Layers separate in depth, then assemble into a complete view. The final reveal uses the owner's actual product screenshot. Illustrative geometry is labeled and is never presented as a live signal or a verified performance result.

Chapter buttons work in both directions. A skip-to-tools link and final trial/plan links keep the purchase journey accessible. Product pages reuse the same implementation with their own colors, workflow copy and screenshots.

## Performance and accessibility

- Three.js is dynamically imported only when the tour approaches the viewport.
- Rendering settles when input stops, pauses outside the viewport and when the tab is hidden.
- Drawing resolution is capped at 1.8 million pixels and a device ratio of 1.5 on narrow screens.
- Geometries, materials, canvas and observers are disposed on cleanup.
- GPU-unavailable browsers use Three.js SVGRenderer to project the same real geometry and camera path as vector shapes. Reduced-motion mode and total renderer failure show actual product images with manual chapter controls.
- The browser scroll remains native; no wheel/touch event cancellation.
- Phone camera distance fits the scene to viewport width. Short and landscape viewport layouts have dedicated styles.

## Verification

`node tests/chart-journey.test.mjs` checks chapter navigation round-trips, scroll bounds, camera continuity and narrow-screen framing. Production build checks types, lint and generated pages. Live visual and interaction verification follows deployment; this is not a physical iPhone performance benchmark.

## Animated indicator walkthrough
The tour plays a 12-second simulated setup once when visitors reach Signals. Sixteen new candles form after the existing history, markers appear only after their illustrative candle closes, then the risk levels reveal. Replay setup starts another pass; Stop demo, Motion off, reduced motion and hidden/offscreen states stop or suspend animation. The final scene uses the existing actual indicator screenshot. This is explicitly labeled a simulation: the website is not running Pine Script or showing live signals. A real TradingView screen recording can later replace the illustrative timing without inventing indicator output.
