import dotenv from 'dotenv'
import * as settings from '../generalSettings'
import { DataSource } from 'typeorm';
import request from 'supertest';
import { getUserFromRepo, seedUsersDatabase, TestUser, truncateAllTables } from '../utils/typeorm-seeding/pg-database-typeorm-seeding';
import { getTypeOrmMainDatabase1DataSource } from '../utils/typeorm-seeding/pg-db-datasources';
import { goodRegularUserData } from '../database/type-orm-entities/common-test-data/valid-testset-1';
import { Pending_friend_requests } from '../database/type-orm-entities/entities/pending_friend_requests';
import { Users_friends } from '../database/type-orm-entities/entities/users_friends';

const envVars = dotenv.config({ path: settings.ENV_FILE })

const SERVICE_PORT = process.env.API_URL as string;
const PORT = process.env.API_URL as string;


describe("Friendship creation API test", () => {
    jest.setTimeout(120000);

    let ds: DataSource;
    let createdRequestId: string | null = null;

    beforeAll(async () => {
        try {

            // Initialize database connection
            ds = await getTypeOrmMainDatabase1DataSource().initialize()
            await truncateAllTables(ds)

            //  await cleanEntireDatabase(ds)
            await seedUsersDatabase(ds, goodRegularUserData)

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

    describe('POST /api/friends-requests/send', () => {

        test(`Checking`, async () => {

            const alice = await getUserFromRepo(ds, 'alice@example.com');
            const bob: TestUser = await getUserFromRepo(ds, 'bob@example.com');

            const response = await request(settings.FRIENDS_SERVICE_BASE_URL)
            .post('/api/v1/friends-requests/send')
            .set('Authorization', `Bearer ${alice.accessToken}`)
            .send({ userId: bob.uuid });


            // check correct response received
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('requestId');
            createdRequestId = response.body.requestId;

            expect(response.body).toHaveProperty('creationTime');
            expect(!isNaN(Date.parse(response.body.creationTime))).toBe(true);

            // =====================================
            // -- Check the actual data in database
            // =====================================

            const repo = (ds as DataSource).getRepository(Pending_friend_requests);
            const rec = await repo.findOneBy({ uuid: response.body.requestId });

            // check db record
            expect(rec).not.toBeNull()
            // is the timestamp same as in response? TODO: fix bug in ORM...
            //expect(rec?.creation_time).toBe(response.body.creationTime)

            // check sender is sender
            expect(+(rec?.user_id ?? -1)).toBe(alice.id)
            expect(+(rec?.friend_id ?? -1)).toBe(bob.id)
        })
    });

    describe('POST /api/v1/friends-requests/admit', () => {
        test(`Admit created friend request`, async () => {
            const bob: TestUser = await getUserFromRepo(ds, 'bob@example.com');
            const alice: TestUser = await getUserFromRepo(ds, 'alice@example.com');

            expect(createdRequestId).toBeTruthy();

            const response = await request(settings.FRIENDS_SERVICE_BASE_URL)
                .post('/api/v1/friends-requests/admit')
                .set('Authorization', `Bearer ${bob.accessToken}`)
                .send({ requestId: createdRequestId });

            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('friendData');
            expect(response.body.friendData).toMatchObject({
                email: 'alice@example.com',
                name: 'alice',
                profilePicUrl: ''
            });
            expect(response.body).toHaveProperty('creationTime');
            expect(!isNaN(Date.parse(response.body.creationTime))).toBe(true);

            const pendingRepo = ds.getRepository(Pending_friend_requests);
            const pending = await pendingRepo.findOneBy({ uuid: createdRequestId as string });
            expect(pending).toBeNull();

            const friendsRepo = ds.getRepository(Users_friends);
            const friendship = await friendsRepo
                .createQueryBuilder("f")
                .where(
                    "(f.user1_id = :aliceId AND f.user2_id = :bobId) OR (f.user1_id = :bobId AND f.user2_id = :aliceId)",
                    { aliceId: alice.id, bobId: bob.id }
                )
                .getOne();
            expect(friendship).not.toBeNull();
        });
    });

    describe('POST /api/v1/friends-requests/check', () => {
        test(`Check pending requests before admit`, async () => {
            // Create one new request for this test branch.
            const alice = await getUserFromRepo(ds, 'alice@example.com');
            const charlie: TestUser = await getUserFromRepo(ds, 'charlie@example.com');

            const sendResponse = await request(settings.FRIENDS_SERVICE_BASE_URL)
                .post('/api/v1/friends-requests/send')
                .set('Authorization', `Bearer ${alice.accessToken}`)
                .send({ userId: charlie.uuid });

            expect(sendResponse.status).toBe(200);

            const checkResponse = await request(settings.FRIENDS_SERVICE_BASE_URL)
                .get('/api/v1/friends-requests/check')
                .set('Authorization', `Bearer ${charlie.accessToken}`);

            expect(checkResponse.status).toBe(200);
            expect(checkResponse.body).toHaveProperty('requests');
            expect(Array.isArray(checkResponse.body.requests)).toBe(true);
            expect(checkResponse.body.requests.length).toBeGreaterThan(0);
        });
    });

})
