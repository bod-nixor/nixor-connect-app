/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, type JSX, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
    AdminIcon,
    ChatSolidIcon,
    CheckIcon,
    ErrorSolidIcon,
    HomeSolidIcon,
    LockIcon,
    NotificationsSolidIcon,
    PollsIcon,
    RoomIcon,
    SettingsSolidIcon,
    UserProfileSolidIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import AccessibleButton from "../elements/AccessibleButton";
import Spinner from "../elements/Spinner";
import NixorBotDirectory from "../bots/NixorBotDirectory";
import NixorActionCard from "./NixorActionCard";
import NixorAuditRetentionPanel from "./NixorAuditRetentionPanel";
import NixorCaseCard from "./NixorCaseCard";
import NixorDirectMessagesView from "./NixorDirectMessagesView";
import NixorDecisionCard from "./NixorDecisionCard";
import NixorFormalNotices from "./NixorFormalNotices";
import NixorHandovers from "./NixorHandovers";
import { NixorDevicePanel, NixorIdentityAdminPanel } from "./NixorIdentityControls";
import NixorModerationPanel from "./NixorModerationPanel";
import NixorSearchExportPanel from "./NixorSearchExportPanel";
import NixorServersView from "./NixorServersView";
import SdkConfig from "../../../SdkConfig";
import {
    type AccountabilityAction,
    type AccountabilityActionView,
    addReportInformation,
    createActionItem,
    createCaseFromReport,
    createDecision,
    createReport,
    dismissNotification,
    getAdminStatus,
    getNixorIdentity,
    getNotificationPreferences,
    type GovernanceCase,
    type GovernanceDecision,
    type GovernanceNotification,
    type GovernanceReport,
    hasNixorCapability,
    listActionItems,
    listCases,
    listDecisions,
    listFormalNotices,
    listNotifications,
    listReports,
    markAllNotificationsRead,
    markNotificationRead,
    type NixorIdentity,
    type NotificationPreferences,
    submitCaseAppeal,
    updateNotificationPreferences,
} from "../../../nixor/accountabilityApi";
import {
    browserPushIsSupported,
    disableNixorBrowserPush,
    enableNixorBrowserPush,
} from "../../../nixor/pushNotifications";
import {
    type NixorPrimaryView,
    openNixorPrimaryView,
    openNixorSettings,
    useNixorPrimaryView,
} from "../../../nixor/accountabilityNavigation";

interface NavItem {
    id: NixorPrimaryView | "settings";
    label: string;
    icon: JSX.Element;
    gated?: "cases" | "admin";
}

const NAV_ITEMS: NavItem[] = [
    { id: "home", label: "Home", icon: <HomeSolidIcon /> },
    { id: "direct_messages", label: "Direct Messages", icon: <ChatSolidIcon /> },
    { id: "servers", label: "Servers", icon: <RoomIcon /> },
    { id: "accountability", label: "Accountability", icon: <CheckIcon /> },
    { id: "decisions", label: "Decisions", icon: <PollsIcon /> },
    { id: "reports", label: "Reports", icon: <ErrorSolidIcon /> },
    { id: "cases", label: "Cases", icon: <LockIcon />, gated: "cases" },
    { id: "bots", label: "Bots", icon: <UserProfileSolidIcon /> },
    { id: "notifications", label: "Notifications", icon: <NotificationsSolidIcon /> },
    { id: "admin", label: "Admin / Developer", icon: <AdminIcon />, gated: "admin" },
    { id: "settings", label: "Settings", icon: <SettingsSolidIcon /> },
];

function canViewCases(identity: NixorIdentity | null): boolean {
    return identity?.capabilities.some((capability) => capability.startsWith("case.")) === true;
}

function canViewAdmin(identity: NixorIdentity | null): boolean {
    if (!identity) return false;
    return identity.capabilities.some((capability) =>
        capability === "support.identity" ||
        capability === "session.device.admin" ||
        capability.startsWith("audit.") ||
        capability.startsWith("developer.") ||
        capability.startsWith("moderation.") ||
        capability.startsWith("retention.") ||
        capability.startsWith("role."),
    );
}

function useIdentity(): { identity: NixorIdentity | null; error: string | null } {
    const [identity, setIdentity] = useState<NixorIdentity | null>(null);
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        let disposed = false;
        void getNixorIdentity().then((value) => {
            if (!disposed) setIdentity(value);
        }).catch((reason: unknown) => {
            if (!disposed) setError(reason instanceof Error ? reason.message : "Could not load your Connect role.");
        });
        return () => { disposed = true; };
    }, []);
    return { identity, error };
}

function useOnline(): boolean {
    const [online, setOnline] = useState(() => navigator.onLine);
    useEffect(() => {
        const update = (): void => setOnline(navigator.onLine);
        window.addEventListener("online", update);
        window.addEventListener("offline", update);
        return () => {
            window.removeEventListener("online", update);
            window.removeEventListener("offline", update);
        };
    }, []);
    return online;
}

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const NixorInstallButton: React.FC = () => {
    const [promptEvent, setPromptEvent] = useState<BeforeInstallPromptEvent | null>(null);
    useEffect(() => {
        const onPrompt = (event: Event): void => {
            event.preventDefault();
            setPromptEvent(event as BeforeInstallPromptEvent);
        };
        window.addEventListener("beforeinstallprompt", onPrompt);
        return () => window.removeEventListener("beforeinstallprompt", onPrompt);
    }, []);
    if (!promptEvent || window.matchMedia("(display-mode: standalone)").matches) return null;
    return (
        <AccessibleButton
            className="mx_NixorWorkspace_install"
            onClick={() => {
                void promptEvent.prompt().then(() => promptEvent.userChoice).finally(() => setPromptEvent(null));
            }}
        >
            Install Nixor Connect
        </AccessibleButton>
    );
};

function formatDate(value?: string | null): string {
    if (!value) return "No deadline";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function toIsoDateTime(value: string): string | undefined {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function formValue(form: FormData, name: string, fallback = ""): string {
    const value = form.get(name);
    return typeof value === "string" ? value : fallback;
}

function listFormValue(form: FormData, name: string): string[] {
    return Array.from(new Set(formValue(form, name).split(/[\s,]+/).filter(Boolean)));
}

function lineFormValue(form: FormData, name: string): string[] {
    return Array.from(new Set(formValue(form, name).split(/\r?\n/).map((value) => value.trim()).filter(Boolean)));
}

function displayValue(value: unknown, fallback = "—"): string {
    return typeof value === "string" || typeof value === "number" || typeof value === "boolean"
        ? String(value)
        : fallback;
}

function StatusPill({ value, danger = false }: { value: string; danger?: boolean }): JSX.Element {
    return <span className={`mx_NixorStatusPill${danger ? " mx_NixorStatusPill_danger" : ""}`}>{value.replaceAll("_", " ")}</span>;
}

function ViewState({ loading, error, empty, onRetry }: {
    loading: boolean;
    error: string | null;
    empty?: string;
    onRetry: () => void;
}): JSX.Element | null {
    if (loading) return <div className="mx_NixorWorkspace_state" role="status"><Spinner /> Loading…</div>;
    if (error) {
        return (
            <div className="mx_NixorWorkspace_state mx_NixorWorkspace_error" role="alert">
                <p>{error}</p>
                <AccessibleButton onClick={onRetry}>Try again</AccessibleButton>
            </div>
        );
    }
    if (empty) return <div className="mx_NixorWorkspace_state">{empty}</div>;
    return null;
}

export const NixorPrimaryNavigation: React.FC<{ identity?: NixorIdentity | null }> = ({ identity = null }) => {
    const activeView = useNixorPrimaryView();
    const visibleItems = NAV_ITEMS.filter((item) => {
        if (item.gated === "cases") return canViewCases(identity);
        if (item.gated === "admin") return canViewAdmin(identity);
        return true;
    });
    const navigate = (id: NavItem["id"]): void => {
        if (id === "settings") openNixorSettings();
        else openNixorPrimaryView(id);
    };

    return (
        <nav className="mx_NixorPrimaryNavigation" aria-label="Nixor Connect primary navigation">
            {visibleItems.map((item) => (
                <AccessibleButton
                    key={item.id}
                    className="mx_NixorPrimaryNavigation_item"
                    aria-current={item.id === activeView ? "page" : undefined}
                    onClick={() => navigate(item.id)}
                >
                    {item.icon}
                    <span>{item.label}</span>
                </AccessibleButton>
            ))}
        </nav>
    );
};

export const NixorHomeOverview: React.FC<{ identity: NixorIdentity | null }> = ({ identity }) => {
    const [counts, setCounts] = useState<{ notices: number; overdue: number; notifications: number } | null>(null);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        setError(null);
        const [notices, actions, notifications] = await Promise.allSettled([
            listFormalNotices(),
            listActionItems("mine"),
            listNotifications(true),
        ]);
        const failed = [notices, actions, notifications].filter((result) => result.status === "rejected");
        if (failed.length === 3) {
            const reason = (failed[0] as PromiseRejectedResult).reason;
            setError(reason instanceof Error ? reason.message : "Could not load your accountability summary.");
            return;
        }
        const noticeRows = notices.status === "fulfilled" ? notices.value : [];
        const actionRows = actions.status === "fulfilled" ? actions.value : [];
        setCounts({
            notices: noticeRows.filter((notice) => notice.acknowledgement_required && !notice.acknowledged).length,
            overdue: actionRows.filter((action) => action.status === "overdue" || Boolean(action.due_at && new Date(action.due_at).getTime() < Date.now())).length,
            notifications: notifications.status === "fulfilled" ? notifications.value.unread_count : 0,
        });
    }, []);
    useEffect(() => { void load(); }, [load]);

    return (
        <section className="mx_NixorHomeOverview" aria-labelledby="nixor-overview-title">
            <div className="mx_NixorWorkspace_sectionHeader">
                <div>
                    <h2 id="nixor-overview-title">Your governed work</h2>
                    <p>Instructions, commitments, reports, and follow-up remain attributable and reviewable.</p>
                </div>
                {identity && (
                    <div className="mx_NixorRoleLabels" aria-label="Your institutional roles">
                        {identity.global_roles.map((role) => <StatusPill key={role} value={role} />)}
                        {identity.identity.identity_type !== "human" && <StatusPill value={identity.identity.identity_type} />}
                    </div>
                )}
            </div>
            {error && <div className="mx_NixorWorkspace_error" role="alert">{error}</div>}
            {!counts && !error ? <Spinner /> : counts && (
                <div className="mx_NixorHomeOverview_grid">
                    <AccessibleButton onClick={() => openNixorPrimaryView("accountability")}>
                        <strong>{counts.notices}</strong><span>notices awaiting acknowledgement</span>
                    </AccessibleButton>
                    <AccessibleButton onClick={() => openNixorPrimaryView("accountability")}>
                        <strong>{counts.overdue}</strong><span>overdue action items</span>
                    </AccessibleButton>
                    <AccessibleButton onClick={() => openNixorPrimaryView("notifications")}>
                        <strong>{counts.notifications}</strong><span>unread notifications</span>
                    </AccessibleButton>
                </div>
            )}
        </section>
    );
};

const AccountabilityView: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [actions, setActions] = useState<AccountabilityAction[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionView, setActionView] = useState<AccountabilityActionView>("mine");
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            setActions(await listActionItems(actionView));
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load accountability records."); }
        finally { setLoading(false); }
    }, [actionView]);
    useEffect(() => { void load(); }, [load]);
    const state = <ViewState loading={loading} error={error} onRetry={load} />;
    if (state && loading) return state;
    return (
        <>
            {error && state}
            {hasNixorCapability(identity, "action.create") && <CreateActionForm identity={identity} onCreated={load} />}
            <NixorFormalNotices identity={identity} />
            <section aria-labelledby="action-items-heading">
                <div className="mx_NixorWorkspace_sectionHeader"><div><h2 id="action-items-heading">Action items</h2><p>Assignments remain visible through evidence, review, and resolution.</p></div><label>View<select value={actionView} onChange={(event) => setActionView(event.target.value as AccountabilityActionView)}><option value="mine">My responsibilities</option><option value="assigned_by_me">Assigned by me</option><option value="team">Team / entity</option><option value="overdue">Overdue</option><option value="awaiting_review">Awaiting review</option><option value="resolved">Resolved</option><option value="all">All visible</option></select></label></div>
                {!actions.length ? <div className="mx_NixorWorkspace_state">No action items are visible to you.</div> : (
                    <div className="mx_NixorWorkspace_cards">
                        {actions.map((action) => <NixorActionCard key={action.public_id} action={action} identity={identity} onUpdated={load} />)}
                    </div>
                )}
            </section>
            <NixorHandovers identity={identity} />
        </>
    );
};

const CreateActionForm: React.FC<{ identity: NixorIdentity; onCreated: () => Promise<void> }> = ({ identity, onCreated }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState<string | null>(null);
    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault(); setBusy(true); setError(null); setCreated(null);
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        try {
            const result = await createActionItem({
                title: formValue(form, "title"), description: formValue(form, "description"),
                assignees: [{ matrix_user_id: formValue(form, "assignee"), role: "assignee" }],
                acceptance_reviewer_matrix_user_id: formValue(form, "reviewer") || undefined,
                resource_key: formValue(form, "resource_key") || undefined,
                responsible_entity_key: formValue(form, "entity_key") || undefined,
                project_key: formValue(form, "project_key") || undefined,
                priority: formValue(form, "priority") as "low" | "normal" | "high" | "critical",
                category: formValue(form, "category", "general"),
                due_at: toIsoDateTime(formValue(form, "due_at")),
                due_timezone: formValue(form, "timezone", "Asia/Karachi"),
                source_matrix_room_id: formValue(form, "source_room") || undefined,
                source_matrix_event_id: formValue(form, "source_event") || undefined,
                evidence_requirements: formValue(form, "evidence_requirements").split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
                dependencies: listFormValue(form, "dependencies"),
                watchers: listFormValue(form, "watchers"),
                escalation_policy_key: formValue(form, "escalation_policy") || undefined,
                assignment_reason: "Created through the Nixor Connect accountability workspace",
            });
            setCreated(result.public_id); formElement.reset(); await onCreated();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Action item was not created."); }
        finally { setBusy(false); }
    };
    return (
        <details className="mx_NixorWorkspace_createPanel">
            <summary>Create action item</summary>
            <form onSubmit={(event) => void submit(event)}>
                <label>Title<input name="title" minLength={3} maxLength={240} required /></label>
                <label>Description<textarea name="description" minLength={1} maxLength={20000} required /></label>
                <label>Assignee Matrix ID<input name="assignee" defaultValue={identity.identity.matrix_user_id} pattern="^@[^:\s]+:[^\s]+$" required /></label>
                <label>Acceptance reviewer Matrix ID (optional)<input name="reviewer" pattern="^@[^:\s]+:[^\s]+$" /></label>
                <label>Category<input name="category" defaultValue="general" minLength={2} maxLength={120} required /></label>
                <label>Governed resource key (optional)<input name="resource_key" maxLength={200} /></label>
                <label>Responsible entity key (optional)<input name="entity_key" maxLength={200} /></label>
                <label>Project key (optional)<input name="project_key" maxLength={200} /></label>
                <label>Source Matrix room ID (optional)<input name="source_room" maxLength={255} /></label>
                <label>Source Matrix event ID (optional; requires room)<input name="source_event" maxLength={255} /></label>
                <label>Priority<select name="priority" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label>
                <label>Due date and time (optional)<input name="due_at" type="datetime-local" /></label>
                <label>Due-date time zone<input name="timezone" defaultValue="Asia/Karachi" minLength={3} maxLength={100} required /></label>
                <label>Completion evidence requirements (one per line)<textarea name="evidence_requirements" maxLength={8000} /></label>
                <label>Dependency action public IDs<textarea name="dependencies" maxLength={12500} /></label>
                <label>Watcher Matrix IDs<textarea name="watchers" maxLength={12500} /></label>
                <label>Escalation policy key (optional)<input name="escalation_policy" pattern="^[a-z][a-z0-9_]{1,63}$" /></label>
                {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
                {created && <p className="mx_NixorWorkspace_success" role="status">Created {created}</p>}
                <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create action item"}</button>
            </form>
        </details>
    );
};

const DecisionsView: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [decisions, setDecisions] = useState<GovernanceDecision[]>([]);
    const [query, setQuery] = useState("");
    const [status, setStatus] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => { setLoading(true); setError(null); try { setDecisions(await listDecisions(query, status)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load decisions."); } finally { setLoading(false); } }, [query, status]);
    useEffect(() => { void load(); }, [load]);
    const state = <ViewState loading={loading} error={error} onRetry={load} />;
    if (state && loading) return state;
    return (
        <>
            {error && state}
            <form className="mx_NixorWorkspace_search" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setQuery(formValue(form, "query")); setStatus(formValue(form, "status")); }}><label>Search the decision register<input name="query" defaultValue={query} maxLength={200} /></label><label>Status<select name="status" defaultValue={status}><option value="">All statuses</option><option value="proposed">Proposed</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="superseded">Superseded</option><option value="withdrawn">Withdrawn</option></select></label><button type="submit">Apply filters</button></form>
            {hasNixorCapability(identity, "decision.create") && <CreateDecisionForm identity={identity} onCreated={load} />}
            {!decisions.length ? <div className="mx_NixorWorkspace_state">No decisions are visible to you.</div> : <div className="mx_NixorWorkspace_cards">{decisions.map((decision) => (
                <NixorDecisionCard key={decision.public_id} decision={decision} identity={identity} onUpdated={load} />
            ))}</div>}
        </>
    );
};

const CreateDecisionForm: React.FC<{ identity: NixorIdentity; onCreated: () => Promise<void> }> = ({ identity, onCreated }) => {
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [created, setCreated] = useState<string | null>(null);
    const [visibility, setVisibility] = useState<"private" | "resource" | "entity" | "institution">("private");
    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault(); setBusy(true); setError(null); setCreated(null); const formElement = event.currentTarget; const form = new FormData(formElement);
        try {
            const attachmentUri = formValue(form, "attachment_uri");
            const result = await createDecision({ title: formValue(form, "title"), statement: formValue(form, "statement"), deciding_body: formValue(form, "deciding_body"), owner_matrix_user_id: identity.identity.matrix_user_id, participants: [...listFormValue(form, "participants").map((matrixUserId) => ({ matrix_user_id: matrixUserId, role: "participant" as const })), ...listFormValue(form, "approvers").map((matrixUserId) => ({ matrix_user_id: matrixUserId, role: "approver" as const })), ...listFormValue(form, "observers").map((matrixUserId) => ({ matrix_user_id: matrixUserId, role: "observer" as const }))], linked_discussion: formValue(form, "matrix_room_id") ? { matrix_room_id: formValue(form, "matrix_room_id"), ...(formValue(form, "matrix_event_id") ? { matrix_event_id: formValue(form, "matrix_event_id") } : {}) } : undefined, alternatives: lineFormValue(form, "alternatives"), rationale: formValue(form, "rationale") || undefined, conditions: lineFormValue(form, "conditions"), follow_up_actions: lineFormValue(form, "follow_up_actions"), attachments: attachmentUri ? [{ name: formValue(form, "attachment_name") || "Linked attachment", uri: attachmentUri }] : [], visibility, resource_key: formValue(form, "resource_key") || undefined, responsible_entity_key: formValue(form, "entity_key") || undefined, review_at: toIsoDateTime(formValue(form, "review_at")), action_item_public_ids: listFormValue(form, "action_items") });
            setCreated(result.public_id); formElement.reset(); await onCreated();
        } catch (reason) { setError(reason instanceof Error ? reason.message : "Decision was not created."); } finally { setBusy(false); }
    };
    return (
        <details className="mx_NixorWorkspace_createPanel"><summary>Create decision proposal</summary><form onSubmit={(event) => void submit(event)}>
            <label>Title<input name="title" minLength={3} maxLength={240} required /></label>
            <label>Decision statement<textarea name="statement" minLength={3} maxLength={50000} required /></label>
            <label>Deciding body<input name="deciding_body" minLength={2} maxLength={240} required /></label>
            <label>Rationale<textarea name="rationale" maxLength={50000} /></label>
            <label>Participants (Matrix IDs)<textarea name="participants" maxLength={12500} /></label>
            <label>Approvers (Matrix IDs)<textarea name="approvers" maxLength={12500} /></label>
            <label>Observers (Matrix IDs)<textarea name="observers" maxLength={12500} /></label>
            <label>Linked discussion room ID (optional)<input name="matrix_room_id" maxLength={255} /></label>
            <label>Linked discussion event ID (optional)<input name="matrix_event_id" maxLength={255} /></label>
            <label>Alternatives considered (one per line)<textarea name="alternatives" maxLength={20000} /></label>
            <label>Approval conditions (one per line)<textarea name="conditions" maxLength={20000} /></label>
            <label>Follow-up actions (one per line)<textarea name="follow_up_actions" maxLength={20000} /></label>
            <label>Visibility<select name="visibility" value={visibility} onChange={(event) => setVisibility(event.target.value as "private" | "resource" | "entity" | "institution")}><option value="private">Private participants</option><option value="resource">Governed resource</option><option value="entity">Responsible entity</option><option value="institution">Institution</option></select></label>
            {visibility === "resource" && <label>Governed resource key<input name="resource_key" maxLength={200} required /></label>}
            {visibility === "entity" && <label>Responsible entity key<input name="entity_key" maxLength={200} required /></label>}
            <label>Review date (optional)<input name="review_at" type="datetime-local" /></label>
            <label>Linked action item public IDs<textarea name="action_items" maxLength={12500} /></label>
            <label>Attachment name (optional)<input name="attachment_name" maxLength={255} /></label>
            <label>Attachment URI (optional)<input name="attachment_uri" maxLength={2000} /></label>
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}{created && <p className="mx_NixorWorkspace_success" role="status">Created {created}</p>}
            <button type="submit" disabled={busy}>{busy ? "Creating…" : "Create decision proposal"}</button>
        </form></details>
    );
};

const ReportsView: React.FC = () => {
    const [reports, setReports] = useState<GovernanceReport[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => { setLoading(true); setError(null); try { setReports(await listReports()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load reports."); } finally { setLoading(false); } }, []);
    useEffect(() => { void load(); }, [load]);
    const state = <ViewState loading={loading} error={error} onRetry={load} />;
    if (state && loading) return state;
    return <>{error && state}<div className="mx_NixorWorkspace_disclosure"><strong>Safety and anti-retaliation:</strong> retaliation for a good-faith report is prohibited. If anyone is in immediate danger, contact local emergency services and a trusted Nixor staff member; this form is not an emergency-response channel.</div><CreateReportForm onCreated={load} />{!reports.length ? <div className="mx_NixorWorkspace_state">You have not submitted a report.</div> : <div className="mx_NixorWorkspace_cards">{reports.map((report) => <ReportCard key={report.public_id} report={report} onUpdated={load} />)}</div>}</>;
};

const CreateReportForm: React.FC<{ onCreated: () => Promise<void> }> = ({ onCreated }) => {
    const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null); const [created, setCreated] = useState<string | null>(null);
    const [targetType, setTargetType] = useState<"general" | "user" | "dm" | "group_dm" | "channel" | "space" | "bot" | "moderator_action">("general");
    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => { event.preventDefault(); setBusy(true); setError(null); setCreated(null); const formElement = event.currentTarget; const form = new FormData(formElement); try { const result = await createReport({ category: formValue(form, "category", "general"), description: formValue(form, "description"), urgency: formValue(form, "urgency") as "low" | "normal" | "high" | "critical", confidentiality: formValue(form, "confidentiality") as "standard" | "confidential_identity" | "restricted", preferred_contact: formValue(form, "preferred_contact") as "in_app" | "matrix" | "none", immediate_safety: form.get("immediate_safety") === "on", targets: targetType === "general" ? [{ type: "general" }] : [{ type: targetType, public_id: formValue(form, "target_id") }] }); setCreated(`${result.report_number} — ${result.status}${result.emergency_guidance ? ` — ${result.emergency_guidance}` : ""}`); formElement.reset(); await onCreated(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Report was not submitted."); } finally { setBusy(false); } };
    return <details className="mx_NixorWorkspace_createPanel"><summary>Submit a report</summary><form onSubmit={(event) => void submit(event)}><label>Category<input name="category" minLength={2} maxLength={160} defaultValue="general" required /></label><label>What happened?<textarea name="description" minLength={10} maxLength={50000} required /></label><label>Report target<select name="target_type" value={targetType} onChange={(event) => setTargetType(event.target.value as typeof targetType)}><option value="general">General conduct or safety incident</option><option value="user">User</option><option value="dm">Direct message</option><option value="group_dm">Group DM</option><option value="channel">Channel</option><option value="space">Server / space</option><option value="bot">Bot</option><option value="moderator_action">Moderator action</option></select></label>{targetType !== "general" && <label>Target Matrix ID or governed public ID<input name="target_id" maxLength={255} required /></label>}<label>Urgency<select name="urgency" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Confidentiality<select name="confidentiality" defaultValue="standard"><option value="standard">Standard</option><option value="confidential_identity">Confidential identity</option><option value="restricted">Restricted</option></select></label><label>Preferred contact<select name="preferred_contact" defaultValue="in_app"><option value="in_app">In-app</option><option value="matrix">Matrix message</option><option value="none">No follow-up contact</option></select></label><label className="mx_NixorWorkspace_checkbox"><input name="immediate_safety" type="checkbox" /> There is an immediate safety concern</label>{error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}{created && <p className="mx_NixorWorkspace_success" role="status">Report submitted: {created}</p>}<button type="submit" disabled={busy}>{busy ? "Submitting…" : "Submit report"}</button></form></details>;
};

const ReportCard: React.FC<{ report: GovernanceReport; onUpdated: () => Promise<void> }> = ({ report, onUpdated }) => {
    const [text, setText] = useState("");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const addInformation = async (event: FormEvent): Promise<void> => {
        event.preventDefault(); setBusy(true); setError(null); setMessage(null);
        try { await addReportInformation(report.public_id, text); setText(""); await onUpdated(); }
        catch (reason) { setError(reason instanceof Error ? reason.message : "Information was not added."); }
        finally { setBusy(false); }
    };
    const appeal = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!report.case_public_id) return;
        const basis = formValue(new FormData(event.currentTarget), "basis");
        setBusy(true); setError(null); setMessage(null);
        try {
            const appealId = await submitCaseAppeal(report.case_public_id, basis);
            setMessage(`Appeal ${appealId} submitted for independent human review.`);
            await onUpdated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Appeal was not submitted.");
        } finally {
            setBusy(false);
        }
    };
    return (
        <article className="mx_NixorWorkspace_card">
            <div className="mx_NixorWorkspace_cardHeader"><h2>{report.report_number}</h2><StatusPill value={report.reporter_safe_status} /></div>
            <p>{report.category} · {report.urgency} urgency</p>
            {report.reporter_safe_summary && <p>{report.reporter_safe_summary}</p>}
            <p>Submitted {formatDate(report.submitted_at)}</p>
            <details><summary>Add information</summary><form onSubmit={(event) => void addInformation(event)}><label>Additional information<textarea value={text} onChange={(event) => setText(event.target.value)} minLength={2} maxLength={50000} required /></label><button type="submit" disabled={busy}>{busy ? "Adding…" : "Add information"}</button></form></details>
            {report.appeal_allowed && report.case_public_id && <details><summary>Appeal resolved outcome</summary><form onSubmit={(event) => void appeal(event)}><p>An appeal is reviewed by a different human reviewer. It does not automatically reverse an outcome.</p><label>Appeal basis<textarea name="basis" minLength={10} maxLength={20000} required /></label><button type="submit" disabled={busy}>Submit appeal</button></form></details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </article>
    );
};

const CreateCaseForm: React.FC<{ onCreated: () => Promise<void> }> = ({ onCreated }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy(true); setError(null); setMessage(null);
        try {
            const result = await createCaseFromReport({
                report_public_id: formValue(form, "report_id"),
                category: formValue(form, "category"),
                severity: formValue(form, "severity") as "low" | "normal" | "high" | "critical",
                resource_key: formValue(form, "resource_key") || undefined,
                responsible_entity_key: formValue(form, "entity_key") || undefined,
                reviewer_group_key: formValue(form, "reviewer_group") || undefined,
                owner_matrix_user_id: formValue(form, "owner") || undefined,
                escalation_policy_key: formValue(form, "escalation_policy"),
                triage_reason: formValue(form, "reason"),
            });
            setMessage(`${result.case_number} created in ${result.state.replaceAll("_", " ")} state.`);
            formElement.reset();
            await onCreated();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Case was not created from the report.");
        } finally {
            setBusy(false);
        }
    };
    return <details className="mx_NixorWorkspace_createPanel"><summary>Triage report into a case</summary><form onSubmit={(event) => void submit(event)}><p>Only the referenced report and its bounded evidence are attached. Reporter/subject conflicts are checked server-side before assignment.</p><label>Report public ID<input name="report_id" minLength={3} maxLength={160} required /></label><label>Case category<input name="category" minLength={2} maxLength={160} required /></label><label>Severity<select name="severity" defaultValue="normal"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option><option value="critical">Critical</option></select></label><label>Governed resource key (optional)<input name="resource_key" maxLength={200} /></label><label>Responsible entity key (optional)<input name="entity_key" maxLength={200} /></label><label>Reviewer group key (optional)<input name="reviewer_group" maxLength={160} /></label><label>Owner Matrix ID (optional)<input name="owner" pattern="^@[^:\s]+:[^\s]+$" /></label><label>Escalation policy key<input name="escalation_policy" defaultValue="conduct_default" pattern="^[a-z][a-z0-9_]{1,63}$" required /></label><label>Triage reason<textarea name="reason" minLength={3} maxLength={5000} required /></label><button type="submit" disabled={busy}>{busy ? "Creating…" : "Confirm case creation"}</button>{error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}{message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}</form></details>;
};

const CasesView: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [cases, setCases] = useState<GovernanceCase[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null);
    const [stateFilter, setStateFilter] = useState(""); const [severityFilter, setSeverityFilter] = useState("");
    const load = useCallback(async () => { setLoading(true); setError(null); try { setCases(await listCases(stateFilter, severityFilter)); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load cases."); } finally { setLoading(false); } }, [severityFilter, stateFilter]);
    useEffect(() => { void load(); }, [load]);
    const state = <ViewState loading={loading} error={error} empty={!cases.length ? "No cases are assigned or accessible to you." : undefined} onRetry={load} />; if (loading) return state;
    return <>{error && state}<form className="mx_NixorWorkspace_search" onSubmit={(event) => { event.preventDefault(); const form = new FormData(event.currentTarget); setStateFilter(formValue(form, "state")); setSeverityFilter(formValue(form, "severity")); }}><label>Case state<select name="state" defaultValue={stateFilter}><option value="">All states</option>{["submitted", "triaged", "assigned", "awaiting_information", "under_review", "action_pending", "escalated", "resolved", "closed", "appealed", "reopened", "archived"].map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}</select></label><label>Severity<select name="severity" defaultValue={severityFilter}><option value="">All severities</option><option value="critical">Critical</option><option value="high">High</option><option value="normal">Normal</option><option value="low">Low</option></select></label><button type="submit">Apply filters</button></form>{hasNixorCapability(identity, "case.triage") && <CreateCaseForm onCreated={load} />}{!error && !cases.length ? state : <div className="mx_NixorWorkspace_cards">{cases.map((record) => <NixorCaseCard key={record.public_id} record={record} identity={identity} onUpdated={load} />)}</div>}</>;
};

function safeNotificationDestination(deepLink?: string | null): NixorPrimaryView | null {
    if (!deepLink || !deepLink.startsWith("/")) return null;
    if (deepLink.startsWith("/formal-notices/") || deepLink.startsWith("/action-items/")) return "accountability";
    if (deepLink.startsWith("/decisions/")) return "decisions";
    if (deepLink.startsWith("/reports/")) return "reports";
    if (deepLink.startsWith("/cases/")) return "cases";
    if (deepLink.startsWith("/bots/")) return "bots";
    return null;
}

function notificationTimeValue(value?: string | null): string {
    const match = value?.match(/^([01]\d|2[0-3]):[0-5]\d/);
    return match?.[0] ?? "";
}

const NotificationPreferencesPanel: React.FC = () => {
    const [preferences, setPreferences] = useState<NotificationPreferences | null>(null);
    const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const value = await getNotificationPreferences();
            setPreferences({
                ...value.preferences,
                quiet_hours_start: notificationTimeValue(value.preferences.quiet_hours_start),
                quiet_hours_end: notificationTimeValue(value.preferences.quiet_hours_end),
                category_preferences: value.preferences.category_preferences ?? {},
            });
            setVapidPublicKey(value.vapid_public_key);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not load notification preferences.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!preferences) return;
        if (preferences.quiet_hours_enabled && (
            !preferences.quiet_hours_start ||
            !preferences.quiet_hours_end ||
            preferences.quiet_hours_start === preferences.quiet_hours_end
        )) {
            setError("Choose different start and end times for quiet hours.");
            return;
        }
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            if (preferences.browser_push_enabled) {
                await enableNixorBrowserPush(vapidPublicKey);
                await updateNotificationPreferences(preferences);
            } else {
                await updateNotificationPreferences(preferences);
                try {
                    await disableNixorBrowserPush();
                } catch {
                    setMessage("Preferences were saved. This browser may still retain an inactive local subscription.");
                    return;
                }
            }
            setMessage("Notification preferences saved.");
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Notification preferences were not saved.");
        } finally {
            setBusy(false);
        }
    };

    if (loading) return <div className="mx_NixorWorkspace_state" role="status"><Spinner /> Loading notification preferences…</div>;
    if (!preferences) return <ViewState loading={false} error={error} onRetry={load} />;
    const pushAvailable = browserPushIsSupported() && Boolean(vapidPublicKey);

    return (
        <details className="mx_NixorWorkspace_createPanel">
            <summary>Notification preferences</summary>
            <form onSubmit={(event) => void submit(event)}>
                <p id="nixor-notification-preferences-help">
                    Mandatory safety and accountability categories may still appear in-app. Browser push is optional and
                    requests permission only when you save it as enabled.
                </p>
                <label className="mx_NixorWorkspace_checkbox">
                    <input
                        type="checkbox"
                        checked={preferences.in_app_enabled}
                        onChange={(event) => setPreferences({ ...preferences, in_app_enabled: event.target.checked })}
                    />
                    In-app notifications
                </label>
                <label className="mx_NixorWorkspace_checkbox">
                    <input
                        type="checkbox"
                        checked={preferences.matrix_enabled}
                        onChange={(event) => setPreferences({ ...preferences, matrix_enabled: event.target.checked })}
                    />
                    Matrix direct-message notifications
                </label>
                <label className="mx_NixorWorkspace_checkbox">
                    <input
                        type="checkbox"
                        checked={preferences.browser_push_enabled}
                        disabled={!pushAvailable}
                        aria-describedby="nixor-notification-preferences-help"
                        onChange={(event) => setPreferences({ ...preferences, browser_push_enabled: event.target.checked })}
                    />
                    Browser push notifications
                </label>
                {!pushAvailable && <p>Browser push is not supported by this browser or configured on this deployment.</p>}
                <label className="mx_NixorWorkspace_checkbox">
                    <input
                        type="checkbox"
                        checked={preferences.digest_enabled}
                        onChange={(event) => setPreferences({ ...preferences, digest_enabled: event.target.checked })}
                    />
                    In-app digest
                </label>
                <label className="mx_NixorWorkspace_checkbox">
                    <input
                        type="checkbox"
                        checked={preferences.quiet_hours_enabled}
                        onChange={(event) => setPreferences({ ...preferences, quiet_hours_enabled: event.target.checked })}
                    />
                    Quiet hours
                </label>
                {preferences.quiet_hours_enabled && (
                    <div className="mx_NixorWorkspace_inlineFields">
                        <label>
                            Start
                            <input
                                type="time"
                                value={preferences.quiet_hours_start ?? ""}
                                required
                                onChange={(event) => setPreferences({ ...preferences, quiet_hours_start: event.target.value })}
                            />
                        </label>
                        <label>
                            End
                            <input
                                type="time"
                                value={preferences.quiet_hours_end ?? ""}
                                required
                                onChange={(event) => setPreferences({ ...preferences, quiet_hours_end: event.target.value })}
                            />
                        </label>
                        <label>
                            Time zone
                            <input
                                value={preferences.quiet_hours_timezone}
                                minLength={3}
                                maxLength={100}
                                required
                                onChange={(event) => setPreferences({ ...preferences, quiet_hours_timezone: event.target.value })}
                            />
                        </label>
                    </div>
                )}
                {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
                {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
                <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save notification preferences"}</button>
            </form>
        </details>
    );
};

const NotificationsView: React.FC = () => {
    const [data, setData] = useState<{ notifications: GovernanceNotification[]; unread_count: number }>({ notifications: [], unread_count: 0 }); const [loading, setLoading] = useState(true); const [error, setError] = useState<string | null>(null); const [busy, setBusy] = useState<string | null>(null);
    const load = useCallback(async () => { setLoading(true); setError(null); try { setData(await listNotifications()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load notifications."); } finally { setLoading(false); } }, []); useEffect(() => { void load(); }, [load]);
    const read = async (item: GovernanceNotification): Promise<void> => { setBusy(item.public_id); try { if (!item.read_at) await markNotificationRead(item.public_id); const destination = safeNotificationDestination(item.deep_link); if (destination) openNixorPrimaryView(destination); else await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Notification was not updated."); } finally { setBusy(null); } };
    const dismiss = async (item: GovernanceNotification): Promise<void> => { setBusy(item.public_id); try { await dismissNotification(item.public_id); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Notification was not dismissed."); } finally { setBusy(null); } };
    const readAll = async (): Promise<void> => { setBusy("all"); try { await markAllNotificationsRead(); await load(); } catch (reason) { setError(reason instanceof Error ? reason.message : "Notifications were not updated."); } finally { setBusy(null); } };
    const state = <ViewState loading={loading} error={error} onRetry={load} />; if (loading) return state;
    return <><NotificationPreferencesPanel />{error && state}<div className="mx_NixorWorkspace_toolbar"><span>{data.unread_count} unread</span><AccessibleButton disabled={!data.unread_count || busy === "all"} onClick={() => void readAll()}>Mark all read</AccessibleButton></div>{!data.notifications.length ? <div className="mx_NixorWorkspace_state">You have no notifications.</div> : <div className="mx_NixorWorkspace_cards">{data.notifications.map((item) => <article className={`mx_NixorWorkspace_card${item.read_at ? " mx_NixorNotification_read" : ""}`} key={item.public_id}><div className="mx_NixorWorkspace_cardHeader"><h2>{item.title}</h2>{item.mandatory && <StatusPill value="mandatory" danger />}</div><p>{item.body}</p><p>{formatDate(item.created_at)}</p><div className="mx_NixorWorkspace_actions"><AccessibleButton disabled={busy === item.public_id} onClick={() => void read(item)}>{safeNotificationDestination(item.deep_link) ? "Open" : "Mark read"}</AccessibleButton>{!item.mandatory && !item.dismissed_at && <AccessibleButton disabled={busy === item.public_id} onClick={() => void dismiss(item)}>Dismiss</AccessibleButton>}</div></article>)}</div>}</>;
};

const AdminView: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const canLoadStatus = hasNixorCapability(identity, "support.identity") || hasNixorCapability(identity, "audit.view");
    const [status, setStatus] = useState<Record<string, unknown> | null>(null); const [loading, setLoading] = useState(canLoadStatus); const [error, setError] = useState<string | null>(null);
    const load = useCallback(async () => { if (!canLoadStatus) return; setLoading(true); setError(null); try { setStatus(await getAdminStatus()); } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load administration status."); } finally { setLoading(false); } }, [canLoadStatus]); useEffect(() => { void load(); }, [load]);
    const state = <ViewState loading={loading} error={error} onRetry={load} />;
    const database = status?.database as { database_size?: unknown } | undefined; const sessions = status?.sessions as { active?: unknown } | undefined; const workers = Array.isArray(status?.worker_leases) ? status.worker_leases as Array<{ worker_key?: unknown; last_success_at?: unknown; last_failure_at?: unknown }> : []; const dashboardUrl = (SdkConfig.get()?.nixor as { developer_dashboard_url?: string } | undefined)?.developer_dashboard_url;
    return <>{canLoadStatus && state}{status && <><div className="mx_NixorHomeOverview_grid"><div><strong>{displayValue(sessions?.active)}</strong><span>active Connect sessions</span></div><div><strong>{displayValue(database?.database_size)}</strong><span>governance database</span></div><div><strong>{workers.length}</strong><span>registered workers</span></div></div><section><h2>Runtime workers</h2><div className="mx_NixorWorkspace_cards">{workers.map((worker, index) => <article className="mx_NixorWorkspace_card" key={displayValue(worker.worker_key, String(index))}><h3>{displayValue(worker.worker_key, "Worker")}</h3><p>Last success: {formatDate(typeof worker.last_success_at === "string" ? worker.last_success_at : null)}</p>{Boolean(worker.last_failure_at) && <p className="mx_NixorWorkspace_error">Last failure: {formatDate(typeof worker.last_failure_at === "string" ? worker.last_failure_at : null)}</p>}</article>)}</div></section></>}{dashboardUrl && <p><a href={dashboardUrl} target="_blank" rel="noreferrer noopener">Open the Developer Dashboard</a></p>}{(hasNixorCapability(identity, "role.view") || hasNixorCapability(identity, "role.assign") || hasNixorCapability(identity, "session.device.admin")) && <NixorIdentityAdminPanel identity={identity} />}{(hasNixorCapability(identity, "moderation.perform") || hasNixorCapability(identity, "moderation.reverse")) && <NixorModerationPanel identity={identity} />}<NixorAuditRetentionPanel identity={identity} /></>;
};

const VIEW_TITLES: Record<NixorPrimaryView, { title: string; description: string }> = {
    home: { title: "Home", description: "Your Nixor Connect workspace." },
    direct_messages: { title: "Direct Messages", description: "Conversations, requests, relationships, blocks, and privacy controls." },
    servers: { title: "Servers", description: "Official, formal non-official, and informal governed resources." },
    accountability: { title: "Accountability", description: "Formal notices and assigned work from acknowledgement through resolution." },
    decisions: { title: "Decisions", description: "Institutional proposals, approvals, revisions, and supersession history." },
    reports: { title: "Reports", description: "Submit concerns safely and follow their reporter-visible status." },
    cases: { title: "Cases", description: "Role-gated review queues, deadlines, evidence, and case status." },
    bots: { title: "Bots", description: "Verified institutional services and their declared commands." },
    notifications: { title: "Notifications", description: "Accountability reminders, delivery status, and deep links." },
    admin: { title: "Admin / Developer", description: "Role-gated service readiness and developer operations." },
};

const NixorAccountabilityWorkspace: React.FC = () => {
    const activeView = useNixorPrimaryView();
    const { identity, error: identityError } = useIdentity();
    const online = useOnline();
    const headingRef = useRef<HTMLHeadingElement>(null);
    useEffect(() => { headingRef.current?.focus(); }, [activeView]);
    const allowedView = useMemo(() => {
        if (activeView === "cases" && identity && !canViewCases(identity)) return false;
        if (activeView === "admin" && identity && !canViewAdmin(identity)) return false;
        return true;
    }, [activeView, identity]);
    const content = (): JSX.Element => {
        if (!identity) return <ViewState loading={!identityError} error={identityError} onRetry={() => window.location.reload()} /> as JSX.Element;
        if (!allowedView) return <div className="mx_NixorWorkspace_state" role="alert">This role-gated view is not assigned to your institutional role.</div>;
        switch (activeView) {
            case "direct_messages": return <NixorDirectMessagesView identity={identity} />;
            case "servers": return <NixorServersView identity={identity} />;
            case "accountability": return <AccountabilityView identity={identity} />;
            case "decisions": return <DecisionsView identity={identity} />;
            case "reports": return <ReportsView />;
            case "cases": return <CasesView identity={identity} />;
            case "bots": return <NixorBotDirectory />;
            case "notifications": return <NotificationsView />;
            case "admin": return <AdminView identity={identity} />;
            default: return <><NixorHomeOverview identity={identity} /><NixorSearchExportPanel identity={identity} /><NixorDevicePanel identity={identity} /></>;
        }
    };

    return (
        <main className="mx_NixorWorkspace">
            <NixorPrimaryNavigation identity={identity} />
            {!online && <div className="mx_NixorWorkspace_offline" role="status">You are offline. Previously loaded messages remain available, but accountability changes cannot be saved until you reconnect.</div>}
            <header className="mx_NixorWorkspace_header">
                <div>
                    <h1 ref={headingRef} tabIndex={-1}>{VIEW_TITLES[activeView].title}</h1>
                    <p>{VIEW_TITLES[activeView].description}</p>
                </div>
                {activeView === "home" && <NixorInstallButton />}
            </header>
            <div className="mx_NixorWorkspace_content">{content()}</div>
            <footer className="mx_NixorWorkspace_privacy">
                <strong>Privacy:</strong> ordinary private messages are not generally readable by administrators. A report captures only the selected message and bounded context into case-controlled, audited evidence. Formal acknowledgements are separate from Matrix read receipts.
            </footer>
        </main>
    );
};

export default NixorAccountabilityWorkspace;
