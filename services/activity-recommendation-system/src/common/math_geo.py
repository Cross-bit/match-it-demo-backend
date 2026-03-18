import math
from typing import List, Tuple

Coord = Tuple[float, float]

def haversine_km(a, b):
    R = 6371.0088 #e arth radius

    lat1, lon1 = map(math.radians, a)
    lat2, lon2 = map(math.radians, b)

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    h = (
        math.sin(dlat / 2) ** 2 +
        math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    )

    return 2 * R * math.asin(math.sqrt(h))


def spherical_centroid(coords: List[Coord]) -> Coord:
    """
        Centerpoint between given coordinates.
    """
    if not coords:
        raise ValueError("coords list is empty")

    x = y = z = 0.0

    for lat, lon in coords:
        lat_r = math.radians(lat)
        lon_r = math.radians(lon)

        x += math.cos(lat_r) * math.cos(lon_r)
        y += math.cos(lat_r) * math.sin(lon_r)
        z += math.sin(lat_r)

    total = len(coords)
    x /= total
    y /= total
    z /= total

    lon = math.atan2(y, x)
    hyp = math.sqrt(x * x + y * y)
    lat = math.atan2(z, hyp)

    return (math.degrees(lat), math.degrees(lon))
