from dataclasses import asdict, dataclass
from typing import List


@dataclass
class GpsCoordinates:
    long: float
    lat: float

@dataclass
class AuthorAttribution:
    displayName: str
    photoUri: str
    uri: str


@dataclass
class PlacePhoto:
    name: str
    url: str
    authorAttributions: AuthorAttribution

@dataclass
class PlaceReview:
    name: str
    rating: float
    text: str
    publishTime: str
    authorAttribution: AuthorAttribution

@dataclass
class OpeningDay:
    day: int
    dayName: str
    openTime: str | None
    closeTime: str | None

@dataclass
class OpeningHours:
    nextOpenTime: str | None
    week: list[OpeningDay]

@dataclass
class RestaurantCardData:
    cardId: str
    restaurantId: str
    placeUrl: str
    title: str
    placePhotos: List[PlacePhoto]
    locationAddress: str
    location: GpsCoordinates
    type: List[str]
    rating: float
    priceLevel: int
    delivery: bool
    outdoorSeating: bool
    goodForGroups: bool
    takeout: bool
    servesVegetarian: bool
    openingHours: OpeningHours | None
    placeReviews: List[PlaceReview]

    def to_dict(self) -> dict:
        return asdict(self)