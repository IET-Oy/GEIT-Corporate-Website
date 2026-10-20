---
name: WebGL verification limitation
description: Visual verification limits and decorative hero constraints.
---

Do not treat a passing build or a fallback screenshot as evidence that the orb's GPU animation looks correct.

**Why:** The browser tester could not create WebGL or WebGL2 contexts, including a fresh context with software-rendering flags. The fallback worked, but live phase transitions, brain recognizability and pointer effects were not visually verified.

**How to apply:** If reintroducing GPU rendering, check WebGL availability first. If it remains unavailable, report that limitation and require evidence from a WebGL-capable browser before claiming the animation is verified. The replacement background deliberately uses Canvas2D so its actual shapes can be captured without WebGL.

Keep homepage background artwork purely decorative, outside the accessibility tree and tab order. The owner clarified that the animation stays and the supplied photograph is separate homepage content.

**Why:** The user explicitly requested an immersive hero background and prohibited visible labels, captions, element names or explanatory text. This overrides the earlier labelled preview presentation.

**How to apply:** Preserve foreground contrast and avoid additional labels, controls or status messages on the animated background. Give the separate content photograph meaningful alternative text.

Do not equate Canvas2D draw-submission time with the complete rendering or energy cost.

**Why:** CPU-throttled, software-rendered Chromium showed much larger downstream raster/main-thread costs than the timed drawing calls alone. Mobile viewport emulation is also not a physical phone and cannot establish watts, battery drain or thermal behavior.

**How to apply:** Report draw duration alongside long tasks, frame intervals and whole-renderer CPU activity. Label emulated measurements and CPU-work energy proxies explicitly; require physical-device power evidence before claiming phone battery savings. Preserve the three shapes and interaction when lowering quality.
