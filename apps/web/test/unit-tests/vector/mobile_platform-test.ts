/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { isNativeCapacitorShell } from "../../../src/vector/mobile_platform";

describe("isNativeCapacitorShell", () => {
    it("recognises the Capacitor native bridge", () => {
        const windowObject = {
            Capacitor: { isNativePlatform: () => true },
        } as unknown as Window;

        expect(isNativeCapacitorShell(windowObject)).toBe(true);
    });

    it("does not treat a normal mobile browser as the native shell", () => {
        expect(isNativeCapacitorShell({} as Window)).toBe(false);
    });
});
