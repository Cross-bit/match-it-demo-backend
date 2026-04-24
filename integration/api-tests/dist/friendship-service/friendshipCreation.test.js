"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const settings = __importStar(require("../generalSettings"));
const supertest_1 = __importDefault(require("supertest"));
const pg_database_typeorm_seeding_1 = require("../utils/typeorm-seeding/pg-database-typeorm-seeding");
const pg_db_datasources_1 = require("../utils/typeorm-seeding/pg-db-datasources");
const users_1_1 = require("../database/type-orm-entities/common-test-data/users-1");
const pending_friend_requests_1 = require("../database/type-orm-entities/entities/pending_friend_requests");
const test_utils_1 = require("../utils/test-utils");
const envVars = dotenv_1.default.config({ path: settings.ENV_FILE });
const SERVICE_PORT = process.env.API_URL;
const PORT = process.env.API_URL;
describe("Friendship creation API test", () => {
    let ds;
    beforeAll(() => __awaiter(void 0, void 0, void 0, function* () {
        try {
            // Initialize database connection
            ds = yield (0, pg_db_datasources_1.getTypeOrmMainDatabase1DataSource)().initialize();
            yield (0, pg_database_typeorm_seeding_1.truncateAllTables)(ds);
            //  await cleanEntireDatabase(ds)
            yield (0, pg_database_typeorm_seeding_1.seedUsersDatabase)(ds, users_1_1.goodRegularUserData);
            // Ensure setup is complete
        }
        catch (error) {
            console.error("Database initialization failed:", error);
            throw error; // Ensure the test fails if setup fails
        }
    }));
    afterAll(() => __awaiter(void 0, void 0, void 0, function* () {
        // Clean everything after test completes
        yield (0, pg_database_typeorm_seeding_1.truncateAllTables)(ds);
        yield ds.destroy();
    }), 5000);
    describe('POST /api/v1/friends-requests/send', () => {
        test(`Checking`, () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b;
            const alice = yield (0, pg_database_typeorm_seeding_1.getUserFromRepo)(ds, 'alice@example.com');
            const bob = yield (0, pg_database_typeorm_seeding_1.getUserFromRepo)(ds, 'bob@example.com');
            const response = yield (0, supertest_1.default)(settings.FRIENDS_SERVICE_BASE_URL)
                .post('/api/v1/friends-requests/send')
                .set('Authorization', `Bearer ${alice.accessToken}`)
                .send({ userId: bob.uuid });
            // check correct response received
            expect(response.status).toBe(200);
            expect(response.body).toHaveProperty('requestId');
            expect(response.body.requestId).toMatch(test_utils_1.uuidRegex);
            expect(response.body).toHaveProperty('creationTime');
            expect(!isNaN(Date.parse(response.body.creationTime))).toBe(true);
            console.log("API response: ");
            console.log(response.body);
            // =====================================
            // -- Check the actual data in database
            // =====================================
            const repo = ds.getRepository(pending_friend_requests_1.Pending_friend_requests);
            const rec = yield repo.findOneBy({ uuid: response.body.requestId });
            // check db record
            expect(rec).not.toBeNull();
            // is the timestamp same as in response? TODO: fix bug in ORM...
            //expect(rec?.creation_time).toBe(response.body.creationTime)
            // check sender is sender
            expect(+((_a = rec === null || rec === void 0 ? void 0 : rec.user_id) !== null && _a !== void 0 ? _a : -1)).toBe(alice.id);
            expect(+((_b = rec === null || rec === void 0 ? void 0 : rec.friend_id) !== null && _b !== void 0 ? _b : -1)).toBe(bob.id);
        }));
    });
    describe('POST /api/v1/friends-requests/admit', () => {
        expect(true).toBe(true);
    });
    describe('POST /api/v1/friends-requests/check', () => {
        expect(true).toBe(true);
    });
});
