import logging
from typing import Tuple, Optional

logger = logging.getLogger(__name__)

# Coordinates for common Tamil Nadu districts to prevent 0,0 (ocean) markers
DISTRICT_COORDINATES = {
    "Ariyalur": (11.1398, 79.0756),
    "Chengalpattu": (12.6819, 79.9888),
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Cuddalore": (11.7447, 79.7680),
    "Dharmapuri": (12.1277, 78.1579),
    "Dindigul": (10.3673, 77.9803),
    "Erode": (11.3410, 77.7172),
    "Kallakurichi": (11.7390, 78.9637),
    "Kanchipuram": (12.8342, 79.7036),
    "Kanyakumari": (8.0883, 77.5385),
    "Karur": (10.9601, 78.0766),
    "Krishnagiri": (12.5266, 78.2137),
    "Madurai": (9.9252, 78.1198),
    "Mayiladuthurai": (11.1035, 79.6550),
    "Nagapattinam": (10.7656, 79.8428),
    "Namakkal": (11.2189, 78.1674),
    "Nilgiris": (11.4064, 76.6932),
    "Perambalur": (11.2333, 78.8833),
    "Pudukkottai": (10.3833, 78.8000),
    "Ramanathapuram": (9.3639, 78.8395),
    "Ranipet": (12.9273, 79.3335),
    "Salem": (11.6643, 78.1460),
    "Sivaganga": (9.8470, 78.4836),
    "Tenkasi": (8.9592, 77.3152),
    "Thanjavur": (10.7867, 79.1378),
    "Theni": (10.0104, 77.4768),
    "Thoothukudi": (8.7642, 78.1348),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Tirunelveli": (8.7139, 77.7567),
    "Tirupattur": (12.4950, 78.5680),
    "Tiruppur": (11.1085, 77.3411),
    "Tiruvallur": (13.1439, 79.9089),
    "Tiruvannamalai": (12.2253, 79.0747),
    "Tiruvarur": (10.7713, 79.6368),
    "Vellore": (12.9165, 79.1325),
    "Viluppuram": (11.9390, 79.4861),
    "Virudhunagar": (9.5841, 77.9579),
}

DEFAULT_LAT = 9.9252
DEFAULT_LNG = 78.1198

def geocode_address(ward: Optional[str], district: Optional[str]) -> Tuple[float, float]:
    """
    Find coordinates for a given ward/district.
    In a real app, this would call Google Maps Geocoding API.
    For this version, we use a district lookup to prevent 0,0 markers.
    """
    if not district:
        return DEFAULT_LAT, DEFAULT_LNG
    
    # Clean district name
    clean_district = district.strip().title()
    
    if clean_district in DISTRICT_COORDINATES:
        return DISTRICT_COORDINATES[clean_district]
    
    # Fallback to Madurai if district not found
    logger.warning(f"District '{district}' not recognized for geocoding. Falling back to Madurai.")
    return DEFAULT_LAT, DEFAULT_LNG

def ensure_coordinates(lat: Optional[float], lng: Optional[float], ward: Optional[str], district: Optional[str]) -> Tuple[float, float]:
    """
    Ensure we have valid coordinates. If 0,0 or None, attempt to geocode.
    """
    is_invalid = lat is None or lng is None or (abs(lat) < 0.001 and abs(lng) < 0.001)
    
    if is_invalid:
        return geocode_address(ward, district)
    
    return lat, lng
