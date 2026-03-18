

/**
 *  WEBSOCKET DTOs
 *
 * interfaces for DTO objects for web socket communication
 *
*/

import { SessionType } from "../../../interface"
import { UsersAvailabilityInfo } from "../../../services/types"
import { SessionUpdateRequestDTO, UpdateSessionOptionsDTO } from "../../rest/v1/controllers/dtos/session.dto"


export enum wsDataType {
    /// INCOMING MESSAGES
    VOTING_RESULT = "VOTING_RESULT", // Sended on: user asks for next matching data
    HEARTBEAT = "HEARTBEAT",

    /// OUTGOING MESSAGES:

    // Sended on: new session created; Recipient: Member of the session (not creator) that creator invited.
    INVITE_MEMBER = "INVITE_MEMBER",
    // Sended on: invited member connected to a session; Recipient: All members of the session, so they know that member has connected (specially creator can start the session).
    INVITATION_RESULT = "INVITATION_RESULT",
    // Sended on: Session started(by creator); Recipients: All members, so they know they can long pool for the new data.
    SESSION_STARTED = "SESSION_STARTED",
    // Sended on: Session was terminated(by creator); Recipients: All members, so they know that session was destroied.
    SESSION_TERMINATED = "SESSION_TERMINATED",
    // Sended on: Return next session data (matching result - we have a match || next voting data)
    MATCHING_RESULT = "MATCHING_RESULT",

    // Sended on: User rewind last matching session card (therefore if other users did not finish matching we can update last cards votes... basically)
    USER_REWIND_LAST_CARD = "USER_REWIND_LAST_CARD",

    // Sended on: Some user has websocket connection issues to inform others
    ONLINE_STATUS_CHANGED = "ONLINE_STATUS_CHANGED",

    AVAILABILITY_UPDATE = "AVAILABILITY_UPDATE",

    // Session options update
    SESSION_OPTIONS_UPDATE = "SESSION_OPTIONS_UPDATE",

    // Received/Send for chat messages
    CHAT_MESSAGE = "CHAT_MESSAGE",

    //Status signals
    ERROR_OCCURRED = "ERROR_OCCURRED",
    CONNECTION_OK = "CONNECTION_OK",
    HEARTBEAT_PONG = "HEARTBEAT_PONG",
    ACK = "ACK",
};

//export enum connectionUpdateState { ONLINE = "ONLINE", OFFLINE = "OFFLINE"}

export interface UserConnectionStateUpdateWSDTO {
    userUUID: string,
    isOnline: boolean
}


export interface SessInfoMember {
    uuid: string,
    isCreator: boolean
}

interface MatchingSessionInfo
{
    sessionUUID: string,
    sessionSize: number,
    sessionType: SessionType,
    members: SessInfoMember[]
}


export interface InviteMemberToSessionWSDTO {
    sessionUUID: string
    sessionCreator: {
        uuid: string
        name: string
        email: string
    }
    sessionType: SessionType
}

export enum connectionResult { CONNECTED = "CONNECTED", REJECTED = "REJECTED"}

export interface MemberConnectionResultWSDTO {
    result: connectionResult
    userUUID: string
}

export interface SessionStartedWSDTO {
    sessionInfo: MatchingSessionInfo
}

export enum SessionTerminationReason {
    UNEXPECTED = "UNEXPECTED",
    NO_MORE_USERS = "NO_MORE_USERS",
    MATCHING_COMPLETE = "MATCHING_COMPLETE",
    SESSION_CREATION_TIMEOUT = "SESSION_CREATION_TIMEOUT",
    SESSION_MAX_DURATION = "SESSION_MAX_DURATION_MS",
    EXPLICIT = "EXPLICIT"
}

export interface SessionTerminatedWSDTO {
    sessionUUID: string
    reason: SessionTerminationReason
    message: string
}

export interface MatchedItemDTO {
    itemId: number,
    rank: number, // the priority of this MatchedItem (e. g. if is the matched item has priority of 1 or 2 for second best 3 for the third and so on...)
    run: number,
    score: number,
    cardData?: any
}

export interface MatchingResultWSDTO<ActivityItemType> {
    matched: boolean,
    nextDeckOfCards: ActivityItemType[],
    matchedItems: MatchedItemDTO[]
    matchedItemUUID: string
    sessionType: SessionType
}

export interface ErrorMessageWSDTO {
    name: string,
    message: any,
    status: number
}

export interface ConnectionOkWSDTO {
    status: string
}

export interface UsersAvailabilityInfoWSDTO {
    userInfo: UsersAvailabilityInfo
}


export interface AckDTO {
    ackId: string
}

// Chat dtos

export interface ChatCardPreviewWSDTO {
    /** Unique ID of the referenced card */
    cardId: string;

    /** Title of the previewed card */
    title: string;

    /** Optional thumbnail URL */
    thumbnailUrl?: string | null;

    /** Additional structured metadata */
    metadata?: Record<string, any> | null;
}

export interface ChatAttachmentWSDTO {
    /** Public URL pointing to the uploaded attachment */
    url?: string | null;

    /** MIME type of the attachment */
    mimeType?: string | null;

    /** Optional width (for images/thumbnails) */
    width?: number | null;

    /** Optional height (for images/thumbnails) */
    height?: number | null;

    /** Additional metadata */
    metadata?: Record<string, any> | null;
}

export interface ChatMessageWSDTO {
    messageUuid: string;
    sessionUuid: string;
    userUuid: string;
    createdAt: number;

    /** Optional message text */
    text?: string | null;

    /** Optional attachment */
    attachment?: ChatAttachmentWSDTO | null;

    /** Optional card preview */
    cardPreview?: ChatCardPreviewWSDTO | null;

    /** Optional system event type (string identifier) */
    systemEvent?: string | null;
}



// main DTO for websocket
export interface DataWs<ActivityItemType = any> { // any makes the generic to be optional
    sessionId?: string,
    messageId?: string,
    sequence?: number,
    requiresAck?: boolean,
    type: wsDataType,
    data: AckDTO | ChatMessageWSDTO | InviteMemberToSessionWSDTO | SessionUpdateRequestDTO | MemberConnectionResultWSDTO | SessionStartedWSDTO | SessionTerminatedWSDTO | MatchingResultWSDTO<ActivityItemType> | ErrorMessageWSDTO | ConnectionOkWSDTO | UsersAvailabilityInfoWSDTO | UpdateSessionOptionsDTO
}