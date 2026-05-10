import SdkConfig from "../SdkConfig";

export interface NixorPermissions {
    can_create_servers: boolean; // school admin global permission
    can_create_rooms: boolean; // school admin global permission
    can_manage_servers: boolean; // school admin global permission
    managed_space_ids: string[]; // spaces where this user is a space/server admin
}

const DEFAULT_PERMISSIONS: NixorPermissions = {
    can_create_servers: false,
    can_create_rooms: false,
    can_manage_servers: false,
    managed_space_ids: [],
};

export function getNixorPermissions(): NixorPermissions {
    const config = SdkConfig.get();

    const nixorConfig = config?.nixor as
        | {
              governance_enabled?: boolean;
              dev_permissions?: Partial<NixorPermissions>;
          }
        | undefined;

    if (!nixorConfig) return DEFAULT_PERMISSIONS;

    // Temporary local development mode.
    // Later this will call the private Nixor Governance API,
    // which will verify permissions against NCP.
    if (!nixorConfig.governance_enabled) {
        return {
            ...DEFAULT_PERMISSIONS,
            ...nixorConfig.dev_permissions,
            managed_space_ids: nixorConfig.dev_permissions?.managed_space_ids ?? [],
        };
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

    // School admins can create rooms anywhere.
    if (permissions.can_create_rooms) return true;

    // Space/server admins can only create rooms inside spaces they manage.
    return managesSpace(parentSpaceId);
}

export function canManageNixorServer(spaceId?: string | null): boolean {
    const permissions = getNixorPermissions();

    if (permissions.can_manage_servers) return true;

    return managesSpace(spaceId);
}