/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import {
    registerPushSubscription,
    revokePushSubscription,
} from "../../../src/nixor/accountabilityApi";
import {
    disableNixorBrowserPush,
    enableNixorBrowserPush,
} from "../../../src/nixor/pushNotifications";

jest.mock("../../../src/nixor/accountabilityApi", () => ({
    ...jest.requireActual("../../../src/nixor/accountabilityApi"),
    registerPushSubscription: jest.fn(),
    revokePushSubscription: jest.fn(),
}));

const registerMock = jest.mocked(registerPushSubscription);
const revokeMock = jest.mocked(revokePushSubscription);
const originalNotification = Object.getOwnPropertyDescriptor(window, "Notification");
const originalPushManager = Object.getOwnPropertyDescriptor(window, "PushManager");
const originalServiceWorker = Object.getOwnPropertyDescriptor(window.navigator, "serviceWorker");

function restoreProperty(target: object, key: PropertyKey, descriptor?: PropertyDescriptor): void {
    if (descriptor) Object.defineProperty(target, key, descriptor);
    else Reflect.deleteProperty(target, key);
}

describe("Nixor browser push", () => {
    const subscription = {
        toJSON: jest.fn(() => ({
            endpoint: "https://push.example.test/subscription",
            expirationTime: null,
            keys: { p256dh: "p".repeat(24), auth: "a".repeat(16) },
        })),
        unsubscribe: jest.fn().mockResolvedValue(true),
    };
    const pushManager = {
        getSubscription: jest.fn().mockResolvedValue(null),
        subscribe: jest.fn().mockResolvedValue(subscription),
    };

    beforeEach(() => {
        jest.clearAllMocks();
        window.localStorage.clear();
        Object.defineProperty(window, "PushManager", { configurable: true, value: class PushManager {} });
        Object.defineProperty(window, "Notification", {
            configurable: true,
            value: { permission: "default", requestPermission: jest.fn().mockResolvedValue("granted") },
        });
        Object.defineProperty(window.navigator, "serviceWorker", {
            configurable: true,
            value: { ready: Promise.resolve({ pushManager }) },
        });
        pushManager.getSubscription.mockResolvedValue(null);
        registerMock.mockResolvedValue("push_abcdefghijklmnopqrst");
        revokeMock.mockResolvedValue();
    });

    afterAll(() => {
        restoreProperty(window, "Notification", originalNotification);
        restoreProperty(window, "PushManager", originalPushManager);
        restoreProperty(window.navigator, "serviceWorker", originalServiceWorker);
    });

    it("requests consent, subscribes, and stores only the server public ID", async () => {
        await enableNixorBrowserPush("B".repeat(88));

        expect(Notification.requestPermission).toHaveBeenCalledTimes(1);
        expect(pushManager.subscribe).toHaveBeenCalledWith(expect.objectContaining({ userVisibleOnly: true }));
        expect(registerMock).toHaveBeenCalledWith(subscription.toJSON());
        expect(window.localStorage.getItem("nixor_connect_push_subscription_id")).toBe(
            "push_abcdefghijklmnopqrst",
        );
    });

    it("fails without registering when permission is denied", async () => {
        jest.mocked(Notification.requestPermission).mockResolvedValue("denied");

        await expect(enableNixorBrowserPush("B".repeat(88))).rejects.toMatchObject({
            code: "push_permission_denied",
        });
        expect(pushManager.subscribe).not.toHaveBeenCalled();
        expect(registerMock).not.toHaveBeenCalled();
    });

    it("revokes the server record before removing the browser subscription", async () => {
        pushManager.getSubscription.mockResolvedValue(subscription);
        window.localStorage.setItem("nixor_connect_push_subscription_id", "push_abcdefghijklmnopqrst");

        await disableNixorBrowserPush();

        expect(revokeMock).toHaveBeenCalledWith("push_abcdefghijklmnopqrst");
        expect(subscription.unsubscribe).toHaveBeenCalledTimes(1);
        expect(window.localStorage.getItem("nixor_connect_push_subscription_id")).toBeNull();
    });
});
