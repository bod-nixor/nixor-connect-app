import fetchMock from "@fetch-mock/jest";

import { completeNixorOnboarding, getNixorOnboardingStatus } from "../../../src/nixor/onboarding";

describe("Nixor onboarding API", () => {
    beforeEach(() => {
        fetchMock.removeRoutes();
        fetchMock.clearHistory();
        window.mxReactSdkConfig = {
            nixor: {
                connect_api_base_url: "https://connect-api.nixorcorporate.com",
            },
        } as any;
    });

    it("fetches onboarding status with the Connect session cookie", async () => {
        fetchMock.get("https://connect-api.nixorcorporate.com/auth/onboarding", {
            ok: true,
            onboarding_completed: false,
            sync_status: "succeeded",
            user: {
                matrix_user_id: "@student:server",
                email: "student@nixorcollege.edu.pk",
            },
            memberships: [
                {
                    resource_key: "announcements",
                    display_name: "Announcements",
                    resource_type: "channel",
                    matrix_room_id: "!announcements:server",
                    desired_role: "member",
                    status: "succeeded",
                },
            ],
            landing: {
                kind: "room",
                resource_key: "announcements",
                room_id: "!announcements:server",
            },
        });

        await expect(getNixorOnboardingStatus()).resolves.toMatchObject({
            onboarding_completed: false,
            landing: {
                kind: "room",
                room_id: "!announcements:server",
            },
        });
        expect(fetchMock).toHaveFetched("https://connect-api.nixorcorporate.com/auth/onboarding", {
            credentials: "include",
        });
    });

    it("persists onboarding completion with the Connect session cookie", async () => {
        fetchMock.post("https://connect-api.nixorcorporate.com/auth/onboarding/complete", { ok: true });

        await expect(completeNixorOnboarding()).resolves.toBeUndefined();
        expect(fetchMock).toHaveFetched("https://connect-api.nixorcorporate.com/auth/onboarding/complete", {
            method: "POST",
            credentials: "include",
        });
    });
});
