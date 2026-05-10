/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import SdkConfig from "./SdkConfig.ts";

const NIXOR_BRAND = "Nixor Connect";

/**
 * Returns whether the app is currently branded.
 * This is currently a naive check of whether the `brand` config starts with the substring `Nixor Connect ` or is the literal `Nixor Connect`,
 * which correctly covers `Nixor Connect` (release), `Nixor Connect Nightly` & `Nixor Connect Pro`.
 */
export const isElementBranded = (): boolean => {
    const brand = SdkConfig.get("brand");
    return brand === NIXOR_BRAND || brand.startsWith(NIXOR_BRAND + " ");
};
