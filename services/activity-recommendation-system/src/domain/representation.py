# domain/restaurants/representation.py

# ======================================================
# Representation definitions for Restaurant Recommender
# ======================================================
#
# This module defines the stable taxonomy and mappings
# used to represent restaurants as vectors.
#
# If you need to add or update categories, be aware that
# it may invalidate existing embeddings, models, and data.
#


# !! IMPORTANT !!
# Following order should NEVER change.
# Restaurant embeddings and trained models rely on this EXACT order.
CATEGORY_ORDER = [
    "african",
    "american",
    "asian",
    "bars_alcohol",
    "buffet_dining",
    "cafes",
    "tea",
    "dessert_sweets",
    "european",
    "casual_eats",
    "fast_food",
    "fine_dining",
    "latin_american",
    "middle_eastern",
    "south_asian",
    "vegetarian_healthy",
]

PRICE_LEVELS = [
    "PRICE_LEVEL_UNSPECIFIED",
    "PRICE_LEVEL_FREE",
    "PRICE_LEVEL_INEXPENSIVE",
    "PRICE_LEVEL_MODERATE",
    "PRICE_LEVEL_EXPENSIVE",
    "PRICE_LEVEL_VERY_EXPENSIVE",
]

RESTAURANT_GOOGLE_TYPES_GROUPS = {
    "african": ["african_restaurant"],
    "american": [
        "american_restaurant",
        "diner",
        "steak_house",
        "brunch_restaurant",
        "breakfast_restaurant",
    ],
    "asian": [
        "asian_restaurant",
        "japanese_restaurant",
        "sushi_restaurant",
        "chinese_restaurant",
        "thai_restaurant",
        "indonesian_restaurant",
        "vietnamese_restaurant",
        "korean_restaurant",
        "ramen_restaurant",
    ],
    "bars_alcohol": [
        "bar",
        "pub",
        "bar_and_grill",
        "wine_bar",
        "wine_bardeli",
    ],
    "buffet_dining": [
        "buffet_restaurant",
        "cafeteria",
        "food_court",
    ],
    "tea": ["tea_house"],
    "cafes": [
        "cafe",
        "coffee_shop",
        "cat_cafe",
        "dog_cafe",
    ],
    "dessert_sweets": [
        "dessert_restaurant",
        "dessert_shop",
        "ice_cream_shop",
        "donut_shop",
        "chocolate_shop",
        "chocolate_factory",
        "candy_store",
        "confectionery",
        "bakery",
        "bagel_shop",
    ],
    "european": [
        "italian_restaurant",
        "spanish_restaurant",
        "french_restaurant",
        "greek_restaurant",
    ],
    "casual_eats": [
        "meal_takeaway",
        "meal_delivery",
        "sandwich_shop",
        "hamburger_restaurant",
        "pizza_restaurant",
        "deli",
    ],
    "fast_food": ["fast_food_restaurant"],
    "fine_dining": ["fine_dining_restaurant"],
    "latin_american": [
        "brazilian_restaurant",
        "mexican_restaurant",
    ],
    "middle_eastern": [
        "lebanese_restaurant",
        "turkish_restaurant",
        "middle_eastern_restaurant",
        "afghani_restaurant",
    ],
    "south_asian": ["indian_restaurant"],
    "vegetarian_healthy": [
        "vegan_restaurant",
        "vegetarian_restaurant",
        "juice_shop",
        "acai_shop",
        "confectioneryacai_shop",
    ],
}

DAY_NAMES = {
    0: "Sunday",
    1: "Monday",
    2: "Tuesday",
    3: "Wednesday",
    4: "Thursday",
    5: "Friday",
    6: "Saturday",
}


def type_to_group():
    restaurant_types = {}
    for category, types in RESTAURANT_GOOGLE_TYPES_GROUPS.items():
        for type in types:
            restaurant_types[type] = category
    return restaurant_types


GOOGLE_TYPE_TO_GROUP_MAPPING = type_to_group()