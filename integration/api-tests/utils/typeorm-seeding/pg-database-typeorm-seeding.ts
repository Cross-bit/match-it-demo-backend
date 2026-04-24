// ====================================================
// DESCRIPTION
// ====================================================
// Seeds database with custom data using typeorm-seeding
// package from the code. This allows use of the database
// entities directly from the code, thus making integration
// testing easier.
//
// Provides helper function for testing.
//


import { DataSource } from 'typeorm';
import { Users } from '../../database/type-orm-entities/entities/users';
import { generateAccessToken } from '../authentication-generator';
import { Movie_ratings } from '../../database/type-orm-entities/entities/movie_ratings';


//
// SEEDING FUNCTIONS
//

export async function seedUsersDatabase(dataSource: DataSource, userData: Users[]): Promise<void> {
    const userRepo = dataSource.getRepository(Users);

    // Insert the seed data
    await userRepo.save(userData);
    console.log('Database seeded with initial users.');
}

export interface TestUser extends Users {
    accessToken: string
}

/**
 * Seeds database with initial voting data.
 * @param dataSource
 * @param ratingsData
 */
export async function seedMovieVotesDatabase(dataSource: DataSource, ratingsData: Movie_ratings[]): Promise<void> {
    const userRepo = dataSource.getRepository(Movie_ratings);

    // Insert the seed data
    await userRepo.save(ratingsData);

    console.log('Database seeded with initial ratings for test users:');
    ratingsData.forEach(r => console.log(r.user_id));
}


//
// ACTIONS
//

export async function getUserFromRepo(dataSource: DataSource, email: string): Promise<TestUser> {

    const userRepo = (dataSource as DataSource).getRepository(Users);
    const user = await userRepo.findOneBy({ email: email }); // TODO: instead of query this could be cached on insertion to make it faster...

    if (!user)
        throw Error("User does not exist in db!")

    const user_authentication = generateAccessToken(
                                                    user?.uuid as string,
                                                    user?.email as string,
                                                    user?.access_rights as string)

    return {...user, accessToken: user_authentication} as TestUser
}


export async function truncateAllTables(dataSource: DataSource): Promise<void> {
    try {
    const truncateQuery = `
        DO $$
        DECLARE
            stmt TEXT;
            table_name TEXT;
        BEGIN
            FOR table_name IN
                SELECT tablename FROM pg_tables WHERE schemaname = 'public'
            LOOP
                stmt := format('TRUNCATE TABLE %I CASCADE', table_name);
                EXECUTE stmt;
            END LOOP;
        END $$;
    `;

        await dataSource.query(truncateQuery);
        console.log('All tables truncated—clean slate, baby!');
    } catch (error) {
        console.error('Whoops, truncate hit a snag:', error);
        throw error;
    }
}