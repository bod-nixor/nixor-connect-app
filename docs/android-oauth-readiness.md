# Android OAuth readiness

The Android client opens Google sign-in with Capacitor Browser and requests
`/auth/google/start?client=android`. The server permits only this explicit
client value, binds it into the signed Google state cookie, and returns a
single-use opaque handoff code to one fixed callback. Matrix credentials,
Google tokens, email addresses, and session identifiers are never placed in a
callback URL.

## Callback registration

Production callback: `https://connect.nixorcorporate.com/mobile-auth/callback`.
The Android manifest declares this exact host and path prefix with App Link
verification enabled. Serve the following at
`https://connect.nixorcorporate.com/.well-known/assetlinks.json` before using
the production callback (replace the release fingerprint with the signing
certificate fingerprint from the release keystore):

```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.nixorcorporate.connect",
      "sha256_cert_fingerprints": ["<RELEASE_SHA256_FINGERPRINT>"]
    }
  }
]
```

The signed debug APK fallback is exactly `nixorconnect://auth/callback`.
Its current debug certificate SHA-256 is
`C2:00:A3:E8:3C:81:49:50:A0:5B:83:A6:6A:F3:DC:1C:55:05:95:A1:F4:06:D4:5D:7F:FD:3E:47:0A:52:06:04`.
This fingerprint is for debug verification only and must not be deployed as a
production App Link identity.

## Server configuration and rollout

Set `MOBILE_OAUTH_HANDOFF_ENCRYPTION_KEYS` and
`MOBILE_OAUTH_HANDOFF_ENCRYPTION_ACTIVE_VERSION` in the secret manager. The
keys must be independent 32-byte AES-GCM key-ring material; do not reuse the
session-token key. Apply migration `026_mobile_oauth_handoffs.sql` before
deploying the Panapticon code. Set `MOBILE_OAUTH_CALLBACK_URL` to the exact
production App Link only after `assetlinks.json` verifies on the signed APK.

The API admits credentials only from the configured Connect web origin and
`https://localhost` (the Capacitor WebView origin), with credentials enabled;
it never allows wildcard credentialed CORS. Android exchange cookies use
`Secure; SameSite=None` because `https://localhost` is cross-site to the API.

For a Nixor-managed tenant, set `nixor.managed_crypto: true` in the client
configuration. It suppresses blocking cross-signing/recovery setup screens and
recurring setup toasts, while leaving the standard Encryption settings
available for security status and recovery information. Do not enable it for
unmanaged installations.

## Release order and rollback

1. Back up the Panapticon database and apply the additive migration.
2. Deploy the Panapticon code and confirm the mobile handoff encryption key is
   present, without logging its value.
3. Publish and verify `assetlinks.json`, then set the fixed HTTPS callback.
4. Publish the client bundle and signed APK; test the exact approved account on
   a physical device.

Do not roll the database schema backward. Application rollback is limited to
the prior compatible server/client artifact; leave the additive handoff table
in place and revoke newly issued sessions if an incident requires it.
