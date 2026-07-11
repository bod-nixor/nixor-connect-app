/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { getNixorConnectApiBaseUrl } from "./sso";

export interface NixorOnboardingMembership {
    resource_key: string;
    display_name: string;
    resource_type: "space" | "channel";
    matrix_room_id: string;
    desired_role: string;
    status: string;
}

export interface NixorOnboardingLandingRoom {
    kind: "room";
    resource_key: string;
    room_id: string;
}

export interface NixorOnboardingLandingProvisioning {
    kind: "provisioning";
    message: string;
}

export type NixorOnboardingLanding = NixorOnboardingLandingRoom | NixorOnboardingLandingProvisioning;

export interface NixorOnboardingStatus {
    ok: true;
    onboarding_completed: boolean;
    sync_status: string;
    user: {
        matrix_user_id: string;
        email: string;
        display_name?: string;
    };
    memberships: NixorOnboardingMembership[];
    landing: NixorOnboardingLanding;
}

export async function getNixorOnboardingStatus(): Promise<NixorOnboardingStatus> {
    const response = await fetch(`${getNixorConnectApiBaseUrl()}/auth/onboarding`, {
        method: "GET",
        credentials: "include",
    });
    const body = (await response.json().catch(() => ({}))) as Partial<NixorOnboardingStatus> & { error?: string };

    if (!response.ok || body.ok !== true) {
        throw new Error(body.error || `Nixor onboarding request failed: ${response.status}`);
    }

    return body as NixorOnboardingStatus;
}

export async function completeNixorOnboarding(): Promise<void> {
    const response = await fetch(`${getNixorConnectApiBaseUrl()}/auth/onboarding/complete`, {
        method: "POST",
        credentials: "include",
    });
    const body = (await response.json().catch(() => ({}))) as { ok?: boolean; error?: string };

    if (!response.ok || body.ok !== true) {
        throw new Error(body.error || `Nixor onboarding completion failed: ${response.status}`);
    }
}
