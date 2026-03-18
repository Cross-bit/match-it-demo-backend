/*===========================================
* DESCRIPTION
* ===========================================
*  Table definitions required by the activities
*  recommendation system.
*/


/**
* Movies recommendation system data:
* ===============================================
*/
-- Individual user movie ratings from the matching sessions.
CREATE TABLE movie_ratings (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    movie_id BIGINT NOT NULL,
    rating SMALLINT NOT NULL CHECK (rating IN (-1, 0, 1)),
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_movie UNIQUE (user_id, movie_id)
);

CREATE TABLE movielens_tmdb_cache (
    tmdb_id INT PRIMARY KEY,
    movielens_id INT NOT NULL,
    json_data JSONB,
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    fetched_at TIMESTAMP NOT NULL DEFAULT NOW()
);

/**
* Restaurants recommendation system data:
* ===============================================
*/

-- Stored restaurant recommendation data
CREATE TABLE restaurants_data (
    id SERIAL PRIMARY KEY,
    place_id VARCHAR UNIQUE,
    data JSONB,
    price_level INT,
    serves_vegetarian_food BOOLEAN,
    lat FLOAT,
    lng FLOAT,
    content_vector VECTOR(18),
    last_updated TIMESTAMP
);

CREATE INDEX restaurant_places_id_index ON restaurants_data USING BTREE (place_id);
CREATE INDEX restaurants_vector_index ON restaurants_data USING hnsw (content_vector vector_cosine_ops);


-- Individual user profiles (for content based recommendation).
CREATE TABLE user_restaurant_preferences (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL UNIQUE,
    content_vector VECTOR(18)
);

-- Individual users restaurant ratings from past matching sessions.
CREATE TABLE restaurant_ratings (
    id SERIAL PRIMARY KEY,
    user_uuid UUID NOT NULL,
    restaurant_id BIGINT NOT NULL,
    rating SMALLINT CHECK (rating IN (-1, 0, 1)),
    star_rating SMALLINT CHECK (star_rating IN (1, 2, 3, 4, 5)),
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT unique_user_restaurant UNIQUE (user_uuid, restaurant_id),

    CONSTRAINT rating_or_star_not_null CHECK (
        rating IS NOT NULL OR star_rating IS NOT NULL
    ),

    FOREIGN KEY (restaurant_id)
        REFERENCES restaurants_data(id) ON DELETE CASCADE
);


/**
* General activities related data:
* ===============================================
*/

-- Notes whether user initiated particular activity.
CREATE TABLE initialized_session_types (
    id SERIAL PRIMARY KEY,
    user_uuid VARCHAR(255) NOT NULL,
    activity_type sessionType,
    creation_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT c_initialized_session_types_unique UNIQUE (user_uuid, activity_type)
);