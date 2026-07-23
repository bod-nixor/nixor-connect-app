/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { MatrixClientPeg } from "../MatrixClientPeg";
import SdkConfig from "../SdkConfig";
import { getNixorConnectApiBaseUrl } from "./sso";

interface NixorConfig {
    governance_enabled?: boolean;
}

export interface MatrixConnectSessionCredentials {
    matrixUserId: string;
    matrixAccessToken: string;
    matrixDeviceId: string;
}

interface MatrixConnectSessionResponse {
    ok?: boolean;
    error?: string;
    matrix_user_id?: string;
    matrix_device_id?: string;
}

let completedSessionKey: string | null = null;
let inFlightSessionKey: string | null = null;
let inFlightBootstrap: Promise<void> | null = null;
let bootstrapGeneration = 0;

function isGovernanceEnabled(): boolean {
    return (SdkConfig.get()?.nixor as NixorConfig | undefined)?.governance_enabled === true;
}

function sessionKey(matrixUserId: string, matrixDeviceId: string): string {
    return `${matrixUserId}\u0000${matrixDeviceId}`;
}

function currentCredentials(): MatrixConnectSessionCredentials {
    const client = MatrixClientPeg.safeGet();
    const matrixUserId = client.getUserId();
    const matrixAccessToken = client.getAccessToken();
    const matrixDeviceId = client.getDeviceId();

    if (!matrixUserId || !matrixAccessToken || !matrixDeviceId) {
        throw new Error("Your Matrix login is missing the credentials required for a secure Connect session.");
    }

    return { matrixUserId, matrixAccessToken, matrixDeviceId };
}

export async function bootstrapNixorConnectSession(
    credentials: MatrixConnectSessionCredentials,
): Promise<void> {
    const response = await fetch(`${getNixorConnectApiBaseUrl()}/auth/matrix-session`, {
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
    });
    const body = (await response.json().catch(() => ({}))) as MatrixConnectSessionResponse;

    if (!response.ok || body.ok !== true) {
        throw new Error(
            body.error === "connect_identity_not_active"
                ? "This Matrix account is not an active Nixor Connect identity."
                : "Could not establish your secure Connect session.",
        );
    }

    if (
        body.matrix_user_id !== credentials.matrixUserId ||
        body.matrix_device_id !== credentials.matrixDeviceId
    ) {
        throw new Error("The secure Connect session did not match the active Matrix device.");
    }
}

export async function ensureNixorConnectSession(force = false): Promise<void> {
    if (!isGovernanceEnabled()) return;

    const credentials = currentCredentials();
    const key = sessionKey(credentials.matrixUserId, credentials.matrixDeviceId);

    if (!force && completedSessionKey === key) return;
    if (inFlightBootstrap && inFlightSessionKey === key) return inFlightBootstrap;

    const generation = bootstrapGeneration;
    let request: Promise<void>;
    request = bootstrapNixorConnectSession(credentials)
        .then(() => {
            if (generation === bootstrapGeneration) {
                completedSessionKey = key;
            }
        })
        .finally(() => {
            if (inFlightBootstrap === request) {
                inFlightBootstrap = null;
                inFlightSessionKey = null;
            }
        });

    inFlightSessionKey = key;
    inFlightBootstrap = request;
    return request;
}

export function resetNixorConnectSessionBootstrap(): void {
    bootstrapGeneration += 1;
    completedSessionKey = null;
    inFlightSessionKey = null;
    inFlightBootstrap = null;
}
