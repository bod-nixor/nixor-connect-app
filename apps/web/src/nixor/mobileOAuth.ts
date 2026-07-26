import { App } from "@capacitor/app";
import { Browser } from "@capacitor/browser";

import { getNixorConnectApiBaseUrl } from "./sso";
import { isNativeCapacitorShell } from "../vector/mobile_platform";

function isAndroidCallback(url: URL): boolean {
    return (
        (url.protocol === "nixorconnect:" && url.hostname === "auth" && url.pathname === "/callback") ||
        (url.protocol === "https:" && url.hostname === "connect.nixorcorporate.com" && url.pathname === "/mobile-auth/callback")
    );
}

export function registerNativeGoogleOAuthCallback(): void {
    if (!isNativeCapacitorShell(window)) return;
    void App.addListener("appUrlOpen", ({ url }) => {
        try {
            const callback = new URL(url);
            const code = callback.searchParams.get("code");
            if (!isAndroidCallback(callback) || !code || code.length > 512) return;
            const target = new URL(window.location.href);
            target.searchParams.set("nixor_mobile_code", code);
            const error = callback.searchParams.get("error");
            if (error) target.searchParams.set("nixor_mobile_error", error.slice(0, 120));
            window.location.replace(target);
        } catch {
            // Ignore malformed deep links.
        }
    });
}

export async function startNativeGoogleOAuth(): Promise<boolean> {
    if (!isNativeCapacitorShell(window)) return false;
    const url = new URL(`${getNixorConnectApiBaseUrl()}/auth/google/start`);
    url.searchParams.set("client", "android");
    await Browser.open({ url: url.toString() });
    return true;
}
