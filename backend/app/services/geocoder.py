import logging
import time
import requests
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Fallback coordinates (Chennai, India)
DEFAULT_LAT = 13.0827
DEFAULT_LNG = 80.2707

def geocode_address(ward: Optional[str], district: Optional[str]) -> Tuple[float, float]:
    """
    Find coordinates for a given ward/district using Nominatim OpenStreetMap API.
    Nominatim is free but requires a descriptive User-Agent and has a 1 req/sec rate limit.
    """
    if not district:
        return DEFAULT_LAT, DEFAULT_LNG
    
    # Construct query string
    query = f"{ward},{district},India" if ward else f"{district},India"
    url = f"https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1"
    
    headers = {
        "User-Agent": "NammaConnect/1.0 (admin@nammaconnect.org)"
    }

    try:
        # Respect rate limits: Wait 1 second before the request
        time.sleep(1)
        
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        data = response.json()

        if data:
            lat = float(data[0]["lat"])
            lng = float(data[0]["lon"])
            logger.info(f"Geocoded '{query}' to ({lat}, {lng})")
            return lat, lng
        
        logger.warning(f"Nominatim could not find coordinates for: {query}")
    except Exception as e:
        logger.error(f"Geocoding error for {query}: {e}")

    # Fallback if geocoding fails
    return DEFAULT_LAT, DEFAULT_LNG

def ensure_coordinates(lat: Optional[float], lng: Optional[float], ward: Optional[str], district: Optional[str]) -> Tuple[float, float]:
    """
    Ensure we have valid coordinates. If 0,0 or None, attempt to geocode.
    """
    is_invalid = lat is None or lng is None or (abs(lat) < 0.001 and abs(lng) < 0.001)
    
    if is_invalid:
        return geocode_address(ward, district)
    
    return lat, lng
