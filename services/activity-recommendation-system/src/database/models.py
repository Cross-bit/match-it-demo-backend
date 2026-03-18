from pydantic import BaseModel
from typing import Any, Dict, List, Optional
from enum import Enum
from src.utils import *

class SessionType(str, Enum):
    MOVIE = "MOVIE"
    RESTAURANT = "RESTAURANT"

class UserMetadata(BaseModel):
    sessionParameters: Optional[Dict[str, Any]] = None
    sensorData: Optional[Dict[str, Any]] = None

class MemberData(BaseModel):
    userUUID: str
    isCreator: bool
    metadata: Optional[UserMetadata]

class ItemVote(BaseModel):
    itemId: str  # Changed from int to str
    rating: int

class UserVotes(BaseModel):
    userUUID: str
    votingResult: List[ItemVote]

#
# Movie session data
#

class MovieRating:
    def __init__(self, movieId: int, rating: int):
        self.movieId = movieId # IDs are defined as integers from MovieLens dataset
        self.rating = rating

class MovieSessionMemberData:
    def __init__(self, userUUID: str):
        self.userUUID = Utils.convertUUIDToInteger(userUUID)
        self.ratings: List[MovieRating] = []  # List of MovieRating

class Session:
    def __init__(self, sessionUUID: str, sessionSize: int, sessionType: str):
        self.sessionUUID = sessionUUID
        self.sessionSize = sessionSize
        self.sessionType = sessionType
        self.members = []

class MovieSession(Session):
    def __init__(self, sessionUUID: str, sessionSize: int, sessionType: str):
        super().__init__(sessionUUID, sessionSize, sessionType)

#
# Restaurants session data
#

class GpsLocation:
    latitude: float
    longitude: float
    def __init__(self, latitude: float, longitude: float):
        self.latitude = latitude
        self.longitude = longitude

# Restaurant recommendation data
class Restaurant:
    def __init__(self, placeId: str, jsonRaw: str, priceLevel: int, servesVegetarianFood: bool, lat: float, lng: float, contentVec: List[float], lastUpdate: str = ""):
        self.placeId = placeId
        self.jsonRaw = jsonRaw
        self.priceLevel = priceLevel
        self.servesVegetarianFood=servesVegetarianFood
        self.lat = lat
        self.lng = lng
        self.contentVec = contentVec
        self.lastUpdated = lastUpdate

# Restaurant session Data
class RestaurantRating:
    def __init__(self, restaurantId: int, rating: int):
        self.restaurantId = restaurantId # IDs are defined as integers from MovieLens dataset
        self.rating = rating


class SensorData:
    location: Optional[GpsLocation] = None

class RestaurantSessionParameter:
    restaurantPreferences: any

class UserSessionMetadata:
    sessionParameters: Optional[Dict[str, Any]] = None
    sensorData: SensorData


#class RestaurantUserMetadata:
#    def __init__(self, userUUID: str):

class RestaurantSessionMemberData:
    def __init__(self, userUUID: str):
        self.userUUID = Utils.convertUUIDToInteger(userUUID)
        self.metadata: Any
        self.userLocation = GpsLocation(0, 0)

class RestaurantSession(Session):
    def __init__(self, sessionUUID: str, sessionSize: int, sessionType: str):
        super().__init__(sessionUUID, sessionSize, sessionType)


