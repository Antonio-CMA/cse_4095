# Releasing Math Practice

This is the checklist for putting the app on the web, and a record of what has
and has not been checked.

## Before every release

```bash
npm run verify    # lint, formatting, all tests, production build
npm run preview   # serves the production build, with the real security headers
```

Open the preview address and click through a session. `npm run preview` sends
the headers in `public/_headers` (including the Content-Security-Policy), so a
problem with the policy shows up here and not for the first time in production.

## Supported browsers

The build targets what Vite calls "baseline widely available": **Chrome and Edge
111+, Firefox 114+, Safari and iOS Safari 16.4+**. Everything the app uses is
older than that (`inert`, `Object.hasOwn`, `Promise.allSettled`, `:focus-visible`,
CSS `min()`/`clamp()`); `crypto.randomUUID` and `requestIdleCallback` have
fallbacks. Older browsers may show a blank page.

## What was checked, and where

Checked on the production build in a Chromium browser (the Claude desktop app's
built-in browser):

- every address loaded directly, as a shared link or a refresh would: `/`,
  `/practice/setup`, `/practice/session`, `/practice/summary`, `/statistics`,
  `/settings`, `/privacy` and an unknown address, with a clean console each time
  (the session and summary addresses correctly redirect to setup with an
  explanation);
- a whole session, its summary, and statistics and a changed setting surviving a
  real page reload;
- phone and tablet sizes: 320, 375 and 414 px wide, 768 × 1024 and 1024 × 768,
  with no sideways scrolling and no tap target under 44 px;
- the Content-Security-Policy being enforced (an injected inline script and a
  request to another site were both blocked);
- axe accessibility checks (see the README).

**Not checked, because they were not available:** Safari, Firefox, Microsoft
Edge, a real iPad or iPhone, a real Android phone, and a real screen reader. The
Chromium checks stand in for Edge (same engine), but that is an assumption. Please
run the table below before announcing the app.

| Browser                     | Open it, then…                                                                                                                   |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Safari (Mac)                | Finish a session; reload; check statistics and the card flip (3D animation).                                                     |
| Safari on iPhone/iPad       | The same, by touch; rotate the device; add to Home Screen is not set up (no offline mode).                                       |
| Firefox                     | The same; also tab through a question using only the keyboard.                                                                   |
| Microsoft Edge              | The same.                                                                                                                        |
| Chrome on an Android phone  | The same, by touch, at the largest system font size.                                                                             |
| Any browser, private window | Practice still works, and the "can't save your progress" warning appears and can be closed (private windows may refuse to save). |

## Hosting

The app is a static site: the `dist` folder is everything. It needs two things
from a host: **show `index.html` for every address** (so a refresh or a shared
link such as `/statistics` works), and ideally **send the security headers**.
Both are already written down:

| Host                    | Files used                                         | How                                                                                                                                                                                                                      |
| ----------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Netlify** (suggested) | `public/_redirects`, `public/_headers` (in `dist`) | Drag the `dist` folder onto Netlify, or connect the GitHub repository with _Base directory_ `Assignment 13/math-practice-app`, _Build command_ `npm run build`, _Publish directory_ `dist`.                              |
| **Cloudflare Pages**    | the same two files                                 | Same settings as above.                                                                                                                                                                                                  |
| **Vercel**              | `vercel.json`                                      | Import the repository and set _Root Directory_ to `Assignment 13/math-practice-app`.                                                                                                                                     |
| **GitHub Pages**        | none: it cannot do either thing properly           | Set `VITE_BASE=/cse_4095/` when building. Pages cannot rewrite addresses or set headers, so refreshing a deep link needs a copy of `index.html` saved as `404.html`, and the security headers are lost. Not recommended. |

If the site lives below a folder (`https://example.com/math/`), build with
`VITE_BASE=/math/ npm run build`. The router and the "Go Home" link use that base.

**Currently deployed** to GitHub Pages at https://antonio-cma.github.io/cse_4095/ by
`.github/workflows/math-practice-deploy.yml` (see the README's "Deployment status" for
what was verified there). That needed the repository to be public, because GitHub Pages
on a private repository requires a paid plan. `.github/workflows/math-practice-ci.yml`
only checks (lint, tests, build); it deploys nothing.

On GitHub Pages, opening or refreshing any address other than the home page is
answered with `404.html` (a copy of the app): the page works, but the browser console
shows one "404" line for that first load. The other hosts above avoid this. The site's
browser storage belongs to `antonio-cma.github.io`, shared with any other project pages
on that account; the app only touches keys starting with `mathPractice.`.

## After deploying

- Open each address directly (and refresh on it): `/`, `/practice/setup`,
  `/statistics`, `/settings`, `/privacy`, and something that does not exist.
- Finish a session, reload the page, and see the statistics and settings remain.
- Check a phone, or the browser's phone and tablet view.
- Open the browser console: there should be no errors or warnings.
- Check the headers (for example `curl -I https://your-site/`): the
  `Content-Security-Policy`, `Referrer-Policy` and `X-Content-Type-Options` lines
  from `public/_headers` should be there.

## Privacy

The Privacy page (`/privacy`, linked in the footer) tells parents what the app
does. `src/utils/privacy.test.ts` fails if the code gains a network call, a
cookie, an analytics or advertising service, an outside link or another library,
or if the hosting headers weaken. If you ever need one of those, change the
Privacy page first.
