

export interface ChatCardPreview {
    /** Unique ID of the referenced card */
    cardId: string;

    /** Title of the previewed card */
    title: string;

    /** Optional thumbnail URL */
    thumbnailUrl?: string | null;

    /** Additional structured metadata */
    metadata?: Record<string, any> | null;
}

export interface ChatAttachment {
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

export interface ChatMessage {
    messageUuid: string;
    sessionUuid: string;
    userUuid: string;
    createdAt: number;

    /** Optional message text */
    text?: string | null;

    /** Optional attachment */
    attachment?: ChatAttachment | null;

    /** Optional card preview */
    cardPreview?: ChatCardPreview | null;

    /** Optional system event type (string identifier) */
    systemEvent?: string | null;
}