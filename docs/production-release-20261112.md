# Production release — security, SEO and internationalization

Date: 12 November2026, America/Bogota. Branch: `release/security-seo-i18n-20261112`.

## Candidate

This release versions the previously validated source: local BUILD_ID `34l7Jw5fcMye0pWalrTu5`, source fingerprint `d32e7a5355486c91190f9cc7f6fb8eb0c8c533eb1bcf61d41d0afb8691bdc29e`. All118 source/configuration/test files are byte-identical to that candidate. Node24.x and Next16.4.6 are fixed by package metadata and lock.

Earlier local verification:109 unit tests,15 integration groups, TypeScript/build successful and ESLint0errors/3existingwarnings. These results are not new remote Production tests. The corrected protected Preview is READY and the owner reported basic authenticated loading; detailed Preview QA was not fully observed by the agent.

## Critical release gate

Production publication remains conditional on all ten controls: Node24, fresh runtime audit with zero reported vulnerabilities, no private secrets in versioned files/known bundles, WWW canonical, published-only delivery access, server-authorized drafts/fail-closed behavior, private sensitive responses, disabled Analytics, contact configuration preserved, and no critical build/routing/security blocker. Final gate and remote deployment results are recorded separately after independent review; no success is implied by preparing this branch.

## Residual development risk — pending formal acceptance

The unchanged minimatch10.2.6 development chain is covered by GHSA-g3hv-75wg-m249; the last full audit reported8moderate affected packages from the same propagated advisory. The production audit is separate. No major override, downgrade or fabricated green audit was applied. Formal acceptance remains pending.

Proposed owner/approver: project owner. Review:19November2026. Expiry:26November2026,23:59America/Bogota, without automatic renewal. Controls observed: dev/runtime separation, effective parser options without optimization level2, retained lock, no affected package in observed server traces. CI isolation/timeouts and least-privilege untrusted jobs must not be asserted without evidence. Reevaluate on a compatible patch, lock/consumer change, optimization level2 or new runtime exposure.

## Separate CSP residual

Production configuration removes unsafe-eval but retains unsafe-inline. This is not a strict CSP and is not declared fully corrected. Review of inline script removal is separate from minimatch risk acceptance, proposed for19November2026.

## Recovery

Never restore the old Production deployment that contains Next16.1.6. The corrected Preview is not an eligible historical Production InstantRollback target. Recovery is forward-only from this preserved secure branch/lock: diagnose, apply the minimal correction without downgrading Next, rebuild and validate the new candidate, then use the existing Git/Vercel flow. No rollback/promote is implicit in preparing this report.

## Scope

No Storyblok content/models, DNS, client records or contact credentials are changed. Analytics remains absent/false; no real forms, mail or GA4 traffic are used by automated release validation. Private environment values, credentials, backups, raw logs and operational evidence are excluded from commits.
