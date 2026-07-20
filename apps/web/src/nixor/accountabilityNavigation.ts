/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import { useSyncExternalStore } from "react";

import defaultDispatcher from "../dispatcher/dispatcher";
import { Action } from "../dispatcher/actions";
import SpaceStore from "../stores/spaces/SpaceStore";
import { MetaSpace } from "../stores/spaces";

export type NixorPrimaryView =
    | "home"
    | "direct_messages"
    | "servers"
    | "accountability"
    | "decisions"
    | "reports"
    | "cases"
    | "bots"
    | "notifications"
    | "admin";

const STORAGE_KEY = "nixor_connect_primary_view";
const listeners = new Set<() => void>();
const validViews = new Set<NixorPrimaryView>([
    "home",
    "direct_messages",
    "servers",
    "accountability",
    "decisions",
    "reports",
    "cases",
    "bots",
    "notifications",
    "admin",
]);

function initialView(): NixorPrimaryView {
    const path = window.location.pathname;
    const requested = new URLSearchParams(window.location.search).get("nixor_view") as NixorPrimaryView | null;
    if (requested && validViews.has(requested)) return requested;
    if (path.startsWith("/direct-messages/")) return "direct_messages";
    if (path.startsWith("/formal-notices/") || path.startsWith("/action-items/")) return "accountability";
    if (path.startsWith("/decisions/")) return "decisions";
    if (path.startsWith("/reports/")) return "reports";
    if (path.startsWith("/cases/")) return "cases";
    if (path.startsWith("/bots/")) return "bots";
    const stored = window.sessionStorage.getItem(STORAGE_KEY) as NixorPrimaryView | null;
    return stored && validViews.has(stored) ? stored : "home";
}

let currentView: NixorPrimaryView = initialView();

function emit(): void {
    for (const listener of listeners) listener();
}

export function getNixorPrimaryView(): NixorPrimaryView {
    return currentView;
}

export function setNixorPrimaryView(view: NixorPrimaryView): void {
    if (currentView === view) return;
    currentView = view;
    window.sessionStorage.setItem(STORAGE_KEY, view);
    emit();
}

export function openNixorPrimaryView(view: NixorPrimaryView): void {
    setNixorPrimaryView(view);
    SpaceStore.instance.setActiveSpace(MetaSpace.Home);
    defaultDispatcher.dispatch({ action: Action.ViewHomePage });
}

export function openNixorDirectMessages(): void {
    setNixorPrimaryView("direct_messages");
    SpaceStore.instance.setActiveSpace(MetaSpace.People);
}

export function openNixorMatrixRoom(roomId: string): void {
    setNixorPrimaryView("direct_messages");
    SpaceStore.instance.setActiveSpace(MetaSpace.People);
    defaultDispatcher.dispatch({ action: Action.ViewRoom, room_id: roomId });
}

export function openNixorSettings(): void {
    defaultDispatcher.dispatch({ action: Action.ViewUserSettings });
}

export function subscribeNixorPrimaryView(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

export function useNixorPrimaryView(): NixorPrimaryView {
    return useSyncExternalStore(subscribeNixorPrimaryView, getNixorPrimaryView, () => "home");
}
