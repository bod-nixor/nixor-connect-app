/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useEffect, useMemo, useState } from "react";
import { type MatrixEvent } from "matrix-js-sdk/src/matrix";

import BaseDialog from "./BaseDialog";
import AccessibleButton from "../elements/AccessibleButton";
import { MatrixClientPeg } from "../../../MatrixClientPeg";
import {
    createActionItem,
    createReport,
    getNixorIdentity,
    hasNixorCapability,
    searchConnectDirectory,
    type DirectoryUser,
    type NixorIdentity,
} from "../../../nixor/accountabilityApi";

interface IProps {
    mxEvent: MatrixEvent;
    initialMode: "action" | "report";
    onFinished: (created?: boolean) => void;
}

function messageBody(mxEvent: MatrixEvent): string {
    const body = mxEvent.getContent().body;
    return typeof body === "string" && body.trim() ? body.trim().slice(0, 20_000) : "Linked Matrix message";
}

function defaultTitle(body: string): string {
    const firstLine = body.split(/\r?\n/, 1)[0].trim();
    return (firstLine || "Follow up on Matrix message").slice(0, 240);
}

function formValue(form: FormData, name: string, fallback = ""): string {
    const value = form.get(name);
    return typeof value === "string" ? value : fallback;
}

const NixorMessageGovernanceDialog: React.FC<IProps> = ({ mxEvent, initialMode, onFinished }) => {
    const body = useMemo(() => messageBody(mxEvent), [mxEvent]);
    const senderName = mxEvent.sender?.name || "Unknown sender";
    const channelName = MatrixClientPeg.get()?.getRoom(mxEvent.getRoomId() ?? "")?.name || "Direct message";
    const [mode, setMode] = useState<"action" | "report">(initialMode);
    const [identity, setIdentity] = useState<NixorIdentity | null>(null);
    const [identityError, setIdentityError] = useState<string | null>(null);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<string | null>(null);
    const [assigneeQuery, setAssigneeQuery] = useState("");
    const [assigneeOptions, setAssigneeOptions] = useState<DirectoryUser[]>([]);
    const [assignee, setAssignee] = useState<DirectoryUser | null>(null);

    useEffect(() => {
        let disposed = false;
        void getNixorIdentity().then((value) => {
            if (disposed) return;
            setIdentity(value);
            if (initialMode === "action" && !hasNixorCapability(value, "action.create")) setMode("report");
        }).catch((reason: unknown) => {
            if (!disposed) setIdentityError(reason instanceof Error ? reason.message : "Could not verify your role.");
        });
        return () => { disposed = true; };
    }, [initialMode]);

    useEffect(() => {
        if (assigneeQuery.trim().length < 2) {
            setAssigneeOptions([]);
            return;
        }
        let disposed = false;
        const timeout = window.setTimeout(() => {
            void searchConnectDirectory(assigneeQuery).then((users) => {
                if (!disposed) setAssigneeOptions(users);
            }).catch(() => {
                if (!disposed) setAssigneeOptions([]);
            });
        }, 250);
        return () => {
            disposed = true;
            window.clearTimeout(timeout);
        };
    }, [assigneeQuery]);

    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!identity) return;
        const roomId = mxEvent.getRoomId();
        const eventId = mxEvent.getId();
        if (!roomId || !eventId) {
            setError("This message has not finished sending and cannot yet be linked to a governed record.");
            return;
        }
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError(null);
        setCreated(null);
        try {
            if (mode === "action") {
                const dueValue = formValue(form, "due_at");
                const dueDate = dueValue ? new Date(dueValue) : null;
                const result = await createActionItem({
                    title: formValue(form, "title"),
                    description: formValue(form, "description"),
                    source_matrix_room_id: roomId,
                    source_matrix_event_id: eventId,
                    assignees: [{ matrix_user_id: assignee?.matrix_user_id ?? identity.identity.matrix_user_id, role: "assignee" }],
                    priority: formValue(form, "priority") as "low" | "normal" | "high" | "critical",
                    due_at: dueDate && !Number.isNaN(dueDate.getTime()) ? dueDate.toISOString() : undefined,
                    assignment_reason: "Created from a Matrix message in Nixor Connect",
                });
                setCreated(`Action item ${result.public_id} was created and linked to this exact message.`);
            } else {
                const explanation = formValue(form, "description").trim();
                await createReport({
                    category: formValue(form, "category", "message_concern"),
                    description: explanation || "No additional explanation was provided.",
                    subjects: mxEvent.getSender()
                        ? [{ type: "user", public_id: mxEvent.getSender()!, display_label: mxEvent.sender?.name }]
                        : [],
                    targets: [{ type: "message", matrix_room_id: roomId, matrix_event_id: eventId }],
                });
                setCreated("Thanks. Your report has been submitted for review.");
            }
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "The governed record was not created.");
        } finally {
            setBusy(false);
        }
    };

    const canCreateAction = hasNixorCapability(identity, "action.create");
    return (
        <BaseDialog
            className="mx_NixorMessageGovernanceDialog"
            title={mode === "action" ? "Create accountable action" : "Report this message"}
            onFinished={() => onFinished(Boolean(created))}
            hasCancel
        >
            <div className="mx_NixorMessageGovernanceDialog_tabs" role="tablist" aria-label="Governed message action">
                {canCreateAction && (
                    <AccessibleButton role="tab" aria-selected={mode === "action"} onClick={() => setMode("action")}>
                        Action item
                    </AccessibleButton>
                )}
                <AccessibleButton role="tab" aria-selected={mode === "report"} onClick={() => setMode("report")}>
                    Report
                </AccessibleButton>
            </div>
            {identityError && <p className="mx_NixorWorkspace_error" role="alert">{identityError}</p>}
            {!identity && !identityError && <p role="status">Verifying your Connect role…</p>}
            {identity && !created && (
                <form className="mx_NixorMessageGovernanceDialog_form" onSubmit={(event) => void submit(event)}>
                    {mode === "action" ? (
                        <>
                            <p>This creates a durable assignment linked to the selected message.</p>
                            <label>Title<input name="title" defaultValue={defaultTitle(body)} minLength={3} maxLength={240} required /></label>
                            <label>Description<textarea name="description" defaultValue={body} minLength={1} maxLength={20000} required /></label>
                            <label>Assignee
                                <input
                                    type="search"
                                    value={assigneeQuery}
                                    onChange={(event) => setAssigneeQuery(event.target.value)}
                                    placeholder="Search people by name"
                                    aria-describedby="nixor-assignee-help"
                                />
                            </label>
                            <p id="nixor-assignee-help" className="mx_NixorWorkspace_hint">
                                {assignee ? `Selected: ${assignee.display_name || "Nixor member"}` : "No person selected: this action will be assigned to you."}
                            </p>
                            {assigneeOptions.length > 0 && <div role="listbox" aria-label="Matching people" className="mx_NixorWorkspace_pickerOptions">
                                {assigneeOptions.map((user) => <AccessibleButton
                                    key={user.matrix_user_id}
                                    role="option"
                                    aria-selected={assignee?.matrix_user_id === user.matrix_user_id}
                                    onClick={() => { setAssignee(user); setAssigneeOptions([]); setAssigneeQuery(""); }}
                                >{user.display_name || "Nixor member"}</AccessibleButton>)}
                            </div>}
                            <label>Priority<select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                            <label>Due date and time (optional)<input name="due_at" type="datetime-local" /></label>
                        </>
                    ) : (
                        <>
                            <div className="mx_NixorWorkspace_card">
                                <p><strong>Sender</strong><br />{senderName}</p>
                                <p><strong>Message</strong><br />{body}</p>
                                <p><strong>Channel</strong><br />{channelName}</p>
                            </div>
                            <p>Only the selected message and bounded context are secured for authorized review.</p>
                            <label>Category<select name="category" defaultValue="harassment"><option value="harassment">Harassment or bullying</option><option value="inappropriate_content">Inappropriate content</option><option value="threat_or_safety">Threat or safety concern</option><option value="spam">Spam</option><option value="other">Other</option></select></label>
                            <label>Explanation (optional)<textarea name="description" maxLength={50000} placeholder="Add any context that would help the reviewer." /></label>
                        </>
                    )}
                    {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
                    <div className="mx_NixorMessageGovernanceDialog_actions">
                        <button type="button" onClick={() => onFinished(false)}>Cancel</button>
                        <button type="submit" disabled={busy}>{busy ? "Saving…" : mode === "action" ? "Create action item" : "Submit report"}</button>
                    </div>
                </form>
            )}
            {created && (
                <div className="mx_NixorWorkspace_success" role="status">
                    <p>{created}</p>
                    <AccessibleButton onClick={() => onFinished(true)}>Done</AccessibleButton>
                </div>
            )}
        </BaseDialog>
    );
};

export default NixorMessageGovernanceDialog;
