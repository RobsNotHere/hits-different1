# Security audit — URLs, media, `fetch`, related vectors

Scope: `src/`, `public/` static assets, Next.js routes. Date: repo audit pass.

## Summary

| Area                         | Risk (pre-mitigation) | Mitigation / status                                      |
| ---------------------------- | --------------------- | -------------------------------------------------------- |
| `<video>` / `<audio>` `src`  | Low (no user URLs)   | Paths from constants / `data.ts` (`sessionDemoFocusSrc`), not user input. |
| `SampleMixLinks` `href`      | Low                   | URLs from `VIBE_SAMPLE_PLAYLISTS` (build-time data).     |
| PiP `innerHTML`              | Low (clock was `MM:SS`) | **Replaced** with `mountPipTimerShell` (DOM APIs + `textContent`). |
| `useSessionTimerDocumentMeta` | Low                | Title/favicon from derived clock numbers / strings from timer logic. |
| `triggerBlobDownload`        | Low                   | `createObjectURL` for app-generated CSV/canvas blobs only. |
| File uploads                 | N/A                   | No upload routes or `<input type="file">` in app.        |

## `fetch` inventory

- App UI uses same-origin assets and optional demo audio from constants; no third-party OAuth or Spotify Web API calls in this codebase.

## Recommendations (optional)

- **CSP** (`Content-Security-Policy` in `next.config` / headers): tighten `default-src`, `media-src`, `script-src` if you add external scripts or embeds later; test thoroughly after changes.
- If you add **user-supplied media URLs** later: allowlist hosts, HTTPS-only, never server-side `fetch(userUrl)` without SSRF controls.
