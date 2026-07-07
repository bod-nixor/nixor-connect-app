import SdkConfig from "../SdkConfig";

interface NixorConfig {
    panapticon_api_base_url?: string;
    panapticon_enabled?: boolean;
    dev_panapticon_api_token?: string;
}

export interface NixorServer {
    public_id: string;
    matrix_space_id: string;
    name: string;
    topic?: string;
    visibility: "private" | "public";
    created_by_matrix_user_id: string;
    server_admins: string[];
    server_moderators: string[];
    created_at: string;
}

export interface NixorChannel {
    public_id: string;
    server_public_id: string;
    matrix_space_id: string;
    matrix_room_id: string;
    name: string;
    topic?: string;
    visibility: "private" | "public";
    created_by_matrix_user_id: string;
    created_at: string;
}

export interface CreateChannelInput {
    requester_matrix_user_id: string;
    name: string;
    topic?: string;
    visibility?: "private" | "public";
}

export interface CreateServerInput {
    requester_matrix_user_id: string;
    name: string;
    topic?: string;
    visibility?: "private" | "public";
    server_admins?: string[];
    server_moderators?: string[];
}

interface RoleAssignmentInput {
    requester_matrix_user_id: string;
}

interface AssignServerAdminInput extends RoleAssignmentInput {
    admin_matrix_user_id: string;
}

interface AssignServerModeratorInput extends RoleAssignmentInput {
    moderator_matrix_user_id: string;
}

interface ServerLookupResponse {
    ok: true;
    server: NixorServer;
}

interface CreateServerResponse {
    ok: true;
    server: NixorServer;
}

interface CreateChannelResponse {
    ok: true;
    channel: NixorChannel;
}

interface ChannelsResponse {
    ok: true;
    channels: NixorChannel[];
}

interface ServerAdminsResponse {
    ok: true;
    server_admins: string[];
    server?: NixorServer;
}

interface ServerModeratorsResponse {
    ok: true;
    server_moderators: string[];
    server?: NixorServer;
}

interface ErrorResponse {
    ok?: false;
    error?: string;
}

function getNixorConfig(): NixorConfig | undefined {
    return SdkConfig.get()?.nixor as NixorConfig | undefined;
}

function getPanapticonBaseUrl(): string {
    const nixorConfig = getNixorConfig();

    if (!nixorConfig?.panapticon_enabled) {
        throw new Error("Panapticon API is disabled");
    }

    const baseUrl = nixorConfig.panapticon_api_base_url?.replace(/\/$/, "");

    if (!baseUrl) {
        throw new Error("Missing nixor.panapticon_api_base_url in config.json");
    }

    return baseUrl;
}

function getPanapticonHeaders(): HeadersInit {
    const nixorConfig = getNixorConfig();

    return {
        "Content-Type": "application/json",
        ...(nixorConfig?.dev_panapticon_api_token
            ? { Authorization: `Bearer ${nixorConfig.dev_panapticon_api_token}` }
            : {}),
    };
}

async function requestPanapticon<T>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl = getPanapticonBaseUrl();

    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            ...getPanapticonHeaders(),
            ...(init.headers ?? {}),
        },
    });

    const body = (await response.json().catch(() => ({}))) as ErrorResponse | T;

    if (!response.ok) {
        const errorBody = body as ErrorResponse;
        throw new Error(errorBody.error || `Panapticon API request failed with status ${response.status}`);
    }

    return body as T;
}

export async function getServerBySpaceId(spaceId: string): Promise<NixorServer> {
    const encodedSpaceId = encodeURIComponent(spaceId);

    const response = await requestPanapticon<ServerLookupResponse>(`/api/spaces/${encodedSpaceId}/server`, {
        method: "GET",
    });

    return response.server;
}

export async function getServer(serverId: string): Promise<NixorServer> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestPanapticon<ServerLookupResponse>(`/api/servers/${encodedServerId}`, {
        method: "GET",
    });

    return response.server;
}

export async function createServer(input: CreateServerInput): Promise<NixorServer> {
    const response = await requestPanapticon<CreateServerResponse>("/api/servers", {
        method: "POST",
        body: JSON.stringify(input),
    });

    return response.server;
}

export async function createChannel(serverId: string, input: CreateChannelInput): Promise<NixorChannel> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestPanapticon<CreateChannelResponse>(`/api/servers/${encodedServerId}/channels`, {
        method: "POST",
        body: JSON.stringify(input),
    });

    return response.channel;
}

export async function getServerChannels(serverId: string): Promise<NixorChannel[]> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestPanapticon<ChannelsResponse>(`/api/servers/${encodedServerId}/channels`, {
        method: "GET",
    });

    return response.channels;
}

export async function getServerAdmins(serverId: string): Promise<string[]> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestPanapticon<ServerAdminsResponse>(`/api/servers/${encodedServerId}/admins`, {
        method: "GET",
    });

    return response.server_admins;
}

export async function addServerAdmin(serverId: string, input: AssignServerAdminInput): Promise<ServerAdminsResponse> {
    const encodedServerId = encodeURIComponent(serverId);

    return requestPanapticon<ServerAdminsResponse>(`/api/servers/${encodedServerId}/admins`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function removeServerAdmin(
    serverId: string,
    requesterMatrixUserId: string,
    targetMatrixUserId: string,
): Promise<ServerAdminsResponse> {
    const encodedServerId = encodeURIComponent(serverId);
    const encodedUserId = encodeURIComponent(targetMatrixUserId);

    return requestPanapticon<ServerAdminsResponse>(`/api/servers/${encodedServerId}/admins/${encodedUserId}`, {
        method: "DELETE",
        body: JSON.stringify({
            requester_matrix_user_id: requesterMatrixUserId,
        }),
    });
}

export async function getServerModerators(serverId: string): Promise<string[]> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestPanapticon<ServerModeratorsResponse>(`/api/servers/${encodedServerId}/moderators`, {
        method: "GET",
    });

    return response.server_moderators;
}

export async function addServerModerator(
    serverId: string,
    input: AssignServerModeratorInput,
): Promise<ServerModeratorsResponse> {
    const encodedServerId = encodeURIComponent(serverId);

    return requestPanapticon<ServerModeratorsResponse>(`/api/servers/${encodedServerId}/moderators`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function removeServerModerator(
    serverId: string,
    requesterMatrixUserId: string,
    targetMatrixUserId: string,
): Promise<ServerModeratorsResponse> {
    const encodedServerId = encodeURIComponent(serverId);
    const encodedUserId = encodeURIComponent(targetMatrixUserId);

    return requestPanapticon<ServerModeratorsResponse>(`/api/servers/${encodedServerId}/moderators/${encodedUserId}`, {
        method: "DELETE",
        body: JSON.stringify({
            requester_matrix_user_id: requesterMatrixUserId,
        }),
    });
}

export function isPanapticonEnabled(): boolean {
    return getNixorConfig()?.panapticon_enabled === true;
}
