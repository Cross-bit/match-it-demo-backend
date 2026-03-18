from pathlib import Path
import requests
import logging
import json
import os
import pandas as pd
from typing import List, Dict, Optional
from cachetools import TTLCache, cached
from src.database.movie_cache_database import db_get_movies_batch, db_save_movie
from src.domain.movie_card import MovieCard, MovieImage, WatchProvider

# ========================================
# DESCRIPTION
# ========================================
# Accesses data from the movie database service.
#
# Uses layer caching mechanism
# L1 - in memory cache
# L2 - (document like) database cache
#


TMDB_API_KEY = os.getenv("TMDB_API_KEY")

# Absolute path to DB directory
ROOT =  Path(__file__).resolve().parent
MOVIELENS_DB_PATH = ROOT / "../datasets/movies/ml"

# Path to links.csv
LINKS_PATH = MOVIELENS_DB_PATH / "links.csv"

try:
    logging.info(f">>> CSV loaded file path: {LINKS_PATH}")
    ids_mappings_df = pd.read_csv(LINKS_PATH, encoding="utf-8")
    logging.info(">>> TMDB MOVIELENS Ids mapping CSV loaded")
except FileNotFoundError:
    logging.error(">>> TMDB MOVIELENS Ids CSV loaded failed")
    raise RuntimeError(f"Missing dataset file: {LINKS_PATH}")

# Build a dictionary: MovieLens ID → TMDB ID
movielens_to_tmdb = {
    int(row["movieId"]): int(row["tmdbId"]) if not pd.isna(row["tmdbId"]) else None
    for _, row in ids_mappings_df.iterrows()
}

tmdb_to_movielens = {tmdb: ml for ml, tmdb in movielens_to_tmdb.items() if tmdb is not None}

movie_memory_cache = TTLCache(maxsize=5000, ttl=60 * 60 * 24)

def movielens_ids_to_tmdb_ids(movie_ids: List[int]):
    """
    Returns TMDB ID for given MovieLens ID.
    Returns None if mapping does not exist.
    """
    logging.info(f"movie_lens_ids {movie_ids}")

    tmdb_ids = [movielens_to_tmdb.get(movie_id) for movie_id in movie_ids]
    logging.info(f"tmdb_ids {tmdb_ids}")
    return tmdb_ids

def movielens_id_to_tmdb_id(movie_id: int):
    """
    Returns TMDB ID for given MovieLens ID.
    Returns None if mapping does not exist.
    """
    return movielens_to_tmdb.get(movie_id)


def tmdb_id_to_movielens_id(tmdb_movie_id: int):
    """
    Returns TMDB ID for given MovieLens ID.
    Returns None if mapping does not exist.
    """
    return tmdb_to_movielens.get(tmdb_movie_id)


TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w500"

TMDB_GENRES = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    10770: "TV Movie", 53: "Thriller", 10752: "War", 37: "Western"
}

def tmdb_single_to_dto(item: dict) -> Optional[MovieCard]:
    """Map one TMDB movie JSON into ReturnMovieDTO."""

    tmdb_id = item.get("id")
    movie_id = tmdb_id_to_movielens_id(tmdb_id)

    if movie_id is None:
        logging.warning(f"[Mapper] Skipping TMDB ID {tmdb_id} - no MovieLens ID mapping.")
        return None

    title = item.get("title")

    release_date = item.get("release_date")
    year = int(release_date[:4]) if release_date else None

    poster_path = item.get("poster_path")
    image_url = TMDB_IMAGE_BASE + poster_path if poster_path else None

    backdrop_path = item.get("backdrop_path")
    backdrop_url = TMDB_IMAGE_BASE + backdrop_path if backdrop_path else None

    # Genres (TMDB sends array of objects, not genre_ids)
    genres = [g["name"] for g in item.get("genres", [])]

    description = item.get("overview")
    rating = item.get("vote_average")
    runtime = item.get("runtime")

    countries = [c["name"] for c in item.get("production_countries", [])]

    # Extract actors & directors from credits section
    actors = []
    directors = []

    credits = item.get("credits", {})
    cast = credits.get("cast", [])[:10]
    crew = credits.get("crew", [])

    actors = [c["name"] for c in cast]

    directors = [m["name"] for m in crew if m.get("job") == "Director"]

    origin_country = [c["name"] for c in item.get("production_countries", [])]

    return MovieCard(
        cardId=movie_id,
        title=title,
        genres=genres,
        imageUrl=image_url,
        year=year,
        description=description,
        ratingTMDB=rating,
        backdropUrl=backdrop_url,
        runtime=runtime,
        originCountry=origin_country,
        actors=actors,
        directors=directors,
        popularity=item.get("popularity"),
        tagline=item.get("tagline")
    )



class TMDBGateway:
    """
        Gateway to TMDb API providing movie details, multilang fetching, caching layers
        and mapping to internal MovieCard structures.
    """

    BASE_URL = "https://api.themoviedb.org/3"
    REQUEST_TIMEOUT = (3, 8)

    def __init__(self, api_key: str = None):
        self.api_key = api_key or TMDB_API_KEY

        # List of supported languages in which gateway fetches the data
        self.SUPPORTED_LANGS = [
            ("cs", "cs-CZ"),
            ("en", "en-US"),
            # ("sk", "sk-SK"),
            # ("de", "de-DE"),
        ]

        if not self.api_key:
            logging.error("TMDB API key is missing.")
            raise ValueError("TMDB API key is missing. "
                            "Provide it explicitly or set TMDB_API_KEY environment variable.")

    def _get(self, path: str, params: dict = None):
        """Send GET request to TMDB API.

            Args:
                path (str): API endpoint.
                params (dict, optional): Query params.

            Returns:
                dict: JSON response.
        """

        if params is None:
            params = {}
        params["api_key"] = self.api_key

        url = f"{self.BASE_URL}{path}"

        response = requests.get(url, params=params, timeout=self.REQUEST_TIMEOUT)

        response.raise_for_status()
        return response.json()

    def safe_get(self, path, params):
        """ Safe api get method. On error returns None. """
        try:
            return self._get(path, params)
        except Exception as e:
            logging.error(f"[TMDB] GET failed for {path} with params={params}: {e}")
            return None

    def get_movie_details(self, movie_id: int) -> MovieCard:
        """Get movie detail by ID."""

        logging.info(f"TMDB → fetching details for movie {movie_id}")

        details = self._get(f"/movie/{movie_id}", params={"append_to_response": "credits"})

        res = tmdb_single_to_dto(details)
        return res

    def get_movie_images(self, movie_id: int) -> List[MovieImage]:
        """ Fetch all movie images (posters, backdrops, logos) from TMDb. """

        data = self.safe_get(f"/movie/{movie_id}/images", params={})
        if not data:
            return []

        images = []

        def parse_images(items, img_type):
            for item in items:
                file_path = item.get("file_path")
                if not file_path:
                    continue
                images.append(MovieImage(
                    url=f"{TMDB_IMAGE_BASE}{file_path}",
                    width=item.get("width", 0),
                    height=item.get("height", 0),
                    aspectRatio=item.get("aspect_ratio", 0.0),
                    type=img_type
                ))

        parse_images(data.get("backdrops", []), "backdrop")
        parse_images(data.get("posters", []), "poster")
        parse_images(data.get("logos", []), "logo")

        return images


    def get_watch_providers(self, movie_id: int, region: str = "CZ"):
        """ Returns current watch providers and streaming services where to watch the movie. """
        data = self.safe_get(f"/movie/{movie_id}/watch/providers", params={})

        if not data:
            return []

        region_data = data.get("results", {}).get(region, {})

        providers = []

        for category in ["flatrate", "rent", "buy"]:
            for p in region_data.get(category, []):
                logo_path = p.get("logo_path")
                provider_name = p.get("provider_name", None)
                providers.append(
                    WatchProvider(
                        name=provider_name,
                        logo=f"https://image.tmdb.org/t/p/w45{logo_path}" if logo_path else None,
                        type=category
                ))

        return providers

    def get_movie_trailer(self, movie_id: int) -> Optional[str]:
        """Get YouTube trailer URL from TMDB."""

        data = self.safe_get(f"/movie/{movie_id}/videos", params={})
        if not data: return None

        for video in data.get("results", []):
            if video.get("site") == "YouTube" and video.get("type") == "Trailer":
                key = video.get("key")
                return f"https://www.youtube.com/watch?v={key}"

        return None

    def get_movie_details_multilang(self, movie_id: int) -> Dict[str, MovieCard]:
        """ Fetch movie details from TMDb in all supported languages.

            Returns a dict where keys are language codes (e.g. "cs", "en")
            and values are MovieCard dictionaries for each successfully
            fetched language. EN data is required; if missing, an empty
            dict is returned.
        """

        # 1) We fetch jsons for all langs
        raw_data_by_lang = {}

        for lang_key, lang_param in self.SUPPORTED_LANGS:
            data = self.safe_get(
                f"/movie/{movie_id}",
                params={"append_to_response": "credits", "language": lang_param}
            )

            # if json => store
            if data:
                raw_data_by_lang[lang_key] = data

        # 2) parse data into the MovieCard
        dto_by_lang: Dict[str, MovieCard] = {}

        for lang_key, data in raw_data_by_lang.items():
            dto = tmdb_single_to_dto(data)
            if dto:
                dto_by_lang[lang_key] = dto

        # 3) We use en as a fallback ==> if missing, something is wrong (tmdb should ensure it)
        if "en" not in dto_by_lang:
            logging.warning(f"[TMDB] Missing EN data for {movie_id}, skipping all languages.")
            return {}

        # 4) Fetch trailer & providers only once
        trailer = self.get_movie_trailer(movie_id)
        providers = self.get_watch_providers(movie_id)
        images = self.get_movie_images(movie_id)

        for card in dto_by_lang.values():
            card.trailerUrl = trailer
            card.watchProviders = providers
            card.images = images

        return dto_by_lang

    def get_movies_details(self, tmdb_movie_ids: List[int], lang="en") -> List[MovieCard]:
        """Get details for multiple movies.

            Args:
                tmdb_movie_ids (List[int]): List of TMDB IDs.

            Returns:
                list: Movie details or errors.
        """

        # 1) RAM cache first
        l1_hits = {id: movie_memory_cache[id] for id in tmdb_movie_ids if id in movie_memory_cache}
        miss_ids = [id for id in tmdb_movie_ids if id not in l1_hits]

        # 2) DB cache batch lookup
        db_hits = db_get_movies_batch(miss_ids)
        for movie_id, dto_by_lang in db_hits.items():
            movie_memory_cache[movie_id] = dto_by_lang

        remaining_ids = [id for id in miss_ids if id not in db_hits]

        # 3) API calls only for uncached
        api_hits = {}
        for movie_id in remaining_ids:
            dto_by_lang = self.get_movie_details_multilang(movie_id)

            en_block = dto_by_lang.get("en") or None # for simplicity we always require at least the en version

            if not en_block:
                logging.warning(f"[TMDB] Missing MovieLens ID for TMDb {movie_id}, skipping.")
                continue

            movielens_id = en_block.cardId

            api_hits[movie_id] = dto_by_lang
            movie_memory_cache[movie_id] = dto_by_lang

            jsonable = {lang: card.to_dict() for lang, card in dto_by_lang.items()}
            db_save_movie(movie_id, movielens_id, jsonable)

        # 4) Return all results in original order
        all_results = []
        lookup = {**l1_hits, **db_hits, **api_hits}

        for movie_id in tmdb_movie_ids:
            if movie_id not in lookup:
                continue

            multilang = lookup[movie_id]

            if lang == "cs":
                cs = multilang.get("cs")
                if cs and cs.title:
                    all_results.append(cs)
                else:
                    all_results.append(multilang["en"])
            else:
                all_results.append(multilang["en"])

        return all_results

    def get_popular_movies(self, page: int = 1):
        """Get popular movies."""
        return self._get("/movie/popular", {"page": page})

    def search_movie(self, query: str, page: int = 1):
        """Search movies by title."""
        return self._get("/search/movie", {"query": query, "page": page})