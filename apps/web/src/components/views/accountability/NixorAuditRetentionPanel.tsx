/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import {
    createGovernanceAuditCheckpoint,
    createRetentionOverride,
    executeRetentionPurge,
    type GovernanceAuditEntry,
    hasNixorCapability,
    listGovernanceAudit,
    listRetentionConfiguration,
    listRetentionHolds,
    type NixorIdentity,
    placeRetentionHold,
    previewRetentionPurge,
    type PurgePreview,
    releaseRetentionHold,
    type RetentionHold,
    type RetentionOverride,
    type RetentionPolicy,
    updateRetentionPolicy,
    verifyGovernanceAudit,
    type AuditIntegrityResult,
} from "../../../nixor/accountabilityApi";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function toIso(value: string): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formatDate(value?: string | null): string {
    if (!value) return "Never";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const AuditLedger: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [entries, setEntries] = useState<GovernanceAuditEntry[]>([]);
    const [nextBeforeId, setNextBeforeId] = useState<number | null>(null);
    const [lastQuery, setLastQuery] = useState<{
        purpose: string;
        objectType?: string;
        actorMatrixUserId?: string;
        casePublicId?: string;
    } | null>(null);
    const [integrity, setIntegrity] = useState<AuditIntegrityResult | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const query = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const filters = {
            purpose: formValue(form, "purpose"),
            objectType: formValue(form, "object_type") || undefined,
            actorMatrixUserId: formValue(form, "actor") || undefined,
            casePublicId: formValue(form, "case_id") || undefined,
        };
        setBusy("query"); setError(null); setMessage(null);
        try {
            const result = await listGovernanceAudit(filters);
            setEntries(result.entries);
            setNextBeforeId(result.next_before_id ?? null);
            setLastQuery(filters);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Audit ledger was not loaded.");
        } finally {
            setBusy(null);
        }
    };
    const loadOlder = async (): Promise<void> => {
        if (!lastQuery || !nextBeforeId) return;
        setBusy("older"); setError(null);
        try {
            const result = await listGovernanceAudit({ ...lastQuery, beforeId: nextBeforeId });
            setEntries((current) => [...current, ...result.entries]);
            setNextBeforeId(result.next_before_id ?? null);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Older audit entries were not loaded.");
        } finally {
            setBusy(null);
        }
    };
    const verify = async (): Promise<void> => {
        setBusy("verify"); setError(null); setMessage(null);
        try {
            const result = await verifyGovernanceAudit();
            setIntegrity(result);
            setMessage(result.valid ? `Integrity verified across ${result.checked} entries.` : `Integrity failure detected at entry ${result.firstInvalidId ?? "unknown"}.`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Audit integrity could not be verified.");
        } finally {
            setBusy(null);
        }
    };
    const checkpoint = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy("checkpoint"); setError(null); setMessage(null);
        try {
            const result = await createGovernanceAuditCheckpoint(
                formValue(form, "reason"),
                formValue(form, "signing_key_id") || undefined,
            );
            setMessage(`Checkpoint ${result.public_id} sealed through ledger entry ${result.through_entry_id}.`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Audit checkpoint was not created.");
        } finally {
            setBusy(null);
        }
    };
    return (
        <section aria-labelledby="nixor-audit-heading">
            <h2 id="nixor-audit-heading">Restricted audit ledger</h2>
            <p>Every ledger view records its work purpose. Filters are applied before results are returned to avoid unrelated-data side channels.</p>
            <form className="mx_NixorWorkspace_search" onSubmit={(event) => void query(event)}>
                <label>Work purpose<textarea name="purpose" minLength={5} maxLength={2000} required /></label>
                <label>Object type (optional)<input name="object_type" maxLength={160} /></label>
                <label>Actor Matrix ID (optional)<input name="actor" pattern="^@[^:\s]+:[^\s]+$" /></label>
                <label>Case public ID (optional)<input name="case_id" maxLength={160} /></label>
                <button type="submit" disabled={busy !== null}>Load authorized entries</button>
            </form>
            {hasNixorCapability(identity, "audit.verify") && <div className="mx_NixorWorkspace_actions">
                <AccessibleButton disabled={busy !== null} onClick={() => void verify()}>Verify complete hash chain</AccessibleButton>
                <details><summary>Create integrity checkpoint</summary><form onSubmit={(event) => void checkpoint(event)}><label>Reason<input name="reason" minLength={3} maxLength={500} required /></label><label>External signing key ID (optional)<input name="signing_key_id" maxLength={160} /></label><button type="submit" disabled={busy !== null}>Confirm checkpoint</button></form></details>
            </div>}
            {integrity && <p className={integrity.valid ? "mx_NixorWorkspace_success" : "mx_NixorWorkspace_error"}>Chain {integrity.valid ? "valid" : "invalid"} · {integrity.checked} entries checked · head {integrity.chainHead ?? "empty"}</p>}
            {entries.length > 0 && <div className="mx_NixorWorkspace_cards">{entries.map((entry) => <article className="mx_NixorWorkspace_card" key={entry.public_id}><div className="mx_NixorWorkspace_cardHeader"><h3>{entry.action}</h3><span>#{entry.id}</span></div><p>{entry.object_type}: {entry.object_public_id ?? "—"}</p><p>{entry.actor_matrix_user_id ?? entry.effective_service ?? "Unknown actor"} · {formatDate(entry.created_at)}</p>{entry.reason && <p>Reason: {entry.reason}</p>}<p>Hash: {entry.entry_hash}</p></article>)}</div>}
            {nextBeforeId && <AccessibleButton disabled={busy !== null} onClick={() => void loadOlder()}>Load older entries</AccessibleButton>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </section>
    );
};

const RetentionControls: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [policies, setPolicies] = useState<RetentionPolicy[]>([]);
    const [overrides, setOverrides] = useState<RetentionOverride[]>([]);
    const [holds, setHolds] = useState<RetentionHold[]>([]);
    const [preview, setPreview] = useState<PurgePreview | null>(null);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const canManage = hasNixorCapability(identity, "retention.manage");
    const canHold = hasNixorCapability(identity, "retention.hold");
    const canPurge = hasNixorCapability(identity, "retention.purge");
    const load = useCallback(async () => {
        setError(null);
        try {
            const [configuration, holdRows] = await Promise.all([
                canManage ? listRetentionConfiguration() : Promise.resolve({ policies: [], overrides: [] }),
                canHold ? listRetentionHolds() : Promise.resolve([]),
            ]);
            setPolicies(configuration.policies);
            setOverrides(configuration.overrides);
            setHolds(holdRows);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Retention controls could not be loaded.");
        }
    }, [canHold, canManage]);
    useEffect(() => { void load(); }, [load]);
    const updatePolicy = async (event: FormEvent<HTMLFormElement>, policy: RetentionPolicy): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(policy.policy_key); setError(null); setMessage(null);
        try {
            await updateRetentionPolicy(policy.policy_key, {
                default_days: Number(formValue(form, "default_days")),
                enabled: form.get("enabled") === "on",
                legal_basis: formValue(form, "legal_basis"),
            }, formValue(form, "reason"));
            setMessage(`${policy.display_name} updated within its configured safety bounds.`);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Retention policy was not updated.");
        } finally {
            setBusy(null);
        }
    };
    const createOverride = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy("override"); setError(null); setMessage(null);
        try {
            const id = await createRetentionOverride({
                policy_key: formValue(form, "policy_key"),
                scope_type: formValue(form, "scope_type") as RetentionOverride["scope_type"],
                scope_key: formValue(form, "scope_key"),
                retention_days: Number(formValue(form, "retention_days")),
                reason: formValue(form, "reason"),
                expires_at: toIso(formValue(form, "expires_at")),
            });
            setMessage(`Bounded retention override ${id} created.`);
            formElement.reset();
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Retention override was not created.");
        } finally {
            setBusy(null);
        }
    };
    const placeHold = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy("hold"); setError(null); setMessage(null);
        try {
            const id = await placeRetentionHold({
                hold_type: formValue(form, "hold_type") as RetentionHold["hold_type"],
                scope_type: formValue(form, "scope_type") as RetentionHold["scope_type"],
                scope_key: formValue(form, "scope_key"),
                reason: formValue(form, "reason"),
                related_case_public_id: formValue(form, "case_id") || undefined,
                expires_at: toIso(formValue(form, "expires_at")),
            });
            setMessage(`Retention hold ${id} placed. Matching purge candidates are excluded.`);
            formElement.reset();
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Retention hold was not placed.");
        } finally {
            setBusy(null);
        }
    };
    const releaseHold = async (event: FormEvent<HTMLFormElement>, hold: RetentionHold): Promise<void> => {
        event.preventDefault();
        setBusy(hold.public_id); setError(null); setMessage(null);
        try {
            await releaseRetentionHold(hold.public_id, formValue(new FormData(event.currentTarget), "reason"));
            setMessage(`Retention hold ${hold.public_id} released with an audit reason.`);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Retention hold was not released.");
        } finally {
            setBusy(null);
        }
    };
    const previewPurge = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const scopeType = formValue(form, "scope_type") as RetentionOverride["scope_type"] | "";
        setBusy("preview"); setError(null); setMessage(null); setPreview(null);
        try {
            const result = await previewRetentionPurge({
                policy_key: formValue(form, "policy_key"),
                before: toIso(formValue(form, "before")) ?? "",
                ...(scopeType ? { scope_type: scopeType, scope_key: formValue(form, "scope_key") } : {}),
                batch_limit: Number(formValue(form, "batch_limit")),
            });
            setPreview(result);
            setMessage(`Preview ${result.public_id} contains ${result.candidate_count} authorized candidate(s). No data has changed.`);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Purge preview was not created.");
        } finally {
            setBusy(null);
        }
    };
    const executePurge = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!preview) return;
        const form = new FormData(event.currentTarget);
        if (formValue(form, "confirmation") !== "PURGE") {
            setError("Type PURGE exactly to authorize this execution.");
            return;
        }
        setBusy("execute"); setError(null); setMessage(null);
        try {
            const result = await executeRetentionPurge(preview, formValue(form, "reason"));
            const status = typeof result.status === "string" ? result.status : "completed";
            setMessage(`Purge job ${preview.public_id} is ${status}. Verification was recorded in the audit ledger.`);
            setPreview(null);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Purge execution failed safely.");
        } finally {
            setBusy(null);
        }
    };
    return (
        <section aria-labelledby="nixor-retention-heading">
            <h2 id="nixor-retention-heading">Retention, legal holds, and purge</h2>
            <p>Policies are class-specific. Legal and safety holds always exclude matching records; deletion requires a fresh preview, exact confirmation, and short-lived step-up.</p>
            {canManage && <>
                <div className="mx_NixorWorkspace_cards">{policies.map((policy) => <article className="mx_NixorWorkspace_card" key={policy.policy_key}><div className="mx_NixorWorkspace_cardHeader"><h3>{policy.display_name}</h3><span>{policy.purge_mode}</span></div><p>{policy.retention_class} · {policy.minimum_days}–{policy.maximum_days} days</p><form onSubmit={(event) => void updatePolicy(event, policy)}><label>Default days<input name="default_days" type="number" min={policy.minimum_days} max={policy.maximum_days} defaultValue={policy.default_days} required /></label><label>Legal basis<textarea name="legal_basis" minLength={3} maxLength={2000} defaultValue={policy.legal_basis} required /></label><label className="mx_NixorWorkspace_checkbox"><input name="enabled" type="checkbox" defaultChecked={policy.enabled} /> Enabled</label><label>Change reason<textarea name="reason" minLength={5} maxLength={2000} required /></label><button type="submit" disabled={busy !== null}>Confirm policy change</button></form></article>)}</div>
                <details><summary>Create bounded scope override</summary><form onSubmit={(event) => void createOverride(event)}><label>Policy<select name="policy_key">{policies.map((policy) => <option key={policy.policy_key} value={policy.policy_key}>{policy.display_name}</option>)}</select></label><label>Scope<select name="scope_type"><option value="resource">Resource</option><option value="entity">Entity</option><option value="project">Project</option><option value="case">Case</option><option value="bot">Bot</option></select></label><label>Scope key<input name="scope_key" required /></label><label>Retention days<input name="retention_days" type="number" min={1} required /></label><label>Expires (optional)<input name="expires_at" type="datetime-local" /></label><label>Reason<textarea name="reason" minLength={5} maxLength={2000} required /></label><button type="submit" disabled={busy !== null}>Create override</button></form></details>
                {overrides.length > 0 && <details><summary>{overrides.length} active override(s)</summary>{overrides.map((override) => <p key={override.public_id}>{override.policy_key} · {override.scope_type}:{override.scope_key} · {override.retention_days} days</p>)}</details>}
            </>}
            {canHold && <>
                <details><summary>Place retention hold</summary><form onSubmit={(event) => void placeHold(event)}><label>Hold type<select name="hold_type"><option value="legal">Legal</option><option value="investigative">Investigative</option><option value="safety">Safety</option><option value="appeal">Appeal</option></select></label><label>Scope<select name="scope_type"><option value="case">Case</option><option value="report">Report</option><option value="evidence">Evidence</option><option value="resource">Resource</option><option value="entity">Entity</option><option value="project">Project</option><option value="user">User</option><option value="bot">Bot</option></select></label><label>Scope key<input name="scope_key" required /></label><label>Related case public ID (optional)<input name="case_id" maxLength={160} /></label><label>Expiry (optional)<input name="expires_at" type="datetime-local" /></label><label>Reason<textarea name="reason" minLength={10} maxLength={5000} required /></label><button type="submit" disabled={busy !== null}>Confirm hold</button></form></details>
                {holds.length > 0 && <div className="mx_NixorWorkspace_cards">{holds.map((hold) => <article className="mx_NixorWorkspace_card" key={hold.public_id}><h3>{hold.hold_type} hold</h3><p>{hold.scope_type}:{hold.scope_key}</p><p>{hold.reason}</p><p>Placed {formatDate(hold.placed_at)} · expires {formatDate(hold.expires_at)}</p><details><summary>Release hold</summary><form onSubmit={(event) => void releaseHold(event, hold)}><label>Release reason<textarea name="reason" minLength={10} maxLength={5000} required /></label><button type="submit" disabled={busy !== null}>Confirm release</button></form></details></article>)}</div>}
            </>}
            {canPurge && <details><summary>Preview purge candidates</summary><form onSubmit={(event) => void previewPurge(event)}><label>Policy<select name="policy_key">{policies.map((policy) => <option key={policy.policy_key} value={policy.policy_key}>{policy.display_name}</option>)}</select></label><label>Records before<input name="before" type="datetime-local" required /></label><label>Scope (optional)<select name="scope_type" defaultValue=""><option value="">All authorized scope</option><option value="resource">Resource</option><option value="entity">Entity</option><option value="project">Project</option><option value="case">Case</option><option value="bot">Bot</option></select></label><label>Scope key (required with scope)<input name="scope_key" /></label><label>Maximum candidates<input name="batch_limit" type="number" min={1} max={1000} defaultValue={500} required /></label><button type="submit" disabled={busy !== null}>Create read-only preview</button></form></details>}
            {preview && <div className="mx_NixorWorkspace_disclosure"><strong>Destructive action gate:</strong> preview {preview.public_id} has {preview.candidate_count} candidate(s), mode {preview.purge_mode}, and expires in {preview.expires_in_seconds} seconds.<form onSubmit={(event) => void executePurge(event)}><label>Type PURGE<input name="confirmation" pattern="PURGE" autoComplete="off" required /></label><label>Execution reason<textarea name="reason" minLength={10} maxLength={5000} required /></label><button type="submit" disabled={busy !== null || preview.candidate_count === 0}>Execute exactly this preview</button></form></div>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </section>
    );
};

const NixorAuditRetentionPanel: React.FC<{ identity: NixorIdentity }> = ({ identity }) => (
    <>
        {hasNixorCapability(identity, "audit.view") && <AuditLedger identity={identity} />}
        {(hasNixorCapability(identity, "retention.manage") || hasNixorCapability(identity, "retention.hold") || hasNixorCapability(identity, "retention.purge")) && <RetentionControls identity={identity} />}
    </>
);

export default NixorAuditRetentionPanel;
