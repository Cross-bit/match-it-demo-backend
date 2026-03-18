
CREATE TABLE groups (
    id SERIAL PRIMARY KEY,
    group_uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    label VARCHAR(256) NOT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE group_members_relations (
    id SERIAL PRIMARY KEY,
    group_id INT NOT NULL,
    user_uuid UUID NOT NULL,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_group_member UNIQUE (group_id, user_uuid),

    FOREIGN KEY (group_id)
        REFERENCES groups(id) ON DELETE CASCADE
);

COMMENT ON TABLE group_members_relations IS 'Represents table of groups of users.';

CREATE INDEX idx_group_members_user_uuid ON group_members_relations(user_uuid);