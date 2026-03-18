from typing import List


class Author:
    def __init__(self, name: str, uri: str, photoUri: str):
        self.name = name
        self.uri = uri
        self.photoUri = photoUri

class PlacePhoto:
    def __init__(self, width: int, height: int, uri: str, author: Author):
        self.width = width
        self.height = height
        self.uri = uri
        self.author = author

class Review:
    def __init__(self, rating: float, text: str, lang: str, author: Author, publishTime: str):
        self.rating = rating
        self.text = text
        self.lang = lang
        self.author = author
        self.publishTime = publishTime

class GpsLocation:
    def __init__(self, latitude: float, longitude: float):
        self.latitude = latitude
        self.longitude = longitude

class RestaurantData:
    def __init__(self, id: str, location: GpsLocation, address: str, rating: float, name: str, takeout: bool, vegetarian: bool, reviews: List[Review], photos: List[PlacePhoto]):
        self.id = id
        self.location = location
        self.address = address
        self.rating = rating
        self.name = name
        self.takeout = takeout
        self.vegetarian = vegetarian
        self.reviews = reviews
        self.photos = photos
