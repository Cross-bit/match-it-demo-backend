/**
 *
 *  General service interfaces
 *
*/

// Standardized session type enum through out the app
export enum SessionType {
    CUISINE = "CUISINE",
    MOVIE = "MOVIE",
    SPORT = "SPORT",
    EVENT = "EVENT",
    RESTAURANT = "RESTAURANT",
    BOARDGAME = "BOARDGAME"
}

// Session state
export enum SessionState {
    CREATED = "CREATED",
    INVITING = "INVITING",
    RUNNING = "RUNNING",
    MATCHED = "MATCHED",
    FINISHED = "FINISHED",
    BROKEN = "BROKEN"
}
