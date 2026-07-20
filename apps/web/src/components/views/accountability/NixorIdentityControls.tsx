/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useState } from "react";

import {
    createGovernanceRoleAssignment,
    type GovernanceRoleAssignment,
    hasNixorCapability,
    listGovernanceRoleAssignments,
    listMatrixDevices,
    type MatrixDevice,
    type NixorIdentity,
    revokeGovernanceRoleAssignment,
    revokeMatrixDeviceAsAdmin,
    revokeOwnMatrixDevice,
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

function formatDeviceDate(value?: number): string {
    if (!value) return "No last-seen timestamp";
    return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export const NixorDevicePanel: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [devices, setDevices] = useState<MatrixDevice[]>([]);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try { setDevices(await listMatrixDevices()); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Matrix devices were not loaded."); }
        finally { setLoading(false); }
    }, []);
    useEffect(() => { void load(); }, [load]);
    const revoke = async (event: FormEvent<HTMLFormElement>, device: MatrixDevice): Promise<void> => {
        event.preventDefault();
        const reason = formValue(new FormData(event.currentTarget), "reason");
        setBusy(device.device_id); setError(null); setMessage(null);
        try {
            await revokeOwnMatrixDevice(device.device_id, reason);
            setMessage(device.device_id === identity.session.matrix_device_id
                ? "This device was revoked. Your current session will end when its revocation is observed."
                : `Device ${device.device_id} revoked together with its Connect sessions.`);
            await load();
        } catch (reasonValue) {
            setError(reasonValue instanceof Error ? reasonValue.message : "Device was not revoked.");
        } finally {
            setBusy(null);
        }
    };
    if (!hasNixorCapability(identity, "session.device.self")) return null;
    return (
        <section aria-labelledby="nixor-devices-heading">
            <h2 id="nixor-devices-heading">Your signed-in devices</h2>
            <p>Revoking a Matrix device also revokes its bound Nixor Connect sessions.</p>
            {loading ? <p role="status">Loading devices…</p> : !devices.length ? <p>No devices were returned.</p> : <div className="mx_NixorWorkspace_cards">{devices.map((device) => <article className="mx_NixorWorkspace_card" key={device.device_id}><div className="mx_NixorWorkspace_cardHeader"><h3>{device.display_name || device.device_id}</h3>{device.device_id === identity.session.matrix_device_id && <span className="mx_NixorStatusPill">current device</span>}</div><p>{device.device_id} · {formatDeviceDate(device.last_seen_ts)}</p>{device.last_seen_ip && <p>Last seen IP: {device.last_seen_ip}</p>}<details><summary>Revoke device</summary><form onSubmit={(event) => void revoke(event, device)}><p>{device.device_id === identity.session.matrix_device_id ? "Revoking this device will end the current session." : "This cannot be undone; the device must sign in again."}</p><label>Reason<input name="reason" minLength={3} maxLength={500} required /></label><button type="submit" disabled={busy !== null}>Confirm revocation</button></form></details></article>)}</div>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </section>
    );
};

export const NixorIdentityAdminPanel: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [matrixUserId, setMatrixUserId] = useState("");
    const [assignments, setAssignments] = useState<GovernanceRoleAssignment[]>([]);
    const [scopeType, setScopeType] = useState<GovernanceRoleAssignment["scope_type"]>("resource");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const canViewRoles = hasNixorCapability(identity, "role.view");
    const canAssignRoles = hasNixorCapability(identity, "role.assign");
    const loadAssignments = useCallback(async (userId: string) => {
        if (!userId) return;
        setBusy("roles"); setError(null);
        try { setAssignments(await listGovernanceRoleAssignments(userId)); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Role assignments were not loaded."); }
        finally { setBusy(null); }
    }, []);
    const searchRoles = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const value = formValue(new FormData(event.currentTarget), "matrix_user_id");
        setMatrixUserId(value);
        void loadAssignments(value);
    };
    const assignRole = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const targetUser = formValue(form, "matrix_user_id");
        setBusy("assign"); setError(null); setMessage(null);
        try {
            const id = await createGovernanceRoleAssignment({
                matrix_user_id: targetUser,
                role_key: formValue(form, "role_key"),
                scope_type: scopeType,
                ...(scopeType === "global" ? {} : { scope_key: formValue(form, "scope_key") }),
                reason: formValue(form, "reason"),
                expires_at: toIso(formValue(form, "expires_at")),
            });
            setMessage(`Delegated role assignment ${id} created. NCP-managed institutional roles remain authoritative.`);
            setMatrixUserId(targetUser);
            await loadAssignments(targetUser);
            formElement.reset();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Role assignment was not created.");
        } finally {
            setBusy(null);
        }
    };
    const revokeRole = async (event: FormEvent<HTMLFormElement>, assignment: GovernanceRoleAssignment): Promise<void> => {
        event.preventDefault();
        setBusy(assignment.public_id); setError(null); setMessage(null);
        try {
            await revokeGovernanceRoleAssignment(
                assignment.public_id,
                formValue(new FormData(event.currentTarget), "reason"),
            );
            setMessage(`Delegated assignment ${assignment.public_id} revoked with its history preserved.`);
            await loadAssignments(matrixUserId);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Role assignment was not revoked.");
        } finally {
            setBusy(null);
        }
    };
    const revokeAdminDevice = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy("admin-device"); setError(null); setMessage(null);
        try {
            await revokeMatrixDeviceAsAdmin(
                formValue(form, "matrix_user_id"),
                formValue(form, "device_id"),
                formValue(form, "reason"),
            );
            setMessage("The selected user device and its Connect sessions were revoked and audited.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "User device was not revoked.");
        } finally {
            setBusy(null);
        }
    };
    return (
        <section aria-labelledby="nixor-identity-admin-heading">
            <h2 id="nixor-identity-admin-heading">Identity, devices, and delegated roles</h2>
            <p>NCP remains the source of truth for institutional roles. Local delegation is bounded by your authority, scope, expiry, and step-up confirmation.</p>
            {canViewRoles && <form className="mx_NixorWorkspace_search" onSubmit={searchRoles}><label>User Matrix ID<input name="matrix_user_id" pattern="^@[^:\s]+:[^\s]+$" required /></label><button type="submit" disabled={busy !== null}>Load active assignments</button></form>}
            {assignments.length > 0 && <div className="mx_NixorWorkspace_cards">{assignments.map((assignment) => <article className="mx_NixorWorkspace_card" key={assignment.public_id}><div className="mx_NixorWorkspace_cardHeader"><h3>{assignment.role_key}</h3><span>{assignment.source}</span></div><p>{assignment.scope_type}{assignment.scope_key ? `:${assignment.scope_key}` : ""}</p>{assignment.expires_at && <p>Expires {assignment.expires_at}</p>}{canAssignRoles && assignment.source !== "ncp" && assignment.matrix_user_id !== identity.identity.matrix_user_id && <details><summary>Revoke delegated assignment</summary><form onSubmit={(event) => void revokeRole(event, assignment)}><label>Reason<input name="reason" minLength={3} maxLength={500} required /></label><button type="submit" disabled={busy !== null}>Confirm revocation</button></form></details>}{assignment.source === "ncp" && <p>Managed by NCP; change it at the source of truth.</p>}</article>)}</div>}
            {canAssignRoles && <details><summary>Create bounded role delegation</summary><form onSubmit={(event) => void assignRole(event)}><label>User Matrix ID<input name="matrix_user_id" pattern="^@[^:\s]+:[^\s]+$" required /></label><label>Role key<input name="role_key" pattern="^[a-z][a-z0-9_]{1,63}$" required /></label><label>Scope<select name="scope_type" value={scopeType} onChange={(event) => setScopeType(event.target.value as GovernanceRoleAssignment["scope_type"])}><option value="global">Global</option><option value="resource">Resource</option><option value="entity">Entity</option><option value="project">Project</option><option value="case">Case</option></select></label>{scopeType !== "global" && <label>Scope key<input name="scope_key" maxLength={255} required /></label>}<label>Expiry (optional)<input name="expires_at" type="datetime-local" /></label><label>Reason<textarea name="reason" minLength={3} maxLength={500} required /></label><button type="submit" disabled={busy !== null}>Confirm delegation</button></form></details>}
            {hasNixorCapability(identity, "session.device.admin") && <details><summary>Revoke a user device</summary><form onSubmit={(event) => void revokeAdminDevice(event)}><label>User Matrix ID<input name="matrix_user_id" pattern="^@[^:\s]+:[^\s]+$" required /></label><label>Matrix device ID<input name="device_id" minLength={1} maxLength={255} required /></label><label>Reason<textarea name="reason" minLength={3} maxLength={500} required /></label><button type="submit" disabled={busy !== null}>Confirm administrative revocation</button></form></details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </section>
    );
};
