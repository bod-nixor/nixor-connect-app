/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import fetchMock from "@fetch-mock/jest";

import {
    acknowledgeFormalNotice,
    clearNixorApiSession,
    createActionItem,
    createGovernedResource,
    getNixorIdentity,
    grantCaseAccess,
    listCases,
    listDecisions,
    publishFormalNotice,
    registerProtectedResourceName,
    registerPushSubscription,
    searchGovernanceRecords,
    updateNotificationPreferences,
} from "../../../src/nixor/accountabilityApi";
import { updateNixorBotPreferences } from "../../../src/nixor/bots";

const apiBase = "https://connect-api.nixorcorporate.com";
const csrfToken = "csrf-token-returned-only-to-the-connect-origin";

function identityResponse(includeCsrf = true): Record<string, unknown> {
    return {
        ok: true,
        data: {
            identity: {
                matrix_user_id: "@student:connect.nixorcorporate.com",
                email: "student@nixorcollege.edu.pk",
                display_name: "Nixor Student",
                identity_type: "human",
                account_status: "active",
            },
            global_roles: ["student"],
            assignments: [],
            capabilities: ["action.create"],
            privacy: null,
            session: { matrix_device_id: "DEVICE", expires_at: "2030-01-01T00:00:00.000Z" },
            ...(includeCsrf ? { csrf_token: csrfToken } : {}),
        },
    };
}

describe("Nixor accountability API", () => {
    beforeEach(() => {
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
        clearNixorApiSession();
        window.mxReactSdkConfig = { nixor: { connect_api_base_url: apiBase } } as any;
        jest.spyOn(window.navigator, "onLine", "get").mockReturnValue(true);
    });

    afterEach(() => jest.restoreAllMocks());

    it("bootstraps a session-bound CSRF token before a mutation", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/action-items`, {
            ok: true,
            data: { public_id: "action_abcdefghijklmnopqrst", status: "assigned" },
        });

        await expect(createActionItem({
            title: "Follow up",
            description: "Complete the assigned work",
            assignees: [{ matrix_user_id: "@student:connect.nixorcorporate.com", role: "assignee" }],
            assignment_reason: "Unit-test assignment",
        })).resolves.toMatchObject({ status: "assigned" });

        const mutation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/action-items`);
        expect(mutation?.options.credentials).toBe("include");
        expect(new Headers(mutation?.options.headers).get("X-CSRF-Token")).toBe(csrfToken);
        expect(new Headers(mutation?.options.headers).get("Authorization")).toBeNull();
    });

    it("uses the same CSRF-protected transport for bot preference mutations", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.patch(`${apiBase}/v1/bots/app_abcdefghijklmnopqrst/preferences`, { ok: true });

        await expect(updateNixorBotPreferences("app_abcdefghijklmnopqrst", { favourited: true })).resolves.toBeUndefined();
        const mutation = fetchMock.callHistory.lastCall(`${apiBase}/v1/bots/app_abcdefghijklmnopqrst/preferences`);
        expect(new Headers(mutation?.options.headers).get("X-CSRF-Token")).toBe(csrfToken);
    });

    it("registers browser push with the CSRF transport and bounded browser fields", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/push-subscriptions`, {
            ok: true,
            data: { public_id: "push_abcdefghijklmnopqrst" },
        });

        await expect(registerPushSubscription({
            endpoint: "https://push.example.test/subscription",
            expirationTime: null,
            keys: { p256dh: "p".repeat(24), auth: "a".repeat(16) },
        })).resolves.toBe("push_abcdefghijklmnopqrst");

        const mutation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/push-subscriptions`);
        expect(new Headers(mutation?.options.headers).get("X-CSRF-Token")).toBe(csrfToken);
        const pushBody = mutation?.options.body;
        if (typeof pushBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(pushBody)).toEqual({
            endpoint: "https://push.example.test/subscription",
            expirationTime: null,
            keys: { p256dh: "p".repeat(24), auth: "a".repeat(16) },
        });
    });

    it("sends only the notification preference contract", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.put(`${apiBase}/api/v1/notification-preferences`, { ok: true, data: { updated: true } });

        await updateNotificationPreferences({
            in_app_enabled: true,
            matrix_enabled: true,
            browser_push_enabled: false,
            quiet_hours_enabled: false,
            quiet_hours_start: "22:00",
            quiet_hours_end: "07:00",
            quiet_hours_timezone: "Asia/Karachi",
            digest_enabled: true,
            category_preferences: { social: "muted" },
            updated_at: "2026-07-19T00:00:00.000Z",
        });

        const mutation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/notification-preferences`);
        const preferencesBody = mutation?.options.body;
        if (typeof preferencesBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(preferencesBody)).toEqual({
            in_app_enabled: true,
            matrix_enabled: true,
            browser_push_enabled: false,
            quiet_hours_enabled: false,
            quiet_hours_start: null,
            quiet_hours_end: null,
            quiet_hours_timezone: "Asia/Karachi",
            digest_enabled: true,
            category_preferences: { social: "muted" },
        });
    });

    it("acknowledges only the exact formal-notice revision shown to the user", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/formal-notices/notice_abcdefghijklmnopqrst/acknowledgements`, {
            ok: true,
            data: { public_id: "notice_ack_abcdefghijklmnopqrst", revision: 7 },
        });

        await acknowledgeFormalNotice("notice_abcdefghijklmnopqrst", 7, "Read and understood");

        const mutation = fetchMock.callHistory.lastCall(
            `${apiBase}/api/v1/formal-notices/notice_abcdefghijklmnopqrst/acknowledgements`,
        );
        const body = mutation?.options.body;
        if (typeof body !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(body)).toEqual({ revision: 7, comment: "Read and understood" });
    });

    it("binds a formal-notice publish step-up to the exact action and target", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/auth/step-up`, {
            ok: true,
            data: { step_up_token: "short-lived-step-up", expires_at: "2030-01-01T00:05:00.000Z" },
        });
        fetchMock.post(`${apiBase}/api/v1/formal-notices/notice_abcdefghijklmnopqrst/publish`, {
            ok: true,
            data: { status: "published" },
        });

        await publishFormalNotice("notice_abcdefghijklmnopqrst", "Publish after final review");

        const confirmation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/auth/step-up`);
        const confirmationBody = confirmation?.options.body;
        if (typeof confirmationBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(confirmationBody)).toEqual({
            confirmation: "CONFIRM",
            action: "notice.publish",
            target_public_id: "notice_abcdefghijklmnopqrst",
            reason: "Publish after final review",
        });
        const publish = fetchMock.callHistory.lastCall(
            `${apiBase}/api/v1/formal-notices/notice_abcdefghijklmnopqrst/publish`,
        );
        expect(new Headers(publish?.options.headers).get("X-Step-Up-Token")).toBe("short-lived-step-up");
    });

    it("requires an action-bound step-up before creating an official governed resource", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/auth/step-up`, {
            ok: true,
            data: { step_up_token: "official-resource-step-up", expires_at: "2030-01-01T00:05:00.000Z" },
        });
        fetchMock.post(`${apiBase}/api/v1/resources`, {
            ok: true,
            data: {
                resource_key: "entity.student-council",
                matrix_room_id: "!student-council:connect.nixorcorporate.com",
            },
        });

        await createGovernedResource({
            resource_key: "entity.student-council",
            display_name: "Student Council",
            resource_type: "space",
            classification: "official",
            template_key: "entity",
            responsible_entity_key: "entity:student-council",
            accountable_owner_matrix_user_id: "@student:connect.nixorcorporate.com",
            moderators: [],
            visibility: "private",
            reason: "Provision the approved institutional server",
        });

        const confirmation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/auth/step-up`);
        const confirmationBody = confirmation?.options.body;
        if (typeof confirmationBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(confirmationBody)).toEqual({
            confirmation: "CONFIRM",
            action: "resource.create.official",
            target_public_id: "entity.student-council",
            reason: "Provision the approved institutional server",
        });
        const creation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/resources`);
        expect(new Headers(creation?.options.headers).get("X-Step-Up-Token")).toBe("official-resource-step-up");
    });

    it("normalizes and target-binds protected institutional name registration", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/auth/step-up`, {
            ok: true,
            data: { step_up_token: "protected-name-step-up", expires_at: "2030-01-01T00:05:00.000Z" },
        });
        fetchMock.post(`${apiBase}/api/v1/protected-resource-names`, {
            ok: true,
            data: {
                protected_name: {
                    normalized_name: "nixor student council",
                    display_name: "Nixor — Student Council",
                    responsible_entity_key: "entity:student-council",
                    allowed_template_keys: ["entity"],
                    created_by_matrix_user_id: "@student:connect.nixorcorporate.com",
                    created_at: "2030-01-01T00:00:00.000Z",
                    updated_at: "2030-01-01T00:00:00.000Z",
                },
            },
        });

        await registerProtectedResourceName({
            display_name: "Nixor — Student Council",
            responsible_entity_key: "entity:student-council",
            allowed_template_keys: ["entity"],
            reason: "Reserve approved institutional branding",
        });

        const confirmation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/auth/step-up`);
        const confirmationBody = confirmation?.options.body;
        if (typeof confirmationBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(confirmationBody)).toMatchObject({
            confirmation: "CONFIRM",
            action: "resource.protected_name.manage",
            target_public_id: "nixor student council",
        });
        const registration = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/protected-resource-names`);
        expect(new Headers(registration?.options.headers).get("X-Step-Up-Token")).toBe("protected-name-step-up");
    });

    it("uses the authorization-filtered governance search endpoint", async () => {
        fetchMock.get(
            `${apiBase}/api/v1/search?q=follow-up&type=formal_notice%2Caction_item%2Cdecision%2Ccase%2Creport`,
            { ok: true, data: { results: [{ object_type: "action_item", public_id: "action_1", title: "Follow-up" }] } },
        );

        await expect(searchGovernanceRecords("follow-up")).resolves.toEqual([
            expect.objectContaining({ object_type: "action_item", public_id: "action_1" }),
        ]);
    });

    it("applies decision and case queue filters without broadening the request", async () => {
        fetchMock.get(`${apiBase}/api/v1/decisions?q=policy&status=approved`, {
            ok: true,
            data: { decisions: [] },
        });
        fetchMock.get(`${apiBase}/api/v1/cases?state=under_review&severity=high`, {
            ok: true,
            data: { cases: [] },
        });

        await expect(listDecisions("policy", "approved")).resolves.toEqual([]);
        await expect(listCases("under_review", "high")).resolves.toEqual([]);
    });

    it("binds a purpose-limited case grant to the case and declared access level", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse());
        fetchMock.post(`${apiBase}/api/v1/auth/step-up`, {
            ok: true,
            data: { step_up_token: "case-grant-step-up", expires_at: "2030-01-01T00:05:00.000Z" },
        });
        fetchMock.post(`${apiBase}/api/v1/cases/case_abcdefghijklmnopqrst/access-grants`, {
            ok: true,
            data: { public_id: "case_access_abcdefghijklmnopqrst" },
        });

        await grantCaseAccess(
            "case_abcdefghijklmnopqrst",
            "@reviewer:connect.nixorcorporate.com",
            "metadata",
            "Review routing metadata only",
            "2030-01-02T00:00:00.000Z",
        );

        const confirmation = fetchMock.callHistory.lastCall(`${apiBase}/api/v1/auth/step-up`);
        const confirmationBody = confirmation?.options.body;
        if (typeof confirmationBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(confirmationBody)).toEqual({
            confirmation: "CONFIRM",
            action: "case.access_grant",
            target_public_id: "case_abcdefghijklmnopqrst",
            reason: "Review routing metadata only",
        });
        const grant = fetchMock.callHistory.lastCall(
            `${apiBase}/api/v1/cases/case_abcdefghijklmnopqrst/access-grants`,
        );
        const grantBody = grant?.options.body;
        if (typeof grantBody !== "string") throw new Error("Expected a JSON request body");
        expect(JSON.parse(grantBody)).toEqual({
            matrix_user_id: "@reviewer:connect.nixorcorporate.com",
            access_level: "metadata",
            purpose: "Review routing metadata only",
            expires_at: "2030-01-02T00:00:00.000Z",
        });
    });

    it("fails closed when the authenticated bootstrap omits its CSRF token", async () => {
        fetchMock.get(`${apiBase}/api/v1/me`, identityResponse(false));
        await expect(getNixorIdentity()).rejects.toMatchObject({
            code: "csrf_token_missing",
            status: 401,
        });
    });

    it("reports an honest offline state without sending a request", async () => {
        jest.spyOn(window.navigator, "onLine", "get").mockReturnValue(false);
        await expect(getNixorIdentity()).rejects.toMatchObject({ code: "offline", status: 0 });
        expect(fetchMock.callHistory.calls()).toHaveLength(0);
    });
});
