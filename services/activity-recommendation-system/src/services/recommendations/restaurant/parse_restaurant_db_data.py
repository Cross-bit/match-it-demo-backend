# Parse author data
from .model import Author, Review, PlacePhoto, GpsLocation, RestaurantData
from typing import List


def parse_author(author_data):
    return Author(
        name=author_data.get('displayName', ''),
        uri=author_data.get('uri', ''),
        photoUri=author_data.get('photoUri', '')
    )

# Parse reviews
def parse_reviews(reviews_data) -> List[Review]:
    reviews = []
    for review in reviews_data:
        author = parse_author(review['authorAttribution'])
        review_obj = Review(
            rating=review.get('rating', 0.0),
            text=review['text']['text'] if 'text' in review else '',
            lang=review['text'].get('languageCode', ''),
            author=author,
            publishTime=review.get('publishTime', '')
        )
        reviews.append(review_obj)
    return reviews

# Parse photos
def parse_photos(photos_data) -> List:
    photos = []
    for photo in photos_data:
        author = parse_author(photo['authorAttributions'][0]) if photo.get('authorAttributions') else None
        photo_obj = PlacePhoto(
            width=photo.get('widthPx', 0),
            height=photo.get('heightPx', 0),
            uri=photo.get('url', ''),
            author=author
        )
        photos.append(photo_obj)
    return photos

# Parse location
def parse_location(location_data) -> GpsLocation:
    return GpsLocation(
        latitude=location_data.get('latitude', 0.0),
        longitude=location_data.get('longitude', 0.0)
    )

def place_db_data_to_formatted(data) -> RestaurantData:
        return RestaurantData(
        id=data.get('id', ''),
        location=parse_location(data['location']),
        address=data.get('formattedAddress', ''),
        rating=data.get('rating', 0.0),
        name=data['displayName'].get('text', '') if 'displayName' in data else '',
        takeout=data.get('takeout', False),
        vegetarian=data.get('vegetarian', False),
        reviews=parse_reviews(data['reviews']),
        photos=parse_photos(data['photos'])
    )