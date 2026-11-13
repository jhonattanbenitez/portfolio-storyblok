# Jhonattan Benitez Portfolio

A bilingual portfolio and editorial site built with Next.js and Storyblok. It includes portfolio pages, posts, case studies, category listings, contact forms, localized metadata, and Storyblok Visual Editor support.

## Stack

- Next.js 16 App Router, React 19, and TypeScript
- Storyblok Content Delivery API and `@storyblok/react`
- Tailwind CSS
- Unified, Remark, and Rehype for server-rendered Markdown
- Node's test runner and ESLint

## Architecture

Application routes are under `src/app`. General Storyblok pages, posts, and case-study details are rendered by the optional catch-all route. Posts and category collections have explicit App Router pages. `lib/storyblok-data.ts` is the central server-side Storyblok data layer; it owns requests, retries, caching options, collection queries, and validated alternate resolution. UI translations remain in `translations/`.

Markdown is converted to HTML on the server. Client components are retained only where browser interaction, theme state, translations, or the Storyblok editing bridge require them.

## Locales and routing

The public locales are:

- English (`en`): unprefixed, for example `/posts/example`
- Colombian Spanish (`es-co`): `/es-co`, for example `/es-co/posts/ejemplo`

Legacy `/es/*` requests redirect permanently to `/es-co/*`. The URL is the authoritative application locale.

Storyblok's representation `language` parameter and a story's identity are different concepts. Posts, case studies, and categories are independent English and Spanish records with distinct UUIDs. Their relationship is represented by Storyblok `alternates` and a shared `group_id`; posts additionally have `content.language`. The application resolves those explicit relationships rather than expecting `language=es-co` to translate an English UUID.

## Caching and revalidation

Published Storyblok requests use Next.js data caching with a one-hour revalidation interval and CMS/story tags. Draft requests use `no-store`. The authenticated `/api/revalidate` endpoint invalidates a story tag or the shared CMS tag; configure Storyblok webhooks with the dedicated revalidation secret.

## Draft mode and Visual Editor

Ordinary development and production requests use published content. `/api/draft` enables Next.js Draft Mode only when its dedicated secret is supplied. `/live-preview/*` fetches draft content for Storyblok previews.

The Content Security Policy allows framing only by the site itself and `https://app.storyblok.com`. The development command serves HTTPS because Storyblok's Visual Editor requires a secure preview URL. Independent Spanish stories whose Storyblok `full_slug` is unprefixed should have a Real path matching `/es-co/<full_slug>` in Storyblok.

## Environment variables

```env
# Server-side Storyblok Delivery API tokens
STORYBLOK_TOKEN=
STORYBLOK_PREVIEW_TOKEN=

# Client SDK initialization for the Storyblok editing bridge
NEXT_PUBLIC_STORYBLOK_TOKEN=

# Use different random server-only values
STORYBLOK_DRAFT_SECRET=
STORYBLOK_REVALIDATION_SECRET=

# Approved canonical deployment URL; SITE_URL takes precedence on the server
SITE_URL=https://www.jhonattan.dev
# If retained in hosting, keep this fallback consistent too:
# NEXT_PUBLIC_SITE_URL=https://www.jhonattan.dev

# Contact forms
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
SMTP_USER=
SMTP_PASS=
```

Draft delivery requires the server-only `STORYBLOK_PREVIEW_TOKEN`. The public preview-token fallback has been removed. Revoke any preview token previously shipped in a client bundle, provision its replacement on the server, and remove `NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN` from deployment configuration. Never expose either dedicated authorization secret with a `NEXT_PUBLIC_` prefix.

An authorized editor first visits `/api/draft?secret=<server-secret>&slug=/live-preview/<story-path>`. The endpoint validates the internal path before issuing Next.js's HttpOnly Draft Mode cookie **and** an expiring HMAC-signed application session. It keeps only Storyblok bridge query parameters on the redirect. Both cookies are required for any draft content; iframe location and query parameters alone never authorize drafts. This also prevents Next.js's deliberately permissive development bypass cookie from granting anonymous access. Sessions expire after one hour and are invalidated by rotating `STORYBLOK_DRAFT_SECRET`; editors must restart older sessions. Keep the existing HTTPS preview origin and Storyblok Real paths. Cross-site cookies and the real Visual Editor must be checked in staging; access logs must redact the draft entry secret.

## Analytics consent

Analytics is disabled by default, including production. To enable it after configuration verification, set the **server-only** `ANALYTICS_ENABLED=true` in the production environment. Keep it unset in preview deployments. The existing GA4 measurement ID is unchanged.

Before enabling, turn off **Page changes based on browser history events** in the GA4 stream's Enhanced Measurement settings. The application sends one manual pageview per pathname and initializes with `send_page_view: false`; GA4's remote history listener can otherwise duplicate those events. No GA4 account settings are changed by this repository. See [Google's manual pageview guidance](https://developers.google.com/analytics/devguides/collection/ga4/views).

The banner and Cookie preferences control acceptance, rejection, and revocation. Legacy banner/localStorage choices are deliberately not considered valid analytics consent: visitors are asked again. The authoritative choice is stored under `analytics-consent-v1`; an `analytics-opt-out` cookie makes denial take precedence when localStorage writes fail. The banner library's own cookie does not authorize measurement. Grants fail closed when storage is unavailable. Revocation disables measurement immediately, removes GA cookies available to this host/path, and reloads an active analytics document to unload third-party listeners. Changes synchronize between tabs. If all persistence mechanisms are blocked, a denial still applies to the current tab and the UI explains that saving failed.

No analytics script is loaded before acceptance, during development, for authenticated drafts, editor query parameters, or embedded pages. Page locations omit query parameters and fragments; advertising consent and personalization remain disabled. The integration tests stub all Google and editor traffic and never send production measurements.

## First security release

The route/HTTP baseline, HTML inventory, implementation details, limitations, and predeployment verification are documented in [docs/release-1.md](docs/release-1.md).

Published HTML can be inventoried without logging content or identifiers:

```bash
npm run inventory:content
```

After a production build, run HTTP and Chromium integration checks:

```bash
SITE_URL=https://www.jhonattan.dev npm run build
node scripts/release-validation-manifest.mjs --record
# Use an installed Chromium/Chrome binary; no browser download is performed.
BROWSER_EXECUTABLE=/path/to/chromium npm run test:integration
```

The integration runner starts isolated local production and development processes with synthetic upstream data and credentials, closes them when finished, and does not submit contact forms. It needs permission to bind localhost ports and launch a browser. Browser assertions cover consent persistence, revocation, script deduplication, route continuity, anonymous/forged-cookie denial, and authorized editor updates without public draft leakage.

## Development and verification

Install dependencies and start the HTTPS development server:

```bash
npm install
npm run dev
```

The standard verification commands are:

```bash
npm test
npx tsc --noEmit
npx eslint .
npm run build
git diff --check
```

## Deployment assumptions

The deployment must support the Next.js App Router, server-side environment variables, server rendering, Draft Mode cookies, and tag revalidation. Production is expected to use HTTPS and a canonical `SITE_URL`. Storyblok assets and API access use the configured US-region hosts, while Visual Editor preview paths must match the public locale routing described above.

## SEO and editorial routing

See [docs/seo-i18n.md](docs/seo-i18n.md) for canonical environment precedence, preserved public URLs, wrong-locale redirects, category navigation, Markdown metadata, collection ordering/pagination and deployment verification. This does not change Storyblok content or hosting configuration.

## Security remediation and release validation

The release keeps Storyblok drafts server-authorized, sanitizes Markdown and JSON-LD, preserves English/Spanish routing, and defaults Analytics to disabled. Node.js24.x and the committed package-lock identify the runtime/dependency contract.

See [the production release report](docs/production-release-20261112.md) for critical controls, validation scope and separate development-tooling/CSP residuals. Private backups, operational logs, environment files and deployment evidence are kept outside the versioned release.

Automated callers of `/api/draft` and `/api/revalidate` can supply their dedicated secret through `Authorization: Bearer <server-secret>`. Query-based editor links remain compatible; an invalid Authorization header never falls back to query credentials. Hosting logs must redact both forms. No contact submission or real email is part of release smoke tests.

After a production build, the local validation manifest checks source/artifact correspondence. It is not a signed supply-chain attestation or a substitute for testing the deployed revision.
