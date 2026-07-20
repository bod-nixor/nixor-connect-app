/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useState } from "react";

import {
    type GovernanceDecision,
    hasNixorCapability,
    type NixorIdentity,
    reviseDecision,
    supersedeDecision,
    updateDecisionStatus,
} from "../../../nixor/accountabilityApi";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function lineFormValue(form: FormData, name: string): string[] {
    return Array.from(new Set(formValue(form, name).split(/\r?\n/).map((value) => value.trim()).filter(Boolean)));
}

function lineListDefault(values: unknown[] | undefined): string {
    return (values ?? []).map((value) => typeof value === "string" ? value : JSON.stringify(value)).join("\n");
}

function linkedDiscussionValue(decision: GovernanceDecision, key: string): string {
    const value = decision.linked_discussion?.[key];
    return typeof value === "string" ? value : "";
}

function dateTimeLocalValue(value: string | null | undefined): string {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
    return local.toISOString().slice(0, 16);
}

function toIsoDateTime(value: string): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const NixorDecisionCard: React.FC<{
    decision: GovernanceDecision;
    identity: NixorIdentity;
    onUpdated: () => Promise<void>;
}> = ({ decision, identity, onUpdated }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const ownUserId = identity.identity.matrix_user_id;
    const isOwner = decision.owner_matrix_user_id === ownUserId || decision.created_by_matrix_user_id === ownUserId;
    const canApprove = hasNixorCapability(identity, "decision.approve");
    const [outcome, setOutcome] = useState<"approved" | "rejected" | "withdrawn">(
        canApprove ? "approved" : "withdrawn",
    );
    const canRevise = decision.status === "proposed" && (isOwner || hasNixorCapability(identity, "decision.create"));
    const run = async (operation: () => Promise<void>, success: string): Promise<void> => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await operation();
            setMessage(success);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Decision was not updated.");
        } finally {
            setBusy(false);
        }
    };
    const revise = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const roomId = formValue(form, "matrix_room_id");
        const eventId = formValue(form, "matrix_event_id");
        void run(() => reviseDecision(decision.public_id, {
            title: formValue(form, "title"),
            statement: formValue(form, "statement"),
            linked_discussion: roomId ? {
                matrix_room_id: roomId,
                ...(eventId ? { matrix_event_id: eventId } : {}),
            } : undefined,
            alternatives: lineFormValue(form, "alternatives"),
            rationale: formValue(form, "rationale") || undefined,
            conditions: lineFormValue(form, "conditions"),
            follow_up_actions: lineFormValue(form, "follow_up_actions"),
            review_at: toIsoDateTime(formValue(form, "review_at")),
            attachments: decision.attachments ?? [],
            change_summary: formValue(form, "change_summary"),
        }), "A new immutable proposal version was created.");
    };
    const changeStatus = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const status = formValue(form, "status") as "approved" | "rejected" | "withdrawn";
        const evidence = formValue(form, "evidence");
        void run(
            () => updateDecisionStatus(
                decision.public_id,
                status,
                formValue(form, "reason"),
                status === "approved" ? { summary: evidence } : undefined,
            ),
            `Decision moved to ${status}.`,
        );
    };
    const supersede = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => supersedeDecision(
                decision.public_id,
                formValue(form, "replacement"),
                formValue(form, "reason"),
                { summary: formValue(form, "evidence") },
            ),
            "The approved decision was superseded and the replacement approved atomically.",
        );
    };
    const statusOptions: Array<"approved" | "rejected" | "withdrawn"> = [];
    if (decision.status === "proposed" && canApprove) statusOptions.push("approved", "rejected");
    if (decision.status === "proposed" && (isOwner || canApprove)) statusOptions.push("withdrawn");

    return (
        <article className="mx_NixorWorkspace_card">
            <div className="mx_NixorWorkspace_cardHeader"><h2>{decision.title}</h2><span className="mx_NixorStatusPill">{decision.status}</span></div>
            <p>{decision.current_statement}</p>
            <p>Deciding body: {decision.deciding_body} · Owner: {decision.owner_matrix_user_id}</p>
            <p>Version {decision.current_version} · Visibility: {decision.visibility}</p>
            {decision.status === "approved" && <p className="mx_NixorWorkspace_disclosure">Approved content is immutable. Replace it only through an explicit supersession.</p>}
            {canRevise && <details>
                <summary>Create proposal revision</summary>
                <form onSubmit={revise}>
                    <label>Title<input name="title" defaultValue={decision.title} minLength={3} maxLength={240} required /></label>
                    <label>Decision statement<textarea name="statement" defaultValue={decision.current_statement} minLength={3} maxLength={50000} required /></label>
                    <label>Rationale<textarea name="rationale" defaultValue={decision.rationale ?? ""} maxLength={50000} /></label>
                    <label>Linked discussion room ID<input name="matrix_room_id" defaultValue={linkedDiscussionValue(decision, "matrix_room_id")} maxLength={255} /></label>
                    <label>Linked discussion event ID<input name="matrix_event_id" defaultValue={linkedDiscussionValue(decision, "matrix_event_id")} maxLength={255} /></label>
                    <label>Alternatives considered (one per line)<textarea name="alternatives" defaultValue={lineListDefault(decision.alternatives)} maxLength={20000} /></label>
                    <label>Approval conditions (one per line)<textarea name="conditions" defaultValue={lineListDefault(decision.conditions)} maxLength={20000} /></label>
                    <label>Follow-up actions (one per line)<textarea name="follow_up_actions" defaultValue={lineListDefault(decision.follow_up_actions)} maxLength={20000} /></label>
                    <label>Review date<input name="review_at" type="datetime-local" defaultValue={dateTimeLocalValue(decision.review_at)} /></label>
                    {(decision.attachments?.length ?? 0) > 0 && <p>{decision.attachments?.length} existing attachment link(s) will be preserved.</p>}
                    <label>Material change summary<textarea name="change_summary" minLength={3} maxLength={2000} required /></label>
                    <button type="submit" disabled={busy}>Create revision</button>
                </form>
            </details>}
            {statusOptions.length > 0 && <details>
                <summary>Approve, reject, or withdraw</summary>
                <form onSubmit={changeStatus}>
                    <label>Outcome<select name="status" value={outcome} onChange={(event) => setOutcome(event.target.value as "approved" | "rejected" | "withdrawn")}>{statusOptions.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                    <label>Reason<textarea name="reason" minLength={3} maxLength={5000} required /></label>
                    {canApprove && <label>Approval evidence summary (required when approving)<textarea name="evidence" minLength={1} maxLength={5000} required={outcome === "approved"} /></label>}
                    <button type="submit" disabled={busy}>Confirm decision outcome</button>
                </form>
            </details>}
            {decision.status === "approved" && canApprove && <details>
                <summary>Supersede with a proposed replacement</summary>
                <form onSubmit={supersede}>
                    <label>Replacement decision public ID<input name="replacement" minLength={3} maxLength={160} required /></label>
                    <label>Reason<textarea name="reason" minLength={3} maxLength={5000} required /></label>
                    <label>Approval evidence summary<textarea name="evidence" minLength={1} maxLength={5000} required /></label>
                    <button type="submit" disabled={busy}>Confirm atomic supersession</button>
                </form>
            </details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </article>
    );
};

export default NixorDecisionCard;
