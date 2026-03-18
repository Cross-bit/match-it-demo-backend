export enum dataFCMType {
    FRIEND_REQUEST_NOTIFICATION = "FRIEND_REQUEST_NOTIFICATION"
};

export interface NewFriendRequestNotificationFCM {
    friendUUID: string
    friendName: string
}

export interface DataFCM {
    type: dataFCMType,
    data: NewFriendRequestNotificationFCM
}