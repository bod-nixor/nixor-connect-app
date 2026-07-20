/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type JSX, useEffect, useMemo, useState } from "react";
import {
    ChatSolidIcon,
    FavouriteSolidIcon,
    NotificationsSolidIcon,
    SearchIcon,
    VerifiedIcon,
} from "@vector-im/compound-design-tokens/assets/web/icons";

import AccessibleButton from "../elements/AccessibleButton";
import dis from "../../../dispatcher/dispatcher";
import { Action } from "../../../dispatcher/actions";
import { listNixorBots, type NixorBotSummary, openNixorBot, updateNixorBotPreferences } from "../../../nixor/bots";

const NixorBotDirectory: React.FC = () => {
    const [bots, setBots] = useState<NixorBotSummary[]>([]);
    const [query, setQuery] = useState("");
    const [category, setCategory] = useState("all");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [opening, setOpening] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        listNixorBots()
            .then((nextBots) => {
                if (!cancelled) {
                    setBots(nextBots);
                    setError(null);
                }
            })
            .catch((err) => {
                if (!cancelled) setError(err instanceof Error ? err.message : "Could not load bots.");
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const categories = useMemo(() => {
        const values = Array.from(new Set(bots.map((bot) => bot.category).filter(Boolean) as string[])).sort((a, b) =>
            a.localeCompare(b),
        );
        return ["all", ...values];
    }, [bots]);

    const filtered = useMemo(() => {
        const normalized = query.trim().toLowerCase();
        return bots.filter((bot) => {
            if (category !== "all" && bot.category !== category) return false;
            if (!normalized) return true;
            return [bot.name, bot.short_description, bot.category]
                .filter(Boolean)
                .some((value) => value!.toLowerCase().includes(normalized));
        });
    }, [bots, category, query]);

    const onOpen = async (bot: NixorBotSummary): Promise<void> => {
        setOpening(bot.app_id);
        try {
            const opened = await openNixorBot(bot.app_id);
            dis.dispatch({ action: Action.ViewRoom, room_id: opened.room_id });
        } finally {
            setOpening(null);
        }
    };

    const onFavourite = async (bot: NixorBotSummary): Promise<void> => {
        const favourited = !bot.favourited;
        setBots((current) => current.map((item) => (item.app_id === bot.app_id ? { ...item, favourited } : item)));
        await updateNixorBotPreferences(bot.app_id, { favourited });
    };

    const onNotifications = async (bot: NixorBotSummary): Promise<void> => {
        const notificationsEnabled = bot.notifications_enabled === false;
        setBots((current) =>
            current.map((item) =>
                item.app_id === bot.app_id ? { ...item, notifications_enabled: notificationsEnabled } : item,
            ),
        );
        await updateNixorBotPreferences(bot.app_id, { notifications_enabled: notificationsEnabled });
    };

    let content: JSX.Element;
    if (loading) {
        content = <div className="mx_NixorBotDirectory_state">Loading bots...</div>;
    } else if (error) {
        content = (
            <div className="mx_NixorBotDirectory_state mx_NixorBotDirectory_error">
                <span>{error}</span>
                <AccessibleButton onClick={() => window.location.reload()}>Retry</AccessibleButton>
            </div>
        );
    } else if (filtered.length === 0) {
        content = <div className="mx_NixorBotDirectory_state">No bots match your search.</div>;
    } else {
        content = (
            <div className="mx_NixorBotDirectory_grid">
                {filtered.map((bot) => (
                    <article className="mx_NixorBotDirectory_card" key={bot.app_id}>
                        <div className="mx_NixorBotDirectory_cardHeader">
                            <div className="mx_NixorBotDirectory_icon" aria-hidden>
                                {bot.icon ? <img src={bot.icon} alt="" /> : <ChatSolidIcon />}
                            </div>
                            <div>
                                <h3>
                                    {bot.name}
                                    {bot.verified && <VerifiedIcon />}
                                </h3>
                                <p>{bot.short_description || "Ready when you are."}</p>
                            </div>
                        </div>
                        <div className="mx_NixorBotDirectory_commands">
                            {(bot.commands ?? []).slice(0, 3).map((command) => (
                                <span key={command.id}>{command.label}</span>
                            ))}
                        </div>
                        <div className="mx_NixorBotDirectory_actions">
                            <AccessibleButton
                                className="mx_NixorBotDirectory_iconButton"
                                title={bot.favourited ? "Remove favourite" : "Favourite"}
                                onClick={() => void onFavourite(bot)}
                            >
                                <FavouriteSolidIcon />
                            </AccessibleButton>
                            <AccessibleButton
                                className="mx_NixorBotDirectory_iconButton"
                                title={
                                    bot.notifications_enabled === false ? "Enable notifications" : "Mute notifications"
                                }
                                onClick={() => void onNotifications(bot)}
                            >
                                <NotificationsSolidIcon />
                            </AccessibleButton>
                            <AccessibleButton
                                className="mx_NixorBotDirectory_open"
                                disabled={opening === bot.app_id}
                                onClick={() => void onOpen(bot)}
                            >
                                {bot.has_dm ? "Open chat" : "Start chat"}
                            </AccessibleButton>
                        </div>
                    </article>
                ))}
            </div>
        );
    }

    return (
        <section className="mx_NixorBotDirectory" aria-label="Bots">
            <div className="mx_NixorBotDirectory_header">
                <div>
                    <h2>Bots</h2>
                    <p>Find campus services and run tasks from chat.</p>
                </div>
                <label className="mx_NixorBotDirectory_search">
                    <SearchIcon />
                    <input value={query} onChange={(ev) => setQuery(ev.target.value)} placeholder="Search bots" />
                </label>
            </div>
            <div className="mx_NixorBotDirectory_categories" role="tablist" aria-label="Bot categories">
                {categories.map((item) => (
                    <AccessibleButton
                        key={item}
                        className={
                            category === item
                                ? "mx_NixorBotDirectory_category mx_NixorBotDirectory_categoryActive"
                                : "mx_NixorBotDirectory_category"
                        }
                        onClick={() => setCategory(item)}
                    >
                        {item === "all" ? "All" : item}
                    </AccessibleButton>
                ))}
            </div>
            {content}
        </section>
    );
};

export default NixorBotDirectory;
