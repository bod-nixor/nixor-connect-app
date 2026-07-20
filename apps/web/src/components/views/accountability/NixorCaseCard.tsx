/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import {
    acknowledgeCase,
    addCaseNote,
    assignCase,
    changeCaseDeadline,
    closeCase,
    decideCaseAppeal,
    escalateCase,
    getCaseDetails,
    grantCaseAccess,
    type GovernanceCase,
    type GovernanceCaseDetails,
    hasNixorCapability,
    mergeCase,
    type NixorIdentity,
    publishCaseReporterUpdate,
    recuseFromCase,
    relateCases,
    resolveCase,
    revokeCaseAccess,
    updateCaseState,
    viewCaseEvidence,
} from "../../../nixor/accountabilityApi";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function toIso(value: string): string | null {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDate(value?: string | null): string {
    if (!value) return "No deadline";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function isOverdue(record: GovernanceCase): boolean {
    if (record.sla_paused_at || ["resolved", "closed", "archived"].includes(record.state)) return false;
    const deadline = record.acknowledged_at ? record.first_action_due_at : record.acknowledgement_due_at;
    return Boolean(deadline && new Date(deadline).getTime() < Date.now());
}

const NixorCaseCard: React.FC<{
    record: GovernanceCase;
    identity: NixorIdentity;
    onUpdated: () => Promise<void>;
}> = ({ record, identity, onUpdated }) => {
    const [details, setDetails] = useState<GovernanceCaseDetails | null>(null);
    const [evidence, setEvidence] = useState<Record<string, unknown> | null>(null);
    const [purpose, setPurpose] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const overdue = isOverdue(record);
    const canReview = hasNixorCapability(identity, "case.review");
    const canTriage = hasNixorCapability(identity, "case.triage");
    const canEscalate = hasNixorCapability(identity, "escalation.manage");
    const canViewEvidence = hasNixorCapability(identity, "evidence.view") || details?.access.can_view_evidence === true;
    const ownUserId = identity.identity.matrix_user_id;
    const assigned = record.owner_matrix_user_id === ownUserId || details?.assignments.some((assignment) =>
        assignment.matrix_user_id === ownUserId && !assignment.ended_at,
    );

    const run = async (operation: () => Promise<void>, success: string): Promise<void> => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await operation();
            setMessage(success);
            setDetails(null);
            setEvidence(null);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Case was not updated.");
        } finally {
            setBusy(false);
        }
    };
    const loadDetails = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const requestedPurpose = formValue(new FormData(event.currentTarget), "purpose");
        setBusy(true);
        setError(null);
        try {
            setDetails(await getCaseDetails(record.public_id, requestedPurpose));
            setPurpose(requestedPurpose);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Case details were not loaded.");
        } finally {
            setBusy(false);
        }
    };
    const changeState = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(() => updateCaseState(record.public_id, formValue(form, "state"), formValue(form, "reason")), "Case state updated.");
    };
    const note = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const content = formValue(new FormData(event.currentTarget), "content");
        void run(() => addCaseNote(record.public_id, content), "Internal note added. It is not reporter-visible.");
    };
    const reporterUpdate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => publishCaseReporterUpdate(record.public_id, formValue(form, "status"), formValue(form, "summary")),
            "Reporter-safe update published.",
        );
    };
    const recuse = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        void run(() => recuseFromCase(record.public_id, reason), "You were recused and your case-scoped assignment was removed.");
    };
    const assign = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => assignCase(
                record.public_id,
                formValue(form, "user"),
                formValue(form, "role") as "owner" | "reviewer" | "observer",
                formValue(form, "reason"),
            ),
            "Case assignment added after conflict checks.",
        );
    };
    const escalate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => escalateCase(
                record.public_id,
                Number(formValue(form, "level")),
                formValue(form, "role"),
                formValue(form, "reason"),
            ),
            "Case escalated.",
        );
    };
    const grantAccess = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => grantCaseAccess(
                record.public_id,
                formValue(form, "user"),
                formValue(form, "access_level") as "metadata" | "notes" | "evidence" | "export",
                formValue(form, "purpose"),
                toIso(formValue(form, "expires_at")) ?? undefined,
            ),
            "Purpose-bound case access granted after conflict checks.",
        );
    };
    const revokeAccess = (event: FormEvent<HTMLFormElement>, grantId: string): void => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        void run(() => revokeCaseAccess(record.public_id, grantId, reason), "Case access grant revoked.");
    };
    const relate = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => relateCases(
                record.public_id,
                formValue(form, "related_case"),
                formValue(form, "relationship_type") as "related" | "duplicate",
                formValue(form, "reason"),
            ),
            "Case relationship recorded without duplicating evidence.",
        );
    };
    const mergeIntoCase = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => mergeCase(record.public_id, formValue(form, "destination_case"), formValue(form, "reason")),
            "Case consolidated; its record and evidence remain preserved.",
        );
    };
    const deadline = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => changeCaseDeadline(
                record.public_id,
                formValue(form, "deadline_type") as "acknowledgement" | "first_action",
                formValue(form, "change_type") as "paused" | "resumed" | "extended" | "shortened",
                toIso(formValue(form, "new_due_at")),
                formValue(form, "reason"),
            ),
            "SLA deadline changed with an audited reason.",
        );
    };
    const resolve = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const disclosure = formValue(form, "disclosure") === "summary"
            ? { reporter_facing_summary: formValue(form, "reporter_text") }
            : { disclosure_withheld_reason: formValue(form, "reporter_text") };
        void run(
            () => resolveCase(
                record.public_id,
                formValue(form, "outcome"),
                formValue(form, "reason"),
                formValue(form, "actions"),
                disclosure,
            ),
            "Human-authorized outcome recorded and case resolved.",
        );
    };
    const close = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        void run(() => closeCase(record.public_id, reason), "Resolved case closed.");
    };
    const decideAppeal = (event: FormEvent<HTMLFormElement>, appealId: string): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => decideCaseAppeal(
                record.public_id,
                appealId,
                formValue(form, "decision") as "upheld" | "modified" | "reversed",
                formValue(form, "reason"),
                formValue(form, "reporter_summary"),
                formValue(form, "moderation_action") || undefined,
            ),
            "Appeal decided by an independent human reviewer and the appellant notified.",
        );
    };
    const inspectEvidence = async (evidenceId: string): Promise<void> => {
        setBusy(true);
        setError(null);
        try {
            setEvidence(await viewCaseEvidence(evidenceId, purpose));
            setMessage("Evidence access was purpose-bound and appended to the audit ledger.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Evidence was not loaded.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <article className="mx_NixorWorkspace_card">
            <div className="mx_NixorWorkspace_cardHeader"><h2>{record.case_number}</h2><span className={`mx_NixorStatusPill${overdue ? " mx_NixorStatusPill_danger" : ""}`}>{overdue ? "SLA overdue" : record.state.replaceAll("_", " ")}</span></div>
            <p>{record.category} · {record.severity} severity</p>
            <p>Acknowledgement due: {formatDate(record.acknowledgement_due_at)}<br />First action due: {formatDate(record.first_action_due_at)}</p>
            {record.sla_paused_at && <p>SLA paused since {formatDate(record.sla_paused_at)}</p>}
            {!record.acknowledged_at && assigned && <AccessibleButton className="mx_NixorWorkspace_primaryAction" disabled={busy} onClick={() => void run(() => acknowledgeCase(record.public_id, "Case assignment acknowledged in Nixor Connect"), "Case assignment acknowledged.")}>Acknowledge assignment</AccessibleButton>}
            <details>
                <summary>Open purpose-bound case detail</summary>
                <form onSubmit={(event) => void loadDetails(event)}>
                    <label>Work purpose<textarea name="purpose" minLength={3} maxLength={500} required /></label>
                    <button type="submit" disabled={busy}>Open audited case detail</button>
                </form>
            </details>
            {details && <div className="mx_NixorCaseDetail">
                <p>{details.assignments.length} assignments · {details.notes.length} internal notes · {details.reporter_updates.length} reporter updates · {details.evidence.length} evidence snapshots</p>
                {!details.access.full && <p>Limited case access: {details.access.grant_level ?? "metadata"}. Restricted sections are omitted server-side.</p>}
                {details.case.reporter_identity_restricted && <p>Reporter identity is restricted for this role.</p>}
                {details.related_cases.length > 0 && <details><summary>Related cases</summary><ul>{details.related_cases.map((related) => <li key={`${related.direction}:${related.public_id}`}>{related.case_number} · {related.relationship_type} · {related.direction}</li>)}</ul></details>}
                {details.evidence.length > 0 && canViewEvidence && <details><summary>Case-bound evidence</summary><p>Each access is conflict-checked, purpose-limited, and audited. Content is rendered as inert text.</p>{details.evidence.map((item) => <div key={item.public_id}><span>{item.selected_matrix_event_id} · {item.redaction_state}</span><AccessibleButton disabled={busy} onClick={() => void inspectEvidence(item.public_id)}>View audited evidence</AccessibleButton></div>)}</details>}
                {evidence && <pre className="mx_NixorEvidenceText">{JSON.stringify(evidence, null, 2)}</pre>}
                {canReview && record.state === "appealed" && details.appeals.filter((appeal) => ["submitted", "under_review"].includes(appeal.status)).map((appeal) => <details key={appeal.public_id}><summary>Decide appeal {appeal.public_id}</summary><p>{appeal.basis}</p><form onSubmit={(event) => decideAppeal(event, appeal.public_id)}><label>Decision<select name="decision"><option value="upheld">Uphold outcome</option><option value="modified">Modify and reopen</option><option value="reversed">Reverse and reopen</option></select></label><label>Independent review reason<textarea name="reason" minLength={10} maxLength={10000} required /></label><label>Appellant-facing summary<textarea name="reporter_summary" minLength={3} maxLength={5000} required /></label><label>Active moderation action public ID (only when reversing one)<input name="moderation_action" maxLength={160} /></label><button type="submit" disabled={busy}>Confirm appeal decision</button></form></details>)}
            </div>}
            {canReview && <details><summary>Reviewer workflow</summary>
                <form onSubmit={changeState}><label>New state<select name="state"><option value="awaiting_information">Awaiting information</option><option value="under_review">Under review</option><option value="action_pending">Action pending</option><option value="escalated">Escalated</option><option value="reopened">Reopened</option></select></label><label>Reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Save state</button></form>
                <form onSubmit={note}><label>Internal note<textarea name="content" minLength={2} maxLength={50000} required /></label><button type="submit" disabled={busy}>Add internal note</button></form>
                <form onSubmit={reporterUpdate}><label>Public status<input name="status" minLength={2} maxLength={160} required /></label><label>Reporter-safe summary<textarea name="summary" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Publish reporter update</button></form>
                {assigned && <form onSubmit={recuse}><label>Conflict or recusal reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Recuse myself</button></form>}
            </details>}
            {canTriage && <details><summary>Assign reviewer</summary><form onSubmit={assign}><label>Matrix ID<input name="user" pattern="^@[^:\s]+:[^\s]+$" required /></label><label>Role<select name="role"><option value="owner">Owner</option><option value="reviewer">Reviewer</option><option value="observer">Observer</option></select></label><label>Reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Confirm assignment</button></form></details>}
            {canReview && <details><summary>Purpose-bound access and case relationships</summary>
                <form onSubmit={grantAccess}><label>Grant access to Matrix ID<input name="user" pattern="^@[^:\s]+:[^\s]+$" required /></label><label>Access level<select name="access_level"><option value="metadata">Metadata only</option><option value="notes">Metadata and internal notes</option><option value="evidence">Metadata and evidence</option><option value="export">Authorized full export</option></select></label><label>Authorized purpose<textarea name="purpose" minLength={3} maxLength={2000} required /></label><label>Expiry (optional)<input name="expires_at" type="datetime-local" /></label><button type="submit" disabled={busy}>Confirm access grant</button></form>
                {details?.access_grants.map((grant) => <form key={grant.public_id} onSubmit={(event) => revokeAccess(event, grant.public_id)}><p>{grant.matrix_user_id} · {grant.access_level} · {grant.purpose}{grant.expires_at ? ` · expires ${formatDate(grant.expires_at)}` : ""}</p><label>Revocation reason<input name="reason" minLength={3} maxLength={2000} required /></label><button type="submit" disabled={busy}>Revoke grant</button></form>)}
                <form onSubmit={relate}><label>Related case public ID<input name="related_case" minLength={3} maxLength={160} required /></label><label>Relationship<select name="relationship_type"><option value="related">Related</option><option value="duplicate">Duplicate</option></select></label><label>Reason<textarea name="reason" minLength={5} maxLength={5000} required /></label><button type="submit" disabled={busy}>Link cases</button></form>
                <form onSubmit={mergeIntoCase}><p>Merging archives this case and preserves its evidence under the destination case.</p><label>Destination case public ID<input name="destination_case" minLength={3} maxLength={160} required /></label><label>Merge reason<textarea name="reason" minLength={10} maxLength={5000} required /></label><button type="submit" disabled={busy}>Confirm case merge</button></form>
            </details>}
            {canEscalate && <details><summary>Escalation and SLA</summary>
                <form onSubmit={escalate}><label>Escalation level<input name="level" type="number" min={0} max={20} required /></label><label>Target role key<input name="role" pattern="^[a-z][a-z0-9_]{1,63}$" required /></label><label>Reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Escalate case</button></form>
                <form onSubmit={deadline}><label>Deadline<select name="deadline_type"><option value="acknowledgement">Acknowledgement</option><option value="first_action">First action</option></select></label><label>Change<select name="change_type"><option value="paused">Pause SLA</option><option value="resumed">Resume SLA</option><option value="extended">Extend</option><option value="shortened">Shorten</option></select></label><label>New due date (for extend/shorten)<input name="new_due_at" type="datetime-local" /></label><label>Reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Confirm SLA change</button></form>
            </details>}
            {canReview && !["resolved", "closed", "archived"].includes(record.state) && <details><summary>Record human-authorized outcome</summary><form onSubmit={resolve}><label>Outcome<textarea name="outcome" minLength={3} maxLength={5000} required /></label><label>Reason<textarea name="reason" minLength={3} maxLength={10000} required /></label><label>Authorized actions taken<textarea name="actions" minLength={3} maxLength={10000} required /></label><label>Reporter disclosure<select name="disclosure"><option value="summary">Provide reporter-facing summary</option><option value="withheld">Withhold details under policy</option></select></label><label>Summary or withholding reason<textarea name="reporter_text" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Confirm outcome</button></form></details>}
            {canReview && record.state === "resolved" && <details><summary>Close resolved case</summary><form onSubmit={close}><label>Closure reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>Close case</button></form></details>}
            <p className="mx_NixorWorkspace_disclosure">Consequential outcomes require an authorized human reviewer; automated signals may only flag or route.</p>
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </article>
    );
};

export default NixorCaseCard;
