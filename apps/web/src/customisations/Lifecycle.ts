/*
Copyright 2024 New Vector Ltd.
Copyright 2020 The Matrix.org Foundation C.I.C.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import type { LifecycleCustomisations } from "@element-hq/element-web-module-api";
import SdkConfig from "../SdkConfig";
import { clearNixorApiSession } from "../nixor/accountabilityApi";
import { resetNixorConnectSessionBootstrap } from "../nixor/connectSession";
import { clearNixorPermissionsCache } from "../nixor/permissions";
import { getNixorConnectApiBaseUrl } from "../nixor/sso";

const lifecycleCustomisations: LifecycleCustomisations = {
    onLoggedOutAndStorageCleared: () => {
        clearNixorApiSession();
        clearNixorPermissionsCache();
        resetNixorConnectSessionBootstrap();

        const nixorConfig = SdkConfig.get()?.nixor as
            | {
                  governance_enabled?: boolean;
                  google_sso_enabled?: boolean;
              }
            | undefined;
        if (!nixorConfig?.governance_enabled && !nixorConfig?.google_sso_enabled) return;

        void fetch(`${getNixorConnectApiBaseUrl()}/auth/logout`, {
            method: "POST",
            credentials: "include",
        }).catch(() => undefined);
    },
};

export default lifecycleCustomisations;
