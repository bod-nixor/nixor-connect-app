/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import React from "react";
import { render, screen } from "jest-matrix-react";

import NixorActionCard from "../../../../../src/components/views/accountability/NixorActionCard";
import type { AccountabilityAction, NixorIdentity } from "../../../../../src/nixor/accountabilityApi";

describe("NixorActionCard", () => {
    it("renders human-readable people rather than Matrix identifiers", () => {
        const action: AccountabilityAction = {
            public_id: "action_0123456789abcdef0123456789abcdef",
            title: "QA action",
            description: "Controlled acceptance action.",
            creator_matrix_user_id: "@shahzain:connect.nixorcorporate.com",
            creator_display_name: "Shahzain Sajjad Qureshi",
            acceptance_reviewer_matrix_user_id: "@shahzain:connect.nixorcorporate.com",
            acceptance_reviewer_display_name: "Shahzain Sajjad Qureshi",
            priority: "normal",
            category: "general",
            due_timezone: "Asia/Karachi",
            status: "assigned",
            assignees: [{ matrix_user_id: "@nixorproductions:connect.nixorcorporate.com", display_name: "Nixor Productions", role: "assignee" }],
            created_at: "2026-07-26T00:00:00.000Z",
        };
        const identity: NixorIdentity = {
            identity: { matrix_user_id: "@shahzain:connect.nixorcorporate.com", email: "shahzain@example.test", identity_type: "human", account_status: "active" },
            global_roles: [], assignments: [], capabilities: [], privacy: null,
            session: { matrix_device_id: "device", expires_at: "2026-07-27T00:00:00.000Z" }, csrf_token: "test",
        };

        render(<NixorActionCard action={action} identity={identity} onUpdated={async () => undefined} />);

        expect(screen.getByText(/Created by Shahzain Sajjad Qureshi/)).toBeInTheDocument();
        expect(screen.getByText(/assignee: Nixor Productions/)).toBeInTheDocument();
        expect(screen.queryByText(/@shahzain:connect\.nixorcorporate\.com/)).not.toBeInTheDocument();
        expect(screen.queryByText(/@nixorproductions:connect\.nixorcorporate\.com/)).not.toBeInTheDocument();
    });
});
