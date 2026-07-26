/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { hasRequiredBrowserFeatures } from "../../../src/vector/browserFeatureChecks";

describe("hasRequiredBrowserFeatures", () => {
    const nativeCapacitor = { isNativePlatform: () => true };

    it("keeps the hard feature gate active for the Capacitor shell", () => {
        const modernizr: Record<string, unknown> = {
            // A real hard requirement reported as unavailable by Modernizr.
            es6collections: false,
        };
        modernizr.addTest = (name: string, test: () => boolean) => {
            modernizr[name] = test();
        };

        Object.defineProperty(window, "Capacitor", {
            value: nativeCapacitor,
            configurable: true,
        });
        Object.defineProperty(window, "Modernizr", {
            value: modernizr,
            configurable: true,
        });

        expect(hasRequiredBrowserFeatures(window)).toBe(false);
    });
});
