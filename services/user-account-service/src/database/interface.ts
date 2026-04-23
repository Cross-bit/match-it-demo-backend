import { UserPrivileges, AuthenticationMethod } from "../interface"

/*
    IMPORTANT!! note many of these interfaces(if not all) rely on the direct mapping to the
    relational database entities, this is then used in the SQL queries and direct mapping to return types...
    so when changing existing interface make sure it still fits the underlying table structure.
*/




export interface UserData {
    id: number
    uuid: string
    name: string
    email: string
    access_rights: UserPrivileges
    authentication_method: AuthenticationMethod
}

export interface CreateUser {
    name?: string
    email: string,
    access_rights: UserPrivileges
    authentication_method: AuthenticationMethod
}

export interface EmailVerificationHash {
    id: number,
    user_id: number,
    token_hash: string,
    expires_at: string,
    created_at: string,
}

export interface CreateEmailVerificationToken {
    user_id?: string,
    token_hash: string,
    expires_at: string
}

export interface CreateUserWithCredentials extends CreateUser {
    pass_hash: string,
    is_verified: boolean,
    verification_token?: CreateEmailVerificationToken,
}

export interface CredentialsRecord
{
    id: number,
    user_id: number,
    password_hash: string,
    is_verified: boolean
}

export interface UserDataWithCredentials extends UserData {
    passwordRec: Omit<CredentialsRecord, "user_id">;
}

/**
 * This query interface serves for checking whether user exists in the database
 * based on possible identification methods
 */
export interface UserExistQuery
{
    id?: number,
    uid?: string,
    email?: string
}

export interface FcmTokenRecord
{
    id: number,
    user_id: number,
    fcm_token: string,
}

export interface RefreshTokenRecord
{
    id: number,
    user_id: number,
    refresh_token: string,
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

export interface CreateImageGalleryRecord extends Omit<ImageGalleryRecord, "id"|"uuid"> {}

export interface ProfilePictureRecord
{
    id: number,
    image_id: number,
    user_uuid: string
}


export interface UserPublicProfile
{
    uuid: string;
    name: string;
    profile_picture: ImageGalleryRecord | null;
}
