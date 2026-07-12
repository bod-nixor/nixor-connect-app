/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { useEffect, useState } from "react";

import { getNixorBotCommands, NixorBotCommand, NixorBotDmMarker } from "../../../nixor/bots";

const NixorBotEmptyState: React.FC<{ marker: NixorBotDmMarker; roomName: string }> = ({ marker, roomName }) => {
    const [commands, setCommands] = useState<NixorBotCommand[]>([]);

    useEffect(() => {
        let cancelled = false;
        getNixorBotCommands(marker.app_id)
            .then((manifest) => {
                if (!cancelled) setCommands(manifest.commands.filter((command) => command.enabled).slice(0, 4));
            })
            .catch(() => {
                if (!cancelled) setCommands([]);
            });
        return () => {
            cancelled = true;
        };
    }, [marker.app_id]);

    return (
        <li className="mx_NixorBotEmptyState">
            <h2>{roomName}</h2>
            <p>Start with a command or send a message.</p>
            {commands.length > 0 && (
                <div className="mx_NixorBotDirectory_commands">
                    {commands.map((command) => <span key={command.id}>{command.label}</span>)}
                </div>
            )}
        </li>
    );
};

export default NixorBotEmptyState;
