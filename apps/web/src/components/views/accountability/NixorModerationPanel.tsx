/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useState } from "react";

import {
    createModerationAction,
    type GovernanceModerationAction,
    hasNixorCapability,
    listModerationActions,
    type NixorIdentity,
    reverseModerationAction,
} from "../../../nixor/accountabilityApi";

const ACTION_TYPES = [
    "guidance",
    "warning",
    "content_removal_request",
    "event_redaction",
    "media_quarantine",
    "slow_mode",
    "temporary_mute",
    "resource_removal",
    "temporary_resource_suspension",
    "institution_suspension_request",
    "room_freeze",
    "informal_space_suspension",
    "case_escalation",
] as const;

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function listValue(value: string): string[] {
    return Array.from(new Set(value.split(/[\s,]+/).filter(Boolean)));
}

function toIso(value: string): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

const NixorModerationPanel: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [actions, setActions] = useState<GovernanceModerationAction[]>([]);
    const [scopeType, setScopeType] = useState<"global" | "resource" | "entity" | "project" | "case">("global");
    const [scopeKey, setScopeKey] = useState("");
    const [scopeKeyInput, setScopeKeyInput] = useState("");
    const [actionType, setActionType] = useState<(typeof ACTION_TYPES)[number]>("guidance");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const load = useCallback(async () => {
        if (scopeType !== "global" && !scopeKey) {
            setActions([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        try {
            setActions(await listModerationActions(scopeType, scopeKey || undefined));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not load moderation actions.");
        } finally {
            setLoading(false);
        }
    }, [scopeKey, scopeType]);
    useEffect(() => { void load(); }, [load]);
    const create = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const reason = formValue(form, "reason");
        setBusy("create");
        setError(null);
        setMessage(null);
        try {
            const actionId = await createModerationAction({
                action_type: actionType,
                target_type: formValue(form, "target_type") as "user" | "event" | "media" | "room" | "space" | "bot" | "resource",
                target_public_id: formValue(form, "target_public_id"),
                target_matrix_user_id: formValue(form, "target_matrix_user_id") || undefined,
                matrix_room_id: formValue(form, "matrix_room_id") || undefined,
                matrix_event_id: formValue(form, "matrix_event_id") || undefined,
                matrix_media_uri: formValue(form, "matrix_media_uri") || undefined,
                scope_type: scopeType,
                scope_key: scopeType === "global" ? undefined : scopeKeyInput,
                reason,
                case_public_id: formValue(form, "case_public_id") || undefined,
                evidence_public_ids: listValue(formValue(form, "evidence_public_ids")),
                expires_at: toIso(formValue(form, "expires_at")),
                policy_basis: formValue(form, "policy_basis"),
                notify_target: form.get("notify_target") === "on",
                appeal_route: formValue(form, "appeal_route") || undefined,
                slow_mode_seconds: actionType === "slow_mode" ? Number(formValue(form, "slow_mode_seconds")) : undefined,
            });
            setMessage(`Human-authorized moderation action ${actionId} recorded and executed.`);
            await load();
        } catch (reasonValue) {
            setError(reasonValue instanceof Error ? reasonValue.message : "Moderation action was not created.");
        } finally {
            setBusy(null);
        }
    };
    const reverse = async (event: FormEvent<HTMLFormElement>, action: GovernanceModerationAction): Promise<void> => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        setBusy(action.public_id);
        setError(null);
        try {
            await reverseModerationAction(action.public_id, reason);
            setMessage("Moderation action reversed from its recorded before-state where technically possible.");
            await load();
        } catch (reasonValue) {
            setError(reasonValue instanceof Error ? reasonValue.message : "Moderation action was not reversed.");
        } finally {
            setBusy(null);
        }
    };
    const temporary = ["temporary_mute", "temporary_resource_suspension", "informal_space_suspension"].includes(actionType);
    const consequential = ["warning", "event_redaction", "temporary_mute", "resource_removal", "temporary_resource_suspension", "institution_suspension_request", "informal_space_suspension"].includes(actionType);

    return (
        <section aria-labelledby="nixor-moderation-heading">
            <h2 id="nixor-moderation-heading">Human-authorized moderation</h2>
            <p>Automation may flag or route. It cannot authorize a consequential outcome. Case and evidence binding is mandatory for consequential actions.</p>
            <form className="mx_NixorWorkspace_search" onSubmit={(event) => { event.preventDefault(); setScopeKey(scopeType === "global" ? "" : scopeKeyInput.trim()); }}>
                <label>Scope<select value={scopeType} onChange={(event) => { const value = event.target.value as typeof scopeType; setScopeType(value); setScopeKey(""); }}><option value="global">Global</option><option value="resource">Resource</option><option value="entity">Entity</option><option value="project">Project</option><option value="case">Case</option></select></label>
                {scopeType !== "global" && <label>Scope key<input value={scopeKeyInput} onChange={(event) => setScopeKeyInput(event.target.value)} required /></label>}
                <button type="submit">Load scope</button>
            </form>
            {hasNixorCapability(identity, "moderation.perform") && <details className="mx_NixorWorkspace_createPanel">
                <summary>Record moderation action</summary>
                <form onSubmit={(event) => void create(event)}>
                    <label>Action type<select name="action_type" value={actionType} onChange={(event) => setActionType(event.target.value as typeof actionType)}>{ACTION_TYPES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label>
                    <label>Target type<select name="target_type"><option value="user">User</option><option value="event">Event</option><option value="media">Media</option><option value="room">Room</option><option value="space">Space</option><option value="bot">Bot</option><option value="resource">Governed resource</option></select></label>
                    <label>Target public ID<input name="target_public_id" maxLength={500} required /></label>
                    <label>Target Matrix user ID (when applicable)<input name="target_matrix_user_id" pattern="^@[^:\s]+:[^\s]+$" /></label>
                    <label>Matrix room ID (when applicable)<input name="matrix_room_id" maxLength={255} /></label>
                    <label>Matrix event ID (when applicable)<input name="matrix_event_id" maxLength={255} /></label>
                    <label>Matrix media URI (when applicable)<input name="matrix_media_uri" maxLength={1000} /></label>
                    <label>Reason<textarea name="reason" minLength={10} maxLength={10000} required /></label>
                    <label>Policy basis<textarea name="policy_basis" minLength={3} maxLength={2000} required /></label>
                    <label>Case public ID {consequential ? "(required)" : "(optional)"}<input name="case_public_id" minLength={3} maxLength={160} required={consequential} /></label>
                    <label>Evidence public IDs {consequential ? "(at least one required)" : "(optional)"}<textarea name="evidence_public_ids" minLength={consequential ? 3 : undefined} required={consequential} /></label>
                    {temporary && <label>Expiry date and time<input name="expires_at" type="datetime-local" required /></label>}
                    {actionType === "slow_mode" && <label>Slow-mode seconds<input name="slow_mode_seconds" type="number" min={1} max={86400} required /></label>}
                    <label>Appeal route (optional)<input name="appeal_route" maxLength={2000} /></label>
                    <label className="mx_NixorWorkspace_checkbox"><input name="notify_target" type="checkbox" defaultChecked /> Notify the target where an identity is supplied</label>
                    <button type="submit" disabled={busy === "create"}>{busy === "create" ? "Recording…" : "Confirm human authorization"}</button>
                </form>
            </details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
            {loading ? <p role="status">Loading moderation actions…</p> : !actions.length ? <p>No moderation actions in this authorized scope.</p> : <div className="mx_NixorWorkspace_cards">{actions.map((action) => <article className="mx_NixorWorkspace_card" key={action.public_id}>
                <div className="mx_NixorWorkspace_cardHeader"><h3>{action.action_type.replaceAll("_", " ")}</h3><span className="mx_NixorStatusPill">{action.status}</span></div>
                <p>{action.target_type}: {action.target_public_id}</p><p>{action.reason}</p><p>Policy: {action.policy_basis}{action.expires_at ? ` · Expires ${action.expires_at}` : ""}</p>
                <p>{action.human_authorized ? "Human authorized" : "Authorization missing"}</p>
                {hasNixorCapability(identity, "moderation.reverse") && action.status === "active" && !action.reversed_by_action_public_id && <details><summary>Reverse action</summary><form onSubmit={(event) => void reverse(event, action)}><label>Reversal reason<textarea name="reason" minLength={10} maxLength={10000} required /></label><button type="submit" disabled={busy === action.public_id}>Confirm reversal</button></form></details>}
            </article>)}</div>}
        </section>
    );
};

export default NixorModerationPanel;
