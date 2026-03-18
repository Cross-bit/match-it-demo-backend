import { SessionType, SessionState } from "../../../interface";

export interface MatchingSession {
    id: number
    uuid: string
    creation_size: number
    real_size: number
    creation_time: number
    session_type: SessionType
    session_state: SessionState
}

export interface SessionUser {
    id: number
    session_id: number
    user_uuid: string
    is_connected: boolean
    is_creator: boolean
    metadata: string
}

export interface MatchingSessionWithUsers extends MatchingSession {
    users: SessionUser[]
}

export type CreateSessionUser = Omit<SessionUser, "id">

export type CreateMatchingSession = Omit<MatchingSession, "id" | "uuid">

export enum MatchResultType {
    WINNER = "WINNER",
    CANDIDATE = "CANDIDATE"
}

export interface MatchResult {
    id: number
    session_uuid: string
    session_run_id: number
    item_id: number
    result_type: MatchResultType
    score: number | null
    rank: number | null
}

export type CreateMatchResult = Omit<MatchResult, "id">