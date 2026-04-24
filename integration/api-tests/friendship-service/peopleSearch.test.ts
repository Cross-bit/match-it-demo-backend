import dotenv from "dotenv";
import request from "supertest";
import { DataSource } from "typeorm";

import * as settings from "../generalSettings";
import { getTypeOrmMainDatabase1DataSource } from "../utils/typeorm-seeding/pg-db-datasources";
import { getUserFromRepo, seedUsersDatabase, truncateAllTables } from "../utils/typeorm-seeding/pg-database-typeorm-seeding";
import { goodRegularUserData } from "../database/type-orm-entities/common-test-data/valid-testset-1";

dotenv.config({ path: settings.ENV_FILE });

describe("GET /api/v1/search/:email", () => {
    let ds: DataSource;

    beforeAll(async () => {
        ds = await getTypeOrmMainDatabase1DataSource().initialize();
        await truncateAllTables(ds);
        await seedUsersDatabase(ds, goodRegularUserData);
    });

    afterAll(async () => {
        await truncateAllTables(ds);
        await ds.destroy();
    });

    test("returns person for existing email", async () => {
        const alice = await getUserFromRepo(ds, "alice@example.com");

        const response = await request(settings.FRIENDS_SERVICE_BASE_URL)
            .get("/api/v1/search/bob@example.com")
            .set("Authorization", `Bearer ${alice.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("person");
        expect(response.body.person.email).toBe("bob@example.com");
        expect(response.body.person).toHaveProperty("uuid");
    });

    test("returns 404 for unknown email", async () => {
        const alice = await getUserFromRepo(ds, "alice@example.com");

        const response = await request(settings.FRIENDS_SERVICE_BASE_URL)
            .get("/api/v1/search/not-existing@example.com")
            .set("Authorization", `Bearer ${alice.accessToken}`);

        expect(response.status).toBe(404);
        expect(response.body).toHaveProperty("name", "NOT_FOUND");
    });
});