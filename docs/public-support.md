# GEIT public support, FAQ and leadership content

The corporate site's floating support widget runs in **FAQ mode**, using the
existing shared English, French, Kinyarwanda or Swahili language selection.
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
operational features. The English factual source owns statuses, route targets
and escalation flags. Draft FAQ translations live in
`src/lib/translations/faq-{fr,rw,sw}.ts`; UI text, link labels and review metadata
live in `src/lib/translations/support.ts`. Search handles Unicode letters,
accents and apostrophes, and includes localized keywords. The selector itself,
its location and preference persistence are unchanged.

Changing language clears the FAQ search and starts a new in-memory chat while
preserving whether the panel is open. Pending replies from the old conversation
are ignored. Both translated support surfaces retain an English-source button.
The project owner explicitly confirmed human review approval for French,
Kinyarwanda and Swahili FAQ/support copy. This confirmation is recorded in
`supportReview`; no reviewer identity was provided or invented. The broader
website translation catalogs remain awaiting human review, with their global
draft notices unchanged.

## Language review maintenance

A fluent reviewer for each language should compare future changes to all twelve questions, answers,
status notes and links, plus every UI string and keyword, against the English
source. Pay special attention to manual-only import (5,000 rows / 2 MiB),
35 consecutive complete days for forecasts, save-time-only alerts without
delivery, baseline-only solar/battery scenarios, the unavailable report hub,
no security certification, internal testing, and no enquiry sending or storage.
Review fallback and human-contact replies as well as suggested questions.
Record the reviewed language, reviewer confirmation and any corrections before
changing review status. Approval of support copy alone must not approve the rest
of that language's website catalog or remove its global draft notice.

Generate a self-contained, side-by-side review packet from the current catalogs:
`node artifacts/geit-website/scripts/export-support-review.mjs`.
The HTML output is in `generated-artifacts/` and is intentionally excluded from
Git and deployment.

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
rendering.

`tests/public-support.interactions.test.mjs` also mounts the actual language
provider, selector, FAQ and widget in JSDOM with React Testing Library and
user-event. It covers all four languages and all 12 directed language switches:
cleared searches, expanded panels, conversation messages and drafts; localized
suggestions, related questions, answer statuses and links; FAQ-to-widget opening;
unknown/account-specific escalation; reset and duplicate in-flight requests;
Enter/Space opening, Tab/Shift+Tab wrapping, Escape and focus restoration; and
English-source buttons sharing the persisted selector preference. Provider
remounts verify that only the language preference survives, not conversations.
The helper in `tests/helpers/support-runtime.mjs` controls answer timing through
a test-only Vite module, resolving the real localized FAQ answers after a switch
or reset. It does not configure a provider or alter production components.

These are DOM interaction regressions, not real-browser layout, mobile virtual
keyboard or screen-reader conformance tests. Source contracts also check the
protected header selector slot and reduced-motion CSS.
