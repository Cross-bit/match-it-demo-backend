

CREATE TABLE matching_session (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    creation_size INT NOT NULL,
    real_size INT NOT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    session_state sessionState NOT NULL,
    session_type sessionType NOT NULL
);

CREATE TYPE matchResultType AS ENUM (
    'WINNER',
    'CANDIDATE'
);

CREATE TABLE matching_match_result (
    id SERIAL PRIMARY KEY,
    session_uuid UUID NOT NULL,
    session_run_id BIGINT NOT NULL, -- the number of run in which we obtained this matching result (in case we allow repeated matching)
    item_id BIGINT NOT NULL,
    result_type matchResultType NOT NULL,
    score NUMERIC,               -- recommender relevance
    rank INT                     -- the order based on the relevance e.g. 1 for the matched card 2, 3 -- for the next two choices
);

COMMENT ON TABLE matching_match_result IS 'Represents all matched (or n-best witted) session items.';

CREATE TABLE matching_session_users (
    id SERIAL PRIMARY KEY,
    session_id BIGINT NOT NULL,
    user_uuid UUID NOT NULL, /*we actually have to use UUID here, since we will probably have this in separate database in the future*/
    is_connected BOOLEAN NOT NULL,
    is_creator BOOLEAN NOT NULL,
    metadata JSONB,

    FOREIGN KEY (session_id)
        REFERENCES matching_session(id) ON DELETE CASCADE
);

CREATE INDEX matching_session_users_session_id_index ON matching_session_users USING BTREE (session_id);


COMMENT ON TABLE matching_session_users IS 'Represents all pending requests to friends. This table is periodically garbage collected.';


CREATE TABLE chat_message (
    id SERIAL PRIMARY KEY,
    message_uuid UUID NOT NULL,
    session_uuid UUID NOT NULL,
    user_uuid UUID NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX chat_message_session_idx
    ON chat_message(session_uuid);