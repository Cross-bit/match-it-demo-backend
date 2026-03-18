import { SessionType, SessionState } from "../interface"
import { MemberData } from "./session/SessionsCachingService"


/**
 *
 * SESSION VOTING RESULTS AND SESSION CHECKS
 *
 */


export interface VotingResult  {
    /** internal id of the voted item */
    itemId: string,
    /** rating user gave to the item */
    rating: number,
}

export interface RecommendationCardItem {
    cardId: string
}

export interface SessionUpdate {
    sessionUUID: string
    votingResult: VotingResult[]
    sessionMetadata?: SessionMetadata
}


/**
* PARTICULAR MATCHING ITEMS DATA BASED ON THE SPECIFIC SESSION TYPE
*/

interface GpsLocation {
    latitude: number
    longitude: number
}


interface Author {
    name: string
    uri: string
    photoUri: string
}

interface PlacePhoto {
    width: number
    height: number
    uri: string
    author: Author
}

interface PlaceReview {
    rating: number
    text: string
    lang: string
    author: Author
    publishTime: string
}

interface RestaurantActivityItem extends RecommendationCardItem
{
    location: GpsLocation
    address: string
    rating: number
    name: string
    takeout: boolean
    vegetarian: boolean
    reviews: PlaceReview[]
    photos: PlacePhoto[]
}


export interface MovieActivityItem extends RecommendationCardItem
{
    /** movie title */
    title: string
    /** specific genres of the movie */
    genres: string[]
    /** URL to the movie poster */
    imageUrl: string
    /** Year of release */
    year: number
}

export interface GpsCoordinates {
    long: number,
    lat: number
}

export interface SensorData {
    location?: GpsCoordinates
}

export interface SessionMetadata {
    sessionParameters?: Record<string, any>,
    sensorData: SensorData
}

export interface GetAllUsersInSessionRequest {
    userId: string
    sessionId: string
}

export interface CreateSessionParams {
    creatorUUID: string
    invitedMemberUUIDs: string[]
    sessionType: SessionType
}

export interface UsersAvailabilityInfo {
    uuid: string,
    state: AvailableState
}

/**
 * Defines users availability state.
 * Availability determines whether user can be invited in a matching session.
 */
export enum AvailableState {
    AVAILABLE = "AVAILABLE",
    IS_IN_ACTIVE_SESSION = "IS_IN_ACTIVE_SESSION",
    IS_OFFLINE = "IS_OFFLINE" // meaning will probably not recieve fcm notification...
}

/// TODO: this should be standardized across all the services, so all services have common language about the topic
export enum ApiErrors
{
    CONNECTION_TO_SESSION_FAILED = "CONNECTION_TO_SESSION_FAILED"
}
