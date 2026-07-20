/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useMemo, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import Spinner from "../elements/Spinner";
import {
    createGovernedResource,
    type GovernedResource,
    type GovernedResourceTemplate,
    hasNixorCapability,
    listGovernedResources,
    listGovernedResourceTemplates,
    listProtectedResourceNames,
    type NixorIdentity,
    type ProtectedResourceName,
    promoteGovernedResource,
    registerProtectedResourceName,
    revokeProtectedResourceName,
    transferGovernedResource,
    transitionGovernedResource,
    updateGovernedResource,
} from "../../../nixor/accountabilityApi";
import { openNixorMatrixRoom } from "../../../nixor/accountabilityNavigation";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function matrixIds(value: string): string[] {
    return Array.from(new Set(value.split(/[\s,]+/).filter(Boolean)));
}

function classificationLabel(value: GovernedResource["classification"]): string {
    if (value === "formal_non_official") return "formal — non-official";
    return value;
}

function canCreateTemplate(identity: NixorIdentity, template: GovernedResourceTemplate): boolean {
    const capability = template.classification === "official"
        ? "resource.create.official"
        : template.classification === "formal_non_official"
            ? "resource.create.formal"
            : "resource.create.informal";
    return hasNixorCapability(identity, capability);
}

const CreateResourcePanel: React.FC<{
    identity: NixorIdentity;
    resources: GovernedResource[];
    templates: GovernedResourceTemplate[];
    onCreated: () => Promise<void>;
}> = ({ identity, resources, templates, onCreated }) => {
    const availableTemplates = useMemo(
        () => templates.filter((template) => canCreateTemplate(identity, template)),
        [identity, templates],
    );
    const [templateKey, setTemplateKey] = useState(availableTemplates[0]?.template_key ?? "");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const template = availableTemplates.find((candidate) => candidate.template_key === templateKey);

    useEffect(() => {
        if (!availableTemplates.some((candidate) => candidate.template_key === templateKey)) {
            setTemplateKey(availableTemplates[0]?.template_key ?? "");
        }
    }, [availableTemplates, templateKey]);

    if (!availableTemplates.length) return null;
    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!template) return;
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            const result = await createGovernedResource({
                resource_key: formValue(form, "resource_key"),
                display_name: formValue(form, "display_name"),
                topic: formValue(form, "topic") || undefined,
                resource_type: template.resource_type,
                classification: template.classification,
                template_key: template.template_key,
                responsible_entity_key: formValue(form, "responsible_entity_key") || undefined,
                accountable_owner_matrix_user_id: formValue(form, "owner") || undefined,
                moderators: matrixIds(formValue(form, "moderators")),
                parent_resource_key: formValue(form, "parent_resource_key") || undefined,
                visibility: formValue(form, "visibility") as "private" | "public",
                reason: formValue(form, "reason"),
            });
            setMessage(`${result.resource_key} created and registered as a governed ${template.resource_type}.`);
            formElement.reset();
            await onCreated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Governed server was not created.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <details className="mx_NixorWorkspace_createPanel">
            <summary>Create governed server or channel</summary>
            <form onSubmit={(event) => void submit(event)}>
                <label>
                    Governed template
                    <select value={templateKey} onChange={(event) => setTemplateKey(event.target.value)}>
                        {availableTemplates.map((candidate) => (
                            <option key={candidate.template_key} value={candidate.template_key}>
                                {candidate.display_name} — {classificationLabel(candidate.classification)} {candidate.resource_type}
                            </option>
                        ))}
                    </select>
                </label>
                <label>Stable resource key<input name="resource_key" pattern="^[a-z0-9][a-z0-9._:-]{2,199}$" required /></label>
                <label>Display name<input name="display_name" minLength={2} maxLength={160} required /></label>
                <label>Topic<textarea name="topic" maxLength={1000} /></label>
                {template?.resource_type === "channel" && (
                    <label>
                        Parent governed server
                        <select name="parent_resource_key" required>
                            <option value="">Choose a server</option>
                            {resources.filter((resource) => resource.resource_type === "space" && resource.lifecycle_state === "active").map((resource) => (
                                <option key={resource.resource_key} value={resource.resource_key}>{resource.display_name}</option>
                            ))}
                        </select>
                    </label>
                )}
                {template?.classification === "official" && <label>Responsible entity key<input name="responsible_entity_key" maxLength={200} required /></label>}
                {template?.classification !== "informal" && <label>Accountable owner Matrix ID<input name="owner" defaultValue={identity.identity.matrix_user_id} pattern="^@[^:\s]+:[^\s]+$" /></label>}
                <label>
                    Moderator Matrix IDs {template?.classification === "informal" ? "(at least one required)" : "(optional)"}
                    <textarea
                        name="moderators"
                        defaultValue={template?.classification === "informal" ? identity.identity.matrix_user_id : ""}
                        required={template?.classification === "informal"}
                        maxLength={12500}
                    />
                </label>
                <label>Visibility<select name="visibility" defaultValue="private"><option value="private">Private</option><option value="public">Public directory</option></select></label>
                <label>Creation reason<textarea name="reason" minLength={3} maxLength={500} required /></label>
                <p className="mx_NixorWorkspace_disclosure">
                    Official names require institutional authority. Informal servers remain visibly non-official and are quota-limited.
                </p>
                {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
                {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
                <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create governed resource"}</button>
            </form>
        </details>
    );
};

const ProtectedNameRegistry: React.FC<{
    identity: NixorIdentity;
    protectedNames: ProtectedResourceName[];
    templates: GovernedResourceTemplate[];
    onUpdated: () => Promise<void>;
}> = ({ identity, protectedNames, templates, onUpdated }) => {
    const canManage = hasNixorCapability(identity, "resource.protected_name.manage");
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    if (!canManage && !protectedNames.length) return null;

    const register = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy("register");
        setError(null);
        setMessage(null);
        try {
            const registered = await registerProtectedResourceName({
                display_name: formValue(form, "display_name"),
                responsible_entity_key: formValue(form, "responsible_entity_key") || undefined,
                allowed_template_keys: Array.from(new Set(formValue(form, "allowed_template_keys").split(/[\s,]+/).filter(Boolean))),
                reason: formValue(form, "reason"),
            });
            setMessage(`${registered.display_name} is now protected from unofficial use.`);
            formElement.reset();
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Protected name was not registered.");
        } finally {
            setBusy(null);
        }
    };
    const revoke = async (event: FormEvent<HTMLFormElement>, protectedName: ProtectedResourceName): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy(protectedName.normalized_name);
        setError(null);
        setMessage(null);
        try {
            await revokeProtectedResourceName(protectedName.normalized_name, formValue(form, "reason"));
            setMessage(`${protectedName.display_name} is no longer reserved.`);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Protected name was not revoked.");
        } finally {
            setBusy(null);
        }
    };

    return <details className="mx_NixorWorkspace_createPanel">
        <summary>Protected institutional names and branding</summary>
        <p>Reserved names can only be used by matching official resources and approved templates.</p>
        {canManage && <form onSubmit={(event) => void register(event)}>
            <label>Protected display name<input name="display_name" minLength={2} maxLength={160} required /></label>
            <label>Responsible entity key<input name="responsible_entity_key" maxLength={200} /></label>
            <label>
                Allowed template keys
                <input name="allowed_template_keys" list="nixor-protected-template-keys" placeholder="entity, department" />
                <datalist id="nixor-protected-template-keys">{templates.filter((template) => template.classification === "official").map((template) => <option key={template.template_key} value={template.template_key} />)}</datalist>
            </label>
            <label>Registration reason<textarea name="reason" minLength={3} maxLength={500} required /></label>
            <button type="submit" disabled={busy !== null}>{busy === "register" ? "Registering…" : "Register protected name"}</button>
        </form>}
        {protectedNames.length > 0 && <div className="mx_NixorWorkspace_cards">{protectedNames.map((protectedName) => <article className="mx_NixorWorkspace_card" key={protectedName.normalized_name}>
            <h3>{protectedName.display_name}</h3>
            <p>Normalized registry key: {protectedName.normalized_name}</p>
            {protectedName.responsible_entity_key && <p>Responsible entity: {protectedName.responsible_entity_key}</p>}
            <p>Allowed templates: {protectedName.allowed_template_keys.length ? protectedName.allowed_template_keys.join(", ") : "any official template"}</p>
            {canManage && <form onSubmit={(event) => void revoke(event, protectedName)}>
                <label>Revocation reason<textarea name="reason" minLength={3} maxLength={500} required /></label>
                <button type="submit" disabled={busy !== null}>{busy === protectedName.normalized_name ? "Revoking…" : "Revoke protection"}</button>
            </form>}
        </article>)}</div>}
        {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
        {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
    </details>;
};

const ResourceManagement: React.FC<{
    identity: NixorIdentity;
    resource: GovernedResource;
    templates: GovernedResourceTemplate[];
    onUpdated: () => Promise<void>;
}> = ({ identity, resource, templates, onUpdated }) => {
    const [busy, setBusy] = useState(false);
    const [promotionClassification, setPromotionClassification] = useState<"official" | "formal_non_official">(
        "formal_non_official",
    );
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const run = async (operation: () => Promise<void>, success: string): Promise<void> => {
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await operation();
            setMessage(success);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Governed resource was not updated.");
        } finally {
            setBusy(false);
        }
    };
    const transition = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => transitionGovernedResource(
                resource.resource_key,
                formValue(form, "state") as "draft" | "active" | "frozen" | "archived" | "suspended",
                formValue(form, "reason"),
            ),
            "Lifecycle state updated.",
        );
    };
    const transfer = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => transferGovernedResource(resource.resource_key, formValue(form, "owner"), formValue(form, "reason")),
            "Accountable ownership transferred.",
        );
    };
    const updateMetadata = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => updateGovernedResource(resource.resource_key, {
                display_name: formValue(form, "display_name"),
                responsible_entity_key: formValue(form, "responsible_entity_key") || null,
                moderator_group: matrixIds(formValue(form, "moderators")),
                retention_policy_key: formValue(form, "retention_policy_key"),
                escalation_policy_key: formValue(form, "escalation_policy_key") || null,
            }),
            "Governed metadata and policies updated.",
        );
    };
    const promote = (event: FormEvent<HTMLFormElement>): void => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        void run(
            () => promoteGovernedResource(
                resource.resource_key,
                formValue(form, "classification") as "official" | "formal_non_official",
                formValue(form, "entity"),
                formValue(form, "template"),
                formValue(form, "reason"),
            ),
            "Resource classification promoted.",
        );
    };
    const promotableTemplates = templates.filter((template) =>
        template.resource_type === resource.resource_type && template.classification === promotionClassification,
    );

    if (!hasNixorCapability(identity, "resource.manage") &&
        !hasNixorCapability(identity, "resource.lifecycle") &&
        !hasNixorCapability(identity, "resource.transfer") &&
        !hasNixorCapability(identity, "resource.promote")) return null;

    return (
        <details>
            <summary>Manage governed resource</summary>
            <p>High-impact changes require a short-lived, action-bound confirmation and are audited.</p>
            {hasNixorCapability(identity, "resource.manage") && <form onSubmit={updateMetadata}>
                <label>Display name<input name="display_name" defaultValue={resource.display_name} minLength={2} maxLength={160} required /></label>
                <label>Responsible entity key<input name="responsible_entity_key" defaultValue={resource.responsible_entity_key ?? ""} maxLength={200} required={resource.classification === "official"} /></label>
                <label>Moderator Matrix IDs<textarea name="moderators" defaultValue={resource.moderator_group.join("\n")} required={resource.classification === "informal"} /></label>
                <label>Retention policy key<input name="retention_policy_key" defaultValue={resource.retention_policy_key} pattern="^[a-z][a-z0-9_]{1,63}$" required /></label>
                <label>Escalation policy key<input name="escalation_policy_key" defaultValue={resource.escalation_policy_key ?? ""} pattern="^[a-z][a-z0-9_]{1,63}$" /></label>
                <button type="submit" disabled={busy}>Save governed metadata</button>
            </form>}
            {hasNixorCapability(identity, "resource.lifecycle") && <form onSubmit={transition}>
                <label>Lifecycle state<select name="state" defaultValue={resource.lifecycle_state}><option value="active">Active</option><option value="frozen">Frozen</option><option value="archived">Archived</option><option value="suspended">Suspended</option></select></label>
                <label>Reason<textarea name="reason" minLength={3} maxLength={500} required /></label>
                <button type="submit" disabled={busy}>Confirm lifecycle change</button>
            </form>}
            {hasNixorCapability(identity, "resource.transfer") && <form onSubmit={transfer}>
                <label>New accountable owner<input name="owner" pattern="^@[^:\s]+:[^\s]+$" required /></label>
                <label>Reason<textarea name="reason" minLength={3} maxLength={500} required /></label>
                <button type="submit" disabled={busy}>Confirm ownership transfer</button>
            </form>}
            {resource.classification !== "official" && hasNixorCapability(identity, "resource.promote") && <form onSubmit={promote}>
                <label>Classification<select name="classification" value={promotionClassification} onChange={(event) => setPromotionClassification(event.target.value as "official" | "formal_non_official")}><option value="formal_non_official">Formal — non-official</option><option value="official">Official</option></select></label>
                <label>Responsible entity key<input name="entity" maxLength={200} required /></label>
                <label>Template<select name="template">{promotableTemplates.map((template) => <option key={template.template_key} value={template.template_key}>{template.display_name}</option>)}</select></label>
                <label>Reason<textarea name="reason" minLength={3} maxLength={500} required /></label>
                <button type="submit" disabled={busy}>Confirm promotion</button>
            </form>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </details>
    );
};

const NixorServersView: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [resources, setResources] = useState<GovernedResource[]>([]);
    const [templates, setTemplates] = useState<GovernedResourceTemplate[]>([]);
    const [protectedNames, setProtectedNames] = useState<ProtectedResourceName[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [resourceRows, templateRows, protectedNameRows] = await Promise.all([
                listGovernedResources(),
                listGovernedResourceTemplates(),
                listProtectedResourceNames(),
            ]);
            setResources(resourceRows);
            setTemplates(templateRows);
            setProtectedNames(protectedNameRows);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not load governed servers.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);
    if (loading) return <div className="mx_NixorWorkspace_state" role="status"><Spinner /> Loading governed servers…</div>;
    if (error && !resources.length) return <div className="mx_NixorWorkspace_state mx_NixorWorkspace_error" role="alert"><p>{error}</p><AccessibleButton onClick={() => void load()}>Try again</AccessibleButton></div>;

    return (
        <>
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            <CreateResourcePanel identity={identity} resources={resources} templates={templates} onCreated={load} />
            <ProtectedNameRegistry identity={identity} protectedNames={protectedNames} templates={templates} onUpdated={load} />
            {!resources.length ? <div className="mx_NixorWorkspace_state">No governed servers are assigned to you.</div> : (
                <div className="mx_NixorWorkspace_cards">
                    {resources.map((resource) => (
                        <article className="mx_NixorWorkspace_card" key={resource.resource_key}>
                            <div className="mx_NixorWorkspace_cardHeader">
                                <h2>{resource.display_name}</h2>
                                <span className={`mx_NixorStatusPill${resource.classification !== "official" ? " mx_NixorStatusPill_danger" : ""}`}>
                                    {classificationLabel(resource.classification)}
                                </span>
                            </div>
                            <p>{resource.resource_type === "space" ? "Server" : "Channel"} · {resource.lifecycle_state}</p>
                            {resource.responsible_entity_key && <p>Responsible entity: {resource.responsible_entity_key}</p>}
                            {resource.accountable_owner_matrix_user_id && <p>Accountable owner: {resource.accountable_owner_matrix_user_id}</p>}
                            <p>Policies: retention {resource.retention_policy_key}{resource.escalation_policy_key ? ` · escalation ${resource.escalation_policy_key}` : ""}</p>
                            <p>Creation source: {resource.creation_source} · visibility {resource.matrix_visibility}</p>
                            {resource.protected_branding && <p className="mx_NixorWorkspace_disclosure">Protected institutional name and branding</p>}
                            <AccessibleButton onClick={() => openNixorMatrixRoom(resource.matrix_room_id)}>Open in Matrix</AccessibleButton>
                            <ResourceManagement identity={identity} resource={resource} templates={templates} onUpdated={load} />
                        </article>
                    ))}
                </div>
            )}
        </>
    );
};

export default NixorServersView;
