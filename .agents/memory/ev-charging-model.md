---
name: EV charging model limits
description: Product boundary for EV charging analysis and any future hardware integration.
---

Keep EV charging outputs as analysis-only schedule screening. The model compares measured sessions with a deadline-ordered, tariff/solar-aware greedy schedule; it is not an optimiser and must not issue charger commands.

**Why:** Site intervals and session records do not establish charger compatibility, live state, customer consent, grid limits, or safe control authority. Overstating the schedule as dispatch would be unsafe and technically unsupported.

**How to apply:** Preserve clear measured-versus-screened labels and source notes. Add hardware integrations or automated control only after the provider, data permissions, equipment constraints, and safety controls are verified. Do not claim delivered savings from a screening result.
