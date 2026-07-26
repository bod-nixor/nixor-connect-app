# Mobile build and authentication

The Android shell lives in `mobile-shell/` and packages `apps/web/webapp`, so its
views and API contracts are shared with the web client. Build instructions are in
`mobile-shell/README.md`.

The current debug APK was built after `pnpm --filter element-web build`, `npx cap
sync android`, and `./gradlew assembleDebug`. It proves asset packaging, not a
device login flow.

Google OAuth must use a system browser or Custom Tab. Before enabling it for a
demo, implement and verify a domain-owned Android App Link and a single-use
callback handoff that creates the cookie-bound Connect session without passing a
Matrix token through a URL, JavaScript storage, or logs. An embedded-WebView OAuth
workaround is not acceptable.
