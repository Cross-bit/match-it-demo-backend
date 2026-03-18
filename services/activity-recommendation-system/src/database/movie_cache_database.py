import json
import os
from typing import List, Optional, Tuple, Dict
import logging
from datetime import datetime
from src.database.connection import get_db_connection
from src.domain.movie_card import MovieCard

def db_get_movies_batch(tmdb_ids: List[int]) -> Dict[int, Dict[str, MovieCard]]:
    """
    Fetch a batch of movie DTOs from the persistent cache.
    Returns dict: { tmdb_id: ReturnMovieDTO }
    """

    if not tmdb_ids:
        return {}

    logging.info(f"[DB] Fetching {len(tmdb_ids)} movie records from cache...")

    try:
        with get_db_connection() as conn:
            with conn.cursor() as cursor:

                placeholders = ",".join(["%s"] * len(tmdb_ids))

                query = f"""
                    SELECT tmdb_id, json_data
                    FROM movielens_tmdb_cache
                    WHERE tmdb_id IN ({placeholders})
                """

                cursor.execute(query, tmdb_ids)
                rows = cursor.fetchall()

                result = {}

                for row in rows:
                    tmdb_id = row[0]
                    json_data = row[1]
                    try:
                        if isinstance(json_data, str):
                            dto_data = json.loads(json_data)
                        elif isinstance(json_data, dict):
                            dto_data = json_data
                        else:
                            raise TypeError(f"Unexpected json_data type: {type(json_data)}")

                        movie_data = {}
                        for lang, movie_data in dto_data.items():
                            movie_data[lang] = MovieCard(**movie_data)

                        result[tmdb_id] = movie_data #dto_data
                    except Exception as dto_error:
                        logging.error(f"[DB] Error parsing DTO for tmdb_id={tmdb_id}: {dto_error}")

                logging.info(f"[DB] Found {len(result)}/{len(tmdb_ids)} cached movies")

                return result

    except Exception as e:
        logging.error(f"[DB] Error retrieving movie cache: {e}")
        raise


def db_save_movie(tmdb_id: int, movielens_id: int, dto: Dict):
    """
    Save or update a movie record in the persistent DB cache.
    """

    try:
        json_data = json.dumps(dto)

        query = """
            INSERT INTO movielens_tmdb_cache (tmdb_id, movielens_id, json_data, updated_at, fetched_at)
            VALUES (%s, %s, %s, NOW(), NOW())
            ON CONFLICT (tmdb_id)
            DO UPDATE SET
                movielens_id = EXCLUDED.movielens_id,
                json_data = EXCLUDED.json_data,
                updated_at = NOW();
        """

        with get_db_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(query, (tmdb_id, movielens_id, json_data))
            conn.commit()

        logging.info(f"[DB] Saved movie tmdb_id={tmdb_id} (ml_id={movielens_id})")

    except Exception as e:
        logging.error(f"[DB] Failed to save movie tmdb_id={tmdb_id}: {e}")
        raise