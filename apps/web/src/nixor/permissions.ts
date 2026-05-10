import SdkConfig from "../SdkConfig";
import { MatrixClientPeg } from "../MatrixClientPeg";

export interface NixorPermissions {
    can_create_servers: boolean;
    can_create_rooms: boolean;
    can_manage_servers: boolean;
    managed_space_ids: string[];
}

const DEFAULT_PERMISSIONS: NixorPermissions = {
    can_create_servers: false,
    can_create_rooms: false,
    can_manage_servers: false,
    managed_space_ids: [],
};

type NixorConfig = {
    governance_enabled?: boolean;
    dev_permissions?: Partial<NixorPermissions>;
    dev_permissions_by_user?: Record<string, Partial<NixorPermissions>>;
};

function normalizePermissions(permissions?: Partial<NixorPermissions>): NixorPermissions {
    return {
        ...DEFAULT_PERMISSIONS,
        ...permissions,
        managed_space_ids: permissions?.managed_space_ids ?? [],
    };
}

function getCurrentMatrixUserId(): string | null {
    try {
        return MatrixClientPeg.safeGet().getUserId();
    } catch {
        return null;
    }
}

export function getNixorPermissions(): NixorPermissions {
    const config = SdkConfig.get();

    const nixorConfig = config?.nixor as NixorConfig | undefined;

    if (!nixorConfig) return DEFAULT_PERMISSIONS;

    // Temporary local development mode.
    // Later this will call the private Nixor Governance API,
    // which will verify permissions against NCP.
    if (!nixorConfig.governance_enabled) {
        const currentUserId = getCurrentMatrixUserId();

        if (currentUserId && nixorConfig.dev_permissions_by_user?.[currentUserId]) {
            return normalizePermissions(nixorConfig.dev_permissions_by_user[currentUserId]);
        }

        return normalizePermissions(nixorConfig.dev_permissions);
    }

    return DEFAULT_PERMISSIONS;
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