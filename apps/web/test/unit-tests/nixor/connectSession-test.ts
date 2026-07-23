/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import fetchMock from "@fetch-mock/jest";

import {
    bootstrapNixorConnectSession,
    type MatrixConnectSessionCredentials,
} from "../../../src/nixor/connectSession";

const credentials: MatrixConnectSessionCredentials = {
    matrixUserId: "@student:connect.nixorcorporate.com",
    matrixAccessToken: "matrix-user-token",
    matrixDeviceId: "DEVICE1",
};

const endpoint = "https://connect-api.nixorcorporate.com/auth/matrix-session";

describe("Nixor Connect Matrix session bootstrap", () => {
    beforeEach(() => {
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
        window.mxReactSdkConfig = {
            nixor: {
                connect_api_base_url: "https://connect-api.nixorcorporate.com",
                governance_enabled: true,
            },
        } as any;
    });

    it("exchanges the active Matrix device for a cookie-bound Connect session", async () => {
        fetchMock.post(endpoint, {
            ok: true,
            matrix_user_id: credentials.matrixUserId,
            matrix_device_id: credentials.matrixDeviceId,
        });

        await expect(bootstrapNixorConnectSession(credentials)).resolves.toBeUndefined();
        expect(fetchMock).toHaveFetched(endpoint, {
            method: "POST",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                matrix_user_id: credentials.matrixUserId,
                matrix_access_token: credentials.matrixAccessToken,
                matrix_device_id: credentials.matrixDeviceId,
            }),
        } as any);
    });

    it("rejects a response bound to a different Matrix device", async () => {
        fetchMock.post(endpoint, {
            ok: true,
            matrix_user_id: credentials.matrixUserId,
            matrix_device_id: "OTHER_DEVICE",
        });

        await expect(bootstrapNixorConnectSession(credentials)).rejects.toThrow(
            "The secure Connect session did not match the active Matrix device.",
        );
    });

    it("does not expose backend details when session bootstrap is rejected", async () => {
        fetchMock.post(endpoint, {
            status: 401,
            body: { ok: false, error: "matrix_token_verification_failed" },
        });

        await expect(bootstrapNixorConnectSession(credentials)).rejects.toThrow(
            "Could not establish your secure Connect session.",
        );
    });
});
