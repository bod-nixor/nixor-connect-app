# Nixor Connect Android shell

This Capacitor project packages the Nixor Connect web client from
`../apps/web/webapp`. It intentionally does not contain a second application UI.

## Build a debug APK

From the Nixor Connect repository root:

```sh
pnpm --filter element-web build
cd mobile-shell
npm ci
npx cap sync android
cd android
./gradlew assembleDebug
```

The resulting APK is `android/app/build/outputs/apk/debug/app-debug.apk`.
Generated Android assets, Gradle outputs, local SDK configuration, and APKs are
ignored and must not be committed.

## Authentication boundary

Google sign-in must be opened in the Android system browser or a Custom Tab and
returned through a verified Android App Link. Do not use the embedded WebView
for Google OAuth and do not add an unrestricted custom-scheme redirect. The
web session cookie is not automatically shared with the system browser, so the
production callback implementation must exchange a short-lived, single-use
handoff result for a Capacitor cookie session without putting Matrix tokens in
URLs, logs, or page storage.
