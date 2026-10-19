# New World Fool Productions — website

Source for [newworldfoolproductions.com](https://newworldfoolproductions.com), built with [Astro](https://astro.build).

Hosted on **Netlify** (Cloudflare sits in front as DNS/proxy). Netlify builds with `npm run build` and publishes `dist/`; anything in `netlify/functions/` is deployed as a serverless function automatically.

## Commands

| Command           | Action                                                   |
| :---------------- | :------------------------------------------------------- |
| `npm install`     | Install dependencies                                     |
| `npm run dev`     | Local dev server at `localhost:4321` (no functions)      |
| `npm run build`   | Build the site into `dist/`                              |
| `npm run preview` | Preview the built site                                   |
| `npx netlify dev` | Local dev **with** functions + Blobs (needed for the ARG) |

## Layout

```text
src/
  data/films.ts        Film list — titles, posters, stills, laurels, credits
  data/arg.ts          ARG tape config (URLs, labels, videos)
  pages/               One file per route
  pages/films/[slug]   Film detail pages, generated from data/films.ts
  pages/footage/[slug] ARG password pages, generated from data/arg.ts
  layouts/Layout.astro Shared <head> (SEO + link previews), nav, footer
netlify/functions/
  footage.mts          ARG password check + global solve state
public/                Static files served as-is (images, logo, favicon)
public/og/             1200×630 link-preview images
```

## Contact form

Submits through [FormSubmit](https://formsubmit.co) to newworldfoolproductions@gmail.com. Spam is filtered with a hidden honeypot field.

## ARG ("Recovered Footage")

Three password pages at `/footage/<slug>` (slugs in `src/data/arg.ts`). Each takes a 10-character code:

- The code is checked **server-side** by `netlify/functions/footage.mts`, so it never reaches the browser until solved. Passwords live in Netlify environment variables — **never commit them** (this repo is public):
  - `ARG_PASSWORD_TAPE_1`, `ARG_PASSWORD_TAPE_2`, `ARG_PASSWORD_TAPE_3`
  - Set in Netlify → Site configuration → Environment variables (mark as secret). Locally, put them in `.env` (gitignored).
- The first correct guess is stored in Netlify Blobs (store `arg-solves`). From then on **every** visitor sees the password in green and the same 24-hour countdown.
- The browser that solves it first emails newworldfoolproductions@gmail.com via FormSubmit.
- A tape with `revealEmbedUrl` set (tape 3) plays that film on the TV once solved. The URL is only sent to the browser after the solve, so it can't be found in the page source.
- To reset a tape (e.g. after testing), delete its key from the `arg-solves` store in Netlify → Blobs, or run `npx netlify blobs:delete arg-solves <slug>`. Locally: `npm run arg:reset-local`.

### Homepage takeover

Set the Netlify environment variable **`ARG_HOMEPAGE_TAPE`** to `1`, `2` or `3` and redeploy (Deploys → Trigger deploy). From then on newworldfoolproductions.com/ sends visitors straight to that tape. Empty it and redeploy to turn it off.

- Handled by `netlify/edge-functions/arg-home.ts`. Only `/` is affected; every other page works normally.
- Each tape's **Go to homepage** button links to `/?home`, which sets a cookie so that visitor can browse the normal site for the rest of their browser session.
- Locally: set it in `.env` and restart `npm run dev:netlify`.
