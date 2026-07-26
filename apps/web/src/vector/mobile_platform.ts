/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

/**
 * Element Web normally redirects Android and iOS browsers to the install guide.
 * Capacitor supplies its own Android application, so that redirect would leave
 * the application before the client can initialise.
 */
export function isNativeCapacitorShell(windowObject: Window): boolean {
    const capacitor = (windowObject as Window & {
        Capacitor?: { isNativePlatform?: () => boolean };
    }).Capacitor;

    return capacitor?.isNativePlatform?.() === true;
}
