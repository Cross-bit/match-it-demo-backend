
export interface UserData {
    id: number
    uuid: string
    name: string
    email: string
}

export interface UserFcmRecordWithUserUUID extends UserFcmRecord {
    user_uuid: string
}

export interface UserFcmRecord {
    id: number
    user_id: string
    fcm_token: string
}

