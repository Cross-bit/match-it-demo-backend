import { SessionType } from "../../interface"


export enum dataFCMType {
    // Sended on: new session created; Recipient: Member of the session (not creator) that creator invited.
    INVITE_MEMBER,
    // Sended on: invited member connected to a session; Recipient: All members of the session, so they know that member has connected (specially creator can start the session).
    INVITATION_RESULT,
    // Sended on: Session started(by creator); Recipients: All members, so they know they can long pool for the new data.
    SESSION_STARTED,
    // Sended on: Session was terminated(by creator); Recipients: All members, so they know that session was destroied.
    SESSION_TERMINATED,
};

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


export interface InviteMemberToSessionFCM{
    sessionUUID: string
    sessionCreator: {
        uuid: string
        name: string
        email: string
    }
    sessionType: SessionType
}

export enum connectionResult { CONNECTED = "CONNECTED", REJECTED = "REJECTED"}

export interface MemberConnectionResultFCM {
    result: connectionResult
    userUUID: string
}

export interface SessionStartedFCM {
    sessionInfo: MatchingSessionInfo
}

export interface SessionTerminatedFCM {
    sessionUUID: string

}

export interface DataFCM {
    type: dataFCMType,
    data: InviteMemberToSessionFCM | MemberConnectionResultFCM | SessionStartedFCM | SessionTerminatedFCM
}
