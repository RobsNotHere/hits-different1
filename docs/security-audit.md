# Security audit — URLs, media, `fetch`, related vectors

Scope: `src/`, `public/` static assets, Next.js API routes. Date: repo audit pass.

## Summary

| Area                         | Risk (pre-mitigation) | Mitigation / status                                      |
| ---------------------------- | --------------------- | -------------------------------------------------------- |
| `POST /api/spotify/player/play` | Medium (authenticated client could send odd `contextUri` / `deviceId`) | **Validated** in `parseSpotifyPlayBody` (`validateSpotifyPlayRequest.ts`). Host is always `api.spotify.com` — **no SSRF** to arbitrary origins. |
| `fetch` to Spotify / same-origin | Low                 | Fixed Spotify URLs or same-origin `/api/*`; tokens from session server-side. |
| Auth error `?error=`         | Low (reflected text)  | React text nodes; keys limited to known NextAuth error keys for copy. |
| `<video>` / `<audio>` `src`  | Low (no user URLs)   | Paths from constants / `data.ts` (`sessionDemoFocusSrc`), not user input. |
| `SampleMixLinks` `href`      | Low                   | URLs from `VIBE_SAMPLE_PLAYLISTS` (build-time data).     |
| PiP `innerHTML`              | Low (clock was `MM:SS`) | **Replaced** with `mountPipTimerShell` (DOM APIs + `textContent`). |
| `useSessionTimerDocumentMeta` | Low                | Title/favicon from derived clock numbers / strings from timer logic. |
| `triggerBlobDownload`        | Low                   | `createObjectURL` for app-generated CSV/canvas blobs only. |
| File uploads                 | N/A                   | No upload routes or `<input type="file">` in app.        |

## `fetch` inventory

- `SpotifyWebPlayer.tsx` → `fetch('/api/spotify/player/play')`, `fetch('/api/spotify/token')` — same-origin; body for play is validated server-side.
- `useSpotifyPlaybackNotice.ts` → `fetch('/api/spotify/account')` — same-origin.
- `refreshSpotifyAccessToken.ts`, `account/route.ts`, `player/play/route.ts` → fixed `https://accounts.spotify.com` / `https://api.spotify.com` URLs only.

## Recommendations (optional)

- **CSP** (`Content-Security-Policy` in `next.config` / headers): tighten `default-src`, `media-src`, `script-src` for `scdn.co` if you want defense-in-depth; test thoroughly with Spotify Web Playback SDK.
- **Rate limiting** on `/api/spotify/player/play` if abuse becomes a concern (same user spamming play).
- If you add **user-supplied media URLs** later: allowlist hosts, HTTPS-only, never server-side `fetch(userUrl)` without SSRF controls.
