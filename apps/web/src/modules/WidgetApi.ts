/*
Copyright 2026 Element Creations Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { type Container, type WidgetApi as WidgetApiInterface } from "@element-hq/element-web-module-api";
import { getHttpUriForMxc } from "matrix-js-sdk/src/matrix";

import type { IWidget } from "matrix-widget-api";
import type WidgetStoreType from "../stores/WidgetStore";
import type { IApp } from "../stores/WidgetStore";
import type { MatrixClientPeg as MatrixClientPegType } from "../MatrixClientPeg";
import type { WidgetLayoutStore as WidgetLayoutStoreType } from "../stores/widgets/WidgetLayoutStore";

function getWidgetStore(): typeof WidgetStoreType {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../stores/WidgetStore").default;
}

function isAppWidget(widget: IWidget): widget is IApp {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../stores/WidgetStore").isAppWidget(widget);
}

function getMatrixClientPeg(): typeof MatrixClientPegType {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../MatrixClientPeg").MatrixClientPeg;
}

function getWidgetLayoutStore(): typeof WidgetLayoutStoreType {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("../stores/widgets/WidgetLayoutStore").WidgetLayoutStore;
}

/**
 * Host-side implementation of the widget API.
 * Allows modules to interact with widgets, including listing widgets in rooms.
 */
export class WidgetApi implements WidgetApiInterface {
    public getWidgetsInRoom(roomId: string): IWidget[] {
        return getWidgetStore().instance.getApps(roomId);
    }

    public getAppAvatarUrl(app: IWidget, width?: number, height?: number, resizeMethod?: string): string | null {
        if (!isAppWidget(app) || !app.avatar_url) return null;
        return getHttpUriForMxc(
            getMatrixClientPeg().safeGet().getHomeserverUrl(),
            app.avatar_url,
            width,
            height,
            resizeMethod,
        );
    }

    public isAppInContainer(app: IWidget, container: Container, roomId: string): boolean {
        const room = getMatrixClientPeg().safeGet().getRoom(roomId);
        if (!room) return false;
        return getWidgetLayoutStore().instance.isInContainer(room, app, container);
    }

    public moveAppToContainer(app: IWidget, container: Container, roomId: string): void {
        const room = getMatrixClientPeg().safeGet().getRoom(roomId);
        if (!room) return;
        getWidgetLayoutStore().instance.moveToContainer(room, app, container);
    }
}
