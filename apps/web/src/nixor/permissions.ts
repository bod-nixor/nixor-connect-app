import SdkConfig from "../SdkConfig";

export interface NixorPermissions {
    can_create_servers: boolean;
    can_create_rooms: boolean;
    can_manage_servers: boolean;
}

const DEFAULT_PERMISSIONS: NixorPermissions = {
    can_create_servers: false,
    can_create_rooms: false,
    can_manage_servers: false,
};

export function getNixorPermissions(): NixorPermissions {
    const config = SdkConfig.get();

    const nixorConfig = (config as any)?.nixor as
        | {
              governance_enabled?: boolean;
              dev_permissions?: Partial<NixorPermissions>;
          }
        | undefined;

    if (!nixorConfig) return DEFAULT_PERMISSIONS;

    // Temporary local development mode.
    // Later this will be replaced by a call to Governance API.
    if (!nixorConfig.governance_enabled) {
        return {
            ...DEFAULT_PERMISSIONS,
            ...nixorConfig.dev_permissions,
        };
    }

    return DEFAULT_PERMISSIONS;
}

export function canCreateNixorServer(): boolean {
    return getNixorPermissions().can_create_servers;
}

export function canCreateNixorRoom(): boolean {
    return getNixorPermissions().can_create_rooms;
}