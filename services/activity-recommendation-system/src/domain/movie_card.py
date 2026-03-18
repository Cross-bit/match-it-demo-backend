from dataclasses import dataclass, field
from typing import Dict, List, Optional

@dataclass
class WatchProvider:
    name: Optional[str]
    logo: Optional[str]
    type: str

    def to_dict(self):
        return {
            "name": self.name,
            "logo": self.logo,
            "type": self.type
        }

@dataclass
class MovieImage:
    url: str
    width: int
    height: int
    aspectRatio: float
    type: str   # "backdrop", "poster", "logo"

    def to_dict(self):
        return {
            "url": self.url,
            "width": self.width,
            "height": self.height,
            "aspectRatio": self.aspectRatio,
            "type": self.type
        }

@dataclass
class MovieCard:
    # Base movie card detail
    cardId: int
    title: str
    genres: List[str]
    imageUrl: Optional[str]
    year: Optional[int]
    description: Optional[str]
    ratingTMDB: Optional[float]

    backdropUrl: Optional[str] = None
    runtime: Optional[int] = None
    originCountry: List[str] = field(default_factory=list)
    actors: List[str] = field(default_factory=list)
    directors: List[str] = field(default_factory=list)
    popularity: Optional[float] = None
    tagline: Optional[str] = None

    # Additional fields
    trailerUrl: Optional[str] = None
    watchProviders: List[WatchProvider] = field(default_factory=list)
    images: List[MovieImage] = field(default_factory=list)

    def __post_init__(self):
        # Watch providers: dict -> WatchProvider
        self.watchProviders = [
            wp if isinstance(wp, WatchProvider) else WatchProvider(**wp)
            for wp in self.watchProviders
        ]

        # Images: dict -> MovieImage
        self.images = [
            img if isinstance(img, MovieImage) else MovieImage(**img)
            for img in self.images
        ]

    def to_dict(self):
        return {
            "cardId": self.cardId,
            "title": self.title,
            "genres": self.genres,
            "imageUrl": self.imageUrl,
            "year": self.year,
            "description": self.description,
            "ratingTMDB": self.ratingTMDB,
            "backdropUrl": self.backdropUrl,
            "runtime": self.runtime,
            "originCountry": self.originCountry,
            "actors": self.actors,
            "directors": self.directors,
            "popularity": self.popularity,
            "tagline": self.tagline,
            "trailerUrl": self.trailerUrl,
            "watchProviders": [p.to_dict() for p in self.watchProviders],
            "images": [i.to_dict() for i in self.images]
        }