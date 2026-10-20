# GEIT translation review

French (`fr.json`), Kinyarwanda (`rw.json`) and Kiswahili (`sw.json`) are **generated drafts awaiting human review**, as requested by the owner. They are not professionally reviewed or approved translations.

## Review checklist

- Have a fluent human reviewer check each complete catalog against its English keys, including technical terminology and every paragraph of the privacy and terms pages.
- Review the existing navigation, form labels, hints, validation messages and review notice in `../i18n.ts` too.
- Preserve company identity, founder names, equal 50% ownership, registration/TIN **157099400**, Rwanda context, and all limits on claims.
- Preserve statements that there is no guaranteed saving, return, emissions outcome, accreditation or certification.
- Preserve the form's validation-only status: it does **not** send, store or deliver enquiries. Never make its button, consent, feedback or privacy policy imply otherwise.
- Keep `{service}`, `{name}` and other interpolation tokens intact.
- Check mobile layouts and read the full service methodologies, not just headings.
- Only after a full locale has been approved, record the human review in `../page-copy.ts` and change that locale's review status. Until then the site must retain its localized draft notice and the “Read in English” button.
- Public FAQ/support uses separate typed catalogs: `faq-fr.ts`, `faq-rw.ts`, `faq-sw.ts` and `support.ts`. The project owner confirmed human review approval for these three support translations; `supportReview` records that confirmation without inventing a reviewer identity. This does not approve the broader website catalogs. Review future changes to questions, answers, status notes, UI text, keywords, fallback/contact replies and link labels against `../../data/saas-faq.ts` and the English `support.ts` copy; see `docs/public-support.md` for the feature-limit checklist.

## Maintaining copy

`source.json` lists the English source entries for review and completeness checks. JSON keys are the source wording, not translated slugs. Keep routes and the English-valued form service options unchanged.

The language context exposes `t(key)` for existing UI messages and `c(englishSource, values?)` for page copy. Translate a string **once**, at its final text boundary. Shared `Eyebrow`, `ButtonLink`, `ArrowLink`, `Breadcrumb`, `PageHero` and `PageMetadata` helpers expect **English source** inputs; do not pass already translated strings to them.

When adding source copy, add it to `source.json` and all three catalogs. Missing translations are explicitly displayed as English with a missing-translation marker, rather than silently appearing to be localized.

Run from the workspace root:

```sh
pnpm --filter @workspace/geit-website check:localization
pnpm --filter @workspace/geit-website typecheck
```

The localization check renders all 22 routes in all four languages and checks catalog completeness, interpolation, key company facts, form options and no-send/no-storage disclosures. It does not replace fluent human language review or browser layout checks.

Language selection remains a browser preference, shared across navigation and reloads. This change does not add language-specific URLs, server rendering, third-party translation services or storage of form entries.
