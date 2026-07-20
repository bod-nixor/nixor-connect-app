/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import {
    NixorApiError,
    registerPushSubscription,
    revokePushSubscription,
} from "./accountabilityApi";

const PUSH_SUBSCRIPTION_ID_KEY = "nixor_connect_push_subscription_id";

function applicationServerKey(value: string): ArrayBuffer {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    let bytes: Uint8Array;
    try {
        bytes = Uint8Array.from(window.atob(padded), (character) => character.charCodeAt(0));
    } catch {
        throw new NixorApiError("Browser notifications are not configured correctly.", "invalid_vapid_key", 0);
    }
    const result = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(result).set(bytes);
    return result;
}

export function browserPushIsSupported(): boolean {
    return "Notification" in window && "serviceWorker" in navigator && "PushManager" in window;
}

export async function enableNixorBrowserPush(vapidPublicKey: string | null): Promise<void> {
    if (!browserPushIsSupported()) {
        throw new NixorApiError("This browser does not support push notifications.", "push_not_supported", 0);
    }
    if (!vapidPublicKey) {
        throw new NixorApiError("Browser notifications are not available on this deployment.", "push_not_configured", 0);
    }

    const permission = Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") {
        throw new NixorApiError(
            "Browser notification permission was not granted. You can keep using in-app notifications.",
            "push_permission_denied",
            0,
        );
    }

    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription() ?? await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey(vapidPublicKey),
    });
    const publicId = await registerPushSubscription(subscription.toJSON());
    window.localStorage.setItem(PUSH_SUBSCRIPTION_ID_KEY, publicId);
}

export async function disableNixorBrowserPush(): Promise<void> {
    if (!browserPushIsSupported()) return;
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    const publicId = window.localStorage.getItem(PUSH_SUBSCRIPTION_ID_KEY);

    if (publicId) {
        await revokePushSubscription(publicId);
        window.localStorage.removeItem(PUSH_SUBSCRIPTION_ID_KEY);
    }
    await subscription?.unsubscribe();
}
