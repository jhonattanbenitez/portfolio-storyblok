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

# Canonical deployment URL; SITE_URL is preferred on the server
SITE_URL=https://example.com
# NEXT_PUBLIC_SITE_URL=https://example.com

# Contact forms
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=
RECAPTCHA_SECRET_KEY=
SMTP_USER=
SMTP_PASS=
```

`NEXT_PUBLIC_STORYBLOK_PREVIEW_TOKEN` remains a compatibility fallback in the SDK/data layer, but deployments should use the server-only `STORYBLOK_PREVIEW_TOKEN` for draft delivery. Never expose either dedicated authorization secret with a `NEXT_PUBLIC_` prefix.

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
