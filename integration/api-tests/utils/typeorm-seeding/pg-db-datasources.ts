/* ======================================
* DESCRIPTION
* =====================================
* Provides interfaces to create connections
* to pg databases using typeorm.
*
*/

import dotenv, { DotenvParseOutput } from 'dotenv'
import * as settings from '../../generalSettings'
import { DataSource, DataSourceOptions } from 'typeorm'
import {join} from 'path'
import { Users } from "../../database/type-orm-entities/entities/users";
import { Pending_friend_requests } from "../../database/type-orm-entities/entities/pending_friend_requests";
import { Users_friends } from "../../database/type-orm-entities/entities/users_friends";
import { Movie_ratings } from "../../database/type-orm-entities/entities/movie_ratings";

const envVars: DotenvParseOutput | undefined = (() => {

    const res = dotenv.config({ path: settings.ENV_FILE })

    if (res.error)
        throw res.error

    return res.parsed
})()

const main_db1_user = envVars?.MAIN_DB_USER as string
const main_db1_password = envVars?.MAIN_DB_PASS as string
const main_db1_database = envVars?.MAIN_DB_NAME as string
const main_db1_host = settings.TEST_DOCKER_HOST_IP // important to use this address because of docker's container internal network policies...
const main_db1_port = +(envVars?.MAIN_DB_PORT as string)


export const getTypeOrmMainDatabase1DataSource = () => {

    return new DataSource({
        type: 'postgres',
        host: main_db1_host,
        port: main_db1_port,
        username: main_db1_user,
        password: main_db1_password,
        database: main_db1_database,
        synchronize: false,
        // Load only entities required by current integration suites.
        // This avoids failures from partially generated entities for unsupported SQL constructs.
        entities: [Users, Pending_friend_requests, Users_friends, Movie_ratings],
    });
}