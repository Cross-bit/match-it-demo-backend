import { UserPrivileges } from "../interface"

export interface UserData {
    uuid: string,
    name: string
    email: string
    profilePicUrl: string
}

export interface SearchedUserData {
    uuid: string,
    name: string
    email: string
    isFriend: boolean
    hasInvitation: boolean
}


export interface AllFriendsDTO {
    friendsCount: number
    friends: UserData[]
}

export interface AuthenticationTokenContent
{
    userUUID: string // user id
    userEmail: string
    privilidge: UserPrivileges
}


export interface CreatePendingFriendRequest
{
    initiatorId: string,
    friendId: string
}


export interface AdmitPendingFriendRequest {
    requestUUID: string
}

export interface NewFriendshipResponse {
    friendshipId: string
    friendData: UserData
    creationTime: string
}

export interface NewPendingRequestResponse
{
    requestId: string
    creationTime: string
}

export interface PendingRequestQueryResponse {
    requestId: string,
    friendData: {
        uuid: string,
        name: string,
        email: string
    }
}



// gallery

/**
 * Info of newly stored image on the drive
 */
export interface ImageMetadata {
    ownerUUID: string,
    serverUrl: string,
    serverPath: string,
    creationTime: Date, // in unix seconds format
    name: string,
}

