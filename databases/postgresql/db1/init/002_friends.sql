/*===========================================
* DESCRIPTION
* ===========================================
*  Table definitions defining user relationships.
*/


CREATE TYPE relationshipType AS ENUM ('RELATIONSHIP', 'FAMILY');

CREATE TABLE users_friends (
    id SERIAL PRIMARY KEY,
    token UUID NOT NULL DEFAULT uuid_generate_v4(),
    user1_id BIGINT NOT NULL,
    user2_id BIGINT NOT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user1_id)
        REFERENCES users(id) ON DELETE CASCADE,

    FOREIGN KEY (user2_id)
        REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT users_friends_no_self
    CHECK (user1_id <> user2_id)
);

CREATE UNIQUE INDEX users_friends_unique
ON users_friends (
    LEAST(user1_id, user2_id),
    GREATEST(user1_id, user2_id)
);


COMMENT ON TABLE users_friends IS 'Represents all the relationship graph users have. There is double directional edge if there is an relationship';

CREATE TABLE pending_friend_requests (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_id BIGINT NOT NULL,  /*there is directional relation ship, this means user_id is sending friend requst to the user with friend_id */
    friend_id BIGINT NOT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY (user_id)
        REFERENCES users(id) ON DELETE CASCADE,

    FOREIGN KEY (friend_id)
        REFERENCES users(id) ON DELETE CASCADE,

    CONSTRAINT pending_requests_no_self
    CHECK (user_id <> friend_id)
);

CREATE UNIQUE INDEX pending_requests_unique
ON pending_friend_requests (
    LEAST(user_id, friend_id),
    GREATEST(user_id, friend_id)
);

COMMENT ON TABLE pending_friend_requests IS 'Represents all pending requests to friends. This table is periodically garbage collected. ';