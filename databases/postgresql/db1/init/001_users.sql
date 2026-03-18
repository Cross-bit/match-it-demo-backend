/*===========================================
* DESCRIPTION
* ===========================================
*  Table definitions for the users and user management.
*/


CREATE TYPE userPrivilegeLevel AS ENUM ('NORMAL', 'ADMIN', 'TESTER');

CREATE TYPE userAuthenticationMethod AS ENUM ('CREDENTIALS', 'GOOGLE', 'DID');


CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    name VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    access_rights userPrivilegeLevel NOT NULL DEFAULT 'NORMAL',
    authentication_method userAuthenticationMethod NOT NULL
);

COMMENT ON TABLE users IS 'Represents main users table.';

CREATE INDEX users_token_uuid_index ON users USING BTREE (uuid);

CREATE TABLE email_verification_tokens (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,

    token_hash TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ NOT NULL,

    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE users_fcm (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL UNIQUE,
    fcm_token VARCHAR UNIQUE,

    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

/*CREATE INDEX users_fcm_index ON users_fcm USING BTREE (user_id);*/

CREATE TABLE users_credentials (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    password_hash VARCHAR(255), /*TODO: check the real limit for this field */
    is_verified BOOLEAN DEFAULT false,

    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX user_ids_credentials_index ON users_credentials USING BTREE (user_id);

COMMENT ON TABLE users_credentials IS 'For users who uses credentials as their authentication method.';

CREATE TABLE users_refresh_tokens (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    refresh_token VARCHAR(1000),

    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE users_refresh_tokens IS 'For login mechanism we keep our own private list of all the refresh tokens, for each user.';

/*CREATE TABLE users_data (
    id SERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    thumbnail_name VARCHAR(1000),
    name VARCHAR(255),
    sex CHAR(1),
    age SMALLINT,

    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE
);

COMMENT ON TABLE users_data IS 'Represents all users general data needed for matching.';*/