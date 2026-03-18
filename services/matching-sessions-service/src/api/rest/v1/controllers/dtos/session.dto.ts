import { SessionState, SessionType } from "../../../../../interface";
import { VotingResult, SessionMetadata } from "../../../../../services/types";


export interface SessionUpdateRequestDTO {
    sessionUUID: string
    votingResult: VotingResult[]
    sessionMetadata?: SessionMetadata
}

export interface UpdateSessionOptionsDTO {
    sessionUUID: string
    sessionOptions: any
}

export interface SessionStateResponseDTO {
    state: SessionState
}

/**
 * DTO for the closed sessions (FINISHED or MATCHED) for the UI list
 */
export interface SessionSummaryDTO {
    sessionUUID: string
    sessionType: SessionType
    state: SessionState
    createdAt: number
    size: number
    isCreator: boolean
    users: string[]
}


export interface SessionsHistoryDTO {
    sessions: SessionSummaryDTO[]
}