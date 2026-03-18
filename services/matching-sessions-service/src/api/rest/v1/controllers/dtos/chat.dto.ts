import { SessionType } from "../../../../../interface";
import { MatchedItemDTO } from "../../../../ws/manager/ws.dto";

export interface ChatCardPreviewDTO {
    /** Unique ID of the referenced card */
    cardId: string;

    /** Title of the previewed card */
    title: string;

    /** Optional thumbnail URL */
    thumbnailUrl?: string | null;

    /** Additional structured metadata */
    metadata?: Record<string, any> | null;
}

export interface ChatAttachmentDTO {
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


/**
 * Special match result message containing all session info
 */
export interface MatchResultSystemEventDTO {
    type: "MATCH_RESULT";

    /** Session run / iteration */
    sessionRun: number;

    /** Session type (movie / restaurant / etc.) */
    sessionType: SessionType;

    /** Ordered matched items (winner first) */
    matchedItems: MatchedItemDTO[];

    /** UUID of the winning item */
    matchedItemUUID: string;
}

export enum MessageStatus {
    PENDING="PENDING",
    SENT="SENT",
    DELIVERED="DELIVERED"
}

export interface ChatMessageDTO {
    messageUuid: string;
    sessionUuid: string;
    userUuid: string;
    createdAt: number;

    /** Optional message text */
    text?: string | null;

    /** Optional attachment */
    attachment?: ChatAttachmentDTO | null;

    /** Optional card preview */
    cardPreview?: ChatCardPreviewDTO | null;

    /** Optional system event type (string identifier) */
    systemEvent?: string | null  | MatchResultSystemEventDTO;

    status?: MessageStatus;
}

/**
 * Response for history messages bulk load
 */
export interface AllChatMessagesDTO {
    sessionUUID: String,
    messages: ChatMessageDTO[]
}

