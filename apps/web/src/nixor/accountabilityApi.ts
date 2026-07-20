/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { getNixorConnectApiBaseUrl } from "./sso";

export interface NixorIdentity {
    identity: {
        matrix_user_id: string;
        email: string;
        display_name?: string;
        identity_type: "human" | "service" | "bot";
        account_status: string;
    };
    global_roles: string[];
    assignments: Array<{
        public_id: string;
        role_key: string;
        scope_type: string;
        scope_key?: string | null;
        expires_at?: string | null;
    }>;
    capabilities: string[];
    privacy: Record<string, unknown> | null;
    session: {
        public_id?: string;
        matrix_device_id: string;
        expires_at: string;
    };
    csrf_token: string;
}

export interface FormalNotice {
    public_id: string;
    title: string;
    current_body?: string | null;
    issuer_matrix_user_id: string;
    issuer_institutional_role?: string | null;
    issuing_resource_key?: string | null;
    priority: "low" | "normal" | "high" | "critical";
    acknowledgement_required: boolean;
    acknowledgement_deadline?: string | null;
    action_required: boolean;
    status: "draft" | "published" | "superseded" | "withdrawn" | "archived";
    current_revision: number;
    acknowledged?: boolean;
    overdue?: boolean;
    delivery_status?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface AccountabilityAction {
    public_id: string;
    title: string;
    description: string;
    creator_matrix_user_id: string;
    acceptance_reviewer_matrix_user_id?: string | null;
    resource_key?: string | null;
    responsible_entity_key?: string | null;
    project_key?: string | null;
    priority: "low" | "normal" | "high" | "critical";
    category: string;
    due_at?: string | null;
    due_timezone: string;
    status:
        | "proposed"
        | "assigned"
        | "acknowledged"
        | "in_progress"
        | "blocked"
        | "submitted"
        | "accepted"
        | "rejected"
        | "overdue"
        | "cancelled";
    assignees: Array<{
        matrix_user_id: string;
        role: string;
        acknowledged_at?: string | null;
        assignment_version?: number;
    }>;
    created_at: string;
    updated_at?: string;
}

export type AccountabilityActionStatus = AccountabilityAction["status"];
export type AccountabilityActionView =
    | "mine"
    | "assigned_by_me"
    | "team"
    | "overdue"
    | "awaiting_review"
    | "resolved"
    | "all";

export interface GovernanceDecision {
    public_id: string;
    title: string;
    current_statement: string;
    status: "proposed" | "approved" | "rejected" | "superseded" | "withdrawn";
    deciding_body: string;
    owner_matrix_user_id: string;
    created_by_matrix_user_id?: string;
    visibility: string;
    linked_discussion?: Record<string, unknown> | null;
    alternatives?: unknown[];
    rationale?: string | null;
    conditions?: unknown[];
    follow_up_actions?: unknown[];
    review_at?: string | null;
    attachments?: unknown[];
    approval_evidence?: Record<string, unknown> | null;
    resource_key?: string | null;
    responsible_entity_key?: string | null;
    current_version: number;
    participant?: boolean;
    decision_date?: string | null;
    created_at: string;
    updated_at?: string;
}

export interface GovernanceReport {
    public_id: string;
    report_number: string;
    category: string;
    urgency: string;
    confidentiality: string;
    preferred_contact: string;
    immediate_safety: boolean;
    reporter_safe_status: string;
    reporter_safe_summary?: string | null;
    case_public_id?: string | null;
    appeal_allowed?: boolean;
    submitted_at: string;
    updated_at: string;
}

export interface GovernanceCase {
    public_id: string;
    case_number: string;
    state: string;
    category: string;
    severity: string;
    resource_key?: string | null;
    responsible_entity_key?: string | null;
    owner_matrix_user_id?: string | null;
    reviewer_group_key?: string | null;
    acknowledgement_due_at?: string | null;
    first_action_due_at?: string | null;
    acknowledged_at?: string | null;
    first_action_at?: string | null;
    sla_paused_at?: string | null;
    legal_hold: boolean;
    created_at: string;
    updated_at: string;
}

export interface GovernanceCaseDetails {
    case: GovernanceCase & { reporter_identity_restricted?: boolean };
    subjects: Array<Record<string, unknown>>;
    assignments: Array<Record<string, unknown>>;
    access_grants: Array<Record<string, unknown> & {
        public_id: string;
        matrix_user_id: string;
        access_level: "metadata" | "notes" | "evidence" | "export";
        purpose: string;
        expires_at?: string | null;
    }>;
    notes: Array<Record<string, unknown>>;
    reporter_updates: Array<Record<string, unknown>>;
    actions: Array<Record<string, unknown>>;
    escalations: Array<Record<string, unknown>>;
    deadline_changes: Array<Record<string, unknown>>;
    outcomes: Array<Record<string, unknown>>;
    appeals: Array<Record<string, unknown> & {
        public_id: string;
        appellant_matrix_user_id: string;
        basis: string;
        status: string;
        reviewer_matrix_user_id?: string | null;
        outcome_reason?: string | null;
        decided_at?: string | null;
    }>;
    evidence: Array<{
        public_id: string;
        selected_matrix_event_id: string;
        canonical_content_hash: string;
        captured_at: string;
        redaction_state: string;
    }>;
    related_cases: Array<Record<string, unknown> & {
        public_id: string;
        case_number: string;
        relationship_type: "related" | "duplicate" | "merged";
        direction: "incoming" | "outgoing";
    }>;
    access: {
        full: boolean;
        can_read_notes: boolean;
        can_view_evidence: boolean;
        grant_level?: "metadata" | "notes" | "evidence" | "export" | null;
    };
}

export interface GovernanceHandover {
    public_id: string;
    role_key: string;
    responsible_entity_key: string;
    outgoing_matrix_user_id: string;
    incoming_matrix_user_id: string;
    oversight_matrix_user_id?: string | null;
    effective_at: string;
    status: "draft" | "awaiting_acknowledgement" | "completed" | "cancelled";
    item_count: number;
    acknowledgement_count: number;
    completed_at?: string | null;
    created_by_matrix_user_id: string;
}

export interface GovernanceNotification {
    public_id: string;
    category: string;
    title: string;
    body: string;
    deep_link?: string | null;
    mandatory: boolean;
    created_at: string;
    read_at?: string | null;
    dismissed_at?: string | null;
}

export interface NotificationPreferences {
    in_app_enabled: boolean;
    matrix_enabled: boolean;
    browser_push_enabled: boolean;
    quiet_hours_enabled: boolean;
    quiet_hours_start?: string | null;
    quiet_hours_end?: string | null;
    quiet_hours_timezone: string;
    digest_enabled: boolean;
    category_preferences: Record<string, "all" | "in_app_only" | "muted">;
    updated_at?: string;
}

export interface GovernedResource {
    resource_key: string;
    display_name: string;
    resource_type: "space" | "channel";
    matrix_room_id: string;
    parent_resource_key?: string | null;
    classification: "official" | "formal_non_official" | "informal";
    responsible_entity_key?: string | null;
    accountable_owner_matrix_user_id?: string | null;
    moderator_group: string[];
    escalation_policy_key?: string | null;
    retention_policy_key: string;
    lifecycle_state: string;
    creation_source: string;
    protected_branding: boolean;
    template_key?: string | null;
    matrix_visibility: "private" | "public";
    active: boolean;
}

export interface GovernedResourceTemplate {
    template_key: string;
    display_name: string;
    resource_type: "space" | "channel";
    classification: "official" | "formal_non_official" | "informal";
    default_retention_policy_key: string;
    default_escalation_policy_key?: string | null;
    default_settings: Record<string, unknown>;
}

export interface ProtectedResourceName {
    normalized_name: string;
    display_name: string;
    responsible_entity_key?: string | null;
    allowed_template_keys: string[];
    created_by_matrix_user_id: string;
    created_at: string;
    updated_at: string;
}

export type PrivacyAudience = "nobody" | "contacts" | "institution" | "everyone";

export interface ConnectPrivacySettings {
    message_requests: PrivacyAudience;
    room_invitations: PrivacyAudience;
    profile_image_visibility: PrivacyAudience;
    presence_visibility: PrivacyAudience;
    directory_discovery: PrivacyAudience;
    updated_at?: string;
}

export interface DirectoryUser {
    matrix_user_id: string;
    display_name?: string | null;
    identity_type: "human" | "service" | "bot";
    picture_url?: string | null;
}

export interface MessageRequest {
    public_id: string;
    requester_matrix_user_id: string;
    recipient_matrix_user_id: string;
    introduction?: string | null;
    status: string;
    canonical_dm_room_id?: string | null;
    decided_at?: string | null;
    expires_at?: string | null;
    created_at: string;
}

export interface ContactRequest {
    public_id: string;
    requester_matrix_user_id: string;
    recipient_matrix_user_id: string;
    relationship_type: "contact" | "friend";
    note?: string | null;
    status: string;
    expires_at?: string | null;
    created_at: string;
}

export interface ConnectContact {
    public_id: string;
    user_a_matrix_user_id: string;
    user_b_matrix_user_id: string;
    relationship_type: "contact" | "friend";
    accepted_at: string;
}

export interface ConnectBlock {
    public_id: string;
    blocked_matrix_user_id: string;
    reason?: string | null;
    created_at: string;
}

export interface GovernanceModerationAction {
    public_id: string;
    action_type: string;
    actor_matrix_user_id?: string | null;
    effective_service?: string | null;
    target_type: string;
    target_public_id: string;
    scope_type: "global" | "resource" | "entity" | "project" | "case";
    scope_key?: string | null;
    reason: string;
    case_public_id?: string | null;
    starts_at: string;
    expires_at?: string | null;
    policy_basis: string;
    status: string;
    human_authorized: boolean;
    reversed_by_action_public_id?: string | null;
    created_at: string;
}

export interface FormalNoticeDetails {
    notice: FormalNotice & {
        target_audience?: Record<string, unknown>;
        attachments?: unknown[];
        linked_matrix_room_id?: string | null;
        linked_matrix_event_id?: string | null;
    };
    revisions: Array<Record<string, unknown> & { public_id: string; revision: number; material_change: boolean }>;
    my_target?: Record<string, unknown> | null;
    my_acknowledgements: Array<Record<string, unknown>>;
    targets?: Array<Record<string, unknown> & {
        matrix_user_id: string;
        acknowledgement_status: string;
    }>;
}

export interface GovernanceAuditEntry {
    id: number;
    public_id: string;
    actor_matrix_user_id?: string | null;
    effective_service?: string | null;
    action: string;
    object_type: string;
    object_public_id?: string | null;
    correlation_id?: string | null;
    reason?: string | null;
    related_case_public_id?: string | null;
    previous_hash?: string | null;
    entry_hash: string;
    created_at: string;
}

export interface AuditIntegrityResult {
    valid: boolean;
    checked: number;
    chainHead?: string | null;
    firstInvalidId?: number | null;
}

export interface GovernanceSearchResult {
    object_type: "formal_notice" | "action_item" | "decision" | "case" | "report";
    public_id: string;
    title: string;
    snippet: string;
    updated_at: string;
    deep_link: string;
}

export interface RetentionPolicy {
    policy_key: string;
    retention_class: string;
    display_name: string;
    default_days: number;
    minimum_days: number;
    maximum_days: number;
    purge_mode: "delete" | "anonymize" | "archive";
    legal_basis: string;
    enabled: boolean;
    updated_at?: string;
}

export interface RetentionOverride {
    public_id: string;
    policy_key: string;
    scope_type: "resource" | "entity" | "project" | "case" | "bot";
    scope_key: string;
    retention_days: number;
    reason: string;
    expires_at?: string | null;
}

export interface RetentionHold {
    public_id: string;
    hold_type: "legal" | "investigative" | "safety" | "appeal";
    scope_type: "resource" | "entity" | "project" | "report" | "case" | "evidence" | "user" | "bot";
    scope_key: string;
    reason: string;
    related_case_public_id?: string | null;
    placed_by_matrix_user_id: string;
    placed_at: string;
    expires_at?: string | null;
    released_at?: string | null;
}

export interface PurgePreview {
    public_id: string;
    preview_token: string;
    expires_in_seconds: number;
    retention_class: string;
    purge_mode: "delete" | "anonymize" | "archive";
    candidate_count: number;
    batch_limit_reached: boolean;
    candidate_fingerprint: string;
}

export interface MatrixDevice {
    device_id: string;
    display_name?: string;
    last_seen_ts?: number;
    last_seen_ip?: string;
}

export interface GovernanceRoleAssignment {
    public_id: string;
    matrix_user_id: string;
    role_key: string;
    scope_type: "global" | "resource" | "entity" | "project" | "case";
    scope_key?: string | null;
    source: string;
    source_version?: string | null;
    assigned_by_matrix_user_id?: string | null;
    reason?: string | null;
    starts_at: string;
    expires_at?: string | null;
    created_at: string;
}

interface ApiEnvelope<T> {
    ok: true;
    data: T;
}

interface ApiErrorEnvelope {
    ok?: false;
    error?: string;
    message?: string;
    meta?: { correlation_id?: string };
}

export class NixorApiError extends Error {
    public constructor(
        message: string,
        public readonly code: string,
        public readonly status: number,
        public readonly correlationId?: string,
    ) {
        super(message);
        this.name = "NixorApiError";
    }
}

const DEFAULT_TIMEOUT_MS = 15_000;
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
let cachedIdentity: NixorIdentity | null = null;
let identityRequest: Promise<NixorIdentity> | null = null;

function publicErrorMessage(code: string, status: number): string {
    if (code === "offline") return "You are offline. Reconnect before making this change.";
    if (code === "request_timeout") return "The accountability service did not respond in time. Try again.";
    if (code === "connect_session_required" || code === "connect_login_required" || status === 401) {
        return "Your secure Connect session has expired. Sign in again to continue.";
    }
    if (code === "step_up_required" || code === "invalid_or_expired_step_up") {
        return "The confirmation for this high-impact change is missing or expired. Confirm it again.";
    }
    if (code === "forbidden" || status === 403) return "You do not have permission to perform this action.";
    if (status === 404) return "This record is unavailable or you no longer have access to it.";
    if (status === 409) return "This record changed before your request completed. Refresh and try again.";
    if (status === 429) return "Too many requests were made. Wait briefly and try again.";
    if (status >= 500) return "The accountability service is temporarily unavailable. Your change was not saved.";
    return code.replaceAll("_", " ");
}

function isMutation(init: RequestInit): boolean {
    return MUTATING_METHODS.has((init.method ?? "GET").toUpperCase());
}

async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort("request_timeout"), DEFAULT_TIMEOUT_MS);
    const onAbort = (): void => controller.abort(init.signal?.reason);
    init.signal?.addEventListener("abort", onAbort, { once: true });
    try {
        return await fetch(url, { ...init, signal: controller.signal });
    } catch (error) {
        if (controller.signal.aborted) {
            const code = init.signal?.aborted ? "request_cancelled" : "request_timeout";
            throw new NixorApiError(publicErrorMessage(code, 0), code, 0);
        }
        throw error;
    } finally {
        window.clearTimeout(timeout);
        init.signal?.removeEventListener("abort", onAbort);
    }
}

export async function requestNixorConnect<T>(
    path: string,
    init: RequestInit = {},
    options: { skipCsrfBootstrap?: boolean } = {},
): Promise<T> {
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
        throw new NixorApiError(publicErrorMessage("offline", 0), "offline", 0);
    }

    if (isMutation(init) && !options.skipCsrfBootstrap && !cachedIdentity?.csrf_token) {
        await getNixorIdentity();
    }

    const headers = new Headers(init.headers);
    headers.set("Accept", "application/json");
    headers.set("X-Correlation-ID", crypto.randomUUID());
    if (init.body !== undefined && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
    if (isMutation(init) && cachedIdentity?.csrf_token) headers.set("X-CSRF-Token", cachedIdentity.csrf_token);

    let response: Response;
    try {
        response = await fetchWithTimeout(`${getNixorConnectApiBaseUrl()}${path}`, {
            ...init,
            credentials: "include",
            headers,
        });
    } catch (error) {
        if (error instanceof NixorApiError) throw error;
        throw new NixorApiError(
            "The accountability service could not be reached. Check your connection and try again.",
            "network_error",
            0,
        );
    }

    const body = (await response.json().catch(() => ({}))) as ApiErrorEnvelope | T;
    if (!response.ok) {
        if (response.status === 401) cachedIdentity = null;
        const errorBody = body as ApiErrorEnvelope;
        const code = typeof errorBody.error === "string" ? errorBody.error : `http_${response.status}`;
        const correlationId = response.headers.get("X-Correlation-ID") ?? errorBody.meta?.correlation_id;
        throw new NixorApiError(publicErrorMessage(code, response.status), code, response.status, correlationId);
    }
    return body as T;
}

export async function getNixorIdentity(force = false): Promise<NixorIdentity> {
    if (!force && cachedIdentity) return cachedIdentity;
    if (!force && identityRequest) return identityRequest;
    identityRequest = requestNixorConnect<ApiEnvelope<NixorIdentity>>(
        "/api/v1/me",
        { method: "GET" },
        { skipCsrfBootstrap: true },
    ).then((response) => {
        if (!response.data.csrf_token) {
            throw new NixorApiError("The secure request token is unavailable. Sign in again.", "csrf_token_missing", 401);
        }
        cachedIdentity = response.data;
        return response.data;
    }).finally(() => {
        identityRequest = null;
    });
    return identityRequest;
}

export function clearNixorApiSession(): void {
    cachedIdentity = null;
    identityRequest = null;
}

export function hasNixorCapability(identity: NixorIdentity | null, capability: string): boolean {
    return identity?.capabilities.includes(capability) === true;
}

export async function getConnectPrivacy(): Promise<ConnectPrivacySettings> {
    const response = await requestNixorConnect<ApiEnvelope<{ privacy: ConnectPrivacySettings }>>("/api/v1/privacy");
    return response.data.privacy;
}

export async function updateConnectPrivacy(privacy: ConnectPrivacySettings): Promise<void> {
    await requestNixorConnect("/api/v1/privacy", {
        method: "PUT",
        body: JSON.stringify({
            "message_requests": privacy.message_requests,
            "room_invitations": privacy.room_invitations,
            "profile_image_visibility": privacy.profile_image_visibility,
            "presence_visibility": privacy.presence_visibility,
            "directory_discovery": privacy.directory_discovery,
        }),
    });
}

export async function searchConnectDirectory(query: string): Promise<DirectoryUser[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ users: DirectoryUser[] }>>(
        `/api/v1/directory?query=${encodeURIComponent(query.trim())}`,
    );
    return response.data.users;
}

export async function listMessageRequests(): Promise<MessageRequest[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ requests: MessageRequest[] }>>(
        "/api/v1/message-requests",
    );
    return response.data.requests;
}

export async function createMessageRequest(recipientMatrixUserId: string, introduction?: string): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/message-requests", {
        method: "POST",
        body: JSON.stringify({
            "recipient_matrix_user_id": recipientMatrixUserId,
            ...(introduction?.trim() ? { introduction: introduction.trim() } : {}),
        }),
    });
    return response.data.public_id;
}

export async function decideMessageRequest(
    requestId: string,
    decision: "accept" | "decline",
): Promise<{ matrix_room_id?: string; friendship_created?: boolean }> {
    const response = await requestNixorConnect<ApiEnvelope<{
        matrix_room_id?: string;
        friendship_created?: boolean;
    }>>(`/api/v1/message-requests/${encodeURIComponent(requestId)}/${decision}`, {
        method: "POST",
        body: "{}",
    });
    return response.data;
}

export async function listContactRequests(): Promise<ContactRequest[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ requests: ContactRequest[] }>>(
        "/api/v1/contact-requests",
    );
    return response.data.requests;
}

export async function createContactRequest(
    recipientMatrixUserId: string,
    relationshipType: "contact" | "friend",
    note?: string,
): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/contact-requests", {
        method: "POST",
        body: JSON.stringify({
            "recipient_matrix_user_id": recipientMatrixUserId,
            "relationship_type": relationshipType,
            ...(note?.trim() ? { note: note.trim() } : {}),
        }),
    });
    return response.data.public_id;
}

export async function acceptContactRequest(requestId: string): Promise<void> {
    await requestNixorConnect(`/api/v1/contact-requests/${encodeURIComponent(requestId)}/accept`, {
        method: "POST",
        body: "{}",
    });
}

export async function declineContactRequest(requestId: string): Promise<void> {
    await requestNixorConnect(`/api/v1/contact-requests/${encodeURIComponent(requestId)}/decline`, {
        method: "POST",
        body: "{}",
    });
}

export async function listConnectContacts(): Promise<ConnectContact[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ contacts: ConnectContact[] }>>("/api/v1/contacts");
    return response.data.contacts;
}

export async function listConnectBlocks(): Promise<ConnectBlock[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ blocks: ConnectBlock[] }>>("/api/v1/blocks");
    return response.data.blocks;
}

export async function blockConnectUser(blockedMatrixUserId: string, reason?: string): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/blocks", {
        method: "POST",
        body: JSON.stringify({
            "blocked_matrix_user_id": blockedMatrixUserId,
            ...(reason?.trim() ? { reason: reason.trim() } : {}),
        }),
    });
    return response.data.public_id;
}

export async function unblockConnectUser(blockId: string): Promise<void> {
    await requestNixorConnect(`/api/v1/blocks/${encodeURIComponent(blockId)}`, { method: "DELETE" });
}

export async function createGroupDirectMessage(
    name: string,
    participants: string[],
    topic?: string,
): Promise<{ public_id: string; matrix_room_id: string }> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string; matrix_room_id: string }>>(
        "/api/v1/group-dms",
        {
            method: "POST",
            body: JSON.stringify({ name, participants, ...(topic?.trim() ? { topic: topic.trim() } : {}) }),
        },
    );
    return response.data;
}

export async function listFormalNotices(): Promise<FormalNotice[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ notices: FormalNotice[] }>>("/api/v1/formal-notices");
    return response.data.notices;
}

export async function acknowledgeFormalNotice(noticeId: string, revision: number, comment?: string): Promise<void> {
    await requestNixorConnect(`/api/v1/formal-notices/${encodeURIComponent(noticeId)}/acknowledgements`, {
        method: "POST",
        body: JSON.stringify({ revision, ...(comment?.trim() ? { comment: comment.trim() } : {}) }),
    });
}

export async function getFormalNotice(noticeId: string): Promise<FormalNoticeDetails> {
    const response = await requestNixorConnect<ApiEnvelope<FormalNoticeDetails>>(
        `/api/v1/formal-notices/${encodeURIComponent(noticeId)}`,
    );
    return response.data;
}

export interface FormalNoticeContentInput {
    title: string;
    body?: string;
    linked_matrix_room_id?: string;
    linked_matrix_event_id?: string;
    audience: Record<string, unknown>;
    priority: "low" | "normal" | "high" | "critical";
    acknowledgement_required: boolean;
    acknowledgement_deadline?: string;
    action_required: boolean;
    attachments: Array<{
        name: string;
        uri: string;
        mime_type?: string;
        size_bytes?: number;
    }>;
    escalation_policy_key?: string | null;
}

export async function createFormalNotice(input: FormalNoticeContentInput & {
    issuer_role: string;
    resource_key?: string;
    targets: Array<{ matrix_user_id: string; reason: string }>;
}): Promise<{ public_id: string; status: string; revision: number }> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string; status: string; revision: number }>>(
        "/api/v1/formal-notices",
        { method: "POST", body: JSON.stringify(input) },
    );
    return response.data;
}

export async function publishFormalNotice(noticeId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("notice.publish", noticeId, reason);
    await requestNixorConnect(`/api/v1/formal-notices/${encodeURIComponent(noticeId)}/publish`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({}),
    });
}

export async function reviseFormalNotice(
    noticeId: string,
    input: FormalNoticeContentInput & { change_summary: string; material_change: boolean },
): Promise<{ public_id: string; revision: number }> {
    const stepUpToken = await requestNixorStepUp("notice.revise", noticeId, input.change_summary);
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string; revision: number }>>(
        `/api/v1/formal-notices/${encodeURIComponent(noticeId)}/revisions`,
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify(input),
        },
    );
    return response.data;
}

export async function supersedeFormalNotice(
    noticeId: string,
    successorPublicId: string,
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("notice.supersede", noticeId, reason);
    await requestNixorConnect(`/api/v1/formal-notices/${encodeURIComponent(noticeId)}/supersede`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ "successor_public_id": successorPublicId, reason }),
    });
}

export async function withdrawFormalNotice(noticeId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("notice.withdraw", noticeId, reason);
    await requestNixorConnect(`/api/v1/formal-notices/${encodeURIComponent(noticeId)}/withdraw`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ reason }),
    });
}

export async function listActionItems(view: AccountabilityActionView = "mine"): Promise<AccountabilityAction[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ action_items: AccountabilityAction[] }>>(
        `/api/v1/action-items?view=${encodeURIComponent(view)}`,
    );
    return response.data.action_items;
}

export interface CreateActionInput {
    title: string;
    description: string;
    source_matrix_room_id?: string;
    source_matrix_event_id?: string;
    assignees: Array<{ matrix_user_id: string; role: "owner" | "assignee" }>;
    acceptance_reviewer_matrix_user_id?: string;
    resource_key?: string;
    responsible_entity_key?: string;
    project_key?: string;
    priority?: "low" | "normal" | "high" | "critical";
    category?: string;
    due_at?: string;
    due_timezone?: string;
    evidence_requirements?: unknown[];
    dependencies?: string[];
    watchers?: string[];
    escalation_policy_key?: string;
    assignment_reason: string;
}

export async function createActionItem(input: CreateActionInput): Promise<{ public_id: string; status: string }> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string; status: string }>>(
        "/api/v1/action-items",
        {
            method: "POST",
            body: JSON.stringify({
                priority: "normal",
                category: "general",
                due_timezone: "Asia/Karachi",
                evidence_requirements: [],
                dependencies: [],
                watchers: [],
                ...input,
            }),
        },
    );
    return response.data;
}

export async function acknowledgeActionItem(actionId: string, comment?: string): Promise<void> {
    await requestNixorConnect(`/api/v1/action-items/${encodeURIComponent(actionId)}/acknowledgements`, {
        method: "POST",
        body: JSON.stringify(comment?.trim() ? { comment: comment.trim() } : {}),
    });
}

export async function addActionEvidence(
    actionId: string,
    evidenceType: "matrix_event" | "attachment" | "link" | "note",
    title: string,
    reference: Record<string, unknown>,
): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>(
        `/api/v1/action-items/${encodeURIComponent(actionId)}/evidence`,
        {
            method: "POST",
            body: JSON.stringify({ "evidence_type": evidenceType, title, reference }),
        },
    );
    return response.data.public_id;
}

export async function updateActionStatus(actionId: string, status: string, reason: string): Promise<void> {
    await requestNixorConnect(`/api/v1/action-items/${encodeURIComponent(actionId)}/status`, {
        method: "POST",
        body: JSON.stringify({ status, reason }),
    });
}

export async function reassignActionItem(
    actionId: string,
    assignees: Array<{ matrix_user_id: string; role: "owner" | "assignee" }>,
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("action.reassign", actionId, reason);
    await requestNixorConnect(`/api/v1/action-items/${encodeURIComponent(actionId)}/reassign`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ assignees, reason }),
    });
}

export async function changeActionDueDate(
    actionId: string,
    dueAt: string | null,
    timezone: string,
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("action.due_date", actionId, reason);
    await requestNixorConnect(`/api/v1/action-items/${encodeURIComponent(actionId)}/due-date`, {
        method: "PATCH",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ "due_at": dueAt, timezone, reason }),
    });
}

export async function listDecisions(query = "", status = ""): Promise<GovernanceDecision[]> {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (status) params.set("status", status);
    const suffix = params.size ? `?${params.toString()}` : "";
    const response = await requestNixorConnect<ApiEnvelope<{ decisions: GovernanceDecision[] }>>(
        `/api/v1/decisions${suffix}`,
    );
    return response.data.decisions;
}

export interface CreateDecisionInput {
    title: string;
    statement: string;
    deciding_body: string;
    owner_matrix_user_id: string;
    participants?: Array<{ matrix_user_id: string; role: "proposer" | "participant" | "approver" | "observer" }>;
    linked_discussion?: Record<string, unknown>;
    alternatives?: unknown[];
    rationale?: string;
    conditions?: unknown[];
    follow_up_actions?: unknown[];
    attachments?: unknown[];
    visibility: "private" | "resource" | "entity" | "institution";
    resource_key?: string;
    responsible_entity_key?: string;
    review_at?: string;
    action_item_public_ids?: string[];
}

export async function createDecision(input: CreateDecisionInput): Promise<{ public_id: string; status: string }> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string; status: string }>>(
        "/api/v1/decisions",
        {
            method: "POST",
            body: JSON.stringify({
                participants: [],
                alternatives: [],
                conditions: [],
                follow_up_actions: [],
                attachments: [],
                action_item_public_ids: [],
                ...input,
            }),
        },
    );
    return response.data;
}

export async function reviseDecision(
    decisionId: string,
    input: {
        title: string;
        statement: string;
        linked_discussion?: Record<string, unknown>;
        alternatives: unknown[];
        rationale?: string;
        conditions: unknown[];
        follow_up_actions: unknown[];
        review_at?: string;
        attachments: unknown[];
        change_summary: string;
    },
): Promise<void> {
    await requestNixorConnect(`/api/v1/decisions/${encodeURIComponent(decisionId)}/versions`, {
        method: "POST",
        body: JSON.stringify(input),
    });
}

export async function updateDecisionStatus(
    decisionId: string,
    status: "approved" | "rejected" | "withdrawn",
    reason: string,
    approvalEvidence?: Record<string, unknown>,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("decision.status", decisionId, reason);
    await requestNixorConnect(`/api/v1/decisions/${encodeURIComponent(decisionId)}/status`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({
            status,
            reason,
            ...(approvalEvidence ? { "approval_evidence": approvalEvidence } : {}),
        }),
    });
}

export async function supersedeDecision(
    decisionId: string,
    replacementPublicId: string,
    reason: string,
    approvalEvidence: Record<string, unknown>,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("decision.supersede", decisionId, reason);
    await requestNixorConnect(`/api/v1/decisions/${encodeURIComponent(decisionId)}/supersede`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({
            "replacement_public_id": replacementPublicId,
            reason,
            "approval_evidence": approvalEvidence,
        }),
    });
}

export async function listHandovers(): Promise<GovernanceHandover[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ handovers: GovernanceHandover[] }>>("/api/v1/handovers");
    return response.data.handovers;
}

export async function createHandover(input: {
    role_key: string;
    responsible_entity_key: string;
    outgoing_matrix_user_id: string;
    incoming_matrix_user_id: string;
    oversight_matrix_user_id?: string;
    effective_at: string;
    manual_items?: Array<{ item_type: "document" | "risk" | "manual"; title: string; detail: Record<string, unknown> }>;
}): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/handovers", {
        method: "POST",
        body: JSON.stringify({ "manual_items": [], ...input }),
    });
    return response.data.public_id;
}

export async function activateHandover(handoverId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("handover.activate", handoverId, reason);
    await requestNixorConnect(`/api/v1/handovers/${encodeURIComponent(handoverId)}/activate`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: "{}",
    });
}

export async function acknowledgeHandover(
    handoverId: string,
    type: "outgoing" | "incoming" | "oversight",
    comment?: string,
): Promise<void> {
    await requestNixorConnect(`/api/v1/handovers/${encodeURIComponent(handoverId)}/acknowledgements`, {
        method: "POST",
        body: JSON.stringify({ type, ...(comment?.trim() ? { comment: comment.trim() } : {}) }),
    });
}

export async function cancelHandover(handoverId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("handover.cancel", handoverId, reason);
    await requestNixorConnect(`/api/v1/handovers/${encodeURIComponent(handoverId)}/cancel`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ reason }),
    });
}

export async function listReports(): Promise<GovernanceReport[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ reports: GovernanceReport[] }>>("/api/v1/reports");
    return response.data.reports;
}

export interface CreateReportInput {
    category: string;
    description: string;
    urgency?: "low" | "normal" | "high" | "critical";
    confidentiality?: "standard" | "confidential_identity" | "restricted";
    preferred_contact?: "in_app" | "matrix" | "none";
    immediate_safety?: boolean;
    subjects?: Array<{ type: "user" | "bot" | "moderator" | "unknown"; public_id: string; display_label?: string }>;
    targets: Array<{
        type: "message" | "user" | "dm" | "group_dm" | "channel" | "space" | "bot" | "moderator_action" | "general";
        public_id?: string;
        matrix_room_id?: string;
        matrix_event_id?: string;
        resource_classification?: "official" | "formal_non_official" | "informal" | "dm";
    }>;
}

export async function createReport(input: CreateReportInput): Promise<{
    public_id: string;
    report_number: string;
    status: string;
    emergency_guidance?: string;
}> {
    const response = await requestNixorConnect<ApiEnvelope<{
        public_id: string;
        report_number: string;
        status: string;
        emergency_guidance?: string;
    }>>("/api/v1/reports", {
        method: "POST",
        body: JSON.stringify({
            urgency: "normal",
            confidentiality: "standard",
            preferred_contact: "in_app",
            immediate_safety: false,
            subjects: [],
            ...input,
        }),
    });
    return response.data;
}

export async function addReportInformation(reportId: string, content: string): Promise<void> {
    await requestNixorConnect(`/api/v1/reports/${encodeURIComponent(reportId)}/information`, {
        method: "POST",
        body: JSON.stringify({ content, attachments: [] }),
    });
}

export async function listCases(state = "", severity = ""): Promise<GovernanceCase[]> {
    const params = new URLSearchParams();
    if (state) params.set("state", state);
    if (severity) params.set("severity", severity);
    const suffix = params.size ? `?${params.toString()}` : "";
    const response = await requestNixorConnect<ApiEnvelope<{ cases: GovernanceCase[] }>>(`/api/v1/cases${suffix}`);
    return response.data.cases;
}

export async function createCaseFromReport(input: {
    report_public_id: string;
    category: string;
    severity: "low" | "normal" | "high" | "critical";
    resource_key?: string;
    responsible_entity_key?: string;
    reviewer_group_key?: string;
    owner_matrix_user_id?: string;
    escalation_policy_key: string;
    triage_reason: string;
}): Promise<{ public_id: string; case_number: string; state: string }> {
    const stepUpToken = await requestNixorStepUp("case.create", undefined, input.triage_reason);
    const response = await requestNixorConnect<ApiEnvelope<{
        public_id: string;
        case_number: string;
        state: string;
    }>>("/api/v1/cases", {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify(input),
    });
    return response.data;
}

export async function acknowledgeCase(caseId: string, reason: string): Promise<void> {
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/acknowledge`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });
}

export async function updateCaseState(caseId: string, state: string, reason: string): Promise<void> {
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/state`, {
        method: "POST",
        body: JSON.stringify({ state, reason }),
    });
}

export async function getCaseDetails(caseId: string, purpose: string): Promise<GovernanceCaseDetails> {
    const response = await requestNixorConnect<ApiEnvelope<GovernanceCaseDetails>>(
        `/api/v1/cases/${encodeURIComponent(caseId)}?purpose=${encodeURIComponent(purpose)}`,
    );
    return response.data;
}

export async function addCaseNote(caseId: string, content: string): Promise<void> {
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/notes`, {
        method: "POST",
        body: JSON.stringify({ content, attachments: [] }),
    });
}

export async function publishCaseReporterUpdate(
    caseId: string,
    publicStatus: string,
    summary: string,
): Promise<void> {
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/reporter-updates`, {
        method: "POST",
        body: JSON.stringify({ "public_status": publicStatus, summary }),
    });
}

export async function recuseFromCase(caseId: string, reason: string): Promise<void> {
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/recusals`, {
        method: "POST",
        body: JSON.stringify({ reason }),
    });
}

export async function assignCase(
    caseId: string,
    matrixUserId: string,
    role: "owner" | "reviewer" | "observer",
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.assign", caseId, reason);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/assignments`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ "matrix_user_id": matrixUserId, role, reason }),
    });
}

export async function grantCaseAccess(
    caseId: string,
    matrixUserId: string,
    accessLevel: "metadata" | "notes" | "evidence" | "export",
    purpose: string,
    expiresAt?: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.access_grant", caseId, purpose);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/access-grants`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({
            "matrix_user_id": matrixUserId,
            "access_level": accessLevel,
            purpose,
            ...(expiresAt ? { "expires_at": expiresAt } : {}),
        }),
    });
}

export async function revokeCaseAccess(caseId: string, grantId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.access_revoke", grantId, reason);
    await requestNixorConnect(
        `/api/v1/cases/${encodeURIComponent(caseId)}/access-grants/${encodeURIComponent(grantId)}/revoke`,
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify({ reason }),
        },
    );
}

export async function relateCases(
    caseId: string,
    relatedCaseId: string,
    relationshipType: "related" | "duplicate",
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.relationship", caseId, reason);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/relationships`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({
            "related_case_public_id": relatedCaseId,
            "relationship_type": relationshipType,
            reason,
        }),
    });
}

export async function mergeCase(caseId: string, destinationCaseId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.merge", caseId, reason);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/merge`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ "destination_case_public_id": destinationCaseId, reason }),
    });
}

export async function escalateCase(
    caseId: string,
    toLevel: number,
    targetRoleKey: string,
    reason: string,
): Promise<void> {
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/escalations`, {
        method: "POST",
        body: JSON.stringify({ "to_level": toLevel, "target_role_key": targetRoleKey, reason }),
    });
}

export async function changeCaseDeadline(
    caseId: string,
    deadlineType: "acknowledgement" | "first_action",
    changeType: "paused" | "resumed" | "extended" | "shortened",
    newDueAt: string | null,
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.deadline", caseId, reason);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/deadlines`, {
        method: "PATCH",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({
            "deadline_type": deadlineType,
            "change_type": changeType,
            "new_due_at": newDueAt,
            reason,
        }),
    });
}

export async function resolveCase(
    caseId: string,
    outcome: string,
    reason: string,
    actionSummary: string,
    disclosure: { reporter_facing_summary: string } | { disclosure_withheld_reason: string },
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.resolve", caseId, reason);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/outcomes`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ outcome, reason, actions: [{ summary: actionSummary }], ...disclosure }),
    });
}

export async function closeCase(caseId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.close", caseId, reason);
    await requestNixorConnect(`/api/v1/cases/${encodeURIComponent(caseId)}/close`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ reason }),
    });
}

export async function viewCaseEvidence(evidenceId: string, purpose: string): Promise<Record<string, unknown>> {
    const response = await requestNixorConnect<ApiEnvelope<{ evidence: Record<string, unknown> }>>(
        `/api/v1/evidence/${encodeURIComponent(evidenceId)}?purpose=${encodeURIComponent(purpose)}`,
    );
    return response.data.evidence;
}

export async function listNotifications(unreadOnly = false): Promise<{
    notifications: GovernanceNotification[];
    unread_count: number;
}> {
    const response = await requestNixorConnect<ApiEnvelope<{
        notifications: GovernanceNotification[];
        unread_count: number;
    }>>(`/api/v1/notifications${unreadOnly ? "?unread=true" : ""}`);
    return response.data;
}

export async function submitCaseAppeal(caseId: string, basis: string): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>(
        `/api/v1/cases/${encodeURIComponent(caseId)}/appeals`,
        { method: "POST", body: JSON.stringify({ basis }) },
    );
    return response.data.public_id;
}

export async function decideCaseAppeal(
    caseId: string,
    appealId: string,
    decision: "upheld" | "modified" | "reversed",
    reason: string,
    reporterFacingSummary: string,
    moderationActionPublicId?: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("case.appeal_decision", appealId, reason);
    await requestNixorConnect(
        `/api/v1/cases/${encodeURIComponent(caseId)}/appeals/${encodeURIComponent(appealId)}/decision`,
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify({
                decision,
                reason,
                "reporter_facing_summary": reporterFacingSummary,
                ...(moderationActionPublicId ? { "moderation_action_public_id": moderationActionPublicId } : {}),
            }),
        },
    );
}

export async function markNotificationRead(notificationId: string): Promise<void> {
    await requestNixorConnect(`/api/v1/notifications/${encodeURIComponent(notificationId)}/read`, {
        method: "POST",
        body: "{}",
    });
}

export async function markAllNotificationsRead(): Promise<void> {
    await requestNixorConnect("/api/v1/notifications/read-all", { method: "POST", body: "{}" });
}

export async function dismissNotification(notificationId: string): Promise<void> {
    await requestNixorConnect(`/api/v1/notifications/${encodeURIComponent(notificationId)}/dismiss`, {
        method: "POST",
        body: "{}",
    });
}

export async function getNotificationPreferences(): Promise<{
    preferences: NotificationPreferences;
    vapid_public_key: string | null;
}> {
    const response = await requestNixorConnect<ApiEnvelope<{
        preferences: NotificationPreferences;
        vapid_public_key: string | null;
    }>>("/api/v1/notification-preferences");
    return response.data;
}

export async function updateNotificationPreferences(preferences: NotificationPreferences): Promise<void> {
    await requestNixorConnect("/api/v1/notification-preferences", {
        method: "PUT",
        body: JSON.stringify({
            "in_app_enabled": preferences.in_app_enabled,
            "matrix_enabled": preferences.matrix_enabled,
            "browser_push_enabled": preferences.browser_push_enabled,
            "quiet_hours_enabled": preferences.quiet_hours_enabled,
            "quiet_hours_start": preferences.quiet_hours_enabled ? preferences.quiet_hours_start ?? null : null,
            "quiet_hours_end": preferences.quiet_hours_enabled ? preferences.quiet_hours_end ?? null : null,
            "quiet_hours_timezone": preferences.quiet_hours_timezone,
            "digest_enabled": preferences.digest_enabled,
            "category_preferences": preferences.category_preferences,
        }),
    });
}

export async function registerPushSubscription(subscription: PushSubscriptionJSON): Promise<string> {
    if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys.auth) {
        throw new NixorApiError(
            "The browser returned an incomplete push subscription.",
            "push_subscription_incomplete",
            0,
        );
    }
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/push-subscriptions", {
        method: "POST",
        body: JSON.stringify({
            endpoint: subscription.endpoint,
            expirationTime: subscription.expirationTime ?? null,
            keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
        }),
    });
    return response.data.public_id;
}

export async function revokePushSubscription(subscriptionId: string): Promise<void> {
    await requestNixorConnect(`/api/v1/push-subscriptions/${encodeURIComponent(subscriptionId)}`, {
        method: "DELETE",
    });
}

export async function listGovernedResources(): Promise<GovernedResource[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ resources: GovernedResource[] }>>("/api/v1/resources");
    return response.data.resources;
}

export async function listGovernedResourceTemplates(): Promise<GovernedResourceTemplate[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ templates: GovernedResourceTemplate[] }>>(
        "/api/v1/resource-templates",
    );
    return response.data.templates;
}

export interface CreateGovernedResourceInput {
    resource_key: string;
    display_name: string;
    topic?: string;
    resource_type: "space" | "channel";
    classification: "official" | "formal_non_official" | "informal";
    template_key: string;
    responsible_entity_key?: string;
    accountable_owner_matrix_user_id?: string;
    moderators: string[];
    parent_resource_key?: string;
    visibility: "private" | "public";
    reason: string;
}

export async function createGovernedResource(input: CreateGovernedResourceInput): Promise<{
    resource_key: string;
    matrix_room_id: string;
}> {
    const headers: Record<string, string> = {};
    if (input.classification !== "informal") {
        headers["X-Step-Up-Token"] = await requestNixorStepUp(
            input.classification === "official" ? "resource.create.official" : "resource.create.formal",
            input.resource_key,
            input.reason,
        );
    }
    const response = await requestNixorConnect<ApiEnvelope<{ resource_key: string; matrix_room_id: string }>>(
        "/api/v1/resources",
        { method: "POST", headers, body: JSON.stringify(input) },
    );
    return response.data;
}

export interface UpdateGovernedResourceInput {
    display_name?: string;
    responsible_entity_key?: string | null;
    moderator_group?: string[];
    retention_policy_key?: string;
    escalation_policy_key?: string | null;
}

export async function updateGovernedResource(resourceKey: string, input: UpdateGovernedResourceInput): Promise<void> {
    await requestNixorConnect(`/api/v1/resources/${encodeURIComponent(resourceKey)}`, {
        method: "PATCH",
        body: JSON.stringify(input),
    });
}

export async function listProtectedResourceNames(): Promise<ProtectedResourceName[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ protected_names: ProtectedResourceName[] }>>(
        "/api/v1/protected-resource-names",
    );
    return response.data.protected_names;
}

function normalizeProtectedResourceName(value: string): string {
    return value
        .normalize("NFKC")
        .toLocaleLowerCase("en")
        .replace(/[^a-z0-9]+/g, " ")
        .trim()
        .replace(/\s+/g, " ");
}

export async function registerProtectedResourceName(input: {
    display_name: string;
    responsible_entity_key?: string;
    allowed_template_keys: string[];
    reason: string;
}): Promise<ProtectedResourceName> {
    const target = normalizeProtectedResourceName(input.display_name);
    const stepUpToken = await requestNixorStepUp("resource.protected_name.manage", target, input.reason);
    const response = await requestNixorConnect<ApiEnvelope<{ protected_name: ProtectedResourceName }>>(
        "/api/v1/protected-resource-names",
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify(input),
        },
    );
    return response.data.protected_name;
}

export async function revokeProtectedResourceName(normalizedName: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("resource.protected_name.manage", normalizedName, reason);
    await requestNixorConnect(
        `/api/v1/protected-resource-names/${encodeURIComponent(normalizedName)}/revoke`,
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify({ reason }),
        },
    );
}

export async function requestNixorStepUp(action: string, targetPublicId: string | undefined, reason: string): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ step_up_token: string; expires_at: string }>>(
        "/api/v1/auth/step-up",
        {
            method: "POST",
            body: JSON.stringify({
                confirmation: "CONFIRM",
                action,
                ...(targetPublicId ? { "target_public_id": targetPublicId } : {}),
                reason,
            }),
        },
    );
    return response.data.step_up_token;
}

export async function transitionGovernedResource(
    resourceKey: string,
    toState: "draft" | "active" | "frozen" | "archived" | "suspended",
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("resource.lifecycle", resourceKey, reason);
    await requestNixorConnect(`/api/v1/resources/${encodeURIComponent(resourceKey)}/transition`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ "to_state": toState, reason }),
    });
}

export async function transferGovernedResource(
    resourceKey: string,
    newOwnerMatrixUserId: string,
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("resource.transfer", resourceKey, reason);
    await requestNixorConnect(`/api/v1/resources/${encodeURIComponent(resourceKey)}/transfer`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ "new_owner_matrix_user_id": newOwnerMatrixUserId, reason }),
    });
}

export async function promoteGovernedResource(
    resourceKey: string,
    classification: "official" | "formal_non_official",
    responsibleEntityKey: string,
    templateKey: string,
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("resource.promote", resourceKey, reason);
    await requestNixorConnect(`/api/v1/resources/${encodeURIComponent(resourceKey)}/promote`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({
            classification,
            "responsible_entity_key": responsibleEntityKey,
            "template_key": templateKey,
            reason,
        }),
    });
}

export async function listModerationActions(
    scopeType?: "global" | "resource" | "entity" | "project" | "case",
    scopeKey?: string,
): Promise<GovernanceModerationAction[]> {
    const query = new URLSearchParams();
    if (scopeType) query.set("scope_type", scopeType);
    if (scopeType && scopeType !== "global" && scopeKey) query.set("scope_key", scopeKey);
    const response = await requestNixorConnect<ApiEnvelope<{ moderation_actions: GovernanceModerationAction[] }>>(
        `/api/v1/moderation-actions${query.size ? `?${query.toString()}` : ""}`,
    );
    return response.data.moderation_actions;
}

export interface CreateModerationActionInput {
    action_type: string;
    target_type: "user" | "event" | "media" | "room" | "space" | "bot" | "resource";
    target_public_id: string;
    target_matrix_user_id?: string;
    matrix_room_id?: string;
    matrix_event_id?: string;
    matrix_media_uri?: string;
    scope_type: "global" | "resource" | "entity" | "project" | "case";
    scope_key?: string;
    reason: string;
    case_public_id?: string;
    evidence_public_ids: string[];
    expires_at?: string;
    policy_basis: string;
    notify_target: boolean;
    appeal_route?: string;
    slow_mode_seconds?: number;
}

export async function createModerationAction(input: CreateModerationActionInput): Promise<string> {
    const stepUpToken = await requestNixorStepUp("moderation.perform", undefined, input.reason);
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/moderation-actions", {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify(input),
    });
    return response.data.public_id;
}

export async function reverseModerationAction(actionId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("moderation.reverse", actionId, reason);
    await requestNixorConnect(`/api/v1/moderation-actions/${encodeURIComponent(actionId)}/reverse`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ reason }),
    });
}

export async function searchGovernanceRecords(
    query: string,
    types: GovernanceSearchResult["object_type"][] = ["formal_notice", "action_item", "decision", "case", "report"],
): Promise<GovernanceSearchResult[]> {
    const params = new URLSearchParams({ q: query, type: types.join(",") });
    const response = await requestNixorConnect<ApiEnvelope<{ results: GovernanceSearchResult[] }>>(
        `/api/v1/search?${params.toString()}`,
    );
    return response.data.results;
}

export async function listGovernanceAudit(input: {
    beforeId?: number;
    objectType?: string;
    actorMatrixUserId?: string;
    casePublicId?: string;
    purpose: string;
    limit?: number;
}): Promise<{ entries: GovernanceAuditEntry[]; next_before_id?: number | null }> {
    const params = new URLSearchParams({ purpose: input.purpose, limit: String(input.limit ?? 100) });
    if (input.beforeId) params.set("before_id", String(input.beforeId));
    if (input.objectType) params.set("object_type", input.objectType);
    if (input.actorMatrixUserId) params.set("actor_matrix_user_id", input.actorMatrixUserId);
    if (input.casePublicId) params.set("case_public_id", input.casePublicId);
    const response = await requestNixorConnect<ApiEnvelope<{
        entries: GovernanceAuditEntry[];
        next_before_id?: number | null;
    }>>(`/api/v1/audit?${params.toString()}`);
    return response.data;
}

export async function verifyGovernanceAudit(throughId?: number): Promise<AuditIntegrityResult> {
    const path = throughId ? `/api/v1/audit/integrity?through_id=${encodeURIComponent(String(throughId))}` : "/api/v1/audit/integrity";
    const response = await requestNixorConnect<ApiEnvelope<AuditIntegrityResult>>(path);
    return response.data;
}

export async function createGovernanceAuditCheckpoint(reason: string, signingKeyId?: string): Promise<{
    public_id: string;
    through_entry_id: number;
    chain_head_hash: string;
}> {
    const stepUpToken = await requestNixorStepUp("audit.checkpoint", undefined, reason);
    const response = await requestNixorConnect<ApiEnvelope<{
        public_id: string;
        through_entry_id: number;
        chain_head_hash: string;
    }>>("/api/v1/audit/checkpoints", {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify(signingKeyId ? { "signing_key_id": signingKeyId } : {}),
    });
    return response.data;
}

export async function listRetentionConfiguration(): Promise<{
    policies: RetentionPolicy[];
    overrides: RetentionOverride[];
}> {
    const response = await requestNixorConnect<ApiEnvelope<{
        policies: RetentionPolicy[];
        overrides: RetentionOverride[];
    }>>("/api/v1/retention/policies");
    return response.data;
}

export async function listRetentionHolds(activeOnly = true): Promise<RetentionHold[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ holds: RetentionHold[] }>>(
        `/api/v1/retention/holds?active_only=${activeOnly ? "true" : "false"}`,
    );
    return response.data.holds;
}

export async function updateRetentionPolicy(
    policyKey: string,
    patch: { default_days?: number; enabled?: boolean; legal_basis?: string },
    reason: string,
): Promise<void> {
    const stepUpToken = await requestNixorStepUp("retention.policy", policyKey, reason);
    await requestNixorConnect(`/api/v1/retention/policies/${encodeURIComponent(policyKey)}`, {
        method: "PATCH",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ ...patch, reason }),
    });
}

export async function createRetentionOverride(input: {
    policy_key: string;
    scope_type: RetentionOverride["scope_type"];
    scope_key: string;
    retention_days: number;
    reason: string;
    expires_at?: string;
}): Promise<string> {
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/retention/overrides", {
        method: "POST",
        body: JSON.stringify(input),
    });
    return response.data.public_id;
}

export async function placeRetentionHold(input: {
    hold_type: RetentionHold["hold_type"];
    scope_type: RetentionHold["scope_type"];
    scope_key: string;
    reason: string;
    related_case_public_id?: string;
    expires_at?: string;
}): Promise<string> {
    const stepUpToken = await requestNixorStepUp("retention.hold", undefined, input.reason);
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/retention/holds", {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify(input),
    });
    return response.data.public_id;
}

export async function releaseRetentionHold(holdId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("retention.hold_release", holdId, reason);
    await requestNixorConnect(`/api/v1/retention/holds/${encodeURIComponent(holdId)}/release`, {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ reason }),
    });
}

export async function previewRetentionPurge(input: {
    policy_key: string;
    before: string;
    scope_type?: RetentionOverride["scope_type"];
    scope_key?: string;
    batch_limit?: number;
}): Promise<PurgePreview> {
    const response = await requestNixorConnect<ApiEnvelope<PurgePreview>>("/api/v1/retention/purge-previews", {
        method: "POST",
        body: JSON.stringify(input),
    });
    return response.data;
}

export async function executeRetentionPurge(preview: PurgePreview, reason: string): Promise<Record<string, unknown>> {
    const stepUpToken = await requestNixorStepUp("retention.purge", preview.public_id, reason);
    const response = await requestNixorConnect<ApiEnvelope<Record<string, unknown>>>(
        "/api/v1/retention/purge-executions",
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify({
                "purge_job_public_id": preview.public_id,
                "preview_token": preview.preview_token,
                confirmation: "PURGE",
                reason,
            }),
        },
    );
    return response.data;
}

export async function listMatrixDevices(): Promise<MatrixDevice[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ devices: MatrixDevice[] }>>("/api/v1/me/devices");
    return response.data.devices;
}

export async function revokeOwnMatrixDevice(deviceId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("session.device.revoke", deviceId, reason);
    await requestNixorConnect(`/api/v1/me/devices/${encodeURIComponent(deviceId)}`, {
        method: "DELETE",
        headers: { "X-Step-Up-Token": stepUpToken },
    });
}

export async function revokeMatrixDeviceAsAdmin(
    matrixUserId: string,
    deviceId: string,
    reason: string,
): Promise<void> {
    const target = `${matrixUserId}:${deviceId}`;
    const stepUpToken = await requestNixorStepUp("session.device.admin_revoke", target, reason);
    await requestNixorConnect(
        `/api/v1/admin/users/${encodeURIComponent(matrixUserId)}/devices/${encodeURIComponent(deviceId)}/revoke`,
        {
            method: "POST",
            headers: { "X-Step-Up-Token": stepUpToken },
            body: JSON.stringify({ reason }),
        },
    );
}

export async function listGovernanceRoleAssignments(matrixUserId: string): Promise<GovernanceRoleAssignment[]> {
    const response = await requestNixorConnect<ApiEnvelope<{ assignments: GovernanceRoleAssignment[] }>>(
        `/api/v1/role-assignments?matrix_user_id=${encodeURIComponent(matrixUserId)}`,
    );
    return response.data.assignments;
}

export async function createGovernanceRoleAssignment(input: {
    matrix_user_id: string;
    role_key: string;
    scope_type: GovernanceRoleAssignment["scope_type"];
    scope_key?: string;
    reason: string;
    expires_at?: string;
}): Promise<string> {
    const target = `${input.matrix_user_id}:${input.role_key}`;
    const stepUpToken = await requestNixorStepUp("role.assign", target, input.reason);
    const response = await requestNixorConnect<ApiEnvelope<{ public_id: string }>>("/api/v1/role-assignments", {
        method: "POST",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify(input),
    });
    return response.data.public_id;
}

export async function revokeGovernanceRoleAssignment(assignmentId: string, reason: string): Promise<void> {
    const stepUpToken = await requestNixorStepUp("role.revoke", assignmentId, reason);
    await requestNixorConnect(`/api/v1/role-assignments/${encodeURIComponent(assignmentId)}`, {
        method: "DELETE",
        headers: { "X-Step-Up-Token": stepUpToken },
        body: JSON.stringify({ reason }),
    });
}

export async function createGovernanceExport(input: {
    object_type: "formal_notice" | "decision" | "case" | "evidence" | "audit";
    object_public_id: string;
    format: "html" | "pdf" | "csv" | "json";
    purpose: string;
}): Promise<{ blob: Blob; filename: string }> {
    if (!cachedIdentity?.csrf_token) await getNixorIdentity();
    const headers = new Headers({
        "Accept": "*/*",
        "Content-Type": "application/json",
        "X-Correlation-ID": crypto.randomUUID(),
    });
    if (cachedIdentity?.csrf_token) headers.set("X-CSRF-Token", cachedIdentity.csrf_token);
    let response: Response;
    try {
        response = await fetchWithTimeout(`${getNixorConnectApiBaseUrl()}/api/v1/exports`, {
            method: "POST",
            credentials: "include",
            headers,
            body: JSON.stringify(input),
        });
    } catch (error) {
        if (error instanceof NixorApiError) throw error;
        throw new NixorApiError("The export service could not be reached.", "network_error", 0);
    }
    if (!response.ok) {
        const errorBody = (await response.json().catch(() => ({}))) as ApiErrorEnvelope;
        const code = typeof errorBody.error === "string" ? errorBody.error : `http_${response.status}`;
        throw new NixorApiError(
            publicErrorMessage(code, response.status),
            code,
            response.status,
            response.headers.get("X-Correlation-ID") ?? errorBody.meta?.correlation_id,
        );
    }
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const filename = /filename="?([^";]+)"?/i.exec(disposition)?.[1]
        ?? `nixor-${input.object_type}-export.${input.format}`;
    return { blob: await response.blob(), filename };
}

export async function getAdminStatus(): Promise<Record<string, unknown>> {
    const response = await requestNixorConnect<ApiEnvelope<Record<string, unknown>>>("/api/v1/admin/status");
    return response.data;
}
