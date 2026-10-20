# Homepage light-field performance

## Scope and limits

This is a **CPU-throttled desktop Chromium / real Canvas2D** comparison, not a
measurement on physical phones. It supplies repeatable rendering and task-time
evidence; it does **not** establish battery drain, watts, temperature, or Safari
performance. No physical phones or power instrumentation were available in the
workspace. Physical-device energy profiling remains outstanding.

The benchmark isolates the actual component effect on a viewport-sized canvas,
including its real observers, sprites, rendering, and cleanup. Tiny hook adapters
provide DOM refs; this is not a React scheduling or full-homepage benchmark. The
approved homepage foreground/header is unchanged. The production build, homepage
screenshots and platform tests separately check integration.

### Reproduction

From the workspace root, with the existing system `chromium` executable:

```sh
mkdir -p generated-artifacts
node artifacts/geit-website/scripts/profile-hero-light-field.mjs \
  artifacts/geit-website/src/components/hero-light-field.tsx \
  generated-artifacts/hero-profile.json
```

The optional first argument also accepts an earlier revision saved as a `.tsx`
file for before/after comparisons. `CHROMIUM_PATH` can select a different Chromium
binary; `HERO_PROFILE_SECONDS` defaults to 30 and should remain at least 26 to
include every phase and transition. Generated data stays outside Git.

Two deliberately constrained profiles:

- 360 × 800 CSS pixels, device density 2, 6× CPU slowdown.
- 390 × 844 CSS pixels, device density 3, 4× CPU slowdown.

These are synthetic workload profiles, **not** claims to simulate named handset
models. The mobile viewport meta tag is essential: without it Chromium uses a
980-pixel layout viewport, invalidating the mobile particle/density comparison.
The browser uses software compositing in this environment; raster costs and CPU
throttling do not reproduce a phone's GPU or thermal governor.

Each profile has a 2-second animation-unmounted idle control, a 30-second full
cycle, and a 2-second post-unmount control. Draw duration measures the synchronous
Canvas2D command submission, not deferred raster/compositor work. Long tasks
(`PerformanceObserver`, >50 ms) and actual draw-to-draw intervals expose that
missing cost. CDP `TaskDuration` per elapsed second is **main-thread task
occupancy**, a work/energy-risk proxy, not measured CPU power. It includes
browser rendering tasks and instrumentation. Do not translate it into watts,
battery percentages or claimed battery savings.

## Measured results

Chromium 152.0.7977.64 on the workspace's Linux host; one matched 30-second
before/after pass per profile, in addition to exploratory runs. Shared-host
variability means these are engineering observations, not statistically stable
device benchmarks.

### 360 × 800, density 2, 6× slowdown

| Metric | Before | After |
|---|---:|---:|
| Achieved draws/second | 15.32 | 29.53 |
| Draw submission p50 / p95 (ms) | 8.7 / 14.9 | 5.3 / 10.4 |
| Draw submissions >33.3 / >50 ms | 1 / 1 | 2 / 0 |
| Draw-to-draw interval p95 (ms) | 79.1 | 39.0 |
| Intervals >50 ms | 449 | 6 |
| Main-thread long tasks / total duration (ms) | 447 / 28,877 | 7 / 525 |
| Main-thread task occupancy (ms/second) | 994.9 | 723.5 |
| Unmounted idle / post-cleanup occupancy (ms/second) | 2.7 / 4.7 | 3.8 / 1.3 |
| First → last particle count | 900 → 900 | 900 → 576 |
| Canvas backing pixels | 1,152,000 | 648,000 |
| Synchronous draw submission time (ms/second) | 145.9 | 174.2 |

Slow intervals fall by about 98.7% and task occupancy by about 27.3% in this
profile. Importantly, **submission work per second rises** because the improved
renderer delivers nearly twice as many frames: this is not evidence of less
JavaScript work in every metric. The lower overall occupancy exposes savings in
downstream rendering. It still spends substantial time rendering on this
software path; do not call that a solved phone battery budget.

### 390 × 844, density 3, 4× slowdown

| Metric | Before | After |
|---|---:|---:|
| Achieved draws/second | 22.50 | 29.79 |
| Draw submission p50 / p95 (ms) | 4.7 / 7.4 | 4.5 / 7.4 |
| Draw submissions >33.3 / >50 ms | 0 / 0 | 1 / 0 |
| Draw-to-draw interval p95 (ms) | 53.1 | 37.0 |
| Intervals >50 ms | 64 | 5 |
| Main-thread long tasks / total duration (ms) | 53 / 2,989 | 2 / 146 |
| Main-thread task occupancy (ms/second) | 995.4 | 618.1 |
| Unmounted idle / post-cleanup occupancy (ms/second) | 4.1 / 1.9 | 4.6 / 1.9 |
| First → last particle count | 900 → 900 | 900 → 900 |
| Canvas backing pixels | 1,316,640 | 740,610 |
| Synchronous draw submission time (ms/second) | 113.2 | 144.7 |

Slow intervals fall by about 92.2% and task occupancy by about 37.9%. This
profile retains the full mobile particle budget. The post-cleanup control is
near the idle control for both profiles, consistent with releasing the loop.
The synthetic high-refresh checks separately establish the 30 fps ceiling;
neither throttled baseline could reach the host's 60 Hz refresh rate.

## Runtime policy

- Cap animated drawing at 30 fps on all displays, including 90/120 Hz displays.
  Animation phase time follows elapsed active time, not frame count. Do not
  perform catch-up draw bursts after missed deadlines or a visibility pause.
- Keep up to 900 particles on narrow containers and 1900 on larger containers.
  Review 30-rendered-frame windows: reduce by 20% when average draw submission
  exceeds 8 ms or at least six intervals exceed 50 ms. Floors of 450/700 retain
  a recognizable decorative shape. Recover only 90 particles after five healthy
  windows (<4 ms average, no late intervals); never exceed the responsive cap.
- Cap mobile density at 1.5, larger-container density at 2. This reduces mobile
  backing-buffer pixels by 43.75% versus the old density-2 cap. Observe container
  resizing and viewport/density changes without regenerating particle targets.
- Cache the broad halo as a CSS radial background at its midpoint intensity.
  Previously its full-canvas gradient was rebuilt every frame. Particle
  breathing, twinkling, neural pulses, morphing, mint/violet colors and pointer
  lens remain animated; only the diffuse halo's minor intensity modulation is
  removed.
- Hidden tabs and <2% intersections stop the loop. Hidden/offscreen resize can
  update dimensions but does not render. Reduced motion draws one static brain,
  reacts to preference changes, and does not respond to pointer animation.
- Unmount cancels animation/touch timers and disconnects observers and listeners.

## Regression evidence

`pnpm --filter @workspace/geit-website run test:platform` passes, including:

- Smooth normalized orb → galaxy → brain weights over repeated 26-second cycles.
- Orb shell, flat spiral disc, brain side profile/stem at minimum mobile density.
- 30 fps at simulated 60/90/120 Hz; adaptive decrease, delayed recovery and caps.
- Hidden tab/offscreen/tiny-intersection pauses and no duplicated resume loops.
- Resize/density-only changes, no redundant redraws and no hidden resize draws.
- Live reduced-motion changes, real projected touch response versus an identical
  untouched control, touch-timer replacement, and active-loop unmount cleanup.

Type checking and the production build pass with managed-service build variables:

```sh
pnpm --filter @workspace/geit-website run typecheck
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build
```

The existing large-chunk/sourcemap warnings remain. Sitemap generation correctly
skips without a confirmed public site URL; no production URL was invented.
App screenshots show all three desktop shapes and the narrow-screen galaxy with
the existing header, selector, headline, actions and description box intact.

## Physical-device acceptance still needed

Use at least one entry-level Android phone and one older iPhone, record exact
models/OS/browser/refresh rate, and profile the full homepage (not only this
fixture). Compare the same old/new revisions with fixed brightness, radio state,
temperature and power mode. Run repeated multi-minute cycles with interaction,
offscreen/hidden controls and reduced motion. Record long-frame distributions,
average power or energy from suitable platform/power instrumentation, and thermal
throttling. Visually check all three phases at the adaptive floor. CPU throttle
multipliers alone cannot fulfill this acceptance.
