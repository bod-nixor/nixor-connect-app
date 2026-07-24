/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import SdkConfig from "../SdkConfig";
import { requestNixorConnect } from "./accountabilityApi";

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

function getNixorConfig(): NixorConfig | undefined {
    return SdkConfig.get()?.nixor as NixorConfig | undefined;
}

function getGovernanceHeaders(): HeadersInit {
    const nixorConfig = getNixorConfig();

    return nixorConfig?.dev_governance_api_token
        ? { Authorization: `Bearer ${nixorConfig.dev_governance_api_token}` }
        : {};
}

async function requestGovernance<T>(path: string, init: RequestInit = {}): Promise<T> {
    const nixorConfig = getNixorConfig();

    if (!nixorConfig?.governance_enabled) {
        throw new Error("Nixor Governance API is disabled");
    }

    return requestNixorConnect<T>(
        path,
        {
            ...init,
            headers: {
                ...getGovernanceHeaders(),
                ...(init.headers ?? {}),
            },
        },
        { skipCsrfBootstrap: Boolean(nixorConfig.dev_governance_api_token) },
    );
}

export async function getServerBySpaceId(spaceId: string): Promise<NixorServer> {
    const encodedSpaceId = encodeURIComponent(spaceId);

    const response = await requestGovernance<ServerLookupResponse>(`/api/spaces/${encodedSpaceId}/server`, {
        method: "GET",
    });

    return response.server;
}

export async function getServer(serverId: string): Promise<NixorServer> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestGovernance<ServerLookupResponse>(`/api/servers/${encodedServerId}`, {
        method: "GET",
    });

    return response.server;
}

export async function createServer(input: CreateServerInput): Promise<NixorServer> {
    const response = await requestGovernance<CreateServerResponse>("/api/servers", {
        method: "POST",
        body: JSON.stringify(input),
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

export async function getServerChannels(serverId: string): Promise<NixorChannel[]> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestGovernance<ChannelsResponse>(`/api/servers/${encodedServerId}/channels`, {
        method: "GET",
    });

    return response.channels;
}

export async function getServerAdmins(serverId: string): Promise<string[]> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestGovernance<ServerAdminsResponse>(`/api/servers/${encodedServerId}/admins`, {
        method: "GET",
    });

    return response.server_admins;
}

export async function addServerAdmin(serverId: string, input: AssignServerAdminInput): Promise<ServerAdminsResponse> {
    const encodedServerId = encodeURIComponent(serverId);

    return requestGovernance<ServerAdminsResponse>(`/api/servers/${encodedServerId}/admins`, {
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

    return requestGovernance<ServerAdminsResponse>(`/api/servers/${encodedServerId}/admins/${encodedUserId}`, {
        method: "DELETE",
        body: JSON.stringify({
            requester_matrix_user_id: requesterMatrixUserId,
        }),
    });
}

export async function getServerModerators(serverId: string): Promise<string[]> {
    const encodedServerId = encodeURIComponent(serverId);

    const response = await requestGovernance<ServerModeratorsResponse>(`/api/servers/${encodedServerId}/moderators`, {
        method: "GET",
    });

    return response.server_moderators;
}

export async function addServerModerator(
    serverId: string,
    input: AssignServerModeratorInput,
): Promise<ServerModeratorsResponse> {
    const encodedServerId = encodeURIComponent(serverId);

    return requestGovernance<ServerModeratorsResponse>(`/api/servers/${encodedServerId}/moderators`, {
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

    return requestGovernance<ServerModeratorsResponse>(`/api/servers/${encodedServerId}/moderators/${encodedUserId}`, {
        method: "DELETE",
        body: JSON.stringify({
            requester_matrix_user_id: requesterMatrixUserId,
        }),
    });
}

export function isNixorGovernanceEnabled(): boolean {
    return getNixorConfig()?.governance_enabled === true;
}
