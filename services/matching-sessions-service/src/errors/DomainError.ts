
export enum SessionStartErrorCode {
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    USER_NOT_CREATOR = "USER_NOT_CREATOR",
    SESSION_ALREADY_STARTED = "SESSION_ALREADY_STARTED",
    SESSION_NOT_READY = "SESSION_NOT_READY"
}

export enum SessionMemberErrorCode {
    MEMBER_MISSING_FCM = "MEMBER_MISSING_FCM",
    FCM_FETCH_FAILED = "FCM_FETCH_FAILED",
    USER_NOT_IN_SESSION = "USER_NOT_IN_SESSION"
}

export enum SessionConnectionErrorCode {
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    SESSION_ALREADY_RUNNING = "SESSION_ALREADY_RUNNING",
}

export enum SessionVotingErrorCode {
    SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
    UNEXPECTED_ERROR = "UNEXPECTED_ERROR",
}

export enum SessionCreationErrorCode {
    CREATION_FAILED = "CREATION_FAILED"
}

export enum SessionMetadataErrorCode {
    MISSING_CATEGORIES = "MISSING_CATEGORIES",
    UNSUPPORTED_SESSION_TYPE = "UNSUPPORTED_SESSION_TYPE"
}

export class DomainError extends Error {
    constructor(public readonly code: string, message: string, public readonly details?: unknown) {
        super(message);
        this.name = new.target.name;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, new.target);
        }
    }
}