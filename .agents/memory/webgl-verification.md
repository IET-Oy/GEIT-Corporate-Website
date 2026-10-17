---
name: WebGL verification limitation
description: Limits of automated visual verification for the energy orb.
---

Do not treat a passing build or a fallback screenshot as evidence that the orb's GPU animation looks correct.

**Why:** The browser tester could not create WebGL or WebGL2 contexts, including a fresh context with software-rendering flags. The fallback worked, but live phase transitions, brain recognizability and pointer effects were not visually verified.

**How to apply:** Check WebGL availability first. If it remains unavailable, report that limitation and require evidence from a WebGL-capable browser before claiming the animation is verified.

Keep the Energy Orb, Spiral Galaxy and Neural Brain visualization purely decorative in the homepage hero background, with a meaningful text-free SVG fallback when WebGL is unavailable.

**Why:** The user explicitly requested an immersive hero background and prohibited visible labels, captions, element names or explanatory text. This overrides the earlier labelled preview presentation.

**How to apply:** Preserve the GPU animation for supported browsers; use decorative SVG artwork for unsupported browsers. Keep the background out of the accessibility tree and tab order, with no visible controls or status messages. Maintain foreground contrast and reduced-motion support.
