"use strict";
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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedUsersDatabase = seedUsersDatabase;
exports.getUserFromRepo = getUserFromRepo;
exports.truncateAllTables = truncateAllTables;
const users_1 = require("../../database/type-orm-entities/entities/users");
const authentication_generator_1 = require("../authentication-generator");
//
// SEEDING FUNCTIONS
//
function seedUsersDatabase(dataSource, userData) {
    return __awaiter(this, void 0, void 0, function* () {
        const userRepo = dataSource.getRepository(users_1.Users);
        // Insert the seed data
        yield userRepo.save(userData);
        console.log('Database seeded with initial users.');
    });
}
//
// ACTIONS
//
function getUserFromRepo(dataSource, email) {
    return __awaiter(this, void 0, void 0, function* () {
        const userRepo = dataSource.getRepository(users_1.Users);
        const user = yield userRepo.findOneBy({ email: email }); // TODO: instead of query this could be cached on insertion to make it faster...
        if (!user)
            throw Error("User does not exist in db!");
        const user_authentication = (0, authentication_generator_1.generateAccessToken)(user === null || user === void 0 ? void 0 : user.uuid, user === null || user === void 0 ? void 0 : user.email, user === null || user === void 0 ? void 0 : user.access_rights);
        return Object.assign(Object.assign({}, user), { accessToken: user_authentication });
    });
}
function truncateAllTables(dataSource) {
    return __awaiter(this, void 0, void 0, function* () {
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
            yield dataSource.query(truncateQuery);
            console.log('All tables truncated—clean slate, baby!');
        }
        catch (error) {
            console.error('Whoops, truncate hit a snag:', error);
            throw error;
        }
    });
}
