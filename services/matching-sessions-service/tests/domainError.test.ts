import { DomainError, SessionMemberErrorCode } from "../src/errors/DomainError";
import { SessionNotFoundError } from "../src/errors/SessionNotFoundError";

describe("DomainError", () => {
    test("keeps code, message and details", () => {
        const err = new DomainError(
            SessionMemberErrorCode.MEMBER_MISSING_FCM,
            "Missing member token",
            { userUUID: "u-1" }
        );

        expect(err).toBeInstanceOf(Error);
        expect(err.name).toBe("DomainError");
        expect(err.code).toBe(SessionMemberErrorCode.MEMBER_MISSING_FCM);
        expect(err.message).toBe("Missing member token");
        expect(err.details).toEqual({ userUUID: "u-1" });
    });
});

describe("SessionNotFoundError", () => {
    test("creates default message from UUID", () => {
        const err = new SessionNotFoundError("abc-uuid");
        expect(err.message).toBe("Session with UUID abc-uuid not found");
        expect(err.name).toBe("SessionNotFoundError");
    });

    test("uses explicit message when provided", () => {
        const err = new SessionNotFoundError("abc-uuid", "Custom not-found message");
        expect(err.message).toBe("Custom not-found message");
    });
});
