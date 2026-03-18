from dataclasses import dataclass
import json
import os
from typing import List, Optional, Tuple
import pandas as pd
import psycopg2
from psycopg2.extras import execute_values

import logging
from datetime import datetime

from src.controllers.DTOs.matching_session_dtos import MatchingSessionInfoDTO
from src.database.models import GpsLocation, MemberData, MovieRating, MovieSessionMemberData, Restaurant, UserVotes
from scipy.sparse import csr_matrix

from src.services.recommendations.restaurant.models.places_api_convertor import PlacesAPI2RepConvertor


MAIN_DB_HOST = os.getenv("MAIN_DB_HOST")
MAIN_DB_USER     = os.getenv("MAIN_DB_USER")
MAIN_DB_PASSWORD = os.getenv("MAIN_DB_PASS")
MAIN_DB_NAME     = os.getenv("MAIN_DB_NAME")
MAIN_DB_PORT     = os.getenv("MAIN_DB_PORT")
USES_SSL     = os.getenv("USES_SSL")

def update_restaurant_places_data(restaurants: list):
    """
    Update (insert or upsert) restaurant data into the database.
    Compatible fallback implementation for psycopg2 versions without `returning=True`.
    """
    logging.info("Storing restaurant data into the database")

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as db_connection:
            current_time = datetime.now()
            all_ids = []

            upsert_query = """
                INSERT INTO restaurants_data
                    (place_id, data, price_level, serves_vegetarian_food, lat, lng, content_vector, last_updated)
                VALUES %s
                ON CONFLICT (place_id)
                DO UPDATE SET
                    data = EXCLUDED.data,
                    price_level = EXCLUDED.price_level,
                    serves_vegetarian_food = EXCLUDED.serves_vegetarian_food,
                    lat = EXCLUDED.lat,
                    lng = EXCLUDED.lng,
                    content_vector = EXCLUDED.content_vector,
                    last_updated = EXCLUDED.last_updated
                RETURNING id;
            """

            data_to_insert = [
                (
                    rest.placeId,
                    rest.jsonRaw,
                    rest.priceLevel,
                    rest.servesVegetarianFood,
                    rest.lat,
                    rest.lng,
                    rest.contentVec,
                    current_time
                )
                for rest in restaurants
            ]

            batch_size = 100
            total = len(data_to_insert)
            batches = (total + batch_size - 1) // batch_size
            logging.info(f"Inserting {total} restaurants in {batches} batches of {batch_size}...")

            with db_connection.cursor() as cursor:
                for i in range(0, total, batch_size):
                    chunk = data_to_insert[i:i + batch_size]
                    logging.debug(f"Executing batch {i//batch_size + 1}/{batches} ({len(chunk)} rows)")
                    execute_values(cursor, upsert_query, chunk)
                    ids = [row[0] for row in cursor.fetchall()]
                    all_ids.extend(ids)
                    logging.debug(f"Batch {i//batch_size + 1} returned {len(ids)} IDs")

            db_connection.commit()
            logging.info(f"✅ Successfully inserted/updated {len(all_ids)} restaurants (expected {len(restaurants)})")

            return all_ids

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

import pandas as pd
import psycopg2
import logging
from typing import List

def fetch_restaurants_data_by_ids(restaurant_ids: List[int]) -> pd.DataFrame:
    """
    Fetch full restaurant records by a list of database IDs.

    Args:
        restaurant_ids (List[int]): List of restaurant IDs to fetch.

    Returns:
        pd.DataFrame: DataFrame with matching rows from restaurants_data.
    """
    if not restaurant_ids:
        logging.warning("⚠️ No restaurant IDs provided to fetch_restaurants_by_ids()")
        return pd.DataFrame()

    placeholders = ', '.join(['%s'] * len(restaurant_ids))
    query = f"SELECT * FROM restaurants_data WHERE id IN ({placeholders});"

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == '1' else "disable"
        ) as conn:
            df = pd.read_sql_query(query, conn, params=restaurant_ids)

        logging.info(f"✅ Fetched {df.shape[0]} restaurants by IDs")
        return df

    except Exception as e:
        logging.exception("❌ Error while fetching restaurants by IDs")
        raise e

def insert_restaurant_ratings_batch(records: List[Tuple[str, int, Optional[int], Optional[int]]]):
    """
    Batch insert or update restaurant ratings.

    Args:
        records: List of (user_id, restaurant_id, rating, star_rating)
    """
    if not records:
        logging.warning("No records to insert.")
        return

    query = """
        INSERT INTO restaurant_ratings (user_id, restaurant_id, rating, star_rating)
        VALUES (%s, %s, %s, %s)
        ON CONFLICT (user_id, restaurant_id) DO UPDATE
        SET rating = COALESCE(EXCLUDED.rating, restaurant_ratings.rating),
            star_rating = COALESCE(EXCLUDED.star_rating, restaurant_ratings.star_rating),
            creation_time = CURRENT_TIMESTAMP;
    """

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL == "1" else "disable"
        ) as conn:
            with conn.cursor() as cursor:
                cursor.executemany(query, records)
            conn.commit()

            logging.info(f"Inserted/updated {len(records)} ratings.")

    except psycopg2.Error as e:
        logging.error(f"Database error while inserting ratings: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error while inserting ratings: {e}")
        raise

def count_restaurants_in_radius(location: GpsLocation, radius: int = 1500) -> bool:
    """
    Check if there are at least `min_number_of_records` restaurants
    available within given radius around a location.
    """
    logging.info(location)
    logging.info(
        f"Checking data availability within {radius}m of ({location.latitude}, {location.longitude}) "
    )

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL == "1" else "disable"
        ) as db_connection:
            with db_connection.cursor() as cursor:
                query = """
                    SELECT COUNT(*)
                    FROM restaurants_data
                    WHERE earth_distance(
                            ll_to_earth(%s, %s),
                            ll_to_earth(lat, lng)
                        ) <= %s;
                """
                params = (location.latitude, location.longitude, radius)
                cursor.execute(query, params)
                count = cursor.fetchone()[0]

                logging.info(f"Found {count} restaurants in radius {radius}m in db.")

                return count

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

def fetch_all_restaurant_ids() -> List[int]:
    """
    Fetch all restaurant IDs from restaurants_data table.

    Returns:
        List[int]: List of all restaurant IDs.
    """
    query = "SELECT id FROM restaurants_data ORDER BY id ASC;"

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as conn:
            with conn.cursor() as cursor:
                cursor.execute(query)
                ids = [row[0] for row in cursor.fetchall()]
                logging.info(f"Fetched {len(ids)} restaurant IDs from DB.")
                return ids

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

class RestaurantSearchParams:
    def __init__(self, search_center: GpsLocation, search_radius: float, excluded_items: List[int], serves_vegetarian_food: bool, max_price: int):
        self.search_center = search_center
        self.search_radius = search_radius
        self.excluded_items = excluded_items
        self.serves_vegetarian_food = serves_vegetarian_food
        self.max_price = max_price

def search_for_similar_restaurants_in_radius(
    profile: List[str],
    search_params: RestaurantSearchParams,
    max_number_of_results: int = 1000
):
    """
    Search for restaurants within a radius that are most similar to the user profile.

    Args:
        profile (List[str]): User's vector representation.
        search_params (RestaurantSearchParams): Search configuration, including radius, center, etc.
        max_number_of_results (int): Maximum number of results to return.
    """

    location = search_params.search_center
    radius = search_params.search_radius
    excluded = search_params.excluded_items or []
    vegetarian_only = search_params.serves_vegetarian_food
    max_price = search_params.max_price

    logging.info(f"Searching for similar restaurants within {radius} m of ({location.latitude}, {location.longitude})")

    # Validate vector dimension
    expected_dim = PlacesAPI2RepConvertor.get_vector_dim()
    if len(profile) != expected_dim:
        msg = f"User vector must be {expected_dim} dimensions, got {len(profile)}"
        logging.error(msg)
        raise ValueError(msg)

    if not isinstance(max_number_of_results, int) or max_number_of_results <= 0:
        raise ValueError("max_number_of_results must be a positive integer")

    # Build query dynamically based on filters
    query = """
        SELECT
            id,
            lat,
            lng,
            content_vector <=> %s::vector AS similarity,
            earth_distance(
                ll_to_earth(%s, %s),
                ll_to_earth(lat, lng)
            ) AS distance_meters
        FROM restaurants_data
        WHERE
            earth_distance(
                ll_to_earth(%s, %s),
                ll_to_earth(lat, lng)
            ) <= %s
            AND content_vector IS NOT NULL
    """

    params = [profile, location.latitude, location.longitude, location.latitude, location.longitude, radius]

    # NOTE: from domain we dont't use it for now
    # Add vegetarian filter if requested
    #    if vegetarian_only:
    #        query += " AND serves_vegetarian_food = {vegetarian_only}"

    if max_price is not None:
        query += " AND price_level <= %s"
        params.append(int(max_price))
        logging.error(f"appended: {max_price}")

    # Exclude items if provided
    if excluded:
        excluded_placeholders = ', '.join(['%s'] * len(excluded))
        query += f" AND id NOT IN ({excluded_placeholders})"
        params.extend(excluded)

    query += f" ORDER BY similarity ASC, distance_meters ASC LIMIT {max_number_of_results};"

    logging.error(query)
    # Execute query
    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as db_connection:
            df = pd.read_sql_query(query, db_connection, params=params)

        logging.info(f"Found {df.shape[0]} matching restaurants")
        return df

    except Exception as e:
        logging.exception("Error while searching for restaurants")
        raise e

def fetch_restaurants_data_by_restaurant_ids(restaurant_ids: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Fetch restaurant metadata from PostgreSQL.

    Args:
        restaurant_ids (Optional[List[str]]): If provided, fetch only these restaurant place_ids.

    Returns:
        DataFrame with columns:
            id, place_id, data, price_level, serves_vegetarian_food,
            lat, lng, content_vector, last_updated
    """
    base_query = """
        SELECT
            id,
            place_id,
            data,
            price_level,
            serves_vegetarian_food,
            lat,
            lng,
            content_vector,
            last_updated
        FROM restaurants_data
    """

    if restaurant_ids:
        placeholders = ", ".join(["%s"] * len(restaurant_ids))
        query = base_query + f" WHERE id IN ({placeholders})"
        params = tuple(restaurant_ids)
    else:
        query = base_query
        params = ()

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as conn:
            df = pd.read_sql(query, conn, params=params)

            if "content_vector" in df.columns:
                df["content_vector"] = df["content_vector"].apply(
                    lambda x: [float(v) for v in json.loads(x.replace("{", "[").replace("}", "]"))]
                    if isinstance(x, str)
                    else [float(v) for v in x]
                )

            logging.info(f"Fetched {len(df)} restaurants from DB.")
            return df

    except psycopg2.Error as e:
        logging.error(f"Database error while fetching restaurants_data: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error while fetching restaurants_data: {e}")
        raise

def fetch_restaurant_ratings(user_uuids: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Fetch raw ratings from PostgreSQL.

    Args:
        user_uuids (Optional[List[str]]): If provided, fetch only ratings for these users.

    Returns:
        DataFrame with columns: user_uuid, restaurant_id, rating, star_rating
    """
    base_query = """
        SELECT
            user_uuid,
            restaurant_id,
            rating,
            star_rating
        FROM restaurant_ratings
        WHERE rating IS NOT NULL OR star_rating IS NOT NULL
    """

    if user_uuids:
        placeholders = ", ".join(["%s"] * len(user_uuids))
        query = base_query + f" AND user_uuid IN ({placeholders})"
        params = tuple(user_uuids)
    else:
        query = base_query
        params = ()

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as conn:
            df = pd.read_sql(query, conn, params=params)
            logging.info(f"Fetched {len(df)} ratings from DB.")
            return df

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise

@dataclass
class RestaurantRating:
    user_uuid: str
    item_id: int
    rating: Optional[int]
    star_rating: Optional[int] = None

def save_restaurant_ratings(ratings: List[RestaurantRating]):
    tupled = [
        (r.user_uuid, r.item_id, r.rating, r.star_rating)
        for r in ratings
    ]
    return insert_restaurant_user_ratings(tupled)


def insert_restaurant_user_ratings(
    ratings: List[Tuple[str, int, Optional[int], Optional[int]]]
):
    """
    Insert user ratings into restaurant_ratings table.

    Args:
        ratings (List[Tuple[str, int, Optional[int], Optional[int]]]):
            list of (user_uuid, restaurant_id, rating, star_rating)
            - rating ∈ {-1, 0, 1} or None
            - star_rating ∈ {1, 2, 3, 4, 5} or None
    """

    if not ratings:
        logging.info("No ratings to insert.")
        return []

    insert_query = """
        INSERT INTO restaurant_ratings (
            user_uuid,
            restaurant_id,
            rating,
            star_rating
        )
        VALUES %s
        ON CONFLICT (user_uuid, restaurant_id)
        DO UPDATE SET
            rating = EXCLUDED.rating,
            star_rating = EXCLUDED.star_rating
        RETURNING user_uuid, restaurant_id;
    """

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode="require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as conn:
            with conn.cursor() as cursor:
                # Ověření dat a doplnění None, pokud chybí rating/star_rating
                data_to_insert = []
                for (user_uuid, restaurant_id, rating, star_rating) in ratings:
                    if rating is not None and rating not in (-1, 0, 1):
                        logging.warning(f"Invalid rating {rating}, setting to None")
                        rating = None
                    if star_rating is not None and star_rating not in (1, 2, 3, 4, 5):
                        logging.warning(f"Invalid star_rating {star_rating}, setting to None")
                        star_rating = None

                    # Constraint vyžaduje, že aspoň jeden z nich musí být not null
                    if rating is None and star_rating is None:
                        logging.warning(f"Skipping invalid rating record for {user_uuid}, {restaurant_id}")
                        continue

                    data_to_insert.append((user_uuid, restaurant_id, rating, star_rating))

                if not data_to_insert:
                    logging.info("No valid ratings to insert after filtering.")
                    return []

                execute_values(cursor, insert_query, data_to_insert)
                inserted = cursor.fetchall()

            conn.commit()
            logging.info(f"Inserted/updated {len(inserted)} ratings into DB.")
            return inserted

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise
    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise