# Places data aggregation
This directory contains all the scripts used to aggregate local places database.

## Google places API
To get basic information about all near by places, we are using **Text search API (new)**.

The script `get_restaurants_near_by.py`  downloads data about near by places based on specific text input.
The location is set using GPS coordinates, Prague search radius is set to 12 km.
If needed all the parameters can be easily adjusted in the `__main__`.


All of the output files are stored into the `placesData` directory.
Current search is performed over a set of specific category terms, like *restaurance, jídelnas, čajovna, ...*.
For each category the result is then stored in separate file `data_<category_term>.json`.
Data are then combined into a single `places.json` file.


Note: there is also `google_api_experiments` that contains some basic bash API call scripts for API testing purposes.

## google places reviews scrapper

The directory `google-places-reviews-scrapper` contains simple google places reviews scrapper, to scrape additional places reviews since the google places API returns only first 5 reviews.

## Analysis

Contains scripts for post analysis of the places API.
