---
name: WebGL verification limitation
description: Limits of automated visual verification for the energy orb.
---

Do not treat a passing build or a fallback screenshot as evidence that the orb's GPU animation looks correct.

**Why:** The browser tester could not create WebGL or WebGL2 contexts, including a fresh context with software-rendering flags. The fallback worked, but live phase transitions, brain recognizability and pointer effects were not visually verified.

**How to apply:** Check WebGL availability first. If it remains unavailable, report that limitation and require evidence from a WebGL-capable browser before claiming the animation is verified.

Keep the Energy Orb, Spiral Galaxy and Neural Brain visualization on the homepage, with meaningful, explicitly static previews when WebGL is unavailable.

**Why:** The user specifically reiterated that these illustrations should be on the homepage; an unavailable-graphics message with only an indistinct glow did not communicate the requested concepts.

**How to apply:** Preserve the GPU animation for supported browsers without leaving unsupported browsers with an empty visual. Do not describe static preview controls as live AI or as proof of the 3D animation.
