import dotenv from 'dotenv'
import * as settings from '../generalSettings'
import { DataSource } from 'typeorm';
import request from 'supertest';
import { getUserFromRepo, seedMovieVotesDatabase, seedUsersDatabase, TestUser, truncateAllTables } from '../utils/typeorm-seeding/pg-database-typeorm-seeding';
import { getTypeOrmMainDatabase1DataSource } from '../utils/typeorm-seeding/pg-db-datasources';
import { goodRegularUserData, movieRatings_5 } from '../database/type-orm-entities/common-test-data/valid-testset-1';

const envVars = dotenv.config({ path: settings.ENV_FILE })

const SERVICE_PORT = process.env.API_URL as string;
const PORT = process.env.API_URL as string;
const RECOMMENDER_CALLER_SERVICE = settings.ENV_VARS?.MATCHING_SESSIONS_SERVICE_IDENTIFIER as string;
const RECOMMENDER_CALLER_TOKEN = settings.ENV_VARS?.RECSYS_MESSAGING_SERVICE_TOKEN as string;


describe("Movies session recommendations test", () => {
    jest.setTimeout(120000);

    let ds: DataSource;

    beforeAll(async () => {
        try {

            // Initialize database connection
            ds = await getTypeOrmMainDatabase1DataSource().initialize()
            await truncateAllTables(ds)

            //  await cleanEntireDatabase(ds)
            await seedUsersDatabase(ds, goodRegularUserData)
            await seedMovieVotesDatabase(ds, movieRatings_5)

            // Ensure setup is complete
        } catch (error) {
            console.error("Database initialization failed:", error);
            throw error; // Ensure the test fails if setup fails
        }

    }, 120000);

    afterAll(async () => {
        // Clean everything after test completes
        if (ds && ds.isInitialized) {
            await truncateAllTables(ds)
            await ds.destroy();
        }
    }, 120000)

    describe('POST /api/movie/session/next', () => {

        test(`Checking`, async () => {
            expect(RECOMMENDER_CALLER_SERVICE).toBeTruthy();
            expect(RECOMMENDER_CALLER_TOKEN).toBeTruthy();

            const alice = await getUserFromRepo(ds, 'alice@example.com');
            const bob: TestUser = await getUserFromRepo(ds, 'bob@example.com');

            const newSessionData = {
                "session": {
                    "id": 11111,
                    "sessionUUID": "821bc7f9-02cc-4268-b6c5-8d3b266c63ce",
                    "sessionSize": 2,
                    "sessionType": "MOVIE",
                    "members": [
                        {
                            "userUUID": alice.uuid
                        },
                        {
                            "userUUID": bob.uuid
                        }
                    ]
                },
                "usersVotingResults": [] // for the session we have no votes
            }

            const response = await request(settings.RECOMMENDATION_SERVICE_BASE_URL)
            .post('/api/movie/session/next')
            .set('X-Service-Name', RECOMMENDER_CALLER_SERVICE)
            .set('Authorization', `Bearer ${RECOMMENDER_CALLER_TOKEN}`)
            .send(newSessionData);


            // check correct response received
            expect(response.status).toBe(200);

            // =====================================
            // -- Check the actual data in database
            // =====================================

            /*
                const repo = (ds as DataSource).getRepository(Pending_friend_requests);
                const rec = await repo.findOneBy({ uuid: response.body.requestId });

                // check db record
                expect(rec).not.toBeNull()
                // is the timestamp same as in response? TODO: fix bug in ORM...
                //expect(rec?.creation_time).toBe(response.body.creationTime)

                // check sender is sender
                expect(+(rec?.user_id ?? -1)).toBe(alice.id)
                expect(+(rec?.friend_id ?? -1)).toBe(bob.id)
            */
        })
    });

    describe('POST /api/v1/friends-requests/admit', () => {
        expect(true).toBe(true)
    });

    describe('POST /api/v1/friends-requests/check', () => {
        expect(true).toBe(true)
    });
})
