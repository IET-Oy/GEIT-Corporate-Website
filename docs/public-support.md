# GEIT public support, FAQ and leadership content

The corporate site's floating support widget runs in **FAQ mode**, in English.
It uses the same facts and links as the searchable homepage section at
`/#saas-faq`. It is not connected to an AI API and cannot inspect accounts,
submit enquiries, open tickets or retrieve private customer records.

Questions and answers stay in React memory. Nothing is sent to a provider,
logged or persisted in browser storage. Starting a new conversation clears the
current messages; reloading the site also clears them. Unknown or account-specific
questions direct visitors to the approved contact details. The consultation form
remains validation-only and cannot deliver enquiries.

## Updating supported answers

Edit `artifacts/geit-website/src/data/saas-faq.ts`. Keep answers consistent with
verified module functionality and mark limitations explicitly. Do not describe
saved-analysis alerts as continuous monitoring or claim notification delivery.
The report hub, live measurement ingestion and advanced optimisation are not
operational features. FAQ text is explicitly marked English; the existing
language selector and corporate translation workflow are unchanged.

The optional `SupportAnswerProvider` interface is an integration boundary only.
`configuredProvider` remains null. A future implementation must call an approved,
server-side public-support endpoint, never put credentials in browser code and
never reuse the private scenario AI endpoint for anonymous website visitors.
Before enabling a provider, add request/response validation, rate limits,
provider-failure disclosure, privacy/consent review and grounded-answer tests.
The current fallback returns FAQ answers, never simulated AI output.

## Founder profiles

The founder configuration remains in `src/config/founders.ts`; photographs are
optimised WebP files under `public/images/founders/`. Actual supplied portraits
are used, not generated substitutes. Unknown personal telephone numbers remain
unset. Biographies contain only the confirmed founding year and role, with
draft translations subject to the existing human-review notices.

Noel's supplied photograph is low resolution; its display cannot recover detail
not present in the original. Replace that source with a higher-resolution
approved portrait when available. The optimisation strips image metadata.

## Verification

```sh
pnpm --filter @workspace/geit-website run test:platform
pnpm --filter @workspace/geit-website run check:localization
pnpm --filter @workspace/geit-website run typecheck
PORT=18414 BASE_PATH=/ pnpm --filter @workspace/geit-website run build
```

The selected tests cover FAQ matching/search, unsupported questions, human
escalation, failed adapter fallback, valid route targets, rendered accordion
states, founder identity/role/portrait associations and all-language founder
rendering. Source contracts check keyboard handlers and reduced-motion CSS;
they are not a real-browser keyboard or screen-reader conformance test.
