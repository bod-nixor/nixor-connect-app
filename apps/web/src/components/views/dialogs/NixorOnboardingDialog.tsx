/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useState } from "react";

import BaseDialog from "./BaseDialog";
import DialogButtons from "../elements/DialogButtons";
import { completeNixorOnboarding, NixorOnboardingStatus } from "../../../nixor/onboarding";

interface IProps {
    status: NixorOnboardingStatus;
    canCancel?: boolean;
    onFinished: (completed?: boolean) => void;
}

const NixorOnboardingDialog: React.FC<IProps> = ({ status, canCancel = false, onFinished }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const spaces = status.memberships.filter((membership) => membership.resource_type === "space");
    const channels = status.memberships.filter((membership) => membership.resource_type === "channel");

    const onContinue = async (): Promise<void> => {
        setBusy(true);
        setError(null);

        try {
            await completeNixorOnboarding();
            onFinished(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Could not save onboarding completion.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <BaseDialog
            className="mx_NixorOnboardingDialog"
            title="Welcome to Nixor Connect"
            hasCancel={canCancel}
            onFinished={() => onFinished(false)}
        >
            <div className="mx_NixorOnboardingDialog_content">
                <p>
                    Spaces organize Nixor communities and teams. Channels are the focused conversations inside those
                    spaces. Direct messages are for one-to-one or small private conversations.
                </p>
                <p>
                    Notifications help you keep up with announcements and work that needs your attention. Use Connect
                    with the same care expected in school and corporate spaces: be respectful, keep information in the
                    right channel, and report anything that looks out of place.
                </p>
                {status.sync_status !== "succeeded" && (
                    <p className="mx_NixorOnboardingDialog_notice">
                        Some access may still be syncing. Your assigned spaces will update automatically.
                    </p>
                )}
                <h3>Assigned spaces</h3>
                {spaces.length ? (
                    <ul>
                        {spaces.map((space) => (
                            <li key={space.resource_key}>
                                {space.display_name} <span>{space.status}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Your spaces are still being provisioned.</p>
                )}
                <h3>Assigned channels</h3>
                {channels.length ? (
                    <ul>
                        {channels.map((channel) => (
                            <li key={channel.resource_key}>
                                {channel.display_name} <span>{channel.status}</span>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Your channels are still being provisioned.</p>
                )}
                {error && <p className="mx_NixorOnboardingDialog_error">{error}</p>}
            </div>
            <DialogButtons
                primaryButton="Continue into Connect"
                hasCancel={canCancel}
                onCancel={() => onFinished(false)}
                disabled={busy}
                onPrimaryButtonClick={onContinue}
            />
        </BaseDialog>
    );
};

export default NixorOnboardingDialog;
