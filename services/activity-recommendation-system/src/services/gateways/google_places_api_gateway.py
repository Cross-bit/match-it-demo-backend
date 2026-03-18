import os
import time
import hashlib
import logging
import requests
from pathlib import Path
from typing import Optional
from google.cloud import storage

# ========================================
# DESCRIPTION
# ========================================
# Accesses data from the movie database service.
#
# Uses layer caching mechanism
# L1 - in memory cache
# L2 - (document like) database cache
#

# ========================================
# GCS STORAGE HELPER FUNCTION
# ========================================

def get_gcs_bucket():
    bucket_name = os.getenv("GCS_BUCKET_PLACES_PHOTOS_NAME")
    if not bucket_name:
        raise RuntimeError("Missing GCS_BUCKET_PLACES_PHOTOS_NAME")

    client = storage.Client()
    return client.bucket(bucket_name)

def upload_bytes_to_gcs(data: bytes, filename: str) -> str:
    bucket = get_gcs_bucket()
    blob = bucket.blob(filename)

    blob.upload_from_string(
        data,
        content_type="image/jpeg",
    )

    blob.cache_control = "public, max-age=31536000"
    blob.patch()

    base_url = os.getenv(
        "PLACES_PHOTOS_GALLERY_BASE_URL",
        "https://storage.googleapis.com"
    )

    return f"{base_url}/{bucket.name}/{filename}"


# ========================================
# PLACES API GATEWAY
# ========================================

class PlacesPhotoGateway:
    """
    Google Places Photo gateway with local disk cache.
    Stores photos in src/static/places_photos and returns public URLs.
    """

    # places API (New) base url
    BASE_URL = "https://places.googleapis.com/v1"
    # max width of the places photos
    MAX_PHOTOS_WIDTH_PX = 800
    MAX_PHOTOS_AGE_SECONDS = 60 * 60 * 24 * 7  # we keep all file sin the cache if older than 7 days

    def __init__(self):
        self.api_key = os.getenv("GOOGLE_PLACES_API_KEY")
        if not self.api_key:
            raise RuntimeError("Missing GOOGLE_PLACES_API_KEY")

        self.upload_server = os.getenv("PLACES_PHOTOS_UPLOAD_SERVER", "local")

        self.cleanup_enabled = os.getenv(
            "PLACES_PHOTO_CLEANUP_ENABLED", "0"
        ) in ("1", "true", "True")

        # local photos dir src/static/places_photos
        self.base_dir = Path(__file__).resolve().parents[2]
        self.photos_dir = self.base_dir / "static" / "places_photos"
        self.photos_dir.mkdir(parents=True, exist_ok=True)

        logging.info(
            f"[PlacesPhoto] Cache dir: {self.photos_dir}, cleanup={self.cleanup_enabled}"
        )

    # =====================================================
    # Public API
    # =====================================================

    def get_photo_url(self, photo_name: str) -> Optional[str]:
        """
        Returns public URL to locally cached photo.
        Downloads the photo if not present.
        """

        if not photo_name:
            return None


        filename = self._filename_from_photo_name(photo_name)
        logging.info(f"photo name ${photo_name}; photo hash ${filename}")

        if self.upload_server == "local":
            return self._get_local_photo(photo_name, filename)

        if self.upload_server == "gcs":
            return self._get_gcs_photo(photo_name, filename)

        raise RuntimeError("Invalid IMAGE_UPLOAD_SERVER")

    # =====================================================
    # Internal helpers
    # =====================================================

    def _get_local_photo(self, photo_name: str, filename: str) -> Optional[str]:
        local_path = self.photos_dir / filename

        if not local_path.exists():
            data = self._fetch_photo_bytes(photo_name)
            if not data:
                return None
            local_path.write_bytes(data)

        return f"/static/places_photos/{filename}"

    def _get_gcs_photo(self, photo_name: str, filename: str) -> Optional[str]:
        bucket = get_gcs_bucket()
        blob = bucket.blob(filename)

        if blob.exists():
            base_url = os.getenv(
                "PLACES_PHOTOS_GALLERY_BASE_URL",
                "https://storage.googleapis.com"
            )
            return f"{base_url}/{bucket.name}/{filename}"

        data = self._fetch_photo_bytes(photo_name)
        if not data:
            return None

        return upload_bytes_to_gcs(data, filename)

    # =====================================================
    # GOOGLE PLACES FETCH (ROBUST)
    # =====================================================

    def _fetch_photo_bytes(self, photo_name: str) -> Optional[bytes]:
        """
        Fetches photo bytes from Google Places API.

        IMPORTANT:
        - uses skipHttpRedirect
        - manually downloads photoUri
        """

        meta_url = f"{self.BASE_URL}/{photo_name}/media"

        params = {
            "key": self.api_key,
            "maxWidthPx": self.MAX_PHOTOS_WIDTH_PX,
            "skipHttpRedirect": "true",
        }

        try:
            # fetch metadata
            meta_resp = requests.get(meta_url, params=params, timeout=10)
            meta_resp.raise_for_status()

            photo_uri = meta_resp.json().get("photoUri")
            if not photo_uri:
                return None

            # fetch image bytes
            img_resp = requests.get(photo_uri, timeout=15)
            img_resp.raise_for_status()

            return img_resp.content

        except Exception as e:
            logging.warning(
                f"[PlacesPhoto] Failed to fetch photo {photo_name}: {e}"
            )
            return None

    @staticmethod
    def _filename_from_photo_name(photo_name: str) -> str:
        """
        Deterministic, filesystem-safe filename.
        """
        return hashlib.sha256(photo_name.encode("utf-8")).hexdigest() + ".jpg"