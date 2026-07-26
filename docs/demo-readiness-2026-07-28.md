# Demo readiness — 28 July 2026

This is an evidence-based working status, not a deployment assertion.

| Requirement | Source | Tests | Android | Deployed/demo verified | Evidence / blocker |
| --- | --- | --- | --- | --- | --- |
| Matrix-to-Connect session bootstrap | verified | verified | bundled, unverified | unverified | `pnpm --filter element-web test -- --runInBand apps/web/test/unit-tests/nixor/connectSession-test.ts` |
| One-time Connect API 401 repair | implemented but unverified | typechecked | bundled, unverified | unverified | `apps/web/src/nixor/accountabilityApi.ts`; needs browser cookie test |
| Google SSO end-to-end | partial | backend bootstrap verified | blocked | unverified | Requires configured Google, proxy, NCP, and Synapse environment |
| Message report with bounded encrypted evidence | verified | backend build verified; PostgreSQL acceptance test pending | bundled, unverified | unverified | `POST /api/v1/reports` now captures 5-before/5-after atomically |
| General report targets without raw IDs | partial | unverified | unverified | unverified | Message workflow is context-bound; broader picker conversion remains |
| Action assignment picker from a message | partial | typechecked | bundled, unverified | unverified | Debounced authorized directory search in message action dialog |
| Android bundled client/APK | verified | Gradle build verified | device unverified | unverified | `mobile-shell/android/app/build/outputs/apk/debug/app-debug.apk` |
| Android Google OAuth return | missing | unverified | blocked | unverified | Needs verified App Link and one-time browser-to-WebView session handoff |
| Digital-identity encryption prompt removal | unverified | unverified | unverified | unverified | Phrase is upstream encryption/cross-signing UI; runtime trigger not reproduced |
| Release orchestration | partial | existing ops tooling only | n/a | unverified | `ops/connect-stack`; required release command remains outstanding |

Starting base SHAs: client `6280a81e4f`, Panapticon `faea4fa`, NCP `3c733f9`, Synapse policy `1b0d615`.

Local untracked archives were preserved: `apps/web/connect-web-dist.zip` and `apps/developer-dashboard/developer-dashboard-dist.zip`.
