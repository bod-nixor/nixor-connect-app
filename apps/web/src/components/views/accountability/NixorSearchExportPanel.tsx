/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import {
    createGovernanceExport,
    type GovernanceSearchResult,
    hasNixorCapability,
    type NixorIdentity,
    searchGovernanceRecords,
} from "../../../nixor/accountabilityApi";
import { type NixorPrimaryView, openNixorPrimaryView } from "../../../nixor/accountabilityNavigation";

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function resultDestination(result: GovernanceSearchResult): NixorPrimaryView {
    switch (result.object_type) {
        case "formal_notice":
        case "action_item":
            return "accountability";
        case "decision":
            return "decisions";
        case "case":
            return "cases";
        case "report":
            return "reports";
    }
}

const EXPORT_CAPABILITIES = {
    formal_notice: "notice.export",
    decision: "decision.export",
    case: "case.export",
    evidence: "evidence.export",
    audit: "audit.export",
} as const;

const NixorSearchExportPanel: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [results, setResults] = useState<GovernanceSearchResult[]>([]);
    const [searched, setSearched] = useState(false);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const availableExports = Object.entries(EXPORT_CAPABILITIES).filter(([, capability]) =>
        hasNixorCapability(identity, capability),
    ) as Array<[keyof typeof EXPORT_CAPABILITIES, string]>;
    const search = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setBusy("search"); setError(null); setMessage(null);
        try {
            setResults(await searchGovernanceRecords(formValue(new FormData(event.currentTarget), "query")));
            setSearched(true);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Search was not completed.");
        } finally {
            setBusy(null);
        }
    };
    const exportRecord = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const form = new FormData(event.currentTarget);
        setBusy("export"); setError(null); setMessage(null);
        try {
            const result = await createGovernanceExport({
                object_type: formValue(form, "object_type") as keyof typeof EXPORT_CAPABILITIES,
                object_public_id: formValue(form, "object_public_id"),
                format: formValue(form, "format") as "html" | "pdf" | "csv" | "json",
                purpose: formValue(form, "purpose"),
            });
            const url = URL.createObjectURL(result.blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = result.filename;
            link.rel = "noopener";
            link.click();
            URL.revokeObjectURL(url);
            setMessage("Authorized export created, watermarked where sensitive, and recorded in the audit ledger.");
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Export was not created.");
        } finally {
            setBusy(null);
        }
    };
    return (
        <section aria-labelledby="nixor-search-heading">
            <h2 id="nixor-search-heading">Authorized governance search</h2>
            <p>Search returns only records already visible to you. It does not search ordinary private message history.</p>
            <form className="mx_NixorWorkspace_search" onSubmit={(event) => void search(event)}>
                <label>Search notices, actions, decisions, cases, and your reports<input name="query" minLength={2} maxLength={200} required /></label>
                <button type="submit" disabled={busy !== null}>{busy === "search" ? "Searching…" : "Search"}</button>
            </form>
            {searched && !results.length && <p>No authorized records matched.</p>}
            {results.length > 0 && <div className="mx_NixorWorkspace_cards">{results.map((result) => <article className="mx_NixorWorkspace_card" key={`${result.object_type}:${result.public_id}`}><div className="mx_NixorWorkspace_cardHeader"><h3>{result.title}</h3><span>{result.object_type.replaceAll("_", " ")}</span></div><p>{result.snippet}</p><AccessibleButton onClick={() => openNixorPrimaryView(resultDestination(result))}>Open {result.object_type.replaceAll("_", " ")} view</AccessibleButton></article>)}</div>}
            {availableExports.length > 0 && <details><summary>Create authorized export</summary><form onSubmit={(event) => void exportRecord(event)}><label>Object type<select name="object_type">{availableExports.map(([type]) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label><label>Object public ID (use “ledger” for audit)<input name="object_public_id" minLength={1} maxLength={255} required /></label><label>Format<select name="format"><option value="pdf">PDF</option><option value="html">HTML</option><option value="csv">CSV</option><option value="json">JSON</option></select></label><label>Work purpose<textarea name="purpose" minLength={5} maxLength={2000} required /></label><button type="submit" disabled={busy !== null}>Create audited export</button></form></details>}
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
        </section>
    );
};

export default NixorSearchExportPanel;
