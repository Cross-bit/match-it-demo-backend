import { DomainError, SessionStartErrorCode } from "./DomainError";


export class SessionNotFoundError extends Error {
  constructor(sessionUUID: string, messageSpecific: string = "") {
    const message = messageSpecific != "" ? messageSpecific : `Session with UUID ${sessionUUID} not found`;
    super(message);
    this.name = "SessionNotFoundError";
  }
}