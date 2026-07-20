/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX } from "react";

import { type IBodyProps } from "./IBodyProps";

function safeFallback(content: Record<string, unknown>): string | null {
    for (const key of ["body", "title", "summary", "fallback"]) {
        const value = content[key];
        if (typeof value === "string" && value.trim()) return value.trim().slice(0, 1_000);
    }
    return null;
}

/**
 * Unknown Nixor event versions are deliberately inert: no HTML, URLs, media,
 * buttons, or arbitrary JSON are interpreted. React renders these strings as
 * text, allowing a newer sender to retain a useful fallback on older clients.
 */
const NixorSafeUnknownEvent = ({ mxEvent }: IBodyProps): JSX.Element => {
    const eventType = mxEvent.getType().slice(0, 255);
    const fallback = safeFallback(mxEvent.getContent());
    return (
        <div className="mx_NixorSafeUnknownEvent" role="note">
            <strong>Unsupported Nixor record</strong>
            <span>{eventType}</span>
            {fallback && <p>{fallback}</p>}
            <small>Update Nixor Connect to use this record. No embedded content was run.</small>
        </div>
    );
};

export default NixorSafeUnknownEvent;
