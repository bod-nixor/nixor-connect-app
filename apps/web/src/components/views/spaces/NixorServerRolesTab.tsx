/*
Copyright 2026 New Vector Ltd.

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type ChangeEvent, type FormEvent, useCallback, useEffect, useState } from "react";
import { type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";

import { _t } from "../../../languageHandler";
import {
    addServerAdmin,
    addServerModerator,
    getServerAdmins,
    getServerBySpaceId,
    getServerModerators,
    type NixorServer,
    removeServerAdmin,
    removeServerModerator,
} from "../../../nixor/panapticonApi";
import { refreshNixorPermissions } from "../../../nixor/permissions";
import AccessibleButton from "../elements/AccessibleButton";
import Field from "../elements/Field";
import SettingsTab from "../settings/tabs/SettingsTab";
import { SettingsSection } from "../settings/shared/SettingsSection";
import { SettingsSubsection } from "../settings/shared/SettingsSubsection";

interface IProps {
    matrixClient: MatrixClient;
    space: Room;
}

interface RoleListProps {
    users: string[];
    disabled: boolean;
    onRemove(userId: string): void;
}

const RoleList: React.FC<RoleListProps> = ({ users, disabled, onRemove }) => {
    if (users.length === 0) {
        return <div className="mx_NixorServerRolesTab_empty">{_t("nixor|server_roles|none")}</div>;
    }

    return (
        <ul className="mx_NixorServerRolesTab_list">
            {users.map((userId) => (
                <li className="mx_NixorServerRolesTab_row" key={userId}>
                    <span className="mx_NixorServerRolesTab_userId">{userId}</span>
                    <AccessibleButton kind="danger_outline" disabled={disabled} onClick={() => onRemove(userId)}>
                        {_t("action|remove")}
                    </AccessibleButton>
                </li>
            ))}
        </ul>
    );
};

const NixorServerRolesTab: React.FC<IProps> = ({ matrixClient, space }) => {
    const [server, setServer] = useState<NixorServer | null>(null);
    const [serverAdmins, setServerAdmins] = useState<string[]>([]);
    const [serverModerators, setServerModerators] = useState<string[]>([]);
    const [adminInput, setAdminInput] = useState("");
    const [moderatorInput, setModeratorInput] = useState("");
    const [busy, setBusy] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const requesterMatrixUserId = matrixClient.getUserId();

    const loadRoles = useCallback(async () => {
        setLoading(true);
        setError("");

        try {
            const loadedServer = await getServerBySpaceId(space.roomId);
            const [loadedAdmins, loadedModerators] = await Promise.all([
                getServerAdmins(loadedServer.public_id),
                getServerModerators(loadedServer.public_id),
            ]);

            setServer(loadedServer);
            setServerAdmins(loadedAdmins);
            setServerModerators(loadedModerators);
        } catch (e) {
            setError(e instanceof Error ? e.message : _t("nixor|server_roles|load_error"));
        } finally {
            setLoading(false);
        }
    }, [space.roomId]);

    useEffect(() => {
        void loadRoles();
    }, [loadRoles]);

    const withRoleChange = async (fn: () => Promise<void>): Promise<void> => {
        if (!requesterMatrixUserId || !server || busy) return;

        setBusy(true);
        setError("");

        try {
            await fn();
            await refreshNixorPermissions(true);
        } catch (e) {
            setError(e instanceof Error ? e.message : _t("nixor|server_roles|save_error"));
        } finally {
            setBusy(false);
        }
    };

    const onAddAdmin = async (ev: FormEvent): Promise<void> => {
        ev.preventDefault();
        const targetUserId = adminInput.trim();
        if (!server || !requesterMatrixUserId || !targetUserId) return;

        await withRoleChange(async () => {
            const response = await addServerAdmin(server.public_id, {
                requester_matrix_user_id: requesterMatrixUserId,
                admin_matrix_user_id: targetUserId,
            });
            setServerAdmins(response.server_admins);
            if (response.server) setServer(response.server);
            setAdminInput("");
        });
    };

    const onRemoveAdmin = (targetUserId: string): void => {
        void withRoleChange(async () => {
            if (!server || !requesterMatrixUserId) return;
            const response = await removeServerAdmin(server.public_id, requesterMatrixUserId, targetUserId);
            setServerAdmins(response.server_admins);
            if (response.server) setServer(response.server);
        });
    };

    const onAddModerator = async (ev: FormEvent): Promise<void> => {
        ev.preventDefault();
        const targetUserId = moderatorInput.trim();
        if (!server || !requesterMatrixUserId || !targetUserId) return;

        await withRoleChange(async () => {
            const response = await addServerModerator(server.public_id, {
                requester_matrix_user_id: requesterMatrixUserId,
                moderator_matrix_user_id: targetUserId,
            });
            setServerModerators(response.server_moderators);
            if (response.server) setServer(response.server);
            setModeratorInput("");
        });
    };

    const onRemoveModerator = (targetUserId: string): void => {
        void withRoleChange(async () => {
            if (!server || !requesterMatrixUserId) return;
            const response = await removeServerModerator(server.public_id, requesterMatrixUserId, targetUserId);
            setServerModerators(response.server_moderators);
            if (response.server) setServer(response.server);
        });
    };

    return (
        <SettingsTab className="mx_NixorServerRolesTab">
            <SettingsSection heading={_t("nixor|server_roles|title")}>
                {error && <div className="mx_SpaceSettings_errorText">{error}</div>}
                {loading ? (
                    <div>{_t("common|loading")}</div>
                ) : (
                    <>
                        <SettingsSubsection heading={_t("nixor|server_roles|admins")}>
                            <RoleList users={serverAdmins} disabled={busy} onRemove={onRemoveAdmin} />
                            <form className="mx_NixorServerRolesTab_form" onSubmit={onAddAdmin}>
                                <Field
                                    name="nixorServerAdmin"
                                    label={_t("nixor|server_roles|matrix_user_id")}
                                    value={adminInput}
                                    onChange={(ev: ChangeEvent<HTMLInputElement>) => setAdminInput(ev.target.value)}
                                    disabled={busy}
                                    autoComplete="off"
                                />
                                <AccessibleButton
                                    element="button"
                                    kind="primary"
                                    type="submit"
                                    disabled={busy || !adminInput.trim()}
                                    onClick={null}
                                >
                                    {_t("action|add")}
                                </AccessibleButton>
                            </form>
                        </SettingsSubsection>
                        <SettingsSubsection heading={_t("nixor|server_roles|moderators")}>
                            <RoleList users={serverModerators} disabled={busy} onRemove={onRemoveModerator} />
                            <form className="mx_NixorServerRolesTab_form" onSubmit={onAddModerator}>
                                <Field
                                    name="nixorServerModerator"
                                    label={_t("nixor|server_roles|matrix_user_id")}
                                    value={moderatorInput}
                                    onChange={(ev: ChangeEvent<HTMLInputElement>) => setModeratorInput(ev.target.value)}
                                    disabled={busy}
                                    autoComplete="off"
                                />
                                <AccessibleButton
                                    element="button"
                                    kind="primary"
                                    type="submit"
                                    disabled={busy || !moderatorInput.trim()}
                                    onClick={null}
                                >
                                    {_t("action|add")}
                                </AccessibleButton>
                            </form>
                        </SettingsSubsection>
                    </>
                )}
            </SettingsSection>
        </SettingsTab>
    );
};

export default NixorServerRolesTab;
