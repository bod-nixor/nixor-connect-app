/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect, useMemo, useState } from "react";
import { ChatSolidIcon } from "@vector-im/compound-design-tokens/assets/web/icons";
import { type MatrixClient, type Room } from "matrix-js-sdk/src/matrix";

import AccessibleButton from "../elements/AccessibleButton";
import {
    getNixorBotCommands,
    type NixorBotCommand,
    type NixorBotDmMarker,
    type NixorBotField,
    sendNixorBotCommand,
} from "../../../nixor/bots";

interface IProps {
    client: MatrixClient;
    room: Room;
    marker: NixorBotDmMarker;
}

function initialValue(field: NixorBotField): unknown {
    if (field.default !== undefined) return field.default;
    if (field.type === "boolean") return false;
    if (field.type === "multiselect") return [];
    return "";
}

function stringInputValue(value: unknown): string {
    if (typeof value === "string" || typeof value === "number") {
        return String(value);
    }
    return "";
}

function renderField(field: NixorBotField, value: unknown, onChange: (value: unknown) => void): JSX.Element {
    if (field.type === "textarea") {
        return (
            <textarea
                value={stringInputValue(value)}
                placeholder={field.placeholder}
                onChange={(ev) => onChange(ev.target.value)}
            />
        );
    }
    if (field.type === "select") {
        return (
            <select value={stringInputValue(value)} onChange={(ev) => onChange(ev.target.value)}>
                <option value="">Select</option>
                {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }
    if (field.type === "multiselect") {
        const selected = Array.isArray(value) ? value.map(String) : [];
        return (
            <select
                multiple
                value={selected}
                onChange={(ev) => onChange(Array.from(ev.target.selectedOptions).map((option) => option.value))}
            >
                {(field.options ?? []).map((option) => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        );
    }
    if (field.type === "boolean") {
        return <input type="checkbox" checked={value === true} onChange={(ev) => onChange(ev.target.checked)} />;
    }
    return (
        <input
            type={field.type === "number" ? "number" : field.type}
            value={stringInputValue(value)}
            min={field.min}
            max={field.max}
            minLength={field.min_length}
            maxLength={field.max_length}
            placeholder={field.placeholder}
            onChange={(ev) => onChange(field.type === "number" ? Number(ev.target.value) : ev.target.value)}
        />
    );
}

const NixorBotCommandLauncher: React.FC<IProps> = ({ client, room, marker }) => {
    const [commands, setCommands] = useState<NixorBotCommand[]>([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<NixorBotCommand | null>(null);
    const [values, setValues] = useState<Record<string, unknown>>({});
    const [error, setError] = useState<string | null>(null);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        let cancelled = false;
        getNixorBotCommands(marker.app_id)
            .then((manifest) => {
                if (!cancelled) setCommands(manifest.commands.filter((command) => command.enabled));
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Could not load commands.");
            });
        return () => {
            cancelled = true;
        };
    }, [marker.app_id]);

    const valid = useMemo(() => {
        if (!selected) return false;
        return selected.fields.every((field) => {
            const value = values[field.id];
            return (
                !field.required ||
                (value !== undefined && value !== null && value !== "" && (!Array.isArray(value) || value.length > 0))
            );
        });
    }, [selected, values]);

    const chooseCommand = (command: NixorBotCommand): void => {
        setSelected(command);
        setValues(Object.fromEntries(command.fields.map((field) => [field.id, initialValue(field)])));
        setError(null);
    };

    const submit = async (): Promise<void> => {
        if (!selected || !valid) return;
        setSending(true);
        setError(null);
        try {
            await sendNixorBotCommand({ client, room, marker, command: selected, parameters: values });
            setSelected(null);
            setOpen(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not run command.");
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="mx_NixorBotCommandLauncher">
            <AccessibleButton
                className="mx_NixorBotCommandLauncher_button"
                onClick={() => setOpen(!open)}
                title="Commands"
            >
                <ChatSolidIcon />
                <span>Commands</span>
            </AccessibleButton>
            {open && (
                <div className="mx_NixorBotCommandLauncher_panel">
                    {!selected && (
                        <div className="mx_NixorBotCommandLauncher_list">
                            {commands.length === 0 && <p>No commands available.</p>}
                            {commands.map((command) => (
                                <AccessibleButton
                                    key={command.id}
                                    className="mx_NixorBotCommandLauncher_command"
                                    onClick={() => chooseCommand(command)}
                                >
                                    <strong>{command.label}</strong>
                                    {command.description && <span>{command.description}</span>}
                                </AccessibleButton>
                            ))}
                        </div>
                    )}
                    {selected && (
                        <form
                            className="mx_NixorBotCommandLauncher_form"
                            onSubmit={(ev) => {
                                ev.preventDefault();
                                void submit();
                            }}
                        >
                            <h3>{selected.label}</h3>
                            {selected.fields.map((field) => (
                                <label key={field.id}>
                                    <span>
                                        {field.label}
                                        {field.required ? " *" : ""}
                                    </span>
                                    {renderField(field, values[field.id], (value) =>
                                        setValues((current) => ({ ...current, [field.id]: value })),
                                    )}
                                    {field.help_text && <em>{field.help_text}</em>}
                                </label>
                            ))}
                            {selected.confirmation && (
                                <p className="mx_NixorBotCommandLauncher_confirm">Review before sending.</p>
                            )}
                            {error && <p className="mx_NixorBotCommandLauncher_error">{error}</p>}
                            <div className="mx_NixorBotCommandLauncher_actions">
                                <AccessibleButton onClick={() => setSelected(null)}>Back</AccessibleButton>
                                <button type="submit" disabled={!valid || sending}>
                                    {sending ? "Sending..." : "Run"}
                                </button>
                            </div>
                        </form>
                    )}
                    {!selected && error && <p className="mx_NixorBotCommandLauncher_error">{error}</p>}
                </div>
            )}
        </div>
    );
};

export default NixorBotCommandLauncher;
