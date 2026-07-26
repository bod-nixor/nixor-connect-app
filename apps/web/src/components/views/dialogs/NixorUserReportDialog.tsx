/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useState } from "react";

import BaseDialog from "./BaseDialog";
import AccessibleButton from "../elements/AccessibleButton";
import { createReport } from "../../../nixor/accountabilityApi";

interface IProps {
    userId: string;
    displayName: string;
    onFinished: (created?: boolean) => void;
}

function formValue(form: FormData, name: string, fallback = ""): string {
    const value = form.get(name);
    return typeof value === "string" ? value : fallback;
}

const NixorUserReportDialog: React.FC<IProps> = ({ userId, displayName, onFinished }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [created, setCreated] = useState(false);

    const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        const explanation = formValue(form, "description").trim();
        setBusy(true);
        setError(null);
        try {
            await createReport({
                category: formValue(form, "category", "harassment"),
                description: explanation || "No additional explanation was provided.",
                subjects: [{ type: "user", public_id: userId, display_label: displayName }],
                targets: [{ type: "user", public_id: userId }],
            });
            setCreated(true);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "The report could not be submitted.");
        } finally {
            setBusy(false);
        }
    };

    return (
        <BaseDialog title="Report user" onFinished={() => onFinished(created)} hasCancel>
            {!created ? (
                <form className="mx_NixorMessageGovernanceDialog_form" onSubmit={(event) => void submit(event)}>
                    <p>
                        <strong>User</strong>
                        <br />
                        {displayName}
                    </p>
                    <label>
                        Category
                        <select name="category" defaultValue="harassment">
                            <option value="harassment">Harassment or bullying</option>
                            <option value="impersonation">Impersonation</option>
                            <option value="threat_or_safety">Threat or safety concern</option>
                            <option value="spam">Spam</option>
                            <option value="other">Other</option>
                        </select>
                    </label>
                    <label>
                        Explanation (optional)
                        <textarea
                            name="description"
                            maxLength={50000}
                            placeholder="Add any context that would help the reviewer."
                        />
                    </label>
                    {error && (
                        <p className="mx_NixorWorkspace_error" role="alert">
                            {error}
                        </p>
                    )}
                    <div className="mx_NixorMessageGovernanceDialog_actions">
                        <button type="button" onClick={() => onFinished(false)}>
                            Cancel
                        </button>
                        <button type="submit" disabled={busy}>
                            {busy ? "Submitting…" : "Submit report"}
                        </button>
                    </div>
                </form>
            ) : (
                <div className="mx_NixorWorkspace_success" role="status">
                    <p>Thanks. Your report has been submitted for review.</p>
                    <AccessibleButton onClick={() => onFinished(true)}>Done</AccessibleButton>
                </div>
            )}
        </BaseDialog>
    );
};

export default NixorUserReportDialog;
