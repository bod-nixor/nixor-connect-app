import SdkConfig from "../SdkConfig";

interface NixorConfig {
    governance_api_base_url?: string;
    governance_enabled?: boolean;
    dev_governance_api_token?: string;
}

export interface NixorServer {
    public_id: string;
    matrix_space_id: string;
    name: string;
    topic?: string;
    visibility: "private" | "public";
    created_by_matrix_user_id: string;
    server_admins: string[];
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

interface ServerLookupResponse {
    ok: true;
    server: NixorServer;
}

interface CreateChannelResponse {
    ok: true;
    channel: NixorChannel;
}

interface ErrorResponse {
    ok?: false;
    error?: string;
}

function getNixorConfig(): NixorConfig | undefined {
    return SdkConfig.get()?.nixor as NixorConfig | undefined;
}

function getGovernanceBaseUrl(): string {
    const nixorConfig = getNixorConfig();

    if (!nixorConfig?.governance_enabled) {
        throw new Error("Nixor Governance API is disabled");
    }

    const baseUrl = nixorConfig.governance_api_base_url?.replace(/\/$/, "");

    if (!baseUrl) {
        throw new Error("Missing nixor.governance_api_base_url in config.json");
    }

    return baseUrl;
}

function getGovernanceHeaders(): HeadersInit {
    const nixorConfig = getNixorConfig();

    return {
        "Content-Type": "application/json",
        ...(nixorConfig?.dev_governance_api_token
            ? { Authorization: `Bearer ${nixorConfig.dev_governance_api_token}` }
            : {}),
    };
}

async function requestGovernance<T>(path: string, init: RequestInit = {}): Promise<T> {
    const baseUrl = getGovernanceBaseUrl();

    const response = await fetch(`${baseUrl}${path}`, {
        ...init,
        headers: {
            ...getGovernanceHeaders(),
            ...(init.headers ?? {}),
        },
    });

    const body = (await response.json().catch(() => ({}))) as ErrorResponse | T;

    if (!response.ok) {
        const errorBody = body as ErrorResponse;
        throw new Error(errorBody.error || `Governance API request failed with status ${response.status}`);
    }

    return body as T;
}

export async function getServerBySpaceId(spaceId: string): Promise<NixorServer> {
    const encodedSpaceId = encodeURIComponent(spaceId);

    const response = await requestGovernance<ServerLookupResponse>(`/api/spaces/${encodedSpaceId}/server`, {
        method: "GET",
    });

    return response.server;
}

export async function createChannel(serverId: string, input: CreateChannelInput): Promise<NixorChannel> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestGovernance<CreateChannelResponse>(`/api/servers/${encodedServerId}/channels`, {
        method: "POST",
        body: JSON.stringify(input),
    });

    return response.channel;
}

export function isNixorGovernanceEnabled(): boolean {
    return getNixorConfig()?.governance_enabled === true;
}