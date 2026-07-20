/*
Copyright 2026 Nixor

SPDX-License-Identifier: AGPL-3.0-only OR GPL-3.0-only OR LicenseRef-Element-Commercial
Please see LICENSE files in the repository root for full details.
*/

import React, { type FormEvent, useCallback, useEffect, useRef, useState } from "react";

import AccessibleButton from "../elements/AccessibleButton";
import Spinner from "../elements/Spinner";
import {
    acceptContactRequest,
    blockConnectUser,
    type ConnectBlock,
    type ConnectContact,
    type ConnectPrivacySettings,
    type ContactRequest,
    createContactRequest,
    createGroupDirectMessage,
    createMessageRequest,
    declineContactRequest,
    decideMessageRequest,
    type DirectoryUser,
    getConnectPrivacy,
    listConnectBlocks,
    listConnectContacts,
    listContactRequests,
    listMessageRequests,
    type MessageRequest,
    type NixorIdentity,
    type PrivacyAudience,
    searchConnectDirectory,
    unblockConnectUser,
    updateConnectPrivacy,
} from "../../../nixor/accountabilityApi";
import {
    openNixorDirectMessages,
    openNixorMatrixRoom,
} from "../../../nixor/accountabilityNavigation";

interface DirectMessageData {
    privacy: ConnectPrivacySettings;
    messageRequests: MessageRequest[];
    contactRequests: ContactRequest[];
    contacts: ConnectContact[];
    blocks: ConnectBlock[];
}

const AUDIENCES: Array<{ value: PrivacyAudience; label: string }> = [
    { value: "nobody", label: "Nobody" },
    { value: "contacts", label: "Contacts only" },
    { value: "institution", label: "Nixor institution" },
    { value: "everyone", label: "Everyone" },
];

function formValue(form: FormData, name: string): string {
    const value = form.get(name);
    return typeof value === "string" ? value.trim() : "";
}

function formatDate(value?: string | null): string {
    if (!value) return "—";
    const date = new Date(value);
    return Number.isNaN(date.getTime())
        ? "Date unavailable"
        : new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(date);
}

function otherUser(contact: ConnectContact, ownUserId: string): string {
    return contact.user_a_matrix_user_id === ownUserId
        ? contact.user_b_matrix_user_id
        : contact.user_a_matrix_user_id;
}

const PrivacySettings: React.FC<{
    value: ConnectPrivacySettings;
    onChange: (value: ConnectPrivacySettings) => void;
    onSaved: () => Promise<void>;
}> = ({ value, onChange, onSaved }) => {
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        setBusy(true);
        setError(null);
        setMessage(null);
        try {
            await updateConnectPrivacy(value);
            setMessage("Privacy settings saved.");
            await onSaved();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Privacy settings were not saved.");
        } finally {
            setBusy(false);
        }
    };
    const audienceSelect = (
        key: keyof Pick<ConnectPrivacySettings,
        "message_requests" | "room_invitations" | "profile_image_visibility" | "presence_visibility" | "directory_discovery">,
        label: string,
    ): React.JSX.Element => (
        <label>
            {label}
            <select
                value={value[key]}
                onChange={(event) => onChange({ ...value, [key]: event.target.value as PrivacyAudience })}
            >
                {AUDIENCES.map((audience) => <option key={audience.value} value={audience.value}>{audience.label}</option>)}
            </select>
        </label>
    );
    return (
        <details className="mx_NixorWorkspace_createPanel">
            <summary>Privacy and contact settings</summary>
            <form onSubmit={(event) => void save(event)}>
                <p>These controls govern future requests and discovery. They do not grant administrators general access to DMs.</p>
                {audienceSelect("message_requests", "Who can send message requests")}
                {audienceSelect("room_invitations", "Who can invite you to rooms")}
                {audienceSelect("profile_image_visibility", "Who can see your profile image")}
                {audienceSelect("presence_visibility", "Who can see your presence")}
                {audienceSelect("directory_discovery", "Who can discover you in the directory")}
                {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
                {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
                <button type="submit" disabled={busy}>{busy ? "Saving…" : "Save privacy settings"}</button>
            </form>
        </details>
    );
};

const NixorDirectMessagesView: React.FC<{ identity: NixorIdentity }> = ({ identity }) => {
    const [data, setData] = useState<DirectMessageData | null>(null);
    const [directory, setDirectory] = useState<DirectoryUser[]>([]);
    const [recipient, setRecipient] = useState("");
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const recipientRef = useRef<HTMLInputElement>(null);

    const load = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [privacy, messageRequests, contactRequests, contacts, blocks] = await Promise.all([
                getConnectPrivacy(),
                listMessageRequests(),
                listContactRequests(),
                listConnectContacts(),
                listConnectBlocks(),
            ]);
            setData({ privacy, messageRequests, contactRequests, contacts, blocks });
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Could not load direct-message controls.");
        } finally {
            setLoading(false);
        }
    }, []);
    useEffect(() => { void load(); }, [load]);

    const search = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const query = formValue(new FormData(event.currentTarget), "query");
        setBusy("directory");
        setError(null);
        try {
            setDirectory(await searchConnectDirectory(query));
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Directory search failed.");
        } finally {
            setBusy(null);
        }
    };

    const sendMessageRequest = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy("message-request");
        setError(null);
        setMessage(null);
        try {
            const requestId = await createMessageRequest(recipient, formValue(form, "introduction") || undefined);
            setMessage(`Message request ${requestId} sent. A conversation is created only if the recipient accepts.`);
            setRecipient("");
            formElement.reset();
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Message request was not sent.");
        } finally {
            setBusy(null);
        }
    };

    const decideRequest = async (request: MessageRequest, decision: "accept" | "decline"): Promise<void> => {
        setBusy(request.public_id);
        setError(null);
        setMessage(null);
        try {
            const result = await decideMessageRequest(request.public_id, decision);
            if (decision === "accept") {
                setMessage("Message request accepted. This did not create a contact or friendship.");
                if (result.matrix_room_id) openNixorMatrixRoom(result.matrix_room_id);
            } else {
                setMessage("Message request declined.");
            }
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Message request was not updated.");
        } finally {
            setBusy(null);
        }
    };

    const sendContactRequest = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy("contact-request");
        setError(null);
        setMessage(null);
        try {
            const requestId = await createContactRequest(
                formValue(form, "recipient"),
                formValue(form, "relationship_type") as "contact" | "friend",
                formValue(form, "note") || undefined,
            );
            setMessage(`Contact request ${requestId} sent.`);
            formElement.reset();
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Contact request was not sent.");
        } finally {
            setBusy(null);
        }
    };

    const acceptRelationship = async (request: ContactRequest): Promise<void> => {
        setBusy(request.public_id);
        setError(null);
        try {
            await acceptContactRequest(request.public_id);
            setMessage(`${request.relationship_type === "friend" ? "Friend" : "Contact"} request accepted.`);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Contact request was not accepted.");
        } finally {
            setBusy(null);
        }
    };

    const declineRelationship = async (request: ContactRequest): Promise<void> => {
        setBusy(request.public_id);
        setError(null);
        try {
            await declineContactRequest(request.public_id);
            setMessage(`${request.relationship_type === "friend" ? "Friend" : "Contact"} request declined.`);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Contact request was not declined.");
        } finally {
            setBusy(null);
        }
    };

    const block = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        setBusy("block");
        setError(null);
        setMessage(null);
        try {
            await blockConnectUser(formValue(form, "user_id"), formValue(form, "reason") || undefined);
            setMessage("User blocked. Pending message and contact requests between you were closed.");
            formElement.reset();
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "User was not blocked.");
        } finally {
            setBusy(null);
        }
    };

    const unblock = async (record: ConnectBlock): Promise<void> => {
        setBusy(record.public_id);
        setError(null);
        try {
            await unblockConnectUser(record.public_id);
            setMessage(`${record.blocked_matrix_user_id} unblocked. This does not restore prior relationships.`);
            await load();
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "User was not unblocked.");
        } finally {
            setBusy(null);
        }
    };

    const createGroup = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        const formElement = event.currentTarget;
        const form = new FormData(formElement);
        const participants = Array.from(new Set(formValue(form, "participants").split(/[\s,]+/).filter(Boolean)));
        setBusy("group");
        setError(null);
        setMessage(null);
        try {
            const result = await createGroupDirectMessage(
                formValue(form, "name"),
                participants,
                formValue(form, "topic") || undefined,
            );
            formElement.reset();
            openNixorMatrixRoom(result.matrix_room_id);
        } catch (reason) {
            setError(reason instanceof Error ? reason.message : "Group conversation was not created.");
        } finally {
            setBusy(null);
        }
    };

    if (loading) return <div className="mx_NixorWorkspace_state" role="status"><Spinner /> Loading direct-message controls…</div>;
    if (!data) {
        return <div className="mx_NixorWorkspace_state mx_NixorWorkspace_error" role="alert"><p>{error}</p><AccessibleButton onClick={() => void load()}>Try again</AccessibleButton></div>;
    }
    const incoming = data.messageRequests.filter((request) =>
        request.recipient_matrix_user_id === identity.identity.matrix_user_id && request.status === "pending",
    );
    const pendingContacts = data.contactRequests.filter((request) => request.status === "pending");

    return (
        <>
            <div className="mx_NixorWorkspace_toolbar">
                <div>
                    <strong>Conversations and governed requests are separate.</strong>
                    <p>Accepting a message request opens one canonical DM and never creates friendship automatically.</p>
                </div>
                <AccessibleButton className="mx_NixorWorkspace_primaryAction" onClick={openNixorDirectMessages}>
                    Open conversations
                </AccessibleButton>
            </div>
            {error && <p className="mx_NixorWorkspace_error" role="alert">{error}</p>}
            {message && <p className="mx_NixorWorkspace_success" role="status">{message}</p>}
            <PrivacySettings
                value={data.privacy}
                onChange={(privacy) => setData({ ...data, privacy })}
                onSaved={load}
            />

            <section aria-labelledby="nixor-message-requests-heading">
                <h2 id="nixor-message-requests-heading">Message requests</h2>
                <form className="mx_NixorWorkspace_search" onSubmit={(event) => void search(event)}>
                    <label>Find a person or service<input name="query" minLength={2} maxLength={100} required /></label>
                    <button type="submit" disabled={busy === "directory"}>{busy === "directory" ? "Searching…" : "Search directory"}</button>
                </form>
                {directory.length > 0 && <div className="mx_NixorWorkspace_cards">{directory.map((user) => (
                    <article className="mx_NixorWorkspace_card" key={user.matrix_user_id}>
                        <h3>{user.display_name || user.matrix_user_id}</h3>
                        <p>{user.matrix_user_id}</p>
                        {user.identity_type !== "human" && <span className="mx_NixorStatusPill">{user.identity_type}</span>}
                        <AccessibleButton onClick={() => {
                            setRecipient(user.matrix_user_id);
                            recipientRef.current?.focus();
                        }}>Select for message request</AccessibleButton>
                    </article>
                ))}</div>}
                <details className="mx_NixorWorkspace_createPanel">
                    <summary>Send a message request</summary>
                    <form onSubmit={(event) => void sendMessageRequest(event)}>
                        <label>Recipient Matrix ID<input ref={recipientRef} value={recipient} onChange={(event) => setRecipient(event.target.value)} pattern="^@[^:\s]+:[^\s]+$" required /></label>
                        <label>Introduction<textarea name="introduction" maxLength={500} /></label>
                        <button type="submit" disabled={busy === "message-request"}>{busy === "message-request" ? "Sending…" : "Send message request"}</button>
                    </form>
                </details>
                {!data.messageRequests.length ? <p>No message requests.</p> : <div className="mx_NixorWorkspace_cards">{data.messageRequests.map((request) => (
                    <article className="mx_NixorWorkspace_card" key={request.public_id}>
                        <div className="mx_NixorWorkspace_cardHeader"><h3>{request.requester_matrix_user_id} → {request.recipient_matrix_user_id}</h3><span className="mx_NixorStatusPill">{request.status}</span></div>
                        {request.introduction && <p>{request.introduction}</p>}
                        <p>Sent {formatDate(request.created_at)}</p>
                        {request.recipient_matrix_user_id === identity.identity.matrix_user_id && request.status === "pending" && <div className="mx_NixorWorkspace_actions">
                            <AccessibleButton disabled={busy === request.public_id} onClick={() => void decideRequest(request, "accept")}>Accept without adding contact</AccessibleButton>
                            <AccessibleButton disabled={busy === request.public_id} onClick={() => void decideRequest(request, "decline")}>Decline</AccessibleButton>
                        </div>}
                        {request.canonical_dm_room_id && <AccessibleButton onClick={() => openNixorMatrixRoom(request.canonical_dm_room_id!)}>Open conversation</AccessibleButton>}
                    </article>
                ))}</div>}
                {incoming.length > 0 && <p role="status">{incoming.length} incoming request{incoming.length === 1 ? "" : "s"} await your decision.</p>}
            </section>

            <section aria-labelledby="nixor-contacts-heading">
                <h2 id="nixor-contacts-heading">Contacts and friends</h2>
                <p>A contact or friendship is a separate, explicit relationship available after an established conversation.</p>
                <details className="mx_NixorWorkspace_createPanel">
                    <summary>Send a contact request</summary>
                    <form onSubmit={(event) => void sendContactRequest(event)}>
                        <label>Recipient Matrix ID<input name="recipient" pattern="^@[^:\s]+:[^\s]+$" required /></label>
                        <label>Relationship<select name="relationship_type"><option value="contact">Contact</option><option value="friend">Friend</option></select></label>
                        <label>Note<textarea name="note" maxLength={500} /></label>
                        <button type="submit" disabled={busy === "contact-request"}>{busy === "contact-request" ? "Sending…" : "Send contact request"}</button>
                    </form>
                </details>
                {pendingContacts.length > 0 && <div className="mx_NixorWorkspace_cards">{pendingContacts.map((request) => (
                    <article className="mx_NixorWorkspace_card" key={request.public_id}>
                        <h3>{request.relationship_type} request from {request.requester_matrix_user_id}</h3>
                        {request.note && <p>{request.note}</p>}
                        {request.recipient_matrix_user_id === identity.identity.matrix_user_id
                            ? <div className="mx_NixorWorkspace_actions"><AccessibleButton disabled={busy === request.public_id} onClick={() => void acceptRelationship(request)}>Accept {request.relationship_type}</AccessibleButton><AccessibleButton disabled={busy === request.public_id} onClick={() => void declineRelationship(request)}>Decline</AccessibleButton></div>
                            : <p>Awaiting {request.recipient_matrix_user_id}</p>}
                    </article>
                ))}</div>}
                {!data.contacts.length ? <p>No established contacts.</p> : <div className="mx_NixorRoleLabels">{data.contacts.map((contact) => (
                    <span className="mx_NixorStatusPill" key={contact.public_id}>{contact.relationship_type}: {otherUser(contact, identity.identity.matrix_user_id)}</span>
                ))}</div>}
            </section>

            <section aria-labelledby="nixor-group-dm-heading">
                <h2 id="nixor-group-dm-heading">Group direct message</h2>
                <details className="mx_NixorWorkspace_createPanel">
                    <summary>Create governed group DM</summary>
                    <form onSubmit={(event) => void createGroup(event)}>
                        <label>Name<input name="name" minLength={2} maxLength={160} required /></label>
                        <label>Topic<textarea name="topic" maxLength={500} /></label>
                        <label>Participant Matrix IDs<textarea name="participants" minLength={3} maxLength={12500} placeholder="@one:connect.nixorcorporate.com, @two:connect.nixorcorporate.com" required /></label>
                        <button type="submit" disabled={busy === "group"}>{busy === "group" ? "Creating…" : "Create group DM"}</button>
                    </form>
                </details>
            </section>

            <section aria-labelledby="nixor-blocks-heading">
                <h2 id="nixor-blocks-heading">Blocked users</h2>
                <details className="mx_NixorWorkspace_createPanel">
                    <summary>Block a user</summary>
                    <form onSubmit={(event) => void block(event)}>
                        <label>Matrix ID<input name="user_id" pattern="^@[^:\s]+:[^\s]+$" required /></label>
                        <label>Private reason (optional)<textarea name="reason" maxLength={500} /></label>
                        <button type="submit" disabled={busy === "block"}>{busy === "block" ? "Blocking…" : "Block user"}</button>
                    </form>
                </details>
                {!data.blocks.length ? <p>No blocked users.</p> : <div className="mx_NixorWorkspace_cards">{data.blocks.map((record) => (
                    <article className="mx_NixorWorkspace_card" key={record.public_id}>
                        <h3>{record.blocked_matrix_user_id}</h3>
                        {record.reason && <p>{record.reason}</p>}
                        <p>Blocked {formatDate(record.created_at)}</p>
                        <AccessibleButton disabled={busy === record.public_id} onClick={() => void unblock(record)}>Unblock</AccessibleButton>
                    </article>
                ))}</div>}
            </section>
        </>
    );
};

export default NixorDirectMessagesView;
