import { AuthenticationMethod, UserPrivileges } from "../interface"


export interface UserData  {
    id: number
    uid: string
    name: string
    email: string
}

export interface SearchedUserData {
    id: number
    uid: string
    name: string
    email: string
    isFriend: boolean
}

export interface Friendship
{
    id: number
    uuid: string
    user1_id: number,
    user2_id: number,
    creation_time: string
}

export interface NewFriendship
{
    id: number
    uuid: string
    user_id: number,
    friend_id: number,
    creation_time: string
}


export interface PendingFriendship
{
    id: number
    uuid: string
    user_id: number,
    friend_id: number,
    creation_time: string
}

export interface PendingFriendshipWithFrineData
{

    id: number
    uuid: string
    user_id: number,
    friend_data: UserData,
    creation_time: string
}


// Users FCM

export interface UserFcmRecord {
    id: number,
    user_id: string,
    fcm_token: string,
}

export interface UserFcmRecordWithUserUUID extends UserFcmRecord {
    user_uuid: string
    name: string
}


// images database

export interface ImageGalleryRecord
{
    id: number,
    uuid: string,
    user_uuid: string,
    server_url: string,
    server_path: string,
    name: string,
    creation_time: string,
}