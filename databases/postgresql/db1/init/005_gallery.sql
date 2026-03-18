

CREATE TABLE users_image_gallery (
    id SERIAL PRIMARY KEY,
    uuid UUID NOT NULL DEFAULT uuid_generate_v4(),
    user_uuid UUID NOT NULL,
    server_url VARCHAR,
    server_path VARCHAR,
    name VARCHAR,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE user_profile_pictures(
    id SERIAL PRIMARY KEY,
    image_id BIGINT NOT NULL,
    user_uuid UUID NOT NULL,

    FOREIGN KEY (image_id)
        REFERENCES users_image_gallery(id) ON DELETE CASCADE
);