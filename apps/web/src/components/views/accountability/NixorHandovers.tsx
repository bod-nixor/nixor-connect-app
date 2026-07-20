/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import Spinner from "../elements/Spinner";
import {
    acknowledgeHandover,
    activateHandover,
    cancelHandover,
    createHandover,
    type GovernanceHandover,
    hasNixorCapability,
    listHandovers,
    type NixorIdentity,
} from "../../../nixor/accountabilityApi";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function toIso(value: string): string {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) throw new Error("Choose a valid effective date and time.");
    return date.toISOString();
}

function formatDate(value: string): string {
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

const NixorHandovers: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [handovers, setHandovers] = useState<GovernanceHandover[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            setHandovers(await listHandovers());
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not load handovers.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const run = async (id: string, operation: () => Promise<void>, success: string): Promise<void> => {
        setBusy(id);
        setError(null);
        setMessage(null);
        try {
            await operation();
            setMessage(success);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Handover was not updated.");
        } finally {
            setBusy(null);
        }
    };
    const create = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const manualRisk = formValue(form, "manual_risk");
        void run("create", async () => {
            const id = await createHandover({
                role_key: formValue(form, "role_key"),
                responsible_entity_key: formValue(form, "entity_key"),
                outgoing_matrix_user_id: formValue(form, "outgoing"),
                incoming_matrix_user_id: formValue(form, "incoming"),
                oversight_matrix_user_id: formValue(form, "oversight") || undefined,
                effective_at: toIso(formValue(form, "effective_at")),
                manual_items: manualRisk ? [{ item_type: "risk", title: "Known risk or blocker", detail: { note: manualRisk } }] : [],
            });
            setMessage(`Handover ${id} generated from current governed responsibilities.`);
            formElement.reset();
        }, "Handover package generated.");
    };
    const activate = (event: FormEvent<HTMLFormElement>, handover: GovernanceHandover): void => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        void run(handover.public_id, () => activateHandover(handover.public_id, reason), "Handover sent for required acknowledgements.");
    };
    const cancel = (event: FormEvent<HTMLFormElement>, handover: GovernanceHandover): void => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        void run(handover.public_id, () => cancelHandover(handover.public_id, reason), "Handover cancelled with its history preserved.");
    };
    const ownUserId = identity.identity.matrix_user_id;
    const canManage = hasNixorCapability(identity, "handover.manage");

    return (
        <section aria-labelledby="nixor-handovers-heading">
            <div className="mx_NixorWorkspace_sectionHeader"><div><h2 id="nixor-handovers-heading">Handovers and continuity</h2><p>Role changes package open responsibilities and require named-holder acknowledgements.</p></div></div>
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
            {hasNixorCapability(identity, "handover.create") && <details className="mx_NixorWorkspace_createPanel">
                <summary>Generate handover package</summary>
                <form onSubmit={create}>
                    <label>Role key<input name="role_key" pattern="^[a-z][a-z0-9_]{1,63}$" required /></label>
                    <label>Responsible entity key<input name="entity_key" maxLength={200} required /></label>
                    <label>Outgoing holder<input name="outgoing" defaultValue={ownUserId} pattern="^@[^:\s]+:[^\s]+$" required /></label>
                    <label>Incoming holder<input name="incoming" pattern="^@[^:\s]+:[^\s]+$" required /></label>
                    <label>Oversight holder (optional)<input name="oversight" pattern="^@[^:\s]+:[^\s]+$" /></label>
                    <label>Effective date and time<input name="effective_at" type="datetime-local" required /></label>
                    <label>Known risk or blocker (optional)<textarea name="manual_risk" maxLength={8000} /></label>
                    <button type="submit" disabled={busy === "create"}>{busy === "create" ? "Generating…" : "Generate handover"}</button>
                </form>
            </details>}
            {loading ? <div className="mx_NixorWorkspace_state" role="status"><Spinner /> Loading handovers…</div> : !handovers.length ? <p>No handovers are visible to you.</p> : <div className="mx_NixorWorkspace_cards">{handovers.map((handover) => {
                const acknowledgementType = handover.outgoing_matrix_user_id === ownUserId
                    ? "outgoing"
                    : handover.incoming_matrix_user_id === ownUserId
                        ? "incoming"
                        : handover.oversight_matrix_user_id === ownUserId
                            ? "oversight"
                            : null;
                return <article className="mx_NixorWorkspace_card" key={handover.public_id}>
                    <div className="mx_NixorWorkspace_cardHeader"><h3>{handover.role_key}</h3><span className="mx_NixorStatusPill">{handover.status.replaceAll("_", " ")}</span></div>
                    <p>{handover.outgoing_matrix_user_id} → {handover.incoming_matrix_user_id}</p>
                    <p>Entity: {handover.responsible_entity_key} · Effective: {formatDate(handover.effective_at)}</p>
                    <p>{handover.item_count} governed items · {handover.acknowledgement_count} acknowledgements</p>
                    {handover.status === "awaiting_acknowledgement" && acknowledgementType && <AccessibleButton className="mx_NixorWorkspace_primaryAction" disabled={busy === handover.public_id} onClick={() => void run(handover.public_id, () => acknowledgeHandover(handover.public_id, acknowledgementType), `${acknowledgementType} acknowledgement recorded.`)}>Acknowledge as {acknowledgementType} holder</AccessibleButton>}
                    {handover.status === "draft" && canManage && <details><summary>Activate acknowledgements</summary><form onSubmit={(event) => activate(event, handover)}><label>Confirmation reason<textarea name="reason" minLength={3} maxLength={500} required /></label><button type="submit" disabled={busy === handover.public_id}>Activate handover</button></form></details>}
                    {["draft", "awaiting_acknowledgement"].includes(handover.status) && canManage && <details><summary>Cancel handover</summary><form onSubmit={(event) => cancel(event, handover)}><label>Cancellation reason<textarea name="reason" minLength={3} maxLength={2000} required /></label><button type="submit" disabled={busy === handover.public_id}>Cancel handover</button></form></details>}
                </article>;
            })}</div>}
        </section>
    );
};

export default NixorHandovers;
