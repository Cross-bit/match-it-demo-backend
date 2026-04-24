import dotenv from "dotenv";
import request from "supertest";
import { DataSource } from "typeorm";

import * as settings from "../generalSettings";
import { getTypeOrmMainDatabase1DataSource } from "../utils/typeorm-seeding/pg-db-datasources";
import { getUserFromRepo, seedUsersDatabase, truncateAllTables } from "../utils/typeorm-seeding/pg-database-typeorm-seeding";
import { goodRegularUserData } from "../database/type-orm-entities/common-test-data/valid-testset-1";

dotenv.config({ path: settings.ENV_FILE });

describe("Friends management API", () => {
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

    test("GET /api/v1/friends returns list wrapper", async () => {
        const alice = await getUserFromRepo(ds, "alice@example.com");

        const response = await request(settings.FRIENDS_SERVICE_BASE_URL)
            .get("/api/v1/friends")
            .set("Authorization", `Bearer ${alice.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty("friends");
        expect(Array.isArray(response.body.friends)).toBe(true);
    });

    test("DELETE /api/v1/friends returns OK result", async () => {
        const alice = await getUserFromRepo(ds, "alice@example.com");

        const response = await request(settings.FRIENDS_SERVICE_BASE_URL)
            .delete("/api/v1/friends")
            .set("Authorization", `Bearer ${alice.accessToken}`);

        expect(response.status).toBe(200);
        expect(response.body).toEqual({ result: "OK" });
    });
});
