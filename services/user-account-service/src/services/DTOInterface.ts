import { BlobOptions } from "buffer";
import { UserPrivileges, AuthenticationMethod } from "../interface";


/**
 *
 *
 * Contains definitions for all domain transfer objects (DTOs) for user account managemet.
 *
 *
 *
*/


/**
 * General credentials CRUD.
 */

export interface UserCreate {
    privileges: UserPrivileges
}

/**
 * Device account CRUD.
 */

export interface UserDeviceCreate extends UserCreate
{ };


/**
 * Credentials account CRUD.
 */

export interface UserCredentialsCreate extends UserCreate
{
    name: string
    email: string,
    password: string
};

export enum UserCreationStatusCode { CREATED = "CREATED", VERIFICATION_MAIL_SEND = "VERIFICATION_MAIL_SEND", ALREADY_EXIST = "ALREADY_EXIST" }

export interface UserCreationResponse {
    status: UserCreationStatusCode
}

export interface UserCreatedResponse  {
    token: string
};


export type UserCredentials = Pick<UserCredentialsCreate, 'email' | 'password'>;


/**
 * Google authentication account CRUD.
 */

export interface UserGoogleCreate extends UserCreate
{
    googleToken: string
};

/**
 * Authentication result DTO
*/

export enum AuthenticationStatusCode { OK = "OK", INVALID_PASSWORD = "INVALID_PASSWORD", ALREADY_LOGGED_ID = "ALREADY_LOGGED_ID", NOT_VERIFIED = "NOT_VERIFIED", NOT_EXIST = "NOT_EXIST" }

export interface AuthenticationResult
{
    name?: string
    result: AuthenticationStatusCode
    userId?: number // WE SHOULD NEVER RETURN THIS TO THE CLIEEEEENT!!!
    userToken?: string // this is meant to be the public user universal id not the internal primary key in database!!!!
    accessRights?: UserPrivileges
    authenticationMethod?: AuthenticationMethod
    preferences?: PreferenceUserDataDTO
}

export interface PreferenceUserDataDTO {
    profilePictureUrl: string
}

export interface AuthenticationTokenContent {
    userUUID: string // user id
    userEmail: string
    privilidge: UserPrivileges
}


export interface AuthenticationResponse extends Omit<AuthenticationResult, "userId"> {
    name: string
    accessToken: string
    refreshToken: string
    isRefresh: boolean // this indicates if the access token was generated using credentials or using the refreshToken
}


// verification data interface
export interface VerificationData {
    creationTime: number, // unix timestamp
    expirationTime: number, // in seconds
    userId: number,
}


/**
 * User preferences
 *
*/

export interface UserProfilePicture {
    url: string,
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

export interface ImageResponseDTO {
    url: string
}