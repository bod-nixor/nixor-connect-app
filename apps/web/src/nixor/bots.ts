/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type MatrixClient, MsgType, type Room } from "matrix-js-sdk/src/matrix";
import { logger } from "matrix-js-sdk/src/logger";
import { type RoomMessageEventContent } from "matrix-js-sdk/src/types";

import { getNixorConnectApiBaseUrl } from "./sso";

export interface NixorBotSummary {
    app_id: string;
    name: string;
    icon?: string;
    avatar_url?: string;
    short_description?: string;
    long_description?: string;
    category?: string;
    verified: boolean;
    published: boolean;
    availability: string;
    featured?: boolean;
    has_dm?: boolean;
    notifications_enabled?: boolean;
    notification_level?: "normal" | "important";
    favourited?: boolean;
    commands?: Array<{ id: string; label: string; description?: string; icon?: string }>;
}

export interface NixorBotField {
    id: string;
    type: "text" | "textarea" | "number" | "select" | "multiselect" | "date" | "time" | "boolean";
    label: string;
    required?: boolean;
    options?: Array<{ value: string; label: string }>;
    placeholder?: string;
    help_text?: string;
    min?: number;
    max?: number;
    min_length?: number;
    max_length?: number;
    default?: unknown;
}

export interface NixorBotCommand {
    id: string;
    label: string;
    description?: string;
    icon?: string;
    enabled: boolean;
    fields: NixorBotField[];
    confirmation: boolean;
}

export interface NixorBotManifest {
    version: number;
    commands: NixorBotCommand[];
}

export interface NixorBotDmMarker {
    app_id: string;
    bot_matrix_user_id: string;
    target_matrix_user_id: string;
    version: number;
}

async function requestBotApi<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`${getNixorConnectApiBaseUrl()}${path}`, {
        ...init,
        credentials: "include",
        headers: {
            "Content-Type": "application/json",
            ...(init.headers ?? {}),
        },
    });
    const body = (await response.json().catch(() => ({}))) as T & { error?: string };
    if (!response.ok) {
        throw new Error(body.error || `Nixor bot request failed: ${response.status}`);
    }
    return body;
}

export async function listNixorBots(input: { search?: string; category?: string } = {}): Promise<NixorBotSummary[]> {
    const params = new URLSearchParams();
    if (input.search) params.set("search", input.search);
    if (input.category) params.set("category", input.category);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const response = await requestBotApi<{ ok: true; bots: NixorBotSummary[] }>(`/v1/bots${suffix}`);
    return response.bots;
}

export async function openNixorBot(appId: string): Promise<{ room_id: string; bot: NixorBotSummary }> {
    const response = await requestBotApi<{ ok: true; room_id: string; bot: NixorBotSummary }>(
        `/v1/bots/${encodeURIComponent(appId)}/open`,
        { method: "POST", body: "{}" },
    );
    return { room_id: response.room_id, bot: response.bot };
}

export async function getNixorBotCommands(appId: string): Promise<NixorBotManifest> {
    const response = await requestBotApi<{ ok: true; manifest: NixorBotManifest }>(
        `/v1/bots/${encodeURIComponent(appId)}/commands`,
    );
    return response.manifest;
}

export async function updateNixorBotPreferences(appId: string, input: {
    notifications_enabled?: boolean;
    notification_level?: "normal" | "important";
    favourited?: boolean;
}): Promise<void> {
    await requestBotApi(`/v1/bots/${encodeURIComponent(appId)}/preferences`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function submitNixorBotInteraction(input: {
    appId: string;
    roomId: string;
    sourceEventId?: string;
    parentEventId?: string;
    interactionType: "command" | "action" | "confirmation" | "message" | "file";
    commandId?: string;
    actionId?: string;
    parameters?: Record<string, unknown>;
    clientRequestId: string;
}): Promise<void> {
    await requestBotApi("/v1/bot-interactions", {
        method: "POST",
        body: JSON.stringify({
            app_id: input.appId,
            room_id: input.roomId,
            source_event_id: input.sourceEventId,
            parent_event_id: input.parentEventId,
            interaction_type: input.interactionType,
            command_id: input.commandId,
            action_id: input.actionId,
            parameters: input.parameters ?? {},
            client_request_id: input.clientRequestId,
        }),
    });
}

export function getNixorBotDmMarker(room?: Room | null): NixorBotDmMarker | null {
    if (!room) return null;

    const events = room.currentState.getStateEvents("com.nixor.bot.dm");
    const markerEvent = Array.isArray(events) ? events[0] : events;
    const content = markerEvent?.getContent();

    if (
        !content ||
        typeof content.app_id !== "string" ||
        typeof content.bot_matrix_user_id !== "string" ||
        typeof content.target_matrix_user_id !== "string"
    ) {
        return null;
    }

    return {
        app_id: content.app_id,
        bot_matrix_user_id: content.bot_matrix_user_id,
        target_matrix_user_id: content.target_matrix_user_id,
        version: typeof content.version === "number" ? content.version : 1,
    };
}

export async function sendNixorBotCommand(input: {
    client: MatrixClient;
    room: Room;
    marker: NixorBotDmMarker;
    command: NixorBotCommand;
    parameters: Record<string, unknown>;
}): Promise<void> {
    const summary = input.command.label;
    const content = {
        msgtype: MsgType.Text,
        body: summary,
        "com.nixor.bot.interaction": {
            version: 1,
            app_id: input.marker.app_id,
            type: "command",
            command_id: input.command.id,
        },
    };
    const response = await input.client.sendMessage(input.room.roomId, null, content as RoomMessageEventContent);
    await submitNixorBotInteraction({
        appId: input.marker.app_id,
        roomId: input.room.roomId,
        sourceEventId: response.event_id,
        interactionType: "command",
        commandId: input.command.id,
        parameters: input.parameters,
        clientRequestId: crypto.randomUUID(),
    });
}

export async function relayNixorBotFreeText(input: {
    room: Room;
    marker: NixorBotDmMarker;
    eventId: string;
    clientRequestId?: string;
}): Promise<void> {
    try {
        await submitNixorBotInteraction({
            appId: input.marker.app_id,
            roomId: input.room.roomId,
            sourceEventId: input.eventId,
            interactionType: "message",
            clientRequestId: input.clientRequestId ?? crypto.randomUUID(),
        });
    } catch (error) {
        logger.warn("Nixor bot free-text relay failed", error);
        throw error;
    }
}

export async function submitNixorBotAction(input: {
    room: Room;
    marker: NixorBotDmMarker;
    actionId: string;
    parentEventId?: string;
    sourceEventId?: string;
}): Promise<void> {
    await submitNixorBotInteraction({
        appId: input.marker.app_id,
        roomId: input.room.roomId,
        parentEventId: input.parentEventId,
        sourceEventId: input.sourceEventId,
        interactionType: "action",
        actionId: input.actionId,
        clientRequestId: crypto.randomUUID(),
    });
}
