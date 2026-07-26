/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
*/

import { logger } from "matrix-js-sdk/src/logger";

/**
 * Hard startup requirements. Native-shell support never bypasses this check.
 */
export function hasRequiredBrowserFeatures(windowObject: Window): boolean {
    if (!windowObject.Modernizr) {
        logger.error("Cannot check features - Modernizr global is missing.");
        return false;
    }

    windowObject.Modernizr.addTest("promiseprototypefinally", () => typeof windowObject.Promise?.prototype?.finally === "function");
    windowObject.Modernizr.addTest("promiseallsettled", () => typeof windowObject.Promise?.allSettled === "function");
    windowObject.Modernizr.addTest("promisewithresolvers", () => typeof windowObject.Promise?.withResolvers === "function");
    windowObject.Modernizr.addTest(
        "regexpdotall",
        () => windowObject.RegExp?.prototype && !!Object.getOwnPropertyDescriptor(windowObject.RegExp.prototype, "dotAll")?.get,
    );
    windowObject.Modernizr.addTest("objectfromentries", () => typeof windowObject.Object?.fromEntries === "function");
    windowObject.Modernizr.addTest("intlsegmenter", () => typeof windowObject.Intl?.Segmenter === "function");
    windowObject.Modernizr.addTest("wasm", () => typeof WebAssembly === "object" && typeof WebAssembly.Module === "function");
    windowObject.Modernizr.addTest("securecontext", () => windowObject.isSecureContext);

    let complete = true;
    for (const feature of Object.keys(windowObject.Modernizr) as Array<keyof ModernizrStatic>) {
        if (windowObject.Modernizr[feature] === undefined) {
            logger.error(
                "Looked for feature '%s' but Modernizr has no results for this. " + "Has it been configured correctly?",
                feature,
            );
            return false;
        }
        if (windowObject.Modernizr[feature] === false) {
            logger.error("Browser missing feature: '%s'", feature);
            complete = false;
        }
    }
    return complete;
}
