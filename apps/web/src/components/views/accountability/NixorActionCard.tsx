/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useMemo, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import {
    type AccountabilityAction,
    type AccountabilityActionStatus,
    acknowledgeActionItem,
    addActionEvidence,
    changeActionDueDate,
    hasNixorCapability,
    type NixorIdentity,
    reassignActionItem,
    updateActionStatus,
} from "../../../nixor/accountabilityApi";

const TRANSITIONS: Record<AccountabilityActionStatus, AccountabilityActionStatus[]> = {
    proposed: ["assigned", "cancelled"],
    assigned: ["acknowledged", "overdue", "cancelled"],
    acknowledged: ["in_progress", "blocked", "submitted", "overdue", "cancelled"],
    in_progress: ["blocked", "submitted", "overdue", "cancelled"],
    blocked: ["in_progress", "submitted", "overdue", "cancelled"],
    submitted: ["accepted", "rejected"],
    rejected: ["in_progress", "blocked", "submitted", "overdue", "cancelled"],
    overdue: ["acknowledged", "in_progress", "blocked", "submitted", "cancelled"],
    accepted: [],
    cancelled: [],
};

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string | null): string {
    if (!value) return "No deadline";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toIsoDateTime(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

interface Props {
    action: AccountabilityAction;
    identity: NixorIdentity;
    onUpdated: () => Promise<void>;
}

const NixorActionCard: React.FC<Props> = ({ action, identity, onUpdated }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const ownUserId = identity.identity.matrix_user_id;
    const myAssignment = action.assignees.find((assignee) => assignee.matrix_user_id === ownUserId);
    const canAssign = hasNixorCapability(identity, "action.assign");
    const canReview = action.acceptance_reviewer_matrix_user_id === ownUserId ||
        hasNixorCapability(identity, "action.review");
    const isCreator = action.creator_matrix_user_id === ownUserId;
    const overdue = action.status === "overdue" || Boolean(
        action.due_at && new Date(action.due_at).getTime() < Date.now() && !["accepted", "cancelled"].includes(action.status),
    );
    const availableTransitions = useMemo(() => TRANSITIONS[action.status].filter((status) => {
        if (["in_progress", "blocked", "submitted"].includes(status)) return Boolean(myAssignment);
        if (["accepted", "rejected"].includes(status)) return canReview;
        if (status === "cancelled") return isCreator || canAssign;
        return false;
    }), [action.status, canAssign, canReview, isCreator, myAssignment]);

    const run = async (operation: () => Promise<void>, success: string): Promise<void> => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await operation();
            setMessage(success);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Action item was not updated.");
        } finally {
            setBusy(false);
        }
    };

    const acknowledge = (): void => {
        void run(() => acknowledgeActionItem(action.public_id), "Assignment acknowledged.");
    };
    const changeStatus = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const status = formValue(form, "status");
        void run(
            () => updateActionStatus(action.public_id, status, formValue(form, "reason")),
            `Action moved to ${status.replaceAll("_", " ")}.`,
        );
    };
    const addEvidence = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const evidenceType = formValue(form, "evidence_type") as "link" | "note";
        const value = formValue(form, "reference");
        void run(
            async () => {
                await addActionEvidence(
                    action.public_id,
                    evidenceType,
                    formValue(form, "title"),
                    evidenceType === "link" ? { url: value } : { note: value },
                );
                formElement.reset();
            },
            "Evidence reference added for review.",
        );
    };
    const reassign = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => reassignActionItem(
                action.public_id,
                [{ matrix_user_id: formValue(form, "assignee"), role: formValue(form, "role") as "owner" | "assignee" }],
                formValue(form, "reason"),
            ),
            "Assignment replaced. Historical assignments remain preserved.",
        );
    };
    const changeDueDate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => changeActionDueDate(
                action.public_id,
                toIsoDateTime(formValue(form, "due_at")),
                formValue(form, "timezone"),
                formValue(form, "reason"),
            ),
            "Due date changed with an audited reason.",
        );
    };

    return (
        <article className="mx_NixorWorkspace_card">
            <div className="mx_NixorWorkspace_cardHeader">
                <h3>{action.title}</h3>
                <span className={`mx_NixorStatusPill${overdue ? " mx_NixorStatusPill_danger" : ""}`}>
                    {overdue ? "overdue" : action.status.replaceAll("_", " ")}
                </span>
            </div>
            <p>{action.description}</p>
            <p>Due: {formatDate(action.due_at)} · Priority: {action.priority} · Category: {action.category}</p>
            <p>Created by {action.creator_matrix_user_id}{action.acceptance_reviewer_matrix_user_id ? ` · Reviewer ${action.acceptance_reviewer_matrix_user_id}` : ""}</p>
            <div className="mx_NixorRoleLabels">{action.assignees.map((assignee) => (
                <span className="mx_NixorStatusPill" key={`${action.public_id}:${assignee.matrix_user_id}`}>
                    {assignee.role}: {assignee.matrix_user_id}{assignee.acknowledged_at ? " ✓" : " — awaiting acknowledgement"}
                </span>
            ))}</div>
            {myAssignment && !myAssignment.acknowledged_at && ["assigned", "overdue"].includes(action.status) && (
                <AccessibleButton className="mx_NixorWorkspace_primaryAction" disabled={busy} onClick={acknowledge}>
                    Acknowledge assignment
                </AccessibleButton>
            )}
            {availableTransitions.length > 0 && <details>
                <summary>Update lifecycle status</summary>
                <form onSubmit={changeStatus}>
                    <label>New status<select name="status">{availableTransitions.map((status) => <option key={status} value={status}>{status.replaceAll("_", " ")}</option>)}</select></label>
                    <label>Reason or reviewer note<textarea name="reason" minLength={3} maxLength={2000} required /></label>
                    <button type="submit" disabled={busy}>Save status</button>
                </form>
            </details>}
            {(myAssignment || isCreator) && !["accepted", "cancelled"].includes(action.status) && <details>
                <summary>Add completion evidence</summary>
                <form onSubmit={addEvidence}>
                    <label>Evidence type<select name="evidence_type"><option value="note">Note</option><option value="link">Link</option></select></label>
                    <label>Title<input name="title" minLength={2} maxLength={240} required /></label>
                    <label>Reference<textarea name="reference" minLength={1} maxLength={8000} required /></label>
                    <button type="submit" disabled={busy}>Add evidence</button>
                </form>
            </details>}
            {canAssign && !["accepted", "cancelled"].includes(action.status) && <details>
                <summary>Reassign or change due date</summary>
                <form onSubmit={reassign}>
                    <label>New assignee<input name="assignee" pattern="^@[^:\s]+:[^\s]+$" required /></label>
                    <label>Assignment role<select name="role"><option value="assignee">Assignee</option><option value="owner">Owner</option></select></label>
                    <label>Reason<textarea name="reason" minLength={3} maxLength={2000} required /></label>
                    <button type="submit" disabled={busy}>Confirm reassignment</button>
                </form>
                <form onSubmit={changeDueDate}>
                    <label>New due date (blank removes it)<input name="due_at" type="datetime-local" /></label>
                    <label>Time zone<input name="timezone" defaultValue={action.due_timezone || "Asia/Karachi"} minLength={3} maxLength={100} required /></label>
                    <label>Reason<textarea name="reason" minLength={3} maxLength={2000} required /></label>
                    <button type="submit" disabled={busy}>Confirm due-date change</button>
                </form>
            </details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </article>
    );
};

export default NixorActionCard;
