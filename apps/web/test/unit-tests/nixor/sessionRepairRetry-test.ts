/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { isSafeSessionRepairRetry } from "../../../src/nixor/accountabilityApi";

describe("Connect session repair retries", () => {
    it.each(["GET", "HEAD", "OPTIONS"])("replays safe %s requests once", (method) => {
        expect(isSafeSessionRepairRetry({ method })).toBe(true);
    });

    it.each(["POST", "PUT", "PATCH", "DELETE"])("never automatically replays %s mutations", (method) => {
        expect(isSafeSessionRepairRetry({ method, headers: { "Idempotency-Key": "present" } })).toBe(false);
    });
});
