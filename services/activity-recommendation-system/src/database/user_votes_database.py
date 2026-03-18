import os
from typing import List, Optional
import pandas as pd
import psycopg2
import logging
from datetime import datetime
from src.database.exceptions import *
from src.controllers.DTOs.matching_session_dtos import MatchingSessionInfoDTO
from src.database.models import MemberData, MovieRating, MovieSessionMemberData, UserVotes

MAIN_DB_HOST = os.getenv("MAIN_DB_HOST")
MAIN_DB_USER     = os.getenv("MAIN_DB_USER")
MAIN_DB_PASSWORD = os.getenv("MAIN_DB_PASS")
MAIN_DB_NAME     = os.getenv("MAIN_DB_NAME")
MAIN_DB_PORT     = os.getenv("MAIN_DB_PORT")
USES_SSL     = os.getenv("USES_SSL")

def update_user_movie_votes(userVotingResults: List[UserVotes]):
    """Updates user votes in the database. Inserts new records if user, movieId combination does not exist.

        Args:
            userVotingResults (List[UserDeckVotingResults]): Deck of user session votes.
    """

    logging.info("Storing user movie votes to database")

    try:
        # Connect to the database
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT,
            sslmode= "require" if USES_SSL and USES_SSL == "1" else "disable"
        ) as db_connection:

            current_time = datetime.now()

            for userData in userVotingResults:
                for userVote in userData.votingResult:
                    with db_connection.cursor() as cursor:
                        """
                            row[0]: id
                            row[1]: user_id
                            row[2]: movie_id
                            row[3]: rating
                            row[4]: creation_time
                        """
                        cursor.execute("""
                            INSERT INTO movie_ratings (user_id, movie_id, rating, creation_time) VALUES (%s, %s, %s, %s)
                            ON CONFLICT (user_id, movie_id)
                            DO UPDATE SET rating = EXCLUDED.rating, creation_time = EXCLUDED.creation_time
                            """, (userData.userUUID, userVote.itemId, userVote.rating, current_time))

        logging.info("Stored users data to database")
    except psycopg2.OperationalError as e:
        raise DatabaseConnectionError("Could not connect to the database.") from e
    except psycopg2.Error as e:
        raise DatabaseError("An database error occurred.") from e

def get_all_movie_ratings_df(limit_last_n: int = None) -> pd.DataFrame:
    """
    Fetch rows from movie_ratings table.
    If limit_last_n is provided, return only the latest N ratings.

    Columns returned:
        id, user_id, movie_id, rating, creation_time
    """

    if limit_last_n is not None:
        query = f"""
            SELECT id, user_id, movie_id, rating, creation_time
            FROM movie_ratings
            ORDER BY id DESC
            LIMIT {limit_last_n}
        """
    else:
        query = """
            SELECT id, user_id, movie_id, rating, creation_time
            FROM movie_ratings
            ORDER BY id ASC
        """

    try:
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT
        ) as connection:

            df = pd.read_sql_query(query, connection)

        # If we fetched DESC for LIMIT, flip to ASC for clean ordering
        df = df.sort_values("id").reset_index(drop=True)

        logging.info(f"Loaded {df.shape[0]} movie ratings.")
        return df

    except Exception as e:
        logging.error(f"Failed to load movie ratings: {e}")
        return pd.DataFrame()


def fetch_movie_ratings_df(user_uuids: Optional[List[str]] = None) -> pd.DataFrame:
    """
    Fetch movie ratings from PostgreSQL.

    Args:
        user_uuids (Optional[List[str]]): If provided, fetch only ratings for these users.

    Returns:
        DataFrame with columns: id, user_id, movie_id, rating, creation_time
    """

    base_query = """
        SELECT
            id,
            user_id,
            movie_id,
            rating,
            creation_time
        FROM movie_ratings
    """

    # Add optional filtering
    if user_uuids:
        placeholders = ", ".join(["%s"] * len(user_uuids))
        query = base_query + f" WHERE user_id IN ({placeholders})"
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
            logging.info(f"Fetched {len(df)} movie ratings from DB.")
            return df

    except psycopg2.Error as e:
        logging.error(f"Database error: {e}")
        raise

    except Exception as e:
        logging.error(f"Unexpected error: {e}")
        raise




def getMovieMemberVotes(members: List[MemberData]) -> List[MovieSessionMemberData]:
    """
        Fetches members votes from previous sessions from the database
        members: list of members to fetch the votes
    """
    try:
        result_members_data = []

        # Connect to the database
        with psycopg2.connect(
            dbname=MAIN_DB_NAME,
            user=MAIN_DB_USER,
            password=MAIN_DB_PASSWORD,
            host=MAIN_DB_HOST,
            port=MAIN_DB_PORT
        ) as db_connection:

            for member in members:

                logging.info(f"Creating member: {member.userUUID}")

                movie_session_member = MovieSessionMemberData(member.userUUID)

                with db_connection.cursor() as cursor:
                    """
                    row[0]: id
                    row[1]: user_id
                    row[2]: movie_id
                    row[3]: rating
                    row[4]: creation_time
                    """
                    logging.info(f"Selecting ratings for member UUID: {member.userUUID}")
                    cursor.execute("SELECT * FROM movie_ratings WHERE user_id = %s", (member.userUUID,))
                    rows = cursor.fetchall()

                    for row in rows:
                        movie_session_member.ratings.append(MovieRating(row[2], row[3]))

                    logging.info(f"Member UUID {member.userUUID} with ratings: {movie_session_member.ratings} created.")


                result_members_data.append(movie_session_member)
        print(result_members_data)
        return result_members_data
    except psycopg2.Error as e:
        logging.error(f"An error occurred: {e}")
        return []