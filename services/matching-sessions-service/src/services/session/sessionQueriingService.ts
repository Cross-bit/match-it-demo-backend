import { getAllUsersUUIDSInSession } from "../../database/sessionsManagementDatabase"
import * as DTO from "../types"


export const fetchAllUsersInSession = async (sessionData: DTO.GetAllUsersInSessionRequest) => {
    const result = await getAllUsersUUIDSInSession(sessionData.sessionId);
}