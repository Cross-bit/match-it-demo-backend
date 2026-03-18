from dataclasses import dataclass, field
from typing import List, Optional
from src.domain.movie_card import MovieCard, WatchProvider

@dataclass
class MovieCardDTO:
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

    trailerUrl: Optional[str] = None
    watchProviders: List[WatchProvider] = field(default_factory=list)

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
        }

    @staticmethod
    def from_domain(card: MovieCard) -> "MovieCardDTO":
        return MovieCardDTO(
            cardId=card.cardId,
            title=card.title,
            genres=card.genres,
            imageUrl=card.imageUrl,
            year=card.year,
            description=card.description,
            ratingTMDB=card.ratingTMDB,
            backdropUrl=card.backdropUrl,
            runtime=card.runtime,
            originCountry=card.originCountry,
            actors=card.actors,
            directors=card.directors,
            popularity=card.popularity,
            tagline=card.tagline,
            trailerUrl=card.trailerUrl,
            watchProviders=card.watchProviders
        )