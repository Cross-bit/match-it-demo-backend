import { DataSource } from 'typeorm';
import { Users } from '../../database/type-orm-entities/entities/users';
export declare function seedUsersDatabase(dataSource: DataSource, userData: Users[]): Promise<void>;
export interface TestUser extends Users {
    accessToken: string;
}
export declare function getUserFromRepo(dataSource: DataSource, email: string): Promise<TestUser>;
export declare function truncateAllTables(dataSource: DataSource): Promise<void>;
