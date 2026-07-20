/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React from "react";
import { render, screen } from "jest-matrix-react";
import { MatrixEvent } from "matrix-js-sdk/src/matrix";

import NixorSafeUnknownEvent from "../../../../../src/components/views/messages/NixorSafeUnknownEvent";

describe("NixorSafeUnknownEvent", () => {
    it("renders a bounded plain-text fallback without interpreting active markup", () => {
        const mxEvent = new MatrixEvent({
            type: "com.nixor.future.record.v99",
            content: {
                body: "<img src=x onerror=alert(1)> Future record",
                html: "<script>globalThis.compromised = true</script>",
                actions: [{ href: "javascript:alert(1)" }],
            },
        });

        const { container } = render(<NixorSafeUnknownEvent mxEvent={mxEvent} />);
        expect(screen.getByText("Unsupported Nixor record")).toBeInTheDocument();
        expect(screen.getByText("<img src=x onerror=alert(1)> Future record")).toBeInTheDocument();
        expect(container.querySelector("img")).toBeNull();
        expect(container.querySelector("script")).toBeNull();
        expect(container.querySelector("a")).toBeNull();
    });
});
