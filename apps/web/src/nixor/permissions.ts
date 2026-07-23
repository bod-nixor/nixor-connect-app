/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import SdkConfig from "../SdkConfig";
import { MatrixClientPeg } from "../MatrixClientPeg";
import { ensureNixorConnectSession } from "./connectSession";

export interface NixorPermissions {
    can_create_servers: boolean;
    can_create_rooms: boolean;
    can_manage_servers: boolean;
    can_manage_server_roles: boolean;
    can_moderate_servers: boolean;
    managed_space_ids: string[];
    moderated_space_ids: string[];
}

interface NixorConfig {
    governance_api_base_url?: string;
    governance_enabled?: boolean;
    dev_governance_api_token?: string;
    dev_permissions?: Partial<NixorPermissions>;
    dev_permissions_by_user?: Record<string, Partial<NixorPermissions>>;
}

interface GovernancePermissionsResponse {
    ok: boolean;
    matrix_user_id: string;
    permissions: Partial<NixorPermissions>;
}

const DEFAULT_PERMISSIONS: NixorPermissions = {
    can_create_servers: false,
    can_create_rooms: false,
    can_manage_servers: false,
    can_manage_server_roles: false,
    can_moderate_servers: false,
    managed_space_ids: [],
    moderated_space_ids: [],
};

const CACHE_TTL_MS = 15_000;

let cachedPermissions: NixorPermissions | null = null;
let cachedMatrixUserId: string | null = null;
let lastFetchAt = 0;
let inFlightFetch: Promise<NixorPermissions> | null = null;
let inFlightMatrixUserId: string | null = null;

function normalizePermissions(permissions?: Partial<NixorPermissions>): NixorPermissions {
    return {
        ...DEFAULT_PERMISSIONS,
        ...permissions,
        managed_space_ids: permissions?.managed_space_ids ?? [],
        moderated_space_ids: permissions?.moderated_space_ids ?? [],
    };
}

function getNixorConfig(): NixorConfig | undefined {
    return SdkConfig.get()?.nixor as NixorConfig | undefined;
}

function getCurrentMatrixUserId(): string | null {
    try {
        return MatrixClientPeg.safeGet().getUserId();
    } catch {
        return null;
    }
}

function getDevPermissions(nixorConfig: NixorConfig | undefined, matrixUserId: string | null): NixorPermissions {
    if (!nixorConfig) return DEFAULT_PERMISSIONS;

    if (matrixUserId && nixorConfig.dev_permissions_by_user?.[matrixUserId]) {
        return normalizePermissions(nixorConfig.dev_permissions_by_user[matrixUserId]);
    }

    return normalizePermissions(nixorConfig.dev_permissions);
}

function failClosedForUser(matrixUserId: string | null): void {
    cachedPermissions = null;
    cachedMatrixUserId = matrixUserId;
    lastFetchAt = 0;
}

export function clearNixorPermissionsCache(): void {
    failClosedForUser(null);
    inFlightFetch = null;
    inFlightMatrixUserId = null;
}

export async function refreshNixorPermissions(force = false): Promise<NixorPermissions> {
    const nixorConfig = getNixorConfig();
    const matrixUserId = getCurrentMatrixUserId();

    if (!nixorConfig?.governance_enabled || !matrixUserId) {
        cachedPermissions = getDevPermissions(nixorConfig, matrixUserId);
        cachedMatrixUserId = matrixUserId;
        lastFetchAt = Date.now();
        return cachedPermissions;
    }

    if (cachedMatrixUserId !== matrixUserId) {
        failClosedForUser(matrixUserId);
    }

    const now = Date.now();

    if (!force && cachedPermissions && now - lastFetchAt < CACHE_TTL_MS) {
        return cachedPermissions;
    }

    if (inFlightFetch && inFlightMatrixUserId === matrixUserId) {
        return inFlightFetch;
    }

    const baseUrl = nixorConfig.governance_api_base_url?.replace(/\/$/, "");

    if (!baseUrl) {
        cachedPermissions = DEFAULT_PERMISSIONS;
        lastFetchAt = now;
        return cachedPermissions;
    }

    let request: Promise<NixorPermissions>;
    request = ensureNixorConnectSession()
        .then(() => fetch(`${baseUrl}/api/users/${encodeURIComponent(matrixUserId)}/permissions`, {
            method: "GET",
            credentials: "include",
            headers: {
                "Content-Type": "application/json",
                ...(nixorConfig.dev_governance_api_token
                    ? { Authorization: `Bearer ${nixorConfig.dev_governance_api_token}` }
                    : {}),
            },
        }))
        .then(async (response) => {
            const body = (await response.json()) as GovernancePermissionsResponse;

            if (!response.ok || !body.ok || body.matrix_user_id !== matrixUserId) {
                throw new Error(`Failed to fetch Nixor permissions: ${response.status}`);
            }

            const permissions = normalizePermissions(body.permissions);
            if (getCurrentMatrixUserId() === matrixUserId && cachedMatrixUserId === matrixUserId) {
                cachedPermissions = permissions;
                lastFetchAt = Date.now();
            }

            return permissions;
        })
        .catch((error) => {
            console.warn("Nixor Connect: failed to fetch governance permissions", error);

            if (getCurrentMatrixUserId() === matrixUserId && cachedMatrixUserId === matrixUserId) {
                cachedPermissions = DEFAULT_PERMISSIONS;
                lastFetchAt = Date.now();
            }

            return DEFAULT_PERMISSIONS;
        })
        .finally(() => {
            if (inFlightFetch === request) {
                inFlightFetch = null;
                inFlightMatrixUserId = null;
            }
        });

    inFlightFetch = request;
    inFlightMatrixUserId = matrixUserId;
    return request;
}

export function getNixorPermissions(): NixorPermissions {
    const nixorConfig = getNixorConfig();
    const matrixUserId = getCurrentMatrixUserId();

    if (!nixorConfig?.governance_enabled) {
        return getDevPermissions(nixorConfig, matrixUserId);
    }

    if (cachedMatrixUserId !== matrixUserId) {
        failClosedForUser(matrixUserId);
        void refreshNixorPermissions();
        return DEFAULT_PERMISSIONS;
    }

    if (!cachedPermissions || Date.now() - lastFetchAt > CACHE_TTL_MS) {
        void refreshNixorPermissions();
    }

    return cachedPermissions ?? DEFAULT_PERMISSIONS;
}

function managesSpace(spaceId?: string | null): boolean {
    if (!spaceId) return false;

    const managedSpaceIds = getNixorPermissions().managed_space_ids;

    return managedSpaceIds.includes("*") || managedSpaceIds.includes(spaceId);
}

export function canCreateNixorServer(): boolean {
    return getNixorPermissions().can_create_servers;
}

export function canCreateNixorRoom(parentSpaceId?: string | null): boolean {
    const permissions = getNixorPermissions();

    if (permissions.can_create_rooms) return true;

    return managesSpace(parentSpaceId);
}

export function canManageNixorServer(spaceId?: string | null): boolean {
    const permissions = getNixorPermissions();

    if (permissions.can_manage_servers) return true;

    return managesSpace(spaceId);
}

export function canManageNixorServerRoles(): boolean {
    return getNixorPermissions().can_manage_server_roles;
}

export function canModerateNixorServer(spaceId?: string | null): boolean {
    const permissions = getNixorPermissions();

    if (permissions.can_moderate_servers) return true;
    if (!spaceId) return false;

    return permissions.moderated_space_ids.includes("*") || permissions.moderated_space_ids.includes(spaceId);
}
