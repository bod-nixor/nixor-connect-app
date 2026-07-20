/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import Spinner from "../elements/Spinner";
import {
    acknowledgeFormalNotice,
    createFormalNotice,
    type FormalNotice,
    type FormalNoticeContentInput,
    type FormalNoticeDetails,
    getFormalNotice,
    hasNixorCapability,
    listFormalNotices,
    type NixorIdentity,
    publishFormalNotice,
    reviseFormalNotice,
    supersedeFormalNotice,
    withdrawFormalNotice,
} from "../../../nixor/accountabilityApi";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function matrixIds(value: string): string[] {
    return Array.from(new Set(value.split(/[\s,]+/).filter(Boolean)));
}

function toIso(value: string): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDate(value?: string | null): string {
    if (!value) return "No deadline";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function attachmentsFromForm(form: FormData): FormalNoticeContentInput["attachments"] {
    const uri = formValue(form, "attachment_uri");
    if (!uri) return [];
    return [{ name: formValue(form, "attachment_name") || "Linked attachment", uri }];
}

function preservedAttachments(value: unknown): FormalNoticeContentInput["attachments"] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== "object") return [];
        const record = item as Record<string, unknown>;
        if (typeof record.name !== "string" || typeof record.uri !== "string") return [];
        return [{
            name: record.name,
            uri: record.uri,
            ...(typeof record.mime_type === "string" ? { mime_type: record.mime_type } : {}),
            ...(typeof record.size_bytes === "number" ? { size_bytes: record.size_bytes } : {}),
        }];
    });
}

const CreateFormalNotice: React.FC<{
    identity: NixorIdentity;
    onCreated: () => Promise<void>;
}> = ({ identity, onCreated }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const targets = matrixIds(formValue(form, "targets"));
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const result = await createFormalNotice({
                title: formValue(form, "title"),
                body: formValue(form, "body") || undefined,
                linked_matrix_room_id: formValue(form, "matrix_room_id") || undefined,
                linked_matrix_event_id: formValue(form, "matrix_event_id") || undefined,
                issuer_role: formValue(form, "issuer_role"),
                resource_key: formValue(form, "resource_key") || undefined,
                audience: { kind: "explicit_targets" },
                targets: targets.map((matrixUserId) => ({
                    matrix_user_id: matrixUserId,
                    reason: formValue(form, "target_reason"),
                })),
                priority: formValue(form, "priority") as FormalNotice["priority"],
                acknowledgement_required: form.get("acknowledgement_required") === "on",
                acknowledgement_deadline: toIso(formValue(form, "acknowledgement_deadline")),
                action_required: form.get("action_required") === "on",
                attachments: attachmentsFromForm(form),
                escalation_policy_key: formValue(form, "escalation_policy_key") || undefined,
            });
            setMessage(`Draft ${result.public_id} created at revision ${result.revision}. Review it before publishing.`);
            formElement.reset();
            await onCreated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Formal notice was not created.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <details className="mx_NixorWorkspace_createPanel">
            <summary>Create formal notice</summary>
            <form onSubmit={(event) => void submit(event)}>
                <label>Title<input name="title" minLength={3} maxLength={240} required /></label>
                <label>Notice body<textarea name="body" maxLength={50000} required /></label>
                <label>Issuer institutional role<input name="issuer_role" defaultValue={identity.global_roles[0] ?? "member"} minLength={2} maxLength={160} required /></label>
                <label>Governed resource key (optional)<input name="resource_key" maxLength={200} /></label>
                <label>Target Matrix IDs<textarea name="targets" minLength={3} maxLength={50000} required /></label>
                <label>Why these recipients are in scope<input name="target_reason" defaultValue="Institutional notice recipient" minLength={2} maxLength={240} required /></label>
                <label>Priority<select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                <label className="mx_NixorWorkspace_checkbox"><input name="acknowledgement_required" type="checkbox" defaultChecked /> Require explicit acknowledgement of the exact revision</label>
                <label>Acknowledgement deadline (optional)<input name="acknowledgement_deadline" type="datetime-local" /></label>
                <label className="mx_NixorWorkspace_checkbox"><input name="action_required" type="checkbox" /> This notice also requires action</label>
                <label>Linked Matrix room ID (optional)<input name="matrix_room_id" maxLength={255} /></label>
                <label>Linked Matrix event ID (optional)<input name="matrix_event_id" maxLength={255} /></label>
                <label>Attachment name (optional)<input name="attachment_name" maxLength={255} /></label>
                <label>Attachment URI (optional)<input name="attachment_uri" maxLength={2000} /></label>
                <label>Escalation policy key (optional)<input name="escalation_policy_key" pattern="^[a-z][a-z0-9_]{1,63}$" /></label>
                {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
                {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
                <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create draft"}</button>
            </form>
        </details>
    );
};

const NoticeCard: React.FC<{
    notice: FormalNotice;
    identity: NixorIdentity;
    onUpdated: () => Promise<void>;
}> = ({ notice, identity, onUpdated }) => {
    const [details, setDetails] = useState<FormalNoticeDetails | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const loadDetails = async (): Promise<void> => {
        setBusy("details");
        setError(null);
        try {
            setDetails(await getFormalNotice(notice.public_id));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Notice details were not available.");
        } finally {
            setBusy(null);
        }
    };
    const acknowledge = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const comment = formValue(new FormData(event.currentTarget), "comment");
        setBusy("acknowledge");
        setError(null);
        try {
            await acknowledgeFormalNotice(notice.public_id, notice.current_revision, comment || undefined);
            setMessage(`Revision ${notice.current_revision} acknowledged immutably.`);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Acknowledgement was not saved.");
        } finally {
            setBusy(null);
        }
    };
    const publish = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        setBusy("publish");
        setError(null);
        try {
            await publishFormalNotice(notice.public_id, reason);
            setMessage("Notice published and delivery notifications queued for its exact current revision.");
            await onUpdated();
        } catch (reasonValue) {
            setError(reasonValue instanceof Error ? reasonValue.message : "Notice was not published.");
        } finally {
            setBusy(null);
        }
    };
    const revise = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!details) return;
        const form = new FormData(event.currentTarget);
        const summary = formValue(form, "change_summary");
        setBusy("revise");
        setError(null);
        try {
            const result = await reviseFormalNotice(notice.public_id, {
                title: formValue(form, "title"),
                body: formValue(form, "body") || undefined,
                linked_matrix_room_id: details.notice.linked_matrix_room_id ?? undefined,
                linked_matrix_event_id: details.notice.linked_matrix_event_id ?? undefined,
                audience: details.notice.target_audience ?? { kind: "explicit_targets" },
                priority: formValue(form, "priority") as FormalNotice["priority"],
                acknowledgement_required: form.get("acknowledgement_required") === "on",
                acknowledgement_deadline: toIso(formValue(form, "acknowledgement_deadline")),
                action_required: form.get("action_required") === "on",
                attachments: preservedAttachments(details.notice.attachments),
                change_summary: summary,
                material_change: form.get("material_change") === "on",
            });
            setMessage(`Revision ${result.revision} recorded. Material revisions require a new acknowledgement.`);
            await onUpdated();
            await loadDetails();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Notice revision was not recorded.");
        } finally {
            setBusy(null);
        }
    };
    const supersede = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy("supersede"); setError(null); setMessage(null);
        try {
            await supersedeFormalNotice(
                notice.public_id,
                formValue(form, "successor_public_id"),
                formValue(form, "reason"),
            );
            setMessage("The published successor now replaces this notice; both immutable histories remain linked.");
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Notice was not superseded.");
        } finally {
            setBusy(null);
        }
    };
    const withdraw = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        setBusy("withdraw"); setError(null); setMessage(null);
        try {
            await withdrawFormalNotice(notice.public_id, reason);
            setMessage("Notice withdrawn, recipients notified, and immutable history preserved.");
            await onUpdated();
        } catch (reasonValue) {
            setError(reasonValue instanceof Error ? reasonValue.message : "Notice was not withdrawn.");
        } finally {
            setBusy(null);
        }
    };
    const canManage = hasNixorCapability(identity, "notice.revise");
    return (
        <article className={`mx_NixorWorkspace_card mx_NixorFormalNotice${notice.overdue ? " mx_NixorFormalNotice_overdue" : ""}`}>
            <div className="mx_NixorWorkspace_cardHeader"><h3>{notice.title}</h3><span className="mx_NixorStatusPill">{notice.status} · {notice.priority}</span></div>
            <p className="mx_NixorFormalNotice_body">{notice.current_body || "This notice is linked to a Matrix message."}</p>
            <dl className="mx_NixorWorkspace_metadata">
                <div><dt>Issuer</dt><dd>{notice.issuer_institutional_role || notice.issuer_matrix_user_id}</dd></div>
                <div><dt>Revision</dt><dd>{notice.current_revision}</dd></div>
                <div><dt>Deadline</dt><dd>{formatDate(notice.acknowledgement_deadline)}</dd></div>
            </dl>
            {notice.acknowledged ? <span className="mx_NixorStatusPill">acknowledged</span> : notice.acknowledgement_required && notice.status === "published" && <details><summary>Acknowledge revision {notice.current_revision}</summary><form onSubmit={(event) => void acknowledge(event)}><p>This records that you saw this exact revision; it is separate from a Matrix read receipt.</p><label>Comment (optional)<textarea name="comment" maxLength={2000} /></label><button type="submit" disabled={busy !== null}>{busy === "acknowledge" ? "Saving…" : `Acknowledge revision ${notice.current_revision}`}</button></form></details>}
            <AccessibleButton disabled={busy !== null} onClick={() => void loadDetails()}>{busy === "details" ? "Loading…" : "Open exact revision and delivery status"}</AccessibleButton>
            {notice.status === "draft" && hasNixorCapability(identity, "notice.create") && <details><summary>Publish draft</summary><form onSubmit={(event) => void publish(event)}><label>Publishing reason<input name="reason" minLength={3} maxLength={500} required /></label><button type="submit" disabled={busy !== null}>Confirm and publish</button></form></details>}
            {notice.status === "published" && canManage && <details><summary>Supersede or withdraw notice</summary><form onSubmit={(event) => void supersede(event)}><p>The successor must already be published and in an authorized scope.</p><label>Published successor public ID<input name="successor_public_id" minLength={3} maxLength={160} required /></label><label>Supersession reason<textarea name="reason" minLength={5} maxLength={2000} required /></label><button type="submit" disabled={busy !== null}>Confirm supersession</button></form><form onSubmit={(event) => void withdraw(event)}><label>Withdrawal reason<textarea name="reason" minLength={5} maxLength={2000} required /></label><button type="submit" disabled={busy !== null}>Confirm withdrawal</button></form></details>}
            {details && <details open><summary>Revision history and acknowledgement dashboard</summary>
                <p>{details.revisions.length} immutable revision record(s).</p>
                {details.targets && <div className="mx_NixorWorkspace_cards">{details.targets.map((target) => <div key={target.matrix_user_id}><strong>{target.matrix_user_id}</strong><span>{target.acknowledgement_status}</span></div>)}</div>}
                {canManage && ["draft", "published"].includes(notice.status) && <details><summary>Create revision</summary><form onSubmit={(event) => void revise(event)}>
                    <label>Title<input name="title" defaultValue={notice.title} minLength={3} maxLength={240} required /></label>
                    <label>Body<textarea name="body" defaultValue={notice.current_body ?? ""} maxLength={50000} required /></label>
                    <label>Priority<select name="priority" defaultValue={notice.priority}><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                    <label className="mx_NixorWorkspace_checkbox"><input name="acknowledgement_required" type="checkbox" defaultChecked={notice.acknowledgement_required} /> Require acknowledgement</label>
                    <label>Deadline (optional)<input name="acknowledgement_deadline" type="datetime-local" /></label>
                    <label className="mx_NixorWorkspace_checkbox"><input name="action_required" type="checkbox" defaultChecked={notice.action_required} /> Action required</label>
                    <label className="mx_NixorWorkspace_checkbox"><input name="material_change" type="checkbox" defaultChecked /> Material change requiring renewed acknowledgement</label>
                    <label>Change summary<textarea name="change_summary" minLength={3} maxLength={1000} required /></label>
                    <button type="submit" disabled={busy !== null}>Confirm revision</button>
                </form></details>}
            </details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </article>
    );
};

const NixorFormalNotices: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [notices, setNotices] = useState<FormalNotice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setNotices(await listFormalNotices());
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Formal notices could not be loaded.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    return (
        <section aria-labelledby="formal-notices-heading">
            <div className="mx_NixorWorkspace_sectionHeader"><div><h2 id="formal-notices-heading">Formal notices</h2><p>Acknowledgements are immutable and tied to the exact displayed revision.</p></div></div>
            {hasNixorCapability(identity, "notice.create") && <CreateFormalNotice identity={identity} onCreated={load} />}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {loading ? <p role="status"><Spinner /> Loading formal notices…</p> : !notices.length ? <p>No formal notices are visible to you.</p> : <div className="mx_NixorWorkspace_cards">{notices.map((notice) => <NoticeCard key={notice.public_id} notice={notice} identity={identity} onUpdated={load} />)}</div>}
        </section>
    );
};

export default NixorFormalNotices;
