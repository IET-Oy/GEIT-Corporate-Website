---
name: Engineering result provenance
description: Why saved engineering results require server authenticity checks in addition to tenant isolation and input hashes.
---

Keep saved engineering results authenticated as server-produced snapshots, not merely tenant-owned JSON with a matching input checksum.

**Why:** Supabase users can call exposed authenticated RPCs directly, bypassing Express calculation code. Tenant membership establishes access, not that submitted output was calculated by GEIT's engine. An input hash alone cannot prevent a user from supplying invented outputs alongside genuine inputs.

**How to apply:** Preserve server authenticity verification before displaying or exporting a scenario. Bind the tenant, module, project, inputs, result and project context together. Keep historical verification possible when changing signing keys or calculation versions; never silently recalculate older scenarios or accept unsigned results as verified.

Optional AI selects relevant verified evidence rather than supplying new numerical conclusions.

**Why:** A valid citation does not prove that a generated sentence's numbers or calculations are correct. Keeping numerical and factual rendering under the calculation service avoids promoting fabricated model output to an engineering result.

**How to apply:** Authorise and verify the saved scenario before sending bounded evidence to a provider. Validate its evidence selection against that scenario, keep calculations provider-independent, and require explicit consent before sending customer evidence.

Sign the persisted JSON representation, not pre-serialization application objects.

**Why:** Generated validators can produce Date objects, while PostgREST stores ISO strings. A canonical object walker can treat a Date as an empty object, making a genuinely calculated result fail verification after persistence.

**How to apply:** Normalise the complete signing payload to its stored JSON representation before computing the signature. Do not retrospectively sign unsigned historical outputs whose server origin cannot be established.
