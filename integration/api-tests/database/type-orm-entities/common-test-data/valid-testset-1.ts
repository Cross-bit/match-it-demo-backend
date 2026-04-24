import * as types from '../entities/custom_enums'
import { Movie_ratings } from '../entities/movie_ratings';
import { Users } from '../entities/users';

/**
 * ============================================
 * DESCRIPTION
 * ============================================
 * Test dataset set with valid data.
 * When using and defining new records,
 * beware of possible relationships
 * and dependencies.
 *
 */

/**
 * Set of regular users with valid data
 */
export const goodRegularUserData: Users[] = [
    {
        id: 1,
        uuid: '550e8400-e29b-41d4-a716-446655440000',
        name: 'alice',
        email: 'alice@example.com',
        access_rights: types.userprivilegelevel.NORMAL,
        authentication_method: types.userauthenticationmethod.CREDENTIALS,
    },
    {
        id: 2,
        uuid: '550e8400-e29b-41d4-a716-446655440001',
        name: 'bob',
        email: 'bob@example.com',
        access_rights: types.userprivilegelevel.NORMAL,
        authentication_method: types.userauthenticationmethod.CREDENTIALS,
    },
    {
        id: 3,
        uuid: '550e8400-e29b-41d4-a716-446655440002',
        name: 'charlie',
        email: 'charlie@example.com',
        access_rights: types.userprivilegelevel.NORMAL,
        authentication_method: types.userauthenticationmethod.CREDENTIALS,
    },
];

/**
 * Set of movie ratings for the regular users with valid data
 */
export const movieRatings_5: Movie_ratings[] = [
    // Use ISO timestamps to avoid PostgreSQL timezone parser issues.
    {
        id: 1,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        movie_id: 3949,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 2,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        movie_id: 3950,
        rating: -1,
        creation_time: new Date().toISOString()
    },
    {
        id: 3,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        movie_id: 3948,
        rating: 0,
        creation_time: new Date().toISOString()
    },
    {
        id: 4,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        movie_id: 720,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 5,
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        movie_id: 1088,
        rating: 0,
        creation_time: new Date().toISOString()
    },
    {
        id: 6,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        movie_id: 3948,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 7,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        movie_id: 1183,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 8,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        movie_id: 3950,
        rating: -1,
        creation_time: new Date().toISOString()
    },
    {
        id: 9,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        movie_id: 1096,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 10,
        user_id: '550e8400-e29b-41d4-a716-446655440001',
        movie_id: 3949,
        rating: 0,
        creation_time: new Date().toISOString()
    },    {
        id: 11,
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        movie_id: 3948,
        rating: 0,
        creation_time: new Date().toISOString()
    },
    {
        id: 12,
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        movie_id: 1183,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 13,
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        movie_id: 3950,
        rating: -1,
        creation_time: new Date().toISOString()
    },
    {
        id: 14,
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        movie_id: 1096,
        rating: 1,
        creation_time: new Date().toISOString()
    },
    {
        id: 15,
        user_id: '550e8400-e29b-41d4-a716-446655440002',
        movie_id: 3949,
        rating: 0,
        creation_time: new Date().toISOString()
    },
];