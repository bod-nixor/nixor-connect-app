/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState } from "react";
import { type MatrixClient, type MatrixEvent, MsgType, type Room } from "matrix-js-sdk/src/matrix";
import { type RoomMessageEventContent } from "matrix-js-sdk/src/types";

import AccessibleButton from "../elements/AccessibleButton";
import { getNixorBotDmMarker, submitNixorBotInteraction } from "../../../nixor/bots";

interface RichAction {
    id: string;
    label: string;
    style?: "primary" | "secondary" | "danger";
}

interface RichBotContent {
    version: number;
    type: string;
    app_id: string;
    title?: string;
    body?: string;
    fields?: Array<{ label: string; value: string }>;
    actions?: RichAction[];
}

export function parseNixorBotRichContent(value: unknown): RichBotContent | null {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const content = value as Record<string, unknown>;
    if (content.version !== 1 || typeof content.type !== "string" || typeof content.app_id !== "string") return null;
    const fields = Array.isArray(content.fields)
        ? content.fields.filter((field): field is { label: string; value: string } => {
            return !!field && typeof field === "object" && typeof (field as Record<string, unknown>).label === "string" && typeof (field as Record<string, unknown>).value === "string";
        })
        : [];
    const actions = Array.isArray(content.actions)
        ? content.actions.filter((action): action is RichAction => {
            return !!action && typeof action === "object" && typeof (action as Record<string, unknown>).id === "string" && typeof (action as Record<string, unknown>).label === "string";
        })
        : [];
    return {
        version: 1,
        type: content.type,
        app_id: content.app_id,
        title: typeof content.title === "string" ? content.title : undefined,
        body: typeof content.body === "string" ? content.body : undefined,
        fields,
        actions,
    };
}

const NixorBotRichMessage: React.FC<{
    mxEvent: MatrixEvent;
    room?: Room;
    client: MatrixClient;
}> = ({ mxEvent, room, client }) => {
    const rich = parseNixorBotRichContent(mxEvent.getContent()["com.nixor.bot"]);
    const marker = getNixorBotDmMarker(room);
    const [submitted, setSubmitted] = useState<Record<string, boolean>>({});

    if (!rich) return null;

    const onAction = async (action: RichAction): Promise<void> => {
        if (!room || !marker || submitted[action.id]) return;
        setSubmitted((current) => ({ ...current, [action.id]: true }));
        const response = await client.sendMessage(room.roomId, null, {
            msgtype: MsgType.Text,
            body: action.label,
            "com.nixor.bot.interaction": {
                version: 1,
                app_id: marker.app_id,
                type: "action",
                action_id: action.id,
                parent_event_id: mxEvent.getId(),
            },
        } as RoomMessageEventContent);
        await submitNixorBotInteraction({
            appId: marker.app_id,
            roomId: room.roomId,
            sourceEventId: response.event_id,
            parentEventId: mxEvent.getId(),
            interactionType: "action",
            actionId: action.id,
            clientRequestId: crypto.randomUUID(),
        });
    };

    return (
        <div className="mx_NixorBotRichCard">
            {rich.title && <div className="mx_NixorBotRichCard_title">{rich.title}</div>}
            <div className="mx_NixorBotRichCard_body">{rich.body || mxEvent.getContent().body}</div>
            {rich.fields && rich.fields.length > 0 && (
                <dl className="mx_NixorBotRichCard_fields">
                    {rich.fields.map((field) => (
                        <div key={`${field.label}:${field.value}`}>
                            <dt>{field.label}</dt>
                            <dd>{field.value}</dd>
                        </div>
                    ))}
                </dl>
            )}
            {rich.actions && rich.actions.length > 0 && (
                <div className="mx_NixorBotRichCard_actions">
                    {rich.actions.map((action) => (
                        <AccessibleButton
                            key={action.id}
                            disabled={submitted[action.id]}
                            className={
                                action.style === "primary"
                                    ? "mx_NixorBotRichCard_actionPrimary"
                                    : action.style === "danger"
                                        ? "mx_NixorBotRichCard_actionDanger"
                                        : undefined
                            }
                            onClick={() => void onAction(action)}
                        >
                            {submitted[action.id] ? "Sent" : action.label}
                        </AccessibleButton>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NixorBotRichMessage;
