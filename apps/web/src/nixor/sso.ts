/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

const DEFAULT_CONNECT_API_BASE_URL = "https://connect-api.nixorcorporate.com";
const NIXOR_SSO_ERROR_KEY = "nixor_sso_error";

interface NixorSsoConfig {
    connect_api_base_url?: unknown;
    governance_api_base_url?: unknown;
    google_sso_enabled?: unknown;
}

function getNixorConfig(): NixorSsoConfig | undefined {
    const config = window.mxReactSdkConfig?.nixor;
    return config && typeof config === "object" ? config : undefined;
}

function trimTrailingSlash(url: string): string {
    return url.replace(/\/+$/, "");
}

function getConfiguredBaseUrl(url: unknown): string | undefined {
    return typeof url === "string" && url.trim() ? trimTrailingSlash(url.trim()) : undefined;
}

export function getNixorConnectApiBaseUrl(): string {
    const nixorConfig = getNixorConfig();
    return (
        getConfiguredBaseUrl(nixorConfig?.connect_api_base_url) ??
        getConfiguredBaseUrl(nixorConfig?.governance_api_base_url) ??
        DEFAULT_CONNECT_API_BASE_URL
    );
}

export function isNixorGoogleSsoEnabled(): boolean {
    return getNixorConfig()?.google_sso_enabled !== false;
}

export function clearStoredNixorSsoError(): void {
    sessionStorage.removeItem(NIXOR_SSO_ERROR_KEY);
}

export function storeNixorSsoError(error: string): void {
    sessionStorage.setItem(NIXOR_SSO_ERROR_KEY, error);
}

function getStoredNixorSsoError(): string | null {
    return sessionStorage.getItem(NIXOR_SSO_ERROR_KEY);
}

export function getNixorSsoErrorMessage(error: string | null | undefined): string | null {
    if (!error) {
        return null;
    }

    if (error === "not_allowed") {
        return "Your Google account is not approved for Nixor Connect access.";
    }

    if (error === "unverified_email") {
        return "Google did not return a verified email address.";
    }

    if (error === "invalid_state") {
        return "The Google sign-in session expired. Please try again.";
    }

    if (error === "entitlement_sync_failed") {
        return "Your Nixor Connect access exists, but your Matrix memberships could not be synced. Please contact support.";
    }

    return "Google sign-in failed. Please try again.";
}

export function getNixorSsoErrorText(): string | null {
    const queryError = new URLSearchParams(window.location.search).get(NIXOR_SSO_ERROR_KEY);
    return getNixorSsoErrorMessage(queryError || getStoredNixorSsoError());
}
